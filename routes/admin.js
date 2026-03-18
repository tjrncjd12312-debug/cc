const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const cs      = require('../lib/csapi');
const hl      = require('../lib/honorlink');
const { onlineMap, kickedSet, gameSessionMap, loginFailMap } = require('./auth');
const txCollector = require('../lib/transactionCollector');
const telegram = require('../lib/telegram');
const dal     = require('../lib/dal');

// ══════════════════════════════════════
//  관리자 세션 관리
// ══════════════════════════════════════
const adminSessions = new Map(); // token -> { createdAt }

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let account;
  try { account = await dal.adminAccount.get(); } catch(e) {
    return res.json({ success: false, error: '계정 설정 오류' });
  }
  if (account && username === account.username && password === account.password) {
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, { createdAt: Date.now() });
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    telegram.send('adminLogin', '🔐 <b>관리자 로그인</b>\nIP: ' + clientIp + '\n시간: ' + new Date().toLocaleString('ko-KR'));
    return res.json({ success: true, token });
  }
  res.json({ success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
});

router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  let account;
  try { account = await dal.adminAccount.get(); } catch(e) {
    return res.json({ success: false, error: '계정 설정 오류' });
  }
  if (currentPassword !== account.password) return res.json({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' });
  if (!newPassword || newPassword.length < 4) return res.json({ success: false, error: '새 비밀번호는 4자 이상이어야 합니다.' });
  await dal.adminAccount.updatePassword(account.username, newPassword);
  res.json({ success: true });
});

router.post('/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  adminSessions.delete(token);
  res.json({ success: true });
});

router.get('/check-session', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token && adminSessions.has(token)) return res.json({ success: true });
  res.json({ success: false });
});

// 인증 미들웨어 — login/logout/check-session 이후 모든 라우트에 적용
const ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000; // 24시간
router.use((req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token && adminSessions.has(token)) {
    const sess = adminSessions.get(token);
    if (Date.now() - sess.createdAt > ADMIN_SESSION_TTL) {
      adminSessions.delete(token);
      return res.status(401).json({ success: false, error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
    }
    return next();
  }
  res.status(401).json({ success: false, error: '인증이 필요합니다.' });
});

async function readUsers()      { return await dal.users.readAll(); }
async function writeUsers(data) { await dal.users.writeAll(data); }

// 공지사항
router.get('/notices',    async (req, res) => res.json({ success: true, data: await dal.readData('notices.json') }));
router.post('/notices',   async (req, res) => { await dal.writeData('notices.json', req.body); res.json({ success: true }); });

// 게임
router.get('/games',      async (req, res) => res.json({ success: true, data: await dal.readData('games.json') }));
router.post('/games',     async (req, res) => { await dal.writeData('games.json', req.body); res.json({ success: true }); });

// 파트너 트리 (서버 동기화)
router.get('/partner-tree', async (_req, res) => {
  try { res.json({ success: true, data: await dal.readData('partnerTree.json') }); }
  catch(e) { res.json({ success: true, data: [] }); }
});
router.post('/partner-tree', async (req, res) => { await dal.writeData('partnerTree.json', req.body); res.json({ success: true }); });

// 롤링 로그
router.get('/rolling-log', async (_req, res) => {
  try { res.json({ success: true, data: await dal.readData('rolling_log.json') }); }
  catch(e) { res.json({ success: true, data: [] }); }
});

// 입출금
router.get('/deposits', async (_req, res) => { let d = []; try { d = await dal.readData('transfers.json'); } catch(e){} res.json({ success: true, data: d }); });
router.post('/deposits', async (req, res) => { await dal.writeData('transfers.json', req.body); res.json({ success: true }); });
router.get('/deposits/pending', async (_req, res) => {
  let all = [];
  try { all = await dal.readData('transfers.json'); } catch(e) {}
  res.json({
    success: true,
    deposit:  all.filter(d => d.type === 'deposit'  && d.status === 'pending').length,
    withdraw: all.filter(d => d.type === 'withdraw' && d.status === 'pending').length,
  });
});

// ── 파트너 생성 시 회원 등록 (게임사 연동은 게임 접속 시 자동) ──
router.post('/partner/create', async (req, res) => {
  const { username, nickname, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: '아이디와 비밀번호를 입력하세요.' });

  const users = await readUsers();
  const existing = users.find(u => u.username === username);

  let newUser;
  if (existing) {
    return res.json({ success: false, error: '이미 존재하는 아이디입니다.' });
  } else {
    newUser = {
      id: String(Date.now()),
      username,
      nickname: nickname || username,
      password,
      phone: '', bank: '', account: '', holder: '',
      money: 0, point: 0,
      status: 'active',
      casino: 'ON', slot: 'ON',
      memo: '',
      registeredAt: new Date().toISOString(),
      lastLoginAt: null, lastLoginIp: null,
      api: []
    };
    users.push(newUser);
    await writeUsers(users);
  }

  res.json({ success: true, user: newUser });
});

// ── 회원 목록 전체 ──
router.get('/users', async (_req, res) => {
  res.json({ success: true, data: await readUsers() });
});

