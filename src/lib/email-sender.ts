import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

interface EmailResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  console.log("📧 Sending email:", {
    to: options.to,
    subject: options.subject,
  });

  // If Resend is configured, use it
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: options.from || 'BuildAny <create@base66.cloud>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (result.error) {
        console.error("Resend error:", result.error);
        return {
          success: false,
          provider: "resend",
          error: result.error.message,
        };
      }

      console.log("✅ Email sent via Resend:", result.data?.id);
      return {
        success: true,
        provider: "resend",
        messageId: result.data?.id,
      };
    } catch (err) {
      console.error("Resend exception:", err);
      return {
        success: false,
        provider: "resend",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Fallback: log only (Resend not configured)
  console.log("⚠️ Resend not configured. Email logged but not sent.");
  console.log("   To enable: Set RESEND_API_KEY in .env.local");
  console.log("   Get one free at: https://resend.com");
  
  return {
    success: false,
    provider: "none",
    error: "Resend API key not configured",
  };
}

export async function sendBulkEmails(options: EmailOptions[]): Promise<EmailResult[]> {
  const results: EmailResult[] = [];
  for (const opt of options) {
    results.push(await sendEmail(opt));
  }
  return results;
}

// Postfix setup instructions for the VPS:
export function getPostfixSetupInstructions(): string {
  return `
# Postfix Setup for BuildAny Email Integration
# Run these commands on the VPS (srv1730121):

# 1. Install Postfix
sudo apt update
sudo apt install -y postfix mailutils

# 2. Configure Postfix as Internet Site with Smart Host
# Edit /etc/postfix/main.cf:
# - relayhost = [smtp.gmail.com]:587 (or your SMTP provider)
# - smtp_sasl_auth_enable = yes
# - smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
# - smtp_sasl_security_options = noanonymous
# - smtp_tls_security_level = encrypt

# 3. Add pipe alias for webhook
# Edit /etc/aliases:
# buildany: "|curl -X POST https://base66.cloud/api/webhook/email -H 'Content-Type: application/json' -d @-"

# 4. Create email pipe script
# /usr/local/bin/buildany-email-pipe:
#!/bin/bash
read -d '' BODY < /dev/stdin
JSON=$(echo "$BODY" | python3 -c "import sys,json; print(json.dumps({'raw': sys.stdin.read()}))")
curl -X POST https://base66.cloud/api/webhook/email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -d "$JSON"

# For simple local relay without external SMTP:
# sudo postconf -e "relayhost="
# sudo postconf -e "mydestination = $myhostname, localhost, base66.cloud, buildany"
# sudo systemctl restart postfix
`;
}
