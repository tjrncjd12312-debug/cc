const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const hl      = require('../lib/honorlink');
const txCollector = require('../lib/transactionCollector');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// ── HL API 캐시 ──
const _hlCache = {};
function cachedHlGet(endpoint, params, ttlMs) {
  const key = endpoint + '|' + JSON.stringify(params || {});
  const now = Date.now();
  if (_hlCache[key] && (now - _hlCache[key].ts) < ttlMs) {
    return Promise.resolve(_hlCache[key].data);
  }
  return hl.get(endpoint, params).then(r => {
    _hlCache[key] = { data: r, ts: now };
    return r;
  });
}

// 온라인 추적: { userId: lastActiveTimestamp }
const onlineMap = {};
const kickedSet = new Set(); // 강제종료된 유저 ID
const ONLINE_TIMEOUT = 5 * 60 * 1000; // 5분

// 게임 세션 추적: { username: { vendor, game_id, startedAt } }
const gameSessionMap = {};

// 디바이스 추적: { userId: userAgent }
const deviceMap = {};

// 파트너 트리에서 상위 gameGroup 찾기 (가장 가까운 조상의 그룹 반환)
function findParentGameGroup(nodes, username) {
  // 루트→유저 경로를 찾고, 유저 제외 가장 가까운 조상의 gameGroup 반환
  const pathArr = [];
  function findPath(list, target) {
    if (!Array.isArray(list)) return false;
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      pathArr.push(n);
      if (n.id === target || n.username === target) return true;
      if (n.children && findPath(n.children, target)) return true;
      pathArr.pop();
    }
    return false;
  }
  findPath(nodes, username);
  // pathArr의 마지막은 본인, 그 위로 올라가며 gameGroup 찾기
  for (let i = pathArr.length - 2; i >= 0; i--) {
    if (pathArr[i].gameGroup === '__none__') return null; // 상속 차단
    if (pathArr[i].gameGroup) return pathArr[i].gameGroup;
  }
  return null;
}

