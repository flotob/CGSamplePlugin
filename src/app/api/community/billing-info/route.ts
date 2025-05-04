import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

// Define structure for Invoice History items
interface InvoiceHistoryItem {
    id: string;
    created: number; // Unix timestamp
    amountPaid: number; // Smallest currency unit (e.g., cents)
    currency: string;
    status: string | null;
    pdfUrl?: string | null;
}

// Update the response interface
interface BillingInfoResponse {
  currentPlan: {
    id: number;
    code: string;
    name: string;
  } | null;
  stripeCustomerId: string | null;
  subscriptionStatus?: string | null;
  trialEndDate?: number | null;
  periodEndDate?: number | null;
  cancelAtPeriodEnd?: boolean | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  invoiceHistory?: InvoiceHistoryItem[] | null; // Add invoice history array
}

export const GET = withAuth(
  async (req: AuthenticatedRequest): Promise<NextResponse<BillingInfoResponse | { error: string }>> => {
    // Initialize Stripe client INSIDE the handler
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        console.error('Stripe secret key is not set.');
        return NextResponse.json({ error: 'Stripe configuration error.' }, { status: 500 });
    }
    const stripe = new Stripe(stripeSecretKey, {
        typescript: true,
    });

    const communityId = req.user?.cid;

    if (!communityId) {
      return NextResponse.json({ error: 'Community ID not found in token' }, { status: 400 });
    }

    try {
      // Fetch base community and plan info from DB
      const result = await query<{
        current_plan_id: number;
        stripe_customer_id: string | null;
        plan_code: string;
        plan_name: string;
      }>(
        `SELECT
           c.current_plan_id,
           c.stripe_customer_id,
           p.code as plan_code,
           p.name as plan_name
         FROM communities c
         LEFT JOIN plans p ON c.current_plan_id = p.id
         WHERE c.id = $1`,
        [communityId]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Community not found' }, { status: 404 });
      }

      const communityData = result.rows[0];
      const stripeCustomerId = communityData.stripe_customer_id;

      const currentPlan = communityData.current_plan_id
        ? {
            id: communityData.current_plan_id,
            code: communityData.plan_code,
            name: communityData.plan_name,
          }
        : null;

      // Prepare the base response data
      const responseData: BillingInfoResponse = {
        currentPlan: currentPlan,
        stripeCustomerId: stripeCustomerId,
        invoiceHistory: [], // Initialize as empty array
      };

      // --- Fetch additional details from Stripe if customer ID exists ---
      if (stripeCustomerId) {
          try {
            // Fetch subscription details
            const subscriptions = await stripe.subscriptions.list({
              customer: stripeCustomerId,
              status: 'active',
              limit: 1,
              expand: ['data.default_payment_method'],
            });
            if (subscriptions.data.length > 0) {
              const sub = subscriptions.data[0];
              responseData.subscriptionStatus = sub.status;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              responseData.periodEndDate = (sub as any).current_period_end;
              responseData.trialEndDate = sub.trial_end;
              responseData.cancelAtPeriodEnd = sub.cancel_at_period_end;
              const paymentMethod = sub.default_payment_method;
              if (paymentMethod && typeof paymentMethod !== 'string' && paymentMethod.type === 'card' && paymentMethod.card) {
                  responseData.cardBrand = paymentMethod.card.brand;
                  responseData.cardLast4 = paymentMethod.card.last4;
              }
            }

            // Fetch invoice history
            const invoices = await stripe.invoices.list({
                customer: stripeCustomerId,
                status: 'paid',
                limit: 5, 
            });
            
            // Filter out any invoices potentially missing an ID before mapping
            responseData.invoiceHistory = invoices.data
                .filter(inv => !!inv.id) // Ensure ID exists
                .map(inv => ({
                    id: inv.id!, // Use non-null assertion as we filtered
                    created: inv.created,
                    amountPaid: inv.amount_paid,
                    currency: inv.currency,
                    status: inv.status,
                    pdfUrl: inv.invoice_pdf,
                }));

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (stripeError: any) {
              console.error(`Error fetching Stripe data for customer ${stripeCustomerId}:`, stripeError);
              // Reset potentially partially populated fields on error?
              responseData.subscriptionStatus = undefined;
              responseData.periodEndDate = undefined;
              responseData.trialEndDate = undefined;
              responseData.cancelAtPeriodEnd = undefined;
              responseData.cardBrand = undefined;
              responseData.cardLast4 = undefined;
              responseData.invoiceHistory = []; // Ensure history is empty on error
          }
      }
      // ------------------------------------------------------------------

      return NextResponse.json(responseData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error fetching community billing info:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  },
  true
); 