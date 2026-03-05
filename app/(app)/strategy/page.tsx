import Link from "next/link";
import { getCalendars } from "@/lib/actions/strategy";
import { getTargetLists } from "@/lib/actions/targets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentCalendar } from "@/types/strategy";

const calendarStatusLabel: Record<ContentCalendar["status"], string> = {
  draft: "下書き",
  approved: "承認済み",
  in_progress: "進行中",
  completed: "完了",
};

const calendarStatusClass: Record<ContentCalendar["status"], string> = {
  draft: "bg-neutral-100 text-neutral-700 border-transparent",
  approved: "bg-blue-100 text-blue-800 border-transparent",
  in_progress: "bg-yellow-100 text-yellow-800 border-transparent",
  completed: "bg-green-100 text-green-800 border-transparent",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ja-JP");
}

export default async function StrategyPage() {
  const [calendars, targetLists] = await Promise.all([getCalendars(), getTargetLists()]);
  const listNameMap = new Map(targetLists.map((list) => [list.id, list.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">コンテンツ戦略</h1>
        <Button asChild>
          <Link href="/strategy/new" aria-label="新規AI戦略生成">
            新規AI戦略生成
          </Link>
        </Button>
      </div>

      {calendars.length === 0 ? (
        <Card className="rounded-md shadow-sm">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            まだコンテンツカレンダーがありません。AIに戦略を提案してもらいましょう。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {calendars.map((calendar) => (
            <Card key={calendar.id} className="rounded-md shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    週開始日: {formatDate(calendar.week_start)}
                  </CardTitle>
                  <Badge className={calendarStatusClass[calendar.status]}>
                    {calendarStatusLabel[calendar.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  ターゲットリスト:{" "}
                  <span className="font-medium text-foreground">
                    {calendar.target_list_id
                      ? listNameMap.get(calendar.target_list_id) || "-"
                      : "-"}
                  </span>
                </p>
                <Button asChild variant="outline">
                  <Link href={`/strategy/${calendar.id}`} aria-label="カレンダー詳細を表示">
                    詳細を見る
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
