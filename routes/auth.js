const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const dal     = require('../lib/dal');
const hl      = require('../lib/honorlink');
const cs      = require('../lib/csapi');
const txCollector = require('../lib/transactionCollector');
const telegram = require('../lib/telegram');

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

// 로그인 실패 추적: { username: { count, lockedUntil } }
const loginFailMap = {};

// 세션 토큰: { userId: token } — 중복 로그인 차단용
const sessionTokenMap = {};

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

async function readUsers() { try { return await dal.readData('users.json'); } catch(e) { return []; } }
async function writeUsers(data) { await dal.writeData('users.json', data); }

// 온라인 유저 ID 목록 반환
function getOnlineIds() {
  const now = Date.now();
  return Object.keys(onlineMap).filter(id => now - onlineMap[id] < ONLINE_TIMEOUT);
}

// ── 자동 정산: 접속 종료된 유저의 게임사 잔액 → 로컬 머니로 회수 ──
const _settledSet = new Set(); // 이미 정산된 유저 ID (중복 방지)

async function _autoSettleOfflineUsers() {
  const now = Date.now();
  const users = await readUsers();

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

    // _delayedRecoverCheck 실행 중이면 스킵 (이중 회수 방지)
    if (_recoverLock[user.username]) continue;

    try {
      // HonorLink 게임사 잔액 조회 + 회수
      const hlUser = await hl.get('/user', { username: user.username });
      const gameBal = Number(hlUser && hlUser.balance || 0);

      if (gameBal > 0) {
        await hl.post('/user/sub-balance-all', { username: user.username });
      }

      // CS API 게임사 잔액 조회 + 전액 회수
      let csBal = 0;
      try {
        const csRes = await cs.post('/csapi/amount', { userid: user.username, amount: 0, type: '0' });
        csBal = Number(csRes && csRes.balance || 0);
        if (csBal > 0) {
          await cs.post('/csapi/amount', { userid: user.username, amount: 0, type: '3' }); // 전액출금
        }
      } catch(csErr) { console.error('[AutoSettle] CS API error for ' + user.username + ':', csErr.message); }

      const totalRecovered = gameBal + csBal;

      // 로컬 머니에 추가 + api 동기화 해제
      const freshUsers = await readUsers();
      const freshUser = freshUsers.find(u => u.id === userId);
      if (freshUser) {
        if (totalRecovered > 0) {
          freshUser.money = (freshUser.money || 0) + totalRecovered;
        }
        freshUser.api = [];
        await writeUsers(freshUsers);
        console.log('[AutoSettle] ' + user.username + ': HL=' + gameBal + ' CS=' + csBal + ' → local, api cleared');
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
  const users = await readUsers();
  const onlineIds = getOnlineIds();
  let changed = false;
  for (const u of users) {
    if (u.api && u.api.length && !onlineIds.includes(u.id)) {
      // HonorLink 잔액 회수
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
      // CS API 잔액 회수
      try {
        const csRes = await cs.post('/csapi/amount', { userid: u.username, amount: 0, type: '0' });
        const csBal = Number(csRes && csRes.balance || 0);
        if (csBal > 0) {
          await cs.post('/csapi/amount', { userid: u.username, amount: 0, type: '3' });
          u.money = (u.money || 0) + csBal;
        }
      } catch(e) {}
      u.api = [];
      delete gameSessionMap[u.username];
      changed = true;
      console.log('[Cleanup] ' + u.username + ': stale api cleared');
    }
  }
  if (changed) await writeUsers(users);
}
setTimeout(_cleanupStaleApi, 5 * 1000);

// ── 추천코드 확인 ──
router.get('/check-referral', async (req, res) => {
  const code = (req.query.code || '').trim();
  if (!code) return res.json({ success: false });
  let refs = [];
  try { refs = await dal.readData('referrals.json'); } catch(e) {}
  const found = refs.find(r => r.code === code);
  res.json({ success: true, valid: !!found });
});

// ── 회원가입 ──
router.post('/register', async (req, res) => {
  const { username, nickname, password, phone, bank, account, holder, referral } = req.body;
  if (!username || !password) return res.json({ success: false, error: '아이디와 비밀번호를 입력해주세요.' });
  if (username.length < 4) return res.json({ success: false, error: '아이디는 4자 이상이어야 합니다.' });

  const users = await readUsers();
  if (users.find(u => u.username === username)) return res.json({ success: false, error: '이미 사용 중인 아이디입니다.' });

  // 추천코드 유효성 체크
  let referredBy = null;
  if (referral) {
    let refs = [];
    try { refs = await dal.readData('referrals.json'); } catch(e) {}
    const found = refs.find(r => r.code === referral);
    if (!found) return res.json({ success: false, error: '유효하지 않은 추천코드입니다.' });
    // 추천코드 사용 기록
    found.usedCount = (found.usedCount || 0) + 1;
    if (!found.usedBy) found.usedBy = [];
    found.usedBy.push(username);
    await dal.writeData('referrals.json', refs);
    referredBy = found.userId;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id:           Date.now().toString(),
    username,
    nickname:     nickname || username,
    password:     hashedPassword,
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
  await writeUsers(users);

  // 텔레그램 알림
  telegram.send('signup', '🆕 <b>회원가입 신청</b>\n아이디: ' + username + '\n닉네임: ' + (nickname || username) + '\n시간: ' + newUser.registeredAt);

  res.json({ success: true });
});

// ── 로그인 ──
router.post('/login', async (req, res) => {
  // 차단 IP 체크
  const clientIp = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  try {
    const settings = await dal.readData('admin_settings.json');
    const blockedIps = settings.blockedIps || [];
    if (blockedIps.some(b => b.ip === clientIp)) {
      return res.json({ success: false, error: '차단된 IP입니다.' });
    }
  } catch(e) {}

  const { username, password } = req.body;

  // 로그인 실패 잠금 체크
  try {
    const s2 = await dal.readData('admin_settings.json');
    const sec2 = s2.security || {};
    if (sec2.loginLimit !== false && loginFailMap[username]) {
      const fail = loginFailMap[username];
      if (fail.lockedUntil && Date.now() < fail.lockedUntil) {
        const remain = Math.ceil((fail.lockedUntil - Date.now()) / 60000);
        return res.json({ success: false, error: '로그인 시도 초과로 계정이 잠겼습니다. (' + remain + '분 후 해제)' });
      }
    }
  } catch(e) {}

  const users = await readUsers();
  const user  = users.find(u => u.username === username);
  const passwordMatch = user ? await bcrypt.compare(password, user.password || '') : false;

  if (!user || !passwordMatch) {
    // 로그인 실패 카운트
    try {
      const s3 = await dal.readData('admin_settings.json');
      const sec3 = s3.security || {};
      if (sec3.loginLimit !== false) {
        const maxAttempt = sec3.maxAttempt || 10;
        const lockTime = sec3.lockTime || 30;
        if (!loginFailMap[username]) loginFailMap[username] = { count: 0, lockedUntil: null, lockedAt: null };
        loginFailMap[username].count++;
        if (loginFailMap[username].count >= maxAttempt) {
          loginFailMap[username].lockedUntil = Date.now() + lockTime * 60000;
          loginFailMap[username].lockedAt = new Date().toISOString();
          return res.json({ success: false, error: '로그인 시도 초과로 계정이 잠겼습니다. (' + lockTime + '분 후 해제)' });
        }
      }
    } catch(e) {}
    return res.json({ success: false, error: '아이디 또는 비밀번호가 틀렸습니다.' });
  }

  if (user.status === 'pending')  return res.json({ success: false, error: '관리자 승인 대기 중입니다.' });
  if (user.status === 'blocked')  return res.json({ success: false, error: '차단된 계정입니다.' });
  if (user.status === 'deleted')  return res.json({ success: false, error: '존재하지 않는 계정입니다.' });

  // 로그인 성공 시 실패 카운트 초기화
  delete loginFailMap[username];

  // 접속 정보 업데이트
  user.lastLoginAt = new Date().toISOString();
  user.lastLoginIp = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  await writeUsers(users);

  // 중복 로그인 체크 — 유저는 항상 단일 세션, 관리자/파트너는 설정에 따라
  const isAdmin = user.role === 'admin' || user.role === 'head' || user.role === 'subhead' || user.role === 'distributor' || user.role === 'store';
  if (!isAdmin) {
    // 유저: 항상 이전 세션 강제 종료
    if (sessionTokenMap[user.id]) {
      kickedSet.add(user.id + ':' + sessionTokenMap[user.id]);
    }
  } else {
    // 관리자/파트너: dupLogin 설정 확인
    try {
      const s2 = await dal.readData('admin_settings.json');
      const dupLogin = s2.security && s2.security.dupLogin;
      if (!dupLogin && sessionTokenMap[user.id]) {
        kickedSet.add(user.id + ':' + sessionTokenMap[user.id]);
      }
    } catch(e) {}
  }

  // 세션 토큰 발급
  const sessionToken = Date.now().toString(36) + Math.random().toString(36).slice(2);
  sessionTokenMap[user.id] = sessionToken;

  // 온라인 등록
  onlineMap[user.id] = Date.now();
  deviceMap[user.id] = req.headers['user-agent'] || '';

  // 로그인 기록 저장
  try {
    let logs = [];
    try { logs = await dal.readData('login_logs.json'); } catch(e) {}
    logs.unshift({
      username: user.username,
      nickname: user.nickname || '',
      ip: user.lastLoginIp,
      device: (req.headers['user-agent'] || '').substring(0, 120),
      datetime: user.lastLoginAt
    });
    if (logs.length > 500) logs = logs.slice(0, 500);
    await dal.writeData('login_logs.json', logs);
  } catch(e) {}

  res.json({ success: true, data: { id: user.id, username: user.username, nickname: user.nickname, money: user.money, balance: user.money, gameGroup: user.gameGroup || '', bank: user.bank || '', account: user.account || '', holder: user.holder || '', sessionToken: sessionToken } });
});

// ── 핑 (접속 유지) ──
router.post('/ping', (req, res) => {
  const { userId, sessionToken } = req.body;
  // 관리자 강제종료 체크
  if (userId && kickedSet.has(userId)) {
    kickedSet.delete(userId);
    return res.json({ success: false, kicked: true });
  }
  // 중복 로그인 체크: 세션 토큰 불일치 시 킥
  if (userId && sessionToken && sessionTokenMap[userId] && sessionTokenMap[userId] !== sessionToken) {
    return res.json({ success: false, kicked: true, reason: 'duplicate_login' });
  }
  // 토큰 키 기반 킥 체크 (이전 세션용)
  if (userId && sessionToken && kickedSet.has(userId + ':' + sessionToken)) {
    kickedSet.delete(userId + ':' + sessionToken);
    return res.json({ success: false, kicked: true, reason: 'duplicate_login' });
  }
  if (userId) onlineMap[userId] = Date.now();
  res.json({ success: true });
});

// ── 유저 gameGroup 조회 ──
router.get('/game-group', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.json({ gameGroup: '' });
  const users = await readUsers();
  const user = users.find(u => u.username === username || u.id === username);
  if (!user) return res.json({ gameGroup: '' });
  res.json({ gameGroup: user.gameGroup || '' });
});

// ── 유저 프로필 조회 (은행/계좌/예금주 등) ──
router.get('/profile', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ success: false });
  const users = await readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return res.json({ success: false });
  res.json({ success: true, bank: user.bank || '', account: user.account || '', holder: user.holder || '' });
});

