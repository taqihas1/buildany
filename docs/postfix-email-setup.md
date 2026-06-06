# Postfix Email Integration for BuildAny

## Overview

This sets up Postfix on the VPS to receive emails at `create@base66.cloud` and forward them to the BuildAny webhook.

## Step 1: Install Postfix

```bash
sudo apt update
sudo apt install -y postfix mailutils curl
```

During installation, select:
- **Internet Site** (or **Internet with smarthost** if using external relay)
- System mail name: `base66.cloud`

## Step 2: Configure Postfix

Edit `/etc/postfix/main.cf`:

```bash
sudo nano /etc/postfix/main.cf
```

Add or modify these lines:

```ini
# Basic settings
myhostname = base66.cloud
mydomain = base66.cloud
myorigin = $mydomain
inet_interfaces = all
inet_protocols = ipv4
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain

# Mailbox size limit (0 = unlimited)
mailbox_size_limit = 0
recipient_delimiter = +

# Aliases
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases

# For local delivery + pipe
local_recipient_maps =
```

## Step 3: Create Email-to-Webhook Pipe Script

```bash
sudo mkdir -p /usr/local/bin/buildany
sudo tee /usr/local/bin/buildany/email-pipe.sh > /dev/null << 'EOF'
#!/bin/bash
# Email-to-BuildAny webhook pipe
# Receives raw email from stdin, extracts data, sends to webhook

# Read entire email body
BODY=$(cat)

# Extract From
FROM=$(echo "$BODY" | grep -i "^From:" | head -1 | sed 's/^From: //i' | sed 's/.*<\(.*\)>.*/\1/' | sed 's/^ *//;s/ *$//')
[ -z "$FROM" ] && FROM=$(echo "$BODY" | grep -i "^From:" | head -1 | sed 's/^From: //i')

# Extract To
TO=$(echo "$BODY" | grep -i "^To:" | head -1 | sed 's/^To: //i' | sed 's/.*<\(.*\)>.*/\1/' | sed 's/^ *//;s/ *$//')
[ -z "$TO" ] && TO=$(echo "$BODY" | grep -i "^To:" | head -1 | sed 's/^To: //i')

# Extract Subject
SUBJECT=$(echo "$BODY" | grep -i "^Subject:" | head -1 | sed 's/^Subject: //i' | sed 's/^ *//;s/ *$//')

# Extract message body (after first blank line)
TEXT=$(echo "$BODY" | sed '0,/^$/d' | head -100)

# Build JSON payload
JSON=$(python3 -c "
import json, sys
from_email = sys.argv[1]
to_email = sys.argv[2]
subject = sys.argv[3]
text = sys.argv[4]
print(json.dumps({
    'from': from_email,
    'to': to_email,
    'subject': subject,
    'text': text,
    'html': text.replace('\n', '<br>')
}))
" "$FROM" "$TO" "$SUBJECT" "$TEXT")

# Send to webhook
WEBHOOK_URL="https://base66.cloud/api/webhook/email"
WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET_HERE"

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -d "$JSON" \
  --silent \
  --max-time 30

exit 0
EOF

sudo chmod +x /usr/local/bin/buildany/email-pipe.sh
```

## Step 4: Configure Alias for BuildAny

Edit `/etc/aliases`:

```bash
sudo tee -a /etc/aliases > /dev/null << 'EOF'

# BuildAny email integration
buildany: |/usr/local/bin/buildany/email-pipe.sh
create: |/usr/local/bin/buildany/email-pipe.sh
EOF

sudo newaliases
```

## Step 5: Set Webhook Secret

Generate a secure webhook secret:

```bash
# Generate a random secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Webhook secret: $WEBHOOK_SECRET"

# Add to BuildAny environment
sudo tee -a /docker/buildany/.env.local > /dev/null << EOF
WEBHOOK_SECRET=$WEBHOOK_SECRET
EOF

# Also add to the email pipe script
sudo sed -i "s/YOUR_WEBHOOK_SECRET_HERE/$WEBHOOK_SECRET/g" /usr/local/bin/buildany/email-pipe.sh
```

## Step 6: Update Postfix Master Config for Pipe

Edit `/etc/postfix/master.cf`:

```bash
sudo tee -a /etc/postfix/master.cf > /dev/null << 'EOF'

# BuildAny email pipe
buildany unix  -       n       n       -       -       pipe
  flags=F user=www-data argv=/usr/local/bin/buildany/email-pipe.sh
EOF
```

## Step 7: Restart Postfix

```bash
sudo systemctl restart postfix
sudo systemctl enable postfix
```

## Step 8: Verify Email Reception

Test with a simple email:

```bash
# Send a test email locally
echo "This is a test email for BuildAny. Create a fitness tracking app please." | \
  mail -s "Build a fitness app" -a "From: test@example.com" create@base66.cloud

# Check Postfix logs
sudo tail -f /var/log/mail.log
```

You should see:
- Postfix receiving the email
- The pipe script being called
- The webhook receiving the request (check BuildAny logs)

## Step 9: Test from External Email

Send an email from Gmail/Outlook to: **create@base66.cloud**

Subject: `Build a recipe app with AI images`

Body: `A mobile app for high protein recipes with beautiful AI-generated food photos. No pork recipes. Include a weekly meal planner.`

Expected result: BuildAny receives the email, creates a project, and sends a reply with the project link!

## DNS Configuration (Already Done)

Make sure your MX records are set up:

```
Type    Name    Priority    Content             TTL
MX      @       10          base66.cloud.       3600
MX      @       20          mail.base66.cloud.  3600
A       mail                2.25.170.135        3600
```

Verify:
```bash
dig MX base66.cloud +short
# Should show: 10 base66.cloud.
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Emails not received | Check `sudo tail -f /var/log/mail.log` for errors |
| Webhook not called | Check pipe script logs, verify `curl` is installed |
| SSL errors | Postfix may need CA certificates: `sudo apt install ca-certificates` |
| Permission denied | Ensure pipe script is executable: `chmod +x` |
| Port 25 blocked | Some VPS providers block port 25. Check with provider or use port 587 for submission |

## Security Considerations

1. **Webhook Secret**: Always verify the secret in the webhook handler to prevent spam
2. **Rate Limiting**: Consider rate limiting per email address to prevent abuse
3. **Email Validation**: Validate sender email to prevent spoofing
4. **Content Filtering**: Sanitize email content before processing

## Optional: External SMTP Relay (if port 25 is blocked)

If your VPS blocks port 25, use an external SMTP relay (Mailgun, SendGrid, AWS SES):

```ini
# /etc/postfix/main.cf
relayhost = [smtp.mailgun.org]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
```

```bash
# /etc/postfix/sasl_passwd
[smtp.mailgun.org]:587    postmaster@base66.cloud:YOUR_MAILGUN_KEY

sudo postmap /etc/postfix/sasl_passwd
sudo chmod 600 /etc/postfix/sasl_passwd
sudo systemctl restart postfix
```
