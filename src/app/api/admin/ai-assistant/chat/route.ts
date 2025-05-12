import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { streamText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Feature, enforceEventRateLimit, QuotaExceededError, logUsageEvent } from '@/lib/quotas'; // Import Quota utilities
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
          execute: async ({ name, description, required_role_id, assign_roles_per_step }: {
            name: string;
            description?: string;
            required_role_id?: string;
            assign_roles_per_step?: boolean;
          }) => {
            const wizardPayload = {
              name,
              description: description || null,
              is_active: false, // Wizards are created as drafts
              required_role_id: required_role_id || null,
              assign_roles_per_step: assign_roles_per_step || false,
              // community_id is implicitly handled by the /api/wizards backend route using the admin's token if called with admin context
            };

            console.log('[Admin AI Tool - createWizard] Payload for POST /api/wizards:', wizardPayload);
            console.log('[Admin AI Tool - createWizard] Admin User Context Community ID:', communityId);

            try {
              // TODO: Implement actual admin-authenticated API call to POST /api/wizards
              // This would require an admin-level authFetch or similar mechanism.
              // For example:
              // const adminApi = getAdminApiClient(adminUserToken); // Hypothetical function to get authenticated client
              // const response = await adminApi.post('/api/wizards', wizardPayload);
              // const newWizard = response.data.wizard;

              // Simulate a successful API response for this example
              const simulatedNewWizard = {
                id: `wizard_admin_${Date.now()}`,
                name: wizardPayload.name,
                description: wizardPayload.description,
                is_active: wizardPayload.is_active,
                required_role_id: wizardPayload.required_role_id,
                assign_roles_per_step: wizardPayload.assign_roles_per_step,
                community_id: communityId, // Using admin's current community context
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_hero: false,
              };
              console.log('[Admin AI Tool - createWizard] Simulated success:', simulatedNewWizard);
              
              return { 
                success: true, 
                messageForAI: `Wizard '${simulatedNewWizard.name}' (ID: ${simulatedNewWizard.id}) created successfully as a draft in community ${communityId}.`,
                wizardId: simulatedNewWizard.id,
                wizardName: simulatedNewWizard.name,
                communityId: communityId
              };

            } catch (error: any) {
              console.error('[Admin AI Tool - createWizard] Error during simulated API call:', error);
              const errorMessage = error.response?.data?.error || error.message || 'An unexpected error occurred while creating the wizard.';
              return { 
                success: false, 
                errorForAI: `Failed to create wizard: ${errorMessage}`,
                details: error.response?.data?.details 
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