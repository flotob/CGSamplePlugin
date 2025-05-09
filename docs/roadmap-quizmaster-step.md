# Roadmap: Quizmaster Step Type

## 1. Introduction

This document outlines the development roadmap for a new "Quizmaster" step type within the OnBoard plugin. The Quizmaster step will allow users to be tested on specific material. We will implement this in two main phases:
1.  A foundational **Non-AI Quizmaster** with pre-defined questions and answers.
2.  A **Progressive Enhancement to an AI-Powered Quizmaster** that leverages Large Language Models (LLMs) for dynamic question generation, interactive chat, and other advanced features as described in `docs/future features/ai-features.md`.

This phased approach allows for iterative development and early delivery of core quiz functionality, followed by more advanced AI enhancements. The process will follow the guidelines established in `docs/adding-new-step-type.md`.

## 2. Core Requirements (from `ai-features.md`)

The full vision for the AI Quizmaster includes:
*   Chat-based quiz interaction.
*   Configuration via Knowledge Base, Agent Personality, and Task/Challenge.
*   Real-time streaming chat (OpenAI API + Vercel AI SDK).
*   Function calling for quiz completion (e.g., `markTestPassed`).
*   User message rate limiting (Postgres + Stripe).
*   (Optional) DALL·E background image generation.
*   Admin configuration interface for quiz content.

We will build towards this vision incrementally.

## 3. Phase 1: Non-AI Quizmaster Step Type

**Goal:** Implement a basic quiz step type where questions, multiple-choice answers, and correct answers are pre-defined by an admin.

### 3.1. Database Changes
(Following `docs/adding-new-step-type.md` and `docs/current-db-schema.db`)

1.  **Define `step_types` Entry:**
    *   `name`: `quizmaster_basic`
    *   `label`: "Basic Quiz"
    *   `description`: "A step with predefined questions and multiple-choice answers."
    *   `requires_credentials`: `false`
2.  **Create Migration:**
    *   Run `npm run migrate create add_quizmaster_basic_step_type`.
    *   Add the new entry to `public.step_types` table:
        ```sql
        -- Inside migration up function
        INSERT INTO public.step_types (id, name, label, description, requires_credentials, updated_at, created_at)
        VALUES (gen_random_uuid(), 'quizmaster_basic', 'Basic Quiz', 'A step with predefined questions and multiple-choice answers.', false, NOW(), NOW());
        ```
3.  **Define `onboarding_steps.config.specific` Structure:**
    *   This JSONB field will store the quiz questions and answers.
    *   **TypeScript Interface (`QuizmasterBasicSpecificConfig`):**
        ```typescript
        // In a types file, e.g., src/types/onboarding-steps.ts
        export interface QuizQuestionOption {
          id: string; // e.g., 'opt1', 'opt2'
          text: string;
        }

        export interface QuizQuestion {
          id: string; // e.g., 'q1', 'q2'
          text: string;
          options: QuizQuestionOption[];
          correctOptionId: string; // References id of one of the options
          points?: number; // Optional: points for this question
        }

        export interface QuizmasterBasicSpecificConfig {
          questions: QuizQuestion[];
          passingScore?: number; // Optional: minimum points or percentage to pass
          showFeedback?: boolean; // Optional: whether to show correct/incorrect after each question
        }
        ```
    *   **Example JSON Structure:**
        ```json
        {
          "questions": [
            {
              "id": "q1",
              "text": "What is the capital of France?",
              "options": [
                {"id": "opt1", "text": "Berlin"},
                {"id": "opt2", "text": "Paris"},
                {"id": "opt3", "text": "Madrid"}
              ],
              "correctOptionId": "opt2",
              "points": 1
            },
            {
              "id": "q2",
              "text": "Which gas do plants absorb from the atmosphere?",
              "options": [
                {"id": "optA", "text": "Oxygen"},
                {"id": "optB", "text": "Carbon Dioxide"},
                {"id": "optC", "text": "Nitrogen"}
              ],
              "correctOptionId": "optB",
              "points": 1
            }
          ],
          "passingScore": 1, // Example: Need at least 1 point to pass
          "showFeedback": true
        }
        ```
