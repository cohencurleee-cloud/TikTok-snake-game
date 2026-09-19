# TikTok Snake Game

Autoplay vertical snake game built for a TikTok LIVE screen.

## Gift reactions

- Rose -> 5 apples
- Donut / Doughnut -> 30 bombs
- TikTok Cap -> 500 apples

The snake starts playing automatically. There is no gift panel and no bot toggle.

## Vercel

This repo is laid out for Vercel:

- `index.html` is the game.
- `api/events.js` is the WebSocket TikTok LIVE bridge.
- `api/health.js` is a simple deployment health check.
- `vercel.json` enables Fluid Compute.

After importing this repo into Vercel, either set a Vercel environment variable named:

`TIKTOK_USERNAME`

with your TikTok username (without the @), or open the production site once with:

`?tiktok=YOUR_USERNAME`

Example:

`https://your-project.vercel.app/?tiktok=YOUR_USERNAME`

The game still auto-starts. The username is only used by the hidden LIVE bridge.

On iPhone Safari, audio can require one tap on the page before automatic sound playback is permitted. The turn sound is cut from the supplied screen recording.


## Audio credit

Keyboard turn sound: "Android Keypress Standard.ogg" by Hhcjhjfjhjjfjfkkdjfjb(Android), Wikimedia Commons, licensed CC BY-SA 3.0.
