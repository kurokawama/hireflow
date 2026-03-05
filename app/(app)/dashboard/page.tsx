import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ChannelRow = {
  channel: string;
  clicks: number;
  applications: number;
};

function getStartOfWeekIso() {
  const now = new Date();
  const currentDay = now.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const weekStart = getStartOfWeekIso();

  const mockKpi = {
    generations: 42,
    clicks: 318,
    quizCompletions: 74,
    applications: 19,
  };

  const channelLabelMap: Record<string, string> = {
    organic: "オーガニック検索",
    meta_ad: "Meta広告",
    line: "LINE",
    direct: "ダイレクト",
  };

  const mockChannelRows: ChannelRow[] = [
    { channel: "organic", clicks: 142, applications: 9 },
    { channel: "meta_ad", clicks: 108, applications: 6 },
    { channel: "line", clicks: 44, applications: 3 },
    { channel: "direct", clicks: 24, applications: 1 },
  ];

  const [
    generationsResult,
    clicksResult,
    quizCompletionsResult,
    applicationsResult,
    clickChannelsResult,
    applicationChannelsResult,
  ] = await Promise.all([
    supabase
      .from("generation_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart),
    supabase
      .from("apply_links")
      .select("click_count")
      .gte("created_at", weekStart),
    supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart),
    supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .in("stage", ["applied", "interviewed", "hired"])
      .gte("created_at", weekStart),
    supabase.from("apply_links").select("channel, click_count").gte("created_at", weekStart),
    supabase
      .from("candidates")
      .select("source_channel, stage, created_at")
      .in("stage", ["applied", "interviewed", "hired"])
      .gte("created_at", weekStart),
  ]);

  const hasSupabaseError =
    Boolean(generationsResult.error) ||
    Boolean(clicksResult.error) ||
    Boolean(quizCompletionsResult.error) ||
    Boolean(applicationsResult.error);

  const clickTotal = (clicksResult.data || []).reduce((sum, row) => {
    return sum + (row.click_count || 0);
  }, 0);

  const channelMap = new Map<string, ChannelRow>(
    ["organic", "meta_ad", "line", "direct"].map((channel) => [
      channel,
      { channel, clicks: 0, applications: 0 },
    ])
  );

  for (const row of clickChannelsResult.data || []) {
    if (!channelMap.has(row.channel)) continue;
    const current = channelMap.get(row.channel)!;
    channelMap.set(row.channel, {
      ...current,
      clicks: current.clicks + (row.click_count || 0),
    });
  }

  for (const row of applicationChannelsResult.data || []) {
    if (!channelMap.has(row.source_channel)) continue;
    const current = channelMap.get(row.source_channel)!;
    channelMap.set(row.source_channel, {
      ...current,
      applications: current.applications + 1,
    });
  }

  const channelRows = hasSupabaseError
    ? mockChannelRows
    : Array.from(channelMap.values());

  const kpi = hasSupabaseError
    ? mockKpi
    : {
        generations: generationsResult.count || 0,
        clicks: clickTotal,
        quizCompletions: quizCompletionsResult.count || 0,
        applications: applicationsResult.count || 0,
      };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900">ダッシュボード</h1>
        {hasSupabaseError && <Badge variant="outline">Mock</Badge>}
      </div>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>今週の実績</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-md shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-500">
                  コンテンツ生成数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-neutral-900">{kpi.generations}</p>
              </CardContent>
            </Card>
            <Card className="rounded-md shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-500">クリック数</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-neutral-900">{kpi.clicks}</p>
              </CardContent>
            </Card>
            <Card className="rounded-md shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-500">診断完了</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-neutral-900">{kpi.quizCompletions}</p>
              </CardContent>
            </Card>
            <Card className="rounded-md shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-500">応募数</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-neutral-900">{kpi.applications}</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>チャネル別実績</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>チャネル</TableHead>
                <TableHead className="text-right">クリック数</TableHead>
                <TableHead className="text-right">応募数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelRows.map((row) => (
                <TableRow key={row.channel}>
                  <TableCell className="font-medium">
                    {channelLabelMap[row.channel] ?? row.channel}
                  </TableCell>
                  <TableCell className="text-right">{row.clicks}</TableCell>
                  <TableCell className="text-right">{row.applications}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
