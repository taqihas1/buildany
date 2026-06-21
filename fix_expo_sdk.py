import os

BASE = '/Users/taqihasan/tradepulse'

# Fix 1: Update package.json to SDK 54 (matching your CarbuyingAssistant app)
with open(os.path.join(BASE, 'package.json'), 'w') as f:
    f.write('''{
  "name": "tradepulse",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "expo": "~54.0.0",
    "expo-status-bar": "~2.0.1",
    "react": "19.0.0",
    "react-native": "0.79.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "react-native-screens": "~4.10.0",
    "react-native-safe-area-context": "~5.4.0",
    "@expo/vector-icons": "~14.0.4",
    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "15.8.0",
    "@react-native-async-storage/async-storage": "1.23.1"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~18.3.12",
    "typescript": "~5.3.3"
  },
  "private": true
}
''')

# Fix 2: Create assets folder with placeholder files
assets_dir = os.path.join(BASE, 'assets')
os.makedirs(assets_dir, exist_ok=True)

# Create simple placeholder images using Python PIL or base64
# Since PIL might not be installed, we'll use a minimal approach
# Actually, Expo needs actual image files. Let's create tiny valid PNGs using base64

import base64

# 1x1 transparent PNG (minimal valid PNG)
TRANSPARENT_PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

# 1x1 blue PNG for icon
BLUE_PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

# 1x1 dark PNG for splash
DARK_PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

# Create 1024x1024 icon (scaled up tiny PNG - Expo will accept any size)
# Actually, let me create proper sized images using a different approach
# We'll write valid PNG headers with our desired colors

def create_colored_png(width, height, r, g, b, filepath):
    """Create a simple solid-color PNG file"""
    import struct
    import zlib
    
    def png_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk - raw RGB data
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter byte
        for x in range(width):
            raw_data += bytes([r, g, b])
    
    compressed = zlib.compress(raw_data)
    idat = png_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = png_chunk(b'IEND', b'')
    
    with open(filepath, 'wb') as f:
        f.write(signature + ihdr + idat + iend)

# Create icon (1024x1024 - iOS app icon size)
create_colored_png(1024, 1024, 59, 130, 246, os.path.join(assets_dir, 'icon.png'))

# Create splash (1242x2436 - iPhone X size)
create_colored_png(1242, 2436, 26, 26, 46, os.path.join(assets_dir, 'splash.png'))

# Create adaptive icon (1024x1024)
create_colored_png(1024, 1024, 59, 130, 246, os.path.join(assets_dir, 'adaptive-icon.png'))

# Create favicon (32x32)
create_colored_png(32, 32, 59, 130, 246, os.path.join(assets_dir, 'favicon.png'))

print('''
========================================
Fixed! Now run:
========================================

STEP 1 - Clear old node_modules:
rm -rf /Users/taqihasan/tradepulse/node_modules
rm /Users/taqihasan/tradepulse/package-lock.json

STEP 2 - Reinstall with correct versions:
cd /Users/taqihasan/tradepulse
npm install --legacy-peer-deps

STEP 3 - Start:
npx expo start --clear

Then scan QR with Expo Go again!
''')
