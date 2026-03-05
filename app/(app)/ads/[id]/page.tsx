import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdCampaign, AdStatus } from "@/types/ads";

interface AdDetailPageProps {
  params: { id: string };
  searchParams?: {
    error?: string;
    message?: string;
  };
}

type CampaignDetailRow = AdCampaign & {
  ad_audiences?: {
    name?: string;
    audience_type?: string;
    platform?: string;
  } | null;
  generated_contents?: {
    body_text?: string;
    platform?: string;
    status?: string;
  } | null;
};

const statusMeta: Record<AdStatus, { label: string; className: string }> = {
  draft: {
    label: "下書き",
    className: "bg-neutral-100 text-neutral-700 border-transparent",
  },
  pending_approval: {
    label: "承認待ち",
    className: "bg-[#F59E0B]/20 text-[#F59E0B] border-transparent",
  },
  approved: {
    label: "承認済み",
    className: "bg-[#3B82F6]/20 text-[#3B82F6] border-transparent",
  },
  active: {
    label: "配信中",
    className: "bg-[#22C55E]/20 text-[#22C55E] border-transparent",
  },
  paused: {
    label: "一時停止",
    className: "bg-neutral-100 text-neutral-700 border-transparent",
  },
  completed: {
    label: "完了",
    className: "bg-[#1D3557]/20 text-[#1D3557] border-transparent",
  },
  failed: {
    label: "失敗",
    className: "bg-[#EF4444]/20 text-[#EF4444] border-transparent",
  },
};

function getBaseUrl() {
  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : "";
}

function formatYen(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ja-JP");
}

