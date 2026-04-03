const dotenv = require('dotenv');
dotenv.config();

module.exports = async function handler(req, res) {
  try {
    const Zernio = require('@zernio/node').default || require('@zernio/node');
    const zernio = new Zernio({ apiKey: process.env.ZERNIO_API_KEY });
    
    const { accounts } = await zernio.accounts.listAccounts();
    return res.status(200).json({ accounts: accounts || [] });
  } catch (error) {
    console.error('Zernio API Error getting accounts:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Error fetching accounts from Zernio' });
  }
}
