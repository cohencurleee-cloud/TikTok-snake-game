import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const TIKTOK_USERNAME = String(process.env.TIKTOK_USERNAME || '').trim().replace(/^@/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
  const rel = url.pathname === '/' ? '/index.html' : url.pathname;
  const safe = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
  const file = path.join(__dirname, safe);

  if (!file.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
});

const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
  if (url.pathname !== '/events') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'status', connected: Boolean(liveConnection) }));
  ws.on('close', () => clients.delete(ws));
});

function broadcast(payload) {
  const text = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(text);
  }
}

let liveConnection = null;
let reconnectTimer = null;
let connecting = false;

function getGiftName(data) {
  return data?.giftDetails?.giftName || data?.extendedGiftInfo?.name || data?.giftName || '';
}

async function connectTikTok() {
  if (!TIKTOK_USERNAME || connecting) return;
  connecting = true;
  clearTimeout(reconnectTimer);

  try {
    if (liveConnection) {
      try { liveConnection.disconnect(); } catch {}
    }

    liveConnection = new TikTokLiveConnection(TIKTOK_USERNAME, {
      enableExtendedGiftInfo: true
    });

    liveConnection.on(WebcastEvent.GIFT, data => {
      const giftType = Number(data?.giftDetails?.giftType ?? data?.giftType ?? 0);

      // TikTok repeats streakable gift events while the streak is still going.
      // Only process the final streak event so a Rose x10 becomes exactly 50 apples.
      if (giftType === 1 && !data?.repeatEnd) return;

      broadcast({
        type: 'gift',
        name: getGiftName(data),
        count: Math.max(1, Number(data?.repeatCount || 1)),
        giftId: data?.giftId ?? null,
        user: data?.user?.uniqueId || null
      });
    });

    liveConnection.on(ControlEvent.CONNECTED, () => {
      console.log('Connected to @' + TIKTOK_USERNAME);
      broadcast({ type: 'status', connected: true });
    });

    liveConnection.on(ControlEvent.DISCONNECTED, () => {
      broadcast({ type: 'status', connected: false });
      scheduleReconnect();
    });

    liveConnection.on(ControlEvent.ERROR, err => {
      console.error('TikTok LIVE error:', err?.info || err?.message || err);
    });

    liveConnection.on('streamEnd', () => {
      broadcast({ type: 'status', connected: false });
      scheduleReconnect(10000);
    });

    await liveConnection.connect();
  } catch (err) {
    console.error('Could not connect to @' + TIKTOK_USERNAME + ':', err?.message || err);
    broadcast({ type: 'status', connected: false });
    scheduleReconnect(12000);
  } finally {
    connecting = false;
  }
}

function scheduleReconnect(delay = 12000) {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectTikTok, delay);
}

server.listen(PORT, () => {
  console.log('TikTok Snake running on port ' + PORT);
  if (!TIKTOK_USERNAME) {
    console.log('Set TIKTOK_USERNAME to your @username to enable LIVE gifts.');
  } else {
    connectTikTok();
  }
});
