import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { KitStatus, PostingKit } from "@/types/advocacy";

interface KitCardProps {
  kit: PostingKit;
}

const statusLabelMap: Record<KitStatus, string> = {
  draft: "下書き",
  scheduled: "予約済み",
  distributed: "配布済み",
  archived: "アーカイブ",
};

const statusClassMap: Record<KitStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700 border-transparent",
  scheduled: "bg-blue-100 text-blue-800 border-transparent",
  distributed: "bg-green-100 text-green-800 border-transparent",
  archived: "bg-neutral-200 text-neutral-700 border-transparent",
};

function truncateTheme(theme: string) {
  if (theme.length <= 90) return theme;
  return `${theme.slice(0, 90)}...`;
}

export function KitCard({ kit }: KitCardProps) {
  return (
    <Card className="h-full rounded-md border-border bg-card shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-6 text-foreground">{kit.title}</CardTitle>
          <Badge className={statusClassMap[kit.status]}>{statusLabelMap[kit.status]}</Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{truncateTheme(kit.theme)}</p>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">ヒント数</dt>
            <dd className="font-semibold text-foreground">{kit.hints.length}件</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ハッシュタグ</dt>
            <dd className="font-semibold text-foreground">{kit.hashtags.length}件</dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter>
        <Link
          href={`/advocacy/${kit.id}`}
          aria-label={`${kit.title}の詳細を表示`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          詳細を見る
        </Link>
      </CardFooter>
    </Card>
  );
}
