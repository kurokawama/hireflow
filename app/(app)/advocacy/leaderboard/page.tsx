import Link from "next/link";
import { LeaderboardTable } from "@/components/advocacy/leaderboard-table";
import { Button } from "@/components/ui/button";

export default function AdvocacyLeaderboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">シェアランキング</h1>
        <Button asChild variant="outline">
          <Link href="/advocacy" aria-label="投稿キット一覧へ戻る">
            キット一覧へ戻る
          </Link>
        </Button>
      </div>

      <LeaderboardTable defaultPeriod="month" />
    </div>
  );
}
