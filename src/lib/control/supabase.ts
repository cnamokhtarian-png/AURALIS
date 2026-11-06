import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Bridge to the **separate** Supabase project used by the agent workers
 * (job discovery, external dashboards, ...).
 *
 * AURALIS itself keeps its own Postgres through Drizzle (`DATABASE_URL`), while
 * this module talks to the second project over PostgREST/SDK:
 *
 *   NEXT_PUBLIC_SUPABASE_URL              https://<ref>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY         legacy anon key           ┐ one of
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  sb_publishable_… (new)    ┘ these
 *   SUPABASE_SERVICE_ROLE_KEY             server-side reads/writes (bypasses RLS)
 *
 * The service-role key is only ever read on the server.
 */

const url = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";

const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

export const publicKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

export function supabaseUrl() {
  return url();
}

export function supabaseConfigured() {
  return Boolean(url() && publicKey());
}

export function supabaseServiceConfigured() {
  return Boolean(url() && serviceKey());
}

let cached: SupabaseClient | null = null;
let cachedKey = "";

/** Server-side client: service role when configured, public key otherwise. */
export function supabaseAdmin(): SupabaseClient | null {
  if (!url()) return null;
  const key = serviceKey() || publicKey();
  if (!key) return null;
  if (!cached || cachedKey !== key) {
    cached = createClient(url(), key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "auralis-control" } },
    });
    cachedKey = key;
  }
  return cached;
}

export type RemoteProject = {
  id: number;
  title: string;
  client_name: string | null;
  platform: string | null;
  source_url: string | null;
  description: string | null;
  budget_usdt: number | string | null;
  currency: string | null;
  skills: string[] | null;
  status: string | null;
  proposal_text: string | null;
  created_at: string | null;
};

export type RemoteStatus = {
  configured: boolean;
  serviceRole: boolean;
  url: string | null;
  reachable: boolean;
  tableReady: boolean;
  projectCount: number | null;
  error: string | null;
  hint: string;
};

/** Checks the connection and whether `0004_control_center.sql` ran there. */
export async function remoteStatus(): Promise<RemoteStatus> {
  const base: RemoteStatus = {
    configured: false,
    serviceRole: supabaseServiceConfigured(),
    url: url() || null,
    reachable: false,
    tableReady: false,
    projectCount: null,
    error: null,
    hint: "",
  };

  const client = supabaseAdmin();
  if (!client) {
    return {
      ...base,
      error: "not_configured",
      hint: "NEXT_PUBLIC_SUPABASE_URL و کلید عمومی/سرویس را در متغیرهای محیطی بگذارید.",
    };
  }

  const { count, error } = await client
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (error) {
    const missingTable = error.code === "42P01" || /relation .* does not exist/i.test(error.message);
    const rls = error.code === "42501" || /permission denied|row-level security/i.test(error.message);
    return {
      ...base,
      configured: true,
      reachable: !/fetch failed|ENOTFOUND|getaddrinfo/i.test(error.message),
      error: error.message,
      hint: missingTable
        ? "جدول‌ها در این پروژه ساخته نشده‌اند: فایل supabase/migrations/0004_control_center.sql را اجرا کنید."
        : rls
          ? "RLS جلوی کلید عمومی را گرفته؛ برای خواندن/نوشتن سروری SUPABASE_SERVICE_ROLE_KEY را تنظیم کنید."
          : "اتصال برقرار نشد؛ آدرس پروژه و کلید را بررسی کنید.",
    };
  }

  return { ...base, configured: true, reachable: true, tableReady: true, projectCount: count ?? 0 };
}

/** Reads jobs discovered by the external worker (status = found). */
export async function fetchRemoteProjects(limit = 25) {
  const client = supabaseAdmin();
  if (!client) return { ok: false as const, error: "not_configured", rows: [] as RemoteProject[] };
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("status", "found")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { ok: false as const, error: error.message, rows: [] as RemoteProject[] };
  return { ok: true as const, error: null, rows: (data ?? []) as RemoteProject[] };
}

/** Mirrors a status change back to the remote project (worker stays in sync). */
export async function pushRemoteStatus(
  remoteId: number,
  status: "found" | "proposal_sent" | "in_progress" | "completed" | "rejected",
) {
  const client = supabaseAdmin();
  if (!client) return { ok: false as const, error: "not_configured" };
  const { error } = await client.from("projects").update({ status }).eq("id", remoteId);
  return error ? { ok: false as const, error: error.message } : { ok: true as const, error: null };
}
