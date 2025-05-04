import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

interface BillingInfoResponse {
  currentPlan: {
    id: number;
    code: string;
    name: string;
  } | null;
  stripeCustomerId: string | null;
}

export const GET = withAuth(
  async (req: AuthenticatedRequest): Promise<NextResponse<BillingInfoResponse | { error: string }>> => {
    const communityId = req.user?.cid;

    if (!communityId) {
      return NextResponse.json({ error: 'Community ID not found in token' }, { status: 400 });
    }

    try {
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

      const currentPlan = communityData.current_plan_id
        ? {
            id: communityData.current_plan_id,
            code: communityData.plan_code,
            name: communityData.plan_name,
          }
        : null;

      const responseData: BillingInfoResponse = {
        currentPlan: currentPlan,
        stripeCustomerId: communityData.stripe_customer_id,
      };

      return NextResponse.json(responseData);
    } catch (error) {
      console.error('Error fetching community billing info:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  },
  true
); 