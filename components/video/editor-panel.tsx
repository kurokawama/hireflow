"use client";

import { useMemo, useState } from "react";
import type { EditConfig, VideoProjectWithMedia } from "@/types/video";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditorPanelProps {
  project: VideoProjectWithMedia;
}

type SubtitleStyle = "standard" | "bold" | "minimal";
type OutputFormat = "mp4" | "webm";

interface EditPayload extends EditConfig {
  subtitle_style?: SubtitleStyle;
  output_format?: OutputFormat;
}

export function EditorPanel({ project }: EditorPanelProps) {
  const initialTrimStart = project.edit_config?.trim_start ?? 0;
  const initialTrimEnd = project.edit_config?.trim_end ?? 0;
  const initialSubtitles = Boolean(project.edit_config?.subtitle_enabled);
  const initialBgmVolume = project.edit_config?.bgm_volume ?? 30;

  const [trimStart, setTrimStart] = useState<number>(initialTrimStart);
  const [trimEnd, setTrimEnd] = useState<number>(initialTrimEnd);
  const [addSubtitles, setAddSubtitles] = useState(initialSubtitles);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>("standard");
  const [bgmVolume, setBgmVolume] = useState<number>(initialBgmVolume);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp4");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isProcessing = useMemo(() => project.status === "editing", [project.status]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const editConfig: EditPayload = {
        trim_start: Number.isFinite(trimStart) ? trimStart : 0,
        trim_end: Number.isFinite(trimEnd) ? trimEnd : undefined,
        subtitle_enabled: addSubtitles,
        bgm_volume: bgmVolume,
        subtitle_style: subtitleStyle,
        output_format: outputFormat,
      };

      const response = await fetch("/api/video/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_id: project.id,
          edit_config: editConfig,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "編集ジョブの開始に失敗しました。");
      }

      setSuccess("編集ジョブを開始しました。完了までしばらくお待ちください。");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "編集ジョブの開始に失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="text-[#1D3557]">動画編集</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="trim_start">開始位置（秒）</Label>
            <Input
              id="trim_start"
              type="number"
              min={0}
              value={trimStart}
              onChange={(event) => setTrimStart(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trim_end">終了位置（秒）</Label>
            <Input
              id="trim_end"
              type="number"
              min={0}
              value={trimEnd}
              onChange={(event) => setTrimEnd(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="add_subtitles"
            type="checkbox"
            checked={addSubtitles}
            onChange={(event) => setAddSubtitles(event.target.checked)}
            className="h-4 w-4 rounded border-neutral-300"
          />
          <Label htmlFor="add_subtitles">字幕を追加する</Label>
        </div>

        <div className="space-y-2">
          <Label>字幕スタイル</Label>
          <Select value={subtitleStyle} onValueChange={(value) => setSubtitleStyle(value as SubtitleStyle)}>
            <SelectTrigger>
              <SelectValue placeholder="字幕スタイルを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">標準</SelectItem>
              <SelectItem value="bold">強調</SelectItem>
              <SelectItem value="minimal">ミニマル</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bgm_volume">BGM音量: {bgmVolume}</Label>
          <input
            id="bgm_volume"
            type="range"
            min={0}
            max={100}
            value={bgmVolume}
            onChange={(event) => setBgmVolume(Number(event.target.value))}
            className="w-full accent-[#1D3557]"
          />
        </div>

        <div className="space-y-2">
          <Label>出力形式</Label>
          <Select value={outputFormat} onValueChange={(value) => setOutputFormat(value as OutputFormat)}>
            <SelectTrigger>
              <SelectValue placeholder="出力形式を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mp4">MP4</SelectItem>
              <SelectItem value="webm">WebM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isProcessing && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            現在、編集ジョブを処理中です。
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}

        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className="w-full bg-[#1D3557] hover:bg-[#122540] sm:w-auto"
        >
          {isSubmitting ? "編集ジョブを送信中..." : "編集を開始"}
        </Button>
      </CardContent>
    </Card>
  );
}
