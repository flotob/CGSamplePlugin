import Stripe from 'stripe';
import { NextResponse, NextRequest } from 'next/server';
// Remove import of headers as we use request.headers instead
// import { headers } from 'next/headers';
import { query } from '@/lib/db'; // Assuming your DB query util

// Helper function to get the internal plan ID from Stripe Price ID
// Caches results in memory for the lifetime of the server instance
const planIdCache = new Map<string, number>();
async function getPlanIdFromStripePriceId(stripePriceId: string): Promise<number | null> {
  if (planIdCache.has(stripePriceId)) {
    return planIdCache.get(stripePriceId)!;
  }
  // Special case for 'free' plan which doesn't have a Stripe Price ID
  if (stripePriceId === 'free') {
      try {
        const { rows } = await query<{ id: number }>(
          `SELECT id FROM plans WHERE code = 'free' LIMIT 1`
        );
        const freePlanId = rows[0]?.id;
        if (freePlanId) planIdCache.set('free', freePlanId);
        return freePlanId || null;
      } catch (err) {
        console.error('Error fetching plan ID for free plan:', err);
        return null;
      }
  }
  // For actual Stripe Price IDs
  try {
    const { rows } = await query<{ id: number }>(
      `SELECT id FROM plans WHERE stripe_price_id = $1 LIMIT 1`,
      [stripePriceId]
    );
    const planId = rows[0]?.id;
    if (planId) {
      planIdCache.set(stripePriceId, planId);
      return planId;
    }
  } catch (err) {
    console.error(`Error fetching plan ID for Stripe Price ID ${stripePriceId}:`, err);
  }
  return null;
}

