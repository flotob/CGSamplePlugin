# Feature Specification: Gradient Background Option

## 1. Goal

To enhance the step background customization options within the `StepEditor` by allowing administrators to select either a solid color background or a two-color linear gradient background. This feature aims to consolidate the background options into fewer tabs for a cleaner UI.

## 2. Current Status (As of last attempt)

*   The basic UI structure with separate tabs for "Image", "Solid Color", "Gradient", and "YouTube" was implemented.
*   Image selection and generation via the "Image" tab is functional.
*   Solid color selection via the "Solid Color" tab (using `react-colorful` via `ColorPicker` component) is functional.
*   The "Gradient" and "YouTube" tabs contain placeholders.
*   Attempts to combine "Solid Color" and "Gradient" into a single tab with conditional UI elements encountered state management issues leading to UI instability (disappearing elements). The implementation was reverted to keep "Solid Color" and "Gradient" separate for stability.

## 3. Detailed Requirements (Combined "Color / Gradient" Tab)

1.  **Single Tab:** Replace the "Solid Color" and "Gradient" tabs with one "Color / Gradient" tab in the "Background" accordion section of `StepEditor.tsx`.
2.  **Default State (Solid Color):**
    *   By default, display one `ColorPicker` component (bound to a state variable, e.g., `color1`).
    *   Display the hex code next to the picker.
    *   Display a preview `div` showing the selected solid color.
3.  **Gradient Toggle:**
    *   Include a `Checkbox` labeled "Enable Gradient".
4.  **Gradient State (Conditional UI):**
    *   When the "Enable Gradient" checkbox is checked:
        *   Display a *second* `ColorPicker` component (bound to a state variable, e.g., `color2`). Display its hex code.
        *   Display options to select the gradient direction (e.g., using `RadioGroup` for "Horizontal (Right)" / "Vertical (Bottom)"). Bind this to a state variable (e.g., `gradientDirection`).
    *   The preview `div` should dynamically update to show the linear gradient based on `color1`, `color2`, and `gradientDirection`.
5.  **Saving:**
    *   The selected configuration (either solid color or gradient details) must be correctly saved within the `step.config.presentation` object when the user saves the step.
    *   Only the configuration relevant to the *active* state (solid or gradient) should persist. Switching from gradient back to solid should effectively discard `color2` and `gradientDirection`.

## 4. Proposed Implementation Approach (Recommended)

This approach aims for robustness by using a structured object for gradient data within the existing `PresentationConfig`.

1.  **Data Structure (`PresentationConfig` in `CommonStepPresentationSettings.tsx`):**
    *   Define an interface `GradientValue { color1: string; color2: string; direction: 'to right' | 'to bottom'; }`.
    *   Modify `PresentationConfig` so `backgroundValue` can be `string | GradientValue | null`.
    *   `backgroundType` will be `'color'` or `'gradient'`.
    *   **Crucially:** Store the actual `GradientValue` *object* in `backgroundValue` when `backgroundType` is `'gradient'`, not a JSON string. Store the hex *string* when `backgroundType` is `'color'`.

2.  **State Management (`StepEditor.tsx`):**
    *   Use local `useState` hooks for the UI controls:
        *   `const [isGradientEnabled, setIsGradientEnabled] = useState(false);`
        *   `const [color1, setColor1] = useState('#ffffff');`
        *   `const [color2, setColor2] = useState('#cccccc');`
        *   `const [gradientDirection, setGradientDirection] = useState<'to right' | 'to bottom'>('to right');`
    *   **Initialization Effect:** Create a dedicated `useEffect` hook that depends *only* on `stepConfig.presentation.backgroundType` and `stepConfig.presentation.backgroundValue`. This effect reads the main config and initializes the local state (`isGradientEnabled`, `color1`, `color2`, `gradientDirection`) accordingly. It handles the cases where `backgroundValue` is a string (for 'color') or a `GradientValue` object (for 'gradient').
    *   **Update Effect:** Create a second `useEffect` hook that depends on the *local* state variables (`isGradientEnabled`, `color1`, `color2`, `gradientDirection`). This effect calculates the appropriate `newType` ('color' or 'gradient') and `newValue` (hex string or `GradientValue` object) and calls `setStepConfig` to update the main configuration state, but *only* if the intended `backgroundType` is 'color' or 'gradient' (to avoid overwriting image/youtube settings). Perform a check to see if an update is actually needed before calling `setStepConfig`.

