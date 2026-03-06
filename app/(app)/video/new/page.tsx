"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Platform = "instagram" | "tiktok" | "youtube" | "x";
type Style = "professional" | "casual" | "energetic" | "cinematic";

interface CreateProjectResponse {
  data?: {
    id: string;
  };
  error?: string;
}

export default function NewVideoProjectPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [targetPersona, setTargetPersona] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [style, setStyle] = useState<Style>("professional");
  const [duration, setDuration] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await supabase.auth.getSession();

      const response = await fetch("/api/video/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          platform,
          target_audience: targetPersona,
          brand: "HireFlow",
          key_messages: [keyMessage, `スタイル: ${style}`],
          duration_seconds: duration,
          generate_script: true,
        }),
      });

      const payload = (await response.json()) as CreateProjectResponse;
      if (!response.ok || !payload.data?.id) {
        throw new Error(payload.error || "プロジェクト作成に失敗しました。");
      }

      router.push(`/video/${payload.data.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "プロジェクト作成に失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#1D3557]">新規動画プロジェクト</h1>
        <p className="text-sm text-neutral-600">入力内容をもとにAIで台本と撮影ガイドを生成します。</p>
      </div>

      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-[#1D3557]">プロジェクト情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例: 春の採用キャンペーン動画"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>プラットフォーム</Label>
              <Select value={platform} onValueChange={(value) => setPlatform(value as Platform)}>
                <SelectTrigger>
                  <SelectValue placeholder="プラットフォームを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="x">X</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_persona">ターゲットペルソナ</Label>
              <Input
                id="target_persona"
                value={targetPersona}
                onChange={(event) => setTargetPersona(event.target.value)}
                placeholder="例: 20代後半 / 接客経験あり / 正社員希望"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key_message">キーメッセージ</Label>
              <Textarea
                id="key_message"
                value={keyMessage}
                onChange={(event) => setKeyMessage(event.target.value)}
                placeholder="訴求したいポイントを入力してください"
                rows={4}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>スタイル</Label>
                <Select value={style} onValueChange={(value) => setStyle(value as Style)}>
                  <SelectTrigger>
                    <SelectValue placeholder="スタイルを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">プロフェッショナル</SelectItem>
                    <SelectItem value="casual">カジュアル</SelectItem>
                    <SelectItem value="energetic">エネルギッシュ</SelectItem>
                    <SelectItem value="cinematic">シネマティック</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">動画尺（秒）</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={300}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-[#1D3557] hover:bg-[#122540] sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? "AIで台本を生成中..." : "プロジェクトを作成"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
