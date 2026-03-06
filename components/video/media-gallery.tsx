"use client";

import { useState } from "react";
import type { MediaFile } from "@/types/video";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileImage, FileVideo, Music, Trash2 } from "lucide-react";

interface MediaGalleryProps {
  files: MediaFile[];
  onDelete?: (id: string) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTypeIcon(type: MediaFile["file_type"]) {
  if (type === "video") return <FileVideo className="h-4 w-4" />;
  if (type === "image") return <FileImage className="h-4 w-4" />;
  return <Music className="h-4 w-4" />;
}

function getTypeLabel(type: MediaFile["file_type"]) {
  if (type === "video") return "動画";
  if (type === "image") return "画像";
  return "音声";
}

export function MediaGallery({ files, onDelete }: MediaGalleryProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  if (files.length === 0) {
    return (
      <Card className="border-neutral-200">
        <CardContent className="py-10 text-center text-sm text-neutral-600">
          メディアファイルはありません
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {files.map((file) => (
          <Card key={file.id} className="border-neutral-200">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-[#1D3557]">
                  {getTypeIcon(file.file_type)}
                  <span className="font-medium">{file.file_name}</span>
                </div>
                <Badge variant="outline">{getTypeLabel(file.file_type)}</Badge>
              </div>

              <div className="space-y-1 text-sm text-neutral-600">
                <p>サイズ: {formatFileSize(file.file_size)}</p>
                <p>作成日: {new Intl.DateTimeFormat("ja-JP").format(new Date(file.created_at))}</p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setDeleteTargetId(file.id)}
                disabled={!onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メディアファイルを削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。削除対象のファイルはギャラリーから除外されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTargetId(null)}>
              キャンセル
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTargetId && onDelete) {
                  onDelete(deleteTargetId);
                }
                setDeleteTargetId(null);
              }}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
