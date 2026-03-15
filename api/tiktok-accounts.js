const { sql } = require('@vercel/postgres');

export default async function handler(req, res) {
  // Extract user session ID from HTTP-only cookie
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/reppo_session_id=([^;]+)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated with Reppo.' });
  }

  try {
    const { rows } = await sql`SELECT id, username, display_name, avatar_url, updated_at FROM tiktok_accounts WHERE user_id = ${sessionId}`;
    return res.status(200).json({ accounts: rows });
  } catch (error) {
    console.error('Database Error getting accounts:', error);
    return res.status(500).json({ error: 'Error fetching accounts' });
  }
}
