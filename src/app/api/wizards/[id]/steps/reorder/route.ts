import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Params type for this route (wizard ID)
interface ReorderStepsParams {
  id: string;
}

// Expected request body structure
interface ReorderRequestBody {
  stepIds: string[];
}

// PUT handler for reordering steps
export const PUT = withAuth<ReorderStepsParams>(async (req, { params }) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 401 }); // Use 401 for auth issues
  }

  const { id: wizardId } = params;
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard ID' }, { status: 400 });
  }

  let body: ReorderRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate request body
  if (!body || !Array.isArray(body.stepIds) || !body.stepIds.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'Invalid request body: stepIds must be an array of strings.' }, { status: 400 });
  }

  const { stepIds } = body;

  try {
    // 1. Authorize: Ensure the wizard belongs to the user's community
    const wizardRes = await query(
      `SELECT id FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
      [wizardId, user.cid]
    );
    if (wizardRes.rows.length === 0) {
      // Use 403 Forbidden if user is authenticated but not authorized for this wizard
      return NextResponse.json({ error: 'Forbidden: Wizard not found or not accessible' }, { status: 403 }); 
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Optional: Verify step count matches
      const countRes = await query('SELECT COUNT(*) FROM onboarding_steps WHERE wizard_id = $1', [wizardId]);
      const currentStepCount = parseInt(countRes.rows[0].count, 10);
      if (currentStepCount !== stepIds.length) {
         await query('ROLLBACK'); // Rollback before returning error
         return NextResponse.json({ error: 'Step count mismatch.' }, { status: 400 });
      }

      // 2. Update order for each step
      for (let i = 0; i < stepIds.length; i++) {
        const stepId = stepIds[i];
        const updateRes = await query(
          `UPDATE onboarding_steps SET step_order = $1 WHERE id = $2 AND wizard_id = $3`,
          [i, stepId, wizardId] // Use 0-based index for order
        );
        // Optional: Check affected rows if needed (updateRes.rowCount)
        if (updateRes.rowCount === 0) {
           // This means a stepId didn't belong to the wizard or didn't exist
           throw new Error(`Failed to update step ${stepId}. It might not belong to wizard ${wizardId}.`);
        }
      }

      // 3. Commit transaction
      await query('COMMIT');

      return NextResponse.json({ message: 'Step order updated successfully' }, { status: 200 });

    } catch (dbError) {
      // Rollback on any error during the update loop
      await query('ROLLBACK');
      console.error('Database error during step reorder transaction:', dbError);
      // Throw the error again to be caught by the outer catch block
      throw dbError;
    }

  } catch (error) {
    console.error('Failed to reorder steps:', error);
    return NextResponse.json({ error: 'Internal server error while reordering steps.' }, { status: 500 });
  }
}, true); // Assuming 'true' enforces admin/specific permissions needed to modify wizards 