const QRCode = require('qrcode');

// Get URL from command line args, or fetch from ngrok API
let url = process.argv[2];
const outputFile = process.argv[3] || '/root/.openclaw/workspace/expo_qr_live.png';

if (!url) {
  // Fetch from ngrok API
  const http = require('http');
  http.get('http://localhost:4040/api/tunnels', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const tunnel = json.tunnels && json.tunnels[0];
        if (tunnel && tunnel.public_url) {
          url = tunnel.public_url;
          generateQR(url);
        } else {
          console.error('No tunnel found');
          process.exit(1);
        }
      } catch (e) {
        console.error('Error parsing tunnel data:', e.message);
        process.exit(1);
      }
    });
  }).on('error', (e) => {
    console.error('Error fetching tunnel:', e.message);
    process.exit(1);
  });
} else {
  generateQR(url);
}

function generateQR(tunnelUrl) {
  // Convert http/https ngrok URL to exp:// deep link format
  const expUrl = tunnelUrl.replace(/^https?:\/\//, 'exp://');
  
  QRCode.toFile(outputFile, expUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: '#1f2937',
      light: '#ffffff'
    }
  }, (err) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    console.log('QR code saved to', outputFile);
    console.log('URL:', expUrl);
  });
}
