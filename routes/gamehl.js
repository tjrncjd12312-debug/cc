// ══════════════════════════════════════
//  HonorLink 게임 API 프록시 라우트
// ══════════════════════════════════════
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs').promises;
const hl      = require('../lib/honorlink');
const dal     = require('../lib/dal');
const { gameSessionMap } = require('./auth');

// ── API 캐시 (Rate Limit 방지) ──
const _cache = {};
const _cacheTtls = {}; // key -> ttlMs (각 항목의 TTL 기록)
function cachedGet(endpoint, params, ttlMs) {
  const key = endpoint + '|' + JSON.stringify(params || {});
  const now = Date.now();
  if (_cache[key] && (now - _cache[key].ts) < ttlMs) {
    return Promise.resolve(_cache[key].data);
  }
  return hl.get(endpoint, params).then(function(r) {
    _cache[key] = { data: r, ts: now };
    _cacheTtls[key] = ttlMs;
    return r;
  });
}

// 5분마다 만료된 캐시 항목 정리
setInterval(function() {
  const now = Date.now();
  for (const key of Object.keys(_cache)) {
    const ttl = _cacheTtls[key] || 60000; // 기본 TTL 1분
    if (now - _cache[key].ts >= ttl) {
      delete _cache[key];
      delete _cacheTtls[key];
    }
  }
}, 5 * 60 * 1000);

async function readGameSettings() {
  try {
    return await dal.readData('games.json');
  } catch(e) { return {}; }
}

// ── 게임 노출설정 (유저용)
router.get('/settings', async (req, res) => {
  res.json(await readGameSettings());
});

