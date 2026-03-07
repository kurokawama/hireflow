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

// Send message to multiple LINE users (max 500 per request)
export async function sendMulticast(
  userIds: string[],
  messages: LineMessage[]
): Promise<{ success: boolean; error?: string; sent_count: number }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    return { success: true, sent_count: userIds.length };
  }

  if (userIds.length === 0) {
    return { success: true, sent_count: 0 };
  }

  try {
    const batchSize = 500;
    let totalSent = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const response = await fetch(`${LINE_API_BASE}/bot/message/multicast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: batch, messages }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `LINE multicast error: ${response.status} ${error}`,
          sent_count: totalSent,
        };
      }
      totalSent += batch.length;
    }

    return { success: true, sent_count: totalSent };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "LINE multicast failed",
      sent_count: 0,
    };
  }
}

// Send message to all LINE followers
export async function sendBroadcast(
  messages: LineMessage[]
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    return { success: true };
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/bot/message/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `LINE broadcast error: ${response.status} ${error}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "LINE broadcast failed",
    };
  }
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