// ── 회원별 베팅/당첨 집계 (날짜 필터) ──
router.get('/users/stats', async (req, res) => {
  const startDate = req.query.start || '';
  const endDate = req.query.end || '';

  let allTx = [];
  try {
    const txResult = await txCollector.query({ perPage: 100000 });
    allTx = txResult.data || [];
  } catch(e) { console.error('[Admin] 트랜잭션 조회 오류:', e.message); }

  // 날짜 필터 (KST 기준 — 트랜잭션 시간을 KST 날짜 문자열로 비교)
  if (startDate || endDate) {
    allTx = allTx.filter(tx => {
      const dt = tx.processed_at || tx.created_at || '';
      if (!dt) return false;
      const txMs = new Date(dt).getTime();
      const kstDate = new Date(txMs + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (startDate && kstDate < startDate) return false;
      if (endDate && kstDate > endDate) return false;
      return true;
    });
  }

  const stats = {};
  allTx.forEach(tx => {
    const username = tx.user && tx.user.username;
    if (!username) return;
    if (!stats[username]) stats[username] = { bet: 0, win: 0 };
    if (tx.type === 'bet') stats[username].bet += Math.abs(tx.amount || 0);
    else if (tx.type === 'win') stats[username].win += Math.abs(tx.amount || 0);
  });

  res.json({ success: true, data: stats });
});

// ── 강제종료 (게임 킥 + 접속목록 제거) ──
router.post('/user-kick', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ success: false, error: 'username 필요' });
  const users = await readUsers();
  const u = users.find(u => u.username === username);

  // 게임사 킥 + 잔액 전액 회수
  if (u && u.api && u.api.includes('honorlink')) {
    try {
      await hl.post('/user/kick', { username });
      const hlUser = await hl.get('/user', { username });
      const hlBal = Number(hlUser && hlUser.balance || 0);
      await hl.post('/user/sub-balance-all', { username });
      if (hlBal > 0) u.money = (u.money || 0) + hlBal;
    } catch(e) { console.error('[Admin] HL 잔액회수 오류(' + username + '):', e.message); }
  }
  if (u && u.api && u.api.includes('csapi')) {
    try {
      await cs.post('/csapi/kick', { userid: username });
      const csRes = await cs.post('/csapi/amount', { userid: username, amount: 0, type: '0' });
      const csBal = Number(csRes && csRes.balance || 0);
      if (csBal > 0) {
        await cs.post('/csapi/amount', { userid: username, amount: 0, type: '3' });
        u.money = (u.money || 0) + csBal;
      }
    } catch(e) { console.error('[Admin] CS 잔액회수 오류(' + username + '):', e.message); }
  }

  // 연동 해제 + 접속자 목록 제거 + 게임세션 제거 + 유저 로그아웃
  if (u) {
    u.api = [];
    await writeUsers(users);
    delete onlineMap[u.id];
    delete gameSessionMap[username];
    kickedSet.add(u.id);
  }

  res.json({ success: true });
});

// ── 유저 API 연동 상태 확인 ──
router.get('/users/:id/api-status', async (req, res) => {
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });

  const result = {
    csapi: u.api && u.api.includes('csapi'),
    honorlink: u.api && u.api.includes('honorlink')
  };

  res.json({ success: true, ...result, api: u.api || [] });
});

// ── 승인 대기 목록 ──
router.get('/users/pending', async (_req, res) => {
  const list = (await readUsers()).filter(u => u.status === 'pending');
  res.json({ success: true, data: list });
});

// ── 블랙리스트 (차단 + 삭제) ──
router.get('/users/blacklist', async (_req, res) => {
  const list = (await readUsers()).filter(u => u.status === 'blocked' || u.status === 'deleted');
  res.json({ success: true, data: list });
});

// ── 승인 ──
router.post('/users/:id/approve', async (req, res) => {
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  u.status = 'active';
  u.approvedAt = new Date().toISOString();
  if (!u.api) u.api = [];
  await writeUsers(users);
  res.json({ success: true });
});

// ── API 연동 해제 (킥 + 잔액회수 + 연동 제거) ──
router.post('/users/:id/api-disconnect', async (req, res) => {
  const { provider } = req.body;
  if (!provider) return res.json({ success: false, error: 'provider 필요' });
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });

  if (provider === 'honorlink') {
    try { await hl.post('/user/kick', { username: u.username }); } catch(e) { console.error('[Admin] HL킥 오류:', e.message); }
    try { await hl.post('/user/sub-balance-all', { username: u.username }); } catch(e) { console.error('[Admin] HL회수 오류:', e.message); }
  }
  if (provider === 'csapi') {
    try { await cs.post('/csapi/kick', { userid: u.username }); } catch(e) { console.error('[Admin] CS킥 오류:', e.message); }
    try {
      const csRes = await cs.post('/csapi/amount', { userid: u.username, amount: 0, type: '0' });
      const csBal = Number(csRes && csRes.balance || 0);
      if (csBal > 0) {
        await cs.post('/csapi/amount', { userid: u.username, amount: 0, type: '3' });
        u.money = (u.money || 0) + csBal;
      }
    } catch(e) { console.error('[Admin] CS회수 오류:', e.message); }
  }

  if (u.api) u.api = u.api.filter(a => a !== provider);
  await writeUsers(users);
  res.json({ success: true, api: u.api });
});

