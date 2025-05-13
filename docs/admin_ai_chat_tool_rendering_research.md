# Research: Admin AI Chat - Tool Invocation & Result Rendering

This document consolidates research and clarifications for correctly rendering tool call intentions, pending states, and final results (both success and failure, including quota errors) within the Admin AI Chat interface (`AdminAIChatView.tsx`). It focuses on the interaction between the Vercel AI SDK (`ai/react` `useChat`) and the project's specific state management (Jotai) and UI components.

## 1. Vercel AI SDK (`ai/react` `useChat`) Behavior for Tools

Based on the provided digest of Vercel AI SDK v4.2+ documentation:

*   **Tool Invocation Lifecycle:** Tool calls appear inside the *last assistant message*. The Vercel SDK `Message` type has `toolInvocations?: { toolCallId: string; toolName: string; args: Record<string, any>; result?: any; state: 'partial-call' | 'call' | 'result'; }[]`.
*   **In-Place Mutation:** The `toolInvocation` object (within `Message.toolInvocations`) mutates: its `state` changes (e.g., from `'call'` to `'result'`), and a `result` field is added upon completion.
*   **States for Rendering (from Vercel SDK `toolInvocation.state`):**
    *   `'partial-call'`: Model is still streaming/filling arguments. (UI: Skeleton/spinner).
    *   `'call'`: Full arguments known; execution not yet returned. (UI: "Running {toolName}..." placeholder).
    *   `'result'`: `result` field is present. (UI: Render custom card or hide).
*   **Error Handling:**
    *   No explicit `'error'` state on the Vercel SDK `toolInvocation` object itself.
    *   For *per-tool error UIs* (e.g., quota exceeded), the backend `execute` function must *catch its own errors* and return a normal JSON object like `{ success: false, error: "...", details: {...} }`. This object becomes `toolInvocation.result` when `state` is `'result'`.
*   **No Separate `role: 'tool'` Messages from `useChat` for results:** `useChat` collapses the tool call/result flow into the assistant message's `toolInvocations` array.

**Open Questions/Confirmations for Vercel AI SDK:**

*   **Q1.1:** *(Answered by Digest)* The Vercel SDK `Message.toolInvocations[number].state` has values: `'partial-call'`, `'call'`, `'result'`.
*   **Q1.2:** How does `useChat` handle multiple tool calls initiated by the AI in a single turn? Are they all in the same `toolInvocations` array of the single latest assistant message? *(Assumption: Yes, as per digest)*.
*   **Q1.3:** If a tool execution on the backend takes significant time, does the `toolInvocation.state` remain `'call'` until the result is fully received by the client? *(Assumption: Yes)*.

## 2. Jotai State Management (`src/stores/useChatHistoryStore.ts`)

*   **`ChatMessage.role`:** Defined as `'user' | 'assistant'` in `src/stores/useChatHistoryStore.ts`. This means the `toolInvocations` array on `ChatMessage` (where `role: 'assistant'`) is the primary place tool data is stored.
*   **`ToolInvocation` (Stored Type - from `src/stores/useChatHistoryStore.ts`):**
    ```typescript
    export interface ToolInvocation {
      toolName: string;
      toolCallId: string;
      args: Record<string, unknown>;
      result?: unknown; // This will store the parsed JSON object from the Vercel SDK's toolInvocation.result
      state: 'pending' | 'result' | 'error'; // States stored in Jotai
    }
    ```

**Open Questions/Confirmations for Jotai Store (and mapping):**

