# Roadmap: Sidequests End-User UI Implementation

This document outlines the steps to implement the user-facing UI for the Sidequests feature within the `WizardSlideshowModal.tsx`.

## Phase 1: Core Display Components & Integration

### 1.1. Design & Create `SidequestPlaylistItemCard.tsx`
   - **Goal:** A visually appealing, compact card to display a single sidequest in the playlist.
   - **Props:** 
     ```typescript
     interface SidequestPlaylistItemCardProps {
       sidequest: Sidequest; // Global sidequest type
       onOpenSidequest: (sidequest: Sidequest) => void;
     }
     ```
   - **Display:**
     - Thumbnail (from `sidequest.image_url` if available, otherwise a suitable type-specific placeholder icon will be chosen, e.g., from `lucide-react`).
     - Title (`sidequest.title`, truncated if necessary).
     - Sidequest type icon (YouTube, Link, Markdown) for quick identification.
   - **Styling:** Should blend with the `WizardSlideshowModal` theme. Card-like appearance, clear hover/focus states.
   - **Action:** Clicking the entire card triggers `props.onOpenSidequest(props.sidequest)`.

### 1.2. Design & Create `SidequestPlaylist.tsx`
   - **Goal:** A container for `SidequestPlaylistItemCard`s, displayed as a vertical panel.
   - **Props:**
     ```typescript
     interface SidequestPlaylistProps {
       sidequests: Sidequest[] | null;
       currentStepId: string; // For context if needed
       onOpenSidequest: (sidequest: Sidequest) => void;
     }
     ```
   - **Layout & Styling:**
     - Vertical panel, positioned on the right side of `WizardSlideshowModal.tsx` content area.
     - Always visible if sidequests are present for the current step.
     - It should hover/overlay the step background, not offset main content (i.e., not a traditional sidebar that resizes the main content area).
     - It will have a maximum height (e.g., constrained by the modal's content area height or a specific CSS `max-height`) and scroll independently if its content overflows.
     - Consider a subtle background or border to distinguish it from the step's main background if needed, but aim for a light, integrated feel.
   - **Content:** Maps over `props.sidequests` and renders a `SidequestPlaylistItemCard` for each.
   - **Empty State:** Displays a message like "No sidequests for this step" if `props.sidequests` is empty or null (though this component might not render at all if sidequests are null/empty, handled by parent).

### 1.3. Integrate `SidequestPlaylist.tsx` into `WizardSlideshowModal.tsx`
   - **Goal:** Display the sidequest playlist alongside the current step content.
   - **Location:** `WizardSlideshowModal.tsx`.
   - **Data Source:** The `useUserWizardStepsQuery` hook already provides `currentStep.sidequests: Sidequest[] | null`.
   - **Logic:**
     - Conditionally render `SidequestPlaylist` only if `currentStep.sidequests` is not null and has items.
     - Pass `currentStep.sidequests` and `currentStep.id` to `SidequestPlaylist`.
     - Implement the `handleOpenSidequest(sidequest: Sidequest)` callback function within `WizardSlideshowModal`.

## Phase 2: Interaction Modals & Content Display

This phase focuses on what happens when a user clicks a sidequest item in the playlist.

### 2.1. State Management in `WizardSlideshowModal.tsx` for Active Sidequest
   - **Goal:** Manage which sidequest (if any) is currently being viewed by the user.
   - **State:** 
     ```typescript
     const [activeSidequest, setActiveSidequest] = useState<Sidequest | null>(null);
     ```
   - **`handleOpenSidequest` function (from 1.3):** Will set `setActiveSidequest(sidequest)`.
   - **Closing Modals/Previews:** The interaction modals (YouTube, Markdown) or the link preview display will need a way to call `setActiveSidequest(null)` when they are closed or a link is opened.

### 2.2. YouTube Video Display (`YouTubeViewerModal.tsx` - New or Adapted)
   - **Goal:** Display YouTube sidequests in an in-app modal using `react-youtube`.
   - **Trigger:** When `activeSidequest` is set and its `sidequest_type` is `'youtube'`. The `content_payload` is the YouTube URL.
   - **Component (`YouTubeViewerModal.tsx`):
     - **Props:** `isOpen: boolean`, `onClose: () => void`, `videoUrl: string`, `title?: string`.
     - **Content:** Uses `<YouTube videoId={extractYouTubeVideoId(videoUrl)} opts={...} />` (ensure `extractYouTubeVideoId` is available or implemented).
     - **Styling:** Clean modal overlay.
   - **Integration:** `WizardSlideshowModal` renders this modal conditionally based on `activeSidequest`.
   - **Future (Tracking - Phase 4):** Integrate watch progress tracking as per `docs/youtube-data.md`.

### 2.3. Markdown Content Display (`MarkdownViewerModal.tsx` - New or Adapted)
   - **Goal:** Display Markdown sidequests in an in-app modal.
   - **Trigger:** When `activeSidequest` is set and its `sidequest_type` is `'markdown'`. The `content_payload` is the Markdown string.
   - **Component (`MarkdownViewerModal.tsx`):
     - **Props:** `isOpen: boolean`, `onClose: () => void`, `markdownContent: string`, `title?: string`.
     - **Content:** Uses `<ReactMarkdown remarkPlugins={[remarkGfm]} ...>` for rendering. Ensure proper sanitization.
     - **Styling:** Clean, scrollable modal for potentially long content.
   - **Integration:** `WizardSlideshowModal` renders this modal conditionally.
   - **Future (Tracking - Phase 4):** Implement scroll-depth and time-on-page tracking.

### 2.4. External Link Preview & Navigation
   - **Goal:** Display a preview for external link sidequests and provide a button to open the link in a new tab using the plugin library's navigation function.
   - **Trigger:** When `activeSidequest` is set and its `sidequest_type` is `'link'`. The `content_payload` is the external URL.
   - **Display (MVP - Option A):** Render an inline preview area or a small, non-blocking modal within `WizardSlideshowModal` when an external link sidequest is `activeSidequest`.
     - Show the sidequest's own stored `activeSidequest.title`.
     - Show `activeSidequest.description` (if available).
     - Show `activeSidequest.image_url` as a preview image.
     - Prominent Call to Action (CTA) Button: "Open Link" or "Read Full Article".
   - **Action (CTA Button Click):**
     - Use `cgInstance.host.navigateTo(activeSidequest.content_payload, { target: 'blank' })` (confirm `cgInstance` availability via `useCgLib()`).
     - After initiating navigation, call `setActiveSidequest(null)` to dismiss the preview/modal.
   - **Future Enhancement (Option B):** Consider fetching rich preview metadata (oEmbed/OpenGraph) from the `content_payload` URL via a backend helper to create a more dynamic preview card.

## Phase 3: UI/UX Polish & Refinements

- **Visual Consistency:** Ensure the sidequest playlist and modals seamlessly integrate with the `WizardSlideshowModal`'s existing design.
- **Responsiveness:** Test and ensure the playlist and modals look good on various screen sizes where the wizard might be displayed.
- **Accessibility:** Add ARIA attributes, ensure keyboard navigability for the playlist and interaction modals.
- **Transitions/Animations:** Consider subtle animations for opening/closing the playlist (if toggleable) or modals.
- **Error Handling:** Gracefully handle cases where a YouTube video ID is invalid or Markdown content fails to render (though less likely).

## Phase 4: Advanced Features (Future - Out of Scope for Initial User UI)

- **Watch/Read Progress Tracking:** Implement detailed tracking for YouTube (percentage watched) and Markdown (scroll percentage, time spent).
- **User State:** Persist which sidequests a user has interacted with or "completed."
- **Visual Indicators:** Show checkmarks or progress bars on `SidequestPlaylistItemCard`s for viewed/partially viewed content.

This roadmap provides a structured approach to building out the user-facing side of the Sidequests feature.
