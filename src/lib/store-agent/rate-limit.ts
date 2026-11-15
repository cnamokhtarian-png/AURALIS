import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { storeMessages, type StoreAgentSettings } from "@/db/schema";

/**
 * Anti-ban guardrails.
 *
 * The agent never blasts messages. Every outbound message goes through:
 *   1. opt-out / consent checks                (see messages.ts)
 *   2. quiet hours in the operator's timezone  (no 2 a.m. sales pitches)
 *   3. a random gap between two messages       (7–18 min by default)
 *   4. a hard daily cap per channel            (30 by default)
 *   5. human approval unless explicitly disabled
 *
 * The limiter is database-backed, so it also works across serverless
 * invocations and multiple cron runs.
 */

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function tzOffsetMs(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    });
    const name = formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
    const match = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 0;
    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2] ?? 0);
    const minutes = Number(match[3] ?? 0);
    return sign * (hours * 60 + minutes) * 60_000;
  } catch {
    return 0;
  }
}

export function startOfDay(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const utcMidnight = Date.UTC(parts.year, parts.month - 1, parts.day);
  return new Date(utcMidnight - tzOffsetMs(date, timeZone));
}

export function zonedHour(date: Date, timeZone: string) {
  return zonedParts(date, timeZone).hour;
}

export function isQuietHour(settings: StoreAgentSettings, date = new Date()) {
  const hour = zonedHour(date, settings.timezone || "Asia/Tehran");
  const start = settings.quietStartHour;
  const end = settings.quietEndHour;
  if (start === end) return false;
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

/** Next moment the quiet window closes (or `date` when it is already open). */
export function quietWindowEnd(settings: StoreAgentSettings, date = new Date()) {
  if (!isQuietHour(settings, date)) return date;
  const probe = new Date(date);
  for (let i = 1; i <= 30 * 60; i += 1) {
    probe.setTime(date.getTime() + i * 60_000);
    if (!isQuietHour(settings, probe)) {
      // Add a small human-like delay after the window opens.
      probe.setTime(probe.getTime() + (5 + (i % 11)) * 60_000);
      return probe;
    }
  }
  return date;
}

export type SendWindow = {
  allowed: boolean;
  reason: string;
  sentToday: number;
  cap: number;
  quiet: boolean;
  lastSentAt: Date | null;
  gapRemainingMinutes: number;
  nextAllowedAt: Date | null;
};

function seed(id: number) {
  return Math.abs(Math.sin(id * 12.9898) * 43758.5453) % 1;
}

export function gapMinutes(settings: StoreAgentSettings, id = 1) {
  const min = Math.max(1, settings.minGapMinutes);
  const max = Math.max(min + 1, settings.maxGapMinutes);
  return Math.round(min + seed(id) * (max - min));
}

export async function sentTodayCount(settings: StoreAgentSettings, channel?: string) {
  const start = startOfDay(new Date(), settings.timezone || "Asia/Tehran");
  const where = channel
    ? and(eq(storeMessages.status, "sent"), gte(storeMessages.sentAt, start), eq(storeMessages.channel, channel))
    : and(eq(storeMessages.status, "sent"), gte(storeMessages.sentAt, start));
  const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(storeMessages).where(where);
  return Number(row?.value ?? 0);
}

export async function lastOutboundAt(channel: string): Promise<Date | null> {
  const rows = await db
    .select({ sentAt: storeMessages.sentAt })
    .from(storeMessages)
    .where(and(eq(storeMessages.channel, channel), eq(storeMessages.status, "sent")))
    .orderBy(desc(storeMessages.sentAt))
    .limit(1);
  return rows[0]?.sentAt ?? null;
}

/** Human-readable status for a channel card. */
export async function sendWindow(settings: StoreAgentSettings, channel: string): Promise<SendWindow> {
  const [sentToday, last] = await Promise.all([sentTodayCount(settings, channel), lastOutboundAt(channel)]);
  const now = new Date();
  const quiet = isQuietHour(settings, now);
  const gap = gapMinutes(settings, Number(last?.getTime() ?? 1) % 997);
  const gapEnds = last ? new Date(last.getTime() + gap * 60_000) : null;
  const cap = settings.dailySendCap;

  let next: Date | null = null;
  let reason = "آزاد — می‌توانید ارسال کنید";

  if (quiet) {
    next = quietWindowEnd(settings, now);
    reason = "ساعت آرام (Quiet hours) — ارسال تا بازشدن پنجره به تعویق می‌افتد";
  } else if (sentToday >= cap) {
    next = new Date(startOfDay(now, settings.timezone || "Asia/Tehran").getTime() + 24 * 3_600_000 + 9 * 3_600_000);
    reason = `سقف روزانه ${cap} پیام پر شده است`;
  } else if (gapEnds && gapEnds > now) {
    next = gapEnds;
    reason = `فاصله انسانی: ${Math.ceil((gapEnds.getTime() - now.getTime()) / 60_000)} دقیقه دیگر`;
  }

  const allowed = !quiet && sentToday < cap && (!gapEnds || gapEnds <= now);
  return {
    allowed,
    reason,
    sentToday,
    cap,
    quiet,
    lastSentAt: last,
    gapRemainingMinutes: gapEnds ? Math.max(0, Math.ceil((gapEnds.getTime() - now.getTime()) / 60_000)) : 0,
    nextAllowedAt: allowed ? null : next,
  };
}

/**
 * Earliest moment the next message may go out, including jitter and the quiet
 * window. Used by "approve" (schedules instead of sending immediately).
 */
export async function nextSendSlot(
  settings: StoreAgentSettings,
  channel: string,
  seedValue: number,
): Promise<{ at: Date; reason: string; blockedBy: "quiet" | "gap" | "cap" | null }> {
  const now = new Date();
  const [sentToday, last] = await Promise.all([sentTodayCount(settings, channel), lastOutboundAt(channel)]);
  const cap = settings.dailySendCap;

  if (sentToday >= cap) {
    const tz = settings.timezone || "Asia/Tehran";
    const tomorrow = new Date(startOfDay(now, tz).getTime() + 24 * 3_600_000);
    const at = new Date(tomorrow.getTime() + (9 + seed(seedValue) * 3) * 3_600_000);
    return { at, reason: "سقف روزانه پر شده — فردا صبح", blockedBy: "cap" };
  }

  const quiet = isQuietHour(settings, now);
  const base = quiet ? quietWindowEnd(settings, now) : now;
  const gap = gapMinutes(settings, seedValue);
  const afterGap = last ? new Date(last.getTime() + gap * 60_000) : now;
  const at = new Date(Math.max(base.getTime(), afterGap.getTime()));
  if (quiet) return { at, reason: "ساعت آرام — با بازشدن پنجره ارسال می‌شود", blockedBy: "quiet" };
  if (at > now) return { at, reason: `فاصله انسانی ${gap} دقیقه`, blockedBy: "gap" };
  return { at: now, reason: "همین حالا", blockedBy: null };
}

export function delayMinutesFor(settings: StoreAgentSettings, id: number) {
  return gapMinutes(settings, id);
}
