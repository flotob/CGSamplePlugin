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

// --- Add Step Service --- 

export interface CreatedStep {
  id: string;
  wizard_id: string;
  step_type_id: string;
  step_order: number;
  config: object; // Stored as JSONB, comes back as object
  target_role_id: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddStepServicePayload {
  wizardId: string;
  step_type_id: string; 
  config?: object; 
  target_role_id?: string | null;
  is_mandatory?: boolean; 
  is_active?: boolean; 
}

/**
 * Service function to add a new step to an existing wizard.
 */
export async function addStepToWizardService(
  payload: AddStepServicePayload
): Promise<CreatedStep> {
  const {
    wizardId,
    step_type_id,
    config = {},
    target_role_id = null,
    is_mandatory = true,
    is_active = true
  } = payload;

  if (!wizardId) {
    throw new Error('Wizard ID is required to add a step.');
  }
  if (!step_type_id) {
    throw new Error('Step type ID is required to add a step.');
  }

  try {
    // 1. Find the next step_order
    const orderRes = await query<{ next_order: string }>( // next_order comes as string from COALESCE/MAX
      `SELECT COALESCE(MAX(step_order), 0) + 1 AS next_order FROM onboarding_steps WHERE wizard_id = $1`,
      [wizardId]
    );
    const step_order = parseInt(orderRes.rows[0]?.next_order || '1', 10);

    // 2. Insert the new step
    // The DB stores booleans as booleans. The API route was converting to string for some reason, maybe specific to its SQL construction.
    // Here, we pass booleans directly; pg driver should handle it.
    const result = await query<CreatedStep>(
      `INSERT INTO onboarding_steps 
         (wizard_id, step_type_id, step_order, config, target_role_id, is_mandatory, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        wizardId,
        step_type_id,
        step_order,
        config, // Pass object directly, pg driver stringifies for JSONB
        target_role_id,
        is_mandatory,
        is_active
      ]
    );

    if (result.rows.length === 0) {
      throw new Error("Step creation failed in service, no row returned.");
    }
    return result.rows[0];

  } catch (error: any) {
    // Handle potential foreign key violations or other DB errors
    console.error('[Service/addStepToWizardService] Error:', error);
    // Could add more specific error checks here if needed (e.g., for invalid wizardId or step_type_id FK violations)
    throw error; 
  }
}

// --- List Wizards Service ---

// Use existing WizardSummary or CreatedWizard, or define a specific one if different columns are needed.
// Assuming CreatedWizard is suitable for listing as well.
export type WizardListItem = CreatedWizard; // Alias for clarity if needed

export interface ListWizardsServicePayload {
  communityId: string;
  status?: 'active' | 'inactive' | 'all'; // 'inactive' for drafts
}

/**
 * Service function to list wizards for a community, with status filtering.
 */
export async function listWizardsService(
  payload: ListWizardsServicePayload
): Promise<WizardListItem[]> {
  const { communityId, status = 'all' } = payload;

  if (!communityId) {
    throw new Error('Community ID is required to list wizards.');
  }

  let queryString = `SELECT id, community_id, name, description, is_active, created_at, updated_at, required_role_id, assign_roles_per_step, is_hero 
                     FROM onboarding_wizards 
                     WHERE community_id = $1`;
  const queryParams: (string | boolean)[] = [communityId];

  let paramIndex = 2; // Start parameters for optional filters from $2

  if (status === 'active') {
    queryString += ` AND is_active = $${paramIndex}`;
    queryParams.push(true);
    paramIndex++;
  } else if (status === 'inactive') {
    queryString += ` AND is_active = $${paramIndex}`;
    queryParams.push(false);
    paramIndex++;
  }
  // If status is 'all', no additional is_active filter is added.

  queryString += ` ORDER BY updated_at DESC`;

  try {
    const result = await query<WizardListItem>(queryString, queryParams);
    return result.rows;
  } catch (error: any) {
    console.error('[Service/listWizardsService] Error:', error);
    throw error; // Re-throw for the API layer to handle
  }
}

// --- Get Wizard Details Service ---

// Re-using CreatedWizard as WizardDetails if the structure is identical/sufficient
export type WizardDetails = CreatedWizard;

export interface GetWizardDetailsServicePayload {
  wizardId: string;
  communityId: string;
}

export class WizardNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WizardNotFoundError';
  }
}

/**
 * Service function to fetch details for a specific wizard.
 */
export async function getWizardDetailsService(
  payload: GetWizardDetailsServicePayload
): Promise<WizardDetails> {
  const { wizardId, communityId } = payload;

  if (!wizardId) {
    throw new Error('Wizard ID is required to fetch details.');
  }
  if (!communityId) {
    throw new Error('Community ID is required for context when fetching wizard details.');
  }

  try {
    const result = await query<WizardDetails>(
      `SELECT * FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
      [wizardId, communityId]
    );

    if (result.rows.length === 0) {
      throw new WizardNotFoundError(`Wizard with ID '${wizardId}' not found in community '${communityId}'.`);
    }
    return result.rows[0];

  } catch (error: any) {
    // Re-throw WizardNotFoundError if it's already that type
    if (error instanceof WizardNotFoundError) throw error;
    
    console.error('[Service/getWizardDetailsService] Error:', error);
    // For other errors, wrap them or re-throw as a generic error
    throw new Error(`Failed to fetch wizard details: ${error.message}`);
  }
}

// --- Get Wizard Steps Service --- 

// Re-using CreatedStep if the structure for listing steps is identical/sufficient
export type WizardStepListItem = CreatedStep;

export interface GetWizardStepsServicePayload {
  wizardId: string;
  // No communityId needed here, as wizardId implies the context and an admin should only query for wizards they have access to.
  // The calling layer (e.g., AI tool execute) would ensure the wizardId is accessible to the admin.
}

/**
 * Service function to fetch all steps for a specific wizard, ordered by step_order.
 */
export async function getWizardStepsService(
  payload: GetWizardStepsServicePayload
): Promise<WizardStepListItem[]> {
  const { wizardId } = payload;

  if (!wizardId) {
    throw new Error('Wizard ID is required to fetch steps.');
  }

  try {
    // It's good practice for the calling layer (AI tool / API route) to ensure the admin has access to this wizardId.
    // This service function focuses on fetching the steps for a given wizardId.
    const result = await query<WizardStepListItem>(
      `SELECT * FROM onboarding_steps WHERE wizard_id = $1 ORDER BY step_order ASC`,
      [wizardId]
    );
    return result.rows; // Can be an empty array if wizard has no steps

  } catch (error: any) {
    console.error('[Service/getWizardStepsService] Error:', error);
    throw new Error(`Failed to fetch steps for wizard ${wizardId}: ${error.message}`);
  }
}

// --- Update Wizard Details Service ---

export interface UpdateWizardServicePayload {
  wizardId: string;
  communityId: string;
  name?: string;
  description?: string | null;
  is_active?: boolean;
  required_role_id?: string | null;
  assign_roles_per_step?: boolean;
}

export type UpdatedWizard = CreatedWizard; // Re-use if structure is the same

/**
 * Service function to update details for a specific wizard.
 * Does not handle quota checks for activating wizards - that is an API layer concern.
 */
export async function updateWizardDetailsService(
  payload: UpdateWizardServicePayload
): Promise<UpdatedWizard> {
  const { 
    wizardId, 
    communityId, 
    name,
    description,
    is_active,
    required_role_id,
    assign_roles_per_step
  } = payload;

  if (!wizardId) {
    throw new Error('Wizard ID is required to update details.');
  }
  if (!communityId) {
    throw new Error('Community ID is required for context when updating wizard details.');
  }

  const fieldsToUpdate: string[] = [];
  const values: (string | boolean | null | undefined)[] = []; // Allow undefined to filter out easily

  // Helper to add fields to update
  const addField = (dbField: string, value: any) => {
    if (value !== undefined) {
      fieldsToUpdate.push(`${dbField} = $${values.length + 1}`);
      values.push(value);
    }
  };

  addField('name', name);
  addField('description', description);
  addField('is_active', is_active);
  addField('required_role_id', required_role_id);
  addField('assign_roles_per_step', assign_roles_per_step);

  if (fieldsToUpdate.length === 0) {
    throw new Error("No updatable fields provided.");
  }

  // Always update updated_at
  fieldsToUpdate.push(`updated_at = NOW()`);

  // Add wizardId and communityId for the WHERE clause, these must be the LAST elements in the values array
  // for correct parameter indexing in the final query, after all SET parameters.
  const whereClauseParamsStartIndex = values.length + 1;
  values.push(wizardId);
  values.push(communityId);

  const sql = `UPDATE onboarding_wizards
               SET ${fieldsToUpdate.join(', ')}
               WHERE id = $${whereClauseParamsStartIndex} AND community_id = $${whereClauseParamsStartIndex + 1}
               RETURNING *`;

  try {
    const result = await query<UpdatedWizard>(sql, values);

    if (result.rows.length === 0) {
      throw new WizardNotFoundError(`Wizard with ID '${wizardId}' not found in community '${communityId}', or no changes made.`);
    }
    return result.rows[0];

  } catch (error: any) {
    if (error instanceof WizardNotFoundError) throw error;
    if (error.message && error.message.includes('uniq_wizard_name_per_community')) {
      throw new DuplicateWizardNameError(`A wizard with the name '${name}' already exists in this community.`);
    }
    console.error('[Service/updateWizardDetailsService] Error:', error);
    throw new Error(`Failed to update wizard details: ${error.message}`);
  }
} 