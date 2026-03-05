"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdPlatform, BuildAudienceRequest } from "@/types/ads";

interface TargetListOption {
  id: string;
  name: string;
  profile_count: number;
}

interface AudienceBuilderFormProps {
  platform: AdPlatform;
  targetLists: TargetListOption[];
  isSubmitting?: boolean;
  onSubmit: (payload: BuildAudienceRequest) => void | Promise<void>;
}

const audienceTypeOptions: Array<{
  value: BuildAudienceRequest["audience_type"];
  label: string;
}> = [
  { value: "core", label: "コア（興味関心）" },
  { value: "custom", label: "カスタム（リストベース）" },
  { value: "lookalike", label: "類似（Lookalike）" },
];

function getPlatformLabel(platform: AdPlatform) {
  if (platform === "meta") return "Meta";
  if (platform === "google") return "Google";
  return "X";
}

export function AudienceBuilderForm({
  platform,
  targetLists,
  isSubmitting = false,
  onSubmit,
}: AudienceBuilderFormProps) {
  const [targetListId, setTargetListId] = useState("");
  const [audienceType, setAudienceType] =
    useState<BuildAudienceRequest["audience_type"]>("core");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const selectedList = useMemo(
    () => targetLists.find((list) => list.id === targetListId),
    [targetListId, targetLists]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!targetListId) {
      setError("ターゲットリストを選択してください。");
      return;
    }

    await onSubmit({
      target_list_id: targetListId,
      platform,
      audience_type: audienceType,
      name: name.trim() || undefined,
    });
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-2">
        <Label htmlFor="audience-target-list">ターゲットリスト</Label>
        {targetLists.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-muted-foreground">
            ターゲットリストがありません。先にリストを作成してください。
          </p>
        ) : (
          <Select value={targetListId} onValueChange={setTargetListId}>
            <SelectTrigger id="audience-target-list" aria-label="ターゲットリストを選択">
              <SelectValue placeholder="ターゲットリストを選択" />
            </SelectTrigger>
            <SelectContent>
              {targetLists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}（{list.profile_count}件）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience-platform">配信プラットフォーム</Label>
        <Input id="audience-platform" value={getPlatformLabel(platform)} disabled aria-readonly />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience-type">オーディエンスタイプ</Label>
        <Select
          value={audienceType}
          onValueChange={(value: BuildAudienceRequest["audience_type"]) =>
            setAudienceType(value)
          }
        >
          <SelectTrigger id="audience-type" aria-label="オーディエンスタイプを選択">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {audienceTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience-name">オーディエンス名（任意）</Label>
        <Input
          id="audience-name"
          aria-label="オーディエンス名"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={selectedList ? `${selectedList.name}向け配信` : "例: 20代女性_都内"}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#EF4444]">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
        aria-label="オーディエンスを作成"
        disabled={isSubmitting || targetLists.length === 0}
      >
        {isSubmitting ? "作成中..." : "オーディエンスを作成"}
      </Button>
    </form>
  );
}
