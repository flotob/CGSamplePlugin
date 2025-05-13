# How to Add a New Step Type to the OnBoard Plugin

## 1. Overview

This document outlines the process for adding a new type of step to the OnBoard wizard system. Step types define the kind of content or interaction presented to the user within an onboarding wizard (e.g., displaying content, verifying ENS, linking credentials). Adding a new type involves modifications across the database, backend API, and frontend components (for both admin configuration and user display).

## 2. Core Concepts Recap

*   **`step_types` table:** Stores the definition of each step type (unique `name`, display `label`, `description`, `requires_credentials` flag). Located in `migrations/..._initial-setup.cjs` and potentially updated in later migrations (e.g., `..._add_label_to_step_types.js`).
*   **`onboarding_steps` table:** Represents an instance of a step within a specific wizard. It contains a `config` (JSONB) column structured like `{ "presentation": { ...common settings... }, "specific": { ...type-specific settings... } }`.
*   **`user_wizard_progress` table:** Tracks user completion of individual steps, storing step-specific outcomes in the `verified_data` (JSONB) column. The API route `/api/user/wizards/[id]/steps/[stepId]/complete` handles stringifying data into this column.
*   **Admin UI (`src/components/onboarding/steps/StepEditor.tsx`):** Allows admins to select step types (`StepSidebar.tsx` likely fetches from `/api/step_types`) and configure their `config.specific` settings via conditionally rendered components.
*   **User UI (`src/components/onboarding/steps/display/StepDisplay.tsx`):** Displays the step content/interaction based on its type and `config`, routing to specific display components (e.g., `ContentStepDisplay.tsx`, `EnsVerificationStepDisplay.tsx`).

## 3. Implementation Steps

Adding a new step type typically involves the following stages:

### 3.1. Database Changes

1.  **Define:** Decide on unique `name` (snake_case), user-friendly `label`, `description`, and `requires_credentials` (boolean).
2.  **Create Migration:** `npm run migrate create add_your_step_name_step_type` (or similar based on `package.json`).
3.  **Add `step_types` Entry:** Edit the generated migration file. In the `up` function, add:
    ```javascript
    // Inside exports.up = async (pgm) => { ... }
    pgm.sql(`
      INSERT INTO public.step_types (id, name, label, description, requires_credentials, updated_at, created_at)
      VALUES (gen_random_uuid(), 'your_step_name', 'Your Step Label', 'Description of your step.', false, NOW(), NOW());
    `);
    ```
    *Remember to include the `label` column, which was added after the initial setup.*
4.  **(Optional) New Tables:** If `config` or `verified_data` JSONB fields are insufficient, create new tables in this migration.
5.  **Run Migration:** `npm run migrate up`.

### 3.2. Backend Implementation (API Routes)

1.  **Step Creation & Config Saving:**
    *   **Creation (`POST /api/wizards/[id]/steps`):** When a step is first added via the admin UI (typically from `WizardStepEditorPage.tsx`), initially only the `step_type_id` might be sent if the creation logic is separate from the full configuration UI. The backend creates the step record, often with a default or empty `config`.
    *   **Configuration Update (`PUT /api/wizards/[id]/steps/[stepId]`):** The `StepEditor.tsx` component in the admin UI allows editing the step's `config`. When an admin saves changes, `StepEditor.tsx` sends the complete `config` object (structured as `{ "presentation": {...common settings...}, "specific": {...type-specific settings...} }`) to this PUT endpoint. The backend then updates the JSONB column in the `onboarding_steps` table.
    *   For most new step types, **no backend code changes are typically needed** for these core configuration saving mechanisms, as they generically handle the JSON `config` object.
    *   Add backend validation logic to the PUT endpoint *only if* complex server-side checks are required for the `specific` config *before* saving (e.g., validating a unique field or an external ID format).
2.  **Step Completion Handling (`POST /api/user/wizards/[id]/steps/[stepId]/complete`):**
    *   This route handles `INSERT/UPDATE` into `user_wizard_progress`.
    *   **Modify IF:**
        *   **Server-Side Validation:** Your step requires server validation *before* marking as complete (e.g., checking an external API status not possible on the client). Add this validation logic within the route handler. If validation fails, return an appropriate error response (e.g., 400).
        *   **Storing `verified_data`:** The route already accepts an optional `verified_data` object in the request body. It stringifies this and saves it to the JSONB column, using `COALESCE` to preserve existing data on updates if no new data is sent. Ensure your frontend display component sends the correctly structured `verified_data` object.
3.  **(Optional) New API Routes:** Create new routes if your step needs specific backend interactions during the user flow (e.g., OAuth, third-party checks initiated by the user). These would be called by your `*Display.tsx` component.

