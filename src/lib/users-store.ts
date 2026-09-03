import "server-only";

import { getSql, isDatabaseConfigured } from "@/lib/db";

/**
 * The Auth.js tables, in the shape `@auth/neon-adapter` expects — quoted
 * camelCase column names included, because that is what its SQL asks for.
 *
 * `users.password` is our own addition: the adapter never writes it (an OAuth
 * user has no password at all), and the credentials provider is the only thing
 * that reads it. `created_at`/`updated_at` are ours too, for the admin panel.
 *
 * Created on first use, like every other table here — there is no migration
 * step to run, and the statements are additive so an existing deployment keeps
 * its rows.
 */
let schemaReady: Promise<void> | null = null;

export function ensureAuthSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();

      await sql`
        create table if not exists users (
          id             uuid primary key default gen_random_uuid(),
          name           text,
          email          text unique,
          "emailVerified" timestamptz,
          image          text,
          password       text,
          created_at     timestamptz not null default now(),
          updated_at     timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists accounts (
          id                  uuid primary key default gen_random_uuid(),
          "userId"            uuid not null references users (id) on delete cascade,
          type                text not null,
          provider            text not null,
          "providerAccountId" text not null,
          refresh_token       text,
          access_token        text,
          expires_at          bigint,
          id_token            text,
          scope               text,
          session_state       text,
          token_type          text
        )
      `;
      /**
       * One row per provider account. Without this, a replayed OAuth callback
       * could link the same Google account twice.
       */
      await sql`
        create unique index if not exists accounts_provider_account_idx
          on accounts (provider, "providerAccountId")
      `;

      /**
       * Unused while the session strategy is 'jwt' — which it has to be, since
       * Auth.js only issues database sessions for OAuth sign-ins and this app
       * also signs people in with a password. Created anyway so switching
       * strategies later is a config change rather than a migration.
       */
      await sql`
        create table if not exists sessions (
          id             uuid primary key default gen_random_uuid(),
          "userId"       uuid not null references users (id) on delete cascade,
          "sessionToken" text not null unique,
          expires        timestamptz not null
        )
      `;

      await sql`
        create table if not exists verification_token (
          identifier text not null,
          token      text not null,
          expires    timestamptz not null,
          primary key (identifier, token)
        )
      `;
    })().catch((error) => {
      // Let the next call retry rather than caching a failed migration.
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export type AccountUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  password: string | null;
};

/** Emails are stored and compared lowercased, so a lookup can never miss on case. */
export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<AccountUser | null> {
  await ensureAuthSchema();
  const sql = getSql();
  const rows = (await sql`
    select id, name, email, image, password
      from users
     where email = ${normaliseEmail(email)}
     limit 1
  `) as AccountUser[];
  return rows[0] ?? null;
}

/**
 * Writes a credentials user. The password arrives already hashed — this module
 * never sees a plaintext one, and there is no code path that stores it.
 */
export async function createCredentialsUser(input: {
  email: string;
  passwordHash: string;
  name: string | null;
}): Promise<AccountUser | null> {
  await ensureAuthSchema();
  const sql = getSql();
  const rows = (await sql`
    insert into users (name, email, password)
    values (${input.name}, ${normaliseEmail(input.email)}, ${input.passwordHash})
    on conflict (email) do nothing
    returning id, name, email, image, password
  `) as AccountUser[];
  // Nothing returned means the email was taken between the check and the write.
  return rows[0] ?? null;
}

export type SiteMember = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  createdAt: number;
  /** Providers this account can sign in with, e.g. ['password', 'google']. */
  providers: string[];
};

export type UserStats = {
  total: number;
  newThisWeek: number;
  newThisMonth: number;
  withGoogle: number;
  recent: SiteMember[];
  error: string | null;
};

const RECENT_LIMIT = 10;

const EMPTY_STATS: UserStats = {
  total: 0,
  newThisWeek: 0,
  newThisMonth: 0,
  withGoogle: 0,
  recent: [],
  error: null,
};

/** Reads degrade to zeroes so the panel renders before the first sign-up. */
export async function getUserStats(): Promise<UserStats> {
  if (!isDatabaseConfigured()) {
    return { ...EMPTY_STATS, error: "DATABASE_URL is not set." };
  }

  try {
    await ensureAuthSchema();
    const sql = getSql();

    const [totals] = (await sql`
      select
        count(*)::int                                                          as total,
        count(*) filter (where created_at >= now() - interval '7 days')::int   as new_this_week,
        count(*) filter (where created_at >= now() - interval '30 days')::int  as new_this_month,
        count(*) filter (
          where exists (
            select 1 from accounts a
             where a."userId" = users.id and a.provider = 'google'
          )
        )::int                                                                 as with_google
      from users
    `) as {
      total: number;
      new_this_week: number;
      new_this_month: number;
      with_google: number;
    }[];

    /**
     * A person can hold both a password and a linked Google account, so the
     * providers are aggregated rather than picked — the list is what the panel
     * shows, and "password" is inferred from the column rather than a row.
     */
    const rows = (await sql`
      select
        u.id,
        u.name,
        u.email,
        u.image,
        u.created_at,
        (u.password is not null) as has_password,
        coalesce(
          array_remove(array_agg(distinct a.provider), null),
          '{}'
        ) as providers
      from users u
      left join accounts a on a."userId" = u.id
      group by u.id
      order by u.created_at desc
      limit ${RECENT_LIMIT}
    `) as {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      created_at: string | Date;
      has_password: boolean;
      providers: string[];
    }[];

    const recent: SiteMember[] = rows.map((row) => ({
      id: row.id,
      name: row.name || "Unnamed",
      email: row.email ?? "—",
      imageUrl: row.image ?? "",
      createdAt: new Date(row.created_at).getTime(),
      providers: [...(row.has_password ? ["password"] : []), ...row.providers],
    }));

    return {
      total: totals?.total ?? 0,
      newThisWeek: totals?.new_this_week ?? 0,
      newThisMonth: totals?.new_this_month ?? 0,
      withGoogle: totals?.with_google ?? 0,
      recent,
      error: null,
    };
  } catch (caught) {
    console.error("Could not load user stats", caught);
    return { ...EMPTY_STATS, error: "Could not read accounts from the database." };
  }
}
