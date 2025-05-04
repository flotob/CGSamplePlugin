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

// Define expected structure for community query result
interface CommunityRow {
  id: string;
  stripe_customer_id: string | null;
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const communityId = user.cid;

  try {
    // 1. Get the community's Stripe Customer ID
    const communityRes = await query<CommunityRow>(
      `SELECT stripe_customer_id FROM communities WHERE id = $1`,
      [communityId]
    );
    const community = communityRes.rows[0];

    if (!community) {
      // Should not happen if user is authenticated for a community, but good practice
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const stripeCustomerId = community.stripe_customer_id;

    if (!stripeCustomerId) {
      // This community hasn't subscribed/interacted with Stripe billing yet
      console.warn(`Attempted to create portal session for community ${communityId} without Stripe customer ID.`);
      return NextResponse.json(
        { error: 'Billing is not yet enabled for this community.' },
        { status: 400 } // Bad Request, as they shouldn't be able to click 'Manage' yet
      );
    }

    // 2. Define the return URL (where user returns after portal)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    // TODO: Adjust this URL to point to your actual billing page/route
    const returnUrl = `${baseUrl}/admin/settings/billing`;

    // 3. Create the Stripe Billing Portal Session
    console.log(`Creating Billing Portal session for Customer ${stripeCustomerId}`);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    // 4. Return the portal session URL
    return NextResponse.json({ portalUrl: portalSession.url });

  } catch (error: any) {
    console.error('Error creating Stripe Portal session:', error);
    // Check for specific Stripe errors if needed
    // if (error instanceof Stripe.errors.StripeError) { ... }
    return NextResponse.json(
      { error: `Failed to create portal session: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}, true); // true = adminOnly (assuming only admins manage billing) 