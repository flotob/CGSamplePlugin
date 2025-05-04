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

// Retrieve Parent App URL from environment variables
const PARENT_APP_URL = process.env.PARENT_APP_URL;

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
    // Try to parse the body, but don't error if it's empty or invalid for now
    // as pluginId is optional
    const body: RequestBody | null = await req.json().catch(() => null);
    if (body?.pluginId) {
        pluginId = body.pluginId;
    }
  } catch (error) {
    // Ignore body parsing errors for now, treat as no pluginId provided
    console.warn('Could not parse request body for optional pluginId:', error);
  }

  try {
    // 1. Get community info (including stripe_customer_id)
    const communityResult = await query<CommunityRow>(
      `SELECT id, title, stripe_customer_id, current_plan_id FROM communities WHERE id = $1`,
      [communityId]
    );

    if (communityResult.rowCount === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }
    let community = communityResult.rows[0];

    // 2. Get 'pro' plan Stripe Price ID
    const planResult = await query<PlanRow>(
      `SELECT id, code, stripe_price_id FROM plans WHERE code = 'pro' AND is_active = true`
    );
    if (planResult.rowCount === 0 || !planResult.rows[0].stripe_price_id) {
      return NextResponse.json({ error: 'Pro plan configuration not found or missing Stripe Price ID.' }, { status: 500 });
    }
    const proPlanPriceId = planResult.rows[0].stripe_price_id;

    // 3. Ensure Stripe Customer exists
    let stripeCustomerId = community.stripe_customer_id;
    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          name: community.title, // Use community title as customer name
          metadata: {
            community_id: community.id,
          },
        });
        stripeCustomerId = customer.id;
        // Update database
        await query(
          `UPDATE communities SET stripe_customer_id = $1 WHERE id = $2`,
          [stripeCustomerId, community.id]
        );
      } catch (customerError) {
        console.error('Error creating Stripe customer:', customerError);
        return NextResponse.json({ error: 'Failed to create billing customer.' }, { status: 500 });
      }
    }

    // 4. Construct Redirect URLs conditionally based on pluginId
    const baseUrl = pluginId
      ? `${PARENT_APP_URL}/c/${communityId}/plugin/${pluginId}/`
      : `${PARENT_APP_URL}/c/${communityId}/`;
      
    const successUrl = `${baseUrl}?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}?stripe_status=cancel`;

    // 5. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [
        {
          price: proPlanPriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: communityId, // Link session back to community
      // Add metadata if needed
      // metadata: { community_id: communityId },
    });

    if (!session.id) {
         throw new Error("Stripe session creation failed, no ID returned.");
    }

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    // Check if it's a Stripe error
    if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json({ error: `Stripe Error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // Admin required 