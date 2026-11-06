import { eq } from "drizzle-orm";
import { db } from "@/db";
import { walletSettings, walletTransactions } from "@/db/schema";
import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { getWallet, listTransactionsWithProjects, syncWalletTotal, usdt } from "@/lib/control/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const [wallet, transactions] = await Promise.all([getWallet(), listTransactionsWithProjects()]);
  return ok({ wallet, transactions });
}

type Body = {
  action?: "update-wallet" | "add-transaction" | "confirm" | "delete";
  trc20Address?: string;
  network?: string;
  id?: number;
  projectId?: number | null;
  amountUsdt?: number | string;
  txHash?: string;
  note?: string;
};

/** TRON addresses: base58, 34 chars, starting with T. */
export function isValidTrc20(address: string) {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address.trim());
}

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const body = (await readJson<Body>(req)) ?? {};
  const action = body.action ?? "add-transaction";

  if (action === "update-wallet") {
    const address = (body.trc20Address ?? "").trim();
    if (address && !isValidTrc20(address)) {
      return bad("آدرس TRC-20 معتبر نیست (باید با T شروع شود و ۳۴ کاراکتر باشد).");
    }
    const wallet = await getWallet();
    const [updated] = await db
      .update(walletSettings)
      .set({ trc20Address: address, network: body.network?.trim() || "TRC-20" })
      .where(eq(walletSettings.id, wallet.id))
      .returning();
    return ok({ ok: true, message: "آدرس کیف پول ذخیره شد.", wallet: updated });
  }

  if (action === "confirm" || action === "delete") {
    if (!body.id) return bad("شناسه تراکنش لازم است.");
    if (action === "delete") {
      await db.delete(walletTransactions).where(eq(walletTransactions.id, body.id));
    } else {
      await db.update(walletTransactions).set({ status: "confirmed" }).where(eq(walletTransactions.id, body.id));
    }
    const total = await syncWalletTotal();
    return ok({ ok: true, message: action === "delete" ? "تراکنش حذف شد." : "تراکنش تایید شد.", totalEarnedUsdt: total });
  }

  const amount = usdt(body.amountUsdt);
  if (!(amount > 0)) return bad("مبلغ باید بزرگ‌تر از صفر باشد.");
  if (body.txHash && !/^[0-9a-fA-F]{64}$/.test(body.txHash.trim())) {
    return bad("هش تراکنش TRON باید ۶۴ کاراکتر هگز باشد.");
  }

  const [row] = await db
    .insert(walletTransactions)
    .values({
      projectId: body.projectId ?? null,
      amountUsdt: amount.toFixed(2),
      network: body.network?.trim() || "TRC-20",
      txHash: body.txHash?.trim() || null,
      status: body.txHash?.trim() ? "confirmed" : "pending",
      note: body.note?.trim() || null,
    })
    .returning();

  const total = await syncWalletTotal();
  return ok({ ok: true, message: "تراکنش ثبت شد.", transaction: row, totalEarnedUsdt: total }, 201);
}
