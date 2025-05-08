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

1.  **New API Route for AI Chat (`POST /api/onboarding/quizmaster/chat/route.ts` or similar Next.js App Router convention):**
    *   **Runtime:** `export const runtime = "edge";` (Recommended for Vercel AI SDK streaming).
    *   **Authentication:** Secure with `withAuth(async (req: AuthenticatedRequest) => { ... });`.
    *   **Request Body:**
        *   **TypeScript Interface (`QuizmasterChatApiPayload`):**
            ```typescript
            // In a types file, e.g., src/types/api.ts or src/types/onboarding-steps.ts
            import { Message as VercelAIMessage } from 'ai'; // From Vercel AI SDK
            import { QuizmasterAiSpecificConfig } from './onboarding-steps'; // Assuming types are in the same dir or adjust path

            export interface QuizmasterChatApiPayload {
              chatId?: string; // Optional: for resuming conversations if supported
              messages: VercelAIMessage[]; // User's current message and history
              // Option 1: Pass the full config (if not too large and security is handled)
              stepConfig: QuizmasterAiSpecificConfig; 
              // Option 2: Pass IDs and fetch config server-side (more secure for large/sensitive configs)
              // wizardId: string; 
              // stepId: string;
            }
            ```
        *   **Discussion on `stepConfig` Transmission:**
            *   **Passing Full `stepConfig`:** As shown in Option 1, the client sends the `QuizmasterAiSpecificConfig` (containing `knowledgeBase`, `agentPersonality`, etc.) directly in the payload. This is simpler for the client using the `useChat` hook's `body` parameter.
                *   *Pros:* Simpler client-side, `useChat` hook can easily send it.
                *   *Cons:* Increases payload size, especially if `knowledgeBase` is large. Exposes full AI configuration parameters to the client (though they are for the client's own step). Requires robust validation on the backend that the `stepConfig` sent actually matches the step the user is on (e.g., by comparing a `stepId` also sent in the payload against the database).
            *   **Passing IDs (`wizardId`, `stepId`):** (Option 2, commented out) The client would send `wizardId` and `stepId`. The backend API route would then fetch the `QuizmasterAiSpecificConfig` from the `onboarding_steps` table using these IDs.
                *   *Pros:* More secure as `knowledgeBase` and other AI parameters are not sent over the wire from client to server with each message. Smaller payload. Backend is the source of truth for the config.
                *   *Cons:* Requires an extra DB call on the backend. The Vercel AI SDK's `useChat` hook sends its `body` with *every* request, so fetching from DB on every message might be slightly less performant than if the config were cached or managed in a dedicated session. However, for security and data integrity, this is often preferred.
            *   **Recommendation:** Start with Option 1 (passing `stepConfig`) for simplicity if the `knowledgeBase` is not excessively large and proper validation of user context (e.g., that `userId` is indeed on `stepId` which uses this config) is performed on the backend. If `knowledgeBase` becomes very large or sensitive, switch to Option 2. For the purpose of this roadmap, we'll assume Option 1, but highlight that the backend *must* still validate that the authenticated user is currently undertaking a step that *should* be using the provided configuration parameters.
        *   **Example JSON Payload (Option 1):**
            ```json
            {
              "chatId": "optional-session-id-123",
              "messages": [
                { "role": "user", "content": "What was Gustave Eiffel's main profession?" }
                // Potentially prior messages for context if maintaining history client-side
              ],
              "stepConfig": {
                "knowledgeBase": "The Eiffel Tower is a wrought-iron lattice tower...",
                "agentPersonality": "You are a witty and slightly sarcastic history professor...",
                "taskChallenge": "Ask the user three unique questions about the Eiffel Tower...",
                "aiModelSettings": { "model": "gpt-4-turbo-preview", "temperature": 0.7 }
              }
            }
            ```
    *   **Backend Processing of `stepConfig`:**
        *   Regardless of how `stepConfig` is obtained (direct from payload or fetched via ID), the backend API route will use its `knowledgeBase`, `agentPersonality`, and `taskChallenge` to construct the system prompt and initial assistant messages for the OpenAI API call.
        *   It should also validate that the user (from `req.user`) is authorized to interact with the quiz defined by this configuration (e.g. is currently on this step of their assigned wizard).
    *   Expect `{ messages: Message[], chatId?: string, stepConfig: QuizmasterAiSpecificConfig }` where `Message` is from the `ai` package, and `stepConfig` contains `knowledge_base`, `agent_personality`, `task_challenge`. The `stepConfig` could be fetched server-side based on a `stepId` passed in the request to ensure security and avoid sending large configs over the wire repeatedly, or included if small and the user context is validated.
    *   **Rate Limiting:**
        *   Before calling OpenAI, use `await enforceEventRateLimit(communityId, Feature.AIQuizmasterMessage);` (assuming `AIQuizmasterMessage` is the new enum member).
        *   Handle `QuotaExceededError` appropriately.
    *   **OpenAI Client:** Initialize as in the image generation route: `const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });`
    *   **Prompt Construction:**
        *   From `stepConfig.agent_personality` and `stepConfig.task_challenge`, create a system prompt.
        *   Include `stepConfig.knowledge_base` as an initial assistant message or part of the system prompt.
        *   Append the user's `messages` from the request.
    *   **Function Definition:** Define the `markTestPassed` function schema:
        ```typescript
        const functions: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[] = [{
          name: "markTestPassed",
          description: "Call this function when the user has successfully answered the required questions or passed the quiz based on the initial task instructions.",
          parameters: {
            type: "object",
            properties: {
              // userId and slideId/stepId can be inferred on the backend from the authenticated request context
              // No specific parameters needed from the AI unless there's a score or summary to pass.
              // For simplicity, we can assume the backend knows the context.
              // If specific feedback is needed:
              // feedback: { type: "string", description: "Brief feedback on why the user passed." }
            },
            required: [] // No specific parameters required from AI for this example
          }
        }];
        ```
    *   **OpenAI API Call with Streaming & Functions:**
        ```typescript
        const response = await openai.chat.completions.create({
          model: stepConfig.ai_model_settings?.model || 'gpt-4', // Or your preferred default
          messages: constructedMessages, // Your combined system, knowledge, and user messages
          stream: true,
          functions: functions,
          function_call: 'auto', // Allow OpenAI to decide when to call the function
          temperature: stepConfig.ai_model_settings?.temperature || 0.5,
        });
        ```
    *   **Streaming Response with Vercel AI SDK:**
        ```typescript
        import { OpenAIStream, StreamingTextResponse, experimental_StreamData } from 'ai';
        
        // ... inside the POST handler
        const streamData = new experimental_StreamData();
        const stream = OpenAIStream(response, {
          experimental_onFunctionCall: async (functionCallPayload, createFunctionCallMessages) => {
            // This callback is invoked when the AI decides to call a function.
            if (functionCallPayload.name === 'markTestPassed') {
              // 1. AI wants to call markTestPassed.
              // 2. Perform the actual action: update user_wizard_progress for this step.
              //    This requires userId, wizardId, stepId from the authenticated request context.
              //    Construct verified_data for AI completion.
              const { wizardId, stepId } = /* get from validated request context or payload */;
              const verifiedData = { passed: true, reason: "AI determined quiz completion." };
              
              // IMPORTANT: This logic should be robust, transactional, and secure.
              // It's essentially the backend part of onComplete for the AI.
              // For example, call an internal service function:
              // await completeStepForUser(userId, wizardId, stepId, verifiedData);

              // 3. Optionally, send a message back to the user *through the AI*
              //    confirming the action. Create new messages and append to stream.
              const functionCallMessages = createFunctionCallMessages(
                 // result of the function call, if you want to send it to the client via AI
                { success: true, message: "Quiz marked as passed!"} 
              );
              return openai.chat.completions.create({
                  model: stepConfig.ai_model_settings?.model || 'gpt-4',
                  stream: true,
                  messages: [...constructedMessages, ...functionCallMessages],
                  functions: functions, // important to include functions again
                  function_call: 'auto',
              });
            }
          },
          onFinal: () => {
            // Persist the stream data
            streamData.close();
          },
          experimental_streamData: true, // Enable streamData
        });
        
        // After successful stream initiation, log usage if not already logged per message.
        // If logging per interaction (OpenAI call), do it here.
        // await logUsageEvent(communityId, userId, Feature.AIQuizmasterMessage);
        
        // Append the stream data to the response
        streamData.append({ timestamp: Date.now() }); // Example data to append
        return new StreamingTextResponse(stream, {}, streamData);
        ```
    *   **Usage Logging:** Call `logUsageEvent(communityId, userId, Feature.AIQuizmasterMessage)` for each billable interaction (e.g., each OpenAI API call made).
2.  **Step Completion Handling (`POST /api/user/wizards/[id]/steps/[stepId]/complete`):**
    *   This endpoint will now primarily be called by human interaction (e.g. for non-AI steps or if AI step has a manual "I'm done" button).
    *   The AI's `markTestPassed` function call will trigger an internal server-side completion logic (as detailed above, potentially a shared internal function `completeStepForUser`) rather than the AI directly calling this HTTP endpoint. This ensures the completion is tightly coupled with the AI's decision within the chat API's context.

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

### 4.4. Frontend Implementation - User Display & Interaction

1.  **Create `QuizmasterAiDisplay.tsx`:**
    *   **File:** `src/components/onboarding/steps/display/QuizmasterAiDisplay.tsx`.
    *   **Props:** `step: UserStepProgress`, `onComplete: (verifiedData?: Record<string, unknown>) => void`. (The `onComplete` prop here will primarily react to `step.completed_at` being updated by the backend function call.)
    *   **Vercel AI SDK Hook:**
        ```typescript
        import { useChat, Message } from 'ai/react';
        
        // ... inside QuizmasterAiDisplay component
        const { messages, input, handleInputChange, handleSubmit, error, isLoading, data } = useChat({
          api: '/api/onboarding/quizmaster/chat', // Your new API endpoint
          body: { // Pass additional context to the backend
            stepConfig: step.config?.specific as QuizmasterAiSpecificConfig // Type assertion
          },
          initialMessages: [ // Optional: Start with a system or assistant greeting
            // { 
            //   id: 'initial-greeting', 
            //   role: 'system', // or 'assistant'
            //   content: 'Welcome to the AI Quiz! I will ask you questions based on the provided material.' 
            // }
          ],
          onFinish: (message) => {
            // This is called when the AI finishes a response.
            // If the AI called a function that resulted in step completion, 
            // the `step.completed_at` prop would update, triggering UI changes.
            console.log('AI finished responding. Last message:', message);
            // You might check `data` (experimental_StreamData) for function call results if needed.
          },
          onError: (err) => {
            // Handle errors (e.g., display a toast, parse for quota issues)
            console.error('Chat error:', err);
            // Example: if err.message contains "Quota", show upgrade prompt.
          }
        });
        ```
    *   **Functionality:**
        *   Render chat interface using `messages`, `input`, `handleInputChange`, `handleSubmit`.
        *   Display loading states (`isLoading`) and errors (`error`).
        *   **Completion:** The component primarily reacts to `step.completed_at` being populated. When the AI calls `markTestPassed`, the backend chat API updates the database, which should then cause the `step` prop to re-render with `completed_at` set. The `useEffect` in `StepDisplay.tsx` (or similar logic) would then call the main `onComplete` prop passed down to it.
        *   The Vercel AI SDK's `useChat` hook handles streaming and function call message processing automatically if configured correctly on the backend (`experimental_onFunctionCall`). The client doesn't need to manually parse function call messages if the backend handles the effects of the function call and optionally streams further AI messages.
2.  **Update `StepDisplay.tsx`:**
    *   Import `QuizmasterAiDisplay`.
    *   Add a case for `'quizmaster_ai'` in the `switch` statement.

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

This document provides an initial roadmap. For the next revision, we will focus on:

1.  **Detailed JSON Structures & TypeScript Types:**
    *   Provide concrete examples and full TypeScript definitions for:
        *   `QuizmasterBasicSpecificConfig` & `QuizmasterBasicVerifiedData` (✅ Done in Phase 1 description).
        *   `QuizmasterAiSpecificConfig` & `QuizmasterAiVerifiedData` (✅ Done in Phase 2 description).
        *   Payload for `/api/onboarding/quizmaster/chat` including how `stepConfig` is passed (✅ This section updated).
        *   The structure of `verified_data` when an AI step is completed via `markTestPassed` (✅ Done in Phase 2 description, matches `QuizmasterAiVerifiedData`).
2.  **AI Interaction Flow & `onComplete` Integration:**
    *   **High-Level Goal:** The AI, guided by its instructions, determines quiz completion and calls the `markTestPassed` function. The backend handles this call, updates the user's progress, and the frontend UI reacts to this update to advance the wizard.
    *   **Step-by-Step Data Flow:**
        1.  **User Sends Message (Frontend):**
            *   User types a message in the `QuizmasterAiDisplay.tsx` component.
            *   The `useChat` hook (from Vercel AI SDK) sends the message and current chat history to the backend API (`POST /api/onboarding/quizmaster/chat`), including the `stepConfig` in the request body.
        2.  **Backend API Receives Request (`/api/onboarding/quizmaster/chat`):
            *   **Authentication:** `withAuth` middleware verifies the user.
            *   **Quota Check:** `enforceEventRateLimit(communityId, Feature.ai_chat_message)` is called. (Ensuring `Feature.ai_chat_message` is the correct enum from `src/lib/quotas.ts`). If over limit, a 429 error is returned.
            *   **Prompt Construction:** The API constructs the prompt for OpenAI using `stepConfig.knowledgeBase`, `stepConfig.agentPersonality`, `stepConfig.taskChallenge`, and the incoming `messages` history.
            *   **OpenAI API Call:** Calls `openai.chat.completions.create` with `stream: true`, the `functions` array (containing `markTestPassed` definition), and `function_call: 'auto'`. An `OpenAI.APIError` or other exceptions are handled here.
        3.  **OpenAI Streams Response / Calls Function:**
            *   **Text Stream:** OpenAI streams back the AI's text response (questions, feedback, etc.).
            *   **Function Call:** If the AI decides the conditions are met (based on its prompt and the conversation), it outputs a request to call the `markTestPassed` function.
        4.  **Backend Handles Stream & Function Call (`experimental_onFunctionCall`):
            *   The `OpenAIStream` helper on the backend uses its `experimental_onFunctionCall` callback when `markTestPassed` is invoked by the AI.
            *   **Inside `experimental_onFunctionCall` for `markTestPassed`:**
                *   The backend has the user's context (`userId`, `communityId`) and the current step context (e.g., `wizardId`, `stepId` - obtained securely, perhaps from validated request body parameters not directly from AI function args for security).
                *   It constructs `QuizmasterAiVerifiedData` (e.g., `{ passed: true, reason: "AI determined quiz passed", attemptTimestamp: new Date().toISOString(), chatMessageCount: ... }`).
                *   **Crucially, it calls an internal server-side function** (e.g., `internalCompleteStep(userId, wizardId, stepId, verifiedData)`) to update the `user_wizard_progress` table: sets `completed_at` to `NOW()` and saves the `verified_data` JSONB.
                *   **Usage Logging:** `logUsageEvent(communityId, userId, Feature.ai_chat_message)` is called to record the interaction (if not logged per-message already).
                *   Optionally, this callback can instruct the AI to send a concluding message back to the user (e.g., "Congratulations, you've passed!") by returning another `openai.chat.completions.create` call with appropriate messages.
        5.  **Frontend Renders Stream / Reacts to Completion (`QuizmasterAiDisplay.tsx` & `StepDisplay.tsx`):
            *   The `useChat` hook receives and renders the streamed text messages from the AI.
            *   **Database Update Triggers Prop Change:** The server-side update to `user_wizard_progress` (setting `completed_at`) eventually leads to the `step: UserStepProgress` prop being updated in the frontend components (via SWR, React Query, or whatever data fetching mechanism is in use for `UserStepProgress`).
            *   **Detecting Completion:** The `StepDisplay.tsx` component (or potentially `QuizmasterAiDisplay.tsx` if it directly handles this logic) likely has a `useEffect` hook that monitors `step.completed_at`:
                ```typescript
                // Simplified example in StepDisplay.tsx or QuizmasterAiDisplay.tsx
                useEffect(() => {
                  if (step.completed_at && !hasBeenCompleted.current) { // hasBeenCompleted is a ref to prevent multiple calls
                    onComplete(step.verified_data || {}); // Call the main onComplete to advance wizard
                    hasBeenCompleted.current = true;
                  }
                }, [step.completed_at, step.verified_data, onComplete]);
                ```
            *   This invocation of `onComplete` signals to the parent wizard logic that the current step is finished, allowing navigation to the next step.
    *   **Visual Diagram (Mermaid Sequence):**
        ```mermaid
        sequenceDiagram
            participant UserFE as User (Frontend - QuizmasterAiDisplay)
            participant ChatHook as useChat (Vercel AI SDK)
            participant BackendAPI as Backend API (/api/.../chat)
            participant QuotasLib as Quotas Lib
            participant OpenAI
            participant DB as Database (user_wizard_progress)
            participant StepDisplay as StepDisplay Component

            UserFE->>+ChatHook: handleSubmit(userInput)
            ChatHook->>+BackendAPI: POST {messages, stepConfig}
            BackendAPI->>+QuotasLib: enforceEventRateLimit(Feature.ai_chat_message)
            alt Quota Exceeded
                QuotasLib-->>-BackendAPI: Error 429
                BackendAPI-->>-ChatHook: Error 429
                ChatHook-->>-UserFE: Displays error
            else Quota OK
                QuotasLib-->>-BackendAPI: OK
                BackendAPI->>+OpenAI: chat.completions.create({stream:true, functions: [markTestPassed]})
                OpenAI-->>-BackendAPI: Stream chunks / Function Call [markTestPassed]
                alt Text Response
                    BackendAPI-->>-ChatHook: Stream partial response
                    ChatHook-->>-UserFE: Renders message chunk
                else Function Call [markTestPassed]
                    Note over BackendAPI: experimental_onFunctionCall for 'markTestPassed' triggered
                    BackendAPI->>+DB: UPDATE user_wizard_progress SET completed_at=NOW(), verified_data={...}
                    DB-->>-BackendAPI: Success
                    BackendAPI->>+QuotasLib: logUsageEvent(Feature.ai_chat_message)
                    QuotasLib-->>-BackendAPI: Logged
                    BackendAPI-->>-ChatHook: Stream (optional further AI message, e.g., "Quiz Passed!")
                    ChatHook-->>-UserFE: Renders final message(s)
                end
                Note over UserFE, BackendAPI: Data revalidation mechanism (e.g., SWR, React Query) updates `step` prop
                UserFE->>StepDisplay: Receives updated `step` prop with `completed_at` set
                StepDisplay->>StepDisplay: useEffect detects change in `step.completed_at`
                StepDisplay->>ParentWizard: Calls onComplete() prop
            end
        ```

3.  **Backend API Refinements:**
    *   Finalize request/response schemas for `/api/onboarding/quizmaster/chat`.
    *   Detail the internal function (e.g., `completeStepForUser(userId, wizardId, stepId, verifiedData)`) that `experimental_onFunctionCall` would use, ensuring it's robust and reusable if possible.
    *   Specify how `wizardId` and `stepId` are securely obtained/validated within the chat API context to apply `markTestPassed` correctly.
4.  **Component Reusability:** Consider if/how components or logic can be shared or extended between the `QuizmasterBasic` and `QuizmasterAi` versions (e.g., if `QuizmasterAiConfig` could extend `QuizmasterBasicConfig`