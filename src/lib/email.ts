import "server-only";

/**
 * Transactional email through Resend's HTTP API.
 *
 *   RESEND_API_KEY  — from the Resend dashboard (or the Vercel integration)
 *   EMAIL_FROM      — e.g. "Rangkaarii <no-reply@rangkaarii.in>"; the domain
 *                     must be verified in Resend. Until it is, Resend's shared
 *                     onboarding@resend.dev sender only delivers to the
 *                     Resend account owner's own address.
 */
const DEFAULT_FROM = "Rangkaarii <onboarding@resend.dev>";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend rejected the email (${response.status}): ${detail.slice(0, 300)}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function passwordResetEmail(input: {
  name: string | null;
  link: string;
  minutes: number;
}) {
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  const link = escapeHtml(input.link);

  const text = [
    greeting,
    "",
    "We received a request to reset the password for your Rangkaarii account.",
    `Open this link to choose a new one (it works once, for ${input.minutes} minutes):`,
    "",
    input.link,
    "",
    "If you didn't ask for this, you can ignore this email — your password won't change.",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f7f3ee;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <p style="font-family:Georgia,serif;font-size:28px;margin:0 0 24px">Rangkaarii</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px">${escapeHtml(greeting)}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px">
      We received a request to reset the password for your Rangkaarii account.
      The button below works once, for ${input.minutes} minutes.
    </p>
    <a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px">
      Reset password
    </a>
    <p style="font-size:13px;line-height:1.6;color:#6b6b6b;margin:24px 0 0">
      If the button doesn't work, paste this link into your browser:<br>
      <span style="word-break:break-all">${link}</span>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#6b6b6b;margin:16px 0 0">
      If you didn't ask for this, you can ignore this email — your password won't change.
    </p>
  </div>
</body></html>`;

  return { subject: "Reset your Rangkaarii password", html, text };
}
