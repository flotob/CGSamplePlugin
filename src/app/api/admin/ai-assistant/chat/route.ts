import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { streamText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Feature, enforceEventRateLimit, QuotaExceededError, logUsageEvent } from '@/lib/quotas'; // Import Quota utilities
import { createWizardInService, DuplicateWizardNameError, type CreatedWizard } from '@/lib/services/wizardAdminService'; // Import the new service
import { addStepToWizardService, type AddStepServicePayload, type CreatedStep } from '@/lib/services/wizardAdminService'; // Import new step service items
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

            } catch (error: any) {
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
            } catch (error: any) {
              console.error('[Admin AI Tool - addWizardStep] Error calling addStepToWizardService:', error);
              return {
                success: false,
                errorForAI: `Failed to add step: ${error.message || 'An unexpected error occurred.'}`
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