async function activateCampaignAction(formData: FormData) {
  "use server";

  const campaignId = String(formData.get("campaign_id") ?? "");
  const currentStatus = String(formData.get("current_status") ?? "");
  if (!campaignId) {
    redirect("/ads?error=invalid_campaign");
  }

  if (currentStatus === "paused") {
    const supabase = await createClient();
    const { error } = await supabase
      .from("ad_campaigns")
      .update({ status: "active" })
      .eq("id", campaignId);

    if (error) {
      redirect(`/ads/${campaignId}?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath(`/ads/${campaignId}`);
    redirect(`/ads/${campaignId}?message=${encodeURIComponent("キャンペーンを再開しました。")}`);
  }

  const response = await fetch(`${getBaseUrl()}/api/ads/deploy`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies().toString(),
    },
    body: JSON.stringify({
      campaign_id: campaignId,
      activate: true,
    }),
  });

  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    const message = payload.error || "配信開始に失敗しました。";
    redirect(`/ads/${campaignId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/ads/${campaignId}`);
  redirect(`/ads/${campaignId}?message=${encodeURIComponent("キャンペーンを配信開始しました。")}`);
}

async function pauseCampaignAction(formData: FormData) {
  "use server";

  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!campaignId) {
    redirect("/ads?error=invalid_campaign");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ad_campaigns")
    .update({ status: "paused" })
    .eq("id", campaignId);

  if (error) {
    redirect(`/ads/${campaignId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/ads/${campaignId}`);
  redirect(`/ads/${campaignId}?message=${encodeURIComponent("キャンペーンを一時停止しました。")}`);
}

export default async function AdDetailPage({ params, searchParams }: AdDetailPageProps) {
  let campaign: CampaignDetailRow | null = null;
  let loadError = "";

  try {
    const response = await fetch(`${getBaseUrl()}/api/ads/campaigns`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: cookies().toString(),
      },
    });
    const payload = (await response.json()) as {
      data?: CampaignDetailRow[];
      error?: string;
    };
    if (!response.ok || !payload.data) {
      loadError = payload.error || "キャンペーン情報の取得に失敗しました。";
    } else {
      campaign = payload.data.find((row) => row.id === params.id) || null;
    }
  } catch {
    loadError = "キャンペーン情報の取得に失敗しました。";
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/ads" aria-label="広告一覧へ戻る">
            一覧へ戻る
          </Link>
        </Button>
        <Card className="rounded-md border-[#EF4444]/30 bg-[#EF4444]/10">
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-[#EF4444]">
              {loadError}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/ads" aria-label="広告一覧へ戻る">
            一覧へ戻る
          </Link>
        </Button>
        <Card className="rounded-md border-neutral-200">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            指定されたキャンペーンが見つかりませんでした。
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusMeta[campaign.status];
  const metrics = campaign.performance;
  const ctrPercent = metrics ? `${(metrics.ctr * 100).toFixed(2)}%` : "-";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/ads" aria-label="広告一覧へ戻る">
              一覧へ戻る
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-[#1D3557]">{campaign.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={status.className}>{status.label}</Badge>
            <Badge variant="outline">{campaign.platform}</Badge>
            <span className="text-xs text-muted-foreground">
              作成日: {formatDate(campaign.created_at)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(campaign.status === "draft" ||
            campaign.status === "approved" ||
            campaign.status === "paused") && (
            <form action={activateCampaignAction}>
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <input type="hidden" name="current_status" value={campaign.status} />
              <Button
                type="submit"
                className="bg-[#22C55E] text-white hover:bg-[#22C55E]/90"
                aria-label={campaign.status === "paused" ? "キャンペーンを再開" : "キャンペーンを配信開始"}
              >
                {campaign.status === "paused" ? "配信を再開" : "配信開始"}
              </Button>
            </form>
          )}
          {(campaign.status === "active" || campaign.status === "approved") && (
            <form action={pauseCampaignAction}>
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <Button type="submit" variant="outline" aria-label="キャンペーンを一時停止">
                一時停止
              </Button>
            </form>
          )}
        </div>
      </div>

      {searchParams?.message && (
        <Card className="rounded-md border-[#22C55E]/30 bg-[#22C55E]/10">
          <CardContent className="pt-6">
            <p className="text-sm text-[#22C55E]">{decodeURIComponent(searchParams.message)}</p>
          </CardContent>
        </Card>
      )}
      {searchParams?.error && (
        <Card className="rounded-md border-[#EF4444]/30 bg-[#EF4444]/10">
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-[#EF4444]">
              {decodeURIComponent(searchParams.error)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-md border-neutral-200">
        <CardHeader>
          <CardTitle>配信パフォーマンス</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="text-xs text-muted-foreground">Impressions</p>
              <p className="text-lg font-semibold text-foreground">
                {formatNumber(metrics?.impressions)}
              </p>
            </div>
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="text-xs text-muted-foreground">Clicks</p>
              <p className="text-lg font-semibold text-foreground">
                {formatNumber(metrics?.clicks)}
              </p>
            </div>
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="text-xs text-muted-foreground">CTR</p>
              <p className="text-lg font-semibold text-foreground">{ctrPercent}</p>
            </div>
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="text-xs text-muted-foreground">CPC</p>
              <p className="text-lg font-semibold text-foreground">{formatYen(metrics?.cpc_jpy)}</p>
            </div>
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="text-xs text-muted-foreground">Spend</p>
              <p className="text-lg font-semibold text-foreground">
                {formatYen(metrics?.spend_jpy)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md border-neutral-200">
        <CardHeader>
          <CardTitle>キャンペーン情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">オーディエンス</p>
              <p className="font-medium text-foreground">{campaign.ad_audiences?.name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">日次予算</p>
              <p className="font-medium text-foreground">{formatYen(campaign.daily_budget_jpy)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">総予算</p>
              <p className="font-medium text-foreground">{formatYen(campaign.total_budget_jpy)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">配信期間</p>
              <p className="font-medium text-foreground">
                {formatDate(campaign.start_date)} 〜 {formatDate(campaign.end_date)}
              </p>
            </div>
          </div>
          <div className="rounded-md border bg-neutral-50 p-4">
            <p className="mb-1 text-xs text-muted-foreground">広告文プレビュー</p>
            <p className="whitespace-pre-wrap leading-6 text-foreground">
              {campaign.generated_contents?.body_text || "広告文がありません。"}
            </p>
          </div>
          {campaign.error_message && (
            <p className="text-sm text-[#EF4444]">エラー: {campaign.error_message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
