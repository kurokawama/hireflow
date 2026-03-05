// Content strategy and calendar types — matches Supabase schema

export type CalendarStatus =
  | "draft"
  | "approved"
  | "in_progress"
  | "completed";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type ContentType = "text" | "image" | "video_script";

export interface CalendarEntry {
  day: string; // ISO date
  platform: string;
  content_type: ContentType;
  topic: string;
  target_persona: string;
  priority: "high" | "medium" | "low";
}

export interface ContentCalendar {
  id: string;
  org_id: string;
  week_start: string;
  target_list_id: string | null;
  strategy_text: string | null;
  calendar_json: CalendarEntry[];
  status: CalendarStatus;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentTask {
  id: string;
  org_id: string;
  calendar_id: string;
  content_id: string | null;
  title: string;
  description: string | null;
  platform: string;
  content_type: ContentType;
  due_date: string | null;
  assignee_id: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

// DTO types for API
export interface GenerateStrategyRequest {
  target_list_id: string;
  week_start: string; // ISO date
}

export interface AIStrategyResponse {
  strategy_text: string;
  calendar_entries: CalendarEntry[];
}

export interface CreateTasksRequest {
  calendar_id: string;
}

export interface UpdateCalendarRequest {
  status?: CalendarStatus;
  approved_by?: string;
}
