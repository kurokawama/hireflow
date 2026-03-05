import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getTargetList,
  getTargetProfiles,
  createTargetProfile,
} from "@/lib/actions/targets";
import type {
  CreateTargetProfileRequest,
  PersonaCategory,
  TargetProfile,
} from "@/types/targets";
import { ProfileCard } from "@/components/targets/profile-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type ListDetailPageProps = {
  params: { listId: string };
  searchParams?: {
    status?: string;
    error?: string;
  };
};

const personaValues: PersonaCategory[] = [
  "trainer_candidate",
  "competitor_staff",
  "industry_influencer",
  "potential_applicant",
];

async function createProfileAction(listId: string, formData: FormData) {
  "use server";

  const platform = String(formData.get("platform") ?? "").trim();
  const profileUrl = String(formData.get("profile_url") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const followerCountText = String(formData.get("follower_count") ?? "").trim();
  const personaCategory = String(formData.get("persona_category") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const payload: CreateTargetProfileRequest = {
    list_id: listId,
    platform,
    profile_url: profileUrl || undefined,
    username: username || undefined,
    display_name: displayName || undefined,
    bio: bio || undefined,
    follower_count: followerCountText ? Number(followerCountText) : undefined,
    persona_category: personaValues.includes(personaCategory as PersonaCategory)
      ? (personaCategory as PersonaCategory)
      : "potential_applicant",
    notes: notes || undefined,
    source: "manual",
  };

  try {
    await createTargetProfile(payload);
  } catch {
    redirect(`/targets/${listId}?error=${encodeURIComponent("プロフィール追加に失敗しました")}`);
  }

  revalidatePath(`/targets/${listId}`);
  redirect(`/targets/${listId}`);
}

function filterProfilesByStatus(profiles: TargetProfile[], status: string) {
  if (
    status !== "active" &&
    status !== "contacted" &&
    status !== "applied" &&
    status !== "archived"
  ) {
    return profiles;
  }
  return profiles.filter((profile) => profile.status === status);
}

export default async function TargetListDetailPage({
  params,
  searchParams,
}: ListDetailPageProps) {
  const listId = params.listId;
  const statusFilter = searchParams?.status ?? "all";

  const [list, profiles] = await Promise.all([
    getTargetList(listId),
    getTargetProfiles(listId),
  ]);

  if (!list) {
    notFound();
  }

  const filteredProfiles = filterProfilesByStatus(profiles, statusFilter);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/targets" className="hover:text-foreground">
            ターゲットリスト
          </Link>
          <span>{">"}</span>
          <span className="text-foreground">{list.name}</span>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{list.name}</h1>
            <p className="text-sm text-muted-foreground">
              {list.description?.trim() || "説明はありません"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-border text-muted-foreground">
                プロフィール {profiles.length}件
              </Badge>
              {list.brand && (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {list.brand}
                </Badge>
              )}
              {list.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="bg-muted text-foreground">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" aria-label="プロフィール追加を開く">
                  プロフィール追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>プロフィール追加</DialogTitle>
                </DialogHeader>
                <form
                  action={createProfileAction.bind(null, listId)}
                  className="grid gap-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="profile-platform">プラットフォーム</Label>
                    <select
                      id="profile-platform"
                      aria-label="プラットフォーム"
                      name="platform"
                      required
                      defaultValue="instagram"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="instagram">instagram</option>
                      <option value="tiktok">tiktok</option>
                      <option value="youtube">youtube</option>
                      <option value="x">x</option>
                      <option value="facebook">facebook</option>
                      <option value="line">line</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-url">プロフィールURL</Label>
                    <Input
                      id="profile-url"
                      aria-label="プロフィールURL"
                      name="profile_url"
                      type="url"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profile-username">ユーザー名</Label>
                      <Input
                        id="profile-username"
                        aria-label="ユーザー名"
                        name="username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-display-name">表示名</Label>
                      <Input
                        id="profile-display-name"
                        aria-label="表示名"
                        name="display_name"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profile-follower-count">フォロワー数</Label>
                      <Input
                        id="profile-follower-count"
                        aria-label="フォロワー数"
                        name="follower_count"
                        type="number"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-persona-category">ペルソナカテゴリ</Label>
                      <select
                        id="profile-persona-category"
                        aria-label="ペルソナカテゴリ"
                        name="persona_category"
                        defaultValue="potential_applicant"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="trainer_candidate">trainer_candidate</option>
                        <option value="competitor_staff">competitor_staff</option>
                        <option value="industry_influencer">industry_influencer</option>
                        <option value="potential_applicant">potential_applicant</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-bio">自己紹介</Label>
                    <Textarea id="profile-bio" aria-label="自己紹介" name="bio" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-notes">メモ</Label>
                    <Textarea id="profile-notes" aria-label="メモ" name="notes" rows={3} />
                  </div>
                  <Button type="submit" className="w-full" aria-label="プロフィール追加">
                    プロフィール追加
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button asChild aria-label="YouTube検索ページへ移動">
              <Link href={`/targets/${listId}/search`}>YouTube検索</Link>
            </Button>
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="ステータスフィルタ">
        <Link
          href={`/targets/${listId}`}
          className={[
            "rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            statusFilter === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          全て
        </Link>
        <Link
          href={`/targets/${listId}?status=active`}
          className={[
            "rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            statusFilter === "active"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          アクティブ
        </Link>
        <Link
          href={`/targets/${listId}?status=contacted`}
          className={[
            "rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            statusFilter === "contacted"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          コンタクト済み
        </Link>
        <Link
          href={`/targets/${listId}?status=applied`}
          className={[
            "rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            statusFilter === "applied"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          応募済み
        </Link>
        <Link
          href={`/targets/${listId}?status=archived`}
          className={[
            "rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            statusFilter === "archived"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          アーカイブ
        </Link>
      </nav>

      {searchParams?.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {decodeURIComponent(searchParams.error)}
        </p>
      )}

      {filteredProfiles.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            プロフィールがまだありません。プロフィール追加またはYouTube検索から登録してください。
          </p>
        </div>
      )}

      {filteredProfiles.length > 0 && (
        <div className="grid gap-4">
          {filteredProfiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
