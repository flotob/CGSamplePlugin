import { query } from '@/lib/db';

// Mirror or import WizardSummary type if it's defined globally and suitable
// For now, defining a specific return type for clarity.
export interface CreatedWizard {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  required_role_id: string | null;
  assign_roles_per_step: boolean;
  is_hero: boolean; // Defaulted to false in DB schema, returned by RETURNING *
}

export interface CreateWizardServicePayload {
  name: string;
  communityId: string; // Admin's target community ID
  description?: string | null;
  is_active?: boolean; // Defaults to false if not provided, as per AI tool spec
  required_role_id?: string | null;
  assign_roles_per_step?: boolean; // Defaults to false if not provided
}

// Custom error for specific constraints if needed for granular handling
export class DuplicateWizardNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateWizardNameError';
  }
}

/**
 * Service function to create a new onboarding wizard.
 * Handles database insertion and returns the created wizard.
 * Does not handle quota checks - that's an API layer concern.
 */
export async function createWizardInService(
  payload: CreateWizardServicePayload
): Promise<CreatedWizard> {
  const { 
    name,
    communityId,
    description = null, // Default to null
    is_active = false,  // Default to false (draft mode)
    required_role_id = null, // Default to null
    assign_roles_per_step = false // Default to false
  } = payload;

  if (!name || name.trim() === '') {
    throw new Error('Wizard name is required.');
  }
  if (!communityId) {
    throw new Error('Community ID is required.');
  }

  try {
    const result = await query<CreatedWizard>(
      `INSERT INTO onboarding_wizards 
         (community_id, name, description, is_active, required_role_id, assign_roles_per_step)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        communityId, 
        name.trim(), 
        description,
        is_active,
        required_role_id,
        assign_roles_per_step
      ]
    );

    if (result.rows.length === 0) {
      throw new Error("Wizard creation failed in service, no row returned.");
    }
    return result.rows[0];

  } catch (error: any) {
    if (error.message && error.message.includes('uniq_wizard_name_per_community')) {
      throw new DuplicateWizardNameError(`A wizard with the name '${name}' already exists in this community.`);
    }
    // Re-throw other errors for the calling API route to handle
    console.error('[Service/createWizardInService] Error:', error);
    throw error; 
  }
} 