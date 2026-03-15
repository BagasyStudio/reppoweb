// api/tiktok-callback.js

module.exports = async function handler(req, res) {
  const { code, state, error, error_description } = req.query;

  // Handle User Cancellation or error
  if (error) {
    console.error(`TikTok OAuth Error: ${error_description}`);
    return res.redirect(302, '/dashboard.html?error=tiktok_auth_failed');
  }

  // Validate state to prevent CSRF
  const cookies = req.headers.cookie || '';
  const storedStateMatch = cookies.match(/tiktok_oauth_state=([^;]+)/);
  const storedState = storedStateMatch ? storedStateMatch[1] : null;

  if (!state || state !== storedState) {
    console.error('State mismatch. Possible CSRF attack.');
    return res.redirect(302, '/dashboard.html?error=invalid_state');
  }

  // Get environment variables or use the Sandbox credentials we just created
  const envKey = (process.env.TIKTOK_CLIENT_KEY || '').trim().replace(/['"]/g, '');
  const clientKey = envKey || 'sbawrrb6mhjjbmdqnm';
  
  const envSecret = (process.env.TIKTOK_CLIENT_SECRET || '').trim().replace(/['"]/g, '');
  const clientSecret = envSecret || 'aRMKC5nRPZmBwUY4bXCxCKdMy0GYh9IL';

  const scheme = req.headers.host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${scheme}://${req.headers.host}/api/tiktok-callback`;

  try {
    // Exchange Authorization Code for Access Token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Failed to get token:', tokenData);
      return res.redirect(302, '/dashboard.html?error=tiktok_token_failed');
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Fetch basic user info from TikTok using the new token
    const userUrl = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url';
    const userRes = await fetch(userUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const userData = await userRes.json();
    if (userData.error && userData.error.code !== 'ok' && userData.error.code !== 0) {
      console.error('Failed to get user profile:', userData.error);
      return res.redirect(302, '/dashboard.html?error=tiktok_user_failed');
    }

    const userInfo = userData.data.user;
    
    // Connect to Vercel Postgres and Upsert Token
    const { sql } = require('@vercel/postgres');
    
    // For this personal dashboard, we assume a single Reppo user ID.
    // In a multi-tenant app, you would use the logged-in user ID from a session token.
    const reppoUserId = 'reppo_admin'; 
    
    try {
      await sql`
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
    } catch (dbError) {
      console.error('Database Error:', dbError);
      return res.redirect(302, `/dashboard.html?error=db_error&details=${encodeURIComponent(dbError.message || dbError)}`);
    }

    // Still set a session cookie to indicate the user is logged in
    res.setHeader('Set-Cookie', [
      `reppo_session_id=${reppoUserId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      `tiktok_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` // Clear the state cookie
    ]);

    // Redirect to dashboard with a success parameter
    res.redirect(302, '/dashboard.html?tiktok=success');

  } catch (err) {
    console.error('Error during token exchange:', err);
    res.redirect(302, '/dashboard.html?error=tiktok_server_error');
  }
}
