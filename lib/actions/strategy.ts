"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type {
  ContentCalendar,
  ContentTask,
  CalendarEntry,
} from "@/types/strategy";

// ============================================================
// Content Calendar
// ============================================================

export async function getCalendars(): Promise<ContentCalendar[]> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("org_id", authUser.member.org_id)
    .order("week_start", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data || []) as ContentCalendar[];
}

export async function getCalendar(
  id: string
): Promise<ContentCalendar | null> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("id", id)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (error) return null;
  return data as ContentCalendar;
}

export async function createCalendar(input: {
  week_start: string;
  target_list_id: string | null;
  strategy_text: string;
  calendar_json: CalendarEntry[];
}): Promise<ContentCalendar> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("content_calendar")
    .insert({
      org_id: authUser.member.org_id,
      week_start: input.week_start,
      target_list_id: input.target_list_id,
      strategy_text: input.strategy_text,
      calendar_json: input.calendar_json,
      status: "draft",
      created_by: authUser.userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ContentCalendar;
}

export async function approveCalendar(id: string): Promise<ContentCalendar> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("content_calendar")
    .update({
      status: "approved",
      approved_by: authUser.userId,
    })
    .eq("id", id)
    .eq("org_id", authUser.member.org_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ContentCalendar;
}

export async function updateCalendarStatus(
  id: string,
  status: string
): Promise<ContentCalendar> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("content_calendar")
    .update({ status })
    .eq("id", id)
    .eq("org_id", authUser.member.org_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ContentCalendar;
}

// ============================================================
// Content Tasks
// ============================================================

export async function getCalendarTasks(
  calendarId: string
): Promise<ContentTask[]> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("content_tasks")
    .select("*")
    .eq("calendar_id", calendarId)
    .eq("org_id", authUser.member.org_id)
    .order("due_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as ContentTask[];
}

export async function createTasksFromCalendar(
  calendarId: string
): Promise<ContentTask[]> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  // Get the calendar
  const { data: calendar } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("id", calendarId)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (!calendar) throw new Error("Calendar not found");

  const entries = (calendar.calendar_json || []) as CalendarEntry[];
  const tasks = entries.map((entry) => ({
    org_id: authUser.member.org_id,
    calendar_id: calendarId,
    title: `${entry.platform} - ${entry.topic}`,
    description: `${entry.target_persona} 向け ${entry.content_type} コンテンツ`,
    platform: entry.platform,
    content_type: entry.content_type,
    due_date: entry.day,
    status: "pending",
  }));

  if (tasks.length === 0) return [];

  const { data, error } = await supabase
    .from("content_tasks")
    .insert(tasks)
    .select();

  if (error) throw new Error(error.message);

  // Update calendar status
  await supabase
    .from("content_calendar")
    .update({ status: "in_progress" })
    .eq("id", calendarId);

  return (data || []) as ContentTask[];
}

export async function updateTaskStatus(
  id: string,
  status: string,
  contentId?: string
): Promise<ContentTask> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { status };
  if (contentId) updateData.content_id = contentId;

  const { data, error } = await supabase
    .from("content_tasks")
    .update(updateData)
    .eq("id", id)
    .eq("org_id", authUser.member.org_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ContentTask;
}
