"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { StaffSnsAccount } from "@/types/advocacy";
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

type StaffSnsPlatform = "instagram" | "x" | "tiktok" | "facebook";

const platformOptions: Array<{ value: StaffSnsPlatform; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
];

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function getPlatformLabel(platform: StaffSnsPlatform) {
  return platformOptions.find((option) => option.value === platform)?.label ?? platform;
}

export default function StaffSnsSettingsPage() {
  const [accounts, setAccounts] = useState<StaffSnsAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [platform, setPlatform] = useState<StaffSnsPlatform>("instagram");
  const [username, setUsername] = useState("");
  const [isChampion, setIsChampion] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/advocacy/staff-accounts", { method: "GET" });
      const payload = (await response.json()) as {
        data?: StaffSnsAccount[];
        error?: string;
      };
      if (!response.ok || !payload.data) {
        setError(payload.error || "スタッフSNSアカウントの取得に失敗しました。");
        setIsLoading(false);
        return;
      }
      setAccounts(payload.data);
    } catch {
      setError("スタッフSNSアカウントの取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAccounts();
  }, []);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("ユーザー名を入力してください。");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/advocacy/staff-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          username: username.trim(),
        }),
      });
      const payload = (await response.json()) as {
        data?: StaffSnsAccount;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        setError(payload.error || "アカウント登録に失敗しました。");
        setIsSaving(false);
        return;
      }

      if (isChampion) {
        const patchResponse = await fetch("/api/advocacy/staff-accounts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: payload.data.id,
            is_champion: true,
          }),
        });
        if (!patchResponse.ok) {
          const patchPayload = (await patchResponse.json()) as { error?: string };
          setError(patchPayload.error || "チャンピオン設定に失敗しました。");
        }
      }

      setUsername("");
      setIsChampion(false);
      await fetchAccounts();
    } catch {
      setError("アカウント登録に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleChampion = async (account: StaffSnsAccount) => {
    setError("");
    const response = await fetch("/api/advocacy/staff-accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: account.id,
        is_champion: !account.is_champion,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error || "チャンピオン更新に失敗しました。");
      return;
    }

    await fetchAccounts();
  };

  const handleDelete = async (accountId: string) => {
    setError("");
    const response = await fetch(`/api/advocacy/staff-accounts?id=${accountId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error || "削除に失敗しました。");
      return;
    }
    await fetchAccounts();
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
        <Link href="/settings/staff-sns" className={navClass(true)}>
          スタッフSNS
        </Link>
        <Link href="/settings/quiz" className={navClass(false)}>
          クイズ
        </Link>
        <Link href="/settings/lists" className={navClass(false)}>
          リスト
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#1D3557]">スタッフSNS管理</h1>
        <p className="text-sm text-muted-foreground">
          社員のSNSアカウント登録とチャンピオン設定を管理します。
        </p>
      </div>

      <Card className="rounded-md border-neutral-200">
        <CardHeader>
          <CardTitle>アカウント登録</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" onSubmit={(event) => void handleRegister(event)}>
            <div className="space-y-2">
              <Label htmlFor="staff-sns-platform">プラットフォーム</Label>
              <Select value={platform} onValueChange={(value: StaffSnsPlatform) => setPlatform(value)}>
                <SelectTrigger id="staff-sns-platform" aria-label="プラットフォームを選択">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platformOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="staff-sns-username">ユーザー名</Label>
              <Input
                id="staff-sns-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="@username"
                aria-label="ユーザー名"
                required
              />
            </div>
            <label className="mt-7 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isChampion}
                onChange={(event) => setIsChampion(event.target.checked)}
                aria-label="チャンピオンとして登録"
                className="h-4 w-4 rounded border-neutral-300"
              />
              チャンピオン
            </label>
            <div className="md:col-span-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#E63946] hover:bg-[#C62F3B]"
                aria-label="SNSアカウントを登録"
              >
                {isSaving ? "登録中..." : "登録する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-[#EF4444]">
          {error}
        </p>
      )}

      <Card className="rounded-md border-neutral-200">
        <CardHeader>
          <CardTitle>登録済みアカウント</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              読み込み中...
            </p>
          )}

          {!isLoading && accounts.length === 0 && (
            <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
              <p className="text-sm text-muted-foreground">まだアカウントが登録されていません。</p>
            </div>
          )}

          {!isLoading &&
            accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {getPlatformLabel(account.platform as StaffSnsPlatform)}
                    </Badge>
                    {account.is_champion && (
                      <Badge className="border-transparent bg-[#F4A261]/20 text-[#F4A261]">
                        Champion
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">@{account.username}</p>
                  <p className="text-xs text-muted-foreground">
                    登録日: {new Date(account.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void toggleChampion(account)}
                    aria-label="チャンピオン設定を切り替える"
                  >
                    {account.is_champion ? "Champion解除" : "Championにする"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[#EF4444]"
                    onClick={() => void handleDelete(account.id)}
                    aria-label="アカウントを削除"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    削除
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
