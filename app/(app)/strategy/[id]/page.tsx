import Link from "next/link";
import { getCalendar, getCalendarTasks } from "@/lib/actions/strategy";
import { getTargetLists } from "@/lib/actions/targets";
import { CalendarView } from "@/components/strategy/calendar-view";
import { CalendarActions, TaskCard } from "@/components/strategy/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentCalendar } from "@/types/strategy";

interface StrategyDetailPageProps {
  params: {
    id: string;
  };
}

const calendarStatusLabel: Record<ContentCalendar["status"], string> = {
  draft: "下書き",
  approved: "承認済み",
  in_progress: "進行中",
  completed: "完了",
};

const calendarStatusClass: Record<ContentCalendar["status"], string> = {
  draft: "bg-neutral-100 text-muted-foreground border-transparent",
  approved: "bg-blue-100 text-blue-800 border-transparent",
  in_progress: "bg-yellow-100 text-yellow-800 border-transparent",
  completed: "bg-green-100 text-green-800 border-transparent",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ja-JP");
}

export default async function StrategyDetailPage({ params }: StrategyDetailPageProps) {
  const [calendar, tasks, targetLists] = await Promise.all([
    getCalendar(params.id),
    getCalendarTasks(params.id),
    getTargetLists(),
  ]);

  if (!calendar) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">コンテンツ戦略</h1>
          <Button asChild variant="outline">
            <Link href="/strategy">一覧に戻る</Link>
          </Button>
        </div>
        <Card className="rounded-md shadow-sm">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            カレンダーが見つかりませんでした。
          </CardContent>
        </Card>
      </div>
    );
  }

  const listNameMap = new Map(targetLists.map((list) => [list.id, list.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">コンテンツ戦略</h1>
          <p className="text-sm text-muted-foreground">
            週開始日: {formatDate(calendar.week_start)} / ターゲットリスト:{" "}
            {calendar.target_list_id
              ? listNameMap.get(calendar.target_list_id) || "-"
              : "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={calendarStatusClass[calendar.status]}>
            {calendarStatusLabel[calendar.status]}
          </Badge>
          <Button asChild variant="outline">
            <Link href="/strategy">一覧に戻る</Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>戦略概要</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {calendar.strategy_text || "戦略テキストはありません。"}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle>週間カレンダー</CardTitle>
          <CalendarActions
            calendarId={calendar.id}
            calendarStatus={calendar.status}
            taskCount={tasks.length}
          />
        </CardHeader>
        <CardContent>
          <CalendarView entries={calendar.calendar_json || []} />
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>タスクリスト</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">タスクはまだありません。</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
