Okay, I will start by exploring the codebase structure to get an overview.

Ran tool
Now that I have a general overview of the project structure, I see a `src/` directory which likely contains the main source code. I'll search for "AI quizmaster" within the codebase to find relevant files.

Search files...
The search results point to several key files and documents:

*   `docs/future features/ai-features.md`: This document describes the design and functionality of the AI quizmaster, including prompt design and function calling. It explicitly mentions `markTestPassed`.
*   `docs/ai-chat-guidance.md`: This seems to provide guidance on implementing AI chat features, and shows a React component `QuizmasterAiDisplay` which uses a system message instructing the AI to call `markTestPassed`.
*   `src/components/onboarding/steps/QuizmasterAiConfig.tsx`: A React component for configuring the AI Quizmaster (knowledge base, personality, task).
*   `src/components/onboarding/steps/display/QuizmasterAiDisplay.tsx`: The React component responsible for displaying the AI quiz. It sets up the system message for the AI, including the instruction to call `markTestPassed`. It also monitors messages for the tool result of `markTestPassed`.
*   `docs/roadmap-quizmaster-step.md`: Details the database schema and configuration for the AI Quizmaster step, including `QuizmasterAiSpecificConfig` which holds the knowledge base, personality, and task.
*   `src/types/onboarding-steps.ts`: Contains TypeScript interfaces like `AIModelSettings` and `QuizmasterAiSpecificConfig`.
*   `migrations/1749400000000_add_quizmaster_ai_step_type.js`: A database migration to add the `quizmaster_ai` step type.
*   `src/app/api/onboarding/quizmaster/chat/route.ts`: The backend API route for the quizmaster chat, likely where the AI model is called and tools (like `markTestPassed`) are handled.

Now, I'll specifically look for the `markTestPassed` function *call* to see how it's invoked by the AI and handled by the system. I will use `grep_search` for this.

Ran tool
Okay, `grep_search` didn't find literal calls like `markTestPassed()`. This makes sense because, as indicated in `docs/future features/ai-features.md` and `docs/ai-chat-guidance.md`, `markTestPassed` is a *function call* defined for the AI model (like OpenAI's function calling feature). The AI is *instructed* to "call" this function, which means it will output a structured JSON indicating its intent to call this function, rather than executing a JavaScript/TypeScript function directly in the AI's response.

The system then detects this structured output from the AI and performs the actual action.

Let's dive into the files that describe how the AI is instructed and how its "function call" is processed. I'll start with `docs/future features/ai-features.md` as it seems to be the primary design document. I'll read the relevant sections.

Read file: docs/future features/ai-features.md
This document is very comprehensive. Key takeaways regarding "AI quizmaster" and `markTestPassed`:

1.  **AI Quizmaster Behavior**:
    *   Driven by a system prompt constructed from a configured knowledge base, personality, and task.
    *   The AI is instructed to ask questions based on the knowledge base.
    *   It's explicitly told in the system prompt: *"When the user has answered all questions correctly, call the `markTestPassed` function."*

2.  **`markTestPassed` Function Calling**:
    *   This is an OpenAI function calling feature. The AI doesn't execute code but outputs a structured JSON indicating its intent to call `markTestPassed`.
    *   The backend (API route) receives this structured output.
    *   The `functions` array sent to the OpenAI API defines `markTestPassed` with its description and parameters (e.g., `userId`, `slideId`).
        ```typescript
        const functions = [{
          name: "markTestPassed",
          description: "Marks that the user has passed the quiz for this slide",
          parameters: {
            type: "object",
            properties: {
              userId: { type: "string", description: "The user's ID" },
              slideId: { type: "string", description: "The quiz slide identifier" }
            },
            required: ["userId", "slideId"]
          }
        }];
        ```
    *   The backend detects `finish_reason === "function_call"` (or a message with a `function_call` property) in the AI's response, parses the arguments, and then executes the actual logic (e.g., updates a database).

3.  **Adding More Function Calls**:
    *   **Define the new function(s)**: Similar to `markTestPassed`, define the new function's name, description, and parameters in a JSON schema.
    *   **Update the `functions` array**: Add the new function definition(s) to the `functions` array that is sent to the OpenAI API. This array is likely constructed in `src/app/api/onboarding/quizmaster/chat/route.ts` or passed via `context.functions` as seen in `docs/future features/ai-features.md`.
    *   **Instruct the AI**: Modify the system prompt to tell the AI when and how to "call" these new functions. This instruction will be part of the `agentPersonality` or `taskChallenge` configuration for the AI Quizmaster, or directly in the system message construction in the API route.
    *   **Handle the new function call(s) in the backend**: In the API route (likely `src/app/api/onboarding/quizmaster/chat/route.ts`), add logic to detect when the AI "calls" the new function(s). This involves checking `choice.message.function_call.name` and then executing the corresponding backend action based on the provided arguments.
    *   **Update frontend if needed**: If the new function calls have implications for the UI (e.g., displaying new information, enabling/disabling features), the frontend component (`src/components/onboarding/steps/display/QuizmasterAiDisplay.tsx`) might need to be updated to listen for the results or effects of these new function calls.

