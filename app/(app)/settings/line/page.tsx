"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { getLineSettings, upsertLineSettings } from "@/lib/actions/line-settings";
import type { LineSettings } from "@/types/tracking";
import { LineSettingsForm } from "@/components/line/settings-form";
import { MessageComposer } from "@/components/line/message-composer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#1D3557] text-[#1D3557]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

export default function SettingsLinePage() {
  const [settings, setSettings] = useState<LineSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLineSettings();
      setSettings(data);
    } catch {
      toast({
        title: "LINE設定",
        description: "LINE設定の取得に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession();
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (data: Partial<LineSettings>) => {
    setIsSaving(true);
    try {
      const result = await upsertLineSettings({
        interview_booking_url: data.interview_booking_url ?? undefined,
        welcome_message: data.welcome_message ?? undefined,
        follow_up_messages: data.follow_up_messages ?? undefined,
        is_active: data.is_active ?? undefined,
      });

      if (!result) {
        throw new Error("save failed");
      }

      setSettings(result);
      toast({
        title: "LINE設定",
        description: "LINE設定を保存しました。",
      });
    } catch {
      toast({
        title: "LINE設定",
        description: "LINE設定の保存に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = async (userId: string, message: string) => {
    const response = await fetch("/api/line/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        user_id: userId,
        message,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "テスト送信に失敗しました。");
    }

    toast({
      title: "LINEテスト送信",
      description: "メッセージを送信しました。",
    });
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
        <Link href="/settings/line" className={navClass(true)}>
          LINE設定
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#1D3557]">LINE設定</h1>
        <p className="text-sm text-muted-foreground">
          友だち追加後のメッセージ配信と面接導線を設定します。
        </p>
      </div>

      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-[#1D3557]">配信設定</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : (
            <>
              {isSaving && (
                <p className="mb-4 text-sm text-muted-foreground">保存処理を実行中です...</p>
              )}
              <LineSettingsForm settings={settings} onSave={handleSave} />
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-[#1D3557]">テストメッセージ送信</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageComposer
            onSend={async (userId, message) => {
              try {
                await handleSendTestMessage(userId, message);
              } catch (error) {
                toast({
                  title: "LINEテスト送信",
                  description:
                    error instanceof Error ? error.message : "テスト送信に失敗しました。",
                  variant: "destructive",
                });
                throw error;
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
