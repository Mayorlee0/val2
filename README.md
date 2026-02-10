# Barbara’s Mini Love Quest 💘

A tiny, funny, romantic mini web game made with vanilla HTML/CSS/JS + Canvas.
Runs as a static site (no build step). Works locally and deploys on Vercel.

## Run locally
Just open `index.html` in a browser.

## Deploy to Vercel
1. Import this repository as a Vercel project.
2. Set the **Root Directory** to the repo root (where `index.html` lives).
3. Keep **Framework Preset** as `Other` and leave build settings empty.
4. Deploy.

`vercel.json` rewrites all routes to `index.html` so direct URLs don't 404.

## Controls
- Desktop: Arrow keys or WASD
- Mobile: On-screen D-pad OR swipe on the game area
- Goal: Collect 7 heart tokens → unlock the Valentine Gate (top) → enter it

## Sound
- Toggle in the top right: `Sound: On/Off`
- Uses WebAudio (no external files)
- Audio starts after the first user interaction (browser autoplay policy)