// ── 거절 (삭제) ──
router.post('/users/:id/reject', async (req, res) => {
  const users = (await readUsers()).filter(u => u.id !== req.params.id);
  await writeUsers(users);
  res.json({ success: true });
});

// ── 차단 ──
router.post('/users/:id/block', async (req, res) => {
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  u.status = 'blocked';
  if (req.body && req.body.belongTo) u.belongTo = req.body.belongTo;
  try {
    await cs.post('/csapi/kick', { userid: u.username });
    const csRes = await cs.post('/csapi/amount', { userid: u.username, amount: 0, type: '0' });
    const csBal = Number(csRes && csRes.balance || 0);
    if (csBal > 0) {
      await cs.post('/csapi/amount', { userid: u.username, amount: 0, type: '3' });
      u.money = (u.money || 0) + csBal;
    }
  } catch(e) {}
  try {
    const hlUser = await hl.get('/user', { username: u.username });
    const hlBal = Number(hlUser && hlUser.balance || 0);
    await hl.post('/user/sub-balance-all', { username: u.username });
    if (hlBal > 0) u.money = (u.money || 0) + hlBal;
  } catch(e) {}
  u.api = [];
  await writeUsers(users);
  res.json({ success: true });
});

// ── 삭제 (soft) ──
router.post('/users/:id/delete', async (req, res) => {
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  u.status = 'deleted';
  if (req.body && req.body.belongTo) u.belongTo = req.body.belongTo;
  try {
    await cs.post('/csapi/kick', { userid: u.username });
    const csRes = await cs.post('/csapi/amount', { userid: u.username, amount: 0, type: '0' });
    const csBal = Number(csRes && csRes.balance || 0);
    if (csBal > 0) {
      await cs.post('/csapi/amount', { userid: u.username, amount: 0, type: '3' });
      u.money = (u.money || 0) + csBal;
    }
  } catch(e) {}
  try {
    const hlUser = await hl.get('/user', { username: u.username });
    const hlBal = Number(hlUser && hlUser.balance || 0);
    await hl.post('/user/sub-balance-all', { username: u.username });
    if (hlBal > 0) u.money = (u.money || 0) + hlBal;
  } catch(e) {}
  u.api = [];
  await writeUsers(users);
  res.json({ success: true });
});

// ── 블랙리스트 해제 ──
router.post('/users/:id/unblock', async (req, res) => {
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  u.status = 'active';
  await writeUsers(users);
  res.json({ success: true });
});

// ── 회원 정보 수정 ──
router.post('/users/:id/update', async (req, res) => {
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  const allowed = ['nickname','phone','bank','account','holder','casino','slot','status','memo','grade','password','point','gameGroup','rollCasino','rollSlot','losingCasino','losingSlot'];
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      u[k] = req.body[k];
    }
  }
  await writeUsers(users);
  res.json({ success: true });
});
router.patch('/users/:id/update', async (req, res) => {
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  const allowed = ['nickname','phone','bank','account','holder','casino','slot','status','memo','grade','password','point','gameGroup','rollCasino','rollSlot','losingCasino','losingSlot'];
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      u[k] = req.body[k];
    }
  }
  await writeUsers(users);
  res.json({ success: true });
});

// ── gameGroup 일괄 변경 ──
router.post('/users/batch-group', async (req, res) => {
  const { ids, gameGroup } = req.body;
  if (!Array.isArray(ids)) return res.json({ success: false, error: '잘못된 요청' });
  const users = await readUsers();
  ids.forEach(id => {
    const u = users.find(u => u.id === id || u.username === id);
    if (u) u.gameGroup = gameGroup || '';
  });
  await writeUsers(users);
  res.json({ success: true, count: ids.length });
});

// ── 개별 유저 지급 ──
router.post('/users/:id/give', async (req, res) => {
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return res.json({ success: false, error: '올바른 금액' });
  const before = u.money || 0;
  u.money = before + amount;
  await writeUsers(users);
  res.json({ success: true, before, after: u.money });
});

// ── 개별 유저 회수 ──
router.post('/users/:id/take', async (req, res) => {
  const users = await readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  const before = u.money || 0;
  if (req.body.all) {
    u.money = 0;
  } else {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.json({ success: false, error: '올바른 금액' });
    u.money = Math.max(0, before - amount);
  }
  await writeUsers(users);
  res.json({ success: true, before, after: u.money });
});

