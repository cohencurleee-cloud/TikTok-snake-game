import http from 'node:http';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';

const server = http.createServer((req, res) => {
  res.writeHead(426, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify({
    ok: false,
    message: 'WebSocket endpoint. Open the game page instead.'
  }));
});

const wss = new WebSocketServer({ server });

function cleanUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^@/, '')
    .replace(/[^a-zA-Z0-9._]/g, '');
}

function getGiftName(data) {
  return (
    data?.giftDetails?.giftName ||
    data?.extendedGiftInfo?.name ||
    data?.giftName ||
    ''
  );
}

function send(ws, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/api/events', 'https://snake.local');
  const username = cleanUsername(
    url.searchParams.get('username') || process.env.TIKTOK_USERNAME
  );

  let live = null;
  let closed = false;

  ws.on('close', () => {
    closed = true;
    if (live) {
      try { live.disconnect(); } catch {}
    }
  });

  send(ws, { type: 'ready' });

  if (!username) {
    send(ws, {
      type: 'status',
      connected: false,
      reason: 'missing_username'
    });
    return;
  }

  live = new TikTokLiveConnection(username, {
    enableExtendedGiftInfo: true
  });

  live.on(WebcastEvent.GIFT, (data) => {
    if (closed) return;

    const type = Number(data?.giftDetails?.giftType ?? data?.giftType ?? 0);
    if (type === 1 && !data?.repeatEnd) return;

    send(ws, {
      type: 'gift',
      name: getGiftName(data),
      count: Math.max(1, Number(data?.repeatCount || 1)),
      giftId: data?.giftId ?? null,
      user: data?.user?.uniqueId || null
    });
  });

  live.connect()
    .then((state) => {
      if (!closed) {
        send(ws, {
          type: 'status',
          connected: true,
          username,
          roomId: state?.roomId || null
        });
      }
    })
    .catch((error) => {
      if (!closed) {
        send(ws, {
          type: 'status',
          connected: false,
          reason: 'tiktok_connection_failed',
          message: String(error?.message || error || 'Unknown TikTok connection error')
        });
      }
      try { ws.close(1011, 'TikTok connection failed'); } catch {}
    });
});

export default server;