4.  **Define `user_wizard_progress.verified_data` Structure:**
    *   This JSONB field will store the user's answers and results.
    *   **TypeScript Interface (`QuizmasterBasicVerifiedData`):**
        ```typescript
        // In a types file, e.g., src/types/onboarding-steps.ts
        export interface UserQuizAnswer {
          questionId: string; // References QuizQuestion.id
          selectedOptionId: string; // References QuizQuestionOption.id
          isCorrect: boolean;
          pointsAwarded?: number;
        }

        export interface QuizmasterBasicVerifiedData {
          answers: UserQuizAnswer[];
          totalScore: number;
          passed: boolean; // Determined by comparing totalScore against passingScore
          // Additional metadata if needed
          attemptTimestamp: string; // ISO 8601 string
        }
        ```
    *   **Example JSON Structure:**
        ```json
        {
          "answers": [
            {"questionId": "q1", "selectedOptionId": "opt2", "isCorrect": true, "pointsAwarded": 1},
            {"questionId": "q2", "selectedOptionId": "optA", "isCorrect": false, "pointsAwarded": 0}
          ],
          "totalScore": 1,
          "passed": true,
          "attemptTimestamp": "2024-05-16T10:30:00Z"
        }
        ```
5.  **Run Migration:** `npm run migrate up`.

### 3.2. Backend Implementation (API Routes)

1.  **Step Config Saving (`PUT/PATCH /api/wizards/[id]/steps/[stepId]`):**
    *   No changes likely needed, as the generic handler should suffice for saving the `config.specific` JSON.
