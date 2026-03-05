import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import {
  getTargetList,
  updateTargetList,
  deleteTargetList,
} from "@/lib/actions/targets";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const { listId } = await params;
    const list = await getTargetList(listId);

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: list });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/targets/lists/[listId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const { listId } = await params;
    const body = await request.json();
    const list = await updateTargetList(listId, body);
    return NextResponse.json({ data: list });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/targets/lists/[listId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const { listId } = await params;
    await deleteTargetList(listId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("DELETE /api/targets/lists/[listId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
