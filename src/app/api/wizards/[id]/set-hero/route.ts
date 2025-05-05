import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define the structure of the route parameters
interface SetHeroParams {
   id: string; // This is the wizardId
}

// PATCH: Set the specified wizard as the hero for the community
// This implicitly unsets any other hero wizard for the same community.
export const PATCH = withAuth<SetHeroParams>(async (req: AuthenticatedRequest, context: { params: SetHeroParams }) => {
    const user = req.user as JwtPayload | undefined;
    if (!user || !user.cid) {
      return NextResponse.json({ error: 'Missing community ID in token' }, { status: 401 });
    }
    const communityId = user.cid;
    const { id: wizardId } = context.params;

    if (!wizardId) {
      return NextResponse.json({ error: 'Missing wizard ID' }, { status: 400 });
    }

    try {
        // Start transaction
        await query('BEGIN');

        try {
            // 1. Verify wizard exists and belongs to the community
            const wizardCheck = await query(
                `SELECT id FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
                [wizardId, communityId]
            );

            if (wizardCheck.rows.length === 0) {
                await query('ROLLBACK');
                return NextResponse.json({ error: 'Wizard not found or not accessible' }, { status: 404 });
            }

            // 2. Unset any current hero wizard in this community
            await query(
                `UPDATE onboarding_wizards SET is_hero = false, updated_at = NOW() WHERE community_id = $1 AND is_hero = true`,
                [communityId]
            );

            // 3. Set the target wizard as the hero
            const updateResult = await query(
                `UPDATE onboarding_wizards SET is_hero = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
                [wizardId]
            );

            // Commit transaction
            await query('COMMIT');

            if (updateResult.rows.length === 0) {
                // Should not happen if step 1 passed, but safety check
                console.error(`Failed to set wizard ${wizardId} as hero after unsetting others.`);
                return NextResponse.json({ error: 'Failed to update hero status' }, { status: 500 });
            }

            return NextResponse.json({ wizard: updateResult.rows[0] }, { status: 200 });

        } catch (dbError) {
            // Rollback on any error during the transaction
            await query('ROLLBACK');
            console.error('Database error during set-hero transaction:', dbError);
            // Re-throw to be caught by the outer catch block
            throw dbError;
        }

    } catch (error) {
        console.error('Failed to set hero wizard:', error);
        return NextResponse.json({ error: 'Internal server error while setting hero wizard.' }, { status: 500 });
    }
}, true); // true = admin only 