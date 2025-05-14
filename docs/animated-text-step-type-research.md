# Research & Implementation Plan: Animated Text Step Type

## 1. Goal

Create a new OnBoard wizard step type called "Animated Text".
-   **Admin Configuration:** Allows an administrator to input a string of text.
-   **User Display:** When a user encounters this step in an onboarding wizard, the specified text will be animated, appearing as if it's being "drawn" or "written" on the screen.
-   The animation style should be inspired by the `docs/apple-hello.md` example.

## 2. Research & Key Considerations

### 2.1. Inspiration: `docs/apple-hello.md`

-   The `apple-hello.md` file demonstrates an SVG animation where the word "hello" is drawn.
-   This is achieved by:
    -   A predefined SVG `<path>` element with specific `d` attribute (path data) for the word "hello".
    -   CSS animation manipulating `stroke-dasharray` and `stroke-dashoffset` properties of the SVG path.
    -   `stroke-dasharray` is set to the total length of the path.
    -   `stroke-dashoffset` is animated from the total length down to 0, revealing the path.

### 2.2. Challenge: Dynamic Text

-   The core challenge is that the text is user-defined, unlike the hardcoded "hello" path in the example.
-   We cannot pre-generate SVG paths for every possible string.
-   We need a mechanism to convert arbitrary text input into an SVG path dynamically in the browser.

### 2.3. Potential Solutions for Dynamic Text-to-Path:

1.  **`opentype.js` (Recommended for "Drawing" Effect):**
    -   A JavaScript library that can parse font files (e.g., .otf, .ttf, .woff).
    -   It allows programmatic access to glyphs and can generate SVG path data for a given string and font.
    -   **Pros:** Precisely replicates the "drawing" effect by creating actual paths for the text. Allows for custom font usage if we bundle a font or let users specify one (advanced).
    -   **Cons:** Adds a dependency. Requires loading a font file. Performance for very long strings or complex fonts needs consideration.

2.  **SVG `<text>` Element with Animation:**
    -   SVG has a native `<text>` element.
    -   Animating text "drawing" directly on a `<text>` element is less straightforward than with paths.
        -   One common technique is to use a clipping path that animates to reveal the text.
        -   Another is to animate `stroke-dasharray` and `stroke-dashoffset` on the text, but this only works if the text itself has a stroke and no fill, and the "drawing" effect might look different (e.g., outlining characters rather than filling them as if drawn by a pen).
    -   **Pros:** No external JS library needed for path generation. Simpler for basic text display.
    -   **Cons:** Achieving the exact "drawing" stroke effect from `apple-hello.md` is harder. Might be more of a "reveal" than a "draw".

3.  **CSS-only Text Animation (Simpler Reveal):**
    -   Techniques like animating `width` with `overflow: hidden`, or gradient animations on text color.
    -   **Pros:** Simplest to implement, no JS for the animation logic itself.
    -   **Cons:** Unlikely to achieve the desired "drawing" effect. More of a "wipe" or "fade-in" reveal.

**Decision for Research:** Prioritize `opentype.js` as it most closely aligns with the "drawing" animation goal. A fallback or simpler version could use SVG `<text>` or CSS if `opentype.js` proves too complex for a first iteration.

### 2.4. Animation Mechanism

-   Once an SVG path is obtained (dynamically), the CSS animation technique from `apple-hello.md` (`stroke-dasharray` and `stroke-dashoffset`) is directly applicable.
-   JavaScript can be used to:
    -   Get the total length of the dynamically generated path (`pathElement.getTotalLength()`).
    -   Set the initial `stroke-dasharray` and `stroke-dashoffset` to this length.
    -   Trigger the animation (either by adding a class that applies CSS animation or by using a JS animation library like GSAP, though CSS animation is likely sufficient).

### 2.5. Styling & Configuration Options

-   **Input Text:** The primary configuration.
-   **Font:** For `opentype.js`, we'll need to decide on a default font to bundle with the component. Advanced: allow admins to choose from a predefined list or (less likely) upload a font. Start with one good default.
-   **Stroke Color:** Should be configurable. Default to white or a theme-appropriate color.
-   **Stroke Width:** Might be configurable.
-   **Animation Speed/Duration:** Could be a preset or configurable.
-   **Background:** The step's presentation config (`step.config.presentation`) should handle background styling as per other step types.

