import type { AIEditJob, AIEditStatus } from "@/types/ai-edit";
import { Badge } from "@/components/ui/badge";

interface AIEditHistoryProps {
  jobs: AIEditJob[];
}

const statusLabelMap: Record<AIEditStatus, string> = {
  pending: "待機中",
  processing: "処理中",
  completed: "完了",
  failed: "失敗",
};

function statusBadgeClass(status: AIEditStatus) {
  if (status === "completed") return "border-transparent bg-green-100 text-green-700";
  if (status === "processing") return "border-transparent bg-amber-100 text-amber-700";
  if (status === "failed") return "border-transparent bg-red-100 text-red-700";
  return "border-transparent bg-neutral-100 text-neutral-700";
}

function formatUsd(cost: number | null) {
  if (cost === null) return "-";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cost);
}

export function AIEditHistory({ jobs }: AIEditHistoryProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
        <p className="text-sm text-muted-foreground">AI編集履歴はありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="relative rounded-md border border-neutral-200 bg-white p-4 pl-6">
          <span className="absolute left-2 top-0 bottom-0 w-px bg-neutral-200" />
          <span className="absolute left-[5px] top-6 h-2.5 w-2.5 rounded-full bg-[#1D3557]" />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#1D3557]">{job.provider.toUpperCase()}</p>
            <Badge className={statusBadgeClass(job.status)}>{statusLabelMap[job.status]}</Badge>
          </div>

          <div className="mt-2 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
            <p>コスト: {formatUsd(job.cost_usd)}</p>
            <p>処理時間: {job.processing_time_seconds ?? "-"} 秒</p>
            <p>作成日時: {new Date(job.created_at).toLocaleString("ja-JP")}</p>
            <p>ジョブID: {job.id}</p>
          </div>

          {job.status === "failed" && job.error_message && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              エラー: {job.error_message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
