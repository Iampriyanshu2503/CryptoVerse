// ─── CryptoVerse Email Service (Resend) ──────────────────────────────────────
// lib/email.ts

const RESEND_API_KEY  = process.env.RESEND_API_KEY!
const FROM_EMAIL      = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const APP_NAME        = "CryptoVerse"

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${APP_NAME} <${FROM_EMAIL}>`, to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error("[Email] Resend error:", err)
      return false
    }
    return true
  } catch (e) {
    console.error("[Email] Send failed:", e)
    return false
  }
}

// ── Email Templates ───────────────────────────────────────────────────────────
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#050508;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#0a0a12;border:1px solid rgba(96,165,250,0.2);border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:28px 32px;border-bottom:1px solid rgba(96,165,250,0.15);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="width:36px;height:36px;background:#2563eb;border-radius:8px;display:inline-block;text-align:center;line-height:36px;font-size:16px;">🔐</div>
                <span style="color:#ffffff;font-size:18px;font-weight:900;margin-left:10px;vertical-align:middle;letter-spacing:0.05em;">CryptoVerse</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Content -->
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="color:#374151;font-size:11px;margin:0;line-height:1.6;">
            This email was sent by ${APP_NAME}. If you didn't request this, you can safely ignore it.<br/>
            © 2026 CryptoVerse · All Rights Reserved
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Verification Email ─────────────────────────────────────────────────────────
export async function sendVerificationEmail(email: string, username: string, token: string): Promise<boolean> {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`
  const html = baseTemplate(`
    <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0 0 8px;">Verify your email</h1>
    <p style="color:#9ca3af;font-size:13px;margin:0 0 24px;line-height:1.6;">
      Hey <strong style="color:#60a5fa;">${username}</strong> — welcome to CryptoVerse! 
      Click the button below to verify your email and activate your account.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:10px;padding:1px;">
        <a href="${link}" style="display:block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:900;text-align:center;letter-spacing:0.05em;">
          ✓ &nbsp; VERIFY EMAIL ADDRESS
        </a>
      </td></tr>
    </table>
    <p style="color:#6b7280;font-size:11px;margin:0 0 8px;">
      This link expires in <strong style="color:#fbbf24;">15 minutes</strong>.
    </p>
    <p style="color:#374151;font-size:11px;margin:0;word-break:break-all;">
      Or copy this link: <span style="color:#60a5fa;">${link}</span>
    </p>
  `)
  return sendEmail(email, `${APP_NAME} — Verify your email`, html)
}

// ── OTP Email ──────────────────────────────────────────────────────────────────
export async function sendOTPEmail(email: string, username: string, otp: string, purpose: "mfa" | "verify" = "mfa"): Promise<boolean> {
  const title   = purpose === "mfa" ? "Your login verification code" : "Your verification code"
  const context = purpose === "mfa"
    ? "Enter this code to complete your login."
    : "Enter this code to verify your email."

  const html = baseTemplate(`
    <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0 0 8px;">${title}</h1>
    <p style="color:#9ca3af;font-size:13px;margin:0 0 28px;line-height:1.6;">
      Hey <strong style="color:#60a5fa;">${username}</strong> — ${context}
    </p>
    <div style="background:#0d0d1a;border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
      <p style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 12px;">One-Time Code</p>
      <p style="color:#fbbf24;font-size:42px;font-weight:900;letter-spacing:0.35em;margin:0;font-family:'Courier New',monospace;">${otp}</p>
    </div>
    <p style="color:#6b7280;font-size:12px;margin:0 0 6px;">
      ⏱ This code expires in <strong style="color:#f87171;">10 minutes</strong>.
    </p>
    <p style="color:#6b7280;font-size:12px;margin:0;">
      🔒 Never share this code with anyone. CryptoVerse will never ask for it.
    </p>
  `)
  return sendEmail(email, `${APP_NAME} — Your verification code: ${otp}`, html)
}

// ── Password Reset Email ───────────────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, username: string, token: string): Promise<boolean> {
  const link = `${APP_URL}/reset-password?token=${token}`
  const html = baseTemplate(`
    <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0 0 8px;">Reset your password</h1>
    <p style="color:#9ca3af;font-size:13px;margin:0 0 24px;line-height:1.6;">
      Hey <strong style="color:#60a5fa;">${username}</strong> — we received a request to reset your password.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:10px;padding:1px;">
        <a href="${link}" style="display:block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:900;text-align:center;">
          🔑 &nbsp; RESET PASSWORD
        </a>
      </td></tr>
    </table>
    <p style="color:#6b7280;font-size:11px;margin:0;">
      This link expires in <strong style="color:#fbbf24;">15 minutes</strong>. If you didn't request this, ignore this email.
    </p>
  `)
  return sendEmail(email, `${APP_NAME} — Reset your password`, html)
}