import { createClient } from "npm:@supabase/supabase-js@2";

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
};

type AppsScriptResponse = {
  ok?: boolean;
  duplicate?: boolean;
  error?: string;
};

const APPROVAL_TITLES = new Set([
  "Persetujuan diperlukan",
  "Pengajuan disetujui",
  "Pengajuan ditolak",
]);

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new RequestError(`Konfigurasi ${name} belum tersedia.`, 500);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasMatchingSecret(received: string | null, expected: string): boolean {
  if (!received) return false;
  const encoder = new TextEncoder();
  const left = encoder.encode(received);
  const right = encoder.encode(expected);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function validateHttpsUrl(value: string, name: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RequestError(`Konfigurasi ${name} tidak valid.`, 500);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new RequestError(`${name} harus menggunakan HTTPS.`, 500);
  }
  return url;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Metode tidak didukung." }, 405);
  }

  try {
    const webhookSecret = requiredEnv("APPROVAL_EMAIL_WEBHOOK_SECRET");
    if (webhookSecret.length < 32) {
      throw new RequestError("APPROVAL_EMAIL_WEBHOOK_SECRET harus minimal 32 karakter.", 500);
    }
    if (!hasMatchingSecret(request.headers.get("x-approval-email-secret"), webhookSecret)) {
      throw new RequestError("Permintaan tidak terautentikasi.", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RequestError("Isi permintaan harus berupa JSON yang valid.", 400);
    }
    if (!isRecord(body) || typeof body.notification_id !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(body.notification_id)) {
      throw new RequestError("ID notifikasi tidak valid.", 400);
    }

    const supabase = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, link")
      .eq("id", body.notification_id)
      .maybeSingle();
    if (notificationError) throw new RequestError("Gagal memuat notifikasi approval.", 502);
    if (!notification) return jsonResponse({ error: "Notifikasi tidak ditemukan." }, 404);

    const approvalNotification = notification as Notification;
    if (approvalNotification.link !== "approvals"
      || !APPROVAL_TITLES.has(approvalNotification.title)) {
      return jsonResponse({ error: "Notifikasi ini tidak termasuk event email." }, 400);
    }

    const { data: userResult, error: userError } = await supabase.auth.admin
      .getUserById(approvalNotification.user_id);
    if (userError) throw new RequestError("Gagal memuat penerima notifikasi.", 502);
    const recipient = userResult.user?.email?.trim();
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      throw new RequestError("Alamat email penerima tidak tersedia atau tidak valid.", 422);
    }

    const appUrl = validateHttpsUrl(requiredEnv("APP_URL"), "APP_URL");
    const appsScriptUrl = validateHttpsUrl(
      requiredEnv("GOOGLE_APPS_SCRIPT_URL"),
      "GOOGLE_APPS_SCRIPT_URL",
    );
    if (appsScriptUrl.hostname !== "script.google.com") {
      throw new RequestError("GOOGLE_APPS_SCRIPT_URL harus berasal dari script.google.com.", 500);
    }

    const appsScriptToken = requiredEnv("GOOGLE_APPS_SCRIPT_TOKEN");
    if (appsScriptToken.length < 32) {
      throw new RequestError("GOOGLE_APPS_SCRIPT_TOKEN harus minimal 32 karakter.", 500);
    }

    let response: Response;
    try {
      response = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: appsScriptToken,
          notificationId: approvalNotification.id,
          to: recipient,
          subject: approvalNotification.title,
          message: approvalNotification.message,
          appUrl: appUrl.toString(),
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new RequestError("Pengiriman ke Google Apps Script gagal. Coba lagi nanti.", 502);
    }

    let result: AppsScriptResponse;
    try {
      result = await response.json() as AppsScriptResponse;
    } catch {
      throw new RequestError("Respons Google Apps Script tidak valid.", 502);
    }
    if (!response.ok || result.ok !== true) {
      throw new RequestError(
        typeof result.error === "string"
          ? `Google Apps Script menolak email: ${result.error}`
          : "Google Apps Script gagal mengirim email.",
        502,
      );
    }

    return jsonResponse({ ok: true, duplicate: result.duplicate === true });
  } catch (error) {
    if (error instanceof RequestError) {
      if (error.status >= 500) console.error(error.message);
      return jsonResponse({ error: error.message }, error.status);
    }
    console.error("Approval email notification failed.", error);
    return jsonResponse({ error: "Terjadi kegagalan saat memproses email approval." }, 500);
  }
});
