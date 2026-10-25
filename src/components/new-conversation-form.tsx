"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

type ProductOption = { id: number; name: string; slug: string };

export function NewConversationForm({ products, initialProductId, initialSubject }: { products: ProductOption[]; initialProductId: number | null; initialSubject?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [productId, setProductId] = useState<string>(initialProductId ? String(initialProductId) : "");
  const [subject, setSubject] = useState(initialSubject ?? (initialProductId ? `پرسش درباره ${products.find((p) => p.id === initialProductId)?.name ?? "محصول"}` : ""));
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, productId: productId ? Number(productId) : null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "خطایی رخ داد.");
      setLoading(false);
      return;
    }
    toast("گفتگو آغاز شد. به‌زودی پاسخ می‌دهیم.");
    router.push(`/account/messages/${data.conversation.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card-luxe space-y-4 p-6">
      <Field label="درباره محصول (اختیاری)">
        <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">— گفتگوی عمومی —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="موضوع" required>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً: سفارش اختصاصی کیف با مروارید شامپاینی" required />
      </Field>
      <Field label="پیام شما" required>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="سلام، می‌خواستم بدانم…" className="min-h-[140px]" required />
      </Field>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <Button type="submit" variant="gold" size="lg" loading={loading}>
        <SendHorizontal className="size-4 -scale-x-100" /> ارسال پیام
      </Button>
    </form>
  );
}
