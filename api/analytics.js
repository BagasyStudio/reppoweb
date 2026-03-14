const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Get credentials from Vercel Environment Variables
const credentialsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
let credentials = null;

if (credentialsEnv) {
  try {
    credentials = JSON.parse(credentialsEnv);
  } catch (error) {
    console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON');
  }
}

// Initialize the GA4 client
// If credentials aren't passed, it might crash or use Vercel default service accounts if any.
// We pass them explicitly via the credentials object.
const analyticsDataClient = new BetaAnalyticsDataClient(
  credentials ? { credentials } : undefined
);

// The GA4 Property ID for Reppo Landing Page
const propertyId = '528457019'; 

export default async function handler(req, res) {
  // Add CORS headers so dashboard.html can fetch this if needed 
  // (though it's on the same domain usually, it's good practice)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Determine the date range from the query parameters, default to 7 days
    const queryDays = req.query.days ? parseInt(req.query.days, 10) : 7;
    // Cap to a maximum to prevent huge data pulls, e.g., 90 days. Minimum 1 day.
    const validDays = isNaN(queryDays) ? 7 : Math.min(Math.max(queryDays, 1), 90);
    const startDate = `${validDays}daysAgo`;

    const [sessionsData] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: startDate, endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    });

    const [clicksData] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: startDate, endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            value: 'conversion_click'
          }
        }
      },
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    });

    const [countryResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: startDate,
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      metrics: [
        {
          name: 'sessions',
        },
      ],
      orderBys: [
        {
          metric: {
            metricName: 'sessions',
          },
          desc: true,
        },
      ],
      limit: 5
    });

    // Merge and format
    const formatStrDate = (str) => {
      // YYYYMMDD to DD/MM
      if (!str || str.length !== 8) return str;
      return `${str.substring(6, 8)}/${str.substring(4, 6)}`;
    };

    const datesMap = {};
    
    // Initialize map with sessions
    sessionsData.rows?.forEach(row => {
      const dateKey = row.dimensionValues[0].value;
      datesMap[dateKey] = {
        sessions: parseInt(row.metricValues[0].value, 10),
        clicks: 0
      };
    });

    // Add clicks
    clicksData.rows?.forEach(row => {
      const dateKey = row.dimensionValues[0].value;
      if (datesMap[dateKey]) {
        datesMap[dateKey].clicks = parseInt(row.metricValues[0].value, 10);
      } else {
        datesMap[dateKey] = {
          sessions: 0,
          clicks: parseInt(row.metricValues[0].value, 10)
        };
      }
    });

    const sortedDates = Object.keys(datesMap).sort();
    const formattedDates = sortedDates.map(formatStrDate);
    const visitsArr = sortedDates.map(d => datesMap[d].sessions);
    const clicksArr = sortedDates.map(d => datesMap[d].clicks);

    // Format Country Response
    const countries = [];
    const countryValues = [];
    let otherCount = 0;

    countryResponse.rows?.forEach((row, index) => {
        if(index < 4) {
            countries.push(row.dimensionValues[0].value);
            countryValues.push(parseInt(row.metricValues[0].value, 10));
        } else {
            otherCount += parseInt(row.metricValues[0].value, 10);
        }
    });
    
    if (otherCount > 0) {
        countries.push("Other");
        countryValues.push(otherCount);
    }

    res.status(200).json({
      daily: {
        dates: formattedDates,
        visits: visitsArr,
        clicks: clicksArr
      },
      source: {
        countries,
        countryValues
      }
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data', details: error.message });
  }
}
