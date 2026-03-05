import Link from "next/link";
import { headers } from "next/headers";
import { KitCard } from "@/components/advocacy/kit-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KitStatus, PostingKit } from "@/types/advocacy";

type SearchParamValue = string | string[] | undefined;

interface AdvocacyPageProps {
  searchParams?: Record<string, SearchParamValue>;
}

type KitBrand = "dr_stretch" | "wecle";

const statusLabelMap: Record<KitStatus | "all", string> = {
  all: "すべて",
  draft: "下書き",
  scheduled: "予約済み",
  distributed: "配布済み",
  archived: "アーカイブ",
};

const brandLabelMap: Record<KitBrand | "all", string> = {
  all: "すべて",
  dr_stretch: "Dr.Stretch",
  wecle: "Wecle",
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function isStatus(value: string): value is KitStatus {
  return ["draft", "scheduled", "distributed", "archived"].includes(value);
}

function isBrand(value: string): value is KitBrand {
  return ["dr_stretch", "wecle"].includes(value);
}

function createFilterHref(status: KitStatus | "all", brand: KitBrand | "all") {
  const query = new URLSearchParams();
  if (status !== "all") query.set("status", status);
  if (brand !== "all") query.set("brand", brand);
  const queryString = query.toString();
  return queryString ? `/advocacy?${queryString}` : "/advocacy";
}

async function getBaseUrl() {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") || "http";
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost || headerList.get("host");
  if (host) {
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export const dynamic = "force-dynamic";

export default async function AdvocacyPage({ searchParams }: AdvocacyPageProps) {
  const statusRaw = normalizeParam(searchParams?.status) || "all";
  const brandRaw = normalizeParam(searchParams?.brand) || "all";

  const selectedStatus: KitStatus | "all" = isStatus(statusRaw) ? statusRaw : "all";
  const selectedBrand: KitBrand | "all" = isBrand(brandRaw) ? brandRaw : "all";

  const query = new URLSearchParams();
  if (selectedStatus !== "all") query.set("status", selectedStatus);
  if (selectedBrand !== "all") query.set("brand", selectedBrand);

  let kits: PostingKit[] = [];
  let errorMessage = "";

  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/advocacy/kits?${query.toString()}`, {
      cache: "no-store",
    });
    const json = (await response.json()) as { data?: PostingKit[]; error?: string };
    if (!response.ok || !json.data) {
      errorMessage = json.error || "きっかけキットの取得に失敗しました。";
    } else {
      kits = json.data;
    }
  } catch {
    errorMessage = "きっかけキットの取得に失敗しました。";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">投稿きっかけキット</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/advocacy/leaderboard" aria-label="シェアランキングを表示">
              シェアランキング
            </Link>
          </Button>
          <Button asChild>
            <Link href="/advocacy/new" aria-label="新しいキットを生成">
              新規キット生成
            </Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-md shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle>絞り込み</CardTitle>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">ステータス</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(statusLabelMap) as Array<KitStatus | "all">).map((status) => (
                  <Button key={status} asChild variant={selectedStatus === status ? "default" : "outline"} size="sm">
                    <Link href={createFilterHref(status, selectedBrand)} aria-label={`ステータス: ${statusLabelMap[status]}`}>
                      {statusLabelMap[status]}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">ブランド</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(brandLabelMap) as Array<KitBrand | "all">).map((brand) => (
                  <Button key={brand} asChild variant={selectedBrand === brand ? "default" : "outline"} size="sm">
                    <Link href={createFilterHref(selectedStatus, brand)} aria-label={`ブランド: ${brandLabelMap[brand]}`}>
                      {brandLabelMap[brand]}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {errorMessage ? (
        <Card className="rounded-md shadow-sm">
          <CardContent className="pt-6">
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          </CardContent>
        </Card>
      ) : kits.length === 0 ? (
        <Card className="rounded-md shadow-sm">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">
              条件に一致するキットはありません。新規作成して配布を始めましょう。
            </p>
            <Button asChild size="sm">
              <Link href="/advocacy/new" aria-label="キット作成ページへ移動">
                キットを作成する
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kits.map((kit) => (
            <KitCard key={kit.id} kit={kit} />
          ))}
        </div>
      )}
    </div>
  );
}
