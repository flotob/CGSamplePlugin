import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

// Define the params type for this route
interface DuplicateWizardParams {
  id: string; // The ID of the wizard to duplicate
}

export const POST = withAuth<DuplicateWizardParams>(async (req, { params }) => {
  // Type guard: ensure user is admin and has community ID
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!user.adm) {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }
  const communityId = user.cid;
  const originalWizardId = params.id;

  if (!originalWizardId) {
    return NextResponse.json({ error: 'Missing original wizard ID' }, { status: 400 });
  }

  try {
    // 1 & 2. Verify original wizard exists and fetch its details
    const originalWizardRes = await query(
      `SELECT name, description FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
      [originalWizardId, communityId]
    );

    if (originalWizardRes.rows.length === 0) {
      return NextResponse.json({ error: 'Original wizard not found or access denied' }, { status: 404 });
    }
    const originalWizard = originalWizardRes.rows[0];

    // 3. Fetch original steps
    const originalStepsRes = await query(
      `SELECT step_type_id, step_order, config, target_role_id, is_mandatory, is_active
       FROM onboarding_steps
       WHERE wizard_id = $1 ORDER BY step_order ASC`,
      [originalWizardId]
    );
    const originalSteps = originalStepsRes.rows;

    // 4. Create new wizard record
    const newWizardId = uuidv4();
    const newWizardName = `${originalWizard.name} (Copy)`;
    const newWizardRes = await query(
      `INSERT INTO onboarding_wizards (id, community_id, name, description, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [newWizardId, communityId, newWizardName, originalWizard.description, false] // New wizard is inactive
    );
    const newWizard = newWizardRes.rows[0];

    // 5. Create copies of steps for the new wizard
    if (originalSteps.length > 0) {
      // Use Promise.all to run inserts concurrently (optional, depends on load)
      await Promise.all(originalSteps.map(step => {
        const newStepId = uuidv4();
        return query(
          `INSERT INTO onboarding_steps
             (id, wizard_id, step_type_id, step_order, config, target_role_id, is_mandatory, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            newStepId,
            newWizardId, // Link to the NEW wizard
            step.step_type_id,
            step.step_order,
            step.config, // Assuming config is JSONB, can be copied directly
            step.target_role_id,
            step.is_mandatory,
            step.is_active, // Copy active status of steps from original
          ]
        );
      }));
    }

    // 6. Return the newly created wizard
    return NextResponse.json({ wizard: newWizard }, { status: 201 });

  } catch (error) {
    console.error('Error duplicating wizard:', error);
    // Check for unique constraint violation on name (if duplicate " (Copy)" already exists)
    if (error instanceof Error && error.message.includes('uniq_wizard_name_per_community')) {
        return NextResponse.json({ error: 'A wizard with the duplicated name already exists. Please rename the copy.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error duplicating wizard' }, { status: 500 });
  }
}, true); // true = adminOnly 