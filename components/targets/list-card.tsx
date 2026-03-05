import Link from "next/link";
import type { TargetList } from "@/types/targets";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ListCardProps = {
  list: TargetList;
};

const brandLabelMap: Record<string, string> = {
  dr_stretch: "Dr.Stretch",
  wecle: "Wecle",
};

export function ListCard({ list }: ListCardProps) {
  const brandLabel = list.brand ? (brandLabelMap[list.brand] ?? list.brand) : "未設定";

  return (
    <Card className="h-full border-border bg-card shadow-sm transition-shadow motion-reduce:transition-none hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-6 text-foreground">
            <Link
              href={`/targets/${list.id}`}
              aria-label={`${list.name}の詳細へ移動`}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors motion-reduce:transition-none hover:text-primary"
            >
              {list.name}
            </Link>
          </CardTitle>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {list.profile_count}件
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={[
              "border-border",
              list.brand === "dr_stretch" ? "text-primary" : "",
              list.brand === "wecle" ? "text-foreground" : "",
              !list.brand ? "text-muted-foreground" : "",
            ].join(" ")}
          >
            {brandLabel}
          </Badge>
          {list.platform_filter.length > 0 && (
            <Badge variant="outline" className="border-border text-muted-foreground">
              {list.platform_filter.join(" / ")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="min-h-10 text-sm leading-6 text-muted-foreground">
          {list.description?.trim() || "説明はありません"}
        </p>
        <div className="flex flex-wrap gap-2">
          {list.keywords.length > 0 ? (
            list.keywords.map((keyword) => (
              <Badge
                key={`${list.id}-${keyword}`}
                variant="secondary"
                className="bg-muted text-foreground"
              >
                {keyword}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">キーワード未設定</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
