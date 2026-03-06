"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getTicketSettingsAction,
  saveTicketSettingsAction,
} from "@/lib/actions/tickets";
import type { TicketType } from "@/types/tickets";
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
import { Textarea } from "@/components/ui/textarea";

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#1D3557] text-[#1D3557]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function ToggleSwitch({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-[#1D3557]" : "bg-neutral-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

const typeLabelMap: Record<TicketType, string> = {
  dr_stretch_60min: "Dr.ストレッチ 60分体験",
  pilates_weekly: "ピラティス 週1体験",
};

export default function TicketSettingsPage() {
  const [scoreThreshold, setScoreThreshold] = useState(70);
  const [ticketType, setTicketType] = useState<TicketType>("dr_stretch_60min");
  const [expiryDays, setExpiryDays] = useState(30);
  const [lineMessage, setLineMessage] = useState("");
  const [autoIssue, setAutoIssue] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getTicketSettingsAction();
    if (result.error) {
      setErrorMessage(result.error);
    }

    if (result.data) {
      setScoreThreshold(result.data.score_threshold);
      setTicketType(result.data.ticket_type);
      setExpiryDays(result.data.expiry_days);
      setLineMessage(result.data.line_message);
      setAutoIssue(result.data.auto_issue);
      setIsActive(result.data.is_active);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await saveTicketSettingsAction({
      score_threshold: scoreThreshold,
      ticket_type: ticketType,
      expiry_days: expiryDays,
      line_message: lineMessage,
      auto_issue: autoIssue,
      is_active: isActive,
    });

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? "保存に失敗しました");
    } else {
      setSuccessMessage("保存しました");
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 overflow-x-auto border-b pb-2">
        <Link href="/settings/stores" className={navClass(false)}>
          店舗
        </Link>
        <Link href="/settings/profiles" className={navClass(false)}>
          プロフィール
        </Link>
        <Link href="/settings/members" className={navClass(false)}>
          メンバー
        </Link>
        <Link href="/settings/voices" className={navClass(false)}>
          スタッフボイス
        </Link>
        <Link href="/settings/staff-sns" className={navClass(false)}>
          スタッフSNS
        </Link>
        <Link href="/settings/connections" className={navClass(false)}>
          SNS接続管理
        </Link>
        <Link href="/settings/quiz" className={navClass(false)}>
          クイズ
        </Link>
        <Link href="/settings/lists" className={navClass(false)}>
          リスト
        </Link>
        <Link href="/settings/line" className={navClass(false)}>
          LINE設定
        </Link>
        <Link href="/settings/tickets" className={navClass(true)}>
          チケット設定
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-[#1D3557]">チケット自動発行設定</h1>

      <Card className="rounded-md border-neutral-200">
        <CardHeader>
          <CardTitle className="text-[#1D3557]">自動発行設定</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-neutral-600">読み込み中...</p>
          ) : (
            <form className="space-y-4" onSubmit={handleSave}>
              <div className="space-y-2">
                <Label htmlFor="score_threshold">スコア閾値</Label>
                <Input
                  id="score_threshold"
                  type="number"
                  min={0}
                  max={100}
                  value={scoreThreshold}
                  onChange={(event) => setScoreThreshold(Number(event.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket_type">チケットタイプ</Label>
                <Select
                  value={ticketType}
                  onValueChange={(value: TicketType) => setTicketType(value)}
                >
                  <SelectTrigger id="ticket_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr_stretch_60min">
                      {typeLabelMap.dr_stretch_60min}
                    </SelectItem>
                    <SelectItem value="pilates_weekly">{typeLabelMap.pilates_weekly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry_days">有効日数</Label>
                <Input
                  id="expiry_days"
                  type="number"
                  min={1}
                  value={expiryDays}
                  onChange={(event) => setExpiryDays(Number(event.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="line_message">LINE配信メッセージ</Label>
                <Textarea
                  id="line_message"
                  value={lineMessage}
                  onChange={(event) => setLineMessage(event.target.value)}
                  rows={5}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
                <Label htmlFor="auto_issue">自動発行</Label>
                <ToggleSwitch
                  id="auto_issue"
                  checked={autoIssue}
                  onCheckedChange={setAutoIssue}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
                <Label htmlFor="is_active">有効</Label>
                <ToggleSwitch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
              {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#1D3557] text-white hover:bg-[#1D3557]/90"
              >
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
