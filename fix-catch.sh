#!/bin/bash
cd /root/buildany
# Fix TypeScript: catch (err) → catch (err: any)
sed -i 's/catch (err) {/catch (err: any) {/' src/app/api/hermes-chat/route.ts
echo "Fixed catch block typing"

# Build
npm run build && pm2 restart buildany