// ── 관리자 머니 지급/회수 (username 기준) ──
router.post('/users/money', async (req, res) => {
  const { username, amount: rawAmount } = req.body;
  const amount = Number(rawAmount);
  if (!username) return res.json({ success: false, error: '유저명을 입력하세요.' });
  if (!amount || isNaN(amount)) return res.json({ success: false, error: '올바른 금액을 입력하세요.' });

  const users = await readUsers();
  const u = users.find(u => u.username === username);
  let before = 0, after = 0;
  let hlResult = null;
  const isHl = u && u.api && u.api.includes('honorlink');
  const isCs = u && u.api && u.api.includes('csapi');

  if (isHl) {
    before = u.money || 0;
    after = before;
    try {
      if (amount > 0) {
        hlResult = await hl.post('/user/add-balance', { username, amount: amount });
      } else {
        hlResult = await hl.post('/user/sub-balance-all', { username });
      }
    } catch(e) { hlResult = { error: e.message }; }
  } else if (isCs) {
    before = u.money || 0;
    after = before;
    try {
      if (amount > 0) {
        hlResult = await cs.post('/csapi/amount', { userid: username, amount: amount, type: '1' });
      } else {
        hlResult = await cs.post('/csapi/amount', { userid: username, amount: 0, type: '3' });
      }
    } catch(e) { hlResult = { error: e.message }; }
  } else if (u) {
    before = u.money || 0;
    u.money = Math.max(0, before + amount);
    after = u.money;
    await writeUsers(users);
  }
  res.json({ success: true, before, after, hlResult });
});

// ── 게임 종료: 게임사 잔액 전액 회수 → 로컬 DB에 복원 ──
router.post('/users/withdraw-game', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ success: false, error: '유저명 필요' });

  try {
    let totalRecovered = 0;

    try {
      const userInfo = await hl.get('/user', { username });
      const hlBalance = Number(userInfo && userInfo.balance || 0);
      if (hlBalance > 0) {
        await hl.post('/user/sub-balance-all', { username });
        totalRecovered += hlBalance;
      }
    } catch(e) {}

    try {
      const csRes = await cs.post('/csapi/amount', { userid: username, amount: 0, type: '0' });
      const csBal = Number(csRes && csRes.balance || 0);
      if (csBal > 0) {
        await cs.post('/csapi/amount', { userid: username, amount: 0, type: '3' });
        totalRecovered += csBal;
      }
    } catch(e) {}

    const users = await readUsers();
    const u = users.find(u => u.username === username);
    if (u) {
      if (totalRecovered > 0) u.money = (u.money || 0) + totalRecovered;
      u.api = [];
      await writeUsers(users);
    }

    res.json({ success: true, recovered: totalRecovered, localBalance: u ? u.money : 0 });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

// ── 유저 실제 잔액 조회 (로컬 + 게임사) ──
router.get('/users/balance', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.json({ success: false, error: '유저명 필요' });
  const users = await readUsers();
  const u = users.find(u => u.username === username);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  let localMoney = u.money || 0;
  let gameMoney = 0;
  const isHl = u.api && u.api.includes('honorlink');
  const isCs = u.api && u.api.includes('csapi');
  if (isHl) {
    try {
      const userInfo = await hl.get('/user', { username });
      gameMoney += Number(userInfo && userInfo.balance || 0);
    } catch(e) {}
  }
  if (isCs) {
    try {
      const csRes = await cs.post('/csapi/amount', { userid: username, amount: 0, type: '0' });
      gameMoney += Number(csRes && csRes.balance || 0);
    } catch(e) {}
  }
  res.json({ success: true, balance: localMoney + gameMoney, localMoney, gameMoney });
});

// ── 로컬 DB 잔액만 변경 (게임사 동기화용, 게임사 API 호출 안함) ──
router.post('/users/money-local', async (req, res) => {
  const { username, amount: rawAmount } = req.body;
  const amount = Number(rawAmount);
  if (!username || !amount || isNaN(amount)) return res.json({ success: false });
  const users = await readUsers();
  const u = users.find(u => u.username === username);
  if (!u) return res.json({ success: false });
  const before = u.money || 0;
  u.money = Math.max(0, before + amount);
  await writeUsers(users);
  res.json({ success: true, before, after: u.money });
});

// ══════════════════════════════════════
//  머니/포인트 로그 API (서버 파일 저장)
// ══════════════════════════════════════
const MONEY_LOG_TYPES = ['admin', 'partner', 'user', 'point', 'rolling-convert'];

router.get('/money-logs/:type', async (req, res) => {
  const type = req.params.type;
  if (!MONEY_LOG_TYPES.includes(type)) return res.json([]);
  try { res.json(await dal.readData('money_log_' + type + '.json')); }
  catch(e) { res.json([]); }
});

