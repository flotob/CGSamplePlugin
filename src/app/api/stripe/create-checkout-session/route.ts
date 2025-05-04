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

// Define structure for optional request body
interface RequestBody {
  communityShortId?: string;
  pluginId?: string;
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  // Initialize Stripe client INSIDE the handler
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const parentAppUrl = process.env.PARENT_APP_URL; // Get parent URL here too

  if (!stripeSecretKey || !parentAppUrl) {
      console.error('Stripe secret key or PARENT_APP_URL is not set.');
      return NextResponse.json({ error: 'Stripe/App configuration error.' }, { status: 500 });
  }
  const stripe = new Stripe(stripeSecretKey, {
      typescript: true,
  });

  const communityId = req.user?.cid; // This is the LONG community ID from JWT
  if (!communityId) {
    return NextResponse.json({ error: 'Community ID not found in token' }, { status: 400 });
  }

  let communityShortId: string | undefined;
  let pluginId: string | undefined;
  try {
    // Try to parse the body for optional IDs
    const body: RequestBody | null = await req.json().catch(() => null);
    if (body?.communityShortId) {
        communityShortId = body.communityShortId;
    }
     if (body?.pluginId) {
        pluginId = body.pluginId;
    }
  } catch (error) {
    console.warn('Could not parse request body for optional IDs:', error);
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

    // 4. Construct Redirect URLs conditionally
    let successUrl: string;
    let cancelUrl: string;
    // Use local parentAppUrl variable
    const baseParentUrl = parentAppUrl.endsWith('/') ? parentAppUrl.slice(0, -1) : parentAppUrl;

    if (communityShortId && pluginId) {
      const baseUrl = `${parentAppUrl}/c/${communityShortId}/plugin/${pluginId}/`;
      successUrl = `${baseUrl}?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${baseUrl}?stripe_status=cancel`;
    } else {
      successUrl = `${baseParentUrl}?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${baseParentUrl}?stripe_status=cancel`;
    }

    // 5. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{ price: proPlanPriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: communityId, // Use LONG ID for reference
    });

    if (!session.id) throw new Error("Stripe session creation failed, no ID returned.");

    return NextResponse.json({ sessionId: session.id });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    if (error instanceof Stripe.errors.StripeError) return NextResponse.json({ error: `Stripe Error: ${error.message}` }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // Admin required 