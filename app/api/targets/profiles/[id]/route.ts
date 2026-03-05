import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import {
  updateTargetProfile,
  deleteTargetProfile,
} from "@/lib/actions/targets";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const { id } = await params;
    const body = await request.json();
    const profile = await updateTargetProfile(id, body);
    return NextResponse.json({ data: profile });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/targets/profiles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const { id } = await params;
    await deleteTargetProfile(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/targets/profiles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
