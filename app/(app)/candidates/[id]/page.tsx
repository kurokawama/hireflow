import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { CandidateStage } from "@/types/database";

interface CandidateDetailPageProps {
  params: {
    id: string;
  };
}

const candidateStages: CandidateStage[] = [
  "quiz_completed",
  "line_followed",
  "contacted",
  "applied",
  "interviewed",
  "hired",
  "rejected",
];

const stageColorMap: Record<CandidateStage, string> = {
  quiz_completed: "bg-neutral-100 text-neutral-700 border-transparent",
  line_followed: "bg-cyan-100 text-cyan-800 border-transparent",
  contacted: "bg-indigo-100 text-indigo-800 border-transparent",
  applied: "bg-blue-100 text-blue-800 border-transparent",
  interviewed: "bg-purple-100 text-purple-800 border-transparent",
  hired: "bg-green-100 text-green-800 border-transparent",
  rejected: "bg-red-100 text-red-800 border-transparent",
};

function toRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function getScoreClass(score: number) {
  if (score >= 80) return "bg-green-100 text-green-800 border-transparent";
  if (score >= 50) return "bg-yellow-100 text-yellow-800 border-transparent";
  return "bg-neutral-100 text-neutral-700 border-transparent";
}

export default async function CandidateDetailPage({ params }: CandidateDetailPageProps) {
  const supabase = await createClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", params.id)
    .single();

  async function updateNotesAction(formData: FormData) {
    "use server";
    const notes = String(formData.get("notes") || "");
    const supabaseAction = await createClient();
    await supabaseAction.from("candidates").update({ notes }).eq("id", params.id);
    revalidatePath(`/candidates/${params.id}`);
  }

  if (!candidate) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-neutral-900">候補者プール</h1>
        <Card className="rounded-md shadow-sm">
          <CardContent className="pt-6">Not found</CardContent>
        </Card>
      </div>
    );
  }

  const quizAnswers = toRecord(candidate.quiz_answers);
  const scoreFactors = toRecord(candidate.score_factors);
  const candidateStage: CandidateStage = candidateStages.includes(
    candidate.stage as CandidateStage
  )
    ? (candidate.stage as CandidateStage)
    : "quiz_completed";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-900">候補者プール</h1>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>Candidate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <p>
              <span className="font-medium">name:</span> {candidate.name || "-"}
            </p>
            <p>
              <span className="font-medium">email:</span> {candidate.email || "-"}
            </p>
            <p>
              <span className="font-medium">phone:</span> {candidate.phone || "-"}
            </p>
            <p>
              <span className="font-medium">line_id:</span> {candidate.line_user_id || "-"}
            </p>
            <p className="md:col-span-2">
              <span className="font-medium">source_channel:</span> {candidate.source_channel}
            </p>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Badge className={getScoreClass(candidate.ai_score)}>score {candidate.ai_score}</Badge>
            <Badge className={stageColorMap[candidateStage]}>{candidateStage}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>Quiz Answers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {Object.entries(quizAnswers).length === 0 && <p>-</p>}
            {Object.entries(quizAnswers).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[180px_1fr] gap-3">
                <p className="font-medium">{key}</p>
                <p className="break-words">{String(value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>Score Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {Object.entries(scoreFactors).length === 0 && <p>-</p>}
            {Object.entries(scoreFactors).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[180px_1fr] gap-3">
                <p className="font-medium">{key}</p>
                <p className="break-words">{String(value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>Stage Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {candidateStages.map((stage) => {
              const isCurrent = stage === candidateStage;
              return (
                <Badge
                  key={stage}
                  className={isCurrent ? stageColorMap[stage] : "bg-neutral-50 text-neutral-500"}
                >
                  {stage}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>メモ</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateNotesAction} className="space-y-3">
            <Textarea name="notes" defaultValue={candidate.notes || ""} className="min-h-[140px]" />
            <Button type="submit">Update</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
