import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FFmpegJobResult } from "@/lib/video/ffmpeg-webhook";

// POST /api/video/webhook — Receive FFmpeg job completion from n8n
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.VIDEO_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_id,
      success,
      output_storage_path,
      duration_seconds,
      file_size,
      error: jobError,
    } = body as FFmpegJobResult & { project_id: string };

    if (!project_id) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (success && output_storage_path) {
      // Get project to find org_id
      const { data: project } = await supabase
        .from("video_projects")
        .select("org_id")
        .eq("id", project_id)
        .single();

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      // Create media file record for edited video
      const { data: mediaFile } = await supabase
        .from("media_files")
        .insert({
          org_id: project.org_id,
          file_name: output_storage_path.split("/").pop() || "edited_video.mp4",
          file_type: "video",
          file_size: file_size || 0,
          mime_type: "video/mp4",
          storage_path: output_storage_path,
          duration_seconds: duration_seconds || null,
          metadata: { source: "ffmpeg_edit" },
        })
        .select()
        .single();

      // Update project with edited video
      await supabase
        .from("video_projects")
        .update({
          edited_video_id: mediaFile?.id || null,
          status: "edited",
          updated_at: new Date().toISOString(),
        })
        .eq("id", project_id);

      return NextResponse.json({
        success: true,
        project_id,
        edited_video_id: mediaFile?.id,
      });
    } else {
      // Job failed — update status
      await supabase
        .from("video_projects")
        .update({
          status: "uploaded", // Revert to uploaded so user can retry
          edit_config: { last_error: jobError || "Edit job failed" },
          updated_at: new Date().toISOString(),
        })
        .eq("id", project_id);

      return NextResponse.json({
        success: false,
        project_id,
        error: jobError || "Edit job failed",
      });
    }
  } catch (error) {
    console.error("Video webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