// ── 에이전트 정보 (10초 캐시)
router.get('/my-info', async (req, res) => {
  try { res.json(await cachedGet('/my-info', {}, 10000)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 벤더(게임사) 목록 (파일 캐시)
const vendorsCachePath = path.join(__dirname, '..', 'data', 'vendors_cache.json');

async function readVendorsCache() {
  try { return JSON.parse(await fs.readFile(vendorsCachePath, 'utf8')); } catch(e) { return null; }
}
async function writeVendorsCache(data) {
  await fs.writeFile(vendorsCachePath, JSON.stringify(data, null, 2), 'utf8');
}

// 게임사 목록 반환 (파일 있으면 파일, 없으면 API 호출 후 저장)
router.get('/vendors', async (req, res) => {
  try {
    const cached = await readVendorsCache();
    if (cached && cached.hl) {
      return res.json(cached.hl);
    }
    const data = await hl.get('/vendor-list');
    // 파일에 저장
    const existing = cached || {};
    existing.hl = data;
    existing.updatedAt = new Date().toISOString();
    await writeVendorsCache(existing);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 게임사 목록 강제 갱신
router.get('/vendors/refresh', async (req, res) => {
  try {
    const data = await hl.get('/vendor-list');
    const existing = await readVendorsCache() || {};
    existing.hl = data;
    existing.updatedAt = new Date().toISOString();
    await writeVendorsCache(existing);
    res.json({ success: true, count: Object.keys(data).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 게임 목록 (파일 캐시, 1시간마다 자동 갱신)
const gamesCachePath = path.join(__dirname, '..', 'data', 'games_cache.json');
const GAMES_CACHE_TTL = 60 * 60 * 1000; // 1시간

async function readGamesCache() {
  try { return JSON.parse(await fs.readFile(gamesCachePath, 'utf8')); } catch(e) { return {}; }
}
async function writeGamesCache(data) {
  await fs.writeFile(gamesCachePath, JSON.stringify(data, null, 2), 'utf8');
}

router.get('/games', async (req, res) => {
  try {
    const vendor = req.query.vendor;
    if (!vendor) return res.json({});

    const cache = await readGamesCache();
    const entry = cache[vendor];
    const now = Date.now();

    // 캐시가 있고 1시간 이내면 캐시 반환
    if (entry && entry.data && (now - entry.ts) < GAMES_CACHE_TTL) {
      return res.json(entry.data);
    }

    // API 호출 후 캐시 저장
    const data = await hl.get('/game-list', { vendor });
    cache[vendor] = { data, ts: now };
    await writeGamesCache(cache);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 게임 목록 강제 갱신 (특정 게임사 또는 전체)
router.get('/games/refresh', async (req, res) => {
  try {
    const vendor = req.query.vendor;
    const cache = await readGamesCache();
    const now = Date.now();

    if (vendor) {
      // 특정 게임사만 갱신
      const data = await hl.get('/game-list', { vendor });
      cache[vendor] = { data, ts: now };
      await writeGamesCache(cache);
      return res.json({ success: true, vendor, count: Array.isArray(data) ? data.length : Object.keys(data).length });
    }

    // 전체 게임사 갱신
    const vendorsCache = await readVendorsCache();
    const vendors = vendorsCache && vendorsCache.hl ? Object.keys(vendorsCache.hl) : [];
    let total = 0;
    for (const v of vendors) {
      try {
        const data = await hl.get('/game-list', { vendor: v });
        cache[v] = { data, ts: now };
        total++;
      } catch(e) {}
    }
    await writeGamesCache(cache);
    res.json({ success: true, refreshed: total, total: vendors.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 로비 목록
router.get('/lobbies', async (req, res) => {
  try { res.json(await hl.get('/lobby-list')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 게임 실행 링크 (첫 접속 시 자동으로 게임사 유저 생성)
router.post('/launch', async (req, res) => {
  try {
    const username = req.body.username;
    const nickname = req.body.nickname || username;

    // users.json에서 해당 유저의 api 필드 확인
    let users = [];
    try { users = await dal.readData('users.json'); } catch(e) {}
    const user = users.find(u => u.username === username);

    // 베팅 권한 체크
    if (user) {
      if (user.casino === 'OFF') return res.status(403).json({ error: '현재 게임사가 점검중입니다.' });
      if (user.slot === 'OFF') {
        const vendor = (req.body.vendor || '').toLowerCase();
        const gameId = (req.body.game_id || '').toLowerCase();
        // 슬롯 관련 vendor/game 체크
      }
    }

    // 게임 제한(점검/차단) 체크
    const gameSettings = await readGameSettings();
    const hiddenList = (gameSettings.hiddenGames || {})[req.body.vendor] || [];
    if (hiddenList.indexOf(String(req.body.game_id)) >= 0) {
      return res.status(403).json({ error: '해당 게임은 현재 점검중입니다.' });
    }
    const blockedList = (gameSettings.blockedGames || {})[req.body.vendor] || [];
    if (blockedList.indexOf(String(req.body.game_id)) >= 0) {
      return res.status(403).json({ error: '해당 게임은 현재 이용이 제한되어 있습니다.' });
    }

    // HonorLink에 유저가 아직 등록되지 않았으면 자동 생성
    if (!user || !user.api || !user.api.includes('honorlink')) {
      try {
        await hl.post('/user/create', { username, nickname });
        if (user) {
          if (!user.api) user.api = [];
          if (!user.api.includes('honorlink')) user.api.push('honorlink');
          await dal.writeData('users.json', users);
        }
      } catch(e) {
        // 이미 존재하는 유저면 무시, api 필드만 업데이트
        if (user && (!user.api || !user.api.includes('honorlink'))) {
          if (!user.api) user.api = [];
          user.api.push('honorlink');
          await dal.writeData('users.json', users);
        }
      }
    }

    const r = await hl.get('/game-launch-link', {
      username,
      nickname,
      game_id:  req.body.game_id,
      vendor:   req.body.vendor,
      skin:     req.body.skin || undefined,
    });

    // 게임 세션 추적
    gameSessionMap[username] = {
      vendor: req.body.vendor || '',
      game_id: req.body.game_id || '',
      gameTitle: req.body.gameTitle || '',
      gameType: req.body.gameType || 'slot',
      startedAt: new Date().toISOString(),
    };

    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 유저 조회
router.get('/user', async (req, res) => {
  try { res.json(await hl.get('/user', { username: req.query.username })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 유저 목록
router.get('/users', async (req, res) => {
  try {
    res.json(await hl.get('/user-list', {
      page:    req.query.page    || 1,
      perPage: req.query.perPage || 5000,
    }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 유저 생성
router.post('/user/create', async (req, res) => {
  try {
    const r = await hl.post('/user/create', {
      username: req.body.username,
      nickname: req.body.nickname || req.body.username,
    });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 머니 지급
router.post('/user/add-balance', async (req, res) => {
  if (!req.body.username || typeof req.body.username !== 'string') return res.status(400).json({ error: '잘못된 요청입니다.' });
  const amt = Number(req.body.amount);
  if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: '올바른 금액을 입력해주세요.' });
  try {
    const r = await hl.post('/user/add-balance', {
      username: req.body.username,
      amount:   amt,
      uuid:     req.body.uuid || undefined,
    });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 머니 부분 회수
router.post('/user/sub-balance', async (req, res) => {
  if (!req.body.username || typeof req.body.username !== 'string') return res.status(400).json({ error: '잘못된 요청입니다.' });
  const amt = Number(req.body.amount);
  if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: '올바른 금액을 입력해주세요.' });
  try {
    const r = await hl.post('/user/sub-balance', {
      username: req.body.username,
      amount:   amt,
      uuid:     req.body.uuid || undefined,
    });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 머니 전액 회수
router.post('/user/sub-balance-all', async (req, res) => {
  if (!req.body.username || typeof req.body.username !== 'string') return res.status(400).json({ error: '잘못된 요청입니다.' });
  try {
    const r = await hl.post('/user/sub-balance-all', {
      username: req.body.username,
      uuid:     req.body.uuid || undefined,
    });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 잔액 조회 (5초 캐시)
router.get('/balance', async (req, res) => {
  try {
    const r = await cachedGet('/user', { username: req.query.username }, 5000);
    res.json({ balance: r ? (r.balance !== undefined ? r.balance : (r.data ? r.data.balance : 0)) : 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 강제종료 (킥)
router.post('/kick', async (req, res) => {
  try {
    const r = await hl.post('/user/kick', { username: req.body.username });
    // 게임 세션 제거
    delete gameSessionMap[req.body.username];
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 트랜잭션 조회 (35초 캐시 – HonorLink 30초 제한 준수) — 실시간 API
router.get('/transactions', async (req, res) => {
  try {
    const params = {
      start:        req.query.start,
      end:          req.query.end,
      page:         req.query.page      || 1,
      per_page:     req.query.per_page  || req.query.perPage || 100,
      with_details: req.query.with_details || req.query.withDetails || 0,
      order:        req.query.order     || 'desc',
    };
    const r = await cachedGet('/transactions', params, 35000);
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 로컬 저장된 트랜잭션 조회 (rate limit 없음)
const txCollector = require('../lib/transactionCollector');
router.get('/transactions/local', async (req, res) => {
  try {
    const usernames = req.query.usernames
      ? req.query.usernames.split(',').filter(Boolean)
      : [];
    const types = req.query.types
      ? req.query.types.split(',').filter(Boolean)
      : [];
    const result = await txCollector.query({
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
