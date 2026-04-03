const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.ZERNIO_API_KEY;

async function start() {
  const accountsRes = await fetch("https://zernio.com/api/v1/accounts", {
    headers: { "Authorization": `Bearer ${API_KEY}` }
  });
  const { accounts } = await accountsRes.json();
  const firstAccount = accounts[0];

  console.log(`Using account ${firstAccount.platform}`);

  const postPayload = {
    content: "¡Hola! Estoy automatizando mis redes usando la API de Zernio 🔥",
    publishNow: true,
    mediaUrls: ["https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4"],
    platforms: [{ platform: firstAccount.platform, accountId: firstAccount._id }]
  };

  const postRes = await fetch("https://zernio.com/api/v1/posts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(postPayload)
  });

  const bodyResponse = await postRes.text();
  console.log("POST RESPONSE:", postRes.status, bodyResponse);
}

start();
