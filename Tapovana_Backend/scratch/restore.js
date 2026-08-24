const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  await client.connect();
  console.log('Connected to Neon Postgres DB');

  const sqlPath = path.join(__dirname, '../tapovana_backup.sql');
  const content = fs.readFileSync(sqlPath, 'utf8');
  const lines = content.split('\n');

  let currentTable = null;
  let currentColumns = null;
  let inCopy = false;
  let statements = [];
  let buffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('\\') && !inCopy) continue;

    const copyMatch = line.match(/^COPY\s+([^\s]+)\s*\(([^)]+)\)\s*FROM\s+stdin;/i);
    if (copyMatch) {
      inCopy = true;
      currentTable = copyMatch[1];
      currentColumns = copyMatch[2].split(',').map(c => c.trim());
      console.log('Processing COPY for table:', currentTable);
      continue;
    }

    if (inCopy) {
      if (line.trim() === '\\.') {
        inCopy = false;
        currentTable = null;
        currentColumns = null;
        continue;
      }
      
      const values = line.split('\t').map(val => {
        if (val === '\\N') return 'NULL';
        const escaped = val.replace(/'/g, "''");
        return `'${escaped}'`;
      });

      const insertSql = `INSERT INTO ${currentTable} (${currentColumns.join(', ')}) VALUES (${values.join(', ')});`;
      statements.push(insertSql);
    } else {
      if (line.includes('OWNER TO') || line.includes('GRANT ') || line.includes('REVOKE ')) continue;
      
      buffer.push(line);
      if (line.trim().endsWith(';')) {
        const stmt = buffer.join('\n').trim();
        if (stmt) statements.push(stmt);
        buffer = [];
      }
    }
  }

  console.log(`Executing ${statements.length} statements...`);
  let successCount = 0;
  let failCount = 0;

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      successCount++;
    } catch (err) {
      failCount++;
      // Silently skip existing table / extension warnings
    }
  }

  console.log(`Restore complete! Successful statements: ${successCount}, Skipped/Failed: ${failCount}`);
  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
