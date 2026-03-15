// api/tiktok-data.js

const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  // Extract user session ID from HTTP-only cookie
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/reppo_session_id=([^;]+)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated with Reppo. Please login.' });
  }

  try {
    // 1. Fetch all connected TikTok accounts for this user from Postgres
    const { rows: accounts } = await sql`
      SELECT id, tiktok_user_id, display_name, access_token 
      FROM tiktok_accounts 
      WHERE user_id = ${sessionId}
    `;

    if (accounts.length === 0) {
      return res.status(401).json({ error: 'No TikTok accounts connected.' });
    }

    let aggregatedStats = {
      followers: 0,
      total_likes: 0,
      published_videos: 0,
      estimated_total_views: 0,
    };
    
    let allVideos = [];

    // 2. Fetch data from TikTok API for each connected account
    const fetchPromises = accounts.map(async (account) => {
      try {
        // Fetch User Stats
        const userUrl = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count,following_count,likes_count,video_count';
        const userRes = await fetch(userUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const userData = await userRes.json();
        
        let userViews = 0;
        
        // Fetch Video List
        const videoUrl = 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,create_time,view_count,like_count,share_count,comment_count';
        const videoRes = await fetch(videoUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ max_count: 20 })
        });
        const videoData = await videoRes.json();

        if (userData.data && userData.data.user) {
          aggregatedStats.followers += (userData.data.user.follower_count || 0);
          aggregatedStats.total_likes += (userData.data.user.likes_count || 0);
          aggregatedStats.published_videos += (userData.data.user.video_count || 0);
        }

        if (videoData.data && videoData.data.videos) {
          const accountVideos = videoData.data.videos.map(v => ({
            ...v,
            account_display_name: account.display_name // tag video with account name
          }));
          
          allVideos.push(...accountVideos);
          
          accountVideos.forEach(v => {
            userViews += (v.view_count || 0);
          });
          aggregatedStats.estimated_total_views += userViews;
        }

      } catch (accErr) {
        console.error(`Failed fetching data for account ${account.display_name}:`, accErr);
        // Continue processing other accounts even if one fails
      }
    });

    await Promise.all(fetchPromises);
    
    // Sort all videos by newest first combined across accounts
    allVideos.sort((a, b) => b.create_time - a.create_time);

    // Provide the combined metrics
    const dashboardStats = {
      profile: {
        display_name: 'Aggregated Accounts',
      },
      stats: aggregatedStats,
      videos: allVideos,
      accountsConnected: accounts.length
    };

    return res.status(200).json(dashboardStats);

  } catch (err) {
    console.error('TikTok Data API Exception:', err);
    return res.status(500).json({ error: 'Server error while fetching TikTok Data.' });
  }
}
