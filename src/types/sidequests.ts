export interface Sidequest {
  id: string; // uuid, PK
  title: string;
  description: string | null;
  image_url: string | null;
  sidequest_type: 'youtube' | 'link' | 'markdown';
  content_payload: string;
  creator_user_id: string;
  community_id: string;
  is_public: boolean;
  created_at: string; // timestamptz (ISO string format)
  updated_at: string; // timestamptz (ISO string format)
}

// Represents a Sidequest linked to a Step with its contextual data
export interface AttachedSidequest extends Sidequest {
  attachment_id: string; // uuid, PK of the onboarding_step_sidequests junction table record
  // onboarding_step_id is implicitly known from context or can be added if needed from oss.onboarding_step_id
  display_order: number;      // Its order within that specific step
  attached_at: string;        // timestamptz (ISO string format)
}

// --- Payload Types for Global Library Admin APIs ---

// For POST /api/admin/library/sidequests (Create Global Sidequest)
export interface CreateGlobalSidequestPayload {
  title: string;
  description?: string | null;
  image_url?: string | null;
  sidequest_type: 'youtube' | 'link' | 'markdown';
  content_payload: string;
  is_public?: boolean; // Defaults to false on backend
}

// For PUT /api/admin/library/sidequests/{sidequestId} (Update Global Sidequest)
export interface UpdateGlobalSidequestPayload {
  title?: string;
  description?: string | null;
  image_url?: string | null;
  sidequest_type?: 'youtube' | 'link' | 'markdown';
  content_payload?: string;
  is_public?: boolean;
}

// --- Payload/Response Types for Step-Specific (Attachment) Admin APIs ---

// For POST /api/admin/steps/{stepId}/sidequests (Attach Sidequest to Step)
export interface AttachSidequestToStepPayload {
  sidequest_id: string; // ID of the global sidequest to attach
  display_order?: number; // Optional, backend can determine if not provided
}

// For POST /api/admin/steps/{stepId}/sidequests/reorder (Reorder Attached Sidequests)
export interface ReorderAttachedSidequestItem {
  attachment_id: string; // PK of the junction table record, or sidequest_id if preferred by API design
  display_order: number;
}
export interface ReorderAttachedSidequestsPayload extends Array<ReorderAttachedSidequestItem> {}

// Response type for attaching a sidequest (returns the junction table record details)
export interface AttachSidequestResponse {
    id: string; // This is the attachment_id (PK of onboarding_step_sidequests)
    onboarding_step_id: string;
    sidequest_id: string;
    display_order: number;
    attached_at: string;
} 