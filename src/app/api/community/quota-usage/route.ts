import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import type { JwtPayload as BaseJwtPayload } from '@/app/api/auth/session/route';
import { query } from '@/lib/db'; // Import the database query utility

// Combine base payload with properties added by withAuth
type AuthenticatedJwtPayload = BaseJwtPayload & { iat: number; exp: number };

/**
 * GET /api/community/quota-usage
 * 
 * Retrieves the current community's usage against their plan's active wizard limit.
 * Admin only.
 */
export const GET = withAuth(async (req) => {
  // Type assertion using the specific type for the authenticated request
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user as AuthenticatedJwtPayload; // Use the combined type
  const communityId = user.cid;

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID not found in token' }, { status: 400 });
  }

  try {
    // 1. Fetch community's current plan ID
    const communityRes = await query(
      'SELECT id, current_plan_id FROM communities WHERE id = $1',
      [communityId]
    );

    if (!communityRes || communityRes.rowCount === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }
    const currentCommunity = communityRes.rows[0];
    const currentPlanId = currentCommunity.current_plan_id;

    // 2. Fetch all active plans and their relevant limits
    const allPlansQuery = `
      SELECT 
        p.id, 
        p.name,
        p.code as plan_code, -- For display or logic if needed
        COALESCE(pl_wizard.hard_limit, 0) AS wizard_limit,
        COALESCE(pl_image.hard_limit, 0) AS image_generation_limit,
        pl_image.time_window AS image_generation_time_window,
        COALESCE(pl_chat.hard_limit, 0) AS ai_chat_message_limit,
        pl_chat.time_window AS ai_chat_message_time_window
      FROM plans p
      LEFT JOIN plan_limits pl_wizard ON p.id = pl_wizard.plan_id 
        AND pl_wizard.feature = 'active_wizard' 
        AND pl_wizard.time_window = '0 seconds'::interval 
      LEFT JOIN plan_limits pl_image ON p.id = pl_image.plan_id 
        AND pl_image.feature = 'image_generation' 
        AND pl_image.time_window = '30 days'::interval -- Display the 30-day limit
      LEFT JOIN plan_limits pl_chat ON p.id = pl_chat.plan_id 
        AND pl_chat.feature = 'ai_chat_message' 
        AND pl_chat.time_window = '1 day'::interval -- Display the 1-day limit
      WHERE p.is_active = true
      ORDER BY p.price_cents ASC;
    `;
    const allPlansRes = await query(allPlansQuery);

    const allPlans = allPlansRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      planCode: row.plan_code,
      wizardLimit: parseInt(row.wizard_limit, 10),
      imageGenerationLimit: parseInt(row.image_generation_limit, 10),
      imageGenerationTimeWindow: row.image_generation_time_window, // e.g., "30 days"
      aiChatMessageLimit: parseInt(row.ai_chat_message_limit, 10),
      aiChatMessageTimeWindow: row.ai_chat_message_time_window, // e.g., "1 day"
    }));

    // 3. Fetch current usage for the specific community based on their current plan's limits
    let currentWizardUsage = 0;
    let currentImageGenerationUsage = 0;
    let currentAiChatMessageUsage = 0;

    const currentPlanDetails = allPlans.find(p => p.id === currentPlanId);

    // Fetch active wizard count (resource limit, not from usage_events typically)
    const wizardCountRes = await query(
      'SELECT COUNT(*) FROM onboarding_wizards WHERE community_id = $1 AND is_active = true',
      [communityId]
    );
    currentWizardUsage = wizardCountRes?.rows?.[0]?.count ? parseInt(wizardCountRes.rows[0].count, 10) : 0;

    if (currentPlanDetails) {
      // Fetch image generation usage if window is defined
      if (currentPlanDetails.imageGenerationTimeWindow) {
        const imageUsageRes = await query(
          `SELECT COUNT(*) FROM usage_events 
           WHERE community_id = $1 AND feature = 'image_generation' 
           AND occurred_at >= (now() - $2::interval)`,
          [communityId, currentPlanDetails.imageGenerationTimeWindow]
        );
        currentImageGenerationUsage = imageUsageRes?.rows?.[0]?.count ? parseInt(imageUsageRes.rows[0].count, 10) : 0;
      }

      // Fetch AI chat message usage if window is defined
      if (currentPlanDetails.aiChatMessageTimeWindow) {
        const chatUsageRes = await query(
          `SELECT COUNT(*) FROM usage_events 
           WHERE community_id = $1 AND feature = 'ai_chat_message' 
           AND occurred_at >= (now() - $2::interval)`,
          [communityId, currentPlanDetails.aiChatMessageTimeWindow]
        );
        currentAiChatMessageUsage = chatUsageRes?.rows?.[0]?.count ? parseInt(chatUsageRes.rows[0].count, 10) : 0;
      }
    }

    const data = { 
      currentPlanId: currentPlanId,
      currentWizardUsage: currentWizardUsage,
      currentImageGenerationUsage: currentImageGenerationUsage,
      currentAiChatMessageUsage: currentAiChatMessageUsage,
      plans: allPlans,
    };

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching quota usage:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch quota usage', details: errorMessage }, { status: 500 });
  }
}, true); // true = admin only 