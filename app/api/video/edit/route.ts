import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { getVideoProject, updateVideoProject } from "@/lib/actions/video-projects";
import { submitEditJob } from "@/lib/video/ffmpeg-webhook";
import type { EditConfig } from "@/types/video";

// POST /api/video/edit — Submit FFmpeg editing job
export async function POST(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);

    const body = await request.json();
    const { project_id, edit_config } = body as {
      project_id: string;
      edit_config: EditConfig;
    };

    if (!project_id) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 }
      );
    }

    // Get project and verify raw video exists
    const project = await getVideoProject(project_id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.raw_video?.storage_path) {
      return NextResponse.json(
        { error: "No raw video uploaded for this project" },
        { status: 400 }
      );
    }

    // Update project with edit config and set status
    await updateVideoProject(project_id, {
      edit_config: edit_config || {},
      status: "editing",
    });

    // Submit job to n8n
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const result = await submitEditJob({
      project_id,
      org_id: project.org_id,
      input_storage_path: project.raw_video.storage_path,
      output_filename: `edited_${project.raw_video.file_name}`,
      edit_config: edit_config || {},
      callback_url: `${baseUrl}/api/video/webhook`,
    });

    if (!result.submitted) {
      return NextResponse.json(
        { error: result.error || "Failed to submit edit job" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        job_id: result.job_id,
        project_id,
        status: "editing",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Edit submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
