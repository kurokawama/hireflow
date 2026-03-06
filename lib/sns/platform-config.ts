// Platform configuration and capabilities
import type { PlatformCapability, SNSPlatform } from "@/types/sns";

export const PLATFORM_CONFIGS: Record<SNSPlatform, PlatformCapability> = {
  x: {
    platform: "x",
    display_name: "X (Twitter)",
    icon: "Twitter",
    supports_scheduling: true,
    supports_media: true,
    max_text_length: 280,
    requires_oauth: true,
    api_available: false, // Mock until API key acquired
  },
  facebook: {
    platform: "facebook",
    display_name: "Facebook",
    icon: "Facebook",
    supports_scheduling: true,
    supports_media: true,
    max_text_length: 63206,
    requires_oauth: true,
    api_available: false, // Mock until Meta App Review
  },
  instagram: {
    platform: "instagram",
    display_name: "Instagram",
    icon: "Instagram",
    supports_scheduling: true,
    supports_media: true,
    max_text_length: 2200,
    requires_oauth: true,
    api_available: false, // Mock until Meta App Review
  },
  line: {
    platform: "line",
    display_name: "LINE",
    icon: "MessageCircle",
    supports_scheduling: false,
    supports_media: true,
    max_text_length: 5000,
    requires_oauth: false,
    api_available: false, // Mock until LINE Messaging API key
  },
  tiktok: {
    platform: "tiktok",
    display_name: "TikTok",
    icon: "Video",
    supports_scheduling: false,
    supports_media: true,
    max_text_length: 2200,
    requires_oauth: true,
    api_available: false, // No API — manual only
  },
  youtube: {
    platform: "youtube",
    display_name: "YouTube",
    icon: "Youtube",
    supports_scheduling: false,
    supports_media: true,
    max_text_length: 5000,
    requires_oauth: true,
    api_available: false, // Read-only API for search
  },
};

// Platforms that support auto-posting (when API keys are available)
export const POSTABLE_PLATFORMS: SNSPlatform[] = ["x", "facebook", "instagram", "line"];

// Platforms that require manual posting (copy + paste)
export const MANUAL_PLATFORMS: SNSPlatform[] = ["tiktok", "youtube"];

export function getPlatformConfig(platform: SNSPlatform): PlatformCapability {
  return PLATFORM_CONFIGS[platform];
}

export function isPlatformPostable(platform: SNSPlatform): boolean {
  return POSTABLE_PLATFORMS.includes(platform);
}
