import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importGiftCodes } from "@/lib/actions/gifts";

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const campaignId = formData.get("campaign_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Skip header row if it looks like one
    const startIndex = lines[0]?.toLowerCase().includes("code") ? 1 : 0;

    const codes: { code: string; gift_type: string; amount_yen: number | null }[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts[0]) {
        codes.push({
          code: parts[0],
          gift_type: parts[1] || "amazon",
          amount_yen: parts[2] ? parseInt(parts[2], 10) : null,
        });
      }
    }

    if (codes.length === 0) {
      return NextResponse.json({ error: "No valid codes found in CSV" }, { status: 400 });
    }

    const result = await importGiftCodes({
      campaign_id: campaignId || undefined,
      codes,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
