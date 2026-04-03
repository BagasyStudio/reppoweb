const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function initDB() {
  try {
    console.log('Connecting to database and creating tiktok_accounts table if it does not exist...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS tiktok_accounts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        tiktok_user_id VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        avatar_url TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    console.log('Successfully created tiktok_accounts table.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initDB();
