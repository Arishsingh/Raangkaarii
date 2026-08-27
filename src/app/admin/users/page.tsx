import Image from "next/image";
import { Activity, CalendarPlus, UserPlus, Users } from "lucide-react";

import { StatCard } from "@/components/admin/stat-card";
import { getUserStats } from "@/lib/admin-stats";

export const metadata = { title: "Users — Admin" };

function formatDate(value: number) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(value: number | null) {
  if (!value) return "Never";
  const days = Math.floor((Date.now() - value) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(value);
}

export default async function AdminUsersPage() {
  const stats = await getUserStats();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-light">Users on site</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone with an account, live from Clerk.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.total.toLocaleString("en-IN")}
          hint="Everyone with an account"
          icon={Users}
        />
        <StatCard
          label="New this week"
          value={stats.newThisWeek.toLocaleString("en-IN")}
          hint="Signed up in 7 days"
          icon={UserPlus}
        />
        <StatCard
          label="New this month"
          value={stats.newThisMonth.toLocaleString("en-IN")}
          hint="Signed up in 30 days"
          icon={CalendarPlus}
        />
        <StatCard
          label="Active this week"
          value={stats.activeThisWeek.toLocaleString("en-IN")}
          hint="Signed in within 7 days"
          icon={Activity}
        />
      </section>

      {stats.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {stats.error}
        </p>
      ) : null}

      <section>
        <h3 className="font-heading text-lg font-light">Newest members</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          The {stats.recent.length} most recent sign-ups.
        </p>

        {stats.recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No one has signed up yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((member) => (
                  <tr key={member.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Image
                          src={member.imageUrl}
                          alt=""
                          width={32}
                          height={32}
                          unoptimized
                          className="size-8 shrink-0 rounded-full object-cover"
                        />
                        <span className="truncate">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelative(member.lastActiveAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