// ── 잔액 조회 (유저용): 로컬 + 게임사 합산 ──
router.get('/balance', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ success: false });
  const users = await readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return res.json({ success: false });

  const localBal = user.money || 0;
  let gameBal = 0;
  const isHl = user.api && user.api.includes('honorlink');
  const isCs = user.api && user.api.includes('csapi');
  if (isHl) {
    try {
      const hlUser = await hl.get('/user', { username: user.username });
      gameBal = Number(hlUser && hlUser.balance || 0);
    } catch(e) {}
  }
  if (isCs) {
    try {
      const csRes = await cs.post('/csapi/amount', { userid: user.username, amount: 0, type: '0' });
      gameBal += Number(csRes && csRes.balance || 0);
    } catch(e) {}
  }

  res.json({ success: true, balance: localBal + gameBal, local: localBal, game: gameBal });
});

// ── 게임 전환 후 지연 잔액 재확인 (당첨금 타이밍 이슈 방지) ──
// source: 회수할 API ('honorlink' 또는 'csapi'), target: 입금할 API
const _recoverLock = {}; // 유저별 중복 실행 방지
async function _delayedRecoverCheck(username, source, target) {
  // 이미 실행 중이면 중복 방지
  if (_recoverLock[username]) {
    console.log('[DelayedRecover] ' + username + ': skipped (already running)');
    return;
  }
  _recoverLock[username] = true;

  const delays = [5000, 40000]; // 5초, 40초 후 재확인 (아너링크 30초 rate limit 고려)
  try {
    for (const delay of delays) {
      await new Promise(r => setTimeout(r, delay));

      // 유저가 다시 게임 전환했으면 중단
      const checkUsers = await readUsers();
      const checkUser = checkUsers.find(u => u.username === username);
      if (!checkUser) break;
      // source API에 다시 연동됐으면 = 유저가 다시 전환한 것 → 중단
      if (checkUser.api && checkUser.api.includes(source)) {
        console.log('[DelayedRecover] ' + username + ': aborted (user switched back to ' + source + ')');
        break;
      }

      try {
        let leftover = 0;

        if (source === 'honorlink') {
          const hlUser = await hl.get('/user', { username });
          leftover = Number(hlUser && hlUser.balance || 0);
          if (leftover > 0) {
            await hl.post('/user/sub-balance-all', { username });
          }
        } else if (source === 'csapi') {
          const csRes = await cs.post('/csapi/amount', { userid: username, amount: 0, type: '0' });
          leftover = Number(csRes && csRes.balance || 0);
          if (leftover > 0) {
            await cs.post('/csapi/amount', { userid: username, amount: 0, type: '3' });
          }
        }

        if (leftover > 0) {
          console.log('[DelayedRecover] ' + username + ': ' + source + ' leftover=' + leftover + ' after ' + (delay/1000) + 's');

          // 최신 유저 데이터로 다시 확인
          const freshUsers = await readUsers();
          const freshUser = freshUsers.find(u => u.username === username);
          if (!freshUser) continue;

          const isTargetActive = freshUser.api && freshUser.api.includes(target);

          if (isTargetActive && target === 'csapi') {
            try {
              await cs.post('/csapi/amount', { userid: username, amount: leftover, type: '1' });
              console.log('[DelayedRecover] ' + username + ': auto-deposit ' + leftover + ' to csapi');
            } catch(e) {
              freshUser.money = (freshUser.money || 0) + leftover;
              await writeUsers(freshUsers);
            }
          } else if (isTargetActive && target === 'honorlink') {
            try {
              await hl.post('/user/add-balance', { username, amount: leftover });
              console.log('[DelayedRecover] ' + username + ': auto-deposit ' + leftover + ' to honorlink');
            } catch(e) {
              freshUser.money = (freshUser.money || 0) + leftover;
              await writeUsers(freshUsers);
            }
          } else {
            freshUser.money = (freshUser.money || 0) + leftover;
            await writeUsers(freshUsers);
          }
        }
      } catch(e) {
        console.error('[DelayedRecover] ' + username + ' error:', e.message);
      }
    }
  } finally {
    delete _recoverLock[username]; // 항상 잠금 해제
  }
}

