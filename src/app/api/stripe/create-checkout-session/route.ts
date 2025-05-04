import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth'; // Import auth HOC and type
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion: '2024-04-10', // Removed to avoid potential type conflict
  typescript: true,
});

// Define expected structure for community query result
interface CommunityRow {
  id: string;
  title: string;
  stripe_customer_id: string | null;
  current_plan_id: number;
}

// Define expected structure for plan query result
interface PlanRow {
  id: number;
  code: string;
  stripe_price_id: string | null;
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const communityId = user.cid;

  try {
    // 1. Get community details and target plan details
    const communityRes = await query<CommunityRow>(
      `SELECT id, title, stripe_customer_id, current_plan_id FROM communities WHERE id = $1`,
      [communityId]
    );
    const community = communityRes.rows[0];

    const proPlanRes = await query<PlanRow>(
        `SELECT id, code, stripe_price_id FROM plans WHERE code = 'pro' LIMIT 1`
    );
    const proPlan = proPlanRes.rows[0];

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }
    if (!proPlan || !proPlan.stripe_price_id) {
      console.error('Pro plan or its Stripe Price ID is not configured in the database.');
      return NextResponse.json({ error: 'Pro plan configuration error.' }, { status: 500 });
    }

    // Prevent creating checkout if already on pro plan (or handle upgrade/downgrade logic if needed)
    if (community.current_plan_id === proPlan.id) {
        return NextResponse.json({ error: 'Community is already on the Pro plan.'}, { status: 400 });
    }

    let stripeCustomerId = community.stripe_customer_id;

    // 2. Create Stripe Customer if one doesn't exist for this community
    if (!stripeCustomerId) {
      console.log(`Creating new Stripe Customer for community: ${communityId}`);
      const customer = await stripe.customers.create({
        // Use metadata to link Stripe Customer to our community ID
        metadata: {
          community_id: communityId,
        },
        // Optionally pre-fill name/email if available and desired
        // name: community.title,
        // email: user.email // Assuming email is in JWT payload
      });
      stripeCustomerId = customer.id;
      // Update our database with the new Stripe Customer ID
      await query(
        `UPDATE communities SET stripe_customer_id = $1 WHERE id = $2`,
        [stripeCustomerId, communityId]
      );
      console.log(`Created and linked Stripe Customer ${stripeCustomerId} for community ${communityId}`);
    }

    // 3. Define URLs (use environment variable for base URL in production)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    // TODO: Adjust these URLs to point to your actual billing page/route
    const successUrl = `${baseUrl}/admin/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/admin/settings/billing?checkout=cancel`;

    // 4. Create the Stripe Checkout Session
    console.log(`Creating Checkout session for Customer ${stripeCustomerId}, Price ${proPlan.stripe_price_id}`);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'], // Or allow other types
      customer: stripeCustomerId,
      line_items: [
        {
          price: proPlan.stripe_price_id,
          quantity: 1,
        },
      ],
      // Include communityId for webhook reference
      client_reference_id: communityId,
      // Optionally add trial period
      // subscription_data: {
      //   trial_period_days: 7,
      // },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // 5. Return the session ID
    return NextResponse.json({ sessionId: session.id });

  } catch (error: any) {
    console.error('Error creating Stripe Checkout session:', error);
    // Check for specific Stripe errors if needed
    // if (error instanceof Stripe.errors.StripeError) { ... }
    return NextResponse.json(
      { error: `Failed to create checkout session: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}, true); // true = adminOnly 