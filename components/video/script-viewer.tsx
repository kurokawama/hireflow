"use client";

import type { ShootingGuide } from "@/types/video";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ScriptViewerProps {
  scriptText: string | null;
  shootingGuide: ShootingGuide | null;
}

export function ScriptViewer({ scriptText, shootingGuide }: ScriptViewerProps) {
  return (
    <div className="space-y-4">
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-[#1D3557]">台本</CardTitle>
        </CardHeader>
        <CardContent>
          <details open className="rounded-md border border-neutral-200 bg-white p-3">
            <summary className="cursor-pointer font-medium text-[#1D3557]">表示 / 非表示</summary>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {scriptText || "台本はまだ生成されていません。"}
            </div>
          </details>
        </CardContent>
      </Card>

      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-[#1D3557]">撮影ガイド</CardTitle>
        </CardHeader>
        <CardContent>
          <details open className="space-y-4 rounded-md border border-neutral-200 bg-white p-3">
            <summary className="cursor-pointer font-medium text-[#1D3557]">表示 / 非表示</summary>
            {shootingGuide ? (
              <div className="mt-3 space-y-4">
                <div className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
                  <p>シーン数: {shootingGuide.scenes.length}</p>
                  <p>想定尺: {shootingGuide.total_duration_seconds}秒</p>
                  <p className="sm:col-span-2">ロケーション: {shootingGuide.location || "未設定"}</p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>シーン</TableHead>
                      <TableHead>説明</TableHead>
                      <TableHead>カメラ</TableHead>
                      <TableHead>照明</TableHead>
                      <TableHead className="text-right">秒数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shootingGuide.scenes.map((scene) => {
                      const lighting = (scene as unknown as { lighting?: string }).lighting;
                      return (
                        <TableRow key={scene.scene_number}>
                          <TableCell>{scene.scene_number}</TableCell>
                          <TableCell>{scene.description}</TableCell>
                          <TableCell>{scene.camera_angle}</TableCell>
                          <TableCell>{lighting || scene.notes || "未設定"}</TableCell>
                          <TableCell className="text-right">{scene.duration_seconds}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="space-y-2 text-sm text-neutral-700">
                  <p className="font-medium text-[#1D3557]">小道具</p>
                  {shootingGuide.props.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {shootingGuide.props.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>小道具の指定はありません。</p>
                  )}
                </div>

                <div className="space-y-2 text-sm text-neutral-700">
                  <p className="font-medium text-[#1D3557]">撮影のコツ</p>
                  {shootingGuide.tips.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {shootingGuide.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>コツの指定はありません。</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-600">撮影ガイドはまだ生成されていません。</p>
            )}
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
