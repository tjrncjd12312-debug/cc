const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const bcrypt  = require('bcrypt');
const dal     = require('../lib/dal');
const txCollector = require('../lib/transactionCollector');

// ══════════════════════════════════════
//  파트너 세션 관리
// ══════════════════════════════════════
const partnerSessions = new Map(); // token -> { partnerId, level, createdAt }

// 파트너 트리에서 노드 찾기
function findNodeInTree(nodes, id) {
  for (const n of (nodes || [])) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeInTree(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

// 하위 파트너/회원 ID 수집
function collectDescendantIds(node, ids) {
  ids = ids || [];
  if (node.children) {
    node.children.forEach(function(c) {
      ids.push(c.id);
      collectDescendantIds(c, ids);
    });
  }
  return ids;
}

// 하위 회원 ID만 수집
function collectMemberIds(node) {
  var ids = [];
  (function walk(n) {
    if (n.children) n.children.forEach(function(c) {
      if (c.level === 'member') ids.push(c.id);
      walk(c);
    });
  })(node);
  return ids;
}

// 하위 파트너 ID만 수집 (member 제외)
function collectPartnerIds(node) {
  var ids = [];
  (function walk(n) {
    if (n.children) n.children.forEach(function(c) {
      if (c.level !== 'member') ids.push(c.id);
      walk(c);
    });
  })(node);
  return ids;
}

// ══════════════════════════════════════
//  로그인
// ══════════════════════════════════════
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: '아이디와 비밀번호를 입력하세요.' });

  let tree;
  try { tree = await dal.readData('partnerTree.json'); } catch(e) {
    return res.json({ success: false, error: '파트너 데이터 오류' });
  }

  const node = findNodeInTree(tree, username);
  if (!node) return res.json({ success: false, error: '존재하지 않는 파트너입니다.' });
  if (node.level === 'admin' || node.level === 'member') return res.json({ success: false, error: '파트너 계정이 아닙니다.' });
  const pwMatch = await bcrypt.compare(password, node.password || '');
  if (!pwMatch) return res.json({ success: false, error: '비밀번호가 일치하지 않습니다.' });
  if (node.status === 'blocked' || node.status === '정지') return res.json({ success: false, error: '정지된 계정입니다.' });

  const token = crypto.randomBytes(32).toString('hex');
  partnerSessions.set(token, { partnerId: node.id, level: node.level, createdAt: Date.now() });

  res.json({ success: true, token, partnerId: node.id, level: node.level, label: node.label });
});

router.post('/logout', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  partnerSessions.delete(token);
  res.json({ success: true });
});

router.get('/check-session', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token && partnerSessions.has(token)) {
    const sess = partnerSessions.get(token);
    return res.json({ success: true, partnerId: sess.partnerId, level: sess.level });
  }
  res.json({ success: false });
});

// 인증 미들웨어
router.use((req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token && partnerSessions.has(token)) {
    req.partnerSession = partnerSessions.get(token);
    return next();
  }
  res.status(401).json({ success: false, error: '인증이 필요합니다.' });
});

// ══════════════════════════════════════
//  내 정보
// ══════════════════════════════════════
router.get('/me', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: false, error: '파트너 정보 없음' });

  res.json({
    success: true,
    data: {
      id: node.id,
      label: node.label,
      level: node.level,
      money: node.money || 0,
      point: node.point || 0,
      rollingPoint: node.rollingPoint || 0,
      rollCasino: node.rollCasino || '0',
      rollSlot: node.rollSlot || '0',
      phone: node.phone || '',
      bank: node.bank || '',
      account: node.account || '',
      holder: node.holder || '',
      status: node.status || '정상',
      registeredAt: node.registeredAt || ''
    }
  });
});

// 비밀번호 변경
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: false, error: '파트너 정보 없음' });
  const cpMatch = await bcrypt.compare(currentPassword, node.password || '');
  if (!cpMatch) return res.json({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' });
  if (!newPassword || newPassword.length < 4) return res.json({ success: false, error: '새 비밀번호는 4자 이상이어야 합니다.' });
  node.password = await bcrypt.hash(newPassword, 10);
  await dal.writeData('partnerTree.json', tree);
  res.json({ success: true });
});

// ══════════════════════════════════════
//  하위 트리 조회
// ══════════════════════════════════════
router.get('/tree', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: true, data: [] });

  // 자신을 루트로 하는 서브트리 반환 (비밀번호 제거)
  function sanitize(n) {
    const copy = Object.assign({}, n);
    delete copy.password;
    if (copy.children) copy.children = copy.children.map(sanitize);
    return copy;
  }
  res.json({ success: true, data: [sanitize(node)] });
});

