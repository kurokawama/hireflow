import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon } from "@/components/sns/platform-icon";
import type { GeneratedContent } from "@/types/database";

interface ContentPreviewProps {
  content: GeneratedContent;
}

export function ContentPreview({ content }: ContentPreviewProps) {
  return (
    <Card className="rounded-md shadow-sm">
      <CardHeader className="space-y-3">
        <CardTitle className="font-semibold text-neutral-900">Preview</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="inline-flex items-center gap-1 border-transparent bg-neutral-100 text-neutral-700">
            <PlatformIcon platform={content.platform} size="sm" />
            {content.platform}
          </Badge>
          <Badge className="border-transparent bg-neutral-100 text-neutral-700">
            {content.status}
          </Badge>
          <Badge className="border-transparent bg-neutral-100 text-neutral-700">
            v{content.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-neutral-50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-800">
            {content.body_text || "-"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
