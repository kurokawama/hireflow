"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformIcon } from "@/components/sns/platform-icon";
import type { Platform } from "@/types/database";
import type { SNSPlatform } from "@/types/sns";

interface PlatformTabsProps {
  platforms: Array<SNSPlatform | Platform>;
  activePlatform: SNSPlatform | Platform;
  onPlatformChange: (platform: SNSPlatform | Platform) => void;
}

type SupportedPlatform = SNSPlatform | Platform;

const platformLabelMap: Record<SupportedPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  line: "LINE",
  x: "X",
  youtube: "YouTube",
  meta_ad: "Meta Ads",
  google_jobs: "Google Jobs",
};

export function PlatformTabs({
  platforms,
  activePlatform,
  onPlatformChange,
}: PlatformTabsProps) {
  const uniquePlatforms = platforms.filter(
    (platform, index, array): platform is SupportedPlatform => array.indexOf(platform) === index
  );

  if (uniquePlatforms.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-neutral-50 p-3 text-sm text-neutral-500">
        No platforms
      </div>
    );
  }

  return (
    <Tabs
      value={activePlatform}
      onValueChange={(value) => onPlatformChange(value as SNSPlatform | Platform)}
    >
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-md border bg-white p-1">
        {uniquePlatforms.map((platform) => (
          <TabsTrigger
            key={platform}
            value={platform}
            aria-label={`${platform} tab`}
            className="motion-reduce:transition-none"
          >
            <span className="inline-flex items-center gap-2">
              <PlatformIcon platform={platform} size="sm" />
              <span>{platformLabelMap[platform] ?? platform}</span>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
