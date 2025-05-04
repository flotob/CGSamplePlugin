import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth'; // Import auth HOC and type
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion: '2024-04-10', // Defaulting to account version
  typescript: true,
});

// Retrieve Parent App URL from environment variables
const PARENT_APP_URL = process.env.PARENT_APP_URL;

// Define structure for optional request body
interface RequestBody {
  pluginId?: string;
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  if (!PARENT_APP_URL) {
    console.error('PARENT_APP_URL is not set in environment variables.');
    return NextResponse.json({ error: 'Configuration error: Missing parent app URL.' }, { status: 500 });
  }

  const communityId = req.user?.cid;
  if (!communityId) {
    return NextResponse.json({ error: 'Community ID not found in token' }, { status: 400 });
  }

  let pluginId: string | undefined;
  try {
    // Try to parse the body for optional pluginId
    const body: RequestBody | null = await req.json().catch(() => null);
    if (body?.pluginId) {
        pluginId = body.pluginId;
    }
  } catch (error) {
    console.warn('Could not parse request body for optional pluginId:', error);
  }

  try {
    // 1. Get the community's Stripe Customer ID
    const communityResult = await query<{ stripe_customer_id: string | null } >(
      `SELECT stripe_customer_id FROM communities WHERE id = $1`,
      [communityId]
    );

    const stripeCustomerId = communityResult.rows[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
      console.error(`Stripe customer ID not found for community ${communityId}. Cannot create portal session.`);
      return NextResponse.json(
        { error: 'Billing is not set up for this community.' },
        { status: 400 }
      );
    }

    // 2. Construct the return URL conditionally
    const baseUrl = pluginId
      ? `${PARENT_APP_URL}/c/${communityId}/plugin/${pluginId}/`
      : `${PARENT_APP_URL}/c/${communityId}/`;
      
    const returnUrl = `${baseUrl}?stripe_status=portal_return`;

    // 3. Create a Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ portalUrl: portalSession.url });

  } catch (error) {
    console.error('Error creating Stripe billing portal session:', error);
    if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json({ error: `Stripe Error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // Admin required 