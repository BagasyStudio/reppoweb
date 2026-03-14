// api/tiktok-callback.js

export default async function handler(req, res) {
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

    // Usually tokenData contains access_token, refresh_token, open_id.
    const accessToken = tokenData.access_token;

    // Securely store the access token in an HTTP-only cookie
    // In a real app, you might map this `open_id` to a database user instead of raw cookies
    res.setHeader('Set-Cookie', [
      `tiktok_access_token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      `tiktok_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` // Clear the state cookie
    ]);

    // Redirect to dashboard with a success parameter
    res.redirect(302, '/dashboard.html?tiktok=success');

  } catch (err) {
    console.error('Error during token exchange:', err);
    res.redirect(302, '/dashboard.html?error=tiktok_server_error');
  }
}
