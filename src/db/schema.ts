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
