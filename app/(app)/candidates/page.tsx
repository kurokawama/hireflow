import Link from "next/link";
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
import type { CandidateStage } from "@/types/database";

type CandidateRow = {
  id: string;
  name: string | null;
  source_channel: string;
  ai_score: number;
  stage: CandidateStage;
  area: string;
  created_at: string;
};

const stageColorMap: Record<CandidateStage, string> = {
  quiz_completed: "bg-neutral-100 text-neutral-700 border-transparent",
  line_followed: "bg-cyan-100 text-cyan-800 border-transparent",
  ticket_issued: "bg-amber-100 text-amber-800 border-transparent",
  ticket_redeemed: "bg-teal-100 text-teal-800 border-transparent",
  contacted: "bg-indigo-100 text-indigo-800 border-transparent",
  applied: "bg-blue-100 text-blue-800 border-transparent",
  interviewed: "bg-purple-100 text-purple-800 border-transparent",
  hired: "bg-green-100 text-green-800 border-transparent",
  rejected: "bg-red-100 text-red-800 border-transparent",
};

function getScoreClass(score: number) {
  if (score >= 80) return "bg-green-100 text-green-800 border-transparent";
  if (score >= 50) return "bg-yellow-100 text-yellow-800 border-transparent";
  return "bg-neutral-100 text-neutral-700 border-transparent";
}

function getAreaFromQuizAnswers(quizAnswers: Record<string, unknown> | null) {
  if (!quizAnswers || typeof quizAnswers !== "object") return "-";
  const area = quizAnswers.area;
  if (typeof area === "string" && area.length > 0) return area;
  return "-";
}

export default async function CandidatesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .select("id, name, source_channel, ai_score, stage, quiz_answers, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const mockRows: CandidateRow[] = [
    {
      id: "mock-candidate-1",
      name: "Sato Hana",
      source_channel: "organic",
      ai_score: 86,
      stage: "interviewed",
      area: "Shibuya",
      created_at: new Date().toISOString(),
    },
    {
      id: "mock-candidate-2",
      name: "Suzuki Kenta",
      source_channel: "meta_ad",
      ai_score: 66,
      stage: "applied",
      area: "Shinjuku",
      created_at: new Date().toISOString(),
    },
    {
      id: "mock-candidate-3",
      name: "Tanaka Mei",
      source_channel: "line",
      ai_score: 42,
      stage: "line_followed",
      area: "Ikebukuro",
      created_at: new Date().toISOString(),
    },
  ];

  const rows: CandidateRow[] = error
    ? mockRows
    : (data || []).map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        source_channel: candidate.source_channel,
        ai_score: candidate.ai_score,
        stage: candidate.stage,
        area: getAreaFromQuizAnswers(candidate.quiz_answers as Record<string, unknown>),
        created_at: candidate.created_at,
      }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-900">候補者プール</h1>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>候補者プール</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>ソース</TableHead>
                <TableHead>スコア</TableHead>
                <TableHead>ステージ</TableHead>
                <TableHead>エリア</TableHead>
                <TableHead>日付</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/candidates/${row.id}`} className="hover:underline">
                      {row.name || "不明"}
                    </Link>
                  </TableCell>
                  <TableCell>{row.source_channel}</TableCell>
                  <TableCell>
                    <Badge className={getScoreClass(row.ai_score)}>{row.ai_score}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={stageColorMap[row.stage]}>{row.stage}</Badge>
                  </TableCell>
                  <TableCell>{row.area}</TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
