import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth'; // Import auth HOC and type
import { query } from '@/lib/db';

// Define expected structure for community query result
interface CommunityRow {
  id: string; // This is the LONG ID
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

// RequestBody interface removed as communityShortId and pluginId come from JWT

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  // Initialize Stripe client INSIDE the handler
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  // Use the new environment variable for the plugin's base URL
  const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;

  // Check both Stripe key and the plugin base URL
  if (!stripeSecretKey || !pluginBaseUrl) {
      console.error('Stripe secret key or NEXT_PUBLIC_PLUGIN_BASE_URL is not set.');
      return NextResponse.json({ error: 'Stripe/App configuration error.' }, { status: 500 });
  }
  const stripe = new Stripe(stripeSecretKey, {
      typescript: true,
  });

  // Get IDs from JWT claims via req.user (added by withAuth)
  const communityId = req.user?.cid; // Long ID
  const communityShortId = req.user?.communityShortId; // Short ID for URL
  const pluginId = req.user?.pluginId; // Plugin definition ID

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID not found in token' }, { status: 400 });
  }
  if (!communityShortId || !pluginId) {
    console.error('Missing communityShortId or pluginId in JWT claims for create-checkout-session.', { communityId, user: req.user });
    return NextResponse.json({ error: 'Essential routing information missing in token.' }, { status: 400 });
  }

  try {
    // 1. Get community info (using LONG ID)
    const communityResult = await query<CommunityRow>(
      `SELECT id, title, stripe_customer_id, current_plan_id FROM communities WHERE id = $1`,
      [communityId]
    );
    if (communityResult.rowCount === 0) return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    const community = communityResult.rows[0];

    // 2. Get 'pro' plan Stripe Price ID
    const planResult = await query<PlanRow>(
      `SELECT id, code, stripe_price_id FROM plans WHERE code = 'pro' AND is_active = true`
    );
    if (planResult.rowCount === 0 || !planResult.rows[0].stripe_price_id) return NextResponse.json({ error: 'Pro plan configuration error.' }, { status: 500 });
    const proPlanPriceId = planResult.rows[0].stripe_price_id;

    // 3. Ensure Stripe Customer exists
    let stripeCustomerId = community.stripe_customer_id;
    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          name: community.title,
          metadata: { community_id: community.id }, // Store LONG ID
        });
        stripeCustomerId = customer.id;
        await query(`UPDATE communities SET stripe_customer_id = $1 WHERE id = $2`, [stripeCustomerId, community.id]);
      } catch (customerError) {
        console.error('Error creating Stripe customer:', customerError);
        return NextResponse.json({ error: 'Failed to create billing customer.' }, { status: 500 });
      }
    }

    // 4. Construct Redirect URLs using plugin base URL and JWT data
    const successUrl = `${pluginBaseUrl}/stripe-callback?stripe_status=success&session_id={CHECKOUT_SESSION_ID}&communityShortId=${communityShortId}&pluginId=${pluginId}`;
    const cancelUrl = `${pluginBaseUrl}/stripe-callback?stripe_status=cancel&communityShortId=${communityShortId}&pluginId=${pluginId}`;

    // 5. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{ price: proPlanPriceId, quantity: 1 }],
      success_url: successUrl, // Updated URL
      cancel_url: cancelUrl,   // Updated URL
      client_reference_id: communityId, // Use LONG ID for reference
    });

    if (!session.id || !session.url) {
        throw new Error("Stripe session creation failed, no ID or URL returned.");
    }

    // Return both sessionId and sessionUrl
    return NextResponse.json({ sessionId: session.id, sessionUrl: session.url });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    if (error instanceof Stripe.errors.StripeError) return NextResponse.json({ error: `Stripe Error: ${error.message}` }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // Admin required 