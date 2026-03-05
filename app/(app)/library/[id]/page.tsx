import { revalidatePath } from "next/cache";
import Link from "next/link";
import Script from "next/script";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ContentStatus, RoleType } from "@/types/database";

interface LibraryDetailPageProps {
  params: {
    id: string;
  };
}

const statusLabelMap: Record<ContentStatus, string> = {
  draft: "下書き",
  review: "レビュー中",
  approved: "承認済み",
  posted: "投稿済み",
  rejected: "却下",
};

const statusClassMap: Record<ContentStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700 border-transparent",
  review: "bg-yellow-100 text-yellow-800 border-transparent",
  approved: "bg-green-100 text-green-800 border-transparent",
  posted: "bg-blue-100 text-blue-800 border-transparent",
  rejected: "bg-red-100 text-red-800 border-transparent",
};

function isStatus(value: string): value is ContentStatus {
  return ["draft", "review", "approved", "posted", "rejected"].includes(value);
}

export default async function LibraryDetailPage({ params }: LibraryDetailPageProps) {
  const supabase = await createClient();

  const [{ data: content }, { data: applyLinks }, { data: authData }] = await Promise.all([
    supabase.from("generated_contents").select("*").eq("id", params.id).single(),
    supabase
      .from("apply_links")
      .select("code, click_count")
      .eq("content_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  let role: RoleType | null = null;
  if (authData.user) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("role")
      .eq("auth_user_id", authData.user.id)
      .eq("is_active", true)
      .single();
    role = (member?.role as RoleType | undefined) || null;
  }

  const canEdit = role === "admin" || role === "hq_staff";
  const totalClicks = (applyLinks || []).reduce((sum, row) => sum + (row.click_count || 0), 0);
  const applyLinkCode = applyLinks?.[0]?.code || "";
  const applyLinkUrl = applyLinkCode ? `/a/${applyLinkCode}` : "-";

  async function updateBodyAction(formData: FormData) {
    "use server";
    if (!canEdit) return;

    const bodyText = String(formData.get("body_text") || "");
    const supabaseAction = await createClient();
    await supabaseAction
      .from("generated_contents")
      .update({ body_text: bodyText })
      .eq("id", params.id);
    revalidatePath(`/library/${params.id}`);
  }

  async function updateStatusAction(formData: FormData) {
    "use server";
    const statusValue = String(formData.get("status") || "");
    if (!canEdit || !isStatus(statusValue)) return;

    const allowedNext: ContentStatus[] = ["review", "approved", "posted"];
    if (!allowedNext.includes(statusValue)) return;

    const supabaseAction = await createClient();
    await supabaseAction
      .from("generated_contents")
      .update({ status: statusValue })
      .eq("id", params.id);
    revalidatePath(`/library/${params.id}`);
  }

  if (!content) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-neutral-900">ライブラリ</h1>
        <Card className="rounded-md shadow-sm">
          <CardContent className="pt-6">Not found</CardContent>
        </Card>
      </div>
    );
  }

  const contentStatus: ContentStatus = isStatus(content.status) ? content.status : "draft";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-neutral-900">ライブラリ</h1>
        <Badge className={statusClassMap[contentStatus]}>{statusLabelMap[contentStatus]}</Badge>
      </div>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>Body</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={updateBodyAction} className="space-y-3">
            <Textarea
              name="body_text"
              defaultValue={content.body_text}
              readOnly={!canEdit}
              className="min-h-[260px]"
            />
            {canEdit && (
              <Button type="submit" variant="outline">
                Save
              </Button>
            )}
          </form>

          <div className="flex flex-wrap gap-2">
            <form action={updateStatusAction}>
              <input type="hidden" name="status" value="review" />
              <Button type="submit" disabled={!canEdit} className="bg-[#1D3557] hover:bg-[#14253d]">
                Submit for Review
              </Button>
            </form>
            <form action={updateStatusAction}>
              <input type="hidden" name="status" value="approved" />
              <Button type="submit" disabled={!canEdit} className="bg-[#1D3557] hover:bg-[#14253d]">
                Approve
              </Button>
            </form>
            {contentStatus !== "approved" && (
              <form action={updateStatusAction}>
                <input type="hidden" name="status" value="approved" />
                <Button type="submit" disabled={!canEdit} className="bg-[#1D3557] hover:bg-[#14253d]">
                  承認
                </Button>
              </form>
            )}
            <Button type="button" variant="outline" data-copy-text={content.body_text}>
              Copy
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href={`/library/${params.id}/conversation`}>AIと相談</Link>
            </Button>
            <form action={updateStatusAction}>
              <input type="hidden" name="status" value="posted" />
              <Button type="submit" disabled={!canEdit} className="bg-[#1D3557] hover:bg-[#14253d]">
                Mark as Posted
              </Button>
            </form>
          </div>

          <div className="rounded-md border bg-neutral-50 p-3 text-sm">
            <p className="font-medium">Apply Link</p>
            <p className="break-all">{applyLinkUrl}</p>
            <p className="text-neutral-600">Clicks: {totalClicks}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>parts_json</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[360px] overflow-auto rounded-md bg-neutral-900 p-4 text-xs text-neutral-100">
            {JSON.stringify(content.parts_json || {}, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Script id="library-copy-script" strategy="afterInteractive">
        {`document.addEventListener("click", async function (event) {
          var target = event.target;
          if (!(target instanceof Element)) return;
          var button = target.closest("[data-copy-text]");
          if (!button) return;
          var text = button.getAttribute("data-copy-text") || "";
          if (!text) return;
          try {
            await navigator.clipboard.writeText(text);
          } catch (error) {
            console.error(error);
          }
        });`}
      </Script>
    </div>
  );
}
