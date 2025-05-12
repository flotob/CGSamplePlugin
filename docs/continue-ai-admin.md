# Wizard Admin Service and AI Tool Implementation - Continuation Plan

## Project Context
We're working on a platform for communities that features an onboarding wizard system. Each wizard consists of ordered steps that users complete. Our current task is implementing backend service functions and AI tools to allow an admin assistant to programmatically manage these wizards and steps.

## System Architecture Overview
- **Database**: PostgreSQL with tables for `onboarding_wizards`, `onboarding_steps`, etc.
- **Backend**: Next.js API routes in `/src/app/api/` that handle CRUD operations
- **Services Layer**: Recently added `/src/lib/services/wizardAdminService.ts` to encapsulate database operations
- **AI Assistant**: Admin AI chat functionality in `/src/app/api/admin/ai-assistant/chat/route.ts` with tools that call service functions

## Progress So Far
We've already implemented several key components:

1. **Service Functions in `wizardAdminService.ts`**:
   - `createWizardInService` - Creates a new wizard
   - `addStepToWizardService` - Adds a step to a wizard
   - `listWizardsService` - Lists wizards for a community
   - `getWizardDetailsService` - Gets details for a specific wizard
   - `getWizardStepsService` - Gets steps for a specific wizard
   - `updateWizardDetailsService` - Updates a wizard's details
   - `updateStepInWizardService` - Updates a step's details (just added)

2. **AI Tools in `admin/ai-assistant/chat/route.ts`**:
   - `createWizard` - Creates a new wizard
   - `addWizardStep` - Adds a step to a wizard
   - `getAvailableStepTypes` - Gets all step types
   - `getWizardsList` - Lists wizards
   - `getWizardDetailsAndSteps` - Gets details and steps for a wizard
   - `updateWizardDetails` - Updates a wizard
   - `updateWizardStepDetails` - Updates a step (just added)

Each service function has corresponding types and error classes, and each AI tool has a Zod schema for parameter validation and an execute function.

## Current Task
We're systematically adding service functions and AI tools for all wizard and step operations. We just completed:

- **`updateStepInWizardService`**: Function that updates a step, including ENS domain validation if needed
- **`updateWizardStepDetails`**: AI tool that calls this service function

## Next Tasks
We need to implement:

1. **`deleteStepFromWizardService`**:
   - Based on the `DELETE` handler in `/src/app/api/wizards/[id]/steps/[stepId]/route.ts`
   - Should accept `wizardId` and `stepId`
   - Return the deleted step or throw if not found

2. **`deleteWizardStep`** AI tool:
   - Add to tools object in `/src/app/api/admin/ai-assistant/chat/route.ts`
   - Accept `wizardId` and `stepId` parameters
   - Call `deleteStepFromWizardService`
   - Return success/error messages

3. **`reorderStepsInWizardService`**:
   - Based on the `PUT` handler in `/src/app/api/wizards/[id]/steps/reorder/route.ts`
   - Accept `wizardId` and `stepIdsInOrder` array
   - Update step_order for each step
   - Return success or throw if invalid

4. **`reorderWizardSteps`** AI tool:
   - Add to tools object
   - Accept `wizardId` and `stepIdsInOrder` parameters
   - Call `reorderStepsInWizardService`
   - Return success/error messages

## Implementation Details
For each service function:
- Extract business logic from the corresponding API route
- Add appropriate types for payloads and return values
- Add error handling and validation
- Keep validation of ENS domains if applicable

For each AI tool:
- Define clear description and parameters with Zod
- Implement execute function that calls the service
- Add error handling and logging
- Ensure proper return values for AI interaction

## Database Schema Context
Key tables involved:
- `onboarding_wizards` - Stores wizard metadata (name, description, etc.)
- `onboarding_steps` - Stores step data (type, order, config, etc.)
- `step_types` - Available step types (content, quiz, etc.)

## Additional Notes
- ENS domain validation is handled by `validateEnsDomainOrPattern` in `src/lib/validationUtils.ts`
- Service functions don't handle quota checks - that's done at the API layer
- We're creating custom error classes for specific error scenarios
- The existing code follows a pattern of dynamic SQL construction for updates

The implementation should follow existing patterns and naming conventions to ensure consistency with the current codebase.


Based on our roadmap, we've made substantial progress implementing both the service functions and their corresponding AI tool function calls. Here's what we've accomplished and what's left:

## Completed

### Service Functions:
1. ✅ `createWizardInService` - Create a new wizard 
2. ✅ `addStepToWizardService` - Add a step to a wizard
3. ✅ `listWizardsService` - List wizards for a community
4. ✅ `getWizardDetailsService` - Get details for a specific wizard
5. ✅ `getWizardStepsService` - Get steps for a specific wizard
6. ✅ `updateWizardDetailsService` - Update a wizard's details
7. ✅ `updateStepInWizardService` - Update a step's details

### AI Tools (Function Calls):
1. ✅ `createWizard` - Create a new wizard
2. ✅ `addWizardStep` - Add a step to a wizard
3. ✅ `getAvailableStepTypes` - Get all step types
4. ✅ `getWizardsList` - List wizards 
5. ✅ `getWizardDetailsAndSteps` - Get details and steps for a wizard
6. ✅ `updateWizardDetails` - Update a wizard
7. ✅ `updateWizardStepDetails` - Update a step

## Remaining to Implement

### Service Functions:
1. 🔲 `deleteStepFromWizardService` - Delete a step from a wizard
   - Based on `DELETE` handler in `/src/app/api/wizards/[id]/steps/[stepId]/route.ts`

2. 🔲 `reorderStepsInWizardService` - Reorder steps in a wizard
   - Based on `PUT` handler in `/src/app/api/wizards/[id]/steps/reorder/route.ts`

### AI Tools (Function Calls):
1. 🔲 `deleteWizardStep` - Delete a step from a wizard
   - Will call `deleteStepFromWizardService`

2. 🔲 `reorderWizardSteps` - Reorder steps in a wizard
   - Will call `reorderStepsInWizardService`

These four remaining components will complete our roadmap for providing comprehensive programmatic control over wizards and their steps through the admin AI assistant.

Would you like me to continue with implementing the `deleteStepFromWizardService` and its corresponding AI tool next?
