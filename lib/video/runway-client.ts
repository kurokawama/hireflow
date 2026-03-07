// Runway ML API client for AI video editing
// Requires: RUNWAY_API_KEY (Pro plan: $76/month)
import type { RunwayJobRequest, RunwayJobResponse } from "@/types/ai-edit";

const RUNWAY_API_BASE = "https://api.runwayml.com/v1";

// Submit an AI editing job to Runway ML
export async function submitRunwayJob(
  request: RunwayJobRequest
): Promise<RunwayJobResponse> {
  const apiKey = process.env.RUNWAY_API_KEY;

  if (!apiKey) {
    // Mock mode
    return {
      job_id: `mock_runway_${Date.now()}`,
      status: "completed",
      output_url: request.input_video_url, // Return input as output in mock
      estimated_time_seconds: 0,
    };
  }

  try {
    const response = await fetch(`${RUNWAY_API_BASE}/video/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input_video: request.input_video_url,
        text_prompt: request.prompt,
        style: request.style || "professional",
        duration: request.duration || undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Runway API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      job_id: data.id || data.job_id,
      status: data.status || "processing",
      output_url: data.output_url,
      estimated_time_seconds: data.estimated_time || 120,
    };
  } catch (error) {
    throw new Error(
      `Runway submission failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Check Runway job status
export async function checkRunwayJobStatus(
  jobId: string
): Promise<RunwayJobResponse> {
  const apiKey = process.env.RUNWAY_API_KEY;

  if (!apiKey) {
    return {
      job_id: jobId,
      status: "completed",
      output_url: `https://mock-output.example.com/${jobId}.mp4`,
    };
  }

  try {
    const response = await fetch(`${RUNWAY_API_BASE}/video/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Runway status check failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      job_id: data.id || jobId,
      status: data.status,
      output_url: data.output_url,
      estimated_time_seconds: data.estimated_time,
    };
  } catch (error) {
    throw new Error(
      `Runway status check failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
