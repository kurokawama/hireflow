import type { Platform } from "@/types/database";
import type { SNSPlatform } from "@/types/sns";

interface PlatformIconProps {
  platform: SNSPlatform | Platform;
  size?: "sm" | "md" | "lg";
}

const platformEmojiMap: Record<SNSPlatform | Platform | "meta_ad" | "google_jobs", string> = {
  instagram: "📸",
  facebook: "📘",
  tiktok: "🎵",
  line: "💬",
  x: "✖",
  youtube: "▶️",
  meta_ad: "📢",
  google_jobs: "💼",
};

const sizeClassMap: Record<NonNullable<PlatformIconProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function PlatformIcon({ platform, size = "md" }: PlatformIconProps) {
  return (
    <span aria-label={platform} className={sizeClassMap[size]} role="img">
      {platformEmojiMap[platform] ?? "💬"}
    </span>
  );
}
