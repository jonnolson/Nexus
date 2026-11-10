import "server-only";
import { serverEnv } from "@/lib/server-env";

export type EmailAttachment = { filename: string; content: Buffer };

/**
 * Sends one email through Resend's REST API (no SDK needed).
 * Returns an error message instead of throwing so callers can show it.
 */
export async function sendEmail(msg: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string | null;
  attachments?: EmailAttachment[];
}): Promise<{ error?: string }> {
  const { RESEND_API_KEY, INVOICE_FROM_EMAIL } = serverEnv;
  if (!RESEND_API_KEY || !INVOICE_FROM_EMAIL) return { error: "Email isn't set up yet." };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: INVOICE_FROM_EMAIL,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      attachments: msg.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch((e: unknown) => ({ ok: false, status: 0, text: async () => String(e) }) as const);

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Resend error", res.status, detail.slice(0, 500));
    return { error: res.status === 0 ? "Couldn't reach the email service." : "The email service rejected the message." };
  }
  return {};
}
