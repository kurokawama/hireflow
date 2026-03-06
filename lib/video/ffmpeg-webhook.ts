// FFmpeg editing job management via n8n webhook
// Sends video editing requests to n8n Cloud for FFmpeg processing
import type { EditConfig } from "@/types/video";

const N8N_WEBHOOK_URL = process.env.N8N_VIDEO_EDIT_WEBHOOK;

export interface FFmpegJobRequest {
  project_id: string;
  org_id: string;
  input_storage_path: string;
  output_filename: string;
  edit_config: EditConfig;
  callback_url: string;
}

export interface FFmpegJobResult {
  success: boolean;
  output_storage_path?: string;
  duration_seconds?: number;
  file_size?: number;
  error?: string;
}

// Submit an FFmpeg editing job to n8n
export async function submitEditJob(request: FFmpegJobRequest): Promise<{
  job_id: string;
  submitted: boolean;
  error?: string;
}> {
  if (!N8N_WEBHOOK_URL) {
    // Mock mode: simulate job submission
    console.log("[FFmpeg] Mock mode — n8n webhook URL not configured");
    const mockJobId = `mock_ffmpeg_${Date.now()}`;

    return {
      job_id: mockJobId,
      submitted: true,
    };
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "video_edit",
        ...request,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        job_id: "",
        submitted: false,
        error: `n8n webhook error: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      job_id: data.job_id || `job_${Date.now()}`,
      submitted: true,
    };
  } catch (error) {
    return {
      job_id: "",
      submitted: false,
      error: error instanceof Error ? error.message : "Failed to submit edit job",
    };
  }
}

// Build FFmpeg command from edit config (for n8n to execute)
export function buildFFmpegCommand(
  inputPath: string,
  outputPath: string,
  config: EditConfig
): string {
  const filters: string[] = [];
  const args: string[] = ["-i", inputPath];

  // Trim
  if (config.trim_start && config.trim_start > 0) {
    args.push("-ss", String(config.trim_start));
  }
  if (config.trim_end && config.trim_end > 0) {
    args.push("-to", String(config.trim_end));
  }

  // Subtitle overlay
  if (config.subtitle_enabled && config.text_overlays) {
    for (const overlay of config.text_overlays) {
      const yPos = overlay.position === "top" ? "50" : overlay.position === "center" ? "h/2" : "h-80";
      filters.push(
        `drawtext=text='${overlay.text}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=${yPos}:enable='between(t,${overlay.start_time},${overlay.end_time})'`
      );
    }
  }

  if (filters.length > 0) {
    args.push("-vf", filters.join(","));
  }

  // BGM mixing
  if (config.bgm_track) {
    args.push("-i", config.bgm_track);
    const volume = (config.bgm_volume || 30) / 100;
    args.push(
      "-filter_complex",
      `[0:a]volume=1[a1];[1:a]volume=${volume}[a2];[a1][a2]amix=inputs=2:duration=first[a]`,
      "-map", "0:v",
      "-map", "[a]"
    );
  }

  args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
  args.push(outputPath);

  return `ffmpeg ${args.join(" ")}`;
}
