# Telegram Bot Setup for BuildAny

## Step 1: Create Bot with @BotFather

1. Open Telegram and search for **@BotFather**
2. Click **START** or send `/start`
3. Send `/newbot` to create a new bot
4. Choose a name: `BuildAny` (display name)
5. Choose a username: `BuildAnyBot` (must end in `bot`, e.g., `BuildAnyBot` or `BuildAny_Builder_Bot`)
6. BotFather will give you a **token** like:
   ```
   123456789:ABCdefGHIjklMNOpqrSTUvwxyz
   ```
   **Save this token!** It won't be shown again.

## Step 2: Set Webhook URL

Run this on the VPS (or any machine with `curl`):

```bash
# Replace with your actual bot token
BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
WEBHOOK_URL="https://base66.cloud/api/webhook/telegram"

curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\"}"
```

Expected response:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Step 3: Verify Webhook

```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

Should show:
```json
{
  "ok": true,
  "result": {
    "url": "https://base66.cloud/api/webhook/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

## Step 4: Add Bot Token to BuildAny Environment

```bash
# On the VPS, add to /docker/buildany/.env.local
echo "TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE" >> /docker/buildany/.env.local

# Restart the app
pm2 restart buildany --update-env
```

## Step 5: Test It

1. Open Telegram, search for your bot (e.g., `@BuildAnyBot`)
2. Click **START** or send `/start`
3. You should get a welcome message about BuildAny
4. Send a prompt like: `Build a fitness tracking app`
5. The bot should reply with a project link!

## Bot Commands (Optional but Recommended)

Send these to @BotFather to set up bot commands:

```
/start - Start BuildAny and see welcome message
/build - Build a new app (same as sending any prompt)
/status - Check your active projects
/help - Get help and examples
```

Set them via BotFather:
```
/setcommands
@BuildAnyBot
start - Start BuildAny and see welcome message
build - Build a new app
status - Check your active projects
help - Get help and examples
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Webhook not receiving messages | Check that base66.cloud is accessible (HTTPS required) |
| Bot not responding | Verify token is correct, check `getWebhookInfo` |
| SSL errors | Telegram requires valid SSL certificate (Let's Encrypt is fine) |
| Messages delayed | Check `pending_update_count` in webhook info |

## Advanced: Bot API Integration (Optional)

For more control (sending messages proactively, buttons, etc.), use the Bot API directly from Hermes:

```typescript
// In Hermes notification handler, send messages via Bot API:
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const chatId = userTelegramId; // From webhook payload

fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: '🎉 Your app is ready!',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '🔗 View Project', url: 'https://base66.cloud/project/123' },
        { text: '📱 Deploy', callback_data: 'deploy:123' }
      ]]
    }
  })
});
```
