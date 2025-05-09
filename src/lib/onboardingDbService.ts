import { query } from '@/lib/db';
import type { QuizmasterAiVerifiedData } from '@/types/onboarding-steps'; // For specific AI data

// A more generic type for verified_data if not specific to AI Quizmaster
// For now, we can make it flexible or use a base type if you have one.
interface GenericStepVerifiedData {
  [key: string]: any; 
}

/**
 * Marks a specific step as completed for a user in the database.
 * This function is intended to be called from server-side contexts.
 * It does NOT handle SQL transactions (BEGIN/COMMIT/ROLLBACK); 
 * the caller should manage transactions if this operation needs to be atomic 
 * with other database calls.
 * 
 * @param userId The ID of the user completing the step.
 * @param wizardId The ID of the wizard the step belongs to.
 * @param stepId The ID of the step being completed.
 * @param verifiedData Optional data associated with the step completion.
 * @throws If the database operation fails.
 */
export async function markStepAsCompletedInDB(
  userId: string,
  wizardId: string,
  stepId: string,
  verifiedData?: GenericStepVerifiedData | QuizmasterAiVerifiedData | null 
): Promise<void> {
  if (!userId || !wizardId || !stepId) {
    throw new Error('User ID, Wizard ID, and Step ID are required to mark step as complete.');
  }

  const verifiedDataJson = verifiedData ? JSON.stringify(verifiedData) : null;

  try {
    await query(
      `INSERT INTO user_wizard_progress (user_id, wizard_id, step_id, verified_data, completed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, wizard_id, step_id) DO UPDATE SET
         completed_at = NOW(),
         verified_data = COALESCE($4, user_wizard_progress.verified_data);`,
      [userId, wizardId, stepId, verifiedDataJson]
    );
    console.log(`Step marked as complete in DB: User ${userId}, Wizard ${wizardId}, Step ${stepId}`);
  } catch (error) {
    console.error(`Error in markStepAsCompletedInDB for User ${userId}, Step ${stepId}:`, error);
    // Re-throw the error so the caller can handle it (e.g., rollback transaction)
    throw error;
  }
} 