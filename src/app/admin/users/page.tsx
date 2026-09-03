import Image from "next/image";
import { CalendarPlus, KeyRound, UserPlus, Users } from "lucide-react";

import { StatCard } from "@/components/admin/stat-card";
import { getUserStats, type SiteMember } from "@/lib/users-store";

export const metadata = { title: "Users — Admin" };

function formatDate(value: number) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** How this person can get in — a password, Google, or both. */
function signInMethods(member: SiteMember) {
  if (member.providers.length === 0) return "—";
  return member.providers
    .map((provider) =>
      provider === "password"
        ? "Password"
        : provider.charAt(0).toUpperCase() + provider.slice(1),
    )
    .join(" + ");
}

/** Google supplies an avatar; a password sign-up has none, so fall back to a letter. */
function Avatar({ member }: { member: SiteMember }) {
  if (member.imageUrl) {
    return (
      <Image
        src={member.imageUrl}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  const initial = (member.name || member.email || "?").charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
    >
      {initial}
    </span>
  );
}

export default async function AdminUsersPage() {
  const stats = await getUserStats();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-light">Users on site</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone with an account, from the store&apos;s own database.
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
          label="With Google"
          value={stats.withGoogle.toLocaleString("en-IN")}
          hint="Signing in through Google"
          icon={KeyRound}
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
                  <th className="px-4 py-3 font-medium">Signs in with</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((member) => (
                  <tr key={member.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar member={member} />
                        <span className="truncate">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {signInMethods(member)}
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
