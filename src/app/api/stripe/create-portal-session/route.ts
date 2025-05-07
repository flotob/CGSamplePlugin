import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth'; // Import auth HOC and type
import { query } from '@/lib/db';

// RequestBody interface removed as communityShortId and pluginId come from JWT

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  // Initialize Stripe client INSIDE the handler
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const parentAppUrl = process.env.PARENT_APP_URL;

  if (!stripeSecretKey || !parentAppUrl) {
      console.error('Stripe secret key or PARENT_APP_URL is not set.');
      return NextResponse.json({ error: 'Stripe/App configuration error.' }, { status: 500 });
  }
  const stripe = new Stripe(stripeSecretKey, {
      typescript: true,
  });

  // Get IDs from JWT claims via req.user
  const communityId = req.user?.cid; // Long ID
  const communityShortId = req.user?.communityShortId;
  const pluginId = req.user?.pluginId;

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID not found in token' }, { status: 400 });
  }
  // Add checks for the new required IDs from JWT for constructing URLs
  if (!communityShortId || !pluginId) {
    console.error('Missing communityShortId or pluginId in JWT claims for create-portal-session.', { communityId, user: req.user });
    return NextResponse.json({ error: 'Essential routing information missing in token.' }, { status: 400 });
  }

  // Logic to parse body for these IDs is removed.

  try {
    // 1. Get the community's Stripe Customer ID (using LONG ID)
    const communityResult = await query<{ stripe_customer_id: string | null } >(
      `SELECT stripe_customer_id FROM communities WHERE id = $1`,
      [communityId]
    );
    const stripeCustomerId = communityResult.rows[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
      console.error(`Stripe customer ID not found for community ${communityId}. Cannot create portal session.`);
      return NextResponse.json({ error: 'Billing is not set up for this community.' }, { status: 400 });
    }

    // 2. Construct the return URL using JWT data and pointing to plugin callback page
    const baseUrl = `${parentAppUrl.replace(/\/$/, '')}/c/${communityShortId}/plugin/${pluginId}/`; // Use IDs from JWT
    const returnUrl = `${baseUrl}stripe-callback?stripe_status=portal_return`;

    // Conditional logic for URL based on body parameters removed.

    // 3. Create a Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl, // Updated URL
    });

    return NextResponse.json({ portalUrl: portalSession.url });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating Stripe billing portal session:', error);
    if (error instanceof Stripe.errors.StripeError) return NextResponse.json({ error: `Stripe Error: ${error.message}` }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // Admin required 