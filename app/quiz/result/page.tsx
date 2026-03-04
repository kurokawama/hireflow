import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QuizResultPageProps = {
  searchParams: {
    id?: string | string[];
  };
};

type CandidateSummary = {
  id: string;
  ai_score: number | null;
  matched_store_id: string | null;
  store_id: string | null;
};

type StoreSummary = {
  id: string;
  store_name: string;
  brand: "dr_stretch" | "wecle" | string;
  location_text: string;
};

function scoreToStars(score: number | null | undefined) {
  const safeScore = score ?? 50;
  let starCount = 3;

  if (safeScore >= 85) {
    starCount = 5;
  } else if (safeScore >= 65) {
    starCount = 4;
  } else if (safeScore >= 45) {
    starCount = 3;
  } else if (safeScore >= 25) {
    starCount = 2;
  } else {
    starCount = 1;
  }

  return `${"★".repeat(starCount)}${"☆".repeat(5 - starCount)}`;
}

function brandBadgeClass(brand: StoreSummary["brand"]) {
  if (brand === "dr_stretch") {
    return "border-transparent bg-[#E63946]/10 text-[#E63946]";
  }
  return "border-transparent bg-[#6B9080]/15 text-[#48665A]";
}

export default async function QuizResultPage({ searchParams }: QuizResultPageProps) {
  const supabase = createAdminClient();
  const candidateId = Array.isArray(searchParams.id)
    ? searchParams.id[0]
    : searchParams.id;

  let candidate: CandidateSummary | null = null;
  let store: StoreSummary | null = null;

  if (candidateId) {
    const { data: candidateData } = await supabase
      .from("candidates")
      .select("id, ai_score, matched_store_id, store_id")
      .eq("id", candidateId)
      .maybeSingle();

    candidate = (candidateData as CandidateSummary | null) ?? null;

    const matchedStoreId = candidate?.matched_store_id ?? candidate?.store_id;
    if (matchedStoreId) {
      const { data: storeData } = await supabase
        .from("stores")
        .select("id, store_name, brand, location_text")
        .eq("id", matchedStoreId)
        .maybeSingle();
      store = (storeData as StoreSummary | null) ?? null;
    }
  }

  const stars = scoreToStars(candidate?.ai_score);
  const applyUrl = candidateId ? `/apply?candidate_id=${candidateId}` : "/apply";
  const lineUrl = "https://line.me/R/ti/p/@dr-stretch";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF7ED] via-[#FFFBF5] to-white px-4 py-8">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <h1 className="text-center text-2xl font-bold text-[#1D3557]">
          あなたにおすすめの店舗
        </h1>

        <Card className="rounded-md border-[#F4A261]/30 bg-white shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl text-[#1D3557]">
                {store?.store_name ?? "-"}
              </CardTitle>
              {store && <Badge className={brandBadgeClass(store.brand)}>{store.brand}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-700">{store?.location_text ?? "-"}</p>
            <p className="text-lg font-semibold text-[#1D3557]">マッチ度: {stars}</p>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild className="bg-[#E63946] hover:bg-[#C62F3B]">
            <Link href={applyUrl}>応募する</Link>
          </Button>
          <Button asChild variant="outline" className="border-[#6B9080] text-[#48665A]">
            <a href={lineUrl} target="_blank" rel="noreferrer">
              LINEで情報を受け取る
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