// ── 게임 전환용: 상대 API 잔액 회수 → 로컬로 복원 ──
router.post('/recover-for-switch', async (req, res) => {
  const { username, target } = req.body; // target: 'honorlink' 또는 'csapi' (이동할 곳)
  if (!username || !target) return res.json({ success: false });
  const users = await readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.json({ success: false });

  let recovered = 0;
  let source = null; // 회수한 API

  // 오닉스로 이동 → 아너링크 잔액 회수
  if (target === 'csapi' && user.api && user.api.includes('honorlink')) {
    source = 'honorlink';
    try {
      const hlUser = await hl.get('/user', { username });
      const hlBal = Number(hlUser && hlUser.balance || 0);
      if (hlBal > 0) {
        await hl.post('/user/sub-balance-all', { username });
        recovered += hlBal;
      }
    } catch(e) {}
    user.api = user.api.filter(a => a !== 'honorlink');
  }

  // 아너링크로 이동 → 오닉스 잔액 회수
  if (target === 'honorlink' && user.api && user.api.includes('csapi')) {
    source = 'csapi';
    try {
      const csRes = await cs.post('/csapi/amount', { userid: username, amount: 0, type: '0' });
      const csBal = Number(csRes && csRes.balance || 0);
      if (csBal > 0) {
        await cs.post('/csapi/amount', { userid: username, amount: 0, type: '3' });
        recovered += csBal;
      }
    } catch(e) {}
    user.api = user.api.filter(a => a !== 'csapi');
  }

  if (recovered > 0) {
    user.money = (user.money || 0) + recovered;
  }
  await writeUsers(users);

  // 백그라운드에서 지연 재확인 (당첨금 타이밍 이슈 방지)
  if (source) {
    _delayedRecoverCheck(username, source, target).catch(e => {
      console.error('[DelayedRecover] background error:', e.message);
    });
  }

  res.json({ success: true, recovered, localBalance: user.money || 0 });
});

// ── 온라인 목록 (어드민용) ──
router.get('/online', async (req, res) => {
  const ids   = getOnlineIds();
  const users = await readUsers();
  const onlineUsers = users.filter(u => ids.includes(u.id));

  // 오늘 트랜잭션 조회 (한국시간 기준 오늘 00:00 ~ 23:59)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const todayKST = kstNow.toISOString().slice(0, 10); // YYYY-MM-DD (한국시간 기준)

  let allTx = [];
  try {
    const txResult = await txCollector.query({ perPage: 100000 });
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
    const isHl = u.api && u.api.includes('honorlink');
    const isCs = u.api && u.api.includes('csapi');
    if (isHl) {
      try {
        const hlUser = await hl.get('/user', { username: u.username });
        gameBal = Number(hlUser && hlUser.balance || 0);
      } catch(e) {}
    }
    if (isCs) {
      try {
        const csRes = await cs.post('/csapi/amount', { userid: u.username, amount: 0, type: '0' });
        gameBal += Number(csRes && csRes.balance || 0);
      } catch(e) {}
    }
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

module.exports = { router, readUsers, writeUsers, onlineMap, kickedSet, gameSessionMap, loginFailMap };
