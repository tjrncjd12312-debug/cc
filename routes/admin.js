const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const cs      = require('../lib/csapi');
const hl      = require('../lib/honorlink');
const { onlineMap, kickedSet, gameSessionMap } = require('./auth');
const txCollector = require('../lib/transactionCollector');

function readData(file) {
  const p = path.join(__dirname, '../data', file);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeData(file, data) {
  const p = path.join(__dirname, '../data', file);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

// ══════════════════════════════════════
//  관리자 세션 관리
// ══════════════════════════════════════
const adminSessions = new Map(); // token -> { createdAt }

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  let account;
  try { account = readData('admin_account.json'); } catch(e) {
    return res.json({ success: false, error: '계정 설정 오류' });
  }
  if (username === account.username && password === account.password) {
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, { createdAt: Date.now() });
    return res.json({ success: true, token });
  }
  res.json({ success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
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
router.use((req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token && adminSessions.has(token)) return next();
  res.status(401).json({ success: false, error: '인증이 필요합니다.' });
});

function readUsers()      { return readData('users.json'); }
function writeUsers(data) { writeData('users.json', data); }

// 공지사항
router.get('/notices',    (req, res) => res.json({ success: true, data: readData('notices.json') }));
router.post('/notices',   (req, res) => { writeData('notices.json', req.body); res.json({ success: true }); });

// 게임
router.get('/games',      (req, res) => res.json({ success: true, data: readData('games.json') }));
router.post('/games',     (req, res) => { writeData('games.json', req.body); res.json({ success: true }); });

// 파트너 트리 (서버 동기화)
router.get('/partner-tree', (_req, res) => {
  try { res.json({ success: true, data: readData('partnerTree.json') }); }
  catch(e) { res.json({ success: true, data: [] }); }
});
router.post('/partner-tree', (req, res) => { writeData('partnerTree.json', req.body); res.json({ success: true }); });

// 롤링 로그
router.get('/rolling-log', (_req, res) => {
  try { res.json({ success: true, data: readData('rolling_log.json') }); }
  catch(e) { res.json({ success: true, data: [] }); }
});

// 입출금
router.get('/deposits',          (_req, res) => res.json({ success: true, data: readData('deposits.json') }));
router.post('/deposits',         (req,  res) => { writeData('deposits.json', req.body); res.json({ success: true }); });
router.get('/deposits/pending',  (_req, res) => {
  const all = readData('deposits.json');
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

  const users = readUsers();
  const existing = users.find(u => u.username === username);

  let newUser;
  if (existing) {
    existing.password = password;
    if (nickname) existing.nickname = nickname;
    writeUsers(users);
    newUser = existing;
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
    writeUsers(users);
  }

  res.json({ success: true, user: newUser });
});

// ── 회원 목록 전체 ──
router.get('/users', (_req, res) => {
  res.json({ success: true, data: readUsers() });
});

// ── 회원별 베팅/당첨 집계 (날짜 필터) ──
router.get('/users/stats', (req, res) => {
  const startDate = req.query.start || '';
  const endDate = req.query.end || '';

  let allTx = [];
  try {
    const txResult = txCollector.query({ perPage: 100000 });
    allTx = txResult.data || [];
  } catch(e) {}

  // 날짜 필터 (KST 기준 — 트랜잭션 시간을 KST 날짜 문자열로 비교)
  if (startDate || endDate) {
    allTx = allTx.filter(tx => {
      const dt = tx.processed_at || tx.created_at || '';
      if (!dt) return false;
      // KST 날짜 추출
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
  const users = readUsers();
  const u = users.find(u => u.username === username);

  // 게임사 킥 + 잔액 전액 회수
  if (u && u.api && u.api.includes('honorlink')) {
    try { await hl.post('/user/kick', { username }); } catch(e) {}
    try { await hl.post('/user/sub-balance-all', { username }); } catch(e) {}
  }

  // 연동 해제 + 접속자 목록 제거 + 게임세션 제거 + 유저 로그아웃
  if (u) {
    u.api = [];
    writeUsers(users);
    delete onlineMap[u.id];
    delete gameSessionMap[username];
    kickedSet.add(u.id);
  }

  res.json({ success: true });
});

// ── 유저 API 연동 상태 확인 ──
router.get('/users/:id/api-status', async (req, res) => {
  const users = readUsers();
  const u = users.find(u => u.id === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });

  // users.json의 api 필드 기준으로만 판단
  const result = {
    csapi: u.api && u.api.includes('csapi'),
    honorlink: u.api && u.api.includes('honorlink')
  };

  res.json({ success: true, ...result, api: u.api || [] });
});

// ── 승인 대기 목록 ──
router.get('/users/pending', (_req, res) => {
  const list = readUsers().filter(u => u.status === 'pending');
  res.json({ success: true, data: list });
});

// ── 블랙리스트 (차단 + 삭제) ──
router.get('/users/blacklist', (_req, res) => {
  const list = readUsers().filter(u => u.status === 'blocked' || u.status === 'deleted');
  res.json({ success: true, data: list });
});

// ── 승인 ──
router.post('/users/:id/approve', async (req, res) => {
  const users = readUsers();
  const u = users.find(u => u.id === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  u.status = 'active';
  u.approvedAt = new Date().toISOString();
  if (!u.api) u.api = [];
  // 게임 API 연동은 게임 접속 시 자동 처리
  writeUsers(users);
  res.json({ success: true });
});

// ── API 연동 해제 (킥 + 잔액회수 + 연동 제거) ──
router.post('/users/:id/api-disconnect', async (req, res) => {
  const { provider } = req.body; // 'honorlink' or 'csapi'
  if (!provider) return res.json({ success: false, error: 'provider 필요' });
  const users = readUsers();
  const u = users.find(u => u.id === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });

  // 게임에서 강제 퇴장 + 잔액 전액 회수
  if (provider === 'honorlink') {
    try { await hl.post('/user/kick', { username: u.username }); } catch(e) {}
    try { await hl.post('/user/sub-balance-all', { username: u.username }); } catch(e) {}
  }
  if (provider === 'csapi') {
    try { await cs.post('/csapi/kick', { userid: u.username }); } catch(e) {}
  }

  if (u.api) u.api = u.api.filter(a => a !== provider);
  writeUsers(users);
  res.json({ success: true, api: u.api });
});

// ── 거절 (삭제) ──
router.post('/users/:id/reject', (req, res) => {
  const users = readUsers().filter(u => u.id !== req.params.id);
  writeUsers(users);
  res.json({ success: true });
});

// ── 차단 ──
router.post('/users/:id/block', async (req, res) => {
  const users = readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  u.status = 'blocked';
  writeUsers(users);
  try { await cs.post('/csapi/kick', { userid: u.username }); } catch(e) {}
  try { await hl.post('/user/sub-balance-all', { username: u.username }); } catch(e) {}
  res.json({ success: true });
});

// ── 삭제 (soft) ──
router.post('/users/:id/delete', async (req, res) => {
  const users = readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  u.status = 'deleted';
  writeUsers(users);
  try { await cs.post('/csapi/kick', { userid: u.username }); } catch(e) {}
  try { await hl.post('/user/sub-balance-all', { username: u.username }); } catch(e) {}
  res.json({ success: true });
});

// ── 블랙리스트 해제 ──
router.post('/users/:id/unblock', (req, res) => {
  const users = readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  u.status = 'active';
  writeUsers(users);
  res.json({ success: true });
});

// ── 회원 정보 수정 ──
router.post('/users/:id/update', (req, res) => {
  const users = readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  const allowed = ['nickname','phone','bank','account','holder','casino','slot','status','memo','grade','password','point','gameGroup'];
  allowed.forEach(k => { if (req.body[k] !== undefined) u[k] = req.body[k]; });
  writeUsers(users);
  res.json({ success: true });
});
router.patch('/users/:id/update', (req, res) => {
  const users = readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  const allowed = ['nickname','phone','bank','account','holder','casino','slot','status','memo','grade','password','point','gameGroup'];
  allowed.forEach(k => { if (req.body[k] !== undefined) u[k] = req.body[k]; });
  writeUsers(users);
  res.json({ success: true });
});

// ── gameGroup 일괄 변경 ──
router.post('/users/batch-group', (req, res) => {
  const { ids, gameGroup } = req.body;
  if (!Array.isArray(ids)) return res.json({ success: false, error: '잘못된 요청' });
  const users = readUsers();
  ids.forEach(id => {
    const u = users.find(u => u.id === id || u.username === id);
    if (u) u.gameGroup = gameGroup || '';
  });
  writeUsers(users);
  res.json({ success: true, count: ids.length });
});

// ── 개별 유저 지급 ──
router.post('/users/:id/give', async (req, res) => {
  const users = readUsers();
  const u = users.find(u => u.id === req.params.id || u.username === req.params.id);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return res.json({ success: false, error: '올바른 금액' });
  const before = u.money || 0;
  u.money = before + amount;
  writeUsers(users);
  res.json({ success: true, before, after: u.money });
});

// ── 개별 유저 회수 ──
router.post('/users/:id/take', async (req, res) => {
  const users = readUsers();
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
  writeUsers(users);
  res.json({ success: true, before, after: u.money });
});

// ── 관리자 머니 지급/회수 (username 기준) ──
router.post('/users/money', async (req, res) => {
  const { username, amount: rawAmount } = req.body;
  const amount = Number(rawAmount);
  if (!username) return res.json({ success: false, error: '유저명을 입력하세요.' });
  if (!amount || isNaN(amount)) return res.json({ success: false, error: '올바른 금액을 입력하세요.' });

  const users = readUsers();
  const u = users.find(u => u.username === username);
  let before = 0, after = 0;
  let hlResult = null;
  const isHl = u && u.api && u.api.includes('honorlink');

  if (isHl) {
    // 연동된 유저: 게임사에만 지급/회수 (로컬 money는 건드리지 않음)
    before = u.money || 0;
    after = before; // 로컬은 변경 없음
    try {
      if (amount > 0) {
        hlResult = await hl.post('/user/add-balance', { username, amount: amount });
      } else {
        hlResult = await hl.post('/user/sub-balance-all', { username });
      }
    } catch(e) { hlResult = { error: e.message }; }
  } else if (u) {
    // 미연동 유저: 로컬 money만 변경
    before = u.money || 0;
    u.money = Math.max(0, before + amount);
    after = u.money;
    writeUsers(users);
  }
  res.json({ success: true, before, after, hlResult });
});

// ── 게임 종료: 게임사 잔액 전액 회수 → 로컬 DB에 복원 ──
router.post('/users/withdraw-game', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ success: false, error: '유저명 필요' });

  try {
    // 1) 게임사 유저 잔액 조회
    const userInfo = await hl.get('/user', { username });
    const hlBalance = Number(userInfo && userInfo.balance || 0);
    if (hlBalance <= 0) return res.json({ success: true, recovered: 0 });

    // 2) 게임사에서 전액 회수
    await hl.post('/user/sub-balance-all', { username });

    // 3) 로컬 DB에 복원
    const users = readUsers();
    const u = users.find(u => u.username === username);
    if (u) {
      u.money = (u.money || 0) + hlBalance;
      writeUsers(users);
    }

    res.json({ success: true, recovered: hlBalance, localBalance: u ? u.money : 0 });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

// ── 유저 실제 잔액 조회 (로컬 + 게임사) ──
router.get('/users/balance', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.json({ success: false, error: '유저명 필요' });
  const users = readUsers();
  const u = users.find(u => u.username === username);
  if (!u) return res.json({ success: false, error: '유저 없음' });
  let localMoney = u.money || 0;
  let gameMoney = 0;
  const isHl = u.api && u.api.includes('honorlink');
  if (isHl) {
    try {
      const userInfo = await hl.get('/user', { username });
      gameMoney = Number(userInfo && userInfo.balance || 0);
    } catch(e) { /* 게임사 조회 실패 시 0 */ }
  }
  res.json({ success: true, balance: localMoney + gameMoney, localMoney, gameMoney });
});

// ── 로컬 DB 잔액만 변경 (게임사 동기화용, 게임사 API 호출 안함) ──
router.post('/users/money-local', (req, res) => {
  const { username, amount: rawAmount } = req.body;
  const amount = Number(rawAmount);
  if (!username || !amount || isNaN(amount)) return res.json({ success: false });
  const users = readUsers();
  const u = users.find(u => u.username === username);
  if (!u) return res.json({ success: false });
  const before = u.money || 0;
  u.money = Math.max(0, before + amount);
  writeUsers(users);
  res.json({ success: true, before, after: u.money });
});

// ══════════════════════════════════════
//  머니/포인트 로그 API (서버 파일 저장)
// ══════════════════════════════════════
const MONEY_LOG_TYPES = ['admin', 'partner', 'user', 'point'];

router.get('/money-logs/:type', (req, res) => {
  const type = req.params.type;
  if (!MONEY_LOG_TYPES.includes(type)) return res.json([]);
  try { res.json(readData(`money_log_${type}.json`)); }
  catch(e) { res.json([]); }
});

router.post('/money-logs/:type', (req, res) => {
  const type = req.params.type;
  if (!MONEY_LOG_TYPES.includes(type)) return res.json({ success: false });
  let logs = [];
  try { logs = readData(`money_log_${type}.json`); } catch(e) {}
  if (!Array.isArray(logs)) logs = [];
  logs.unshift(req.body);
  if (logs.length > 2000) logs = logs.slice(0, 2000);
  writeData(`money_log_${type}.json`, logs);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  충환전 API
// ══════════════════════════════════════
function readTransfers()      { try { return readData('transfers.json'); } catch(e) { return []; } }
function writeTransfers(data) { writeData('transfers.json', data); }

router.get('/transfers', (req, res) => {
  let list = readTransfers();
  if (req.query.type)   list = list.filter(t => t.type   === req.query.type);
  if (req.query.userId) list = list.filter(t => t.userId === req.query.userId);
  if (req.query.status) list = list.filter(t => t.status === req.query.status);
  res.json({ success: true, data: list });
});

router.post('/transfers', (req, res) => {
  const list = readTransfers();
  const item = { ...req.body, id: Date.now() + '' + Math.floor(Math.random() * 1000) };
  list.unshift(item);
  writeTransfers(list);
  res.json({ success: true, data: item });
});

router.patch('/transfers/:id/approve', async (req, res) => {
  const list = readTransfers();
  const item = list.find(t => t.id === req.params.id);
  if (!item) return res.json({ success: false, error: '항목 없음' });
  if (item.status !== 'pending') return res.json({ success: false, error: '이미 처리된 신청입니다.' });
  item.status = 'approved';
  item.processedAt = new Date().toISOString();
  // 우리 서버 잔액 변경
  const users = readUsers();
  const user = users.find(u => u.username === item.userId);
  if (user) {
    if (item.type === 'deposit')  user.money = (user.money || 0) + Number(item.amount);
    if (item.type === 'withdraw') user.money = (user.money || 0) - Number(item.amount);
    writeUsers(users);
  }
  writeTransfers(list);
  // 게임 API 머니 반영 (1=입금, 2=출금)
  try {
    const csType = item.type === 'deposit' ? '1' : '2';
    await cs.post('/csapi/amount', { userid: item.userId, amount: Number(item.amount), type: csType });
  } catch(e) {}
  // HonorLink 머니 반영
  try {
    if (item.type === 'deposit') {
      await hl.post('/user/add-balance', { username: item.userId, amount: Number(item.amount) });
    } else {
      await hl.post('/user/sub-balance', { username: item.userId, amount: Number(item.amount) });
    }
  } catch(e) {}
  res.json({ success: true });
});

router.patch('/transfers/:id/reject', (req, res) => {
  const list = readTransfers();
  const item = list.find(t => t.id === req.params.id);
  if (!item) return res.json({ success: false, error: '항목 없음' });
  item.status = 'rejected';
  item.processedAt = new Date().toISOString();
  writeTransfers(list);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  문의 API
// ══════════════════════════════════════
function readInquiries()      { try { return readData('inquiries.json'); } catch(e) { return []; } }
function writeInquiries(data) { writeData('inquiries.json', data); }

router.get('/inquiries', (req, res) => {
  let list = readInquiries();
  if (req.query.userId) list = list.filter(i => i.userId === req.query.userId);
  if (req.query.status) list = list.filter(i => i.status === req.query.status);
  res.json({ success: true, data: list });
});

router.post('/inquiries', (req, res) => {
  const list = readInquiries();
  const item = { ...req.body, id: Date.now() + '' + Math.floor(Math.random() * 1000) };
  list.unshift(item);
  writeInquiries(list);
  res.json({ success: true, data: item });
});

router.patch('/inquiries/:id/reply', (req, res) => {
  const list = readInquiries();
  const item = list.find(i => i.id === req.params.id);
  if (!item) return res.json({ success: false, error: '항목 없음' });
  item.status     = 'done';
  item.answer     = req.body.answer;
  item.answeredAt = req.body.answeredAt;
  writeInquiries(list);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  이벤트 API
// ══════════════════════════════════════
function readEvents()      { try { return readData('events.json'); } catch(e) { return []; } }
function writeEvents(data) { writeData('events.json', data); }

router.get('/events', (_req, res) => {
  res.json({ success: true, data: readEvents() });
});

router.post('/events', (req, res) => {
  const list = readEvents();
  list.unshift(req.body);
  writeEvents(list);
  res.json({ success: true });
});

router.put('/events/:id', (req, res) => {
  const list = readEvents();
  const idx  = list.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.json({ success: false, error: '항목 없음' });
  list[idx] = { ...list[idx], ...req.body };
  writeEvents(list);
  res.json({ success: true });
});

router.delete('/events/:id', (req, res) => {
  writeEvents(readEvents().filter(e => e.id !== req.params.id));
  res.json({ success: true });
});

// ══════════════════════════════════════
//  추천코드 API
// ══════════════════════════════════════
function readReferrals()      { try { return readData('referrals.json'); } catch(e) { return []; } }
function writeReferrals(data) { writeData('referrals.json', data); }

// 특정 유저의 추천코드 목록
router.get('/referrals', (req, res) => {
  let list = readReferrals();
  if (req.query.userId) list = list.filter(r => r.userId === req.query.userId);
  res.json({ success: true, data: list });
});

// 추천코드 추가
router.post('/referrals', (req, res) => {
  const list = readReferrals();
  const { userId, code } = req.body;
  if (!userId || !code) return res.json({ success: false, error: '유저ID와 코드를 입력하세요.' });
  // 중복 체크
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
  writeReferrals(list);
  res.json({ success: true, data: item });
});

// 추천코드 삭제
router.delete('/referrals/:id', (req, res) => {
  const list = readReferrals().filter(r => r.id !== req.params.id);
  writeReferrals(list);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  쪽지 API
// ══════════════════════════════════════
function readMessages()      { try { return readData('messages.json'); } catch(e) { return []; } }
function writeMessages(data) { writeData('messages.json', data); }

// 특정 유저의 쪽지 목록
router.get('/messages', (req, res) => {
  let list = readMessages();
  if (req.query.userId) list = list.filter(m => m.userId === req.query.userId);
  res.json({ success: true, data: list });
});

// 쪽지 보내기
router.post('/messages', (req, res) => {
  const list = readMessages();
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
  writeMessages(list);
  res.json({ success: true, data: item });
});

// 쪽지 삭제
router.delete('/messages/:id', (req, res) => {
  const list = readMessages().filter(m => m.id !== req.params.id);
  writeMessages(list);
  res.json({ success: true });
});

// ── 롤링 로그 조회 ──
router.get('/rolling/log', (_req, res) => {
  try {
    const log = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/rolling_log.json'), 'utf8'));
    res.json({ success: true, data: log });
  } catch(e) {
    res.json({ success: true, data: [] });
  }
});

// ── 공베팅 로그 조회 ──
router.get('/emptybet/log', (_req, res) => {
  try {
    const log = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/emptybet_log.json'), 'utf8'));
    res.json({ success: true, data: log });
  } catch(e) {
    res.json({ success: true, data: [] });
  }
});

// ── 공베팅 카운터 조회 ──
router.get('/emptybet/counter', (_req, res) => {
  try {
    const counter = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/emptybet_counter.json'), 'utf8'));
    res.json({ success: true, data: counter });
  } catch(e) {
    res.json({ success: true, data: {} });
  }
});

// ── 공베팅 모드 설정 (전역) ──
const SETTINGS_FILE = path.join(__dirname, '../data/admin_settings.json');
function readSettings() { try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch(e) { return {}; } }
function writeSettings(d) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(d, null, 2), 'utf8'); }

router.get('/emptybet/mode', (_req, res) => {
  const s = readSettings();
  res.json({ success: true, mode: s.emptyBetMode || 'rolling' });
});

router.post('/emptybet/mode', (req, res) => {
  const mode = req.body && req.body.mode;
  if (mode !== 'rolling' && mode !== 'all') return res.json({ success: false, error: 'invalid mode' });
  const s = readSettings();
  s.emptyBetMode = mode;
  writeSettings(s);
  // 기존 공베팅 로그도 모드 일괄 변경
  try {
    const ebPath = path.join(__dirname, '../data/emptybet_log.json');
    const log = JSON.parse(fs.readFileSync(ebPath, 'utf8'));
    log.forEach(e => { e.mode = mode; });
    fs.writeFileSync(ebPath, JSON.stringify(log), 'utf8');
  } catch(e) {}
  res.json({ success: true, mode: mode });
});

module.exports = router;
