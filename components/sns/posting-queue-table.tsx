"use client";

import Link from "next/link";
import type { PostingQueueWithContent, PostingStatus } from "@/types/sns";
import { PlatformIcon } from "@/components/sns/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PostingQueueTableProps {
  items: PostingQueueWithContent[];
  isLoading?: boolean;
  cancellingId?: string | null;
  onCancel?: (queueId: string) => void;
  emptyText?: string;
}

function truncateContent(text: string, maxLength = 50) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("ja-JP");
}

function statusBadgeClass(status: PostingStatus) {
  if (status === "pending") {
    return "border-transparent bg-amber-100 text-amber-700";
  }
  if (status === "processing") {
    return "border-transparent bg-blue-100 text-blue-700";
  }
  if (status === "posted") {
    return "border-transparent bg-green-100 text-green-700";
  }
  if (status === "failed") {
    return "border-transparent bg-red-100 text-red-700";
  }
  return "border-transparent bg-neutral-200 text-neutral-700";
}

function statusLabel(status: PostingStatus) {
  if (status === "pending") {
    return "予定";
  }
  if (status === "processing") {
    return "処理中";
  }
  if (status === "posted") {
    return "投稿済み";
  }
  if (status === "failed") {
    return "失敗";
  }
  return "キャンセル";
}

export function PostingQueueTable({
  items,
  isLoading = false,
  cancellingId = null,
  onCancel,
  emptyText = "投稿はありません。",
}: PostingQueueTableProps) {
  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>プラットフォーム</TableHead>
            <TableHead>コンテンツ</TableHead>
            <TableHead>アカウント</TableHead>
            <TableHead>スケジュール</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="w-[200px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading &&
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={item.platform} />
                    <span className="text-sm">{item.platform}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[320px]">
                  <p className="truncate text-sm" title={item.content?.body_text ?? ""}>
                    {truncateContent(item.content?.body_text ?? "-")}
                  </p>
                </TableCell>
                <TableCell>{item.connection?.external_account_name ?? "-"}</TableCell>
                <TableCell>{formatDateTime(item.scheduled_at)}</TableCell>
                <TableCell>
                  <Badge className={statusBadgeClass(item.status)}>
                    {statusLabel(item.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.status === "pending" && onCancel && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={cancellingId === item.id}
                        onClick={() => onCancel(item.id)}
                      >
                        キャンセル
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/publishing/${item.id}`}>詳細</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          )}

          {isLoading && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                読み込み中...
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
