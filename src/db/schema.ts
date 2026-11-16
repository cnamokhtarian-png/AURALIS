import { relations } from "drizzle-orm";
import {
  boolean,
  bigint,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "customer"]);
export const orderStatusEnum = pgEnum("order_status", [
  "awaiting_payment",
  "receipt_submitted",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
]);
export const conversationStatusEnum = pgEnum("conversation_status", ["open", "closed"]);

// ---------- Control Center (freelance agent) ----------
export const projectStatusEnum = pgEnum("project_status", [
  "found",
  "proposal_sent",
  "in_progress",
  "completed",
  "rejected",
]);
export const chatSenderEnum = pgEnum("chat_sender", ["ai", "client", "user"]);
export const walletTxStatusEnum = pgEnum("wallet_tx_status", ["pending", "confirmed", "failed"]);
export const agentTaskKindEnum = pgEnum("agent_task_kind", [
  "nextjs_scaffold",
  "translation",
  "pptx",
]);
export const agentTaskStatusEnum = pgEnum("agent_task_status", [
  "queued",
  "processing",
  "done",
  "failed",
]);

// ---------- Store Agent (sales / marketing / research) ----------
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "qualified",
  "contacted",
  "replied",
  "negotiating",
  "won",
  "lost",
  "unsubscribed",
]);
export const leadSourceEnum = pgEnum("lead_source", [
  "telegram",
  "instagram",
  "eitaa",
  "rubika",
  "bale",
  "website",
  "hashtag",
  "import",
  "manual",
  "referral",
]);
export const leadGradeEnum = pgEnum("lead_grade", ["hot", "warm", "cold"]);
export const storeMessageDirectionEnum = pgEnum("store_message_direction", [
  "inbound",
  "outbound",
  "note",
]);
export const storeMessageStatusEnum = pgEnum("store_message_status", [
  "received",
  "draft",
  "queued",
  "sent",
  "failed",
  "discarded",
]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "active", "paused", "done"]);
export const storePostStatusEnum = pgEnum("store_post_status", [
  "draft",
  "queued",
  "sent",
  "failed",
  "archived",
]);
export const researchKindEnum = pgEnum("research_kind", ["competitor", "pricing", "trend", "custom"]);
export const storeAgentKindEnum = pgEnum("store_agent_kind", [
  "research",
  "marketing",
  "sales",
  "orchestrator",
]);
export const storeAgentRunStatusEnum = pgEnum("store_agent_run_status", [
  "running",
  "done",
  "failed",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description"),
  description: text("description"),
  price: integer("price").notNull(),
  compareAtPrice: integer("compare_at_price"),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  stock: integer("stock").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  materials: text("materials"),
  dimensions: text("dimensions"),
  craftTime: text("craft_time"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull().default("awaiting_payment"),
  subtotal: integer("subtotal").notNull(),
  shippingFee: integer("shipping_fee").notNull().default(0),
  total: integer("total").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  province: text("province").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  postalCode: text("postal_code"),
  note: text("note"),
  receiptImage: text("receipt_image"),
  receiptRef: text("receipt_ref"),
  receiptNote: text("receipt_note"),
  receiptSubmittedAt: timestamp("receipt_submitted_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  trackingCode: text("tracking_code"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  productImage: text("product_image"),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  status: conversationStatusEnum("status").notNull().default("open"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  cardNumber: text("card_number").notNull(),
  cardHolder: text("card_holder").notNull(),
  bankName: text("bank_name").notNull(),
  shebaNumber: text("sheba_number"),
  shippingFee: integer("shipping_fee").notNull().default(0),
  freeShippingThreshold: integer("free_shipping_threshold").notNull().default(0),
  announcement: text("announcement"),
  supportPhone: text("support_phone"),
  instagram: text("instagram"),
  address: text("address"),
  /** Cover photo of the home-page hero; null = the bundled /images/hero.jpg. */
  heroImage: text("hero_image"),
  /** Atelier photo (home page + about page); null = the bundled /images/atelier.jpg. */
  atelierImage: text("atelier_image"),
  /** Home-page portfolio slideshow switches (managed in Admin → اسلایدشو). */
  showcaseEnabled: boolean("showcase_enabled").notNull().default(true),
  showcaseEyebrow: text("showcase_eyebrow"),
  /** Wrap part of the headline in { } to render it with the gold gradient. */
  showcaseTitle: text("showcase_title"),
  showcaseSubtitle: text("showcase_subtitle"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Curated portfolio slides shown in the home-page banner.
 * The image may be a bundled path, an external URL or a data URL uploaded
 * from the admin's device (same convention as products/categories).
 */
export const showcaseSlides = pgTable("showcase_slides", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  image: text("image").notNull(),
  alt: text("alt"),
  /** Optional click-through target, e.g. /products/pearl-box */
  href: text("href"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});


// ---------- Control Center tables ----------

/** A freelance job picked up by the agent, plus the proposal it wrote for it. */
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    /** Client name or country, e.g. "Ali — UAE" */
    clientName: text("client_name"),
    /** Upwork | Freelancer | Direct | ... */
    platform: text("platform").notNull().default("Direct"),
    /** Original job post, also used to de-duplicate discoveries. */
    sourceUrl: text("source_url"),
    description: text("description"),
    budgetUsdt: numeric("budget_usdt", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("USDT"),
    skills: text("skills").array().notNull().default([]),
    status: projectStatusEnum("status").notNull().default("found"),
    proposalText: text("proposal_text"),
    /** Telegram message holding the inline keyboard, so it can be edited later. */
    telegramMessageId: bigint("telegram_message_id", { mode: "number" }),
    proposalSentAt: timestamp("proposal_sent_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("projects_source_url_key").on(table.sourceUrl)],
);

/** Conversation log with the client + AI drafts awaiting approval. */
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sender: chatSenderEnum("sender").notNull(),
  message: text("message").notNull(),
  /** true = AI suggestion that still needs a human click before it is sent. */
  isDraft: boolean("is_draft").notNull().default(false),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  /** Telegram copy of this message (enables replying to it from the bot). */
  telegramMessageId: bigint("telegram_message_id", { mode: "number" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

/** Single-row table: USDT (TRC-20) payout address + lifetime totals. */
export const walletSettings = pgTable("wallet_settings", {
  id: serial("id").primaryKey(),
  trc20Address: text("trc20_address").notNull().default(""),
  totalEarnedUsdt: numeric("total_earned_usdt", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  network: text("network").notNull().default("TRC-20"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  amountUsdt: numeric("amount_usdt", { precision: 12, scale: 2 }).notNull(),
  network: text("network").notNull().default("TRC-20"),
  txHash: text("tx_hash"),
  status: walletTxStatusEnum("status").notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Jobs of the automated execution engine (scaffold / translate / slides). */
export const agentTasks = pgTable("agent_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  kind: agentTaskKindEnum("kind").notNull(),
  status: agentTaskStatusEnum("status").notNull().default("queued"),
  title: text("title").notNull(),
  input: jsonb("input").notNull().default({}),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Key/value store for the credentials the operator saves from the dashboard
 * (`/control/settings`). Values are encrypted at rest (AES-256-GCM with
 * APP_ENCRYPTION_KEY or a key derived from DATABASE_URL) and the table is
 * service-role only. Env vars always win over these rows when both exist.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  isSecret: boolean("is_secret").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Store Agent tables ----------

/**
 * One row per outbound channel. `mode` decides what the agent is allowed to do:
 *  • api     — a bot token exists (Telegram / Bale compatible API): real sending
 *  • manual  — no public send API for this account type: the agent prepares the
 *              message and the operator taps send / copies it (Instagram, Eitaa,
 *              Rubika, direct messages). Never scraped, never mass-DM'd.
 *  • webhook — inbound only (website form, landing pages).
 */
export const storeChannels = pgTable("store_channels", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  mode: text("mode").notNull().default("manual"),
  apiBase: text("api_base"),
  /** Bot token, encrypted at rest with the same AES-256-GCM box as app_settings. */
  token: text("token"),
  handle: text("handle"),
  enabled: boolean("enabled").notNull().default(false),
  note: text("note"),
  status: text("status").notNull().default("unverified"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Single-row configuration of the store agent (brand voice, offer, guardrails). */
export const storeAgentSettings = pgTable("store_agent_settings", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").notNull().default("AURALIS"),
  brandVoice: text("brand_voice").notNull().default(""),
  offerText: text("offer_text").notNull().default(""),
  leadMagnetTitle: text("lead_magnet_title").notNull().default(""),
  leadMagnetUrl: text("lead_magnet_url").notNull().default(""),
  storeUrl: text("store_url").notNull().default(""),
  supportPhone: text("support_phone").notNull().default(""),
  targetAudience: text("target_audience").notNull().default(""),
  maxDiscountPercent: integer("max_discount_percent").notNull().default(10),
  dailySendCap: integer("daily_send_cap").notNull().default(30),
  minGapMinutes: integer("min_gap_minutes").notNull().default(7),
  maxGapMinutes: integer("max_gap_minutes").notNull().default(18),
  quietStartHour: integer("quiet_start_hour").notNull().default(22),
  quietEndHour: integer("quiet_end_hour").notNull().default(8),
  timezone: text("timezone").notNull().default("Asia/Tehran"),
  /** Draft every reply with AI but wait for the operator before sending. */
  requireApproval: boolean("require_approval").notNull().default(true),
  /** Reply automatically with the lead magnet when somebody new says hi. */
  autoWelcome: boolean("auto_welcome").notNull().default(true),
  followUpDays: integer("follow_up_days").array().notNull().default([2, 5, 10]),
  researchCadence: text("research_cadence").notNull().default("weekly"),
  notifyTelegram: boolean("notify_telegram").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** CRM record for a potential customer captured from any channel. */
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().default(""),
    /** @username / phone / whatever identifies the person on the channel. */
    handle: text("handle"),
    /** Channel-native user id (Telegram chat id, Bale chat id, form id…). */
    externalId: text("external_id"),
    channel: text("channel").notNull().default("manual"),
    source: leadSourceEnum("source").notNull().default("manual"),
    sourceUrl: text("source_url"),
    interest: text("interest"),
    need: text("need"),
    phone: text("phone"),
    email: text("email"),
    city: text("city"),
    /** Explicit opt-in (the person asked for the offer / wrote first). */
    consent: boolean("consent").notNull().default(false),
    score: integer("score").notNull().default(0),
    grade: leadGradeEnum("grade").notNull().default("cold"),
    status: leadStatusEnum("status").notNull().default("new"),
    estimatedValue: integer("estimated_value").notNull().default(0),
    tags: text("tags").array().notNull().default([]),
    notes: text("notes"),
    lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    followUpStep: integer("follow_up_step").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("leads_channel_external_key").on(table.channel, table.externalId),
    uniqueIndex("leads_channel_handle_key").on(table.channel, table.handle),
  ],
);

/** Audit trail / timeline shown on the lead page. */
export const leadEvents = pgTable("lead_events", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  detail: text("detail"),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every inbound / outbound / drafted message of the sales agent. */
export const storeMessages = pgTable("store_messages", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  direction: storeMessageDirectionEnum("direction").notNull(),
  status: storeMessageStatusEnum("status").notNull().default("draft"),
  body: text("body").notNull(),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  externalId: text("external_id"),
  error: text("error"),
  /** Marketing post that produced this message, or any extra payload. */
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  telegramNotifyMessageId: bigint("telegram_notify_message_id", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A marketing push: one goal, one offer, one or more channels. */
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  goal: text("goal"),
  offer: text("offer"),
  audience: text("audience"),
  channels: text("channels").array().notNull().default([]),
  status: campaignStatusEnum("status").notNull().default("draft"),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  metrics: jsonb("metrics").$type<Record<string, number>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Channel-specific copy generated by the marketing agent. */
export const marketingPosts = pgTable("marketing_posts", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  channel: text("channel").notNull(),
  format: text("format").notNull().default("post"),
  title: text("title").notNull().default(""),
  body: text("body").notNull(),
  hashtags: text("hashtags").array().notNull().default([]),
  imagePrompt: text("image_prompt"),
  status: storePostStatusEnum("status").notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  externalId: text("external_id"),
  permalink: text("permalink"),
  error: text("error"),
  metrics: jsonb("metrics").$type<Record<string, number>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per product that was broadcast as a photo post to a channel.
 * The unique (product, channel) pair makes «انتشار همه محصولات» idempotent:
 * pressing it again only sends products that were never published.
 */
export const storeProductPosts = pgTable(
  "store_product_posts",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("telegram"),
    status: text("status").notNull().default("failed"),
    caption: text("caption"),
    externalId: text("external_id"),
    error: text("error"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("store_product_posts_product_channel_key").on(table.productId, table.channel)],
);

/** Competitor watch-list used by the market-research module. */
export const competitors = pgTable("competitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle"),
  url: text("url"),
  channel: text("channel"),
  priceMin: integer("price_min"),
  priceMax: integer("price_max"),
  rating: integer("rating"),
  strengths: text("strengths").array().notNull().default([]),
  weaknesses: text("weaknesses").array().notNull().default([]),
  /** Pasted customer reviews / comments, the raw material of the analysis. */
  reviewNotes: text("review_notes"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Keyword / topic signals handed from research to the marketing agent. */
export const trendSignals = pgTable("trend_signals", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull(),
  channel: text("channel"),
  score: integer("score").notNull().default(50),
  volumeHint: text("volume_hint"),
  source: text("source").notNull().default("manual"),
  note: text("note"),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Structured output of the market-research agent. */
export const researchReports = pgTable("research_reports", {
  id: serial("id").primaryKey(),
  kind: researchKindEnum("kind").notNull().default("custom"),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  insights: jsonb("insights")
    .$type<Array<{ title: string; detail: string; action?: string; impact?: string }>>()
    .notNull()
    .default([]),
  pricing: jsonb("pricing").$type<Record<string, unknown>>().notNull().default({}),
  weaknesses: text("weaknesses").array().notNull().default([]),
  trends: text("trends").array().notNull().default([]),
  sources: jsonb("sources").$type<Array<{ title: string; url?: string }>>().notNull().default([]),
  engine: text("engine").notNull().default("template"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Run log of the three agents + the orchestrator (shown on the dashboard). */
export const storeAgentRuns = pgTable("store_agent_runs", {
  id: serial("id").primaryKey(),
  kind: storeAgentKindEnum("kind").notNull(),
  status: storeAgentRunStatusEnum("status").notNull().default("running"),
  trigger: text("trigger").notNull().default("manual"),
  stats: jsonb("stats").$type<Record<string, unknown>>().notNull().default({}),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

// ---------- Relations ----------

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  conversations: many(conversations),
  messages: many(messages),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  product: one(products, { fields: [conversations.productId], references: [products.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  chats: many(chats),
  transactions: many(walletTransactions),
  tasks: many(agentTasks),
}));

export const chatsRelations = relations(chats, ({ one }) => ({
  project: one(projects, { fields: [chats.projectId], references: [projects.id] }),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  project: one(projects, { fields: [walletTransactions.projectId], references: [projects.id] }),
}));

export const agentTasksRelations = relations(agentTasks, ({ one }) => ({
  project: one(projects, { fields: [agentTasks.projectId], references: [projects.id] }),
}));

export const leadsRelations = relations(leads, ({ many }) => ({
  messages: many(storeMessages),
  events: many(leadEvents),
}));

export const storeMessagesRelations = relations(storeMessages, ({ one }) => ({
  lead: one(leads, { fields: [storeMessages.leadId], references: [leads.id] }),
}));

export const leadEventsRelations = relations(leadEvents, ({ one }) => ({
  lead: one(leads, { fields: [leadEvents.leadId], references: [leads.id] }),
}));

export const marketingPostsRelations = relations(marketingPosts, ({ one }) => ({
  campaign: one(campaigns, { fields: [marketingPosts.campaignId], references: [campaigns.id] }),
}));

// ---------- Types ----------

export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, "passwordHash">;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type ShowcaseSlide = typeof showcaseSlides.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type Chat = typeof chats.$inferSelect;
export type ChatSender = (typeof chatSenderEnum.enumValues)[number];
export type WalletSetting = typeof walletSettings.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type WalletTxStatus = (typeof walletTxStatusEnum.enumValues)[number];
export type AgentTask = typeof agentTasks.$inferSelect;
export type AgentTaskKind = (typeof agentTaskKindEnum.enumValues)[number];
export type AgentTaskStatus = (typeof agentTaskStatusEnum.enumValues)[number];
export type AppSetting = typeof appSettings.$inferSelect;

export type StoreChannel = typeof storeChannels.$inferSelect;
export type StoreAgentSettings = typeof storeAgentSettings.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];
export type LeadSource = (typeof leadSourceEnum.enumValues)[number];
export type LeadGrade = (typeof leadGradeEnum.enumValues)[number];
export type LeadEvent = typeof leadEvents.$inferSelect;
export type StoreMessage = typeof storeMessages.$inferSelect;
export type StoreMessageDirection = (typeof storeMessageDirectionEnum.enumValues)[number];
export type StoreMessageStatus = (typeof storeMessageStatusEnum.enumValues)[number];
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignStatus = (typeof campaignStatusEnum.enumValues)[number];
export type MarketingPost = typeof marketingPosts.$inferSelect;
export type StorePostStatus = (typeof storePostStatusEnum.enumValues)[number];
export type StoreProductPost = typeof storeProductPosts.$inferSelect;
export type Competitor = typeof competitors.$inferSelect;
export type TrendSignal = typeof trendSignals.$inferSelect;
export type ResearchReport = typeof researchReports.$inferSelect;
export type ResearchKind = (typeof researchKindEnum.enumValues)[number];
export type StoreAgentRun = typeof storeAgentRuns.$inferSelect;
export type StoreAgentKind = (typeof storeAgentKindEnum.enumValues)[number];
