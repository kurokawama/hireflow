import { createClient } from "@/lib/supabase/server";
import type { RoleType, OrganizationMember } from "@/types/database";

export interface AuthUser {
  userId: string;
  member: OrganizationMember;
}

// Get authenticated user + org member info
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabase
    .from("organization_members")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member) return null;

  return { userId: user.id, member };
}

// Check if user has required role
export function hasRole(member: OrganizationMember, roles: RoleType[]): boolean {
  return roles.includes(member.role);
}

// Check if user can access a specific store
export function canAccessStore(
  member: OrganizationMember,
  storeId: string
): boolean {
  // Admin and HQ staff can access all stores
  if (member.role === "admin" || member.role === "hq_staff") return true;
  // Store manager and trainer can only access their own store
  return member.store_id === storeId;
}

// Require auth — throws if not authenticated
export async function requireAuth(
  requiredRoles?: RoleType[]
): Promise<AuthUser> {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error("Unauthorized");
  }
  if (requiredRoles && !hasRole(authUser.member, requiredRoles)) {
    throw new Error("Forbidden");
  }
  return authUser;
}
