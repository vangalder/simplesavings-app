"use client";
import { useUser } from "@clerk/nextjs";

const ADMIN_EMAIL = "trevor@vangalder.com";

export function useIsAdmin(): boolean {
  const { user } = useUser();
  return user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;
}
