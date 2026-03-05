import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContentStatus, Platform, TemplateType } from "@/types/database";

type SearchParamValue = string | string[] | undefined;

interface LibraryPageProps {
  searchParams?: Record<string, SearchParamValue>;
}

type LibraryRow = {
  id: string;
  store_name: string;
  platform: Platform;
  template_type: TemplateType;
  status: ContentStatus;
  body_text: string;
  click_count: number;
  created_at: string;
};

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

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function isStatus(value: string): value is ContentStatus {
  return ["draft", "review", "approved", "posted", "rejected"].includes(value);
}

function isPlatform(value: string): value is Platform {
  return [
    "instagram",
    "tiktok",
    "line",
    "meta_ad",
    "google_jobs",
    "facebook",
    "x",
    "youtube",
  ].includes(value);
}

function isTemplate(value: string): value is TemplateType {
  return ["staff_day", "job_intro", "qa"].includes(value);
}

function truncateBody(text: string) {
  if (text.length <= 70) return text;
  return `${text.slice(0, 70)}...`;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const supabase = await createClient();

  const storeFilter = normalizeParam(searchParams?.store) || "all";
  const statusFilterRaw = normalizeParam(searchParams?.status) || "all";
  const platformFilterRaw = normalizeParam(searchParams?.platform) || "all";
  const templateFilterRaw = normalizeParam(searchParams?.template_type) || "all";

  const statusFilter = isStatus(statusFilterRaw) ? statusFilterRaw : "all";
  const platformFilter = isPlatform(platformFilterRaw) ? platformFilterRaw : "all";
  const templateFilter = isTemplate(templateFilterRaw) ? templateFilterRaw : "all";

  const [storesResult, contentsResult] = await Promise.all([
    supabase
      .from("stores")
      .select("id, store_name")
      .eq("is_active", true)
      .order("store_name"),
    (async () => {
      let query = supabase
        .from("generated_contents")
        .select("id, store_id, platform, template_type, status, body_text, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (storeFilter !== "all") query = query.eq("store_id", storeFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (platformFilter !== "all") query = query.eq("platform", platformFilter);
      if (templateFilter !== "all") query = query.eq("template_type", templateFilter);

      return query;
    })(),
  ]);

  const contentIds = (contentsResult.data || []).map((item) => item.id);
  const linksResult =
    contentIds.length > 0
      ? await supabase
          .from("apply_links")
          .select("content_id, click_count")
          .in("content_id", contentIds)
      : { data: [], error: null };

  const storeMap = new Map<string, string>();
  for (const store of storesResult.data || []) {
    storeMap.set(store.id, store.store_name);
  }

  const clickMap = new Map<string, number>();
  for (const link of linksResult.data || []) {
    const current = clickMap.get(link.content_id) || 0;
    clickMap.set(link.content_id, current + (link.click_count || 0));
  }

  const hasError = Boolean(contentsResult.error);
  const mockRows: LibraryRow[] = [
    {
      id: "mock-1",
      store_name: "Dr. Stretch Shibuya",
      platform: "instagram",
      template_type: "staff_day",
      status: "draft",
      body_text: "Mock content body text",
      click_count: 12,
      created_at: new Date().toISOString(),
    },
    {
      id: "mock-2",
      store_name: "Wecle Shinjuku",
      platform: "line",
      template_type: "job_intro",
      status: "approved",
      body_text: "Mock content body text",
      click_count: 21,
      created_at: new Date().toISOString(),
    },
  ];

  const rows: LibraryRow[] = hasError
    ? mockRows
    : (contentsResult.data || []).map((item) => ({
        id: item.id,
        store_name: storeMap.get(item.store_id) || "Unknown",
        platform: item.platform,
        template_type: item.template_type,
        status: item.status,
        body_text: item.body_text,
        click_count: clickMap.get(item.id) || 0,
        created_at: item.created_at,
      }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900">ライブラリ</h1>
        <Button asChild variant="outline">
          <Link href="/library">Reset</Link>
        </Button>
      </div>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Select defaultValue={storeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {(storesResult.data || []).map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.store_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select defaultValue={statusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="review">レビュー中</SelectItem>
                <SelectItem value="approved">承認済み</SelectItem>
                <SelectItem value="posted">投稿済み</SelectItem>
                <SelectItem value="rejected">却下</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue={platformFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="instagram">instagram</SelectItem>
                <SelectItem value="tiktok">tiktok</SelectItem>
                <SelectItem value="line">line</SelectItem>
                <SelectItem value="meta_ad">meta_ad</SelectItem>
                <SelectItem value="google_jobs">google_jobs</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="x">X</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue={templateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="staff_day">staff_day</SelectItem>
                <SelectItem value="job_intro">job_intro</SelectItem>
                <SelectItem value="qa">qa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Body</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/library/${row.id}`} className="hover:underline">
                      {row.store_name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.platform}</TableCell>
                  <TableCell>{row.template_type}</TableCell>
                  <TableCell>
                    <Badge className={statusClassMap[row.status]}>
                      {statusLabelMap[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[320px]">{truncateBody(row.body_text)}</TableCell>
                  <TableCell className="text-right">{row.click_count}</TableCell>
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
