"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { EntryTracking, FunnelStep, FunnelSummary } from "@/types/tracking";
import { FunnelChart } from "@/components/tracking/funnel-chart";
import { FunnelTable } from "@/components/tracking/funnel-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateRange = "7" | "30" | "90";
type PlatformFilter = "all" | "instagram" | "x" | "youtube" | "tiktok" | "facebook" | "line";

const EMPTY_SUMMARY: FunnelSummary = {
  impression: 0,
  click: 0,
  quiz_start: 0,
  quiz_complete: 0,
  line_follow: 0,
  interview_book: 0,
  conversion_rate: 0,
};

const STEPS: FunnelStep[] = [
  "impression",
  "click",
  "quiz_start",
  "quiz_complete",
  "line_follow",
  "interview_book",
];

function buildSummary(events: EntryTracking[]): FunnelSummary {
  const summary: FunnelSummary = { ...EMPTY_SUMMARY };
  for (const event of events) {
    summary[event.funnel_step] += 1;
  }
  summary.conversion_rate =
    summary.impression > 0 ? (summary.interview_book / summary.impression) * 100 : 0;
  return summary;
}

function toSinceDate(days: DateRange) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  return since;
}

function matchesPlatform(event: EntryTracking, platform: PlatformFilter) {
  if (platform === "all") return true;
  const value = (event.referral_platform || "").toLowerCase();
  if (platform === "x") {
    return value === "x" || value === "twitter";
  }
  return value === platform;
}

export default function FunnelAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [summary, setSummary] = useState<FunnelSummary>(EMPTY_SUMMARY);
  const [events, setEvents] = useState<EntryTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [summaryResponse, eventsResponse] = await Promise.all([
        fetch(`/api/tracking/funnel?days=${dateRange}`, {
          method: "GET",
          credentials: "include",
        }),
        fetch("/api/tracking/events", {
          method: "GET",
          credentials: "include",
        }),
      ]);

      const summaryPayload = (await summaryResponse.json()) as {
        data?: FunnelSummary;
        error?: string;
      };
      const eventsPayload = (await eventsResponse.json()) as {
        data?: EntryTracking[];
        error?: string;
      };

      if (!summaryResponse.ok || !summaryPayload.data) {
        throw new Error(summaryPayload.error || "ファネルデータの取得に失敗しました。");
      }
      if (!eventsResponse.ok || !eventsPayload.data) {
        throw new Error(eventsPayload.error || "イベントデータの取得に失敗しました。");
      }

      setSummary(summaryPayload.data);
      setEvents(eventsPayload.data);
    } catch (fetchError) {
      setSummary(EMPTY_SUMMARY);
      setEvents([]);
      setError(fetchError instanceof Error ? fetchError.message : "データの取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession();
    void loadData();
  }, [loadData]);

  const filteredEvents = useMemo(() => {
    const since = toSinceDate(dateRange);
    return events.filter((event) => {
      const createdAt = new Date(event.created_at);
      return createdAt >= since && matchesPlatform(event, platform);
    });
  }, [dateRange, events, platform]);

  const displayedSummary = useMemo(() => {
    if (platform === "all") return summary;

    const next = buildSummary(filteredEvents);
    for (const step of STEPS) {
      if (!Number.isFinite(next[step])) {
        next[step] = 0;
      }
    }
    return next;
  }, [filteredEvents, platform, summary]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#1D3557]">ファネル分析</h1>
        <p className="text-sm text-muted-foreground">
          流入から面接予約までの転換率を確認できます。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date-range">期間</Label>
          <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
            <SelectTrigger id="date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">直近7日</SelectItem>
              <SelectItem value="30">直近30日</SelectItem>
              <SelectItem value="90">直近90日</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="platform-filter">プラットフォーム</Label>
          <Select
            value={platform}
            onValueChange={(value: PlatformFilter) => setPlatform(value)}
          >
            <SelectTrigger id="platform-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="x">X</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="line">LINE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              総インプレッション
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1D3557]">
              {isLoading ? "-" : displayedSummary.impression.toLocaleString("ja-JP")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">総クリック</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1D3557]">
              {isLoading ? "-" : displayedSummary.click.toLocaleString("ja-JP")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">転換率</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1D3557]">
              {isLoading ? "-" : `${displayedSummary.conversion_rate.toFixed(1)}%`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">LINEフォロー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1D3557]">
              {isLoading ? "-" : displayedSummary.line_follow.toLocaleString("ja-JP")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-[#1D3557]">ファネル推移</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart metrics={displayedSummary} />
        </CardContent>
      </Card>

      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-[#1D3557]">イベント詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelTable events={filteredEvents} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
