import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { getTargetLists, createTargetList } from "@/lib/actions/targets";
import type { CreateTargetListRequest } from "@/types/targets";

export async function GET() {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const lists = await getTargetLists();
    return NextResponse.json({ data: lists });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/targets/lists error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: CreateTargetListRequest = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const list = await createTargetList(body);
    return NextResponse.json({ data: list }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/targets/lists error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
