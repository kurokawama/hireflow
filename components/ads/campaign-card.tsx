import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdCampaign, AdPlatform, AdStatus } from "@/types/ads";
import { BadgeCheck, CirclePause, CircleX, Facebook, MessageCircle, Search, Twitter } from "lucide-react";

interface CampaignCardProps {
  campaign: AdCampaign;
}

const platformMeta: Record<
  AdPlatform,
  { label: string; icon: LucideIcon; iconClass: string }
> = {
  meta: {
    label: "Meta",
    icon: Facebook,
    iconClass: "text-[#3B82F6]",
  },
  google: {
    label: "Google",
    icon: Search,
    iconClass: "text-[#F4A261]",
  },
  x: {
    label: "X",
    icon: Twitter,
    iconClass: "text-[#1D3557]",
  },
  line: {
    label: "LINE",
    icon: MessageCircle,
    iconClass: "text-[#06C755]",
  },
};

const statusMeta: Record<
  AdStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  draft: {
    label: "下書き",
    className: "bg-neutral-100 text-neutral-700 border-transparent",
    icon: CirclePause,
  },
  pending_approval: {
    label: "承認待ち",
    className: "bg-[#F59E0B]/20 text-[#F59E0B] border-transparent",
    icon: CirclePause,
  },
  approved: {
    label: "承認済み",
    className: "bg-[#3B82F6]/20 text-[#3B82F6] border-transparent",
    icon: BadgeCheck,
  },
  active: {
    label: "配信中",
    className: "bg-[#22C55E]/20 text-[#22C55E] border-transparent",
    icon: BadgeCheck,
  },
  paused: {
    label: "一時停止",
    className: "bg-neutral-100 text-neutral-700 border-transparent",
    icon: CirclePause,
  },
  completed: {
    label: "完了",
    className: "bg-[#1D3557]/20 text-[#1D3557] border-transparent",
    icon: BadgeCheck,
  },
  failed: {
    label: "失敗",
    className: "bg-[#EF4444]/20 text-[#EF4444] border-transparent",
    icon: CircleX,
  },
};

function formatYen(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const platform = platformMeta[campaign.platform];
  const status = statusMeta[campaign.status];
  const PlatformIcon = platform.icon;
  const StatusIcon = status.icon;

  return (
    <Card className="rounded-md border border-neutral-200 bg-white shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base text-[#1D3557]">{campaign.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PlatformIcon className={`h-4 w-4 ${platform.iconClass}`} aria-hidden="true" />
              <span>{platform.label}</span>
            </div>
          </div>
          <Badge className={`inline-flex items-center gap-1 ${status.className}`}>
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-neutral-50 p-3">
            <p className="text-xs text-muted-foreground">日次予算</p>
            <p className="font-semibold text-foreground">
              {formatYen(campaign.daily_budget_jpy)}
            </p>
          </div>
          <div className="rounded-md bg-neutral-50 p-3">
            <p className="text-xs text-muted-foreground">総予算</p>
            <p className="font-semibold text-foreground">
              {formatYen(campaign.total_budget_jpy)}
            </p>
          </div>
        </div>
        <Link
          href={`/ads/${campaign.id}`}
          aria-label={`${campaign.name}の詳細を表示`}
          className="inline-flex h-9 items-center justify-center rounded-sm bg-[#E63946] px-4 text-sm font-medium text-white transition-colors hover:bg-[#C62F3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E63946] focus-visible:ring-offset-2"
        >
          詳細を見る
        </Link>
      </CardContent>
    </Card>
  );
}
