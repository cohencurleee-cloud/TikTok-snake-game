# TikTok Snake Game

Autoplay vertical snake game for TikTok LIVE.

Gift reactions:
- Rose → 5 apples
- Donut / Doughnut → 30 bombs
- TikTok Cap → 500 apples

The snake starts automatically and there is no gift panel.

The LIVE bridge runs from `server.js` and forwards TikTok gift events to the browser over WebSocket. Set `TIKTOK_USERNAME` in the server environment before running `npm start`.

Mobile Safari may require one tap before browser audio is allowed. After that, bot turns use the click sample from the supplied screen recording.
