// ══════════════════════════════════════
//  HonorLink 게임 API 헬퍼
// ══════════════════════════════════════
const https = require('https');

const API_BASE = 'https://api.honorlink.org';
const API_KEY  = 'gSE3CDwSfK4NNQrxDgKZ4TaFgOSJYWz29FoEDtFB6d20b217';

function request(method, path, params) {
  return new Promise((resolve, reject) => {
    const qs = params
      ? '?' + Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
          .join('&')
      : '';

    const fullPath = '/api' + path + qs;
    const options = {
      hostname: 'api.honorlink.org',
      port: 443,
      path: fullPath,
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept':        'application/json',
        'Content-Type':  'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try {
          const data = JSON.parse(buf);
          if (res.statusCode >= 400) data._status = res.statusCode;
          resolve(data);
        } catch {
          resolve({ error: 'parse error', raw: buf.slice(0, 300), _status: res.statusCode });
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

module.exports = {
  get:  (path, params) => request('GET',  path, params),
  post: (path, params) => request('POST', path, params),
};
