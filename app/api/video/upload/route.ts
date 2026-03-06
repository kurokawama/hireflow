import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { uploadVideoFile } from "@/lib/video/storage";
import { createMediaFile } from "@/lib/actions/media-files";
import { updateVideoProject } from "@/lib/actions/video-projects";

// POST /api/video/upload — Upload video file
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("project_id") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["video/mp4", "video/quicktime", "video/webm", "video/avi"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: MP4, MOV, WebM, AVI" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadVideoFile(
      authUser.member.org_id,
      file,
      file.name,
      file.type
    );

    // Create media file record
    const mediaFile = await createMediaFile({
      file_name: uploadResult.file_name,
      file_type: "video",
      file_size: uploadResult.file_size,
      mime_type: uploadResult.mime_type,
      storage_path: uploadResult.storage_path,
    });

    if (!mediaFile) {
      return NextResponse.json(
        { error: "Failed to create media file record" },
        { status: 500 }
      );
    }

    // Link to video project if project_id provided
    if (projectId) {
      await updateVideoProject(projectId, {
        raw_video_id: mediaFile.id,
        status: "uploaded",
      });
    }

    return NextResponse.json({
      data: {
        media_file_id: mediaFile.id,
        storage_path: uploadResult.storage_path,
        file_size: uploadResult.file_size,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