## 3. Comparison with `ContentStepDisplay`

-   The `ContentStepDisplay` (and its admin counterpart `ContentConfig`) will serve as a good structural reference:
    -   `ContentConfig.tsx`: Likely has a simple text input/textarea for the content. Our `AnimatedTextConfig.tsx` will have a similar input for the text to be animated.
    -   `ContentStepDisplay.tsx`: Renders the configured content. Our `AnimatedTextDisplay.tsx` will render the animated SVG.
    -   Both are passive completion steps (viewing completes them).

## 4. Implementation Roadmap

This plan follows the structure outlined in `docs/adding-new-step-type.md`.

### 4.1. Database Changes

1.  **Define Step Type Properties:**
    *   `name`: `animated_text` (snake_case)
    *   `label`: `Animated Text` (user-friendly)
    *   `description`: `Displays user-defined text with a drawing animation.`
    *   `requires_credentials`: `false`
2.  **Create Migration:**
    *   Run `npm run migrate create add_animated_text_step_type` (or similar, check `package.json`).
3.  **Add `step_types` Entry:**
    *   Edit the generated migration file. In the `up` function:
        ```javascript
        // Inside exports.up = async (pgm) => { ... }
        pgm.sql(\`
          INSERT INTO public.step_types (id, name, label, description, requires_credentials, updated_at, created_at)
          VALUES (gen_random_uuid(), 'animated_text', 'Animated Text', 'Displays user-defined text with a drawing animation.', false, NOW(), NOW());
        \`);
        ```
4.  **Run Migration:**
    *   `npm run migrate up`.

### 4.2. Backend Implementation (API Routes)

-   **Step Creation & Config Saving:** No changes are expected to be needed for `POST /api/wizards/[id]/steps` or `PUT /api/wizards/[id]/steps/[stepId]`. The generic handling of the `config.specific` JSONB object should suffice. The `specific` config will be simple, e.g., `{ "text": "Your animated sentence" }`.
-   **Step Completion Handling (`POST /api/user/wizards/[id]/steps/[stepId]/complete`):** No changes expected. This step is passive and doesn't produce `verified_data`.

### 4.3. Frontend Implementation - Admin Configuration

1.  **TypeScript Definition for Specific Config:**
    *   Create/update in `src/types/onboarding-steps.ts` (or a new relevant file):
        ```typescript
        export interface AnimatedTextSpecificConfig {
          text?: string | null;
          // Future considerations:
          // strokeColor?: string;
          // animationDuration?: number; // in seconds
          // fontFileName?: string; // if we support multiple bundled fonts
        }
        ```

2.  **Create `AnimatedTextConfig.tsx`:**
    *   **File:** `src/components/onboarding/steps/AnimatedTextConfig.tsx`.
    *   **Props:**
        ```typescript
        import { AnimatedTextSpecificConfig } from '@/types/onboarding-steps'; // Adjust path

        interface AnimatedTextConfigProps {
          initialData: AnimatedTextSpecificConfig;
          onChange: (config: AnimatedTextSpecificConfig) => void;
        }
        ```
    *   **UI:** A `Textarea` for the `text` property.
        ```tsx
        // Example using shadcn/ui
        import { Label } from "@/components/ui/label";
        import { Textarea } from "@/components/ui/textarea";
        import { useEffect, useState } from "react";

        const AnimatedTextConfig: React.FC<AnimatedTextConfigProps> = ({ initialData, onChange }) => {
          const [text, setText] = useState(initialData?.text ?? '');

          useEffect(() => {
            setText(initialData?.text ?? '');
          }, [initialData]);

          const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newText = event.target.value;
            setText(newText);
            onChange({ text: newText });
          };

          return (
            <div className="space-y-2">
              <Label htmlFor="animated-text-input">Text to Animate</Label>
              <Textarea
                id="animated-text-input"
                value={text}
                onChange={handleTextChange}
                placeholder="Enter the text you want to animate..."
                rows={3}
              />
              {/* Add inputs for other configs like strokeColor here if decided */}
            </div>
          );
        };
        export default AnimatedTextConfig;
        ```