2.  **Step Completion Handling (`POST /api/user/wizards/[id]/steps/[stepId]/complete`):**
    *   The client-side display component will evaluate answers.
    *   The frontend will send the structured `verified_data` (user's answers, score) to this endpoint.
    *   No specific server-side validation for answers is planned for this phase, but the endpoint must correctly store the provided `verified_data`.

### 3.3. Frontend Implementation - Admin Configuration

1.  **Create `QuizmasterBasicConfig.tsx`:**
    *   **File:** `src/components/onboarding/steps/QuizmasterBasicConfig.tsx`.
    *   **Props:** `initialData: QuizmasterBasicSpecificConfig`, `onChange: (newConfig: QuizmasterBasicSpecificConfig) => void`.
    *   **Functionality:** Allow admins to:
        *   Add/edit/delete questions.
        *   For each question, define question text, multiple-choice options, and mark the correct option.
        *   UI should be intuitive for managing a list of questions.
    *   Call `onChange` with the updated `specific` config object.
2.  **Update `StepEditor.tsx`:**
    *   Import `QuizmasterBasicConfig`.
    *   Add conditional rendering for `stepTypeInfo?.name === 'quizmaster_basic'` to display `QuizmasterBasicConfig`.

### 3.4. Frontend Implementation - User Display & Interaction

1.  **Create `QuizmasterBasicDisplay.tsx`:**
    *   **File:** `src/components/onboarding/steps/display/QuizmasterBasicDisplay.tsx`.
    *   **Props:** `step: UserStepProgress`, `onComplete: (verifiedData?: Record<string, unknown>) => void`.
    *   **Functionality:**
        *   Display one question at a time from `step.config.specific.questions`.
        *   Allow user to select an answer.
        *   Provide navigation (Next/Previous question, or submit at the end).
        *   On submission (or after the last question):
            *   Evaluate answers client-side.
            *   Construct the `verified_data` object (answers, score).
            *   Call `onComplete(verifiedData)`.
        *   Optionally, show immediate feedback per question or a summary at the end.
2.  **Update `StepDisplay.tsx`:**
    *   Import `QuizmasterBasicDisplay`.
    *   Add a case for `'quizmaster_basic'` in the `switch` statement to render `QuizmasterBasicDisplay`.

### 3.5. TypeScript Definitions
*   Define `QuizmasterBasicSpecificConfig` and `QuizmasterBasicVerifiedData` interfaces in `src/types/onboarding-steps.ts` (or a similar central types location). Ensure these types are used in the respective frontend components and backend API handlers where this data is processed.
*   Update `QuizQuestionOption`, `QuizQuestion` interfaces as needed.

## 4. Phase 2: AI-Powered Quizmaster (Progressive Enhancement)

**Goal:** Enhance the Quizmaster step type with AI capabilities, including dynamic content generation, chat interaction, and intelligent completion, as detailed in `docs/future features/ai-features.md`.

**Leveraging Existing AI Implementation:**
Our existing AI image generation endpoint (`src/app/api/admin/steps/generate-background/route.ts`) provides a solid foundation:
*   **OpenAI Client:** The OpenAI client is initialized with `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`. This pattern can be reused.
*   **API Key:** `OPENAI_API_KEY` is correctly managed via environment variables.
*   **Error Handling:** Existing error handling for `QuotaExceededError`, `OpenAI.APIError` (including content policy violations), and generic errors should be adapted for the chat API.
*   **Quota System:** The `enforceEventRateLimit` and `logUsageEvent` utilities from `src/lib/quotas.ts` are in place. We will need to add a new `Feature` to the enum (e.g., `AIChatCompletion` or `QuizmasterMessage`) for tracking chat usage.
*   **Authentication:** The `withAuth` middleware will be used to protect the chat API route.

**Vercel AI SDK Integration:**
To implement streaming chat and function calling, we will use the Vercel AI SDK (`ai` package).
*   **Installation:** `npm install ai openai` (openai is likely already installed).
*   **Next.js Configuration:** API routes utilizing the Vercel AI SDK for streaming are often best deployed as Edge Functions for lower latency, which can be configured in the route file: `export const runtime = "edge";`

### 4.1. Database Changes

1.  **Define `step_types` Entry:**
    *   **Option A (New Type):**
        *   `name`: `quizmaster_ai`
        *   `label`: "AI Quizmaster"
        *   `description`: "An interactive quiz powered by AI, with dynamic questions and chat."
        *   `requires_credentials`: `false` (unless specific API keys are managed per step, which is unlikely)
        *   Create a new migration similar to Phase 1.
    *   **Option B (Extend `quizmaster_basic`):**
        *   Add a flag to `quizmaster_basic`'s `config.specific` (e.g., `"ai_enabled": true`). This might complicate the config component and display logic.
        *   *Recommendation: New type (`quizmaster_ai`) for clarity and separation of concerns, unless the non-AI version is to be fully deprecated.*
2.  **Define `onboarding_steps.config.specific` for AI Quizmaster:**
    *   (Assuming new type `quizmaster_ai`)
    *   Structure based on `docs/future features/ai-features.md`:
    *   **TypeScript Interface (`QuizmasterAiSpecificConfig`):**
        ```typescript
        // In a types file, e.g., src/types/onboarding-steps.ts
        export interface AIModelSettings {
          model?: string; // e.g., 'gpt-4', 'gpt-3.5-turbo'
          temperature?: number; // 0.0 to 2.0
          maxTokens?: number; // Max tokens to generate
          // Other OpenAI API parameters as needed
        }

        export interface QuizmasterAiSpecificConfig {
          knowledgeBase: string; // Could be plain text, Markdown, or stringified JSON
          agentPersonality: string; // Text describing the AI's persona
          taskChallenge: string; // Text describing the quiz task for the AI
          aiModelSettings?: AIModelSettings;
          // Optional: Advanced settings like custom system prompts or function definitions if not hardcoded
          // customSystemPrompt?: string;
          // advancedFunctions?: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[];
        }
        ```
    *   **Example JSON Structure:**
        ```json
        {
          "knowledgeBase": "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France. It is named after the engineer Gustave Eiffel, whose company designed and built the tower. Constructed from 1887 to 1889 as the entrance to the 1889 World\'s Fair, it was initially criticized by some of France\'s leading artists and intellectuals for its design, but it has become a global cultural icon of France and one of the most recognizable structures in the world.",
          "agentPersonality": "You are a witty and slightly sarcastic history professor. You enjoy challenging students but also subtly guiding them towards the correct answers.",
          "taskChallenge": "Ask the user three unique questions about the Eiffel Tower based on the provided knowledge. The user must answer at least two correctly to pass. After the quiz, call the markTestPassed function with the user\'s performance.",
          "aiModelSettings": {
            "model": "gpt-4-turbo-preview",
            "temperature": 0.7
          }
        }
        ```
3.  **Define `user_wizard_progress.verified_data` for AI Quizmaster:**
    *   This might store a transcript summary, a pass/fail status set by AI, or specific outcomes from function calls.
    *   **TypeScript Interface (`QuizmasterAiVerifiedData`):**
        ```typescript
        // In a types file, e.g., src/types/onboarding-steps.ts
        export interface AIChatMessage { // Simplified version for verified_data
          role: 'user' | 'assistant' | 'system' | 'function';
          content: string | null;
          name?: string; // if role is 'function'
          // We might not store full OpenAI.Chat.Completions.ChatCompletionMessageParam structure here to save space
        }

        export interface QuizmasterAiVerifiedData {
          passed: boolean; // True if AI called markTestPassed successfully
          reason?: string; // Optional reason from AI or system
          score?: number; // Optional: if AI provides a score
          totalQuestionsAsked?: number; // Optional: if AI tracks this
          // Optional: Store a summary or key parts of the conversation, not the full transcript
          // Be mindful of PII and data size if storing conversation snippets.
          conversationSummary?: string; // e.g., "User correctly answered 2/3 questions about the Eiffel Tower."
          chatMessageCount?: number; // Total messages exchanged in this quiz attempt
          // Store any arguments returned by the markTestPassed function if it had any
          // functionCallResult?: Record<string, any>; 
          attemptTimestamp: string; // ISO 8601 string
        }
        ```
    *   **Example JSON Structure (after AI calls `markTestPassed`):**
        ```json
        {
          "passed": true,
          "reason": "User demonstrated sufficient understanding of the Eiffel Tower material.",
          "conversationSummary": "User correctly answered 2 of 3 questions. Initially confused about construction year but corrected.",
          "chatMessageCount": 12,
          "attemptTimestamp": "2024-05-16T11:00:00Z"
        }
        ```
4.  **Rate Limiting & Usage Tracking (`usage_events`, `plan_limits`):**
    *   The existing `usage_events` table (with `feature` enum) and `plan_limits` seem suitable for tracking chat message counts.
    *   Ensure the `feature_enum` in `src/lib/quotas.ts` (or wherever it's defined, likely alongside `Feature`) is updated to include a value like `AIQuizmasterMessage` or `AIChatCompletion`.
    *   The backend API for chat will record events here using `logUsageEvent`.

### 4.2. Backend Implementation (API Routes)

1.  **New API Route for AI Chat (`POST /api/onboarding/quizmaster/chat/route.ts`):**
    *   (Most of this section is already well-defined and aligns with the guidance, e.g., Edge runtime, `withAuth`, quota checks, using `streamText` from `ai` and `openai` provider from `@ai-sdk/openai`, Zod for tool parameters).
    *   **Tool Definition (`markTestPassed`):**
        *   The `execute` method for `markTestPassed` (defined within `streamText`'s `tools` option) correctly calls our internal `markStepAsCompletedInDB(userId, wizardId, stepId, verifiedData)`.
        *   The object returned by `execute` (e.g., `{ success: true, messageForAI: "..." }`) is for the AI to formulate its subsequent natural language response. The Vercel AI SDK handles sending this tool result back to the LLM automatically when `maxSteps > 1`.
    *   **`maxSteps` Parameter:** Ensure `streamText` is called with `maxSteps: 2` (or more, though 2 is typical for one tool call + AI response) to allow the AI to respond after the `markTestPassed` tool executes.
    *   **Response Handling:** The route correctly returns `result.toDataStreamResponse()`. This handles streaming text and any special events (like tool calls and results) using the AI SDK's data stream protocol (SSE).
    *   **Usage Logging:** `logUsageEvent` is correctly called after successful API initiation.

### 4.3. Frontend Implementation - Admin Configuration

1.  **Create `QuizmasterAiConfig.tsx`:**
    *   **File:** `src/components/onboarding/steps/QuizmasterAiConfig.tsx`.
    *   **Props:** `initialData: QuizmasterAiSpecificConfig`, `onChange: (newConfig: QuizmasterAiSpecificConfig) => void`.
    *   **Functionality:** Provide text areas/inputs for:
        *   Knowledge Base (potentially a rich text editor or large textarea).
        *   Agent Personality.
        *   Task/Challenge.
        *   (Optional) AI model settings.
    *   Call `onChange` with the updated `specific` config.
2.  **Update `StepEditor.tsx`:**
    *   Import `QuizmasterAiConfig`.
    *   Add conditional rendering for `stepTypeInfo?.name === 'quizmaster_ai'` to display `QuizmasterAiConfig`.

### 4.4. Frontend Implementation - User Display & Interaction (AI Quizmaster)

1.  **Develop `QuizmasterAiDisplay.tsx`:**
    *   **File:** `src/components/onboarding/steps/display/QuizmasterAiDisplay.tsx`. Add `'use client';` directive.
    *   **Props:** `step: UserStepProgress` (containing `id`, `config.specific: QuizmasterAiSpecificConfig`, `completed_at`), `onComplete: () => void`.
    *   **State:** `const [quizPassed, setQuizPassed] = useState(!!step.completed_at);`
    *   **`useChat` Hook Setup (`@ai-sdk/react`):**
        *   **System Message:** Construct an initial system message using `step.config.specific.agentPersonality`, `knowledgeBase`, and `taskChallenge`. Ensure the `taskChallenge` clearly instructs the AI to use the `markTestPassed` tool upon successful quiz completion.
            ```typescript
            const systemMessage = useMemo<Message>(() => {
              const config = step.config.specific as QuizmasterAiSpecificConfig;
              return {
                id: 'system-instructions',
                role: 'system',
                content: `You are a quizmaster. Personality: ${config.agentPersonality}. Knowledge: ${config.knowledgeBase}. Task: ${config.taskChallenge}`
              };
            }, [step.config.specific]);
            ```
        *   **Initialization:**
            ```typescript
            const { messages, input, handleInputChange, handleSubmit, isLoading, error, data /* for StreamData */ } = useChat({
              id: `quiz-${step.id}`, // Unique ID for chat session isolation per step
              api: '/api/onboarding/quizmaster/chat', // Backend API route
              initialMessages: [systemMessage],
              body: { // To be sent with every request
                wizardId: step.wizard_id, // Assuming wizard_id is on UserStepProgress
                stepId: step.id, // or step.step_id if that's the field name
                stepConfig: step.config.specific as QuizmasterAiSpecificConfig,
              },
              // maxSteps: 2, // Optional on client if backend handles full tool roundtrip with its maxSteps
              // onToolCall: ({ toolCall }) => { /* Optional client-side handling/rendering for other tools if any */ }
            });
            ```
            *(Ensure `UserStepProgress` type has `wizard_id` and `id/step_id` available)*
    *   **Rendering Chat UI:**
        *   Use `shadcn/ui` components (`Card`, `ScrollArea`, `Input`, `Button`, `Badge`) for layout and styling.
        *   Map `messages` from `useChat` to display user and assistant messages differently.
        *   For assistant messages, iterate through `message.parts` (as per Vercel AI SDK v4). Render `part.type === 'text'`. Other parts like `tool-invocation` are usually not rendered directly to the user but can be inspected.
        *   Implement auto-scrolling for new messages.
        *   Display `isLoading` and `error` states appropriately.
        *   If `quizPassed` is true, show a success indicator (e.g., `<Badge variant="success">Quiz Passed!</Badge>`) and disable the input form.
    *   **Detecting `markTestPassed` Success & Calling `onComplete`:**
        *   **Primary Method (via `useEffect` on `messages`):**
            ```typescript
            useEffect(() => {
              if (!quizPassed) {
                const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
                if (lastAssistantMsg?.parts) {
                  for (const part of lastAssistantMsg.parts) {
                    if (part.type === 'tool-invocation' && 
                        part.toolName === 'markTestPassed' && 
                        (part.result as any)?.success === true // Access result from tool invocation part
                    ) {
                      setQuizPassed(true);
                      if (onComplete) onComplete();
                      break;
                    }
                  }
                }
              }
            }, [messages, quizPassed, onComplete]);
            ```
            *Note: The structure of `part.toolInvocation` might need to be confirmed against the exact Vercel AI SDK version for accessing the tool name and result. The guidance mentions `toolInvocation.tool` and `toolInvocation.state === 'result'`. The `(part.result as any)?.success` is an assumption based on our backend tool's execute method returning `{success: true}`.*
        *   **Alternative/Fallback (via `props.step.completed_at`):**
            ```typescript
            useEffect(() => {
              if (step.completed_at && !quizPassed) {
                setQuizPassed(true);
                // onComplete might have already been called by the message stream effect.
                // Only call if primary method didn't catch it, or rely solely on this one
                // if preferred (though it involves a data re-fetch delay).
                // if (onComplete) onComplete(); 
              }
            }, [step.completed_at, quizPassed, onComplete]);
            ```
    *   **Handling Already Completed State:** If `step.completed_at` is set on initial mount, set `quizPassed` to true and display the quiz as completed (no input form).
    *   **Error Handling:** Display errors from `useChat.error` to the user.
2.  **Integrate `QuizmasterAiDisplay.tsx` into `StepDisplay.tsx`:**
    *   Import `QuizmasterAiDisplay`.
    *   Add `case 'quizmaster_ai':` to the `switch` statement, rendering `<QuizmasterAiDisplay step={step} onComplete={onComplete} />`.

### 4.5. TypeScript Definitions
*   Define `QuizmasterAiSpecificConfig` and `QuizmasterAiVerifiedData` interfaces.

## 5. Phase 3: Additional AI Features & Integrations

**Goal:** Implement further enhancements as described in `ai-features.md`.

### 5.1. DALL·E Background Generation
*   **Backend:**
    *   The existing `/api/admin/steps/generate-background/route.ts` is a good reference.
    *   A new, non-admin route might be needed if users generate their own backgrounds during the quiz (e.g., `POST /api/onboarding/quizmaster/generate-slide-background`).
    *   This new route would also need `withAuth` (non-admin), quota checks (`Feature.ImageGeneration` or a new one if user-facing generation has different limits), OpenAI call, and image storage via `src/lib/storage.ts`.
    *   **Quota System:**
        *   Ensure `Feature` enum in `src/lib/quotas.ts` (or equivalent) has:
            *   `ImageGeneration` (already used by admin endpoint, can be reused if limits are the same for users).
            *   `AIQuizmasterMessage` (or `AIChatCompletion`) for chat messages.
        *   Update `plan_limits` table with appropriate limits for these features for different plans.
*   **Frontend:**
    *   UI for user to input a prompt for the background.
    *   Call the new backend API.
    *   Display the generated image as a background (e.g., CSS `background-image`).
    *   Handle loading states.

### 5.2. Stripe Integration for Plan Upgrades
*   The database schema (`plans`, `plan_limits`, `communities.current_plan_id`, `communities.stripe_customer_id`) already supports plans and limits.
*   **Backend:**
    *   Implement Stripe Checkout session creation API.
    *   Implement Stripe webhook handler (`/api/stripe-webhook`) to:
        *   Verify event signature.
        *   Handle `checkout.session.completed`, `customer.subscription.updated`, etc.
        *   Update `communities.current_plan_id` and/or `users.plan` (if user-specific plans are added outside community plan).
        *   Associate `stripe_customer_id` with community/user.
*   **Frontend:**
    *   UI elements to prompt users to upgrade when they hit rate limits (e.g., in `QuizmasterAiDisplay.tsx` or globally).
    *   Redirect to Stripe Checkout.

## 6. Next Steps & Focus for Revision

*   **Detailed JSON Structures & TypeScript Types:** (Mostly DONE)
*   **AI Interaction Flow & `onComplete` Integration:** (Guidance received, incorporated into plan for `QuizmasterAiDisplay`)
*   **Backend API Refinements:**
    *   Finalize request/response schemas for `/api/onboarding/quizmaster/chat` (Largely defined by `ChatRequestBody` and `CoreMessage` types).
    *   **Implement actual `completeOnboardingStep` DB logic** (Task 5.1 was creating the shell, this is to ensure the `TODO` for the actual DB call in `markStepAsCompletedInDB` or directly in the tool `execute` is done. We did create `markStepAsCompletedInDB` and used it, so this is more a verification step now).
    *   Ensure secure validation of `wizardId` and `stepId` context within the chat API.
*   **Component Reusability:** (Can be assessed after AI components are built).
*   **Error Handling and Edge Cases:** (Address in detail during implementation of each component).
*   **Migration Strategy for `quizmaster_basic` to `quizmaster_ai`:** (Low priority for now).

// ... (rest of the roadmap) ...