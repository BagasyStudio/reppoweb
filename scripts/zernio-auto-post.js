const dotenv = require('dotenv');
dotenv.config();

// Since the sdk might use ES modules, try to require or import dynamically
const init = async () => {
    let Zernio;
    try {
        Zernio = require('@zernio/node').default || require('@zernio/node');
    } catch(e) {
        Zernio = (await import('@zernio/node')).default;
    }

    const zernio = new Zernio();

    try {
        console.log("Conectando con Zernio API usando SDK...");
        const { accounts } = await zernio.accounts.listAccounts();
        
        if (!accounts || accounts.length === 0) {
            console.log("No tienes cuentas conectadas.");
            return;
        }

        const firstAccount = accounts[0];
        console.log(`Usando cuenta: ${firstAccount.platform} (${firstAccount._id})`);

        // 1. Upload Media
        const path = require("path");
        const videoPath = path.join(__dirname, "../test-video.mp4");
        console.log(`Subiendo video desde ${videoPath}...`);
        
        const mediaResult = await zernio.media.upload(videoPath);
        const mediaUrl = mediaResult.publicUrl || mediaResult.url || mediaResult; 
        console.log("Video subido. URL interna:", mediaUrl);

        // 2. Create Post
        console.log("Creando post en TikTok...");
        const { post } = await zernio.posts.createPost({
            content: "¡Hola! Probando la automatización con la API de Zernio 🚀🎥",
            publishNow: true,
            mediaUrls: [mediaUrl],
            platforms: [
                {
                    platform: firstAccount.platform,
                    accountId: firstAccount._id
                }
            ]
        });

        console.log("¡Éxito! Post creado:");
        console.log("ID del post:", post._id);
    } catch (e) {
        console.error("Error durante la ejecución:", e.response?.data || e.message);
    }
};

init();
