import { MoneyBar, StatCard } from "@/components/control/cards";
import { Panel } from "@/components/control/ui";
import { WalletManager } from "@/components/control/wallet-manager";
import { getWallet, listProjects, listTransactionsWithProjects } from "@/lib/control/data";
import { faNumber, usdtAmount } from "@/lib/control/shared";
import { Wallet, TrendingUp, Clock, Coins } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "کیف پول و تسویه" };

export default async function WalletPage() {
  const [wallet, transactions, projects] = await Promise.all([
    getWallet(),
    listTransactionsWithProjects(100),
    listProjects({ limit: 100 }),
  ]);

  const confirmed = transactions.filter((t) => t.tx.status === "confirmed");
  const pending = transactions.filter((t) => t.tx.status === "pending");
  const confirmedTotal = confirmed.reduce((s, t) => s + Number(t.tx.amountUsdt), 0);
  const pendingTotal = pending.reduce((s, t) => s + Number(t.tx.amountUsdt), 0);
  const completedProjects = projects.filter((p) => p.status === "completed");
  const pipeline = projects
    .filter((p) => p.status === "proposal_sent" || p.status === "in_progress")
    .reduce((s, p) => s + Number(p.budgetUsdt), 0);
  const max = Math.max(confirmedTotal, pendingTotal, pipeline, 1);

  return (
    <div className="space-y-5 cc-fade-up">
      <header>
        <h1 className="text-xl font-extrabold text-white">کیف پول و تسویه USDT</h1>
        <p className="mt-1 text-[12px] text-[#8ba0b8]">
          آدرس TRC-20 خود را ثبت کنید و همه واریزی‌ها را با هش تراکنش پیگیری کنید.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="کل درآمد تسویه‌شده"
          value={faNumber(confirmedTotal, confirmedTotal % 1 === 0 ? 0 : 2)}
          unit="USDT"
          icon={<Wallet className="size-5" />}
          tone="emerald"
          hint={<span>{faNumber(confirmed.length)} تراکنش تاییدشده</span>}
        />
        <StatCard
          label="در انتظار دریافت"
          value={faNumber(pendingTotal, pendingTotal % 1 === 0 ? 0 : 2)}
          unit="USDT"
          icon={<Clock className="size-5" />}
          tone="amber"
          hint={<span>{faNumber(pending.length)} تراکنش در انتظار</span>}
        />
        <StatCard
          label="پروژه‌های تسویه‌شده"
          value={faNumber(completedProjects.length)}
          unit="پروژه"
          icon={<Coins className="size-5" />}
          tone="violet"
          hint={<span>از {faNumber(projects.length)} پروژه ثبت‌شده</span>}
        />
        <StatCard
          label="خط لوله درآمد"
          value={faNumber(pipeline)}
          unit="USDT"
          icon={<TrendingUp className="size-5" />}
          tone="sky"
          hint={<span>پیشنهادهای ارسال‌شده و در حال انجام</span>}
        />
      </div>

      <Panel title="نمای کلی جریان نقدی" subtitle="مقایسه وضعیت‌ها (USDT)">
        <div className="space-y-4">
          <MoneyBar label="تسویه‌شده" value={confirmedTotal} total={max} tone="emerald" />
          <MoneyBar label="در انتظار" value={pendingTotal} total={max} tone="amber" />
          <MoneyBar label="خط لوله" value={pipeline} total={max} tone="sky" />
        </div>
        <p className="mt-4 text-[10px] text-[#5e7288]">
          مبلغ کل ذخیره‌شده در تنظیمات: {usdtAmount(wallet.totalEarnedUsdt)}
        </p>
      </Panel>

      <WalletManager
        wallet={wallet}
        transactions={transactions}
        projects={projects.map((p) => ({ id: p.id, title: p.title, budgetUsdt: p.budgetUsdt }))}
      />
    </div>
  );
}
