import Stripe from 'stripe';
import { NextResponse, NextRequest } from 'next/server';
// Remove import of headers as we use request.headers instead
// import { headers } from 'next/headers';
import { query } from '@/lib/db'; // Assuming your DB query util

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion: '2024-04-10', // Removed to avoid potential type conflict - library uses account default
  typescript: true,
});

// Get the webhook signing secret from environment variables
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
  if (!endpointSecret) {
    console.error('Stripe webhook secret is not set.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  let event: Stripe.Event;
  let rawBody: Buffer;

  try {
    // Read the raw body - crucial for signature verification
    rawBody = await request.arrayBuffer().then(buffer => Buffer.from(buffer));
    if (!sig) {
        throw new Error('Missing stripe-signature header');
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`Received Stripe webhook: ${event.type}, ID: ${event.id}`);

  // Handle the event
  const dataObject = event.data.object as any; // Use 'any' or specific Stripe types

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = dataObject as Stripe.Checkout.Session;
        console.log(`Checkout session ${session.id} completed.`);
        if (session.mode === 'subscription' && session.client_reference_id) {
          const communityId = session.client_reference_id;
          const stripeCustomerId = session.customer as string;
          const stripeSubscriptionId = session.subscription as string;

          console.log(`Processing subscription checkout for community: ${communityId}`);
          // TODO: Securely update community with stripe_customer_id and potentially subscription_id
          // Check if customer ID already exists to prevent overwriting?
          await query(
            `UPDATE communities SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL`,
            [stripeCustomerId, communityId]
          );
          console.log(`Linked Stripe Customer ${stripeCustomerId} to Community ${communityId}`);
          // Plan ID update is usually handled by customer.subscription.created/updated
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscriptionUpdated = dataObject as Stripe.Subscription;
        const customerIdUpdated = subscriptionUpdated.customer as string;
        const priceIdUpdated = subscriptionUpdated.items.data[0]?.price.id;
        const statusUpdated = subscriptionUpdated.status;

        console.log(`Subscription ${subscriptionUpdated.id} ${event.type}. Status: ${statusUpdated}, Price: ${priceIdUpdated}`);

        if (customerIdUpdated && priceIdUpdated && (statusUpdated === 'active' || statusUpdated === 'trialing')) {
          // Find the internal plan ID based on the Stripe Price ID
          const planId = await getPlanIdFromStripePriceId(priceIdUpdated);
          if (planId) {
            // Find community by Stripe Customer ID and update their plan
            await query(
              `UPDATE communities SET current_plan_id = $1 WHERE stripe_customer_id = $2`,
              [planId, customerIdUpdated]
            );
            console.log(`Updated community plan for Stripe Customer ${customerIdUpdated} to Plan ID ${planId}`);
          } else {
            console.warn(`Could not find internal plan matching Stripe Price ID ${priceIdUpdated}`);
          }
        } else if (statusUpdated === 'past_due' || statusUpdated === 'unpaid' || statusUpdated === 'canceled') {
           // Subscription is inactive - potentially downgrade if not already handled by deleted event
           // We primarily rely on customer.subscription.deleted for definitive downgrade
           console.log(`Subscription ${subscriptionUpdated.id} is inactive (${statusUpdated}). Downgrade might occur on deletion event.`);
        }
        break;

      case 'customer.subscription.deleted':
        const subscriptionDeleted = dataObject as Stripe.Subscription;
        const customerIdDeleted = subscriptionDeleted.customer as string;
        console.log(`Subscription ${subscriptionDeleted.id} deleted for Customer ${customerIdDeleted}.`);

        // Find the internal ID for the 'free' plan
        const freePlanId = await getPlanIdFromStripePriceId('free'); // Use helper
        if (!freePlanId) {
          console.error("Could not find 'free' plan ID to downgrade user.");
          break; // Skip update if free plan isn't found
        }

        if (customerIdDeleted) {
          // Downgrade the community back to the free plan
          const updateResult = await query(
            `UPDATE communities SET current_plan_id = $1 WHERE stripe_customer_id = $2`,
            [freePlanId, customerIdDeleted]
          );
          // Safely check rowCount
          if (updateResult && updateResult.rowCount && updateResult.rowCount > 0) {
             console.log(`Downgraded community for Stripe Customer ${customerIdDeleted} to free plan.`);
          } else {
            console.warn(`Could not find community for Stripe Customer ${customerIdDeleted} to downgrade.`);
          }
        }
        break;

      case 'invoice.paid':
        const invoicePaid = dataObject as Stripe.Invoice;
        console.log(`Invoice ${invoicePaid.id} paid successfully for Customer ${invoicePaid.customer}.`);
        // TODO: Optional - Reset metered usage counters here if applicable
        // TODO: Optional - Log successful payment for analytics
        break;

      case 'invoice.payment_failed':
        const invoiceFailed = dataObject as Stripe.Invoice;
        console.warn(`Invoice ${invoiceFailed.id} payment failed for Customer ${invoiceFailed.customer}.`);
        // TODO: Optional - Trigger notification to community admin
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err: any) {
    // Catch errors during event processing
    console.error(`Error processing webhook ${event.type}: ${err.message}`, err);
    return NextResponse.json({ error: `Webhook handler error: ${err.message}` }, { status: 500 });
  }
} 