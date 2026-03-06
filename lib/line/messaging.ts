// LINE Messaging API client for direct messaging
// Requires: LINE_CHANNEL_ACCESS_TOKEN

const LINE_API_BASE = "https://api.line.me/v2";

interface LineMessage {
  type: "text" | "image" | "template";
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  template?: Record<string, unknown>;
}

// Send message to a specific LINE user
export async function sendMessage(
  userId: string,
  messages: LineMessage[]
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.log("[LINE] Mock mode — no token configured");
    return { success: true };
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/bot/message/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `LINE API error: ${response.status} ${error}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "LINE send failed",
    };
  }
}

// Send welcome message with booking URL
export async function sendWelcomeMessage(
  userId: string,
  welcomeText: string,
  bookingUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const messages: LineMessage[] = [
    { type: "text", text: welcomeText },
  ];

  if (bookingUrl) {
    messages.push({
      type: "text",
      text: `面接のご予約はこちらから:\n${bookingUrl}`,
    });
  }

  return sendMessage(userId, messages);
}

// Get LINE user profile
export async function getUserProfile(
  userId: string
): Promise<{ displayName: string; pictureUrl?: string } | null> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) return null;

  try {
    const response = await fetch(`${LINE_API_BASE}/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
