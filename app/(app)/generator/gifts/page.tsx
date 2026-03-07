"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Gift, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDistributionHistory,
  getGiftCodeStats,
  getGiftSettings,
  upsertGiftSettings,
} from "@/lib/actions/gifts";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { GiftCode, GiftDistributionWithDetails } from "@/types/gifts";

interface SwitchProps {
  active: boolean;
  onToggle: () => void;
}

function SwitchButton({ active, onToggle }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        active ? "bg-[#1D3557]" : "bg-neutral-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
          active ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export default function GeneratorGiftsPage() {
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
  const [giftType, setGiftType] = useState("amazon");
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [scoreThreshold, setScoreThreshold] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState({ total: 0, available: 0, distributed: 0, expired: 0 });
  const [history, setHistory] = useState<GiftDistributionWithDetails[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const [codesResult, loadedSettings, loadedStats, loadedHistory] = await Promise.all([
        supabase.from("gift_codes").select("*").order("imported_at", { ascending: false }).limit(200),
        getGiftSettings(),
        getGiftCodeStats(),
        getDistributionHistory(undefined, 100),
      ]);

      if (codesResult.error) {
        throw new Error(codesResult.error.message);
      }

      const codes = (codesResult.data || []) as GiftCode[];
      setGiftCodes(codes);
      setGiftType(loadedSettings?.gift_type || "amazon");
      setAutoDistribute(loadedSettings?.auto_distribute ?? false);
      setScoreThreshold(
        typeof loadedSettings?.score_threshold === "number"
          ? String(loadedSettings.score_threshold)
          : ""
      );
      setIsActive(loadedSettings?.is_active ?? false);
      setStats(loadedStats);
      setHistory(loadedHistory);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load page.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const threshold = scoreThreshold.trim() ? Number(scoreThreshold) : null;
      const result = await upsertGiftSettings({
        gift_type: giftType,
        auto_distribute: autoDistribute,
        score_threshold: Number.isFinite(threshold) ? threshold : null,
        is_active: isActive,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("CSV file is required.");
      return;
    }

    setError("");
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/gifts/import", {
        method: "POST",
        body: formData,
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error || "Import failed.");
        return;
      }
      setFile(null);
      await loadData();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 bg-neutral-50">
      <h1 className="text-2xl font-bold text-neutral-900">ギフトコード管理</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <div className="animate-pulse rounded-md bg-neutral-100 h-8" />
      ) : (
        <>
          <Card className="rounded-md border border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-neutral-900">ギフト配布設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={(e) => void handleSaveSettings(e)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gift-type">ギフトタイプ</Label>
                    <Select value={giftType} onValueChange={setGiftType}>
                      <SelectTrigger id="gift-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amazon">amazon</SelectItem>
                        <SelectItem value="line_gift">line_gift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="score-threshold">スコア閾値</Label>
                    <Input
                      id="score-threshold"
                      type="number"
                      value={scoreThreshold}
                      onChange={(event) => setScoreThreshold(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
                    <span className="text-sm text-neutral-600">自動配布</span>
                    <SwitchButton
                      active={autoDistribute}
                      onToggle={() => setAutoDistribute((prev) => !prev)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
                    <span className="text-sm text-neutral-600">有効</span>
                    <SwitchButton active={isActive} onToggle={() => setIsActive((prev) => !prev)} />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1D3557] text-white hover:bg-[#122540]"
                >
                  {isSubmitting ? "保存中..." : "保存"}
                </Button>
              </form>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-600">合計</p>
                  <p className="text-lg font-semibold text-neutral-900">{stats.total}</p>
                </div>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-600">利用可能</p>
                  <p className="text-lg font-semibold text-neutral-900">{stats.available}</p>
                </div>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-600">配布済み</p>
                  <p className="text-lg font-semibold text-neutral-900">{stats.distributed}</p>
                </div>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-600">期限切れ</p>
                  <p className="text-lg font-semibold text-neutral-900">{stats.expired}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md border border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-neutral-900">CSVインポート</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                <Gift className="h-4 w-4" />
                <span>ギフトコードをアップロード</span>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] || null;
                  setFile(selectedFile);
                }}
              />
              <Button
                type="button"
                onClick={() => void handleImport()}
                disabled={isImporting}
                className="bg-[#1D3557] text-white hover:bg-[#122540]"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? "インポート中..." : "インポート"}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-md border border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-neutral-900">ギフトコード一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-200">
                    <TableHead>コード</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {giftCodes.map((giftCode) => (
                    <TableRow key={giftCode.id}>
                      <TableCell className="font-medium text-neutral-900">{giftCode.code}</TableCell>
                      <TableCell className="text-neutral-600">{giftCode.gift_type}</TableCell>
                      <TableCell className="text-neutral-600">{giftCode.amount_yen ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{giftCode.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {giftCodes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-neutral-500">
                        データなし
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-md border border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-neutral-900">配布履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-200">
                    <TableHead>候補者</TableHead>
                    <TableHead>ギフトコード</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>配布方法</TableHead>
                    <TableHead>LINE送信済み</TableHead>
                    <TableHead>配布日時</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-neutral-900">{item.candidate?.name || "-"}</TableCell>
                      <TableCell className="text-neutral-600">{item.gift_code?.code || "-"}</TableCell>
                      <TableCell className="text-neutral-600">{item.gift_code?.gift_type || "-"}</TableCell>
                      <TableCell className="text-neutral-600">{item.distributed_via}</TableCell>
                      <TableCell className="text-neutral-600">
                        {item.line_sent ? "true" : "false"}
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {new Date(item.distributed_at).toLocaleString("ja-JP")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                        データなし
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
