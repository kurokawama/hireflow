import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({
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

  // Get member info for sidebar
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
    <div className="flex h-screen">
      <Sidebar role={member.role} displayName={member.display_name} />
      <main className="flex-1 overflow-auto bg-neutral-50 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
