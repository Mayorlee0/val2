# Barbara’s Mini Love Quest 💘

A tiny, funny, romantic mini web game made with vanilla HTML/CSS/JS + Canvas.
Runs as a static site (no build step). Works locally and deploys on Vercel.

## Run locally
Just open `index.html` in a browser.

## Deploy to Vercel
Import the folder as a Vercel project (static). No framework.
`vercel.json` ensures all routes serve `index.html`.

## Controls
- Desktop: Arrow keys or WASD
- Mobile: On-screen D-pad OR swipe on the game area
- Goal: Collect 7 heart tokens → unlock the Valentine Gate (top) → enter it

## Sound
- Toggle in the top right: `Sound: On/Off`
- Uses WebAudio (no external files)
- Audio starts after the first user interaction (browser autoplay policy)
