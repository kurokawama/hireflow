import type { FunnelStep, FunnelSummary } from "@/types/tracking";

interface FunnelChartProps {
  metrics: FunnelSummary;
}

const STEP_CONFIG: Array<{ key: FunnelStep; label: string; color: string }> = [
  { key: "impression", label: "インプレッション", color: "#C7D3E3" },
  { key: "click", label: "クリック", color: "#A5B8D2" },
  { key: "quiz_start", label: "クイズ開始", color: "#93AACC" },
  { key: "quiz_complete", label: "クイズ完了", color: "#829CBE" },
  { key: "line_follow", label: "LINEフォロー", color: "#6D8BB0" },
  { key: "ticket_issued", label: "チケット発行", color: "#5F80AA" },
  { key: "ticket_redeemed", label: "チケット使用", color: "#3D6495" },
  { key: "interview_book", label: "面接予約", color: "#1D3557" },
];

function formatRate(count: number, base: number) {
  if (base <= 0) return "0.0%";
  return `${((count / base) * 100).toFixed(1)}%`;
}

export function FunnelChart({ metrics }: FunnelChartProps) {
  const impressionCount = metrics.impression ?? 0;

  return (
    <div className="space-y-4">
      {STEP_CONFIG.map((step) => {
        const count = metrics[step.key] ?? 0;
        const percentage = impressionCount > 0 ? (count / impressionCount) * 100 : 0;
        const width = count > 0 ? Math.max(percentage, 8) : 0;

        return (
          <div key={step.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium text-[#1D3557]">{step.label}</p>
              <p className="text-neutral-600">
                {count.toLocaleString("ja-JP")} ({formatRate(count, impressionCount)})
              </p>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(width, 100)}%`,
                  background: `linear-gradient(90deg, ${step.color}, #1D3557)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
