export default function handler(request, response) {
  response.setHeader('cache-control', 'no-store');
  response.status(200).json({
    ok: true,
    service: 'tiktok-snake-game',
    websocket: '/api/events'
  });
}
