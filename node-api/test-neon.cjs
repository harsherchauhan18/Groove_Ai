const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9RyWmixN57IU@ep-delicate-tree-anzcxsrh.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false,
  },
});

async function test() {
  try {
    await client.connect();
    console.log('Success!');
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
test();
