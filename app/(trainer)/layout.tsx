import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify trainer role
  const { data: member } = await supabase
    .from("organization_members")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Simple header for trainer portal */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-neutral-900">HireFlow</h1>
          <p className="text-xs text-neutral-500">トレーナーポータル</p>
        </div>
        <span className="text-sm text-neutral-600">{member.display_name}</span>
      </header>
      <main className="p-4 max-w-lg mx-auto">{children}</main>
    </div>
  );
}
