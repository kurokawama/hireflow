import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { listVideoProjects, createVideoProject } from "@/lib/actions/video-projects";
import { generateVideoScript } from "@/lib/ai/script-generator";
import type { VideoProjectStatus, ScriptGenerateRequest } from "@/types/video";

// GET /api/video/projects — List video projects
export async function GET(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);

    const status = request.nextUrl.searchParams.get("status") as VideoProjectStatus | null;
    const projects = await listVideoProjects({
      status: status || undefined,
      limit: 50,
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("List projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/video/projects — Create project with AI script
export async function POST(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);

    const body: ScriptGenerateRequest = await request.json();
    const { title, target_audience, brand, key_messages, duration_seconds, platform } = body;

    if (!title || !target_audience || !brand || !key_messages?.length) {
      return NextResponse.json(
        { error: "title, target_audience, brand, and key_messages are required" },
        { status: 400 }
      );
    }

    // Generate script via AI
    const scriptResult = await generateVideoScript({
      title,
      target_audience,
      brand,
      key_messages,
      duration_seconds: duration_seconds || 60,
      platform: platform || "instagram",
    });

    // Create project
    const project = await createVideoProject({
      title,
      script_text: scriptResult.script_text,
      shooting_guide: scriptResult.shooting_guide as unknown as Record<string, unknown>,
    });

    if (!project) {
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        ...project,
        script_text: scriptResult.script_text,
        shooting_guide: scriptResult.shooting_guide,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
