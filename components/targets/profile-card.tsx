"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Facebook,
  MessageCircle,
  Music2,
  Pencil,
  Trash2,
  Twitter,
  Youtube,
  Instagram,
} from "lucide-react";
import type {
  PersonaCategory,
  TargetProfile,
  TargetProfileStatus,
  UpdateTargetProfileRequest,
} from "@/types/targets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProfileCardProps = {
  profile: TargetProfile;
  onUpdated?: (profile: TargetProfile) => void;
  onDeleted?: (profileId: string) => void;
};

type EditFormState = {
  display_name: string;
  bio: string;
  follower_count: string;
  persona_category: PersonaCategory;
  status: TargetProfileStatus;
  notes: string;
};

const personaLabelMap: Record<PersonaCategory, string> = {
  trainer_candidate: "トレーナー候補",
  competitor_staff: "競合スタッフ",
  industry_influencer: "業界インフルエンサー",
  potential_applicant: "応募可能性",
};

const statusLabelMap: Record<TargetProfileStatus, string> = {
  active: "アクティブ",
  contacted: "コンタクト済み",
  applied: "応募済み",
  archived: "アーカイブ",
};

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "instagram":
      return Instagram;
    case "youtube":
      return Youtube;
    case "x":
      return Twitter;
    case "tiktok":
      return Music2;
    case "facebook":
      return Facebook;
    case "line":
      return MessageCircle;
    default:
      return Camera;
  }
}

function getStatusClass(status: TargetProfileStatus) {
  if (status === "active") {
    return "border-transparent bg-primary/10 text-primary";
  }
  if (status === "contacted") {
    return "border-transparent bg-secondary text-secondary-foreground";
  }
  if (status === "applied") {
    return "border-transparent bg-accent text-accent-foreground";
  }
  return "border-transparent bg-muted text-muted-foreground";
}

function getScoreClass(score: number) {
  if (score >= 80) {
    return "border-transparent bg-primary/10 text-primary";
  }
  if (score >= 60) {
    return "border-transparent bg-secondary text-secondary-foreground";
  }
  if (score >= 40) {
    return "border-transparent bg-accent text-accent-foreground";
  }
  return "border-transparent bg-destructive/10 text-destructive";
}

export function ProfileCard({ profile, onUpdated, onDeleted }: ProfileCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<EditFormState>({
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    follower_count:
      typeof profile.follower_count === "number" ? String(profile.follower_count) : "",
    persona_category: profile.persona_category,
    status: profile.status,
    notes: profile.notes ?? "",
  });

  const PlatformIcon = useMemo(() => getPlatformIcon(profile.platform), [profile.platform]);

  const handleSave = async () => {
    setUpdating(true);
    setError("");

    const payload: UpdateTargetProfileRequest = {
      display_name: form.display_name.trim() || undefined,
      bio: form.bio.trim() || undefined,
      follower_count: form.follower_count ? Number(form.follower_count) : undefined,
      persona_category: form.persona_category,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };

    try {
      const response = await fetch(`/api/targets/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "プロフィールの更新に失敗しました");
      }

      const body = (await response.json()) as { data: TargetProfile };
      onUpdated?.(body.data);
      setOpen(false);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "プロフィールの更新に失敗しました"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("このプロフィールを削除しますか？");
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/targets/profiles/${profile.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "プロフィールの削除に失敗しました");
      }
      onDeleted?.(profile.id);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "プロフィールの削除に失敗しました"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PlatformIcon className="h-4 w-4 text-muted-foreground" />
              <p className="text-base font-semibold text-foreground">
                {profile.display_name ?? profile.username ?? "名称未設定"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username ?? "-"}</p>
            <p className="break-all text-sm text-muted-foreground">
              {profile.profile_url ?? "URL未設定"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getScoreClass(profile.ai_score)}>スコア {profile.ai_score}</Badge>
            <Badge className={getStatusClass(profile.status)}>
              {statusLabelMap[profile.status]}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <div>
            <p className="mb-1 text-xs">フォロワー数</p>
            <p className="font-medium text-foreground">
              {typeof profile.follower_count === "number"
                ? profile.follower_count.toLocaleString("ja-JP")
                : "-"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs">カテゴリ</p>
            <p className="font-medium text-foreground">
              {personaLabelMap[profile.persona_category]}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs">ソース</p>
            <p className="font-medium text-foreground">{profile.source}</p>
          </div>
        </div>

        {profile.bio && <p className="text-sm leading-6 text-muted-foreground">{profile.bio}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="プロフィールを編集"
              >
                <Pencil className="h-4 w-4" />
                編集
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>プロフィール編集</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`profile-display-name-${profile.id}`}>表示名</Label>
                  <Input
                    id={`profile-display-name-${profile.id}`}
                    aria-label="表示名"
                    value={form.display_name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, display_name: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`profile-follower-count-${profile.id}`}>フォロワー数</Label>
                  <Input
                    id={`profile-follower-count-${profile.id}`}
                    aria-label="フォロワー数"
                    type="number"
                    min={0}
                    value={form.follower_count}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, follower_count: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`profile-persona-${profile.id}`}>カテゴリ</Label>
                  <select
                    id={`profile-persona-${profile.id}`}
                    aria-label="カテゴリ"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.persona_category}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        persona_category: event.target.value as PersonaCategory,
                      }))
                    }
                  >
                    <option value="trainer_candidate">trainer_candidate</option>
                    <option value="competitor_staff">competitor_staff</option>
                    <option value="industry_influencer">industry_influencer</option>
                    <option value="potential_applicant">potential_applicant</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`profile-status-${profile.id}`}>ステータス</Label>
                  <select
                    id={`profile-status-${profile.id}`}
                    aria-label="ステータス"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.value as TargetProfileStatus,
                      }))
                    }
                  >
                    <option value="active">active</option>
                    <option value="contacted">contacted</option>
                    <option value="applied">applied</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`profile-bio-${profile.id}`}>自己紹介</Label>
                  <Textarea
                    id={`profile-bio-${profile.id}`}
                    aria-label="自己紹介"
                    rows={4}
                    value={form.bio}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, bio: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`profile-notes-${profile.id}`}>メモ</Label>
                  <Textarea
                    id={`profile-notes-${profile.id}`}
                    aria-label="メモ"
                    rows={3}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => void handleSave()}
                  disabled={updating}
                  aria-label="プロフィールを保存"
                >
                  {updating ? "保存中..." : "保存"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={deleting}
            aria-label="プロフィールを削除"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "削除中..." : "削除"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