// ══════════════════════════════════════
//  하위 회원 목록
// ══════════════════════════════════════
router.get('/users', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: true, data: [] });

  const memberIds = collectMemberIds(node);
  const users = await dal.readData('users.json');
  const filtered = users.filter(u => memberIds.includes(u.username) || memberIds.includes(u.id));

  res.json({ success: true, data: filtered });
});

// ══════════════════════════════════════
//  하위 회원 머니 지급/차감
// ══════════════════════════════════════
router.post('/users/:id/give', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: false, error: '파트너 정보 없음' });

  const memberIds = collectMemberIds(node);
  const users = await dal.readData('users.json');
  const u = users.find(u => (u.id === req.params.id || u.username === req.params.id) && (memberIds.includes(u.username) || memberIds.includes(u.id)));
  if (!u) return res.json({ success: false, error: '권한이 없거나 유저가 없습니다.' });

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return res.json({ success: false, error: '올바른 금액을 입력하세요.' });

  // 파트너 머니에서 차감
  if ((node.money || 0) < amount) return res.json({ success: false, error: '보유 머니가 부족합니다.' });

  const beforePartner = node.money || 0;
  const beforeUser = u.money || 0;
  node.money = beforePartner - amount;
  u.money = beforeUser + amount;

  await dal.writeData('partnerTree.json', tree);
  await dal.writeData('users.json', users);

  // 머니 로그 기록
  try {
    let logs = [];
    try { logs = await dal.readData('money_log_partner.json'); } catch(e) {}
    logs.unshift({
      type: 'give',
      from: node.id,
      fromLevel: node.level,
      to: u.username,
      amount: amount,
      beforePartner: beforePartner,
      afterPartner: node.money,
      beforeUser: beforeUser,
      afterUser: u.money,
      datetime: new Date().toISOString(),
      memo: req.body.memo || ''
    });
    if (logs.length > 2000) logs = logs.slice(0, 2000);
    await dal.writeData('money_log_partner.json', logs);
  } catch(e) {}

  res.json({ success: true, partnerMoney: node.money, userMoney: u.money });
});

router.post('/users/:id/take', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: false, error: '파트너 정보 없음' });

  const memberIds = collectMemberIds(node);
  const users = await dal.readData('users.json');
  const u = users.find(u => (u.id === req.params.id || u.username === req.params.id) && (memberIds.includes(u.username) || memberIds.includes(u.id)));
  if (!u) return res.json({ success: false, error: '권한이 없거나 유저가 없습니다.' });

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return res.json({ success: false, error: '올바른 금액을 입력하세요.' });
  if ((u.money || 0) < amount) return res.json({ success: false, error: '유저 보유 머니가 부족합니다.' });

  const beforePartner = node.money || 0;
  const beforeUser = u.money || 0;
  node.money = beforePartner + amount;
  u.money = beforeUser - amount;

  await dal.writeData('partnerTree.json', tree);
  await dal.writeData('users.json', users);

  // 머니 로그 기록
  try {
    let logs = [];
    try { logs = await dal.readData('money_log_partner.json'); } catch(e) {}
    logs.unshift({
      type: 'take',
      from: node.id,
      fromLevel: node.level,
      to: u.username,
      amount: amount,
      beforePartner: beforePartner,
      afterPartner: node.money,
      beforeUser: beforeUser,
      afterUser: u.money,
      datetime: new Date().toISOString(),
      memo: req.body.memo || ''
    });
    if (logs.length > 2000) logs = logs.slice(0, 2000);
    await dal.writeData('money_log_partner.json', logs);
  } catch(e) {}

  res.json({ success: true, partnerMoney: node.money, userMoney: u.money });
});

// ══════════════════════════════════════
//  하위 회원 베팅 통계
// ══════════════════════════════════════
router.get('/users/stats', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: true, data: {} });

  const memberIds = collectMemberIds(node);
  const startDate = req.query.start || '';
  const endDate = req.query.end || '';

  let allTx = [];
  try {
    const txResult = await txCollector.query({ perPage: 100000 });
    allTx = txResult.data || [];
  } catch(e) {}

  // 날짜 필터
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

  // 하위 회원만 필터
  const stats = {};
  allTx.forEach(tx => {
    const username = tx.user && tx.user.username;
    if (!username || !memberIds.includes(username)) return;
    if (!stats[username]) stats[username] = { bet: 0, win: 0 };
    if (tx.type === 'bet') stats[username].bet += Math.abs(tx.amount || 0);
    else if (tx.type === 'win') stats[username].win += Math.abs(tx.amount || 0);
  });

  res.json({ success: true, data: stats });
});

