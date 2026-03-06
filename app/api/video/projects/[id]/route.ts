import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { getVideoProject, updateVideoProject, deleteVideoProject } from "@/lib/actions/video-projects";
import { getSignedUrl } from "@/lib/video/storage";

// GET /api/video/projects/[id] — Get project details with signed URLs
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const { id } = await params;

    const project = await getVideoProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Generate signed URLs for video files
    let rawVideoUrl: string | null = null;
    let editedVideoUrl: string | null = null;

    if (project.raw_video?.storage_path) {
      rawVideoUrl = await getSignedUrl(project.raw_video.storage_path);
    }
    if (project.edited_video?.storage_path) {
      editedVideoUrl = await getSignedUrl(project.edited_video.storage_path);
    }

    return NextResponse.json({
      data: {
        ...project,
        raw_video_url: rawVideoUrl,
        edited_video_url: editedVideoUrl,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/video/projects/[id] — Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff", "store_manager"]);
    const { id } = await params;
    const body = await request.json();

    const updated = await updateVideoProject(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/video/projects/[id] — Delete project
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const { id } = await params;

    const success = await deleteVideoProject(id);
    if (!success) {
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
