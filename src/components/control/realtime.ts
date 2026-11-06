"use client";

import { useEffect, useRef } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Optional live updates through Supabase Realtime.
 *
 * The dashboard already works with plain server rendering + router.refresh();
 * when NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are present the
 * pages also subscribe to postgres_changes and refresh themselves instantly
 * (e.g. when you press a button in Telegram).
 *
 * Note: RLS is enabled with no policies for anon/authenticated (same hardening
 * as the rest of the project), so a Realtime subscription needs a policy that
 * lets the operator role read the rows — see README → «به‌روزرسانی زنده».
 */
let cached: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return cached;
}

export function useRealtimeRefresh(tables: string[], refresh: () => void, enabled = true) {
  const refreshRef = useRef(refresh);
  const key = tables.join(",");

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const client = browserSupabase();
    if (!client) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refreshRef.current(), 600);
    };

    const channel = client.channel(`cc-${key}-${Math.random().toString(36).slice(2, 7)}`);
    for (const table of key.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, trigger);
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void client.removeChannel(channel);
    };
  }, [key, enabled]);
}