3.  **UI (`StepEditor.tsx` - "Color / Gradient" Tab):**
    *   Render the UI elements (pickers, checkbox, radio group) described in the requirements.
    *   Bind UI elements directly to the local state variables (`color1`, `color2`, `isGradientEnabled`, `gradientDirection`) and their respective setters (`setColor1`, `setIsGradientEnabled`, etc.).
    *   The dynamic preview div uses CSS `linear-gradient` based on the local state.

## 5. Challenges Encountered & Learnings

*   **State Synchronization Loops:** Initial attempts using `useEffect` to synchronize local UI state changes *directly* back to the main `stepConfig`, while another effect tried to initialize local state *from* `stepConfig` (based on the `step` prop), led to infinite loops or stale state reads. The component would reset `isGradientEnabled` immediately after it was checked, causing the UI to vanish.
*   **Effect Dependencies:** Relying on the entire `step` object or broad dependencies in `useEffect` for initializing fine-grained local UI state is fragile. Changes elsewhere in the `step` object could trigger unnecessary re-initialization of the color/gradient state.
*   **Complexity:** Managing the interaction between the main configuration object (`stepConfig`) and the multiple local state variables needed for the gradient UI requires careful separation of concerns (initialization vs. updates) and precise effect dependencies.

## 6. Key Files Involved

*   `src/components/onboarding/steps/StepEditor.tsx` (Main component with state and UI)
*   `src/components/onboarding/steps/CommonStepPresentationSettings.tsx` (Defines `PresentationConfig` type)
*   `src/components/color-picker.tsx` (Reusable color picker component)
*   Relevant hook files (e.g., `useUpdateStep`)

## 7. Advice for Future Implementation

1.  **Strictly Isolate Effects:**
    *   Use one `useEffect` (depending on `step`, `isCreating`) ONLY for initializing step-level configuration (`targetRoleId`, `isMandatory`, `isActive`, the base `stepConfig` object).
    *   Use a SEPARATE `useEffect` (depending ONLY on `stepConfig.presentation.backgroundType` and `stepConfig.presentation.backgroundValue`) to initialize the LOCAL state (`isGradientEnabled`, `color1`, `color2`, `gradientDirection`).
    *   Use a THIRD `useEffect` (depending on the LOCAL state variables) to calculate the `newType`/`newValue` and update the main `stepConfig`, guarded by a check that the intended type is correct ('color' or 'gradient').
2.  **Incremental Implementation & Testing:** Implement changes step-by-step, testing thoroughly after each:
    *   Update types. Test.
    *   Add local state. Test.
    *   Implement initialization effect. Test saving/loading solid colors AND manually created gradient objects (via dev tools/DB edit).
    *   Implement UI elements one by one (picker 1, checkbox, picker 2, radios, preview). Test interactions.
    *   Implement the effect syncing local state back to main config. Test saving/loading again.
3.  **Liberal Logging:** Use `console.log` extensively within effects and handlers during development to track state values (`stepConfig`, local state) and see exactly when effects are running and what values they are using.
4.  **Consider Custom Hook (If Needed):** If the state logic still proves difficult, abstract the local state and the two specific effects (initialization, update) into a custom hook (e.g., `useBackgroundConfig(initialConfig)`). `StepEditor` would then just use this hook, simplifying its own code.

## 8. Open Questions / Considerations

*   More gradient directions (e.g., diagonals, angles)?
*   Radial gradients?
*   More than two color stops? (These would require significant changes to the `GradientValue` structure and UI).

This specification aims to provide a clear path forward based on previous attempts and learnings. 