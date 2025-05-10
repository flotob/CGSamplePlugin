export interface Sidequest {
  id: string; // uuid
  onboarding_step_id: string; // uuid
  title: string;
  description: string | null;
  image_url: string | null;
  sidequest_type: 'youtube' | 'link' | 'markdown';
  content_payload: string;
  display_order: number;
  created_at: string; // timestamptz (ISO string format)
  updated_at: string; // timestamptz (ISO string format)
} 