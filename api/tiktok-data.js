const dotenv = require('dotenv');
dotenv.config();

module.exports = async function handler(req, res) {
  try {
    const Zernio = require('@zernio/node').default || require('@zernio/node');
    // Using environment variables for Zernio authentication
    const zernio = new Zernio({ apiKey: process.env.ZERNIO_API_KEY });
    
    let aggregatedStats = {
      followers: 0,
      total_likes: 0,
      published_videos: 0,
      estimated_total_views: 0,
    };
    
    let allVideos = [];
    
    // Fallback: Just return numbers so UI doesn't crash if SDK method is unmapped.
    try {
      const analytics = await zernio.analytics.getAnalytics();
      if(analytics) {
         if(analytics.followers) aggregatedStats.followers = analytics.followers;
         if(analytics.likes) aggregatedStats.total_likes = analytics.likes;
         if(analytics.views) aggregatedStats.estimated_total_views = analytics.views;
      }
    } catch(e) {
      console.log("Could not fetch precise unified analytics from Zernio, using fallbacks.");
    }

    const { accounts } = await zernio.accounts.listAccounts();

    if (!accounts || accounts.length === 0) {
      // Returning 401 prevents dummy data from rendering if there are zero accounts
      return res.status(401).json({ error: 'No Zernio accounts connected.' });
    }

    const dashboardStats = {
      profile: {
        display_name: 'Zernio Aggregated Accounts',
      },
      stats: aggregatedStats,
      videos: allVideos,
      accountsConnected: accounts.length
    };

    return res.status(200).json(dashboardStats);

  } catch (err) {
    console.error('Zernio Data API Exception:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Server error while fetching Zernio Data.' });
  }
}
