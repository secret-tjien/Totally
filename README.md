# Math Chain Puzzle

A mobile-optimized math puzzle game built with Phaser 3.

## Features
- 50 levels (handcrafted and procedural)
- Real-time math evaluation
- Premium casual aesthetic with frosted glass orbs
- Procedurally generated backgrounds and sounds
- Mobile touch optimized

## How to Play
1. Drag your finger/mouse across the input spheres at the bottom to chain them.
2. Digits concatenate (e.g., 2 then 3 = 23). Operators perform math (evaluated left-to-right).
3. The center display shows the real-time result of your chain.
4. Release your finger when the result matches one of the target outcome spheres at the top.
5. Clear all outcome spheres to complete the level.

## Setup & Deployment
This game is fully self-contained with no external dependencies. All assets (images, sounds) are generated procedurally or embedded as base64 data URIs.

### Local Development
To run the game locally:
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Open the provided local URL in your browser.

### Poki.com Deployment
To upload the game to Poki.com or any other web portal:
1. Build the game: `npm run build`
2. The `dist` folder will contain the fully bundled, ZIP-ready files (`index.html`, `assets/`, etc.).
3. Zip the contents of the `dist` folder and upload it to the portal. No external CDNs or APIs are referenced!
