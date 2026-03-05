import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { CreateTargetListRequest, TargetList } from "@/types/targets";
import { ListCard } from "@/components/targets/list-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type TargetsPageProps = {
  searchParams?: {
    brand?: string;
    error?: string;
  };
};

function getApiBaseUrl() {
  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  if (!host) {
    throw new Error("Host header is missing");
  }
  return `${protocol}://${host}`;
}

async function getTargetListsByApi() {
  const response = await fetch(`${getApiBaseUrl()}/api/targets/lists`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "ターゲットリストの取得に失敗しました");
  }

  const body = (await response.json()) as { data: TargetList[] };
  return body.data ?? [];
}

async function createTargetListAction(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const keywordText = String(formData.get("keywords") ?? "");
  const platformFilter = formData
    .getAll("platform_filter")
    .map((platform) => String(platform))
    .filter(Boolean);

  const payload: CreateTargetListRequest = {
    name,
    description: description || undefined,
    brand: brand || undefined,
    keywords: keywordText
      .split(/[,、]/)
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    platform_filter: platformFilter,
  };

  const response = await fetch(`${getApiBaseUrl()}/api/targets/lists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    const message = body?.error ?? "リスト作成に失敗しました";
    redirect(`/targets?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/targets");
  redirect("/targets");
}

function getBrandLabel(brand: string | null) {
  if (brand === "dr_stretch") {
    return "Dr.Stretch";
  }
  if (brand === "wecle") {
    return "Wecle";
  }
  return "全て";
}

export default async function TargetsPage({ searchParams }: TargetsPageProps) {
  const selectedBrand =
    searchParams?.brand === "dr_stretch" || searchParams?.brand === "wecle"
      ? searchParams.brand
      : "all";

  let lists: TargetList[] = [];
  let loadError = "";

  try {
    lists = await getTargetListsByApi();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "ターゲットリストの取得に失敗しました";
  }

  const filteredLists =
    selectedBrand === "all" ? lists : lists.filter((list) => list.brand === selectedBrand);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">ターゲットリスト</h1>
          <p className="text-sm text-muted-foreground">
            個人SNSアカウントをCRM形式で管理する一覧画面です。
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button aria-label="新規リスト作成を開く">新規リスト作成</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規リスト作成</DialogTitle>
            </DialogHeader>
            <form action={createTargetListAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-list-name">名前</Label>
                <Input
                  id="target-list-name"
                  aria-label="名前"
                  name="name"
                  required
                  placeholder="例: YouTube候補リスト"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-list-description">説明</Label>
                <Textarea
                  id="target-list-description"
                  aria-label="説明"
                  name="description"
                  rows={3}
                  placeholder="リストの目的を入力"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-list-brand">ブランド</Label>
                <select
                  id="target-list-brand"
                  aria-label="ブランド"
                  name="brand"
                  defaultValue=""
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">未設定</option>
                  <option value="dr_stretch">Dr.Stretch</option>
                  <option value="wecle">Wecle</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-list-keywords">キーワード</Label>
                <Input
                  id="target-list-keywords"
                  aria-label="キーワード"
                  name="keywords"
                  placeholder="例: ストレッチ, 健康, トレーナー"
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">プラットフォームフィルタ</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {["instagram", "tiktok", "youtube", "x", "facebook", "line"].map(
                    (platform) => (
                      <label
                        key={platform}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          name="platform_filter"
                          value={platform}
                          aria-label={`${platform}を選択`}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span>{platform}</span>
                      </label>
                    )
                  )}
                </div>
              </fieldset>
              <Button type="submit" className="w-full" aria-label="新規リスト作成">
                新規リスト作成
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <nav className="flex flex-wrap items-center gap-2" aria-label="ブランドフィルタ">
        <Link
          href="/targets"
          aria-label="全てで絞り込み"
          className={[
            "rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selectedBrand === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          全て
        </Link>
        <Link
          href="/targets?brand=dr_stretch"
          aria-label="Dr.Stretchで絞り込み"
          className={[
            "rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selectedBrand === "dr_stretch"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Dr.Stretch
        </Link>
        <Link
          href="/targets?brand=wecle"
          aria-label="Wecleで絞り込み"
          className={[
            "rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selectedBrand === "wecle"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Wecle
        </Link>
      </nav>

      {searchParams?.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {decodeURIComponent(searchParams.error)}
        </p>
      )}

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      )}

      {!loadError && filteredLists.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            まだターゲットリストがありません。新規作成してください。
          </p>
        </div>
      )}

      {!loadError && filteredLists.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredLists.map((list) => (
            <div key={list.id} aria-label={`${getBrandLabel(list.brand)}のターゲットリスト`}>
              <ListCard list={list} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
