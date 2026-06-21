#!/usr/bin/env node
/**
 * Fix: Replace uuid import with crypto.randomUUID (built into Node)
 */
const fs = require('fs');
const ROUTE_FILE = '/root/buildany/src/app/api/hermes-chat/route.ts';

let content = fs.readFileSync(ROUTE_FILE, 'utf8');

// Replace uuid import with crypto import
content = content.replace(
  'import { v4 as uuidv4 } from "uuid";',
  'import { randomUUID } from "crypto";'
);

// Replace uuidv4() with randomUUID()
content = content.replace(/uuidv4\(\)/g, 'randomUUID()');

fs.writeFileSync(ROUTE_FILE, content);
console.log('✅ Replaced uuid with crypto.randomUUID');