function readUsers()       { try { return JSON.parse(fs.readFileSync(USERS_FILE,'utf8')); } catch(e){ return []; } }
function writeUsers(data)  { fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8'); }

// 온라인 유저 ID 목록 반환
function getOnlineIds() {
  const now = Date.now();
  return Object.keys(onlineMap).filter(id => now - onlineMap[id] < ONLINE_TIMEOUT);
}

// ── 자동 정산: 접속 종료된 유저의 게임사 잔액 → 로컬 머니로 회수 ──
const _settledSet = new Set(); // 이미 정산된 유저 ID (중복 방지)

async function _autoSettleOfflineUsers() {
  const now = Date.now();
  const users = readUsers();

  for (const userId of Object.keys(onlineMap)) {
    // 아직 온라인이면 스킵
    if (now - onlineMap[userId] < ONLINE_TIMEOUT) {
      _settledSet.delete(userId); // 다시 접속하면 정산 기록 초기화
      continue;
    }

    // 이미 정산했으면 스킵
    if (_settledSet.has(userId)) continue;

    const user = users.find(u => u.id === userId);
    if (!user) continue;

    try {
      // 게임사 잔액 조회
      const hlUser = await hl.get('/user', { username: user.username });
      const gameBal = Number(hlUser && hlUser.balance || 0);

      // 게임사 잔액 전액 회수 + 동기화 해제
      if (gameBal > 0) {
        await hl.post('/user/sub-balance-all', { username: user.username });
      }

      // 로컬 머니에 추가 + api 동기화 해제
      const freshUsers = readUsers();
      const freshUser = freshUsers.find(u => u.id === userId);
      if (freshUser) {
        if (gameBal > 0) {
          freshUser.money = (freshUser.money || 0) + gameBal;
        }
        freshUser.api = [];
        writeUsers(freshUsers);
        console.log('[AutoSettle] ' + user.username + ': game ' + gameBal + ' → local, api cleared');
      }
    } catch(e) {
      console.error('[AutoSettle] Error for ' + user.username + ':', e.message);
    }

    // 게임 세션 제거
    delete gameSessionMap[user.username];

    // 정산 완료 표시
    _settledSet.add(userId);

    // onlineMap에서 제거
    delete onlineMap[userId];
    delete deviceMap[userId];
  }
}

// 60초마다 자동 정산 실행
setInterval(_autoSettleOfflineUsers, 60 * 1000);
// 서버 시작 30초 후 첫 실행
setTimeout(_autoSettleOfflineUsers, 30 * 1000);

// ── 서버 시작 시: onlineMap에 없는데 api가 남아있는 유저 정리 ──
async function _cleanupStaleApi() {
  const users = readUsers();
  const onlineIds = getOnlineIds();
  let changed = false;
  for (const u of users) {
    if (u.api && u.api.length && !onlineIds.includes(u.id)) {
      // 게임사 잔액 회수 시도
      if (u.api.includes('honorlink')) {
        try {
          const hlUser = await hl.get('/user', { username: u.username });
          const gameBal = Number(hlUser && hlUser.balance || 0);
          if (gameBal > 0) {
            await hl.post('/user/sub-balance-all', { username: u.username });
            u.money = (u.money || 0) + gameBal;
          }
        } catch(e) {}
      }
      u.api = [];
      delete gameSessionMap[u.username];
      changed = true;
      console.log('[Cleanup] ' + u.username + ': stale api cleared');
    }
  }
  if (changed) writeUsers(users);
}
setTimeout(_cleanupStaleApi, 5 * 1000);

// ── 추천코드 확인 ──
router.get('/check-referral', (req, res) => {
  const code = (req.query.code || '').trim();
  if (!code) return res.json({ success: false });
  const refPath = path.join(__dirname, '../data/referrals.json');
  let refs = [];
  try { refs = JSON.parse(fs.readFileSync(refPath, 'utf8')); } catch(e) {}
  const found = refs.find(r => r.code === code);
  res.json({ success: true, valid: !!found });
});

// ── 회원가입 ──
router.post('/register', (req, res) => {
  const { username, nickname, password, phone, bank, account, holder, referral } = req.body;
  if (!username || !password) return res.json({ success: false, error: '아이디와 비밀번호를 입력해주세요.' });
  if (username.length < 4) return res.json({ success: false, error: '아이디는 4자 이상이어야 합니다.' });

  const users = readUsers();
  if (users.find(u => u.username === username)) return res.json({ success: false, error: '이미 사용 중인 아이디입니다.' });

  // 추천코드 유효성 체크
  let referredBy = null;
  if (referral) {
    const refPath = path.join(__dirname, '../data/referrals.json');
    let refs = [];
    try { refs = JSON.parse(fs.readFileSync(refPath, 'utf8')); } catch(e) {}
    const found = refs.find(r => r.code === referral);
    if (!found) return res.json({ success: false, error: '유효하지 않은 추천코드입니다.' });
    // 추천코드 사용 기록
    found.usedCount = (found.usedCount || 0) + 1;
    if (!found.usedBy) found.usedBy = [];
    found.usedBy.push(username);
    fs.writeFileSync(refPath, JSON.stringify(refs, null, 2), 'utf8');
    referredBy = found.userId;
  }

  const newUser = {
    id:           Date.now().toString(),
    username,
    nickname:     nickname || username,
    password,
    phone:        phone || '',
    bank:         bank || '',
    account:      account || '',
    holder:       holder || '',
    money:        0,
    point:        0,
    status:       'pending',   // pending | active | blocked | deleted
    casino:       'ON',
    slot:         'ON',
    memo:         '',
    referredBy:   referredBy,
    referralCode: referral || null,
    registeredAt: new Date().toISOString(),
    lastLoginAt:  null,
    lastLoginIp:  null,
  };

  users.push(newUser);
  writeUsers(users);
  res.json({ success: true });
});

// ── 로그인 ──
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  const user  = users.find(u => u.username === username && u.password === password);

  if (!user)              return res.json({ success: false, error: '아이디 또는 비밀번호가 틀렸습니다.' });
  if (user.status === 'pending')  return res.json({ success: false, error: '관리자 승인 대기 중입니다.' });
  if (user.status === 'blocked')  return res.json({ success: false, error: '차단된 계정입니다.' });
  if (user.status === 'deleted')  return res.json({ success: false, error: '존재하지 않는 계정입니다.' });

  // 접속 정보 업데이트
  user.lastLoginAt = new Date().toISOString();
  user.lastLoginIp = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  writeUsers(users);

  // 온라인 등록
  onlineMap[user.id] = Date.now();
  deviceMap[user.id] = req.headers['user-agent'] || '';

  res.json({ success: true, data: { id: user.id, username: user.username, nickname: user.nickname, money: user.money, balance: user.money, gameGroup: user.gameGroup || '' } });
});

// ── 핑 (접속 유지) ──
router.post('/ping', (req, res) => {
  const { userId } = req.body;
  if (userId && kickedSet.has(userId)) {
    kickedSet.delete(userId);
    return res.json({ success: false, kicked: true });
  }
  if (userId) onlineMap[userId] = Date.now();
  res.json({ success: true });
});

