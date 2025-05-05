import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Define the structure of the route parameters
interface SetHeroParams {
   id: string; // This is the wizardId
}

// Optional request body to specify the desired state
interface SetHeroBody {
    is_hero: boolean;
}

// PATCH: Set or Unset the specified wizard as the hero for the community
export const PATCH = withAuth<SetHeroParams>(async (req: AuthenticatedRequest, context: { params: SetHeroParams }) => {
    const user = req.user;
    if (!user || !user.cid) {
      return NextResponse.json({ error: 'Missing community ID in token' }, { status: 401 });
    }
    const communityId = user.cid;
    const { id: wizardId } = context.params;

    if (!wizardId) {
      return NextResponse.json({ error: 'Missing wizard ID' }, { status: 400 });
    }

    let targetState = true; // Default to setting hero (maintains previous behavior)
    try {
        // Try to parse body, ignore if empty or invalid JSON
        const body: Partial<SetHeroBody> = await req.json();
        if (typeof body.is_hero === 'boolean') {
            targetState = body.is_hero;
        }
    } catch (e) { /* Ignore body parsing errors, use default targetState */ }

    // --- Verify wizard ownership first --- 
    try {
        const wizardCheck = await query(
            `SELECT id FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
            [wizardId, communityId]
        );
        if (wizardCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Wizard not found or not accessible' }, { status: 404 });
        }
    } catch (error) {
        console.error('Failed to verify wizard ownership:', error);
        return NextResponse.json({ error: 'Internal server error verifying wizard' }, { status: 500 });
    }

    // --- Perform Update based on targetState --- 
    if (targetState === true) {
        // --- Logic to SET hero --- 
        try {
            await query('BEGIN');
            // Unset any current hero wizard in this community
            await query(
                `UPDATE onboarding_wizards SET is_hero = false, updated_at = NOW() WHERE community_id = $1 AND is_hero = true`,
                [communityId]
            );
            // Set the target wizard as the hero
            const updateResult = await query(
                `UPDATE onboarding_wizards SET is_hero = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
                [wizardId]
            );
            await query('COMMIT');

            if (updateResult.rows.length === 0) {
                throw new Error('Failed to update wizard row after commit');
            }
            return NextResponse.json({ wizard: updateResult.rows[0], message: 'Wizard set as hero.' }, { status: 200 });

        } catch (dbError) {
            await query('ROLLBACK');
            console.error('Database error during set-hero transaction:', dbError);
            return NextResponse.json({ error: 'Failed to set hero status' }, { status: 500 });
        }
    } else {
        // --- Logic to UNSET hero --- 
        try {
            const updateResult = await query(
                `UPDATE onboarding_wizards SET is_hero = false, updated_at = NOW() WHERE id = $1 AND community_id = $2 RETURNING *`,
                [wizardId, communityId] // Ensure we only unset for the correct community
            );
            if (updateResult.rows.length === 0) {
                 // Should not happen if ownership check passed, but good safety.
                return NextResponse.json({ error: 'Failed to unset hero status, wizard not found?' }, { status: 404 });
            }
             return NextResponse.json({ wizard: updateResult.rows[0], message: 'Wizard hero status removed.'}, { status: 200 });
        } catch (dbError) {
             console.error('Database error during unset-hero operation:', dbError);
            return NextResponse.json({ error: 'Failed to unset hero status' }, { status: 500 });
        }
    }
}, true); // true = admin only 