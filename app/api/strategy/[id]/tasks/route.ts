import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createTasksFromCalendar, getCalendarTasks } from "@/lib/actions/strategy";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const { id } = await params;
    const tasks = await getCalendarTasks(id);
    return NextResponse.json({ data: tasks });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/strategy/[id]/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const { id } = await params;
    const tasks = await createTasksFromCalendar(id);
    return NextResponse.json({ data: tasks }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Calendar not found") {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }
    console.error("POST /api/strategy/[id]/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