router.post('/money-logs/:type', async (req, res) => {
  const type = req.params.type;
  if (!MONEY_LOG_TYPES.includes(type)) return res.json({ success: false });
  let logs = [];
  try { logs = await dal.readData('money_log_' + type + '.json'); } catch(e) {}
  if (!Array.isArray(logs)) logs = [];
  logs.unshift(req.body);
  if (logs.length > 2000) logs = logs.slice(0, 2000);
  await dal.writeData('money_log_' + type + '.json', logs);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  충환전 API
// ══════════════════════════════════════
async function readTransfers()      { try { return await dal.readData('transfers.json'); } catch(e) { return []; } }
async function writeTransfers(data) { await dal.writeData('transfers.json', data); }

router.get('/transfers', async (req, res) => {
  let list = await readTransfers();
  if (req.query.type)   list = list.filter(t => t.type   === req.query.type);
  if (req.query.userId) list = list.filter(t => t.userId === req.query.userId);
  if (req.query.status) list = list.filter(t => t.status === req.query.status);
  res.json({ success: true, data: list });
});

router.post('/transfers', async (req, res) => {
  const list = await readTransfers();
  const item = { ...req.body, id: Date.now() + '' + Math.floor(Math.random() * 1000) };
  list.unshift(item);
  await writeTransfers(list);
  res.json({ success: true, data: item });
});

router.patch('/transfers/:id/approve', async (req, res) => {
  const list = await readTransfers();
  const item = list.find(t => t.id === req.params.id);
  if (!item) return res.json({ success: false, error: '항목 없음' });
  if (item.status !== 'pending') return res.json({ success: false, error: '이미 처리된 신청입니다.' });
  item.status = 'approved';
  item.processedAt = new Date().toISOString();
  const users = await readUsers();
  const user = users.find(u => u.username === item.userId);
  if (user) {
    if (item.type === 'deposit') {
      user.money = (user.money || 0) + Number(item.amount);
      await writeUsers(users);
    }
  }
  await writeTransfers(list);
  try {
    const csType = item.type === 'deposit' ? '1' : '2';
    await cs.post('/csapi/amount', { userid: item.userId, amount: Number(item.amount), type: csType });
  } catch(e) {}
  try {
    if (item.type === 'deposit') {
      await hl.post('/user/add-balance', { username: item.userId, amount: Number(item.amount) });
    } else {
      await hl.post('/user/sub-balance', { username: item.userId, amount: Number(item.amount) });
    }
  } catch(e) {}
  res.json({ success: true });
});

router.patch('/transfers/:id/reject', async (req, res) => {
  const list = await readTransfers();
  const item = list.find(t => t.id === req.params.id);
  if (!item) return res.json({ success: false, error: '항목 없음' });
  item.status = 'rejected';
  item.processedAt = new Date().toISOString();

  if (item.type === 'withdraw') {
    const users = await readUsers();
    const user = users.find(u => u.username === item.userId);
    if (user) {
      user.money = (user.money || 0) + Number(item.amount);
      await writeUsers(users);
    }
  }

  await writeTransfers(list);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  문의 API
// ══════════════════════════════════════
async function readInquiries()      { try { return await dal.readData('inquiries.json'); } catch(e) { return []; } }
async function writeInquiries(data) { await dal.writeData('inquiries.json', data); }

router.get('/inquiries', async (req, res) => {
  let list = await readInquiries();
  if (req.query.userId) list = list.filter(i => i.userId === req.query.userId);
  if (req.query.status) list = list.filter(i => i.status === req.query.status);
  res.json({ success: true, data: list });
});

router.post('/inquiries', async (req, res) => {
  const list = await readInquiries();
  const item = { ...req.body, id: Date.now() + '' + Math.floor(Math.random() * 1000) };
  list.unshift(item);
  await writeInquiries(list);
  res.json({ success: true, data: item });
});

router.patch('/inquiries/:id/reply', async (req, res) => {
  const list = await readInquiries();
  const item = list.find(i => i.id === req.params.id);
  if (!item) return res.json({ success: false, error: '항목 없음' });
  item.status     = 'done';
  item.answer     = req.body.answer;
  item.answeredAt = req.body.answeredAt;
  await writeInquiries(list);
  res.json({ success: true });
});

router.delete('/inquiries/:id', async (req, res) => {
  let list = await readInquiries();
  list = list.filter(i => i.id !== req.params.id);
  await writeInquiries(list);
  res.json({ success: true });
});

router.post('/inquiries/delete-batch', async (req, res) => {
  const ids = req.body.ids || [];
  let list = await readInquiries();
  list = list.filter(i => !ids.includes(i.id));
  await writeInquiries(list);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  고정답변 API
// ══════════════════════════════════════
async function readQuickReplies()      { try { return await dal.readData('quickreplies.json'); } catch(e) { return []; } }
async function writeQuickReplies(data) { await dal.writeData('quickreplies.json', data); }

router.get('/quickreplies', async (_req, res) => {
  res.json({ success: true, data: await readQuickReplies() });
});

router.post('/quickreplies', async (req, res) => {
  const list = await readQuickReplies();
  const item = {
    id: Date.now() + '' + Math.floor(Math.random() * 1000),
    title: req.body.title || '',
    content: req.body.content || '',
    createdAt: new Date().toISOString()
  };
  list.unshift(item);
  await writeQuickReplies(list);
  res.json({ success: true, data: item });
});

router.put('/quickreplies/:id', async (req, res) => {
  const list = await readQuickReplies();
  const item = list.find(i => i.id === req.params.id);
  if (!item) return res.json({ success: false, error: '항목 없음' });
  if (req.body.title   !== undefined) item.title   = req.body.title;
  if (req.body.content !== undefined) item.content = req.body.content;
  await writeQuickReplies(list);
  res.json({ success: true });
});

router.delete('/quickreplies/:id', async (req, res) => {
  let list = await readQuickReplies();
  list = list.filter(i => i.id !== req.params.id);
  await writeQuickReplies(list);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  이벤트 API
// ══════════════════════════════════════
async function readEvents()      { try { return await dal.readData('events.json'); } catch(e) { return []; } }
async function writeEvents(data) { await dal.writeData('events.json', data); }

router.get('/events', async (_req, res) => {
  res.json({ success: true, data: await readEvents() });
});

router.post('/events', async (req, res) => {
  const list = await readEvents();
  list.unshift(req.body);
  await writeEvents(list);
  res.json({ success: true });
});

router.put('/events/:id', async (req, res) => {
  const list = await readEvents();
  const idx  = list.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.json({ success: false, error: '항목 없음' });
  list[idx] = { ...list[idx], ...req.body };
  await writeEvents(list);
  res.json({ success: true });
});

router.delete('/events/:id', async (req, res) => {
  await writeEvents((await readEvents()).filter(e => e.id !== req.params.id));
  res.json({ success: true });
});

// ══════════════════════════════════════
//  추천코드 API
// ══════════════════════════════════════
async function readReferrals()      { try { return await dal.readData('referrals.json'); } catch(e) { return []; } }
async function writeReferrals(data) { await dal.writeData('referrals.json', data); }

router.get('/referrals', async (req, res) => {
  let list = await readReferrals();
  if (req.query.userId) list = list.filter(r => r.userId === req.query.userId);
  res.json({ success: true, data: list });
});

router.post('/referrals', async (req, res) => {
  const list = await readReferrals();
  const { userId, code } = req.body;
  if (!userId || !code) return res.json({ success: false, error: '유저ID와 코드를 입력하세요.' });
  if (list.find(r => r.code === code)) return res.json({ success: false, error: '이미 존재하는 코드입니다.' });
  const item = {
    id: Date.now() + '' + Math.floor(Math.random() * 1000),
    userId,
    code,
    usedCount: 0,
    usedBy: [],
    createdAt: new Date().toISOString()
  };
  list.push(item);
  await writeReferrals(list);
  res.json({ success: true, data: item });
});

router.delete('/referrals/:id', async (req, res) => {
  const list = (await readReferrals()).filter(r => r.id !== req.params.id);
  await writeReferrals(list);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  쪽지 API
// ══════════════════════════════════════
async function readMessages()      { try { return await dal.readData('messages.json'); } catch(e) { return []; } }
async function writeMessages(data) { await dal.writeData('messages.json', data); }

router.get('/messages', async (req, res) => {
  let list = await readMessages();
  if (req.query.userId) list = list.filter(m => m.userId === req.query.userId);
  res.json({ success: true, data: list });
});

router.post('/messages', async (req, res) => {
  const list = await readMessages();
  const { userId, title, content } = req.body;
  if (!userId || !title) return res.json({ success: false, error: '제목을 입력하세요.' });
  const item = {
    id: Date.now() + '' + Math.floor(Math.random() * 1000),
    userId,
    title,
    content: content || '',
    read: false,
    createdAt: new Date().toISOString()
  };
  list.unshift(item);
  await writeMessages(list);
  res.json({ success: true, data: item });
});

router.delete('/messages/:id', async (req, res) => {
  const list = (await readMessages()).filter(m => m.id !== req.params.id);
  await writeMessages(list);
  res.json({ success: true });
});

// ── 롤링 로그 조회 ──
router.get('/rolling/log', async (_req, res) => {
  try {
    const log = await dal.readData('rolling_log.json');
    res.json({ success: true, data: log });
  } catch(e) {
    res.json({ success: true, data: [] });
  }
});

// ── 공베팅 로그 조회 ──
router.get('/emptybet/log', async (req, res) => {
  try {
    let log = await dal.readData('emptybet_log.json');

    const startDate = req.query.start;
    const endDate = req.query.end;
    if (startDate || endDate) {
      log = log.filter(l => {
        if (!l.timestamp) return false;
        const d = new Date(l.timestamp);
        const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        if (startDate && ds < startDate) return false;
        if (endDate && ds > endDate) return false;
        return true;
      });
    }

    if (req.query.username) {
      const u = req.query.username.toLowerCase();
      log = log.filter(l => (l.username || '').toLowerCase().includes(u));
    }

    if (req.query.gameType && req.query.gameType !== 'all') {
      log = log.filter(l => l.gameType === req.query.gameType);
    }

    if (req.query.vendor) {
      const v = req.query.vendor.toLowerCase();
      log = log.filter(l => (l.vendor || '').toLowerCase().includes(v));
    }

    if (req.query.matchWin === 'true') {
      try {
        const txCollector = require('../lib/transactionCollector');
        const winResult = await txCollector.query({
          start: startDate ? startDate + ' 00:00:00' : undefined,
          end: endDate ? endDate + ' 23:59:59' : undefined,
          types: ['win'],
          perPage: 999999
        });
        const winByRound = {};
        (winResult.data || []).forEach(tx => {
          const round = (tx.details && tx.details.game && tx.details.game.round) || '';
          const uname = (tx.user && typeof tx.user === 'object') ? (tx.user.username || '') : (tx.username || tx.user || '');
          if (round && uname) {
            const key = uname + ':' + round;
            winByRound[key] = (winByRound[key] || 0) + Math.abs(tx.amount || 0);
          }
        });
        log.forEach(l => {
          const key = (l.username || '') + ':' + (l.roundId || '');
          l.actualWin = winByRound[key] || 0;
        });
      } catch(e) {}
    }

    log.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 50;
    const total = log.length;
    const paged = log.slice((page - 1) * perPage, page * perPage);

    res.json({ success: true, data: paged, total, page, perPage });
  } catch(e) {
    res.json({ success: true, data: [], total: 0, page: 1, perPage: 50 });
  }
});

// ── 공베팅 카운터 조회 ──
router.get('/emptybet/counter', async (_req, res) => {
  try {
    const counter = await dal.readData('emptybet_counter.json');
    res.json({ success: true, data: counter });
  } catch(e) {
    res.json({ success: true, data: {} });
  }
});

// ── 공베팅 모드 설정 (전역) ──
async function readSettings() { try { return await dal.adminSettings.readAll(); } catch(e) { return {}; } }
async function writeSettings(d) { await dal.adminSettings.writeAll(d); }

router.get('/emptybet/mode', async (_req, res) => {
  const s = await readSettings();
  res.json({ success: true, mode: s.emptyBetMode || 'rolling' });
});

router.post('/emptybet/mode', async (req, res) => {
  const mode = req.body && req.body.mode;
  if (mode !== 'rolling' && mode !== 'all') return res.json({ success: false, error: 'invalid mode' });
  const s = await readSettings();
  s.emptyBetMode = mode;
  await writeSettings(s);
  try {
    let log = await dal.readData('emptybet_log.json');
    log.forEach(e => { e.mode = mode; });
    await dal.writeData('emptybet_log.json', log);
  } catch(e) {}
  res.json({ success: true, mode: mode });
});

// ── 슬롯 게임사 목록 관리 ──
router.get('/slot-vendors', async (_req, res) => {
  const s = await readSettings();
  const defaults = ['pragmatic','habanero','cq9','jili','pg','pgsoft','booongo','netent','relax','nolimit','hacksaw','dreamtech','homeslot','playson','evoplay','dragoonsoft','fachai','jdb','avatarux','bigtimegaming','quickspin','redtiger','playngo','thunderkick','wazdan','spinomenal','yggdrasil','bgaming','gameart','greentube','novomatic','platipus','popok','redrake','rubyplay','amatic','bfgames','blueprint','booming','caletagaming','fantasma','kagaming','kalamba','mancala','merkur','octoplay','petersons','retrogames','revolver','netgame','playstar','fatpanda','yolted','1x2 gaming','7-mojos','smartsoft','microgaming plus slo'];
  res.json({ success: true, data: s.slotVendors || defaults });
});

router.post('/slot-vendors', async (req, res) => {
  const vendors = req.body && req.body.vendors;
  if (!Array.isArray(vendors)) return res.json({ success: false, error: '올바른 형식이 아닙니다.' });
  const s = await readSettings();
  s.slotVendors = vendors.map(v => v.trim().toLowerCase()).filter(Boolean);
  await writeSettings(s);
  res.json({ success: true, data: s.slotVendors });
});

// ══ 설정 및 조회 API ══

// 최대당첨금 알람 내역
router.get('/maxwin-logs', async (_req, res) => {
  let logs = [];
  try { logs = await dal.readData('maxwin_logs.json'); } catch(e) {}
  res.json({ success: true, data: logs });
});

// 통합 설정 GET/POST
router.get('/settings', async (_req, res) => {
  res.json({ success: true, data: await readSettings() });
});
router.post('/settings', async (req, res) => {
  const s = await readSettings();
  Object.assign(s, req.body);
  await writeSettings(s);
  res.json({ success: true });
});

// 화이트리스트 IP 관리
router.get('/whitelist-ips', async (_req, res) => {
  const s = await readSettings();
  res.json({ success: true, data: s.whitelistIps || [] });
});
router.post('/whitelist-ips', async (req, res) => {
  const s = await readSettings();
  if (!s.whitelistIps) s.whitelistIps = [];
  const { ip, memo } = req.body;
  if (!ip) return res.json({ success: false, error: 'IP를 입력하세요.' });
  if (s.whitelistIps.find(b => b.ip === ip)) return res.json({ success: false, error: '이미 등록된 IP입니다.' });
  s.whitelistIps.push({ ip, memo: memo || '', createdAt: new Date().toISOString() });
  await writeSettings(s);
  res.json({ success: true });
});
router.delete('/whitelist-ips/:ip', async (req, res) => {
  const s = await readSettings();
  s.whitelistIps = (s.whitelistIps || []).filter(b => b.ip !== req.params.ip);
  await writeSettings(s);
  res.json({ success: true });
});

// 차단 IP 관리
router.get('/blocked-ips', async (_req, res) => {
  const s = await readSettings();
  res.json({ success: true, data: s.blockedIps || [] });
});
router.post('/blocked-ips', async (req, res) => {
  const s = await readSettings();
  if (!s.blockedIps) s.blockedIps = [];
  const { ip, reason } = req.body;
  if (!ip) return res.json({ success: false, error: 'IP를 입력하세요.' });
  if (s.blockedIps.find(b => b.ip === ip)) return res.json({ success: false, error: '이미 차단된 IP입니다.' });
  s.blockedIps.push({ ip, reason: reason || '', createdAt: new Date().toISOString() });
  await writeSettings(s);
  res.json({ success: true });
});
router.delete('/blocked-ips/:ip', async (req, res) => {
  const s = await readSettings();
  s.blockedIps = (s.blockedIps || []).filter(b => b.ip !== req.params.ip);
  await writeSettings(s);
  res.json({ success: true });
});

// 유저 차단 IP 관리
router.get('/blocked-user-ips', async (_req, res) => {
  const s = await readSettings();
  res.json({ success: true, data: s.blockedUserIps || [] });
});
router.post('/blocked-user-ips', async (req, res) => {
  const s = await readSettings();
  if (!s.blockedUserIps) s.blockedUserIps = [];
  const { ip, reason } = req.body;
  if (!ip) return res.json({ success: false, error: 'IP를 입력하세요.' });
  if (s.blockedUserIps.find(b => b.ip === ip)) return res.json({ success: false, error: '이미 차단된 IP입니다.' });
  s.blockedUserIps.push({ ip, reason: reason || '', createdAt: new Date().toISOString() });
  await writeSettings(s);
  res.json({ success: true });
});
router.delete('/blocked-user-ips/:ip', async (req, res) => {
  const s = await readSettings();
  s.blockedUserIps = (s.blockedUserIps || []).filter(b => b.ip !== req.params.ip);
  await writeSettings(s);
  res.json({ success: true });
});

// 로그인 기록
router.get('/login-logs', async (_req, res) => {
  let logs = [];
  try { logs = await dal.readData('login_logs.json'); } catch(e) {}
  res.json({ success: true, data: logs });
});

// 도메인 목록 (수동 등록) - 아직 JSON 파일 유지
const domainsPath = path.join(__dirname, '..', 'data/collected_domains.json');
router.get('/domains', (_req, res) => {
  let domains = {};
  try { domains = JSON.parse(fs.readFileSync(domainsPath, 'utf8')); } catch(e) {}
  const list = Object.entries(domains).map(([domain, info]) => ({ domain, ...info }));
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json({ success: true, data: list });
});
router.post('/domains', (req, res) => {
  const domain = (req.body.domain || '').trim().toLowerCase();
  if (!domain) return res.json({ success: false, message: '도메인을 입력해주세요.' });
  let domains = {};
  try { domains = JSON.parse(fs.readFileSync(domainsPath, 'utf8')); } catch(e) {}
  if (domains[domain]) return res.json({ success: false, message: '이미 등록된 도메인입니다.' });
  domains[domain] = { createdAt: new Date().toISOString(), memo: req.body.memo || '' };
  fs.writeFileSync(domainsPath, JSON.stringify(domains, null, 2));
  res.json({ success: true });
});
router.put('/domains/:domain/memo', (req, res) => {
  let domains = {};
  try { domains = JSON.parse(fs.readFileSync(domainsPath, 'utf8')); } catch(e) {}
  const domain = decodeURIComponent(req.params.domain);
  if (domains[domain]) {
    domains[domain].memo = req.body.memo || '';
    fs.writeFileSync(domainsPath, JSON.stringify(domains, null, 2));
  }
  res.json({ success: true });
});
router.delete('/domains/:domain', (req, res) => {
  let domains = {};
  try { domains = JSON.parse(fs.readFileSync(domainsPath, 'utf8')); } catch(e) {}
  delete domains[decodeURIComponent(req.params.domain)];
  fs.writeFileSync(domainsPath, JSON.stringify(domains, null, 2));
  res.json({ success: true });
});

// 잠긴 계정 목록
router.get('/locked-accounts', (_req, res) => {
  const list = [];
  const now = Date.now();
  for (const [username, info] of Object.entries(loginFailMap)) {
    if (info.lockedUntil && info.lockedUntil > now) {
      list.push({ username, count: info.count, lockedAt: info.lockedAt, lockedUntil: new Date(info.lockedUntil).toISOString() });
    }
  }
  res.json({ success: true, data: list });
});
router.delete('/locked-accounts/:username', (req, res) => {
  const username = decodeURIComponent(req.params.username);
  delete loginFailMap[username];
  res.json({ success: true });
});

module.exports = router;
