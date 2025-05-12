import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { streamText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Feature, enforceEventRateLimit, QuotaExceededError, logUsageEvent } from '@/lib/quotas'; // Import Quota utilities
/* eslint-disable @typescript-eslint/no-unused-vars */
import { createWizardInService, DuplicateWizardNameError, type CreatedWizard } from '@/lib/services/wizardAdminService'; // Import the new service
import { addStepToWizardService, type AddStepServicePayload, type CreatedStep } from '@/lib/services/wizardAdminService'; // Import new step service items
import { listWizardsService, type ListWizardsServicePayload, type WizardListItem } from '@/lib/services/wizardAdminService'; // Import listWizardsService
import { 
  getWizardDetailsService, type GetWizardDetailsServicePayload, type WizardDetails, WizardNotFoundError,
  getWizardStepsService, type GetWizardStepsServicePayload, type WizardStepListItem,
  updateWizardDetailsService, type UpdateWizardServicePayload, type UpdatedWizard,
  updateStepInWizardService, type UpdateStepServicePayload, type UpdatedStep, StepNotFoundError,
  deleteStepFromWizardService, type DeleteStepServicePayload, type DeletedStep,
  reorderStepsInWizardService, type ReorderStepsServicePayload, type ReorderStepsResult,
  StepCountMismatchError, InvalidStepIdError,
  deleteWizardService, type DeleteWizardServicePayload, type DeletedWizard // Import delete wizard service
} from '@/lib/services/wizardAdminService'; // Import services and types
/* eslint-enable @typescript-eslint/no-unused-vars */

// Ensure OpenAI API key is configured in your environment variables
// For example, process.env.OPENAI_API_KEY

interface AdminChatRequestBody {
  messages: CoreMessage[];
  // We might add other contextual data here later, e.g., current community being managed if admin oversees multiple
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const adminUser = req.user;

  // withAuth(..., true) should handle admin restriction.
  // The explicit check for adminUser.isAdmin is removed as JwtPayload might not have it directly,
  // and withAuth is the primary guard.
  if (!adminUser) { // Still check if adminUser exists (e.g. token validation failed upstream in withAuth)
    return NextResponse.json({ error: 'Forbidden: Admin authentication failed' }, { status: 403 });
  }
  
  const communityId = adminUser.cid; 
  if (!communityId) {
    return NextResponse.json({ error: 'Community ID missing from admin token' }, { status: 400 });
  }

