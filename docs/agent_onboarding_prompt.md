# Onboarding Prompt for AI Agent: CGSamplePlugin Project

Welcome! You are joining the `CGSamplePlugin` project. This document provides the context you need to get started. Assume you have access to the full codebase but no prior knowledge.

## 1. High-Level Goal

This project is a configurable **onboarding wizard system** designed as a plugin for the main "Common Ground" platform. Its primary purpose is to allow community administrators (admins) to create step-by-step flows (called "Wizards") to guide end-users through various processes like:

*   Verifying credentials (e.g., ENS names via wallet connection).
*   Consuming informational content (e.g., text, images, Markdown).
*   (Future) Answering questionnaires.
*   Potentially earning community roles upon successful completion.

End-users experience these wizards typically within a modal slideshow interface.

## 2. Core Concepts

Understanding these concepts (many map to database tables) is crucial:

*   **Wizards (`onboarding_wizards`):** Top-level flow container, tied to a community.
*   **Steps (`onboarding_steps`):** Ordered units within a wizard. Have type, order, mandatory/active status, and a flexible `config` (JSONB) field storing presentation and type-specific settings.
*   **Step Types (`step_types`):** Defines the *kind* of step (e.g., 'content', 'ens'). Determines the required `config.specific` structure and the component used for display/interaction.
*   **Configuration (`step.config` JSONB):** Stores all settings for a step, split into:
    *   `config.presentation`: Common display settings (headline, subtitle, background).
    *   `config.specific`: Settings unique to the `stepType` (e.g., Markdown content, ENS parameters).
*   **Background Configuration (`step.config.presentation`):**
    *   `backgroundType`: (`'image'`, `'color'`, `'gradient'`, `'youtube'`, or `null`).
    *   `backgroundValue`: Stores the relevant value (URL string for image/youtube, hex string for color, `GradientValue` object for gradient).
*   **User Progress (`user_wizard_progress`, `user_wizard_sessions`, `user_wizard_completions`):** Tracks user interaction and completion status.
*   **Generated Images (`generated_images`):** Stores metadata about AI-generated images for step backgrounds.
*   **Communities, Plans, Quotas:** The system supports different subscription plans (`plans`, `plan_limits`) limiting feature usage (e.g., image generations via `usage_events`).

## 3. Tech Stack

*   **Framework:** Next.js 15 (App Router), React 19, TypeScript
*   **UI:** Tailwind CSS, shadcn/ui components
*   **State Management/Data Fetching:** TanStack Query (React Query) v5 (`useQuery`, `useMutation`), React Context (`AuthContext`, `CgLibContext`)
*   **Backend:** Next.js API Routes (`src/app/api/`)
*   **Database:** PostgreSQL
*   **Migrations:** `node-pg-migrate`
*   **Authentication:** Custom JWT-based system.
*   **Key Libraries:** `@common-ground-dao/cg-plugin-lib`, `react-colorful`, `react-youtube` (for user view), `jsonwebtoken`, `dnd-kit`, `react-markdown`, `openai`.
*   **Dev Environment:** Docker (`docker-compose.yml`) for PostgreSQL.

## 4. Codebase Structure & Key Files/Dirs

*   **`README.md`:** **Start here.** Provides project overview, setup, key features.
*   **`package.json`:** Dependencies and scripts (`dev`, `build`, `migrate`).
*   **`docs/`:** Contains important documentation:
    *   `current-db-schema.db`: Reference SQL schema.
    *   `ai_image_library_feature.md`: Spec for the image library feature.
    *   `gradient_background_feature_spec.md`: Spec outlining gradient implementation plan/challenges.
    *   `step_editor_refactoring_spec.md`: Plan for refactoring the main editor component.
    *   `user_background_display_spec.md`: Plan for implementing user-facing backgrounds.
*   **`src/`:** Main application code.
    *   **`app/`:** Next.js App Router structure.
        *   `layout.tsx`, `page.tsx`: Root layout/page.
        *   `api/`: Backend API routes (organized by function: `admin`, `user`, `auth`, `stripe`, etc.).
    *   **`components/`:** Reusable UI components.
        *   `ui/`: Components added via shadcn/ui CLI.
        *   `onboarding/`: Components specific to the wizard feature.
            *   `steps/`: Components related to individual step types (config editors, displays).
                *   `display/`: User-facing step renderers (e.g., `StepDisplay.tsx`, `ContentStepDisplay.tsx`).
            *   `WizardSlideshowModal.tsx`: User-facing modal.
            *   `WizardStepEditorPage.tsx`: Admin page for editing wizards.
            *   `StepEditor.tsx`: **(Complex)** Admin component for editing a single step's configuration.
            *   `ImageLibraryModal.tsx`: Modal for selecting/generating background images.
        *   `color-picker.tsx`: Reusable color picker using `react-colorful`.
    *   **`hooks/`:** Custom React Query hooks for data fetching and mutations (e.g., `useStepsQuery`, `useUserWizardStepsQuery`, `useGenerateAndSaveImageMutation`).
    *   **`lib/`:** Utility functions, constants, non-UI logic.
        *   `db.ts`: PostgreSQL connection/query helper.
        *   `authFetch.ts`: Authenticated fetch wrapper for frontend.
        *   `withAuth.ts`: Backend middleware for API route authentication/authorization.
        *   `quotas.ts`: Quota checking and usage logging logic.
        *   `storage.ts`: S3 interaction for image uploads.
        *   `utils.ts`: General utilities (like `cn`, `extractYouTubeVideoId`).
    *   **`context/`:** React context providers (`AuthContext`, `CgLibContext`).
    *   **`types/`:** Shared TypeScript type definitions.
