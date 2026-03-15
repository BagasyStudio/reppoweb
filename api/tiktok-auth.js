// api/tiktok-auth.js

module.exports = async function handler(req, res) {
  const envKey = (process.env.TIKTOK_CLIENT_KEY || '').trim().replace(/['"]/g, '');
  const clientKey = envKey || 'sbawrrb6mhjjbmdqnm';
  
  // Determine dynamically the host to support testing locally vs production
  const scheme = req.headers.host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${scheme}://${req.headers.host}/api/tiktok-callback`;

  // CSRF token (state parameter)
  const state = Math.random().toString(36).substring(7);
  
  // Scopes requested from the user
  const scope = 'user.info.basic,user.info.stats,video.list';

  // Construct the TikTok authorization URL
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/`
    + `?client_key=${clientKey}`
    + `&scope=${scope}`
    + `&response_type=code`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`
    + `&state=${state}`;

  // Use a secure, HTTP-only cookie to store the state to prevent CSRF
  res.setHeader('Set-Cookie', `tiktok_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`);
  
  // Redirect the user to TikTok
  res.redirect(302, authUrl);
}
