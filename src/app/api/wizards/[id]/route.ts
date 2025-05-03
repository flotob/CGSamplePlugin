import { withAuth } from '@/lib/withAuth';
import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';
// Import Quota checking utilities
import {
  enforceResourceLimit,
  Feature,
  QuotaExceededError,
} from '@/lib/quotas';

// Define AuthenticatedRequest if needed (can be shared)
interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
}

// Define WizardSummary if needed (can be shared)
interface WizardSummary {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Define the structure of the route parameters
interface WizardParams {
   id: string;
}

// GET handler would go here if needed (e.g., get single wizard details)
// Currently not implemented in the provided file search results

// Correctly typed GET handler (if implemented)
export const GET = withAuth<WizardParams>(async (req: AuthenticatedRequest, context: { params: WizardParams }) => {
  const user = req.user; // Using AuthenticatedRequest
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const { id } = context.params; // Correct access
  if (!id) {
    return NextResponse.json({ error: 'Missing wizard id' }, { status: 400 });
  }
  const result = await query(
    `SELECT * FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
    [id, user.cid]
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Wizard not found' }, { status: 404 });
  }
  return NextResponse.json({ wizard: result.rows[0] });
}, true);

// Correctly typed PUT handler
export const PUT = withAuth<WizardParams>(async (req: AuthenticatedRequest, context: { params: WizardParams }) => {
  const user = req.user;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const communityId = user.cid;
  const wizardId = context.params.id; // Correct access
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard id' }, { status: 400 });
  }

  let body: { name?: string; description?: string; is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description, is_active } = body;

  // Check if any fields are actually being updated
  if (name === undefined && description === undefined && is_active === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    // --- Quota Enforcement --- //
    // Check quota ONLY if the update explicitly sets is_active to true
    if (is_active === true) {
      await enforceResourceLimit(communityId, Feature.ActiveWizard);
    }
    // ------------------------ //

    // Dynamically build the SET part of the query
    const fieldsToUpdate: string[] = [];
    const values: (string | boolean | null)[] = [wizardId, communityId]; // Start with WHERE clause params
    let valueIndex = 3; // Start parameter index for SET clause

    if (name !== undefined) {
      fieldsToUpdate.push(`name = $${valueIndex}`);
      values.push(name);
      valueIndex++;
    }
    if (description !== undefined) {
      fieldsToUpdate.push(`description = $${valueIndex}`);
      values.push(description);
      valueIndex++;
    }
    if (is_active !== undefined) {
      fieldsToUpdate.push(`is_active = $${valueIndex}`);
      values.push(is_active);
      valueIndex++;
    }

    // Add updated_at timestamp
    fieldsToUpdate.push(`updated_at = NOW()`);

    const sql = `UPDATE onboarding_wizards
                 SET ${fieldsToUpdate.join(', ')}
                 WHERE id = $1 AND community_id = $2
                 RETURNING *`;

    const result = await query<WizardSummary>(sql, values);

    if (result.rows.length === 0) {
      // This could happen if the wizard ID doesn't exist OR doesn't belong to the community
      return NextResponse.json(
        { error: 'Wizard not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    return NextResponse.json({ wizard: result.rows[0] });

  } catch (error) {
    if (error instanceof QuotaExceededError) {
      // Specific structured error for quota limits
      const structuredErrorBody = {
        error: 'ResourceLimitExceeded',
        message: 'Maximum number of active wizards reached for the current plan.',
        details: {
          feature: error.feature,
          limit: error.limit,
          currentCount: Number(error.currentCount),
          limitType: 'resource',
        },
      };
      return NextResponse.json(structuredErrorBody, { status: 402 });
    } else if (error instanceof Error && error.message.includes('uniq_wizard_name_per_community')) {
      // Handle specific DB constraint errors, like unique name violation
      return NextResponse.json(
        { error: 'A wizard with this name already exists in this community.' },
        { status: 409 } // 409 Conflict
      );
    } else {
      // Handle other generic errors
      console.error('Error updating wizard:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
}, true);

// Correctly typed DELETE handler
export const DELETE = withAuth<WizardParams>(async (req: AuthenticatedRequest, context: { params: WizardParams }) => {
  const user = req.user;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const communityId = user.cid;
  const wizardId = context.params.id; // Correct access
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard id' }, { status: 400 });
  }

  try {
    // No quota check needed for deletion
    const result = await query<WizardSummary>(
      `DELETE FROM onboarding_wizards WHERE id = $1 AND community_id = $2 RETURNING *`,
      [wizardId, communityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Wizard not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Consider logging the deletion event if needed for auditing
    // await logUsageEvent(communityId, user.sub, Feature.WizardDeletion, wizardId);

    return NextResponse.json({ wizard: result.rows[0] }); // Return the deleted wizard

  } catch (error) {
      console.error('Error deleting wizard:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, true); 