*   **Q2.1:** Definition of `ToolInvocation` (Stored Type) is now included above.
*   **Q2.2:** Finalized State Mapping Strategy:
    *   **Saving (Vercel SDK's `AssistantToolInvocationFromSDK.state` to Stored `ToolInvocation.state`):**
        *   Vercel `'partial-call'` or `'call'`  -> Stored `'pending'`.
        *   Vercel `'result'`:
            *   If `parsedResult.success === true` (where `parsedResult` is `toolInvocation.result`) -> Stored `'result'`.
            *   If `parsedResult.success === false` -> Stored `'error'`.
            *   If `toolInvocation.result` is present but `success` field is missing/malformed -> Stored `'error'` (or a new `'unknown_result'` state if preferred, but `'error'` is simpler).
    *   **Loading (Stored `ToolInvocation.state` to Vercel SDK's `AssistantToolInvocationFromSDK.state` for `initialMessages`):**
        *   Stored `'pending'` -> Vercel `'call'` (SDK will handle if it was `partial-call` originally; `call' is a safe default for an in-progress historical item).
        *   Stored `'result'` (implies success) -> Vercel `'result'`.
        *   Stored `'error'` (implies failure) -> Vercel `'result'` (because the error information *is* the result payload, e.g., `{ success: false, ... }`).
*   **Q2.3:** The `result` field in the stored `ToolInvocation` should contain the raw JSON object that was in the Vercel SDK's `toolInvocation.result`.

## 3. UI Components (`AdminAIChatView.tsx` function cards)

*   **Rendering Logic:** The view needs to iterate `Message.toolInvocations` (from `ai/react`) for assistant messages and use a `switch(toolInvocation.state)` (the Vercel SDK state: `'partial-call'`, `'call'`, `'result'`).
*   **Error Display:** Derived from `toolInvocation.result` (which is our `ToolResultPayload`) when `toolInvocation.state` is `'result'` and `ToolResultPayload.success === false`.

**Open Questions/Confirmations for UI Components:**

*   **Q3.1: Function Card Prop Requirements:**
    *   **`WizardCreatedCardProps`** (`WizardCreatedCard.tsx`):
        ```typescript
        interface WizardCreatedCardProps {
          wizardId: string;
          wizardName: string;
          communityId: string;
          onOpenEditor: (wizardId: string) => void;
        }
        ```
    *   **`WizardDeletedCardProps`** (`WizardDeletedCard.tsx`):
        ```typescript
        interface WizardDeletedCardProps {
          wizardId: string;
          wizardName: string;
        }
        ```
    *   **`WizardUpdatedCardProps`** (`WizardUpdatedCard.tsx`):
        ```typescript
        interface WizardUpdatedCardProps {
          wizardId: string;
          wizardName: string;
          isActive: boolean;
          onOpenEditor: (wizardId: string) => void;
        }
        ```
    *   **`WizardsListCardProps`** (`WizardsListCard.tsx`):
        ```typescript
        interface Wizard { // Internal to WizardsListCard, but good to know structure
          id: string;
          name: string;
          is_active: boolean;
          community_id: string;
          description?: string;
        }
        interface WizardsListCardProps {
          wizards: Wizard[];
          status: string; // e.g., 'active', 'inactive', 'all'
          onOpenEditor: (wizardId: string) => void;
        }
        ```
    *   **`StepDeletedCardProps`** (`StepDeletedCard.tsx`):
        ```typescript
        interface StepDeletedCardProps {
          stepId: string;
          wizardId: string;
          stepOrder?: number;
        }
        ```
    *   **`StepUpdatedCardProps`** (`StepUpdatedCard.tsx`):
        ```typescript
        interface StepUpdatedCardProps {
          stepId: string;
          wizardId: string;
          stepOrder: number;
          stepTypeName?: string;
          isMandatory?: boolean; // defaults to true in component
          isActive?: boolean;    // defaults to true in component
          onOpenStepEditor: (stepId: string, wizardId: string) => void;
        }
        ```
    *   **`StepsReorderedCardProps`** (`StepsReorderedCard.tsx`):
        ```typescript
        interface StepsReorderedCardProps {
          wizardId: string;
          wizardName: string;
          stepCount: number;
          onOpenEditor: (wizardId: string) => void;
        }
        ```
    *   **`StepAddedCardProps`** (`StepAddedCard.tsx`):
        ```typescript
        interface StepAddedCardProps {
          stepId: string;
          wizardId: string;
          stepOrder: number;
          stepTypeId: string;
          onOpenStepEditor: (stepId: string, wizardId: string) => void;
        }
        ```
    *   *(Self-correction: Ensure no `GetAvailableStepTypesCard` was missed; it wasn't in the file listing. If other cards exist, their props would also be needed here.)*
*   **Q3.2:** For the "View/Upgrade Plan" button (inside Quota Error UI), the `openUpgradeModalAtom` expects an `errorBody` like `{ error: "QuotaExceeded", message: "...", details: {...} }`. This structure should be created from the `toolInvocation.result` when a quota error is identified. *(This seems correct)*.

## 4. Overall Data Flow for Tool Rendering (Confirmed by Digest)

*   AI responds (`role: 'assistant'`) with `toolInvocations` array (state `'partial-call'` or `'call'`).
*   UI renders pending/executing state for these.
*   Backend executes, `useChat` updates the *same assistant message*: its `toolInvocations` now have entries with `state: 'result'` and `result` populated.
*   UI re-renders, processing `toolInvocation.result` for errors or success cards.

This refined understanding should guide the next implementation attempt. 