import Link from "next/link";
import { cookies, headers } from "next/headers";
import { Plus } from "lucide-react";
import { CampaignCard } from "@/components/ads/campaign-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdCampaign, AdPlatform, AdStatus } from "@/types/ads";

interface AdsPageProps {
  searchParams?: {
    platform?: string;
    status?: string;
  };
}

const platformFilters: Array<{ value: "all" | AdPlatform; label: string }> = [
  { value: "all", label: "全プラットフォーム" },
  { value: "meta", label: "Meta" },
  { value: "google", label: "Google" },
  { value: "x", label: "X" },
];

const statusFilters: Array<{ value: "all" | AdStatus; label: string }> = [
  { value: "all", label: "全ステータス" },
  { value: "draft", label: "下書き" },
  { value: "pending_approval", label: "承認待ち" },
  { value: "approved", label: "承認済み" },
  { value: "active", label: "配信中" },
  { value: "paused", label: "一時停止" },
  { value: "completed", label: "完了" },
  { value: "failed", label: "失敗" },
];

function getBaseUrl() {
  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : "";
}

function normalizePlatform(value?: string): "all" | AdPlatform {
  if (value === "meta" || value === "google" || value === "x") return value;
  return "all";
}

function normalizeStatus(value?: string): "all" | AdStatus {
  if (
    value === "draft" ||
    value === "pending_approval" ||
    value === "approved" ||
    value === "active" ||
    value === "paused" ||
    value === "completed" ||
    value === "failed"
  ) {
    return value;
  }
  return "all";
}

function buildFilterHref(
  nextPlatform: "all" | AdPlatform,
  nextStatus: "all" | AdStatus
) {
  const params = new URLSearchParams();
  if (nextPlatform !== "all") params.set("platform", nextPlatform);
  if (nextStatus !== "all") params.set("status", nextStatus);
  const query = params.toString();
  return query ? `/ads?${query}` : "/ads";
}

export default async function AdsPage({ searchParams }: AdsPageProps) {
  const selectedPlatform = normalizePlatform(searchParams?.platform);
  const selectedStatus = normalizeStatus(searchParams?.status);

  let campaigns: AdCampaign[] = [];
  let loadError = "";

  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/ads/campaigns`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: cookies().toString(),
      },
    });
    const payload = (await response.json()) as {
      data?: AdCampaign[];
      error?: string;
    };

    if (!response.ok || !payload.data) {
      loadError = payload.error || "キャンペーン一覧の取得に失敗しました。";
    } else {
      campaigns = payload.data;
    }
  } catch {
    loadError = "キャンペーン一覧の取得に失敗しました。";
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchedPlatform =
      selectedPlatform === "all" || campaign.platform === selectedPlatform;
    const matchedStatus = selectedStatus === "all" || campaign.status === selectedStatus;
    return matchedPlatform && matchedStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">広告キャンペーン管理</h1>
          <p className="text-sm text-muted-foreground">
            採用広告の配信ステータスと予算を一元管理します。
          </p>
        </div>
        <Button asChild className="bg-[#E63946] hover:bg-[#C62F3B]">
          <Link href="/ads/new" aria-label="新規キャンペーンを作成">
            <Plus className="mr-1 h-4 w-4" />
            新規キャンペーン
          </Link>
        </Button>
      </div>

      <Card className="rounded-md border-neutral-200">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">プラットフォーム</p>
            <div className="flex flex-wrap gap-2" aria-label="プラットフォームフィルタ">
              {platformFilters.map((filter) => {
                const isActive = selectedPlatform === filter.value;
                return (
                  <Link
                    key={filter.value}
                    href={buildFilterHref(filter.value, selectedStatus)}
                    aria-label={`${filter.label}で絞り込み`}
                    className={[
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E63946] focus-visible:ring-offset-2",
                      isActive
                        ? "border-[#E63946] bg-[#E63946]/10 text-[#E63946]"
                        : "border-neutral-300 text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">ステータス</p>
            <div className="flex flex-wrap gap-2" aria-label="ステータスフィルタ">
              {statusFilters.map((filter) => {
                const isActive = selectedStatus === filter.value;
                return (
                  <Link
                    key={filter.value}
                    href={buildFilterHref(selectedPlatform, filter.value)}
                    aria-label={`${filter.label}で絞り込み`}
                    className={[
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E63946] focus-visible:ring-offset-2",
                      isActive
                        ? "border-[#E63946] bg-[#E63946]/10 text-[#E63946]"
                        : "border-neutral-300 text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {loadError && (
        <Card className="rounded-md border-[#EF4444]/30 bg-[#EF4444]/10">
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-[#EF4444]">
              {loadError}
            </p>
          </CardContent>
        </Card>
      )}

      {!loadError && filteredCampaigns.length === 0 && (
        <Card className="rounded-md border-dashed border-neutral-300 bg-neutral-50">
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              条件に一致するキャンペーンがありません。新規作成から始めてください。
            </p>
            <Button asChild variant="outline">
              <Link href="/ads/new" aria-label="新規キャンペーン作成に移動">
                キャンペーンを作成
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loadError && filteredCampaigns.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
