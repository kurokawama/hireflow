"use client";

import { Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ShareLeaderboardEntry, StoreLeaderboardEntry } from "@/types/advocacy";

type Period = "week" | "month" | "all";

interface LeaderboardTableProps {
  defaultPeriod?: Period;
}

interface LeaderboardResponse {
  data?: {
    staff?: Partial<ShareLeaderboardEntry>[];
    stores?: Partial<StoreLeaderboardEntry>[];
  };
  error?: string;
}

const periodLabelMap: Record<Period, string> = {
  week: "今週",
  month: "今月",
  all: "全期間",
};

function normalizeStaff(entries: Partial<ShareLeaderboardEntry>[] | undefined): ShareLeaderboardEntry[] {
  return (entries || []).map((entry, index) => ({
    user_id: entry.user_id || `unknown-staff-${index}`,
    display_name: entry.display_name || "未設定ユーザー",
    store_name: entry.store_name || "-",
    share_count: Number(entry.share_count || 0),
    platforms_used: Array.isArray(entry.platforms_used)
      ? entry.platforms_used.filter((value): value is string => typeof value === "string")
      : [],
    is_champion: Boolean(entry.is_champion),
  }));
}

function normalizeStores(entries: Partial<StoreLeaderboardEntry>[] | undefined): StoreLeaderboardEntry[] {
  return (entries || []).map((entry, index) => ({
    store_id: entry.store_id || `unknown-store-${index}`,
    store_name: entry.store_name || "未設定店舗",
    brand: entry.brand || "-",
    total_shares: Number(entry.total_shares || 0),
    active_staff_count: Number(entry.active_staff_count || 0),
    champion_name: entry.champion_name || null,
  }));
}

function rowRankClass(rank: number) {
  if (rank === 0) return "bg-amber-50/80";
  if (rank === 1) return "bg-slate-100/80";
  if (rank === 2) return "bg-orange-50/80";
  return "";
}

export function LeaderboardTable({ defaultPeriod = "month" }: LeaderboardTableProps) {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [staffRanking, setStaffRanking] = useState<ShareLeaderboardEntry[]>([]);
  const [storeRanking, setStoreRanking] = useState<StoreLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboard = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/advocacy/shares?period=${period}`, {
          method: "GET",
          cache: "no-store",
        });
        const json = (await response.json()) as LeaderboardResponse;
        if (!response.ok || !json.data) {
          if (!isMounted) return;
          setError(json.error || "ランキングの取得に失敗しました。");
          setStaffRanking([]);
          setStoreRanking([]);
          return;
        }

        if (!isMounted) return;
        setStaffRanking(normalizeStaff(json.data.staff));
        setStoreRanking(normalizeStores(json.data.stores));
      } catch {
        if (!isMounted) return;
        setError("ランキングの取得に失敗しました。");
        setStaffRanking([]);
        setStoreRanking([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [period]);

  const staffEmpty = useMemo(() => !isLoading && staffRanking.length === 0, [isLoading, staffRanking.length]);
  const storeEmpty = useMemo(() => !isLoading && storeRanking.length === 0, [isLoading, storeRanking.length]);

  return (
    <div className="space-y-6">
      <Card className="rounded-md shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>投稿シェアランキング</CardTitle>
            <div className="w-full max-w-[220px]">
              <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
                <SelectTrigger aria-label="ランキング集計期間を選択">
                  <SelectValue placeholder="集計期間" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">今週</SelectItem>
                  <SelectItem value="month">今月</SelectItem>
                  <SelectItem value="all">全期間</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{periodLabelMap[period]}の投稿シェア数を表示しています。</p>
        </CardHeader>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>スタッフランキング</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2" aria-live="polite" aria-busy="true">
              <div className="h-8 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-8 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-8 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
          ) : staffEmpty ? (
            <p className="text-sm text-muted-foreground">この期間のシェア実績はまだありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">順位</TableHead>
                  <TableHead>スタッフ名</TableHead>
                  <TableHead>店舗</TableHead>
                  <TableHead className="text-right">シェア数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffRanking.map((entry, index) => (
                  <TableRow key={entry.user_id} className={rowRankClass(index)}>
                    <TableCell className="font-semibold">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{entry.display_name}</span>
                        {entry.is_champion && (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-100 text-amber-900"
                            aria-label="チャンピオン"
                          >
                            <Star className="mr-1 h-3 w-3 fill-current" aria-hidden="true" />
                            Champion
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{entry.store_name}</TableCell>
                    <TableCell className="text-right font-semibold">{entry.share_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>店舗ランキング</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2" aria-live="polite" aria-busy="true">
              <div className="h-8 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-8 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-8 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
          ) : storeEmpty ? (
            <p className="text-sm text-muted-foreground">この期間の店舗シェア実績はまだありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">順位</TableHead>
                  <TableHead>店舗名</TableHead>
                  <TableHead>ブランド</TableHead>
                  <TableHead className="text-right">総シェア数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storeRanking.map((entry, index) => (
                  <TableRow key={entry.store_id} className={rowRankClass(index)}>
                    <TableCell className="font-semibold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{entry.store_name}</TableCell>
                    <TableCell>{entry.brand}</TableCell>
                    <TableCell className="text-right font-semibold">{entry.total_shares}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
