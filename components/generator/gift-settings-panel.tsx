"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Gift, Upload } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { GiftDistributionWithDetails, GiftSettings } from "@/types/gifts";

interface GiftSettingsPanelProps {
  campaignId: string;
}

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

export function GiftSettingsPanel({ campaignId }: GiftSettingsPanelProps) {
  const [settings, setSettings] = useState<GiftSettings | null>(null);
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
      const [loadedSettings, loadedStats, loadedHistory] = await Promise.all([
        getGiftSettings(campaignId),
        getGiftCodeStats(campaignId),
        getDistributionHistory(campaignId, 20),
      ]);
      setSettings(loadedSettings);
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
      setError(loadError instanceof Error ? loadError.message : "Failed to load gift settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [campaignId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const threshold = scoreThreshold.trim() ? Number(scoreThreshold) : null;
      const result = await upsertGiftSettings({
        campaign_id: campaignId,
        gift_type: giftType,
        auto_distribute: autoDistribute,
        score_threshold: Number.isFinite(threshold) ? threshold : null,
        is_active: isActive,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSettings(result.data || null);
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
      formData.append("campaign_id", campaignId);
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
    <Card className="rounded-md border border-neutral-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
        <CardTitle className="text-neutral-900">ギフト配布設定</CardTitle>
        <Link href="/generator/gifts" className="text-sm text-[#1D3557] hover:text-[#14253d]">
          Gift codes
        </Link>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {isLoading ? (
          <div className="animate-pulse rounded-md bg-neutral-100 h-8" />
        ) : (
          <>
            <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gift-type">gift_type</Label>
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
                  <Label htmlFor="gift-score-threshold">score_threshold</Label>
                  <Input
                    id="gift-score-threshold"
                    type="number"
                    value={scoreThreshold}
                    onChange={(event) => setScoreThreshold(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
                  <span className="text-sm text-neutral-600">auto_distribute</span>
                  <SwitchButton
                    active={autoDistribute}
                    onToggle={() => setAutoDistribute((prev) => !prev)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
                  <span className="text-sm text-neutral-600">is_active</span>
                  <SwitchButton active={isActive} onToggle={() => setIsActive((prev) => !prev)} />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#1D3557] text-white hover:bg-[#122540]"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </form>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs text-neutral-600">total</p>
                <p className="text-lg font-semibold text-neutral-900">{stats.total}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs text-neutral-600">available</p>
                <p className="text-lg font-semibold text-neutral-900">{stats.available}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs text-neutral-600">distributed</p>
                <p className="text-lg font-semibold text-neutral-900">{stats.distributed}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs text-neutral-600">expired</p>
                <p className="text-lg font-semibold text-neutral-900">{stats.expired}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-neutral-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                <Gift className="h-4 w-4" />
                CSV import
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
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-900">distribution history</h3>
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-200">
                    <TableHead>candidate</TableHead>
                    <TableHead>gift_code</TableHead>
                    <TableHead>gift_type</TableHead>
                    <TableHead>distributed_at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-neutral-900">{item.candidate?.name || "-"}</TableCell>
                      <TableCell className="text-neutral-600">{item.gift_code?.code || "-"}</TableCell>
                      <TableCell className="text-neutral-600">
                        {item.gift_code?.gift_type || settings?.gift_type || "-"}
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {new Date(item.distributed_at).toLocaleString("ja-JP")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-neutral-500">
                        データなし
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