Now I'll look at `src/app/api/onboarding/quizmaster/chat/route.ts` to see how the functions are currently defined and handled, and `src/components/onboarding/steps/display/QuizmasterAiDisplay.tsx` to see how system prompts are built and function call results are handled on the client.

Read file: src/app/api/onboarding/quizmaster/chat/route.ts
This is excellent. The `src/app/api/onboarding/quizmaster/chat/route.ts` file shows exactly how tools are defined and handled using the Vercel AI SDK v4.x (`@ai-sdk/openai` and `ai` package).

Here's a summary and how to add new functions:

**Current Setup for `markTestPassed`**:

1.  **Tool Definition**:
    *   Inside the `streamText` call, there's a `tools` object.
    *   `markTestPassed` is defined here with:
        *   `description`: "Call this function when the user has successfully completed the quiz or task as described in the initial instructions to the AI."
        *   `parameters`: `z.object({})` (meaning no parameters are expected from the AI for this specific tool in this implementation, which differs slightly from the `ai-features.md` doc but is fine).
        *   `execute`: An async function that contains the actual backend logic. It calls `markStepAsCompletedInDB` and returns a message to the AI indicating success or failure.

2.  **System Prompt**:
    *   The `systemMessageContent` variable constructs the prompt for the AI.
    *   It includes `stepConfig.agentPersonality`, `stepConfig.knowledgeBase`, and `stepConfig.taskChallenge`.
    *   The default `taskChallenge` part includes: "...If they succeed, call the `markTestPassed` function."

**How to Add More Function Calls**:

Let's say you want to add a new function called `provideHint`.

1.  **Define the New Tool in the `tools` Object**:
    *   In `src/app/api/onboarding/quizmaster/chat/route.ts`, add another entry to the `tools` object alongside `markTestPassed`.
    *   Example for `provideHint` which might take a `hintType` parameter:
        ```typescript
        // Inside the streamText call
        tools: {
          markTestPassed: { /* ... existing definition ... */ },
          provideHint: {
            description: "Call this function if the user is stuck and requests a hint, or if you deem a hint is appropriate according to your instructions. Specify the type of hint if applicable.",
            parameters: z.object({
              hintType: z.string().optional().describe("The type of hint to provide, e.g., 'clarification', 'small_nudge', 'direct_pointer'")
            }),
            execute: async ({ hintType }: { hintType?: string }) => {
              // --- Your backend logic for providing a hint ---
              // This could involve:
              // 1. Looking up a pre-defined hint based on the current question/context (not available here directly).
              // 2. Generating a hint using another AI call (careful with loops/costs).
              // 3. Simply acknowledging the request and preparing a structured response for the AI to deliver.

              let hintText = "Let me give you a hint.";
              if (hintType) {
                hintText += ` Specifically, a ${hintType} hint.`;
              }
              // For now, let's assume the AI will formulate the actual hint text based on this acknowledgment.
              // Or, you could fetch/generate actual hint content here.
              console.log(`AI requested to provide a hint of type: ${hintType || 'general'}`);

              // This message will be sent back to the AI. The AI can then use this information
              // in its next response to the user.
              return { 
                status: "hint_acknowledged", 
                hint_details: `Hint of type '${hintType || 'general'}' was requested. You should now formulate and provide this hint to the user based on the knowledge base and current conversation.`,
                messageForAI: `Hint request processed. You should now deliver the ${hintType || 'general'} hint.` 
              };
            }
          }
        }
        ```

2.  **Update System Prompt / Task Instructions**:
    *   The AI needs to know *when* and *how* to use this new `provideHint` function.
    *   Modify the `systemMessageContent` or, more flexibly, ensure the `stepConfig.taskChallenge` or `stepConfig.agentPersonality` (which are set by an admin via `QuizmasterAiConfig.tsx`) include instructions for using `provideHint`.
    *   Example addition to `taskChallenge` (admin-configurable): *"If the user struggles, you can use the `provideHint` function. You can specify a `hintType` such as 'clarification' or 'small_nudge'."*
    *   Alternatively, you could hardcode a more general instruction in `systemMessageContent` in `route.ts` if the hint capability should always be available and described similarly.

