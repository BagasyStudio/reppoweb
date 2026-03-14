// api/tiktok-data.js

export default async function handler(req, res) {
  // Extract TikTok access token from HTTP-only cookie
  const cookies = req.headers.cookie || '';
  const tokenMatch = cookies.match(/tiktok_access_token=([^;]+)/);
  const accessToken = tokenMatch ? tokenMatch[1] : null;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated with TikTok. Please login.' });
  }

  try {
    // 1. Fetch User Stats (Requires user.info.stats scope)
    const userUrl = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count';
    const userRes = await fetch(userUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const userData = await userRes.json();
    
    // Check if token expired or invalid (TikTok v2 uses 'ok' as success code)
    if (userData.error && userData.error.code !== 'ok' && userData.error.code !== 0) {
      console.error('TikTok API User Error:', userData.error);
      return res.status(401).json({ error: 'Token expired or invalid', details: userData.error });
    }

    // 2. Fetch Video List to aggregate total views and build timeline (Requires video.list scope)
    const videoUrl = 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,create_time,view_count,like_count,share_count,comment_count';
    const videoRes = await fetch(videoUrl, {
      method: 'POST', // TikTok v2 /video/list/ sometimes requires POST with empty queries
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_count: 20 // Fetch max allowed videos to populate the charts
      })
    });

    const videoData = await videoRes.json();
    
    let totalViews = 0;
    let videosArray = [];
    
    if (videoData.data && videoData.data.videos) {
      videosArray = videoData.data.videos;
      videosArray.forEach(v => {
        totalViews += (v.view_count || 0);
      });
    }

    // Combine Profile and Aggregated Video metrics
    const dashboardStats = {
      profile: userData.data.user || {},
      stats: {
        followers: userData.data.user.follower_count || 0,
        total_likes: userData.data.user.likes_count || 0,
        published_videos: userData.data.user.video_count || 0,
        estimated_total_views: totalViews,
      },
      videos: videosArray
    };

    return res.status(200).json(dashboardStats);

  } catch (err) {
    console.error('TikTok Data API Exception:', err);
    return res.status(500).json({ error: 'Server error while fetching TikTok Data.' });
  }
}
