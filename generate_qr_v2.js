const QRCode = require('qrcode');
QRCode.toFile('expo_qr_v2.png', 'exp://ehscuuu-anonymous-8081.exp.direct', {
  width: 400,
  margin: 2,
  color: { dark: '#000', light: '#fff' }
}).then(() => console.log('QR saved')).catch(err => console.error(err));
