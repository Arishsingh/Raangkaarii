import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

export type SiteMember = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  createdAt: number;
  lastActiveAt: number | null;
};

export type UserStats = {
  total: number;
  newThisWeek: number;
  newThisMonth: number;
  activeThisWeek: number;
  recent: SiteMember[];
  /** Set when Clerk could not be reached, so the panel can say so. */
  error: string | null;
};

const WEEK = 7 * 24 * 60 * 60 * 1000;
const MONTH = 30 * 24 * 60 * 60 * 1000;
const RECENT_LIMIT = 10;

export async function getUserStats(): Promise<UserStats> {
  const empty: UserStats = {
    total: 0,
    newThisWeek: 0,
    newThisMonth: 0,
    activeThisWeek: 0,
    recent: [],
    error: null,
  };

  if (!process.env.CLERK_SECRET_KEY) {
    return { ...empty, error: "CLERK_SECRET_KEY is not set." };
  }

  try {
    const clerk = await clerkClient();
    const now = Date.now();

    /**
     * The date filters live on the list endpoint, not `getCount`, so ask for a
     * single row and read `totalCount` — correct however many users exist.
     */
    const countWhere = async (params: Parameters<typeof clerk.users.getUserList>[0]) =>
      (await clerk.users.getUserList({ ...params, limit: 1 })).totalCount;

    const [total, newThisWeek, newThisMonth, activeThisWeek, page] =
      await Promise.all([
        clerk.users.getCount(),
        countWhere({ createdAtAfter: now - WEEK }),
        countWhere({ createdAtAfter: now - MONTH }),
        countWhere({ lastActiveAtAfter: now - WEEK }),
        clerk.users.getUserList({
          limit: RECENT_LIMIT,
          orderBy: "-created_at",
        }),
      ]);

    const recent: SiteMember[] = page.data.map((user) => ({
      id: user.id,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.username ||
        "Unnamed",
      email: user.primaryEmailAddress?.emailAddress ?? "—",
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
    }));

    return { total, newThisWeek, newThisMonth, activeThisWeek, recent, error: null };
  } catch (caught) {
    console.error("Could not load user stats", caught);
    return { ...empty, error: "Could not reach Clerk to load user numbers." };
  }
}
