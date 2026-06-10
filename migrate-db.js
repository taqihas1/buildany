const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbPath = process.argv[2] || './sqlite.db';

if (!fs.existsSync(dbPath)) {
  console.log('Database not found, will be created automatically.');
  process.exit(0);
}

console.log(`Checking schema for ${dbPath}...`);

// Check if agents table has project_id column
const checkAgents = execSync(`sqlite3 "${dbPath}" "PRAGMA table_info(agents);"`, { encoding: 'utf8' });
if (!checkAgents.includes('project_id')) {
  console.log('Adding project_id column to agents table...');
  execSync(`sqlite3 "${dbPath}" "ALTER TABLE agents ADD COLUMN project_id TEXT;"`);
  console.log('✅ Added project_id to agents table');
} else {
  console.log('✅ agents.project_id already exists');
}

// Check if tasks table has proper columns
const checkTasks = execSync(`sqlite3 "${dbPath}" "PRAGMA table_info(tasks);"`, { encoding: 'utf8' });
if (!checkTasks.includes('output')) {
  console.log('Adding output column to tasks table...');
  execSync(`sqlite3 "${dbPath}" "ALTER TABLE tasks ADD COLUMN output TEXT;"`);
  console.log('✅ Added output to tasks table');
} else {
  console.log('✅ tasks.output already exists');
}

console.log('Schema migration complete!');
