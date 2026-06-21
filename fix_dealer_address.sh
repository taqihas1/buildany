#!/bin/bash
set -e

# Fix: Add dealerAddress to all dealer records and listing generation

cd /Users/taqihasan/carbuyassistantgithub/Carbuyingassistant

echo "Backing up carApi.ts..."
cp src/services/carApi.ts src/services/carApi.ts.bak

echo "Adding dealerAddress to dealer records..."

# Use python3 to safely modify the file
python3 << 'PYEOF'
import re

path = 'src/services/carApi.ts'
with open(path, 'r') as f:
    content = f.read()

# Fix 1: Add address field to MetroArea dealer type
content = content.replace(
    "dealers: { name: string; rating: number; distance: number; location: string }[];",
    "dealers: { name: string; rating: number; distance: number; location: string; address?: string }[];"
)

# Fix 2: Add address to Charlotte dealers
content = content.replace(
    "{ name: 'AutoMax Dealership', rating: 4.8, distance: 3.7, location: 'Charlotte, NC' }",
    "{ name: 'AutoMax Dealership', rating: 4.8, distance: 3.7, location: 'Charlotte, NC', address: '5500 E Independence Blvd, Charlotte, NC 28212' }"
)
content = content.replace(
    "{ name: 'Premier Motors', rating: 4.5, distance: 5.1, location: 'Charlotte, NC' }",
    "{ name: 'Premier Motors', rating: 4.5, distance: 5.1, location: 'Charlotte, NC', address: '9201 S Blvd, Charlotte, NC 28273' }"
)
content = content.replace(
    "{ name: 'City Auto Group', rating: 4.2, distance: 8.7, location: 'Matthews, NC' }",
    "{ name: 'City Auto Group', rating: 4.2, distance: 8.7, location: 'Matthews, NC', address: '13401 E Independence Blvd, Matthews, NC 28105' }"
)
content = content.replace(
    "{ name: 'Best Price Cars', rating: 4.9, distance: 12.4, location: 'Gastonia, NC' }",
    "{ name: 'Best Price Cars', rating: 4.9, distance: 12.4, location: 'Gastonia, NC', address: '1920 E Franklin Blvd, Gastonia, NC 28054' }"
)
content = content.replace(
    "{ name: 'National Auto Sales', rating: 4.0, distance: 15.2, location: 'Concord, NC' }",
    "{ name: 'National Auto Sales', rating: 4.0, distance: 15.2, location: 'Concord, NC', address: '3371 Cloverleaf Pkwy, Concord, NC 28027' }"
)
content = content.replace(
    "{ name: 'Elite Motors', rating: 4.7, distance: 3.8, location: 'Charlotte, NC' }",
    "{ name: 'Elite Motors', rating: 4.7, distance: 3.8, location: 'Charlotte, NC', address: '9300 E Independence Blvd, Charlotte, NC 28273' }"
)
content = content.replace(
    "{ name: 'Value Auto Center', rating: 4.3, distance: 6.5, location: 'Huntersville, NC' }",
    "{ name: 'Value Auto Center', rating: 4.3, distance: 6.5, location: 'Huntersville, NC', address: '118 Statesville Rd, Huntersville, NC 28078' }"
)
content = content.replace(
    "{ name: 'Trusty Cars', rating: 4.6, distance: 9.1, location: 'Rock Hill, SC' }",
    "{ name: 'Trusty Cars', rating: 4.6, distance: 9.1, location: 'Rock Hill, SC', address: '540 S Herlong Ave, Rock Hill, SC 29732' }"
)

# Fix 3: Add dealerAddress to listing generation
content = content.replace(
    "dealerName: dealer.name,",
    "dealerName: dealer.name,\n    dealerAddress: dealer.address || '',"
)

# Fix 4: Also add to transformMarketCheckToCarListing if address exists
content = content.replace(
    "dealerName: raw.dealerName || 'Unknown Dealer',",
    "dealerName: raw.dealerName || 'Unknown Dealer',\n    dealerAddress: raw.dealerAddress || raw.address || '',"
)

# Fix 5: Also add to transformScrapedToCarListing
content = content.replace(
    "dealerName: scraped.dealerName,",
    "dealerName: scraped.dealerName,\n    dealerAddress: scraped.dealerAddress || scraped.address || '',"
)

with open(path, 'w') as f:
    f.write(content)

print("Done! Added dealerAddress to all listings.")
PYEOF

echo ""
echo "Verifying dealerAddress is now in the file..."
grep -n "dealerAddress" src/services/carApi.ts | head -10

echo ""
echo "Now press 'r' in your Metro terminal to reload!"