  // --- Quota Check for Admin AI Chat ---
  try {
    // TODO: Consider a separate Feature flag for Admin AI Chat in the future for more granular quota control.
    // For now, using the general AIChatMessage quota.
    await enforceEventRateLimit(communityId, Feature.AIChatMessage);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ 
        error: error.message, 
        quotaError: true, 
        details: { feature: error.feature, limit: error.limit, currentCount: error.currentCount }
      }, { status: 429 });
    }
    console.error('[Admin AI Chat] Error checking quota:', error);
    return NextResponse.json({ error: 'Internal server error during quota check.' }, { status: 500 });
  }
  // --- End Quota Check ---

  let payload: AdminChatRequestBody;
  try {
    payload = await req.json();
    if (!payload.messages || !Array.isArray(payload.messages) || payload.messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request body: messages array is required.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Admin AI Chat] Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }

  const { messages: chatHistory } = payload;

  const systemMessageContent = 
    "You are an administrative AI assistant for the platform. " +
    "You can help manage onboarding wizards, steps, and other administrative tasks. " +
    "Use the available tools to perform actions as requested by the admin. " +
    "Always confirm actions before executing destructive operations if the tool description doesn't imply it already requires confirmation.";

  const messagesForAI: CoreMessage[] = [
    { role: "system", content: systemMessageContent },
    ...chatHistory, 
  ];
  
  try {
    const result = await streamText({
      model: openai(process.env.OPENAI_API_MODEL || "gpt-4o"), // Ensure OPENAI_API_MODEL is in .env or default
      messages: messagesForAI,
      tools: {
        createWizard: {
          description: "Creates a new onboarding wizard. Wizards are created as inactive (drafts) by default. Provide a name, and optionally a description, required role ID, and role assignment strategy.",
          parameters: z.object({
            name: z.string().describe("The name for the new wizard. This is required."),
            description: z.string().optional().describe("A brief description of the wizard."),
            required_role_id: z.string().optional().describe("Optional: ID of a role the user must have to access this wizard."),
            assign_roles_per_step: z.boolean().optional().default(false).describe("Optional: If true, roles from steps are assigned immediately after step completion. Default is false (roles assigned at wizard completion).")
          }),
          execute: async (params: { // Destructure params directly
            name: string;
            description?: string;
            required_role_id?: string;
            assign_roles_per_step?: boolean;
          }) => {
            // communityId is from the outer scope (adminUser.cid)
            console.log('[Admin AI Tool - createWizard] Attempting to create wizard with params:', params);
            console.log('[Admin AI Tool - createWizard] Using Community ID:', communityId);

            try {
              const newWizard = await createWizardInService({
                ...params, // Spread AI provided params
                communityId: communityId, // Pass admin's community context
                // is_active will default to false in the service if not provided by AI
              });
              
              console.log('[Admin AI Tool - createWizard] Service call successful:', newWizard);
              return { 
                success: true, 
                messageForAI: `Wizard '${newWizard.name}' (ID: ${newWizard.id}) created successfully as a draft in community ${communityId}.`,
                wizardId: newWizard.id,
                wizardName: newWizard.name,
                communityId: newWizard.community_id
              };

            } catch (error: unknown) {
              console.error('[Admin AI Tool - createWizard] Error calling createWizardInService:', error);
              let errorMessage = 'An unexpected error occurred while creating the wizard.';
              if (error instanceof DuplicateWizardNameError) {
                errorMessage = error.message;
              } else if (error instanceof Error) {
                errorMessage = error.message; // Generic error message
              }
              return { 
                success: false, 
                errorForAI: `Failed to create wizard: ${errorMessage}`,
                // No details to return for now, could add error.name or error.code if available/useful
              };
            }
          }
        },
        addWizardStep: {
          description: "Adds a new step to an existing wizard. You need to provide the wizard ID, the step type ID, and the full configuration object for the step (which includes 'presentation' and 'specific' parts).",
          parameters: z.object({
            wizardId: z.string().describe("The ID of the wizard to which this step will be added."),
            step_type_id: z.string().uuid().describe("The UUID of the step type (e.g., for Content, AI Quiz, ENS Verification). Obtain this from a list of available step types if unsure."),
            config: z.object({
              presentation: z.record(z.any()).optional().describe("Object for presentation settings like headline, subtitle, backgroundType, backgroundValue."),
              specific: z.record(z.any()).optional().describe("Object for type-specific settings. The structure depends on the step_type_id.")
            }).optional().default({}).describe("Configuration for the step. Defaults to empty if not provided, but most steps will require specific configuration."),
            target_role_id: z.string().uuid().optional().nullable().describe("Optional: ID of a role to grant upon completing this step."),
            is_mandatory: z.boolean().optional().default(true).describe("Optional: Whether this step is mandatory. Defaults to true."),
            is_active: z.boolean().optional().default(true).describe("Optional: Whether this step is active. Defaults to true.")
          }),
          execute: async (params: AddStepServicePayload) => { // Use the service payload type directly
            // wizardId and other params come directly from the AI
            // communityId is not directly used by addStepToWizardService, as wizardId provides context,
            // and authorization for wizard access would have been done by the admin calling this AI tool.
            console.log('[Admin AI Tool - addWizardStep] Attempting to add step with params:', params);
            try {
              const newStep = await addStepToWizardService(params);
              console.log('[Admin AI Tool - addWizardStep] Service call successful:', newStep);
              return {
                success: true,
                messageForAI: `Step of type ID '${newStep.step_type_id}' added successfully to wizard ${newStep.wizard_id} with order ${newStep.step_order}. Step ID: ${newStep.id}.`,
                stepId: newStep.id,
                wizardId: newStep.wizard_id,
                stepOrder: newStep.step_order
              };
            } catch (error: unknown) {
              console.error('[Admin AI Tool - addWizardStep] Error calling addStepToWizardService:', error);
              return {
                success: false,
                errorForAI: `Failed to add step: ${error instanceof Error ? error.message : 'An unexpected error occurred.'}`
              };
            }
          }
        },
        getAvailableStepTypes: {
          description: "Retrieves a list of all available step types that can be added to a wizard. Each step type includes its ID, unique name (for identification), display label, a general description, and a flag indicating if it requires credentials setup. Use this to help the admin choose a step type or to find the correct ID for a step type name.",
          parameters: z.object({}), // No parameters needed
          execute: async () => {
            console.log('[Admin AI Tool - getAvailableStepTypes] Fetching step types...');
            try {
              // Construct the full URL for the API endpoint
              // Assuming the chat API is running on the same host, construct a relative URL or use an env var for base URL.
              // For server-side fetch, we need the absolute URL.
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Fallback for local dev
              const response = await fetch(`${baseUrl}/api/step_types`);
              
              if (!response.ok) {
                throw new Error(`Failed to fetch step types: ${response.status} ${response.statusText}`);
              }
              const data = await response.json();
              
              if (!data || !Array.isArray(data.step_types)) {
                throw new Error('Invalid response structure from /api/step_types');
              }
              
              console.log('[Admin AI Tool - getAvailableStepTypes] Successfully fetched step types:', data.step_types.length);
              return {
                success: true,
                messageForAI: "Here are the available step types. Use the 'name' to discuss with the admin and the 'id' for API calls. The 'description' may offer configuration hints. If creating a step, I will still need the specific configuration details from the admin after the type is chosen.",
                stepTypes: data.step_types // This is an array of objects
              };

            } catch (error: unknown) {
              console.error('[Admin AI Tool - getAvailableStepTypes] Error:', error);
              return { 
                success: false, 
                errorForAI: `Failed to retrieve step types: ${error instanceof Error ? error.message : 'An unexpected error occurred.'}`
              };
            }
          }
        },
        getWizardsList: {
          description: "Retrieves a list of onboarding wizards for the admin's current community. You can filter by status: 'active', 'inactive' (for drafts), or 'all'. Default is 'all'.",
          parameters: z.object({
            status: z.enum(["active", "inactive", "all"]).optional().default("all")
              .describe("Filter wizards by status. 'inactive' shows draft wizards.")
          }),
          execute: async (params: { status?: 'active' | 'inactive' | 'all' }) => {
            // communityId is from the adminUser context in the outer scope
            console.log(`[Admin AI Tool - getWizardsList] Fetching wizards with status: ${params.status || 'all'} for community: ${communityId}`);
            try {
              const wizards = await listWizardsService({
                communityId: communityId,
                status: params.status
              });
              
              console.log(`[Admin AI Tool - getWizardsList] Successfully fetched ${wizards.length} wizards.`);
              return {
                success: true,
                messageForAI: `Found ${wizards.length} wizards with status '${params.status || 'all'}'. ${wizards.length > 0 ? 'Here is the list.' : 'No wizards match this criteria.'}`,
                wizards: wizards // Array of wizard objects
              };

            } catch (error: unknown) {
              console.error('[Admin AI Tool - getWizardsList] Error:', error);
              return { 
                success: false, 
                errorForAI: `Failed to retrieve wizards: ${error instanceof Error ? error.message : 'An unexpected error occurred.'}`
              };
            }
          }
        },
        getWizardDetailsAndSteps: {
          description: "Retrieves detailed information for a specific wizard, including its configuration and all its steps in their current order. Provide the Wizard ID.",
          parameters: z.object({
            wizardId: z.string().uuid().describe("The ID of the wizard to fetch details and steps for.")
          }),
          execute: async (params: { wizardId: string }) => {
            const { wizardId } = params;
            // communityId is from the adminUser context in the outer scope
            console.log(`[Admin AI Tool - getWizardDetailsAndSteps] Fetching details for wizard ID: ${wizardId} in community: ${communityId}`);
            try {
              const wizardDetails = await getWizardDetailsService({
                wizardId: wizardId,
                communityId: communityId
              });
              
              const steps = await getWizardStepsService({
                wizardId: wizardId 
                // communityId check for steps is implicitly handled by checking wizardDetails first
              });
              
              const combinedResult = {
                ...wizardDetails,
                steps: steps
              };

              console.log(`[Admin AI Tool - getWizardDetailsAndSteps] Successfully fetched details and ${steps.length} steps.`);
              return {
                success: true,
                messageForAI: `Details and ${steps.length} step(s) fetched successfully for wizard '${wizardDetails.name}' (ID: ${wizardId}).`,
                wizardData: combinedResult 
              };

            } catch (error: unknown) {
              console.error('[Admin AI Tool - getWizardDetailsAndSteps] Error:', error);
              let errorMsg = 'An unexpected error occurred.';
              if (error instanceof WizardNotFoundError) {
                errorMsg = error.message;
              } else if (error instanceof Error) {
                errorMsg = error.message;
              }
              return { 
                success: false, 
                errorForAI: `Failed to retrieve wizard details and steps: ${errorMsg}`,
                // Optional return value, adjust as needed
              };
            }
          }
        },
        updateWizardDetails: {
          description: "Updates details of an existing wizard such as its name, description, active status, required role, or role assignment strategy. Provide the Wizard ID and only the fields you want to change.",
          parameters: z.object({
            wizardId: z.string().uuid().describe("The ID of the wizard to update."),
            name: z.string().optional().describe("The new name for the wizard."),
            description: z.string().optional().nullable().describe("The new description for the wizard. Send null to clear it."),
            is_active: z.boolean().optional().describe("Set to true to activate the wizard, false to deactivate (make draft). Quota for active wizards will be checked by the system if activating."),
            required_role_id: z.string().uuid().optional().nullable().describe("The ID of a role required to access this wizard. Send null to remove the requirement."),
            assign_roles_per_step: z.boolean().optional().describe("Set to true if roles from steps are assigned immediately upon step completion, or false if assigned at the end of the wizard.")
          }),
          execute: async (params: UpdateWizardServicePayload) => {
            // The communityId for the update operation is taken from the adminUser context (outer scope)
            console.log(`[Admin AI Tool - updateWizardDetails] Attempting to update wizard ID: ${params.wizardId} in community: ${communityId} with payload:`, params);
            
            if (Object.keys(params).filter(k => k !== 'wizardId').length === 0) {
                return {
                  success: false,
                  errorForAI: "No update fields were provided for the wizard. Please specify at least one field to change (e.g., name, description, is_active)."
                };
            }

            // API Layer Quota Check (if activating)
            if (params.is_active === true) {
              try {
                await enforceEventRateLimit(communityId, Feature.ActiveWizard);
              } catch (error: unknown) {
                if (error instanceof QuotaExceededError) {
                  return { 
                    success: false, 
                    errorForAI: `QuotaExceeded: ${error.message}. Cannot activate the wizard.`,
                    details: { feature: error.feature, limit: error.limit, currentCount: error.currentCount }
                  };
                }
                console.error('[Admin AI Tool - updateWizardDetails] Quota check error:', error);
                return { success: false, errorForAI: `Error during quota check before activating wizard: ${error instanceof Error ? error.message : 'An unknown error occurred.'}` };
              }
            }

            try {
              const updatedWizard = await updateWizardDetailsService({
                wizardId: params.wizardId,         // From AI
                communityId: communityId,          // From admin context
                name: params.name,                 // From AI (optional)
                description: params.description,     // From AI (optional)
                is_active: params.is_active,         // From AI (optional)
                required_role_id: params.required_role_id, // From AI (optional)
                assign_roles_per_step: params.assign_roles_per_step // From AI (optional)
              });
              
              console.log('[Admin AI Tool - updateWizardDetails] Service call successful:', updatedWizard);
              return {
                success: true,
                messageForAI: `Wizard '${updatedWizard.name}' (ID: ${params.wizardId}) updated successfully.`,
                wizardData: updatedWizard
              };

            } catch (error: unknown) {
              console.error('[Admin AI Tool - updateWizardDetails] Error calling updateWizardDetailsService:', error);
              let errorMsg = 'An unexpected error occurred while updating the wizard.';
              if (error instanceof WizardNotFoundError || error instanceof DuplicateWizardNameError) {
                errorMsg = error.message;
              } else if (error instanceof Error) {
                errorMsg = error.message;
              }
              return { 
                success: false, 
                errorForAI: `Failed to update wizard: ${errorMsg}`
              };
            }
          }
        },
        updateWizardStepDetails: {
          description: "Updates details of an existing step within a wizard. Provide the Wizard ID, Step ID, and only the fields you want to change (e.g., step_type_id, config, target_role_id, is_mandatory, is_active). ENS domain_name in specific config will be validated if provided.",
          parameters: z.object({
            wizardId: z.string().uuid().describe("The ID of the wizard containing the step to update."),
            stepId: z.string().uuid().describe("The ID of the step to update."),
            step_type_id: z.string().uuid().optional().describe("Optional: The new type ID for the step."),
            config: z.object({
              presentation: z.record(z.any()).optional().describe("Object for presentation settings like headline, subtitle, backgroundType, backgroundValue."),
              specific: z.record(z.any()).optional().describe("Object for type-specific settings. The structure depends on the step_type_id. ENS domain_name in specific config will be validated if provided.")
            }).optional().describe("Optional: The new configuration object for the step. Include 'presentation' and/or 'specific' parts as needed."),
            target_role_id: z.string().uuid().optional().nullable().describe("Optional: The new target role ID to be granted upon step completion. Send null to clear it."),
            is_mandatory: z.boolean().optional().describe("Optional: Set to true if the step is mandatory, false otherwise."),
            is_active: z.boolean().optional().describe("Optional: Set to true to activate the step, false to deactivate it.")
          }),
          execute: async (params: UpdateStepServicePayload) => {
            // communityId is from the adminUser context in the outer scope,
            // but updateStepInWizardService primarily uses wizardId and stepId.
            // The wizardId context implies the community.
            console.log(`[Admin AI Tool - updateWizardStepDetails] Attempting to update step ID: ${params.stepId} in wizard ID: ${params.wizardId} with payload:`, params);

            if (Object.keys(params).filter(k => k !== 'wizardId' && k !== 'stepId').length === 0) {
              return {
                success: false,
                errorForAI: "No update fields were provided for the step. Please specify at least one field to change (e.g., config, is_mandatory)."
              };
            }

            try {
              // The service function updateStepInWizardService expects all params directly
              const updatedStep = await updateStepInWizardService(params);
              
              console.log('[Admin AI Tool - updateWizardStepDetails] Service call successful:', updatedStep);
              return {
                success: true,
                messageForAI: `Step ID '${params.stepId}' in wizard '${params.wizardId}' updated successfully.`,
                stepData: updatedStep
              };

            } catch (error: unknown) {
              console.error('[Admin AI Tool - updateWizardStepDetails] Error calling updateStepInWizardService:', error);
              let errorMsg = 'An unexpected error occurred while updating the step.';
              if (error instanceof StepNotFoundError) {
                errorMsg = error.message;
              } else if (error instanceof Error) { // Generic error (e.g., from ENS validation in service)
                errorMsg = error.message;
              }
              return { 
                success: false, 
                errorForAI: `Failed to update step: ${errorMsg}`
              };
            }
          }
        },
        deleteWizardStep: {
          description: "Deletes a step from a wizard. This is a destructive operation and cannot be undone. You must specify both wizard ID and step ID. Consider checking if this is the right step first using getWizardDetailsAndSteps.",
          parameters: z.object({
            wizardId: z.string().uuid().describe("The ID of the wizard containing the step to delete."),
            stepId: z.string().uuid().describe("The ID of the step to delete."),
            confirm_deletion: z.boolean().describe("Must be set to true to confirm this destructive operation.")
          }),
          execute: async (params: { wizardId: string; stepId: string; confirm_deletion: boolean }) => {
            const { wizardId, stepId, confirm_deletion } = params;
            
            console.log(`[Admin AI Tool - deleteWizardStep] Attempting to delete step ID: ${stepId} from wizard ID: ${wizardId}`);
            
            if (!confirm_deletion) {
              return {
                success: false,
                errorForAI: "Deletion not confirmed. Set confirm_deletion to true to proceed with this destructive operation."
              };
            }
            
            try {
              const deletedStep = await deleteStepFromWizardService({
                wizardId,
                stepId
              });
              
              console.log('[Admin AI Tool - deleteWizardStep] Service call successful, step deleted:', deletedStep);
              return {
                success: true,
                messageForAI: `Step ID '${stepId}' has been successfully deleted from wizard '${wizardId}'.`,
                deletedStepData: deletedStep
              };
              
            } catch (error: unknown) {
              console.error('[Admin AI Tool - deleteWizardStep] Error calling deleteStepFromWizardService:', error);
              let errorMsg = 'An unexpected error occurred while deleting the step.';
              if (error instanceof StepNotFoundError) {
                errorMsg = error.message;
              } else if (error instanceof Error) {
                errorMsg = error.message;
              }
              return { 
                success: false, 
                errorForAI: `Failed to delete step: ${errorMsg}`
              };
            }
          }
        },
        reorderWizardSteps: {
          description: "Changes the order of steps within a wizard. You must provide the wizard ID and an array of step IDs in the new desired order. The array must include all step IDs that belong to the wizard, no more and no less.",
          parameters: z.object({
            wizardId: z.string().uuid().describe("The ID of the wizard whose steps will be reordered."),
            stepIdsInOrder: z.array(z.string().uuid()).min(1).describe("Array of step IDs in the desired order. MUST include all steps from the wizard.")
          }),
          execute: async (params: { wizardId: string; stepIdsInOrder: string[] }) => {
            const { wizardId, stepIdsInOrder } = params;
            
            console.log(`[Admin AI Tool - reorderWizardSteps] Attempting to reorder steps for wizard ID: ${wizardId}`);
            console.log(`[Admin AI Tool - reorderWizardSteps] New order:`, stepIdsInOrder);
            
            if (!stepIdsInOrder || stepIdsInOrder.length === 0) {
              return {
                success: false,
                errorForAI: "The stepIdsInOrder array must contain at least one step ID."
              };
            }
            
            try {
              const result = await reorderStepsInWizardService({
                wizardId,
                stepIdsInOrder
              });
              
              console.log('[Admin AI Tool - reorderWizardSteps] Service call successful:', result);
              return {
                success: true,
                messageForAI: result.message,
                reorderResult: result
              };
              
            } catch (error: unknown) {
              console.error('[Admin AI Tool - reorderWizardSteps] Error calling reorderStepsInWizardService:', error);
              let errorMsg = 'An unexpected error occurred while reordering steps.';
              let details = {};
              
              if (error instanceof StepCountMismatchError) {
                errorMsg = error.message;
                details = {
                  currentStepCount: error.currentCount,
                  providedStepCount: error.providedCount
                };
              } else if (error instanceof InvalidStepIdError) {
                errorMsg = error.message;
                details = {
                  invalidStepId: error.stepId
                };
              } else if (error instanceof Error) {
                errorMsg = error.message;
              }
              
              return { 
                success: false, 
                errorForAI: `Failed to reorder steps: ${errorMsg}`,
                errorDetails: details
              };
            }
          }
        },
        deleteWizard: {
          description: "Deletes a wizard and all its steps. This is a destructive operation and cannot be undone. You must confirm deletion. Only inactive (draft) wizards can be deleted. Active wizards must first be deactivated using updateWizardDetails.",
          parameters: z.object({
            wizardId: z.string().uuid().describe("The ID of the wizard to delete."),
            confirm_deletion: z.boolean().describe("Must be set to true to confirm this destructive operation.")
          }),
          execute: async (params: { wizardId: string; confirm_deletion: boolean }) => {
            const { wizardId, confirm_deletion } = params;
            
            console.log(`[Admin AI Tool - deleteWizard] Attempting to delete wizard ID: ${wizardId}`);
            
            if (!confirm_deletion) {
              return {
                success: false,
                errorForAI: "Deletion not confirmed. Set confirm_deletion to true to proceed with this destructive operation."
              };
            }
            
            try {
              // First check if the wizard is active
              const wizardDetails = await getWizardDetailsService({
                wizardId,
                communityId // From admin user context
              });
              
              if (wizardDetails.is_active) {
                return {
                  success: false,
                  errorForAI: "Cannot delete an active wizard. Please deactivate the wizard first using updateWizardDetails with is_active: false, then try again."
                };
              }
              
              // If inactive, proceed with deletion
              const deletedWizard = await deleteWizardService({
                wizardId,
                communityId // From admin user context
              });
              
              console.log('[Admin AI Tool - deleteWizard] Service call successful, wizard deleted:', deletedWizard);
              return {
                success: true,
                messageForAI: `Wizard '${deletedWizard.name}' (ID: ${wizardId}) has been successfully deleted.`,
                deletedWizardData: deletedWizard
              };
              
            } catch (error: unknown) {
              console.error('[Admin AI Tool - deleteWizard] Error:', error);
              let errorMsg = 'An unexpected error occurred while deleting the wizard.';
              if (error instanceof WizardNotFoundError) {
                errorMsg = error.message;
              } else if (error instanceof Error) {
                errorMsg = error.message;
              }
              return { 
                success: false, 
                errorForAI: `Failed to delete wizard: ${errorMsg}`
              };
            }
          }
        }
        // Future admin tools will be added here
      },
      temperature: 0.7, // Standard temperature for admin tasks, can be configured
      maxSteps: 5, // Allow a few tool call iterations if needed
    });

    // --- Log Usage Event for Admin AI Chat ---
    try {
      if (adminUser.sub) { // Ensure adminUser.sub (user ID for admin) is available
        // TODO: If a separate Feature flag for Admin AI Chat is implemented later, update this Feature as well.
        await logUsageEvent(communityId, adminUser.sub, Feature.AIChatMessage);
      } else {
        console.warn('[Admin AI Chat] Admin user ID (sub) not found in token, skipping usage log.');
      }
    } catch (logError) {
      // Non-critical, so we don't typically abort the response for a logging failure
      console.error('[Admin AI Chat] Failed to log usage event:', logError);
    }
    // --- End Log Usage Event ---

    // Wrap the standard Response from toDataStreamResponse() in a NextResponse
    const standardResponse = result.toDataStreamResponse();
    const headers = new Headers(standardResponse.headers); // Clone headers
    
    // Ensure essential streaming headers are preserved if not already set by toDataStreamResponse
    // (Though Vercel AI SDK's toDataStreamResponse() should set these correctly)
    // For example:
    // if (!headers.has('Content-Type')) { headers.set('Content-Type', 'text/event-stream; charset=utf-8'); }
    // if (!headers.has('Cache-Control')) { headers.set('Cache-Control', 'no-cache, no-transform'); }
    // if (!headers.has('Connection')) { headers.set('Connection', 'keep-alive'); }

    return new NextResponse(standardResponse.body, {
      status: standardResponse.status,
      statusText: standardResponse.statusText,
      headers: headers, 
    });

  } catch (error: unknown) {
    console.error('[Admin AI Chat] Error with streamText:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred with the AI assistant.';
    // Check for specific OpenAI API error types if possible from the error structure
    if (error instanceof Error && error.name === 'RateLimitError') { 
        return NextResponse.json({ error: 'AI rate limit exceeded.', message: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: 'Admin AI Chat Failed', message: errorMessage }, { status: 500 });
  }
}, true); // true for adminOnly route 