3.  **Update `StepEditor.tsx`:**
    *   **File:** `src/components/onboarding/steps/StepEditor.tsx`.
    *   Import `AnimatedTextConfig`.
    *   Conditionally render it:
        ```jsx
        // ... other imports
        import AnimatedTextConfig from './AnimatedTextConfig'; // Check path
        import { AnimatedTextSpecificConfig } from '@/types/onboarding-steps'; // Check path

        // ... in the component
        {stepTypeInfo?.name === 'animated_text' && (
          <AccordionItem value="specific-config-animated_text">
            <AccordionTrigger>Animated Text Configuration</AccordionTrigger>
            <AccordionContent>
              <AnimatedTextConfig
                initialData={stepConfig.specific as AnimatedTextSpecificConfig}
                onChange={handleSpecificConfigChange}
              />
            </AccordionContent>
          </AccordionItem>
        )}
        ```

4.  **Enable Step Type in Admin Dropdown:**
    *   **File:** `src/components/onboarding/WizardStepEditorPage.tsx` (or wherever the step type selection is populated).
    *   Add `'animated_text'` to the list of enabled/selectable step types.

### 4.4. Frontend Implementation - User Display & Interaction

1.  **Install `opentype.js`:**
    *   `npm install opentype.js`
    *   `npm install --save-dev @types/opentype.js`

2.  **Add a Default Font:**
    *   Choose a suitable `.ttf` or `.woff` font. For example, "Inter" or a handwriting-style font.
    *   Place it in the `public/fonts/` directory (e.g., `public/fonts/MyHandwritingFont.woff`).

