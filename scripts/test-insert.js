const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function testInsert() {
  try {
    const reppoUserId = 'reppo_admin'; 
    const userInfo = {
      open_id: 'test_open_id',
      display_name: 'test_name',
      avatar_url: 'http://test.com/avatar.png'
    };
    const accessToken = 'test_access_token';
    const refreshToken = 'test_refresh_token';

    const res = await sql`
        INSERT INTO tiktok_accounts (
          user_id,
          tiktok_user_id,
          username,
          display_name,
          avatar_url,
          access_token,
          refresh_token,
          updated_at
        ) VALUES (
          ${reppoUserId},
          ${userInfo.open_id},
          ${userInfo.display_name}, 
          ${userInfo.display_name},
          ${userInfo.avatar_url},
          ${accessToken},
          ${refreshToken},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (tiktok_user_id) 
        DO UPDATE SET 
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = CURRENT_TIMESTAMP;
      `;
    console.log('Success:', res);
  } catch (error) {
    console.error('Database Error details:', error);
  }
}

testInsert();