### 3.3. Frontend Implementation - Admin Configuration

1.  **Create Specific Config Component:**
    *   **File:** `src/components/onboarding/steps/YourStepNameConfig.tsx`.
    *   **Props:** Define an interface for the props. It should receive `initialData: YourStepSpecificConfig` (the current value of `stepConfig.specific`) and `onChange: (newSpecificConfig: YourStepSpecificConfig) => void`.
    *   **State:** Use `useState` internally to manage the form field values, initialized from `initialData`.
    *   **UI:** Render necessary `shadcn/ui` inputs (`Input`, `Textarea`, `Switch`, `Select`, etc.) based on the configuration options needed for your step type.
    *   **onChange Handling:** When an input changes, update the internal state and immediately call the `onChange` prop function with the *entire*, updated specific config object for your step type.
    *   **Example (`VideoEmbedConfig.tsx`):**
        ```typescript
        interface VideoEmbedSpecificConfig { videoUrl?: string | null; }
        interface VideoEmbedConfigProps {
          initialData: VideoEmbedSpecificConfig;
          onChange: (config: VideoEmbedSpecificConfig) => void;
        }
        const VideoEmbedConfig: React.FC<VideoEmbedConfigProps> = ({ initialData, onChange }) => {
          const [url, setUrl] = useState(initialData?.videoUrl ?? '');
          useEffect(() => { setUrl(initialData?.videoUrl ?? ''); }, [initialData]); // Sync with prop

          const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newUrl = e.target.value;
            setUrl(newUrl);
            onChange({ videoUrl: newUrl }); // Call onChange prop
          };
          return <Input value={url} onChange={handleChange} placeholder="Enter YouTube/Vimeo URL" />;
        };
        ```

2.  **Update `StepEditor.tsx` (to render your config component):**
    *   **File:** `src/components/onboarding/steps/StepEditor.tsx`.
    *   **Import:** Import your new `YourStepNameConfig` component.
    *   **Locate Rendering Logic:** Find the section with conditional rendering based on `stepTypeInfo?.name` (likely inside an `Accordion` for specific configurations).
    *   **Add Condition:** Add a new block for your step type:
        ```jsx
        {stepTypeInfo?.name === 'your_step_name' && (
          <AccordionItem value="specific-config-your_step_name"> {/* Ensure unique value for AccordionItem */}
            <AccordionTrigger>Your Step Configuration</AccordionTrigger>
            <AccordionContent>
              <YourStepNameConfig 
                initialData={stepConfig.specific as YourStepSpecificConfig} // Cast or type guard needed
                onChange={handleSpecificConfigChange} // Use the existing callback
              />
            </AccordionContent>
          </AccordionItem>
        )}
        ```
    *   **`handleSpecificConfigChange`:** This existing callback in `StepEditor.tsx` already handles updating the main `stepConfig.specific` state, so it usually doesn't need changes:
        ```typescript
        const handleSpecificConfigChange = useCallback((newSpecificConfig: Record<string, unknown> | ...) => { // Type might be more specific
          setStepConfig(prev => ({ ...prev, specific: newSpecificConfig as Record<string, unknown> }));
        }, []);
        ```

3.  **Enable Step Type in Admin Dropdown (Crucial):**
    *   **File:** `src/components/onboarding/WizardStepEditorPage.tsx`.
    *   **Locate Logic:** In the "+ Add Step" dropdown menu logic (likely within `WizardStepEditorPage.tsx`), find where step types are listed or filtered for display in the dropdown. This might involve an `isEnabled` check or a hardcoded array of enabled type names (e.g., `const isEnabled = ['ens', 'content', ...].includes(type.name);`).
    *   **Update Check:** Add your new `'your_step_name'` to this list or adjust the condition to include it. Without this, your newly defined step type (from the database) will not be selectable by admins in the UI.

4.  **Verify Step Type Data Fetching:**
    *   The list of available step types (including your new one from the database) is typically fetched by `useStepTypesQuery` within `WizardStepEditorPage.tsx` or a similar admin-facing component. Ensure this data is loading correctly. Step 3 makes it *selectable*.

### 3.4. Frontend Implementation - User Display & Interaction