*   **`migrations/`:** Database migration files managed by `node-pg-migrate`.
*   **`.env` / `.env.example`:** Environment variable configuration.
*   **`docker-compose.yml`:** Docker setup for local PostgreSQL database.

## 5. Key Architectural Patterns & Data Flow

1.  **Plugin Context:** Frontend uses `@common-ground-dao/cg-plugin-lib` (`useCgLib` context) to get initial user/community info from the host app.
2.  **Authentication:**
    *   Frontend requests a JWT from `/api/auth/session`.
    *   Frontend stores JWT (likely via `AuthContext`).
    *   Frontend API calls use `useAuthFetch` hook, which automatically adds the `Authorization: Bearer <token>` header.
    *   Backend API routes are wrapped with `withAuth` middleware, which verifies the JWT and attaches user info (`req.user`) to the request.
3.  **Data Fetching (Frontend):** Primarily uses TanStack Query hooks defined in `src/hooks/`. These hooks typically use `useAuthFetch` internally.
4.  **Data Modification (Frontend):** Uses TanStack Query `useMutation` hooks, which also use `useAuthFetch` to call backend API routes.
5.  **Backend Logic:** API routes (`src/app/api/`) handle requests, interact with the database (`src/lib/db.ts`), call external services (OpenAI, S3 via `src/lib/storage.ts`), enforce quotas (`src/lib/quotas.ts`), and return responses.
6.  **Configuration:** Step configuration is stored flexibly in the `config` JSONB column (`onboarding_steps` table), typically structured as `{ presentation: {...}, specific: {...} }`.

## 6. Getting Started Locally

Refer to the `README.md` for detailed steps, but generally:

1.  Ensure Docker is running.
2.  Run `docker-compose up -d` to start the PostgreSQL database.
3.  Create a `.env` file (copy from `.env.example`) and fill in required variables (especially `DATABASE_URL`, `JWT_SECRET`, potentially OpenAI/S3 keys).
4.  Install dependencies: `npm install`.
5.  Run database migrations: `npm run migrate up`.
6.  Start the development server: `npm run dev`.
7.  Access the plugin via the Common Ground host application (using ngrok for local testing - see `README.md`).

## 7. Recent Feature Development (Your Current Focus Area)

Significant work was just completed on adding customizable backgrounds for wizard steps:

*   **Admin Configuration (`StepEditor.tsx`):**
    *   A "Background" accordion section was added.
    *   It uses `Tabs` for different background types: "Image", "Solid Color", "Gradient" (placeholder), "YouTube".
    *   **Image Tab:** Allows admins to open the `ImageLibraryModal` to generate images via AI (DALL-E 3) or select existing generated images (own or public). Also shows previews of the 3 most recent images for quick selection.
    *   **Solid Color Tab:** Uses the `ColorPicker` component (`react-colorful` based) to select a hex color.
    *   **YouTube Tab:** Allows pasting a YouTube URL, validates it, extracts the video ID, and shows an `iframe` preview.
    *   The `step.config.presentation.backgroundType` and `step.config.presentation.backgroundValue` fields are updated based on the selected tab and input.
*   **AI Image Library (`ImageLibraryModal.tsx`):**
    *   Handles structured prompt input (subject, style, mood).
    *   Calls backend API (`/api/admin/steps/generate-background`) via `useGenerateAndSaveImageMutation`.
    *   Backend generates image via OpenAI, uploads to S3 (`src/lib/storage.ts`), saves metadata to `generated_images` table, logs usage (`src/lib/quotas.ts`).
    *   Displays user's own generated images (`useAdminImagesQuery` -> `/api/admin/images?scope=mine`).
    *   Displays community public images (`useAdminImagesQuery` -> `/api/admin/images?scope=public`).
    *   Allows toggling image public status (`useToggleImagePublicMutation` -> `/api/admin/images/[imageId]/toggle-public`).
*   **User Display (`StepDisplay.tsx`):**
    *   Reads `backgroundType` and `backgroundValue` from the step config.
    *   Applies appropriate CSS styles (`background-image`, `background-color`, `linear-gradient`) to a container div.
    *   Logic for rendering YouTube backgrounds using `react-youtube` is planned but **not yet implemented**.
    *   Layout adjustments were made to achieve an edge-to-edge background effect within the modal's content area.

## 8. Current Status & Known Issues/Next Steps

*   The Image, Solid Color, and basic Gradient/YouTube background configurations in the `StepEditor` are functional.
*   The Image, Solid Color, and Gradient backgrounds render correctly edge-to-edge for the end-user in `StepDisplay`.
*   **Gradient Implementation Deferred:** Attempts to implement a combined "Color / Gradient" tab in `StepEditor` encountered complex state management issues. The implementation was reverted to keep them separate for now. See `docs/gradient_background_feature_spec.md` for details and a recommended approach if revisiting.
*   **`StepEditor.tsx` Complexity:** This component is overly large and complex. Refactoring is needed. See `docs/step_editor_refactoring_spec.md` for a detailed plan.
*   **Next Immediate Task:** Implement the **YouTube background display** in `src/components/onboarding/steps/display/StepDisplay.tsx` using the `react-youtube` package, following the plan in `docs/user_background_display_spec.md`.

## 9. General Advice

*   **Read the Docs:** Start with `README.md` and then review the `.md` files in the `docs/` directory for specific features/plans.
*   **Incremental Changes:** Make small, focused changes and test frequently.
*   **Use Dev Tools:** Check console logs and inspect elements to debug UI and state issues.
*   **Understand State Flow:** Pay close attention to how state is managed (React Query for server state, `useState`/`useEffect` for local state) and how data flows between parent/child components and frontend/backend.
*   **Ask Questions:** If anything is unclear, ask for clarification.

Good luck! 