// 'use client'; // Removed directive

import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { markStepAsCompletedInDB } from '@/lib/onboardingDbService'; // Import the new service function
// import { validateStepCompletion } from '@/lib/credentialVerification'; // Removed unused import

// Define the expected shape of the request body (optional)
interface CompleteStepRequestBody {
    verified_data?: Record<string, unknown>; // Optional data to store upon completion
}

// Define the params type for this route
interface CompleteStepParams {
    id: string;       // Renamed from wizardId
    stepId: string;
}

// Define NEW response structure
interface StepCompletionResponse {
  success: boolean;
  shouldAssignRole: boolean;
  roleIdToAssign: string | null;
}

// Define Step type subset needed
interface StepInfo {
  id: string;
  target_role_id: string | null;
  step_type_id: string;
  // config: any; // Add if config is needed for validation
}

// Define Wizard type subset needed
interface WizardInfo {
  id: string;
  assign_roles_per_step: boolean;
}

export const POST = withAuth<CompleteStepParams>(async (req: AuthenticatedRequest, context: { params: CompleteStepParams }) => {
  const user = req.user;
  if (!user?.sub || !user.cid) { 
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.sub;
  const communityId = user.cid; 

  // Correctly destructure 'id' and rename to 'wizardId'
  const { id: wizardId, stepId } = context.params;
  if (!wizardId || !stepId) {
    return NextResponse.json({ error: 'Missing wizard or step ID' }, { status: 400 });
  }

  let body: CompleteStepRequestBody | null = null;
  try {
    // Try parsing body, but allow empty body
    if (req.headers.get('content-type')?.includes('application/json')) {
        body = await req.json();
    }
  } catch {
     // Ignore JSON parsing errors if body isn't expected or provided
     console.warn('Could not parse JSON body for step completion, proceeding without verified_data.');
  }

  // const verifiedData = body?.verified_data ? JSON.stringify(body.verified_data) : null; // Stringification now handled by the service

  try {
    await query('BEGIN');

    // Verify the step exists, belongs to the wizard, and the wizard belongs to the user's community
    // Also fetch the wizard's assign_roles_per_step flag and the step's target_role_id
    const stepWizardResult = await query(
      `SELECT 
         s.id AS step_id, 
         s.target_role_id,
         s.step_type_id,
         w.id AS wizard_id, 
         w.assign_roles_per_step
       FROM onboarding_steps s
       JOIN onboarding_wizards w ON s.wizard_id = w.id
       WHERE s.id = $1 AND s.wizard_id = $2 AND w.community_id = $3`,
      [stepId, wizardId, communityId]
    );

    if (stepWizardResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Step not found or access denied' }, { status: 404 });
    }

    const stepInfo: StepInfo = {
      id: stepWizardResult.rows[0].step_id,
      target_role_id: stepWizardResult.rows[0].target_role_id,
      step_type_id: stepWizardResult.rows[0].step_type_id,
      // config: stepWizardResult.rows[0].config // Uncomment if needed
    };
    const wizardInfo: WizardInfo = {
      id: stepWizardResult.rows[0].wizard_id,
      assign_roles_per_step: stepWizardResult.rows[0].assign_roles_per_step,
    };

    // --- Credential Verification Logic ---
    // ... (existing credential verification logic if any, should be before marking complete) ...
    // --- End Credential Verification ---

    // Use the new service function to update progress
    await markStepAsCompletedInDB(userId, wizardId, stepId, body?.verified_data);
    
    // Determine if a role should be assigned based on this step completion
    const shouldAssign = wizardInfo.assign_roles_per_step && !!stepInfo.target_role_id;
    const roleIdToAssign = shouldAssign ? stepInfo.target_role_id : null;

    // Commit the transaction before returning
    await query('COMMIT');

    // Return the new response structure
    const responsePayload: StepCompletionResponse = {
      success: true,
      shouldAssignRole: shouldAssign,
      roleIdToAssign: roleIdToAssign,
    };
    return NextResponse.json(responsePayload);

  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK').catch(rollbackError => {
        console.error('Failed to rollback transaction:', rollbackError);
    });

    // Specific error handling (like validation error)
    if (error instanceof Error && error.message.startsWith('Verification failed:')) {
      return NextResponse.json({ error: 'Step completion failed', details: error.message }, { status: 400 });
    }

    // Generic error handling
    console.error('Error marking step as complete:', error);
    return NextResponse.json({ error: 'Internal server error completing step' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 