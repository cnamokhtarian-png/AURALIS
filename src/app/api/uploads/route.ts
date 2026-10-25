import { randomBytes } from "crypto";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest } from "@/lib/server";

export const dynamic = "force-dynamic";

const BUCKET = "product-images";
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024; // 6 MB

type DetectedImage = {
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/avif";
  ext: "jpg" | "png" | "webp" | "gif" | "avif";
};

/**
 * Inspect magic bytes so disguised HTML/SVG/script files are strictly rejected
 * regardless of the client-reported filename or Content-Type.
 */
function detectImageFormat(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  // GIF: "GIF87a" or "GIF89a"
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { mime: "image/gif", ext: "gif" };
  }

  // AVIF: ISO Base Media File Format ("ftyp" at offset 4, brand "avif" / "avis")
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    (bytes[11] === 0x66 || bytes[11] === 0x73)
  ) {
    return { mime: "image/avif", ext: "avif" };
  }

  return null;
}

async function ensureSupabaseBucket(supabaseUrl: string, serviceRoleKey: string) {
  await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 8 * 1024 * 1024,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
    }),
  }).catch(() => null);
}

async function putObjectToSupabase(
  supabaseUrl: string,
  serviceRoleKey: string,
  objectPath: string,
  mime: string,
  bytes: Uint8Array,
) {
  return fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": mime,
      "Cache-Control": "31536000",
      "x-upsert": "false",
    },
    body: Buffer.from(bytes),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return badRequest("فرم ارسالی نامعتبر است.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return badRequest("لطفاً یک فایل تصویری انتخاب کنید.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return badRequest("حجم تصویر باید کمتر از ۶ مگابایت باشد.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageFormat(bytes);
  if (!detected) {
    return badRequest("فرمت فایل پشتیبانی نمی‌شود. لطفاً تصویر JPG، PNG یا WebP انتخاب کنید.");
  }

  const rawFolder = String(formData.get("folder") ?? "products");
  const folder = rawFolder === "categories" ? "categories" : "products";
  const month = new Date().toISOString().slice(0, 7);
  const objectPath = `${folder}/${month}/${Date.now()}-${randomBytes(8).toString("hex")}.${detected.ext}`;

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (supabaseUrl && serviceRoleKey) {
    let res = await putObjectToSupabase(supabaseUrl, serviceRoleKey, objectPath, detected.mime, bytes);
    if (!res.ok && (res.status === 400 || res.status === 404)) {
      await ensureSupabaseBucket(supabaseUrl, serviceRoleKey);
      res = await putObjectToSupabase(supabaseUrl, serviceRoleKey, objectPath, detected.mime, bytes);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Supabase Storage upload failed:", res.status, detail);
      return Response.json(
        { error: "ذخیره‌سازی تصویر در فضای ابری ناموفق بود. لطفاً دوباره تلاش کنید." },
        { status: 502 },
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
    return Response.json({ url: publicUrl }, { status: 201 });
  }

  // Local development fallback when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set
  if (bytes.byteLength > 2.5 * 1024 * 1024) {
    return badRequest("در محیط توسعه بدون فضای ابری، حجم تصویر باید کمتر از ۲.۵ مگابایت باشد.");
  }
  const inlineUrl = `data:${detected.mime};base64,${Buffer.from(bytes).toString("base64")}`;
  return Response.json({ url: inlineUrl }, { status: 201 });
}
