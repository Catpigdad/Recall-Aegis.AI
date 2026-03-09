const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }
  return pool;
}

async function query(text, params) {
  const client = getPool();
  return client.query(text, params);
}

async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set — skipping database initialisation. Set DATABASE_URL in .env to enable persistence.');
    return;
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await query(schema);
    console.log('Database schema initialised successfully.');
  } catch (err) {
    console.error('Database initialisation error:', err.message);
    throw err;
  }
}

module.exports = { query, initDB, getPool };