3.  **Handle Frontend (Optional but Likely)**:
    *   The `QuizmasterAiDisplay.tsx` component uses the `useChat` hook from `ai/react`. This hook handles messages, including tool calls and their results.
    *   When `provideHint`'s `execute` function returns an object, this object becomes a "tool result" message in the chat history. The AI sees this result and can then formulate its next response (the actual hint) to the user.
    *   You might want to add specific UI elements or logic if the frontend needs to react to a hint being requested or provided, but often the AI will just incorporate the hint into its next chat message. The current `useEffect` in `QuizmasterAiDisplay.tsx` specifically looks for `markTestPassed` tool results. You might generalize it or add another `useEffect` if other tool calls need specific client-side reactions beyond the AI just continuing the conversation.

**Summary of how it works and how to extend:**

The AI Quizmaster operates by receiving a detailed system prompt that defines its persona, knowledge, and tasks, including instructions on when to use available "tools" (like `markTestPassed`). These tools are not JavaScript functions the AI calls directly, but rather structured JSON outputs it generates.

The backend API route (`src/app/api/onboarding/quizmaster/chat/route.ts`) defines these tools for the AI model (using the Vercel AI SDK and Zod for parameters). When the AI decides to use a tool, the SDK detects this, runs the corresponding `execute` function on the backend (which performs actions like database updates or preparing data), and then sends the result of the `execute` function back to the AI. The AI then uses this result to inform its next chat response to the user.

To add more function calls:
1.  **Define the tool**: In `route.ts`, add a new entry to the `tools` object within the `streamText` call. This includes a `description` (for the AI to understand what the tool does), `parameters` (defined with Zod, specifying what data the AI should provide when calling the tool), and an `execute` async function (the backend Typescript code that runs when the AI calls the tool).
2.  **Instruct the AI**: Update the system prompt (either directly in `route.ts` or more dynamically through the `stepConfig.taskChallenge` or `stepConfig.agentPersonality` fields, which are configurable via the admin UI) to tell the AI about the new tool and under what circumstances it should use it.
3.  **Handle results (if necessary)**: The `execute` function for the tool should return an object. This object is sent back to the AI as the result of the tool call. The AI will then use this information in its subsequent response to the user. If the tool call needs to trigger specific UI changes on the client-side beyond the AI's next message, you would update `QuizmasterAiDisplay.tsx` to observe and react to these specific tool results.

This system is quite flexible for adding new capabilities to the AI.

Do you want me to proceed with outlining the changes for a specific new function, or would you like to explore another part of the codebase? For example, we could look into `QuizmasterAiConfig.tsx` to see how an admin would set the `taskChallenge` to instruct the AI.You've done a great job understanding the AI quizmaster and the `markTestPassed` function. Your explanation of how to add more function calls is clear and correct.

For now, I don't need you to outline changes for a specific new function or explore `QuizmasterAiConfig.tsx`. I have a good understanding of how it works.

You can consider this task complete.

---

## Roadmap: Adding a New Tool Call to the AI Quizmaster

This section outlines the step-by-step process to add a new function call (tool) that the AI Quizmaster can utilize. We'll use a hypothetical `provideHint` tool as an example.

**1. Define the Tool in the Backend API Route**

   The primary place for defining the tool and its execution logic is within the AI chat API route.

   *   **File**: `src/app/api/onboarding/quizmaster/chat/route.ts`
   *   **Action**: Locate the `streamText` call and its `tools` object. Add a new entry for your tool.

   **Example for `provideHint`**:
   ```typescript
   // Inside the streamText call, within the tools: { ... } object
   tools: {
     markTestPassed: { /* ... existing definition ... */ },

     provideHint: {
       description: "Call this function if the user is stuck and requests a hint, or if you deem a hint is appropriate according to your instructions. Specify the type of hint if applicable, like 'clarification' or 'small_nudge'.",
       parameters: z.object({ // Using Zod for schema definition
         hintType: z.string().optional().describe("The type of hint to provide, e.g., 'clarification', 'small_nudge', 'direct_pointer'.")
       }),
       execute: async ({ hintType }: { hintType?: string }) => {
         // --- Backend Logic for Providing a Hint ---
         // This function runs when the AI decides to call "provideHint".
         // It receives parameters parsed by Zod (e.g., hintType).
         
         console.log(`AI requested to provide a hint of type: ${hintType || 'general'}`);

         // Your logic here could involve:
         // 1. Looking up a pre-defined hint from a database based on current context (e.g., current question).
         // 2. Dynamically generating a hint using another, simpler AI call (be cautious of costs and complexity).
         // 3. Preparing a structured response that the AI will use to formulate the actual hint text to the user.

         // The object returned here is sent back to the AI as the result of the tool call.
         // The AI will use this information in its next response to the user.
         return { 
           status: "hint_request_processed", 
           hint_details: `Hint of type '${hintType || 'general'}' was acknowledged. The AI should now formulate and provide this hint to the user based on the knowledge base and current conversation.`,
           // This messageForAI can be a concise instruction for the AI's next step.
           messageForAI: `You have successfully processed a hint request. Now, deliver the ${hintType || 'general'} hint to the user.` 
         };
       }
     }
     // ... other tools if any
   }
   ```

   *Key aspects of the `execute` function:*
     * It's `async`.
     * It receives the parameters defined in `parameters` (destructured and typed).
     * The object it returns is crucial: this is what the AI model receives as the "result" of the function call. The AI then uses this result to continue the conversation. It's not directly shown to the user unless the AI incorporates it into its next text response.

