// ══════════════════════════════════════
//  게임 API 프록시 라우트
// ══════════════════════════════════════
const express = require('express');
const router  = express.Router();
const cs      = require('../lib/csapi');
const path    = require('path');
const fs      = require('fs');
const telegram = require('../lib/telegram');
const { gameSessionMap } = require('./auth');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json'), 'utf8')); } catch(e) { return []; }
}
function writeUsers(data) {
  fs.writeFileSync(path.join(__dirname, '../data/users.json'), JSON.stringify(data, null, 2), 'utf8');
}

// ── CS API 회원가입
router.post('/register', async (req, res) => {
  try {
    const r = await cs.post('/csapi/create', {
      userid:   req.body.userid,
      username: req.body.username || req.body.userid,
    });
    // api 필드에 csapi 추가
    const users = readUsers();
    const user = users.find(u => u.username === req.body.userid);
    if (user) {
      if (!user.api) user.api = [];
      if (!user.api.includes('csapi')) {
        user.api.push('csapi');
        writeUsers(users);
      }
    }
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── CS API 입금 (로컬 → 게임사)
router.post('/deposit', async (req, res) => {
  try {
    const r = await cs.post('/csapi/amount', {
      userid: req.body.userid,
      amount: Number(req.body.amount),
      type:   '1',  // 1 = 입금
    });
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── CS API 출금 (게임사 → 로컬)
router.post('/withdraw', async (req, res) => {
  try {
    const r = await cs.post('/csapi/amount', {
      userid: req.body.userid,
      amount: Number(req.body.amount) || 0,
      type:   req.body.all ? '3' : '2',  // 3 = 전액출금, 2 = 부분출금
    });
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── CS API 잔액 조회
router.get('/balance', async (req, res) => {
  try {
    const r = await cs.post('/csapi/amount', {
      userid: req.query.userid,
      amount: 0,
      type:   '0',  // 0 = 조회
    });
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── CS API 강제퇴장
router.post('/kick', async (req, res) => {
  try {
    const r = await cs.post('/csapi/kick', {
      userid: req.body.userid,
    });
    delete gameSessionMap[req.body.userid];
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 게임사 목록 (파일 캐시)
const vendorsCachePath = path.join(__dirname, '..', 'data', 'vendors_cache.json');

function readVendorsCache() {
  try { return JSON.parse(fs.readFileSync(vendorsCachePath, 'utf8')); } catch(e) { return null; }
}
function writeVendorsCache(data) {
  fs.writeFileSync(vendorsCachePath, JSON.stringify(data, null, 2), 'utf8');
}

router.post('/providers', async (req, res) => {
  try {
    const cached = readVendorsCache();
    if (cached && cached.cs) {
      return res.json(cached.cs);
    }
    const r = await cs.post('/csapi/Provider', {
      type:     '1',
      gametype: req.body.gametype || '',
    });
    // 파일에 저장
    const existing = cached || {};
    existing.cs = r;
    existing.updatedAt = new Date().toISOString();
    writeVendorsCache(existing);
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// 게임사 목록 강제 갱신
router.post('/providers/refresh', async (req, res) => {
  try {
    const r = await cs.post('/csapi/Provider', {
      type:     '1',
      gametype: req.body.gametype || '',
    });
    const existing = readVendorsCache() || {};
    existing.cs = r;
    existing.updatedAt = new Date().toISOString();
    writeVendorsCache(existing);
    res.json({ success: true, count: (r.data || []).length });
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 게임 리스트 (type=2)
router.post('/games', async (req, res) => {
  try {
    const r = await cs.post('/csapi/Provider', {
      type:     '2',
      gameid:   req.body.gameid,
      code:     req.body.code,
      gametype: req.body.gametype || '',
    });
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 게임 URL 발급
router.post('/launch', async (req, res) => {
  try {
    // 베팅 권한 체크
    const userid = req.body.userid;
    const users = readUsers();
    const user = users.find(u => u.username === userid);
    if (user) {
      if (user.casino === 'OFF') return res.json({ result: 0, msg: '현재 게임사가 점검중입니다.' });
      if (user.slot === 'OFF') {
        // 슬롯 게임 코드 체크 (gametype 기반)
      }
    }

    const isMobile = /Mobi|Android/i.test(req.headers['user-agent'] || '');
    const body = {
      code:     req.body.code,
      subcode:  req.body.subcode,
      userid:   req.body.userid,
      username: req.body.username || req.body.userid,
      platform: req.body.platform || (isMobile ? 'mobile' : 'pc'),
      lobby:    req.body.lobby    || '0',
    };
    const r = await cs.post('/csapi/getGameUrl', body);

    // 게임 세션 추적 + api 필드 업데이트
    if (r.result === 1 && r.link) {
      gameSessionMap[userid] = {
        vendor: req.body.code || '',
        game_id: req.body.subcode || '',
        gameTitle: req.body.gameTitle || req.body.code || '',
        gameType: 'csapi',
        startedAt: new Date().toISOString(),
      };
      const freshUsers = readUsers();
      const freshUser = freshUsers.find(u => u.username === userid);
      if (freshUser) {
        if (!freshUser.api) freshUser.api = [];
        if (!freshUser.api.includes('csapi')) {
          freshUser.api.push('csapi');
          writeUsers(freshUsers);
        }
      }
    }

    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 베팅 내역 조회
router.post('/betting', async (req, res) => {
  try {
    const r = await cs.post('/csapi/getBetting', req.body);

    // 최대당첨금 체크
    try {
      const settingsPath = require('path').join(__dirname, '../data/admin_settings.json');
      const settings = JSON.parse(require('fs').readFileSync(settingsPath, 'utf8'));
      const maxSlot = settings.maxwinSlot || 5000000;
      const maxCasino = settings.maxwinCasino || 10000000;
      const logPath = require('path').join(__dirname, '../data/maxwin_logs.json');
      let logs = [];
      try { logs = JSON.parse(require('fs').readFileSync(logPath, 'utf8')); } catch(e) {}
      const existingIds = new Set(logs.map(l => l.roundId));

      const liveNames = ['evolution','pragmatic play live','dream gaming','sa gaming','sexy gaming','wm casino','asia gaming','micro gaming live','all bet','big gaming','skywind live'];
      const txList = r.data || r.list || [];
      if (Array.isArray(txList)) {
        txList.forEach(tx => {
          const winAmt = Number(tx.winAmount || tx.win || 0);
          if (winAmt <= 0) return;
          const roundId = tx.roundId || tx.round_id || tx.id || '';
          if (existingIds.has(roundId)) return;
          const vendor = (tx.vendorName || tx.vendor || tx.provider || '').toLowerCase();
          const isLive = liveNames.some(n => vendor.indexOf(n) >= 0);
          const type = isLive ? 'casino' : 'slot';
          const threshold = isLive ? maxCasino : maxSlot;
          if (winAmt >= threshold) {
            const logEntry = {
              roundId,
              type,
              username: tx.username || tx.user_id || '',
              gameName: tx.gameName || tx.game || vendor || '',
              amount: winAmt,
              datetime: new Date().toISOString()
            };
            logs.unshift(logEntry);
            existingIds.add(roundId);
            // 텔레그램 알림
            telegram.send('maxwin', '🎰 <b>최대당첨금 알림</b>\n구분: ' + (type === 'slot' ? '슬롯' : '카지노') + '\n회원: ' + logEntry.username + '\n게임: ' + logEntry.gameName + '\n당첨금: ' + winAmt.toLocaleString() + '원');
          }
        });
        if (logs.length > 200) logs = logs.slice(0, 200);
        require('fs').writeFileSync(logPath, JSON.stringify(logs), 'utf8');
      }
    } catch(e) {}

    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 집계 조회
router.post('/total', async (req, res) => {
  try {
    const r = await cs.post('/csapi/getTotal', { userid: req.body.userid });
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 에이전트 정보
router.get('/aginfo', async (req, res) => {
  try {
    const r = await cs.get('/csapi/AGInfo');
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 슬롯 게임 상세내역
router.get('/detail/slot', async (req, res) => {
  try {
    const r = await cs.get(`/api/apigamedetail.aspx?gtype=sxprg&roundid=${encodeURIComponent(req.query.roundid || '')}`);
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 에볼루션 상세내역
router.get('/detail/evo', async (req, res) => {
  try {
    const r = await cs.get(
      `/api/apigamedetail.aspx?gtype=apievo` +
      `&round=${encodeURIComponent(req.query.round || '')}` +
      `&realround=${encodeURIComponent(req.query.realround || '')}`
    );
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 로컬 저장된 CS 트랜잭션 조회 (rate limit 없음)
const csTxCollector = require('../lib/csTransactionCollector');
router.get('/transactions/local', (req, res) => {
  try {
    const usernames = req.query.usernames
      ? req.query.usernames.split(',').filter(Boolean)
      : [];
    const types = req.query.types
      ? req.query.types.split(',').filter(Boolean)
      : [];
    const result = csTxCollector.query({
      start:     req.query.start,
      end:       req.query.end,
      usernames: usernames,
      types:     types,
      order:     req.query.order   || 'desc',
      page:      req.query.page    || 1,
      perPage:   req.query.perPage || 100,
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
