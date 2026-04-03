const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function deleteTestInsert() {
  try {
    const res = await sql`
        DELETE FROM tiktok_accounts
        WHERE tiktok_user_id = 'test_open_id'
      `;
    console.log('Success:', res);
  } catch (error) {
    console.error('Database Error details:', error);
  }
}

deleteTestInsert();