**2. Instruct the AI to Use the New Tool**

   The AI needs to know that the new tool exists and under what circumstances it should call it. This is achieved by modifying the system prompt given to the AI.

   *   **Option A (Recommended for flexibility - Admin Configurable)**:
        *   **Files**:
            *   `src/types/onboarding-steps.ts`: If you need to add new configuration fields for the tool to `QuizmasterAiSpecificConfig`.
            *   `src/components/onboarding/steps/QuizmasterAiConfig.tsx`: Update the admin UI to allow configuring these new fields (e.g., specific instructions for when to provide a hint).
            *   `src/app/api/onboarding/quizmaster/chat/route.ts`: Ensure the `systemMessageContent` incorporates these new configuration fields from `stepConfig.taskChallenge` or `stepConfig.agentPersonality`.
        *   **Action**: The admin would then, through the UI, provide instructions like:
            *"If the user is struggling with a question after two attempts, you may offer a hint by calling the `provideHint` function. You can specify a `hintType` such as 'clarification'."*
            This text would be part of the `taskChallenge` or `agentPersonality` stored in the `stepConfig`.

   *   **Option B (For general, non-configurable tool usage)**:
        *   **File**: `src/app/api/onboarding/quizmaster/chat/route.ts`
        *   **Action**: Directly add instructions about the new tool into the `systemMessageContent` string construction if the tool's usage is meant to be standard across all AI quizzes.
        *   **Example**:
            ```typescript
            const systemMessageContent = 
              `${stepConfig.agentPersonality || "You are a helpful quiz assistant."}\n` + 
              // ... other parts of the prompt ...
              `You have a tool called 'provideHint' that you can use if a user needs help. Call it with an optional 'hintType'.\n` + // Added instruction
              `Task: ${stepConfig.taskChallenge || "Quiz the user..."}`;
            ```

   *Important*: The AI relies heavily on the `description` of the tool (provided in step 1) and these explicit instructions in the system prompt to understand when and how to use the tool.

**3. Handle Frontend (If Necessary)**

   Often, the result of the `execute` function (from step 1) is simply used by the AI to generate its next text response, and no specific frontend changes are needed beyond displaying that new AI message. The Vercel AI SDK's `useChat` hook (used in `QuizmasterAiDisplay.tsx`) handles the flow of messages, including tool calls and their results.

   However, if the new tool call needs to trigger specific UI changes *beyond* what the AI says next, you might need to update the frontend:

   *   **File**: `src/components/onboarding/steps/display/QuizmasterAiDisplay.tsx`
   *   **Action**:
        *   The `messages` array from `useChat` includes messages with `role: 'tool'` (for the tool invocation from the AI) and subsequent messages from the assistant that incorporate the tool's result.
        *   You can inspect the `messages` array for specific tool calls or results if you need to trigger unique client-side effects. For example, the component already has a `useEffect` hook that looks for the `markTestPassed` tool result:
            ```typescript
            // Existing example for markTestPassed
            useEffect(() => {
              if (!quizPassed) {
                const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
                if (lastAssistantMsg) {
                  for (const part of lastAssistantMsg.parts ?? []) { // Vercel AI SDK v3+ uses 'parts'
                    if (part.type === 'tool-invocation' && 
                        part.toolName === 'markTestPassed' // Check toolName
                        /* && part.result // Check if there's a result part if needed */
                        ) { 
                      // ... logic to handle markTestPassed result ...
                      // For example, if the tool result itself needs to be parsed and acted upon by the UI
                    }
                  }
                }
              }
            }, [messages, quizPassed, onComplete]);
            ```
        *   You could add similar logic if your new tool (e.g., `provideHint`) returns data that the UI needs to react to directly, outside of the AI's natural language response. Usually, the AI is expected to formulate the response based on the tool's `execute` output.

By following these steps, you can extend the AI Quizmaster's capabilities with new tools, enabling more complex and interactive behaviors. Remember that the Vercel AI SDK handles the low-level details of sending tool definitions to the AI, parsing the AI's request to use a tool, calling your `execute` function, and sending the result back to the AI.