1.  **Create Specific Display Component:**
    *   **File:** `src/components/onboarding/steps/display/YourStepNameDisplay.tsx`.
    *   **Props:** Define an interface. It must receive `step: UserStepProgress` and `onComplete: (verifiedData?: Record<string, unknown>) => void`.
    *   **Access Config:** Extract type-specific configuration via `const config = step.config?.specific as YourStepSpecificConfig;`.
    *   **Render UI:** Display content or interactive elements based on `config`.
    *   **Handle Completion:**
        *   **Passive:** Call `onComplete()` in `useEffect` on mount if viewing is enough (e.g., `ContentStepDisplay`).
        *   **Active:** Call `onComplete(verifiedData)` after user action or successful verification. `verifiedData` is an optional object containing any data that needs to be stored in the `user_wizard_progress.verified_data` column.
        *   Use `useMutation` if calling custom backend APIs for interaction/validation.
    *   **Example (`ContentStepDisplay.tsx` - Passive Completion):**
        ```typescript
        useEffect(() => {
          if (!step.completed_at) {
            onComplete(); // No verified_data needed
          }
        }, [onComplete, step.completed_at]);
        ```
    *   **Example (`EnsVerificationStepDisplay.tsx` - Active Completion using Hook):** This component uses a dedicated hook (`useCredentialVerification`) which likely calls the completion API internally. The `onComplete()` prop is called by the hook upon successful verification *without* passing `verifiedData` directly from the display component.

2.  **Update `StepDisplay.tsx`:**
    *   **File:** `src/components/onboarding/steps/display/StepDisplay.tsx`.
    *   **Import:** Import your new `YourStepNameDisplay` component.
    *   **Locate Routing Logic:** Find the `switch (stepType.name)` statement.
    *   **Add Case:** Add a new case for your step type:
        ```javascript
        case 'your_step_name':
          stepContentElement = <YourStepNameDisplay step={step} stepType={stepType} onComplete={onComplete} />;
          break;
        ```
    *   **Background:** Note that background styles (image, color, etc.) are handled by `StepDisplay` based on `step.config.presentation`, not usually by the specific display component.

### 3.5. TypeScript Definitions

*   Define interfaces for your specific configuration (e.g., `YourStepNameSpecificConfig`) and any `verified_data` structure your step might produce if it passes data upon completion.
*   **Location:** A good practice is to place these in the `src/types/` directory. Look for existing relevant files (e.g., `onboarding-steps.ts` or `index.d.ts` within a specific step type's folder if you co-locate types) or create a new, appropriately named file (e.g., `your-step-name-types.ts`).
*   Ensure these types are correctly imported and used in your new `*Config.tsx` and `*Display.tsx` components, as well as any related backend processing if `verified_data` is complex.

## 4. Example: Adding a "Video Embed" Step (Refined)

1.  **DB:** Add migration for `step_types` with `name='video_embed'`, `label='Embed Video'`, `description='Embed a YouTube/Vimeo video'`, `requires_credentials=false`.
2.  **Backend:** No changes needed.
3.  **Frontend (Admin):**
    *   Create `VideoEmbedConfig.tsx` with `interface VideoEmbedSpecificConfig { videoUrl?: string | null; }`. Render an `Input`. Call `onChange({ videoUrl: newUrl })`.
    *   Update `StepEditor.tsx` switch/if block: `{stepTypeInfo?.name === 'video_embed' && (<AccordionItem...><VideoEmbedConfig initialData={...} onChange={handleSpecificConfigChange} /></AccordionContent></AccordionItem>)}`
4.  **Frontend (User):**
    *   Create `VideoEmbedDisplay.tsx`. Props: `step`, `onComplete`. Config: `const config = step.config?.specific as VideoEmbedSpecificConfig; const url = config?.videoUrl;`. Render an `iframe` using the `url`. Call `onComplete()` in `useEffect` if `!step.completed_at`.
    *   Update `StepDisplay.tsx` switch: `case 'video_embed': stepContentElement = <VideoEmbedDisplay step={step} stepType={stepType} onComplete={onComplete} />; break;`
5.  **Types:** Ensure `VideoEmbedSpecificConfig` interface is defined and imported/used correctly.

## 5. Summary Checklist

*   [ ] Define `name`, `label`, `description`, `requires_credentials`.
*   [ ] Create DB migration to add row to `step_types`.
*   [ ] Run migration.
*   [ ] Create Admin configuration component (`*Config.tsx`) accepting `initialData` and `onChange`.
*   [ ] Update `StepEditor.tsx` to render new config component based on `stepType.name`.
*   [ ] Enable new step type in `WizardStepEditorPage.tsx` dropdown/selection logic.
*   [ ] Create User display component (`*Display.tsx`) accepting `step` and `onComplete`.
*   [ ] Implement step logic (display, interaction) in display component.
*   [ ] Implement `onComplete(verified_data?)` call in display component.
*   [ ] Update `StepDisplay.tsx` to render new display component based on `stepType.name`.
*   [ ] (If needed) Create new backend API routes for specific actions.
*   [ ] (If needed) Update step completion API route to handle specific validation or `verified_data`.
*   [ ] Add/Update relevant TypeScript types (for specific config and verified_data).
*   [ ] Test admin configuration flow.
*   [ ] Test user completion flow.

--- 