// Email sender utility - stub for SMTP integration
// In production, use nodemailer or a transactional email service (SendGrid, Mailgun, Resend)

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  console.log("📧 Sending email:", {
    to: options.to,
    subject: options.subject,
  });

  // TODO: Integrate with actual email provider
  // Option 1: Resend (recommended - free tier: 3,000 emails/month)
  // Option 2: SendGrid
  // Option 3: Mailgun
  // Option 4: AWS SES

  // For Postfix integration on the VPS:
  // 1. Configure Postfix to relay emails
  // 2. Use `sendmail` command or SMTP localhost:25

  console.log("✅ Email prepared (integrate with email provider to send)");
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

# 5. Set up webhook secret
# Set up webhook secret
# Add to /etc/environment: WEBHOOK_SECRET=your-secret-here

# For the actual email pipe script, use the webhook secret from env:
# curl -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" ...

# For simple local relay without external SMTP:
# sudo postconf -e "relayhost="
# sudo postconf -e "mydestination = $myhostname, localhost, base66.cloud, buildany"
# sudo systemctl restart postfix
`;
}
