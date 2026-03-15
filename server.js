const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));
// JS/CSS 캐시 방지
app.use((req, res, next) => {
  if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// API 라우트
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user',  require('./routes/user'));
app.use('/api/auth',  require('./routes/auth').router);
app.use('/api/game',  require('./routes/game'));
app.use('/api/hl',    require('./routes/gamehl'));

// 페이지 라우트 (static보다 먼저 선언)
app.get('/',      (req, res) => res.sendFile(path.join(__dirname, 'user/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin/index.html')));

// 정적 파일
app.use('/static', express.static(path.join(__dirname, 'public/static')));
app.use('/admin',  express.static(path.join(__dirname, 'admin')));
app.use('/user',   express.static(path.join(__dirname, 'user')));

// 트랜잭션 자동 수집기 시작
const txCollector = require('./lib/transactionCollector');
txCollector.start();

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
