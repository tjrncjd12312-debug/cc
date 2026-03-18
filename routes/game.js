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

// ── 게임 리스트 (type=2, 파일 캐시, 1시간마다 자동 갱신)
const csGamesCachePath = path.join(__dirname, '..', 'data', 'cs_games_cache.json');
const CS_GAMES_CACHE_TTL = 60 * 60 * 1000; // 1시간

function readCsGamesCache() {
  try { return JSON.parse(fs.readFileSync(csGamesCachePath, 'utf8')); } catch(e) { return {}; }
}
function writeCsGamesCache(data) {
  fs.writeFileSync(csGamesCachePath, JSON.stringify(data, null, 2), 'utf8');
}

router.post('/games', async (req, res) => {
  try {
    const key = (req.body.gameid || '') + '|' + (req.body.code || '');
    const cache = readCsGamesCache();
    const entry = cache[key];
    const now = Date.now();

    if (entry && entry.data && (now - entry.ts) < CS_GAMES_CACHE_TTL) {
      return res.json(entry.data);
    }

    const r = await cs.post('/csapi/Provider', {
      type:     '2',
      gameid:   req.body.gameid,
      code:     req.body.code,
      gametype: req.body.gametype || '',
    });
    cache[key] = { data: r, ts: now };
    writeCsGamesCache(cache);
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 오닉스 게임 목록을 아너링크 순서로 정렬해서 반환
const hlGamesCachePath = path.join(__dirname, '..', 'data', 'games_cache.json');
function readHlGamesCache() {
  try { return JSON.parse(fs.readFileSync(hlGamesCachePath, 'utf8')); } catch(e) { return {}; }
}

router.post('/games/sorted', async (req, res) => {
  try {
    const vendor = req.body.vendor;       // HonorLink vendor name (e.g. "PragmaticPlay")
    const gameid = req.body.gameid;        // CS API gameid
    const code   = req.body.code;          // CS API code
    const gametype = req.body.gametype || '';

    // 1. CS API 게임 목록 가져오기
    const csKey = (gameid || '') + '|' + (code || '');
    const csCache = readCsGamesCache();
    const csEntry = csCache[csKey];
    const now = Date.now();
    let csData;
    if (csEntry && csEntry.data && (now - csEntry.ts) < CS_GAMES_CACHE_TTL) {
      csData = csEntry.data;
    } else {
      csData = await cs.post('/csapi/Provider', { type: '2', gameid, code, gametype });
      csCache[csKey] = { data: csData, ts: now };
      writeCsGamesCache(csCache);
    }
    const csGames = (csData && csData.data) || [];

    // 2. 아너링크 게임 목록 가져오기 (캐시에서)
    const csToHlMap = {
      'pragmaticplay': 'PragmaticPlay',
      'cq9': 'CQ9',
      'hbn': 'Habanero',
      'bng': 'Booongo',
      'nolimitcity': 'Nolimit City',
      'pg': 'PG Soft',
      'hacksaw': 'Hacksaw',
      'jili': 'jili'
    };
    const hlVendor = csToHlMap[vendor.toLowerCase()] || vendor;
    const hlCache = readHlGamesCache();
    const hlEntry = hlCache[hlVendor] || hlCache[vendor];
    const hlGames = (hlEntry && hlEntry.data) || [];

    // 3. 아너링크 순서 맵 만들기 (rank 기준 정렬 후 game id → index)
    hlGames.sort(function(a, b) {
      var ra = a.rank !== null && a.rank !== undefined ? a.rank : 99999;
      var rb = b.rank !== null && b.rank !== undefined ? b.rank : 99999;
      return ra - rb;
    });
    const hlOrderById = {};
    const hlOrderByTitle = {};
    const hlDataById = {};
    const hlDataByTitle = {};
    hlGames.forEach(function(g, i) {
      var thumb = (g.thumbnails && (g.thumbnails['300x300'] || g.thumbnails['440x590'])) || g.thumbnail || '';
      var korName = (g.langs && g.langs.ko) || '';
      var d = { idx: i, img: thumb, title: g.title || '', korName: korName };
      hlOrderById[String(g.id)] = i;
      hlDataById[String(g.id)] = d;
      if (g.title) {
        var tKey = g.title.toLowerCase().trim();
        hlOrderByTitle[tKey] = i;
        hlDataByTitle[tKey] = d;
      }
    });

    function getHlIndex(csGame) {
      if (hlOrderById.hasOwnProperty(String(csGame.subcode))) return hlOrderById[String(csGame.subcode)];
      var engName = (csGame.name_eng || csGame.name || '').toLowerCase().trim();
      if (engName && hlOrderByTitle.hasOwnProperty(engName)) return hlOrderByTitle[engName];
      return 999999;
    }

    function applyHlData(csGame) {
      var d = hlDataById[String(csGame.subcode)];
      if (!d) {
        var engName = (csGame.name_eng || csGame.name || '').toLowerCase().trim();
        if (engName) d = hlDataByTitle[engName];
      }
      if (d) {
        if (d.img) csGame.img = d.img;
        if (d.title) csGame.name_eng = d.title;
        if (d.korName) csGame.name_kor = d.korName;
      }
    }

    // 4. CS API 게임을 아너링크 순서로 정렬
    csGames.sort(function(a, b) {
      const ai = getHlIndex(a);
      const bi = getHlIndex(b);
      if (ai === bi) return 0;
      return ai - bi;
    });

    // 5. 아너링크 이미지/이름 교체
    csGames.forEach(function(g) { applyHlData(g); });

    res.json({ result: 1, data: csGames });
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// 오닉스 게임 목록 강제 갱신
router.post('/games/refresh', async (req, res) => {
  try {
    const key = (req.body.gameid || '') + '|' + (req.body.code || '');
    const cache = readCsGamesCache();
    const r = await cs.post('/csapi/Provider', {
      type:     '2',
      gameid:   req.body.gameid,
      code:     req.body.code,
      gametype: req.body.gametype || '',
    });
    cache[key] = { data: r, ts: Date.now() };
    writeCsGamesCache(cache);
    res.json({ success: true, count: (r.data || []).length });
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
