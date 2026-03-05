import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createTargetProfile } from "@/lib/actions/targets";
import type { CreateTargetProfileRequest } from "@/types/targets";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: CreateTargetProfileRequest = await request.json();

    if (!body.list_id || !body.platform) {
      return NextResponse.json(
        { error: "list_id and platform are required" },
        { status: 400 }
      );
    }

    const profile = await createTargetProfile(body);
    return NextResponse.json({ data: profile }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Target list not found") {
      return NextResponse.json({ error: "Target list not found" }, { status: 404 });
    }
    console.error("POST /api/targets/profiles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
