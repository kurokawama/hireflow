"use client";

import { useState } from "react";
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
  Menu,
  X,
} from "lucide-react";

interface MobileNavProps {
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

export function MobileNav({ role, displayName }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="lg:hidden">
      <header className="flex items-center justify-between bg-[#1D3557] px-4 py-3 text-white">
        <h1 className="text-lg font-bold">HireFlow</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-2 hover:bg-white/10 transition-colors"
          aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setIsOpen(false)}
          />
          <nav className="fixed inset-y-0 left-0 z-50 w-64 bg-[#1D3557] text-white flex flex-col">
            <div className="p-6 border-b border-white/10">
              <h1 className="text-xl font-bold">HireFlow</h1>
              <p className="text-xs text-white/60 mt-1">AI Recruitment Engine</p>
            </div>

            <div className="flex-1 p-4 space-y-1 overflow-auto">
              {filteredItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
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
            </div>

            <div className="p-4 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-white/70">
                <span className="truncate">{displayName}</span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  void handleLogout();
                }}
                className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                ログアウト
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
