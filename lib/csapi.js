// ══════════════════════════════════════
//  외부 게임 API 헬퍼
// ══════════════════════════════════════
const https = require('https');
const http  = require('http');

const API_BASE = 'https://api.onxlink.org';
const API_KEY  = '0dae8e89eb499cd150ebeffb18746aa2492104a4';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data   = body ? JSON.stringify(body) : null;
    const url    = new URL(API_BASE + path);
    const lib    = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = lib.request(options, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        console.log('[CSAPI]', method, path, 'status:', res.statusCode, 'body:', buf.slice(0, 300));
        try   { resolve(JSON.parse(buf)); }
        catch { resolve({ result: 0, msg: 'parse error', raw: buf.slice(0, 200) }); }
      });
    });
    req.on('error', (e) => reject(e));
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

module.exports = {
  post: (path, body) => request('POST', path, body),
  get:  (path)       => request('GET',  path, null),
};