3.  **Create `AnimatedTextDisplay.tsx`:**
    *   **File:** `src/components/onboarding/steps/display/AnimatedTextDisplay.tsx`.
    *   **Props:**
        ```typescript
        import { UserStepProgress } from '@/types/onboarding-user'; // Adjust path
        import { AnimatedTextSpecificConfig } from '@/types/onboarding-steps'; // Adjust path
        // Potentially StepType definition if needed for other props

        interface AnimatedTextDisplayProps {
          step: UserStepProgress;
          // stepType: StepType; // If needed from StepDisplay.tsx
          onComplete: () => void; // verifiedData is not expected for this step type
        }
        ```
    *   **Core Logic:**
        ```tsx
        import React, { useEffect, useRef, useState } from 'react';
        import opentype from 'opentype.js'; // Ensure this import works

        // Helper to load font (can be moved to a utility)
        const loadFont = async (fontUrl: string): Promise<opentype.Font> => {
          return new Promise((resolve, reject) => {
            opentype.load(fontUrl, (err, font) => {
              if (err || !font) {
                reject(`Font could not be loaded: ${err}`);
              } else {
                resolve(font);
              }
            });
          });
        };

        const AnimatedTextDisplay: React.FC<AnimatedTextDisplayProps> = ({ step, onComplete }) => {
          const specificConfig = step.config?.specific as AnimatedTextSpecificConfig | undefined;
          const textToAnimate = specificConfig?.text || "Hello World"; // Default text
          const svgRef = useRef<SVGSVGElement>(null);
          const [pathData, setPathData] = useState<string | null>(null);
          const [viewBox, setViewBox] = useState<string>("0 0 500 100"); // Default, adjust dynamically

          useEffect(() => {
            if (!step.completed_at) {
              onComplete(); // Passive completion
            }
          }, [onComplete, step.completed_at]);

          useEffect(() => {
            let isMounted = true;
            const generatePath = async () => {
              try {
                // Path to your bundled font
                const font = await loadFont('/fonts/YourDefaultFontName.woff'); // Adjust path as needed
                const fontSize = 72; // Desired font size for path generation
                const x = 0; // Starting x position
                const y = fontSize; // Starting y position (baseline)
                
                const generatedPath = font.getPath(textToAnimate, x, y, fontSize);
                setPathData(generatedPath.toPathData(2)); // 2 decimal places precision

                // Calculate viewBox based on text bounds
                const GboundingBox = generatedPath.getBoundingBox();
                if (GboundingBox) {
                    const padding = 10; // Padding around the text
                    setViewBox(\`\${GboundingBox.x1 - padding} \${GboundingBox.y1 - padding} \${GboundingBox.x2 - GboundingBox.x1 + 2 * padding} \${GboundingBox.y2 - GboundingBox.y1 + 2 * padding}\`);
                }

              } catch (error) {
                console.error("Error generating text path:", error);
                // Fallback or error display for user
              }
            };

            if (textToAnimate) {
              generatePath();
            }
            return () => { isMounted = false; };
          }, [textToAnimate]);

          // CSS for animation (can be in a separate CSS module or styled-components)
          const animationStyleId = \`anim-path-\${step.id}\`;
          const pathStyleId = \`path-\${step.id}\`;

          return (
            <div className="animated-text-container" style={{ width: '100%', height: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {pathData ? (
                <>
                  <style dangerouslySetInnerHTML={{ __html: \`
                    #\${pathStyleId} {
                      stroke: #FFF; /* Configurable: specificConfig.strokeColor || '#FFF' */
                      stroke-width: 2; /* Configurable */
                      stroke-linecap: round;
                      stroke-linejoin: round;
                      fill: none;
                      stroke-dasharray: 0; /* JS will set this */
                      stroke-dashoffset: 0; /* JS will set this */
                    }
                    #\${pathStyleId}.animate {
                      animation: \${animationStyleId} 3s ease-out forwards; /* Configurable duration */
                    }
                    @keyframes \${animationStyleId} {
                      0% { stroke-dashoffset: /* JS set value */; }
                      100% { stroke-dashoffset: 0; }
                    }
                  \`}} />
                  <svg ref={svgRef} viewBox={viewBox} style={{ width: '80%', maxWidth: '600px', margin: 'auto' }}>
                    <path id={pathStyleId} d={pathData} />
                  </svg>
                </>
              ) : (
                <p>Loading animation...</p> // Or some placeholder
              )}
            </div>
          );
        };

        // useEffect in AnimatedTextDisplay to set up animation after path is rendered
        // This part needs to run client-side after the <path> element is in the DOM
        // Consider moving this logic into the main useEffect or a dedicated one for SVG manipulation
        useEffect(() => {
          if (pathData && svgRef.current) {
            const pathElement = svgRef.current.getElementById(pathStyleId) as SVGPathElement | null;
            if (pathElement) {
              const length = pathElement.getTotalLength();
              pathElement.style.strokeDasharray = length.toString();
              pathElement.style.strokeDashoffset = length.toString();
              
              // Force reflow/repaint before adding class for animation to start correctly
              // eslint-disable-next-line @typescript-eslint/no-unused-expressions
              pathElement.getBoundingClientRect(); 
              
              pathElement.classList.add('animate');
            }
          }
        }, [pathData, pathStyleId]);


        export default AnimatedTextDisplay;
        ```

4.  **Update `StepDisplay.tsx`:**
    *   **File:** `src/components/onboarding/steps/display/StepDisplay.tsx`.
    *   Import `AnimatedTextDisplay`.
    *   Add a case for it:
        ```javascript
        // ... other imports
        import AnimatedTextDisplay from './AnimatedTextDisplay'; // Check path

        // ... in switch statement
        case 'animated_text':
          stepContentElement = <AnimatedTextDisplay step={step} onComplete={onComplete} /* pass stepType if needed by AnimatedTextDisplay */ />;
          break;
        ```

### 4.5. Testing

-   Test admin configuration:
    -   Can you select "Animated Text" type?
    -   Can you input text and save?
    -   Does it save correctly and reload?
-   Test user display:
    -   Does the text animate as expected?
    -   Does it complete the step?
    -   Test with various string lengths and characters.
    -   Responsiveness and scaling of the SVG.

## 5. Future Enhancements

-   Configuration for stroke color, width, animation duration.
-   Selection from a list of pre-approved/bundled fonts.
-   More robust error handling for font loading or path generation.
-   Consider performance for very long texts.

This document provides a starting point for the research and implementation. Further details will emerge during development. 