export async function POST(request: NextRequest) {
  // Get secrets INSIDE the handler
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Define inside

  // Ensure keys are available
  if (!stripeSecretKey) {
      console.error('Stripe secret key is not set.');
      return NextResponse.json({ error: 'Stripe configuration error.' }, { status: 500 });
  }
  if (!endpointSecret) {
    console.error('Stripe webhook secret is not set.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  // Initialize Stripe client INSIDE the handler using the fetched key
  const stripe = new Stripe(stripeSecretKey, {
    typescript: true,
  });

  const sig = request.headers.get('stripe-signature');
  let event: Stripe.Event;
  let rawBody: Buffer;

  // === Try block 1: Read body and verify signature ===
  try {
    rawBody = await request.arrayBuffer().then(buffer => Buffer.from(buffer));
    if (!sig) {
        throw new Error('Missing stripe-signature header');
    }
    // Use endpointSecret variable defined inside the function
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }
  // =====================================================

  console.log(`Received Stripe webhook: ${event.type}, ID: ${event.id}`);

  // === Try block 2: Handle the successfully verified event ===
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataObject = event.data.object as any; // Keep 'as any' for broad compatibility

    // Handle the event type
    switch (event.type) {
      case 'checkout.session.completed':
        // Payment is successful and the subscription is created.
        // -> Update the customer billing status.
        // console.log('Checkout session completed:', dataObject);
        if (dataObject.mode === 'subscription') {
          const customerId = dataObject.customer;
          const subscriptionId = dataObject.subscription;
          const communityId = dataObject.client_reference_id;
          
          // Check if we have the necessary info
          if (customerId && subscriptionId && communityId) {
            // Update community with Stripe customer ID
             try {
              // Also update the plan based on the completed checkout if needed
              // This might be redundant if customer.subscription.created/updated handles it
              // but can ensure state is correct immediately after checkout.
              // Fetch the price ID from the session or subscription if available
              // For simplicity, we assume customer.subscription.created/updated handles plan setting.
              await query(
                  `UPDATE communities
                   SET stripe_customer_id = $1
                   WHERE id = $2 AND stripe_customer_id IS NULL`,
                  [customerId, communityId]
              );
              console.log(`Linked Stripe Customer ${customerId} to Community ${communityId} after checkout.`);
               // Optionally store subscriptionId on the community if needed for direct management
               // await query(
               //   `UPDATE communities SET stripe_subscription_id = $1 WHERE id = $2`, 
               //   [subscriptionId, communityId]
               // );

            } catch (dbError) {
              console.error('DB Error handling checkout.session.completed:', dbError);
            }
          } else {
              console.warn('Missing data in checkout.session.completed event:', dataObject);
          }
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        // Handle changes in subscription status
        const subscriptionUpdated = dataObject as Stripe.Subscription;
        const customerIdUpdated = subscriptionUpdated.customer as string;
        const priceIdUpdated = subscriptionUpdated.items.data[0]?.price.id;
        const statusUpdated = subscriptionUpdated.status;
        // const stripeSubscriptionId = subscriptionUpdated.id; // This variable was unused

        console.log(`Subscription ${subscriptionUpdated.id} ${event.type}. Status: ${statusUpdated}, Price: ${priceIdUpdated}`);

        if (customerIdUpdated && priceIdUpdated && (statusUpdated === 'active' || statusUpdated === 'trialing')) {
          const planId = await getPlanIdFromStripePriceId(priceIdUpdated);
          if (planId) {
            try {
              await query(
                `UPDATE communities SET current_plan_id = $1 WHERE stripe_customer_id = $2`,
                [planId, customerIdUpdated]
              );
              console.log(`Updated community plan for Stripe Customer ${customerIdUpdated} to Plan ID ${planId}`);
            } catch (dbError) {
              console.error('DB Error handling subscription update:', dbError);
            }
          } else {
            console.warn(`Could not find internal plan matching Stripe Price ID ${priceIdUpdated}`);
          }
        } else if (statusUpdated === 'past_due' || statusUpdated === 'unpaid' || statusUpdated === 'canceled') {
           console.log(`Subscription ${subscriptionUpdated.id} is inactive (${statusUpdated}). Downgrade might occur on deletion event or handled below.`);
        }
        
         // Handle explicit cancellation flag (cancel_at_period_end)
         if (subscriptionUpdated.cancel_at_period_end) {
              console.log(`Subscription ${subscriptionUpdated.id} scheduled to cancel at period end.`);
              // No immediate plan change needed, handled by customer.subscription.deleted later
         } else if (statusUpdated === 'canceled') {
             // Handle immediate cancellation (if not handled by deleted event)
             const freePlanId = await getPlanIdFromStripePriceId('free');
             if (freePlanId) {
                 try {
                     await query(
                         `UPDATE communities SET current_plan_id = $1 WHERE stripe_customer_id = $2`,
                         [freePlanId, customerIdUpdated]
                     );
                     console.log(`Downgraded community for Stripe Customer ${customerIdUpdated} to Free Plan due to 'canceled' status.`);
                 } catch (dbError) {
                     console.error('DB Error handling explicit cancellation:', dbError);
                 }
             } else {
                 console.error('Could not find free plan ID to downgrade after cancellation.');
             }
         }
        break;

      case 'customer.subscription.deleted':
        // Handle subscription cancellation (user cancelled, or end of billing period for cancellation)
        const subscriptionDeleted = dataObject as Stripe.Subscription;
        const customerIdDeleted = subscriptionDeleted.customer as string;
        console.log(`Subscription ${subscriptionDeleted.id} deleted for customer ${customerIdDeleted}`);

        // Downgrade the user to the free plan
        const freePlanIdDeleted = await getPlanIdFromStripePriceId('free');
        if (freePlanIdDeleted && customerIdDeleted) {
          try {
            await query(
              `UPDATE communities SET current_plan_id = $1 WHERE stripe_customer_id = $2`,
              [freePlanIdDeleted, customerIdDeleted]
            );
            console.log(`Downgraded community for Stripe Customer ${customerIdDeleted} to Free Plan.`);
          } catch (dbError) {
            console.error('DB Error handling subscription deletion:', dbError);
          }
        } else {
            console.error('Could not find free plan ID or customer ID for downgrade after subscription deletion.');
        }
        break;

      case 'invoice.paid':
        // Continue to provision the service if payment is successful
        // Store the status in your database to handle implementation details
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const invoicePaid = dataObject as any;
         console.log(`Invoice ${invoicePaid.id} paid successfully for customer ${invoicePaid.customer}.`);
        // Add business logic here (e.g., log payment, reset metered usage counter)
        break;

      case 'invoice.payment_failed':
        // The payment failed or the customer does not have a valid payment method
        // The subscription becomes past_due. Notify the customer and send them to the
        // customer portal to update their payment information.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const invoiceFailed = dataObject as any;
         console.warn(`Invoice ${invoiceFailed.id} payment failed for customer ${invoiceFailed.customer}.`);
        // Add business logic here (e.g., notify customer/admin)
        break;

      default:
        console.warn(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true }, { status: 200 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // Catch errors during event processing
    const eventType = (typeof event !== 'undefined' && event?.type) ? event.type : 'unknown';
    console.error(`Error processing webhook ${eventType}: ${err.message}`, err);
    return NextResponse.json({ error: `Webhook handler error: ${err.message}` }, { status: 500 });
  }
  // =========================================================
} 