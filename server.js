const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const dal = require('./lib/dal');
const app = express();

app.use(express.json({ limit: '10mb' }));

// ── Rate Limiting ──
// 로그인: IP당 15분에 20회
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// 일반 API: IP당 1분에 120회
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// 보안 헤더 + 캐시 방지
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// 관리자 IP 제한 미들웨어
async function adminIpCheck(req, res, next) {
  try {
    const s = await dal.readData('admin_settings.json');
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
async function userIpCheck(req, res, next) {
  try {
    const s = await dal.readData('admin_settings.json');
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    const bl = s.blockedUserIps || [];
    if (bl.some(b => b.ip === clientIp)) {
      return res.status(403).send('접근이 차단되었습니다.');
    }
  } catch(e) {}
  next();
}

// 유저 API 인증 미들웨어 (sessionToken 검증)
const { sessionTokenMap } = require('./routes/auth');
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/check-referral', '/api/user/public-settings', '/api/user/notices', '/api/user/events'];
function userAuthCheck(req, res, next) {
  // 공개 경로는 인증 불필요
  if (PUBLIC_PATHS.some(p => req.originalUrl.startsWith(p))) return next();
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  // sessionTokenMap: { userId: token } — 유효한 토큰인지 확인
  const valid = Object.values(sessionTokenMap).includes(token);
  if (!valid) return res.status(401).json({ success: false, error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
  next();
}

// API 라우트
app.use('/api/admin',   adminIpCheck, apiLimiter, require('./routes/admin'));
app.use('/api/partner', apiLimiter, require('./routes/partner'));
app.use('/api/user',    userIpCheck, userAuthCheck, apiLimiter, require('./routes/user'));
app.use('/api/auth',    userIpCheck, require('./routes/auth').router);
app.use('/api/game',    userIpCheck, userAuthCheck, apiLimiter, require('./routes/game'));
app.use('/api/hl',      userIpCheck, userAuthCheck, apiLimiter, require('./routes/gamehl'));

// 로그인 엔드포인트에 강화된 Rate Limit 적용
app.post('/api/auth/login', loginLimiter);
app.post('/api/admin/login', loginLimiter);
app.post('/api/partner/login', loginLimiter);

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