// ── 유저 gameGroup 조회 ──
router.get('/game-group', (req, res) => {
  const { username } = req.query;
  if (!username) return res.json({ gameGroup: '' });
  const users = readUsers();
  const user = users.find(u => u.username === username || u.id === username);
  if (!user) return res.json({ gameGroup: '' });
  res.json({ gameGroup: user.gameGroup || '' });
});

// ── 잔액 조회 (유저용): 로컬 + 게임사 합산 ──
router.get('/balance', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ success: false });
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return res.json({ success: false });

  const localBal = user.money || 0;
  let gameBal = 0;
  try {
    const hlUser = await cachedHlGet('/user', { username: user.username }, 5000);
    gameBal = Number(hlUser && hlUser.balance || 0);
  } catch(e) {}

  res.json({ success: true, balance: localBal + gameBal, local: localBal, game: gameBal });
});

// ── 온라인 목록 (어드민용) ──
router.get('/online', async (req, res) => {
  const ids   = getOnlineIds();
  const users = readUsers();
  const onlineUsers = users.filter(u => ids.includes(u.id));

  // 오늘 트랜잭션 조회 (한국시간 기준 오늘 00:00 ~ 23:59)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const todayKST = kstNow.toISOString().slice(0, 10); // YYYY-MM-DD (한국시간 기준)

  let allTx = [];
  try {
    const txResult = txCollector.query({ perPage: 100000 });
    allTx = txResult.data || [];
  } catch(e) {}

  // 오늘(한국시간) 트랜잭션만 필터
  const todayTx = allTx.filter(tx => {
    const dt = tx.processed_at || tx.created_at || '';
    if (!dt) return false;
    const txKST = new Date(new Date(dt).getTime() + kstOffset);
    return txKST.toISOString().slice(0, 10) === todayKST;
  });

  // 유저별 베팅/당첨 집계
  const userStats = {};
  todayTx.forEach(tx => {
    const username = tx.user && tx.user.username;
    if (!username) return;
    if (!userStats[username]) userStats[username] = { bet: 0, win: 0 };
    if (tx.type === 'bet') userStats[username].bet += Math.abs(tx.amount || 0);
    else if (tx.type === 'win') userStats[username].win += Math.abs(tx.amount || 0);
  });

  // 유저별 가장 최근 베팅 게임 정보 (전체 트랜잭션에서 시간순 최신)
  const lastGameMap = {};
  allTx.filter(tx => tx.type === 'bet' && tx.details && tx.details.game)
    .sort((a, b) => {
      const da = a.processed_at || a.created_at || '';
      const db = b.processed_at || b.created_at || '';
      return da > db ? 1 : -1;
    })
    .forEach(tx => {
      const username = tx.user && tx.user.username;
      if (username) lastGameMap[username] = {
        title: tx.details.game.title || '',
        vendor: tx.details.game.vendor || '',
        type: tx.details.game.type || '',
      };
    });

  // 각 유저의 게임사 잔액 합산
  const list = await Promise.all(onlineUsers.map(async (u) => {
    let gameBal = 0;
    try {
      const hlUser = await cachedHlGet('/user', { username: u.username }, 5000);
      gameBal = Number(hlUser && hlUser.balance || 0);
    } catch(e) {}
    const gs = gameSessionMap[u.username] || null;
    const stats = userStats[u.username] || { bet: 0, win: 0 };
    const lg = lastGameMap[u.username] || null;
    const isInGame = !!gs || gameBal > 0;
    return {
      id: u.id, username: u.username, nickname: u.nickname,
      money: (u.money || 0) + gameBal,
      localMoney: u.money || 0,
      gameMoney: gameBal,
      lastLoginAt: u.lastLoginAt, lastLoginIp: u.lastLoginIp,
      inGame: isInGame,
      currentGame: lg ? lg.vendor : (gs ? gs.vendor : null),
      gameTitle: lg ? lg.title : (gs ? gs.gameTitle : null),
      gameType: lg ? lg.type : (gs ? gs.gameType : null),
      gameStartedAt: gs ? gs.startedAt : null,
      userAgent: deviceMap[u.id] || '',
      todayBet: stats.bet,
      todayWin: stats.win,
    };
  }));

  res.json({ success: true, data: list });
});

module.exports = { router, readUsers, writeUsers, onlineMap, kickedSet, gameSessionMap };
