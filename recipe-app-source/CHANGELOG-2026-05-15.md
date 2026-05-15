## 🔥 RecipeWise — What's New

### 25 New High-Protein Recipes Added (r151–r175)
**No pork or ham — all alternative protein sources.**

| # | Recipe | Protein (g) | Key Protein Source |
|---|--------|------------|-------------------|
| r151 | Mediterranean Chickpea & Tuna Salad | 36 | Tuna + Chickpeas |
| r152 | Korean Spicy Chicken Stir-Fry | 34 | Chicken Breast |
| r153 | Baked Turkey Meatballs with Marinara | 30 | Ground Turkey |
| r154 | Grilled Swordfish with Mango Salsa | 38 | Swordfish |
| r155 | Cottage Cheese & Veggie Scramble | 28 | Eggs + Cottage Cheese |
| r156 | Chicken Fajita Lettuce Wraps | 32 | Chicken Breast |
| r157 | Mongolian Beef Stir-Fry | 34 | Flank Steak |
| r158 | Spinach & Ricotta Stuffed Chicken | 42 | Chicken Breast + Ricotta |
| r159 | Thai Green Curry with Chicken | 32 | Chicken Thigh |
| r160 | Lemon Garlic Butter Shrimp | 36 | Shrimp |
| r161 | Chicken Tikka Masala | 42 | Chicken Breast |
| r162 | Baked Cod with Tomato Olive Relish | 34 | Cod |
| r163 | Peri-Peri Chicken Thighs | 36 | Chicken Thigh |
| r164 | Cottage Cheese Protein Pancakes | 26 | Cottage Cheese + Eggs |
| r165 | Miso Glazed Black Cod | 38 | Black Cod |
| r166 | Chicken Souvlaki Skewers | 40 | Chicken Breast |
| r167 | Spicy Tuna Roll Bowl | 38 | Sashimi-Grade Tuna |
| r168 | Turkey Taco Salad | 32 | Ground Turkey |
| r169 | Grilled Calamari with Lemon & Garlic | 30 | Calamari |
| r170 | Almond Butter Protein Balls | 6* | Almond Butter + Protein Powder |
| r171 | Grilled Venison Steak with Rosemary | 38 | Venison |
| r172 | Buffalo Chicken Lettuce Wraps | 34 | Chicken Breast |
| r173 | Sardine & Avocado Toast | 24 | Sardines |
| r174 | Protein-Packed Egg Muffins | 14* | Eggs + Feta |
| r175 | Seared Duck Breast with Orange Glaze | 36 | Duck Breast |

*Per serving for snacks/small items

### Total Recipe Count
- **Base recipes (r001–r020):** 20
- **New recipes (r021–r180):** 160
- **TOTAL: 180 recipes** 🔥

### Bug Fix Applied
Fixed Metro runtime error (`Cannot read properties of undefined (reading 'id')`) by moving `ALL_RECIPES` computation into `recipes.ts` to avoid circular dependency issues.

### How to Run Locally
1. Unzip the file
2. `cd recipe-app`
3. `npm install`
4. `npx expo start --clear`
5. Scan QR code with Expo Go app (iOS/Android) or press `w` for web

### Note
Ngrok now requires a verified account + authtoken for remote tunnels. To enable remote access:
1. Sign up at https://dashboard.ngrok.com/signup
2. Get your authtoken
3. Run: `ngrok config add-authtoken YOUR_TOKEN`
4. Then: `npx ngrok http 8081`
