const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));
// 캐시 방지 (모든 파일)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// 관리자 IP 제한 미들웨어
const fs = require('fs');
function adminIpCheck(req, res, next) {
  try {
    const settingsPath = path.join(__dirname, 'data/admin_settings.json');
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const sec = s.security || {};
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';

    // localhost는 항상 허용 (서버 직접 접속)
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
      return next();
    }

    // 화이트리스트: 등록된 IP만 허용
    if (sec.ipWhitelist) {
      const wl = s.whitelistIps || [];
      if (wl.length > 0 && !wl.some(w => w.ip === clientIp)) {
        return res.status(403).send('접근이 차단되었습니다. (허용되지 않은 IP)');
      }
    }

    // 블랙리스트: 특정 IP 차단
    if (sec.ipBlacklist) {
      const bl = s.blockedIps || [];
      if (bl.some(b => b.ip === clientIp)) {
        return res.status(403).send('접근이 차단되었습니다. (차단된 IP)');
      }
    }
  } catch(e) {}
  next();
}

// 유저 IP 차단 미들웨어
function userIpCheck(req, res, next) {
  try {
    const settingsPath = path.join(__dirname, 'data/admin_settings.json');
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    const bl = s.blockedUserIps || [];
    if (bl.some(b => b.ip === clientIp)) {
      return res.status(403).send('접근이 차단되었습니다.');
    }
  } catch(e) {}
  next();
}

// API 라우트
app.use('/api/admin',   adminIpCheck, require('./routes/admin'));
app.use('/api/partner', require('./routes/partner'));
app.use('/api/user',    userIpCheck, require('./routes/user'));
app.use('/api/auth',    userIpCheck, require('./routes/auth').router);
app.use('/api/game',    userIpCheck, require('./routes/game'));
app.use('/api/hl',      userIpCheck, require('./routes/gamehl'));

// 페이지 라우트 (static보다 먼저 선언)
app.get('/',        userIpCheck, (req, res) => res.sendFile(path.join(__dirname, 'user/index.html')));
app.get('/admin',   adminIpCheck, (req, res) => res.sendFile(path.join(__dirname, 'admin/index.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'partner/index.html')));

// 정적 파일
app.use('/static',  express.static(path.join(__dirname, 'public/static')));
app.use('/admin',   adminIpCheck, express.static(path.join(__dirname, 'admin'), { maxAge: 0, etag: false }));
app.use('/partner', express.static(path.join(__dirname, 'partner'), { maxAge: 0, etag: false }));
app.use('/user',    express.static(path.join(__dirname, 'user')));

// 트랜잭션 자동 수집기 시작
const txCollector = require('./lib/transactionCollector');
txCollector.start();

// 오닉스(CS API) 트랜잭션 수집기 시작
const csTxCollector = require('./lib/csTransactionCollector');
csTxCollector.start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // 서버 외부 IP 확인
  require('https').get('https://api.ipify.org', (res) => {
    let ip = '';
    res.on('data', c => ip += c);
    res.on('end', () => console.log('Server External IP:', ip));
  });
});
