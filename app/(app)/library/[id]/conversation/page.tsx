import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ConversationBoard } from "@/components/conversation/conversation-board";
import { ContentPreview } from "@/components/conversation/content-preview";

interface ConversationPageProps {
  params: {
    id: string;
  };
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const supabase = await createClient();
  const { data: content } = await supabase
    .from("generated_contents")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!content) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-neutral-900">AIと相談</h1>
        <Button asChild variant="outline" className="rounded-md shadow-sm">
          <Link href={`/library/${params.id}`} aria-label="back to library detail">
            Back
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConversationBoard
          contentId={params.id}
          platforms={[content.platform]}
          initialPlatform={content.platform}
          originalText={content.body_text}
        />
        <ContentPreview content={content} />
      </div>
    </div>
  );
}
