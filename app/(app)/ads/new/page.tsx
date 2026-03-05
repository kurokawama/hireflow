"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { AudienceBuilderForm } from "@/components/ads/audience-builder-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AdAudience,
  AdPlatform,
  BuildAudienceRequest,
  CreateAdCampaignRequest,
} from "@/types/ads";
import type { Platform } from "@/types/database";
import type { TargetList } from "@/types/targets";

type WizardStep = 1 | 2 | 3 | 4 | 5;

type ContentOption = {
  id: string;
  platform: Platform;
  status: string;
  body_text: string;
  created_at: string;
};

const steps: Array<{ step: WizardStep; title: string }> = [
  { step: 1, title: "配信先選択" },
  { step: 2, title: "オーディエンス作成" },
  { step: 3, title: "広告文選択" },
  { step: 4, title: "予算・期間" },
  { step: 5, title: "確認・作成" },
];

function getPlatformLabel(platform: AdPlatform) {
  if (platform === "meta") return "Meta";
  if (platform === "google") return "Google";
  return "X";
}

function getContentPlatforms(platform: AdPlatform): Platform[] {
  if (platform === "meta") return ["meta_ad", "facebook", "instagram"];
  if (platform === "google") return ["google_jobs", "youtube"];
  return ["x"];
}

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function NewAdCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);

  const [platform, setPlatform] = useState<AdPlatform>("meta");
  const [targetLists, setTargetLists] = useState<TargetList[]>([]);
  const [contents, setContents] = useState<ContentOption[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [audience, setAudience] = useState<AdAudience | null>(null);
  const [isBuildingAudience, setIsBuildingAudience] = useState(false);
  const [audienceError, setAudienceError] = useState("");

  const [selectedContentId, setSelectedContentId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("10000");
  const [totalBudget, setTotalBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingData(true);
      setLoadError("");

      try {
        const listsResponse = await fetch("/api/targets/lists", { method: "GET" });
        const listPayload = (await listsResponse.json()) as {
          data?: TargetList[];
          error?: string;
        };
        if (!listsResponse.ok || !listPayload.data) {
          setLoadError(listPayload.error || "ターゲットリストの取得に失敗しました。");
          return;
        }

        const supabase = createClient();
        const contentResult = await supabase
          .from("generated_contents")
          .select("id, platform, status, body_text, created_at")
          .in("status", ["approved", "posted"])
          .order("created_at", { ascending: false })
          .limit(100);

        if (contentResult.error) {
          setLoadError(contentResult.error.message);
          return;
        }

        setTargetLists(listPayload.data);
        setContents((contentResult.data || []) as ContentOption[]);
      } catch {
        setLoadError("初期データの読み込みに失敗しました。");
      } finally {
        setIsLoadingData(false);
      }
    };

    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!campaignName.trim()) {
      setCampaignName(`${getPlatformLabel(platform)} 採用キャンペーン`);
    }
  }, [campaignName, platform]);

  const availableContents = useMemo(() => {
    const allowed = getContentPlatforms(platform);
    return contents.filter((content) => allowed.includes(content.platform));
  }, [contents, platform]);

  const selectedContent = useMemo(
    () => availableContents.find((content) => content.id === selectedContentId) || null,
    [availableContents, selectedContentId]
  );

  const dailyBudgetValue = Number(dailyBudget);
  const totalBudgetValue = totalBudget ? Number(totalBudget) : undefined;

  const canGoToReview = Boolean(
    campaignName.trim() &&
      audience &&
      selectedContentId &&
      Number.isFinite(dailyBudgetValue) &&
      dailyBudgetValue > 0
  );

  const handleBuildAudience = async (payload: BuildAudienceRequest) => {
    setAudienceError("");
    setIsBuildingAudience(true);

    try {
      const response = await fetch("/api/ads/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        data?: AdAudience;
        error?: string;
      };

      if (!response.ok || !json.data) {
        setAudienceError(json.error || "オーディエンス作成に失敗しました。");
        return;
      }

      setAudience(json.data);
      setStep(3);
    } catch {
      setAudienceError("オーディエンス作成に失敗しました。");
    } finally {
      setIsBuildingAudience(false);
    }
  };

  const handleCreateCampaign = async () => {
    setCreateError("");
    if (!audience) {
      setCreateError("オーディエンスが未作成です。");
      return;
    }
    if (!selectedContentId) {
      setCreateError("広告文を選択してください。");
      return;
    }
    if (!campaignName.trim()) {
      setCreateError("キャンペーン名を入力してください。");
      return;
    }
    if (!Number.isFinite(dailyBudgetValue) || dailyBudgetValue <= 0) {
      setCreateError("日次予算は1円以上で入力してください。");
      return;
    }
    if (totalBudgetValue !== undefined && (!Number.isFinite(totalBudgetValue) || totalBudgetValue <= 0)) {
      setCreateError("総予算は1円以上で入力してください。");
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setCreateError("終了日は開始日以降を指定してください。");
      return;
    }

    setIsCreating(true);

    const payload: CreateAdCampaignRequest = {
      name: campaignName.trim(),
      platform,
      audience_id: audience.id,
      content_id: selectedContentId,
      daily_budget_jpy: Math.round(dailyBudgetValue),
      total_budget_jpy: totalBudgetValue ? Math.round(totalBudgetValue) : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    };

    try {
      const response = await fetch("/api/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        data?: { id: string };
        error?: string;
      };

      if (!response.ok || !json.data?.id) {
        setCreateError(json.error || "キャンペーン作成に失敗しました。");
        setIsCreating(false);
        return;
      }

      router.push(`/ads/${json.data.id}`);
    } catch {
      setCreateError("キャンペーン作成に失敗しました。");
      setIsCreating(false);
    }
  };

  const nextStep = () => {
    if (step === 1) setStep(2);
    if (step === 3 && selectedContentId) setStep(4);
    if (step === 4 && canGoToReview) setStep(5);
  };

  const prevStep = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
    if (step === 4) setStep(3);
    if (step === 5) setStep(4);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#1D3557]">新規広告キャンペーン</h1>
        <p className="text-sm text-muted-foreground">
          ステップ形式で広告キャンペーンを作成します。
        </p>
      </div>

      <Card className="rounded-md border-neutral-200">
        <CardContent className="pt-6">
          <ol className="grid gap-2 sm:grid-cols-5" aria-label="作成ステップ">
            {steps.map((item) => {
              const isActive = item.step === step;
              const isDone = item.step < step;
              return (
                <li
                  key={item.step}
                  className={[
                    "rounded-md border px-3 py-2 text-sm",
                    isActive
                      ? "border-[#E63946] bg-[#E63946]/10 text-[#E63946]"
                      : isDone
                        ? "border-[#22C55E] bg-[#22C55E]/10 text-[#22C55E]"
                        : "border-neutral-200 text-muted-foreground",
                  ].join(" ")}
                >
                  {isDone ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {item.title}
                    </span>
                  ) : (
                    <span>
                      Step {item.step}. {item.title}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {isLoadingData && (
        <Card className="rounded-md border-neutral-200">
          <CardContent className="space-y-3 pt-6">
            <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" aria-hidden />
            <div className="h-10 w-full animate-pulse rounded bg-neutral-200" aria-hidden />
            <div className="h-10 w-full animate-pulse rounded bg-neutral-200" aria-hidden />
          </CardContent>
        </Card>
      )}

      {loadError && (
        <Card className="rounded-md border-[#EF4444]/30 bg-[#EF4444]/10">
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-[#EF4444]">
              {loadError}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoadingData && !loadError && step === 1 && (
        <Card className="rounded-md border-neutral-200">
          <CardHeader>
            <CardTitle>Step 1: 配信プラットフォームを選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {(["meta", "google", "x"] as AdPlatform[]).map((value) => {
                const isActive = platform === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlatform(value)}
                    aria-label={`${getPlatformLabel(value)}を選択`}
                    className={[
                      "rounded-md border px-4 py-3 text-left text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E63946] focus-visible:ring-offset-2",
                      isActive
                        ? "border-[#E63946] bg-[#E63946]/10 text-[#E63946]"
                        : "border-neutral-300 hover:border-neutral-400",
                    ].join(" ")}
                  >
                    <p className="font-medium">{getPlatformLabel(value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {value === "meta" && "Instagram / Facebook 配信向け"}
                      {value === "google" && "Google / YouTube 配信向け"}
                      {value === "x" && "X 配信向け"}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                className="bg-[#E63946] hover:bg-[#C62F3B]"
                onClick={nextStep}
                aria-label="次のステップへ進む"
              >
                次へ
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoadingData && !loadError && step === 2 && (
        <Card className="rounded-md border-neutral-200">
          <CardHeader>
            <CardTitle>Step 2: オーディエンス作成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AudienceBuilderForm
              platform={platform}
              targetLists={targetLists.map((list) => ({
                id: list.id,
                name: list.name,
                profile_count: list.profile_count,
              }))}
              isSubmitting={isBuildingAudience}
              onSubmit={handleBuildAudience}
            />
            {audienceError && (
              <p role="alert" className="text-sm text-[#EF4444]">
                {audienceError}
              </p>
            )}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep} aria-label="前に戻る">
                <ArrowLeft className="mr-1 h-4 w-4" />
                戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoadingData && !loadError && step === 3 && (
        <Card className="rounded-md border-neutral-200">
          <CardHeader>
            <CardTitle>Step 3: 広告文を選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableContents.length === 0 ? (
              <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  選択中のプラットフォーム向け承認済みコンテンツがありません。
                </p>
                <Button asChild variant="outline" className="mt-3">
                  <Link href="/generator" aria-label="コンテンツ生成画面へ移動">
                    コンテンツ生成へ
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {availableContents.map((content) => (
                  <label
                    key={content.id}
                    className={[
                      "block cursor-pointer rounded-md border p-4 transition-colors",
                      selectedContentId === content.id
                        ? "border-[#E63946] bg-[#E63946]/10"
                        : "border-neutral-200 hover:border-neutral-400",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="content"
                        value={content.id}
                        checked={selectedContentId === content.id}
                        onChange={() => setSelectedContentId(content.id)}
                        aria-label="広告文を選択"
                        className="mt-1 h-4 w-4"
                      />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline">{content.platform}</Badge>
                          <span className="text-muted-foreground">
                            {new Date(content.created_at).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <p className="line-clamp-3 text-sm text-foreground">{content.body_text}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep} aria-label="前に戻る">
                <ArrowLeft className="mr-1 h-4 w-4" />
                戻る
              </Button>
              <Button
                type="button"
                className="bg-[#E63946] hover:bg-[#C62F3B]"
                onClick={nextStep}
                disabled={!selectedContentId}
                aria-label="次のステップへ進む"
              >
                次へ
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoadingData && !loadError && step === 4 && (
        <Card className="rounded-md border-neutral-200">
          <CardHeader>
            <CardTitle>Step 4: 予算・スケジュール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">キャンペーン名</Label>
              <Input
                id="campaign-name"
                aria-label="キャンペーン名"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="例: 春採用強化キャンペーン"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="daily-budget">日次予算（円）</Label>
                <Input
                  id="daily-budget"
                  type="number"
                  min={1}
                  aria-label="日次予算"
                  value={dailyBudget}
                  onChange={(event) => setDailyBudget(event.target.value)}
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total-budget">総予算（円 / 任意）</Label>
                <Input
                  id="total-budget"
                  type="number"
                  min={1}
                  aria-label="総予算"
                  value={totalBudget}
                  onChange={(event) => setTotalBudget(event.target.value)}
                  placeholder="300000"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-date">開始日（任意）</Label>
                <Input
                  id="start-date"
                  type="date"
                  aria-label="開始日"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">終了日（任意）</Label>
                <Input
                  id="end-date"
                  type="date"
                  aria-label="終了日"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep} aria-label="前に戻る">
                <ArrowLeft className="mr-1 h-4 w-4" />
                戻る
              </Button>
              <Button
                type="button"
                className="bg-[#E63946] hover:bg-[#C62F3B]"
                onClick={nextStep}
                disabled={!canGoToReview}
                aria-label="確認ステップへ進む"
              >
                確認へ
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoadingData && !loadError && step === 5 && (
        <Card className="rounded-md border-neutral-200">
          <CardHeader>
            <CardTitle>Step 5: 内容確認</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 rounded-md border bg-neutral-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">キャンペーン名</p>
                <p className="font-medium text-foreground">{campaignName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">プラットフォーム</p>
                <p className="font-medium text-foreground">{getPlatformLabel(platform)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">オーディエンス</p>
                <p className="font-medium text-foreground">{audience?.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">日次予算</p>
                <p className="font-medium text-foreground">
                  {Number.isFinite(dailyBudgetValue) ? formatYen(dailyBudgetValue) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総予算</p>
                <p className="font-medium text-foreground">
                  {totalBudgetValue ? formatYen(totalBudgetValue) : "未設定"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">配信期間</p>
                <p className="font-medium text-foreground">
                  {startDate || "-"} 〜 {endDate || "-"}
                </p>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <p className="mb-2 text-xs text-muted-foreground">選択した広告文</p>
              <p className="text-sm leading-6 text-foreground">{selectedContent?.body_text || "-"}</p>
            </div>

            {createError && (
              <p role="alert" className="text-sm text-[#EF4444]">
                {createError}
              </p>
            )}

            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="outline" onClick={prevStep} aria-label="前に戻る">
                <ArrowLeft className="mr-1 h-4 w-4" />
                戻る
              </Button>
              <Button
                type="button"
                className="bg-[#E63946] hover:bg-[#C62F3B]"
                onClick={() => void handleCreateCampaign()}
                disabled={isCreating}
                aria-label="キャンペーンを作成"
              >
                {isCreating ? "作成中..." : "キャンペーンを作成"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
