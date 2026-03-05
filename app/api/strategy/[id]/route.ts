import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import {
  getCalendar,
  approveCalendar,
  updateCalendarStatus,
} from "@/lib/actions/strategy";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const { id } = await params;
    const calendar = await getCalendar(id);

    if (!calendar) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: calendar });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/strategy/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const { id } = await params;
    const body: { status?: string; action?: string } = await request.json();

    let calendar;
    if (body.action === "approve") {
      calendar = await approveCalendar(id);
    } else if (body.status) {
      calendar = await updateCalendarStatus(id, body.status);
    } else {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    return NextResponse.json({ data: calendar });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("PATCH /api/strategy/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
