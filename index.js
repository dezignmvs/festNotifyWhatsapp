require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
    const serviceAccount = require('./serviceAccount.json');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin Initialized successfully.');
    }
} catch (error) {
    console.warn('Firebase initialization skipped or failed. Ensure serviceAccount.json exists.', error.message);
}

const app = express();
app.use(cors());
app.use(express.json());

// Global variables for status tracking
let botStatus = 'Initializing...';
let qrCodeData = null;

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_cache' }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    botStatus = 'Scan QR Code to Login';
    qrCodeData = qr;
    qrcode.generate(qr, { small: true });
    console.log('QR Code generated. Scan to login.');
});

client.on('ready', () => {
    botStatus = 'Connected & Running';
    qrCodeData = null;
    console.log('WhatsApp Bot is ready and running!');
});

client.on('disconnected', (reason) => {
    botStatus = 'Disconnected';
    console.log('WhatsApp Bot disconnected:', reason);
});

client.on('message', async msg => {
    // Simple echo or handling for testing
    if (msg.body === '!ping') {
        msg.reply('pong');
    }
});

client.initialize();

// Express Server Routes for "Live Showing"
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>WhatsApp Bot Status</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; }
                    .status { font-size: 24px; font-weight: bold; padding: 20px; border-radius: 10px; display: inline-block; }
                    .running { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                    .initializing { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
                    .disconnected { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                </style>
                <!-- Refresh page every 10 seconds to update status -->
                <meta http-equiv="refresh" content="10">
            </head>
            <body>
                <h1>FestNotify WhatsApp Bot</h1>
                <div class="status ${botStatus === 'Connected & Running' ? 'running' : (botStatus === 'Disconnected' ? 'disconnected' : 'initializing')}">
                    Status: ${botStatus}
                </div>
                ${qrCodeData ? '<p>Check terminal logs for the QR code to scan.</p>' : ''}
            </body>
        </html>
    `);
});

// API endpoint for sending messages if needed from front-end
app.post('/api/send-message', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }
    
    try {
        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
        await client.sendMessage(formattedNumber, message);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(\`Server started on port \${PORT}\`);
});