// ══════════════════════════════════════
//  하위 회원 충환전 내역
// ══════════════════════════════════════
router.get('/transfers', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: true, data: [] });

  const memberIds = collectMemberIds(node);
  let list = [];
  try { list = await dal.readData('transfers.json'); } catch(e) {}
  list = list.filter(t => memberIds.includes(t.userId));
  if (req.query.type) list = list.filter(t => t.type === req.query.type);
  if (req.query.status) list = list.filter(t => t.status === req.query.status);

  res.json({ success: true, data: list });
});

// ══════════════════════════════════════
//  하위 회원 베팅 내역
// ══════════════════════════════════════
router.get('/betting', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: true, data: [], total: 0 });

  const memberIds = collectMemberIds(node);
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 50;
  const startDate = req.query.start || '';
  const endDate = req.query.end || '';
  const gameType = req.query.gameType || '';
  const username = req.query.username || '';

  let allTx = [];
  try {
    const txResult = await txCollector.query({ perPage: 100000 });
    allTx = txResult.data || [];
  } catch(e) {}

  // 하위 회원만
  allTx = allTx.filter(tx => {
    const uname = (tx.user && tx.user.username) || tx.username || '';
    return memberIds.includes(uname);
  });

  // 날짜 필터
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

  // 유저 필터
  if (username) {
    allTx = allTx.filter(tx => {
      const uname = (tx.user && tx.user.username) || tx.username || '';
      return uname.toLowerCase().includes(username.toLowerCase());
    });
  }

  // 게임타입 필터
  if (gameType && gameType !== 'all') {
    allTx = allTx.filter(tx => tx.type === gameType);
  }

  const total = allTx.length;
  const paged = allTx.slice((page - 1) * perPage, page * perPage);

  res.json({ success: true, data: paged, total, page, perPage });
});

// ══════════════════════════════════════
//  머니 로그 (파트너 관련만)
// ══════════════════════════════════════
router.get('/money-logs', async (req, res) => {
  const partnerId = req.partnerSession.partnerId;
  let logs = [];
  try { logs = await dal.readData('money_log_partner.json'); } catch(e) {}
  // 자신이 지급/차감한 것만
  logs = logs.filter(l => l.from === partnerId);
  res.json({ success: true, data: logs });
});

// ══════════════════════════════════════
//  정산 (하위 회원 베팅 기반)
// ══════════════════════════════════════
router.get('/settlement', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: true, data: [] });

  const memberIds = collectMemberIds(node);
  const startDate = req.query.start || '';
  const endDate = req.query.end || '';

  let allTx = [];
  try {
    const txResult = await txCollector.query({ perPage: 100000 });
    allTx = txResult.data || [];
  } catch(e) {}

  // 하위 회원만
  allTx = allTx.filter(tx => {
    const uname = (tx.user && tx.user.username) || tx.username || '';
    return memberIds.includes(uname);
  });

  // 날짜 필터
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

  // 일자별 집계
  const daily = {};
  allTx.forEach(tx => {
    const dt = tx.processed_at || tx.created_at || '';
    if (!dt) return;
    const txMs = new Date(dt).getTime();
    const kstDate = new Date(txMs + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (!daily[kstDate]) daily[kstDate] = { date: kstDate, bet: 0, win: 0, count: 0 };
    if (tx.type === 'bet') { daily[kstDate].bet += Math.abs(tx.amount || 0); daily[kstDate].count++; }
    else if (tx.type === 'win') daily[kstDate].win += Math.abs(tx.amount || 0);
  });

  const result = Object.values(daily).sort((a, b) => b.date.localeCompare(a.date));
  res.json({ success: true, data: result });
});

// ══════════════════════════════════════
//  롤링 내역
// ══════════════════════════════════════
router.get('/rolling-log', async (req, res) => {
  const tree = await dal.readData('partnerTree.json');
  const node = findNodeInTree(tree, req.partnerSession.partnerId);
  if (!node) return res.json({ success: true, data: [] });

  const memberIds = collectMemberIds(node);
  let logs = [];
  try { logs = await dal.readData('rolling_log.json'); } catch(e) {}
  logs = logs.filter(l => memberIds.includes(l.username));
  res.json({ success: true, data: logs });
});

// ══════════════════════════════════════
//  공지사항 (읽기 전용)
// ══════════════════════════════════════
router.get('/notices', async (_req, res) => {
  try { res.json({ success: true, data: await dal.readData('notices.json') }); }
  catch(e) { res.json({ success: true, data: [] }); }
});

module.exports = router;
