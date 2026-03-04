"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import type { RoleType } from "@/types/database";
import {
  LayoutDashboard,
  Sparkles,
  Library,
  Users,
  BarChart3,
  Settings,
  LogOut,
  User,
} from "lucide-react";

interface SidebarProps {
  role: RoleType;
  displayName: string;
}

const navItems = [
  {
    href: "/dashboard",
    label: "ダッシュボード",
    icon: LayoutDashboard,
    roles: ["admin", "hq_staff", "store_manager"] as RoleType[],
  },
  {
    href: "/generator",
    label: "コンテンツ生成",
    icon: Sparkles,
    roles: ["admin", "hq_staff", "store_manager"] as RoleType[],
  },
  {
    href: "/library",
    label: "ライブラリ",
    icon: Library,
    roles: ["admin", "hq_staff", "store_manager"] as RoleType[],
  },
  {
    href: "/candidates",
    label: "候補者プール",
    icon: Users,
    roles: ["admin", "hq_staff", "store_manager"] as RoleType[],
  },
  {
    href: "/analytics",
    label: "分析",
    icon: BarChart3,
    roles: ["admin", "hq_staff"] as RoleType[],
  },
  {
    href: "/settings/stores",
    label: "設定",
    icon: Settings,
    roles: ["admin", "hq_staff"] as RoleType[],
  },
];

export function Sidebar({ role, displayName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-[#1D3557] text-white">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold">HireFlow</h1>
        <p className="text-xs text-white/60 mt-1">AI Recruitment Engine</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-white/70">
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">{displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
