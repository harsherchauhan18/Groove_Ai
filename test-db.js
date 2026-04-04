const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'postgres',
  password: 'dorthipostgresql',
  port: 5432,
});

async function test() {
  try {
    await client.connect();
    console.log('Success!');
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
