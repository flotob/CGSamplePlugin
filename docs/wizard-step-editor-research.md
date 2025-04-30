# Onboarding Wizard Step Editor: PowerPoint-Style UI Research

## Vision
Build a rich, intuitive, and visually engaging step editor for onboarding wizards, inspired by Microsoft PowerPoint and Keynote. Admins can:
- See all steps/slides in a vertical sidebar (with thumbnails/previews)
- Add, remove, and reorder steps
- Select a step to edit its content and design in a main area
- Design beautiful backgrounds, add text, images, and configure step logic
- Preview the onboarding flow as end-users will see it

---

## UI/UX Concepts

### 1. **Vertical Step/Slide Pane (Left Sidebar)**
- Shows all steps as visual thumbnails (mini-previews)
- Click to select a step for editing
- Drag-and-drop to reorder steps
- Buttons to add (+) or delete steps
- Step type icons (e.g., question, verification, info, etc.)
- Step titles/names for quick identification

### 2. **Main Content Area (Step Editor)**
- Shows the currently selected step in full size
- Editable fields for:
  - Step title
  - Step description/instructions
  - Step type (dropdown: info, multiple choice, ENS, etc.)
  - Step-specific config (e.g., choices, validation, etc.)
- Rich design tools:
  - Background color/image picker
  - Text formatting (font, size, color, alignment)
  - Add images, icons, or other media
  - Layout controls (positioning, spacing)
- Live preview of the step as it will appear to users

### 3. **Toolbar/Actions (Top or Floating)**
- Save, undo/redo, preview, and publish buttons
- Step navigation (next/previous)
- Option to duplicate steps

### 4. **Extensibility**
- Support for new step types (custom plugins/components)
- Theming and branding controls
- Responsive/mobile preview

---

## Technical Considerations
- Use React state or a state management library (Zustand, Redux, etc.) for step list and active step
- Drag-and-drop library for reordering (e.g., dnd-kit, react-beautiful-dnd)
- Canvas or rich text editor for main content (e.g., Slate, Lexical, or custom)
- Modular step type components for different step logic
- API endpoints for CRUD on steps (already planned)
- Optimistic UI updates for smooth experience
- Accessibility: keyboard navigation, screen reader support

---

## Open Questions
- How much design freedom? (Full WYSIWYG, or just structured fields + backgrounds?)
- Should admins be able to preview the entire flow as a user?
- How to handle step branching/logic (e.g., conditional next steps)?
- How to support collaborative editing (future)?

---

## Next Steps
1. Design wireframes/mockups for the editor UI
2. Choose libraries for drag-and-drop and rich editing
3. Define the step data model for rich content
4. Plan the API for step CRUD and ordering
5. Build a vertical step pane and basic step editor as MVP 

---

## MVP Implementation Plan

### Goals
- Deliver a working onboarding step editor with a PowerPoint-style layout.
- Focus on core CRUD, navigation, and editing. Defer advanced design and drag-and-drop.

### MVP Features
1. **Vertical Step/Slide Pane (Sidebar)**
   - List all steps for the selected wizard (step order, title/type shown)
   - Click to select a step for editing
   - Add new step (appends to end)
   - Delete step
   - (Optional: simple highlight for active step)

2. **Main Content Area (Step Editor)**
   - Show selected step's fields: title, description, type (dropdown)
   - Editable inputs for these fields
   - Save changes to backend (update step)
   - (Optional: show step config fields for type)

3. **Data Flow & State**
   - Fetch all steps for the selected wizard on load
   - Local state for active step selection
   - React Query for fetching and mutating steps
   - Optimistic UI for add/delete/update

4. **Backend API**
   - CRUD endpoints for steps (already planned in roadmap)
   - Ensure endpoints support: list steps, create step, update step, delete step

5. **UI/UX**
   - Clean, two-column layout (sidebar + main area)
   - Simple, accessible controls (add, delete, select, edit)
   - Loading and error states

---

### Work Packages

1. **API: Step CRUD Endpoints**
   - Implement GET, POST, PUT, DELETE for onboarding steps
   - Ensure endpoints are protected and scoped to wizard/community

2. **Frontend: Step Data Hooks**
   - Create React Query hooks for fetching, creating, updating, deleting steps
   - Define step type/interface for TypeScript

3. **Sidebar: Step List Component**
   - List steps with title/type
   - Add/select/delete step controls
   - Highlight active step

4. **Main Area: Step Editor Component**
   - Show/edit fields for selected step
   - Save changes (update step)
   - (Optional: show config fields based on type)

5. **Integration: Step Editor Page/View**
   - Layout: sidebar + main area
   - Wire up data hooks and components
   - Handle loading, error, and empty states

6. **Polish & Testing**
   - Optimistic updates, error handling
   - Accessibility review
   - Basic styling and responsive tweaks

---

### Stretch Goals (Post-MVP)
- Drag-and-drop reordering
- Step thumbnails/previews
- Rich design tools (backgrounds, images, formatting)
- Live preview mode
- Step branching/logic
- Collaborative editing 