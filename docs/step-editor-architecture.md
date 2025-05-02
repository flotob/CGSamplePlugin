# Research: Step Editor Configuration Architecture

## 1. Problem Definition

We need a flexible and maintainable architecture for configuring individual steps within the onboarding wizard admin tool (`StepEditor.tsx`). This architecture must:

*   Handle **common step fields** (Target Role, Mandatory, Active).
*   Handle **common presentation options** applicable to potentially all step types (e.g., Headline, Subtitle, Background).
*   Handle **configuration options specific** to each step type (e.g., ENS requirement type, Discord server ID).
*   Support loading existing configuration when editing a step.
*   Support saving all configuration settings (common, presentation, specific) into the `onboarding_steps.config` JSONB field.
*   Promote **code reuse** for validation logic or utility functions that might be needed both during configuration (admin UI) and later during wizard execution (user verification).

## 2. Proposed Architecture

We propose a modular approach centered around `StepEditor.tsx`:

*   **`StepEditor.tsx` (Orchestrator):**
    *   Continues to manage the overall step context (editing vs. creating).
    *   Handles fetching the step data and step type info.
    *   Renders the common fields: Target Role, Mandatory, Active.
    *   Renders the `CommonStepPresentationSettings` component.
    *   Conditionally renders the appropriate `<StepType>Config` component based on `stepTypeInfo.name`.
    *   Manages the combined state derived from common fields, presentation settings, and specific settings.
    *   Constructs the final `config` object in the desired structure before calling `createStep` or `updateStep`.
    *   Parses the incoming `step.config` to initialize the state for child components.

*   **`CommonStepPresentationSettings.tsx`:**
    *   A reusable component responsible for rendering UI elements for common presentation options (e.g., Headline, Subtitle, Background Image/Color).
    *   Receives initial values from `StepEditor` (parsed from `step.config.presentation`).
    *   Calls a callback prop (`onPresentationChange`) provided by `StepEditor` to update the parent's state.

*   **`<StepType>Config.tsx` (e.g., `EnsStepConfig.tsx`, `DiscordConfig.tsx`):**
    *   Specific components created for each step type that requires unique configuration.
    *   Responsible for rendering UI elements for *only* the type-specific settings.
    *   Receives initial values from `StepEditor` (parsed from `step.config.specific` or similar).
    *   Calls a callback prop (`onSpecificConfigChange`) provided by `StepEditor` to update the parent's state.
    *   Imports and uses reusable logic/validation functions as needed (see below).

*   **`src/lib/step-logic/` (Reusable Logic):**
    *   A dedicated directory containing modules for reusable functions, constants, or hooks related to specific step types (e.g., `src/lib/step-logic/ens.ts`, `src/lib/step-logic/discord.ts`).
    *   Examples: `isValidEnsDomain(domain)`, `formatDiscordInvite(code)`.
    *   These functions can be imported and used by:
        *   `<StepType>Config.tsx` components (for input validation, data formatting).
        *   The eventual wizard execution logic (for verifying user data).

*   **`config` JSONB Structure:**
    *   We propose nesting presentation and specific configurations within the `config` object for clarity:
      ```json
      {
        "presentation": {
          "headline": "Optional Step Headline",
          "subtitle": "Optional step subtitle.",
          "background_url": null,
          "background_color": "#FFFFFF" 
        },
        "specific": {
          // Step-type specific key-value pairs
          // e.g., for 'ens':
          "requirement_type": "specific_domain", // or 'any_primary'
          "domain_name": "example.eth"
          // e.g., for 'discord_role':
          "server_id": "123456789",
          "role_id": "987654321"
        }
      }
      ```
    *   **Recommendation:** Use the nested structure (`presentation`, `specific`) for better organization and to avoid potential key conflicts as more step types are added.

## 3. Example: 'ens' Step Type Implementation

1.  **`StepEditor.tsx`:**
    *   Renders common fields.
    *   Renders `<CommonStepPresentationSettings onChange={handlePresentationChange} initialData={step?.config?.presentation} />`.
    *   If `stepTypeInfo.name === 'ens'`, renders `<EnsStepConfig onChange={handleSpecificConfigChange} initialData={step?.config?.specific} />`.
    *   `handleSubmit` merges state from common fields, presentation, and specific config into the final `config` object (using the nested structure) before mutation.
    *   `useEffect` parses `step.config` into `presentation` and `specific` parts to pass down.

2.  **`CommonStepPresentationSettings.tsx`:**
    *   Contains inputs for Headline, Subtitle, etc.
    *   Calls `onPresentationChange` with the updated presentation object.

3.  **`EnsStepConfig.tsx`:**
    *   Renders radio buttons for `requirement_type` ('any_primary', 'specific_domain').
    *   Conditionally renders an input for `domain_name` if 'specific_domain' is selected.
    *   Imports `isValidEnsDomain` from `src/lib/step-logic/ens.ts` to validate the input.
    *   Calls `onSpecificConfigChange` with `{ requirement_type: '...', domain_name: '...' }`.

4.  **`src/lib/step-logic/ens.ts`:**
    *   Exports `const isValidEnsDomain = (domain: string): boolean => { /* validation logic */ };`.

## 4. Advantages

*   **Modularity:** Clear separation of concerns between common fields, presentation, specific config, and reusable logic.
*   **Maintainability:** Easier to add/modify step types or presentation options without impacting unrelated code.
*   **Reusability:** Explicitly designed for reusing validation/logic between admin config and user execution.
*   **Scalability:** Structure accommodates adding many diverse step types.
*   **Clarity:** The nested `config` structure keeps the data organized.

## 5. Next Steps / Research Tasks

1.  **Confirm Architecture:** Agree on this proposed structure (using `CommonStepPresentationSettings`, `<StepType>Config` components, `src/lib/step-logic/`, and the nested `config` object).
2.  **(If Yes) Define Initial Presentation Fields:** Decide on the initial set of fields for `CommonStepPresentationSettings` (e.g., headline, subtitle mandatory? background options?).
3.  **(If Yes) Create Directory:** Create the `src/lib/step-logic/` directory.
4.  **(If Yes) Implement for 'ens':**
    *   Create and implement `CommonStepPresentationSettings.tsx`.
    *   Create and implement `EnsStepConfig.tsx`.
    *   Create `src/lib/step-logic/ens.ts` with basic validation (can be refined later).
    *   Modify `StepEditor.tsx` to integrate these components, manage the combined state, and handle the nested `config` object structure during loading and saving. 