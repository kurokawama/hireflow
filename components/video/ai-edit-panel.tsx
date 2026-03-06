"use client";

import { useCallback, useEffect, useState } from "react";
import { createAIEditJob, listAIEditJobs } from "@/lib/actions/ai-edit-jobs";
import type { AIEditJob } from "@/types/ai-edit";
import type { VideoProjectWithMedia } from "@/types/video";
import { AIEditHistory } from "@/components/video/ai-edit-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AIEditPanelProps {
  project: VideoProjectWithMedia;
  onJobCreated?: (job: AIEditJob) => void;
}

type StyleValue = "cinematic" | "professional" | "energetic";
type EffectValue = "color_grade" | "stabilize" | "transitions";

const effectOptions: Array<{ value: EffectValue; label: string }> = [
  { value: "color_grade", label: "カラーグレーディング" },
  { value: "stabilize", label: "手ブレ補正" },
  { value: "transitions", label: "トランジション" },
];

export function AIEditPanel({ project, onJobCreated }: AIEditPanelProps) {
  const { toast } = useToast();
  const [style, setStyle] = useState<StyleValue>("professional");
  const [prompt, setPrompt] = useState("");
  const [effects, setEffects] = useState<EffectValue[]>([]);
  const [jobs, setJobs] = useState<AIEditJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const data = await listAIEditJobs(project.id);
      setJobs(data);
    } catch {
      setJobs([]);
      setError("AI編集ジョブ履歴の取得に失敗しました。");
    } finally {
      setIsLoadingJobs(false);
    }
  }, [project.id]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const toggleEffect = (effect: EffectValue) => {
    setEffects((prev) =>
      prev.includes(effect) ? prev.filter((item) => item !== effect) : [...prev, effect]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("編集指示を入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const job = await createAIEditJob({
        video_project_id: project.id,
        input_config: {
          style,
          prompt: trimmedPrompt,
          effects,
        },
      });

      if (!job) {
        throw new Error("AI編集ジョブの作成に失敗しました。");
      }

      setJobs((prev) => [job, ...prev]);
      onJobCreated?.(job);
      setPrompt("");
      toast({
        title: "AI編集",
        description: "AI編集ジョブを作成しました。",
      });
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "AI編集ジョブの作成に失敗しました。";
      setError(message);
      toast({
        title: "AI編集",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-neutral-200">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-[#1D3557]">AI動画編集</CardTitle>
            <Badge className="border-transparent bg-[#1D3557]/10 text-[#1D3557]">
              プロジェクト: {project.title}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="ai-edit-style">編集スタイル</Label>
              <Select value={style} onValueChange={(value: StyleValue) => setStyle(value)}>
                <SelectTrigger id="ai-edit-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinematic">シネマティック</SelectItem>
                  <SelectItem value="professional">プロフェッショナル</SelectItem>
                  <SelectItem value="energetic">エネルギッシュ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-edit-prompt">編集指示</Label>
              <Textarea
                id="ai-edit-prompt"
                rows={5}
                placeholder="例: テンポを速めて、冒頭3秒にタイトルを入れてください。"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>エフェクト</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {effectOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-md border border-neutral-200 p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-300"
                      checked={effects.includes(option.value)}
                      onChange={() => toggleEffect(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#1D3557] text-white hover:bg-[#122540]"
            >
              {isSubmitting ? "作成中..." : "AI編集ジョブを作成"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-neutral-200">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-[#1D3557]">AI編集履歴</CardTitle>
            <Button type="button" variant="outline" onClick={() => void loadJobs()}>
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingJobs ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : (
            <AIEditHistory jobs={jobs} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
