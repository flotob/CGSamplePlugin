import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth'; // Import auth HOC and type
import { query } from '@/lib/db';

// Define structure for optional request body
interface RequestBody {
  communityShortId?: string;
  pluginId?: string;
}

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

    // 2. Construct the return URL conditionally
    let returnUrl: string;
    // Use local parentAppUrl variable
    const baseParentUrl = parentAppUrl.endsWith('/') ? parentAppUrl.slice(0, -1) : parentAppUrl;

    if (communityShortId && pluginId) {
      // Ideal future URL
      const baseUrl = `${parentAppUrl}/c/${communityShortId}/plugin/${pluginId}/`;
      returnUrl = `${baseUrl}?stripe_status=portal_return`;
    } else {
      // Current fallback URL (base parent URL + status)
      returnUrl = `${baseParentUrl}?stripe_status=portal_return`;
    }

    // 3. Create a Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ portalUrl: portalSession.url });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating Stripe billing portal session:', error);
    if (error instanceof Stripe.errors.StripeError) return NextResponse.json({ error: `Stripe Error: ${error.message}` }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // Admin required 