// ══════════════════════════════════════
//  유저 전용 API (인증 불필요)
//  고객센터, 충환전, 공지, 이벤트 등
// ══════════════════════════════════════
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const telegram = require('../lib/telegram');

function readData(file) {
  const p = path.join(__dirname, '../data', file);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeData(file, data) {
  const p = path.join(__dirname, '../data', file);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

// ── 롤링전환 로그 저장 ──
router.post('/rolling-convert-log', (req, res) => {
  let logs = [];
  try { logs = readData('money_log_rolling-convert.json'); } catch(e) {}
  if (!Array.isArray(logs)) logs = [];
  logs.unshift(req.body);
  if (logs.length > 5000) logs = logs.slice(0, 5000);
  writeData('money_log_rolling-convert.json', logs);
  res.json({ success: true });
});

// ── 공지사항 (읽기 전용, 도메인 필터링) ──
router.get('/notices', (req, res) => {
  try {
    const all = readData('notices.json');
    const host = (req.headers['host'] || '').replace(/:\d+$/, '').toLowerCase();
    const filtered = all.filter(n => {
      if (!n.domains || n.domains.length === 0) return true; // 전체
      return n.domains.indexOf(host) >= 0;
    });
    res.json({ success: true, data: filtered });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ── 이벤트 (읽기 전용) ──
router.get('/events', (_req, res) => {
  try { res.json({ success: true, data: readData('events.json') }); }
  catch(e) { res.json({ success: true, data: [] }); }
});

// ── 문의 등록 ──
router.post('/inquiries', (req, res) => {
  let list = [];
  try { list = readData('inquiries.json'); } catch(e) {}

  // 입금계좌요청 중복 방지: 같은 유저의 미답변 요청이 있으면 차단
  if (req.body.title === '입금계좌요청') {
    const pending = list.find(i => i.userId === req.body.userId && i.title === '입금계좌요청' && i.status === 'open');
    if (pending) return res.json({ success: false, error: 'duplicate' });
  }

  const item = { ...req.body, id: Date.now() + '' + Math.floor(Math.random() * 1000) };
  list.unshift(item);
  writeData('inquiries.json', list);

  // 텔레그램 알림
  telegram.send('inquiry', '📩 <b>고객문의 접수</b>\n회원: ' + (item.userId || '') + '\n제목: ' + (item.title || ''));

  res.json({ success: true, data: item });
});

// ── 내 문의 목록 ──
router.get('/inquiries', (req, res) => {
  let list = [];
  try { list = readData('inquiries.json'); } catch(e) {}
  if (req.query.userId) list = list.filter(i => i.userId === req.query.userId);
  if (req.query.status) list = list.filter(i => i.status === req.query.status);
  list = list.filter(i => !i.userDeleted);
  res.json({ success: true, data: list });
});

// ── 문의 전체삭제 (유저: 소프트삭제) ──
router.delete('/inquiries/delete-all', (req, res) => {
  let list = [];
  try { list = readData('inquiries.json'); } catch(e) {}
  const userId = req.query.userId;
  list.forEach(i => { if (i.userId === userId) i.userDeleted = true; });
  writeData('inquiries.json', list);
  res.json({ success: true });
});

// ── 문의 삭제 (유저: 소프트삭제) ──
router.delete('/inquiries/:id', (req, res) => {
  let list = [];
  try { list = readData('inquiries.json'); } catch(e) {}
  const item = list.find(i => i.id === req.params.id);
  if (item) { item.userDeleted = true; writeData('inquiries.json', list); }
  res.json({ success: true });
});

// ── 충환전 신청 ──
router.post('/transfers', (req, res) => {
  let list = [];
  try { list = readData('transfers.json'); } catch(e) {}
  const item = { ...req.body, id: Date.now() + '' + Math.floor(Math.random() * 1000) };
  const reqAmount = Number(item.amount) || 0;

  // 이체 한도 체크
  try {
    const settingsPath = require('path').join(__dirname, '../data/admin_settings.json');
    const settings = JSON.parse(require('fs').readFileSync(settingsPath, 'utf8'));
    const tl = settings.transferLimit || {};
    // 현재 시각 (HH:MM)
    const nowD = new Date();
    const nowHM = String(nowD.getHours()).padStart(2,'0') + ':' + String(nowD.getMinutes()).padStart(2,'0');

    if (item.type === 'deposit') {
      // 충전 시간 체크
      const dOpen = tl.depositOpen || '00:00';
      const dClose = tl.depositClose || '23:59';
      if (nowHM < dOpen || nowHM > dClose) return res.json({ success: false, error: '충전 가능 시간은 ' + dOpen + ' ~ ' + dClose + ' 입니다.' });

      // 충전텀 체크
      if (tl.depositTerm && tl.depositTerm > 0) {
        const lastDep = list.find(t => t.type === 'deposit' && t.userId === item.userId && t.status !== 'rejected');
        if (lastDep && lastDep.datetime) {
          const diff = (Date.now() - new Date(lastDep.datetime).getTime()) / 60000;
          if (diff < tl.depositTerm) return res.json({ success: false, error: '충전은 ' + tl.depositTerm + '분 간격으로 가능합니다. (' + Math.ceil(tl.depositTerm - diff) + '분 후 가능)' });
        }
      }

      if (tl.depositMin && reqAmount < tl.depositMin) return res.json({ success: false, error: '최소 충전금액은 ' + Number(tl.depositMin).toLocaleString() + '원입니다.' });
      if (tl.depositMax && reqAmount > tl.depositMax) return res.json({ success: false, error: '최대 충전금액은 ' + Number(tl.depositMax).toLocaleString() + '원입니다.' });
      if (tl.depositDailyLimit) {
        const today = new Date().toISOString().slice(0, 10);
        const todayTotal = list.filter(t => t.type === 'deposit' && t.userId === item.userId && (t.datetime || '').slice(0, 10) === today && t.status !== 'rejected').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        if (todayTotal + reqAmount > tl.depositDailyLimit) return res.json({ success: false, error: '1일 충전 한도(' + Number(tl.depositDailyLimit).toLocaleString() + '원)를 초과합니다.' });
      }
    } else if (item.type === 'withdraw') {
      // 환전 시간 체크
      const wOpen = tl.withdrawOpen || '00:00';
      const wClose = tl.withdrawClose || '23:59';
      if (nowHM < wOpen || nowHM > wClose) return res.json({ success: false, error: '환전 가능 시간은 ' + wOpen + ' ~ ' + wClose + ' 입니다.' });

      // 환전텀 체크
      if (tl.withdrawTerm && tl.withdrawTerm > 0) {
        const lastWit = list.find(t => t.type === 'withdraw' && t.userId === item.userId && t.status !== 'rejected');
        if (lastWit && lastWit.datetime) {
          const diff = (Date.now() - new Date(lastWit.datetime).getTime()) / 60000;
          if (diff < tl.withdrawTerm) return res.json({ success: false, error: '환전은 ' + tl.withdrawTerm + '분 간격으로 가능합니다. (' + Math.ceil(tl.withdrawTerm - diff) + '분 후 가능)' });
        }
      }

      if (tl.withdrawMin && reqAmount < tl.withdrawMin) return res.json({ success: false, error: '최소 환전금액은 ' + Number(tl.withdrawMin).toLocaleString() + '원입니다.' });
      if (tl.withdrawMax && reqAmount > tl.withdrawMax) return res.json({ success: false, error: '최대 환전금액은 ' + Number(tl.withdrawMax).toLocaleString() + '원입니다.' });
      if (tl.withdrawDailyLimit) {
        const today = new Date().toISOString().slice(0, 10);
        const todayTotal = list.filter(t => t.type === 'withdraw' && t.userId === item.userId && (t.datetime || '').slice(0, 10) === today && t.status !== 'rejected').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        if (todayTotal + reqAmount > tl.withdrawDailyLimit) return res.json({ success: false, error: '1일 환전 한도(' + Number(tl.withdrawDailyLimit).toLocaleString() + '원)를 초과합니다.' });
      }
    }
  } catch(e) {}

  // 환전 신청 시 즉시 보유머니 차감
  if (item.type === 'withdraw' && item.userId) {
    let users = [];
    try { users = readData('users.json'); } catch(e) {}
    const u = users.find(u => u.username === item.userId);
    if (u) {
      const amt = Number(item.amount) || 0;
      if ((u.money || 0) < amt) {
        return res.json({ success: false, error: '보유 금액이 부족합니다.' });
      }
      u.money = (u.money || 0) - amt;
      writeData('users.json', users);
    }
  }

  list.unshift(item);
  writeData('transfers.json', list);

  // 텔레그램 알림
  const tgType = item.type === 'deposit' ? 'deposit' : 'withdraw';
  const tgLabel = item.type === 'deposit' ? '충전' : '환전';
  const amt = Number(item.amount || 0).toLocaleString();
  telegram.send(tgType, '📢 <b>' + tgLabel + ' 신청</b>\n회원: ' + (item.userId || '') + '\n금액: ' + amt + '원\n시간: ' + (item.datetime || ''));

  res.json({ success: true, data: item });
});

// ── 내 충환전 목록 ──
router.get('/transfers', (req, res) => {
  let list = [];
  try { list = readData('transfers.json'); } catch(e) {}
  if (req.query.userId) list = list.filter(t => t.userId === req.query.userId);
  if (req.query.type)   list = list.filter(t => t.type   === req.query.type);
  if (req.query.status) list = list.filter(t => t.status === req.query.status);
  res.json({ success: true, data: list });
});

// ── 쪽지 목록 (읽기 전용) ──
router.get('/messages', (req, res) => {
  let list = [];
  try { list = readData('messages.json'); } catch(e) {}
  if (req.query.userId) list = list.filter(m => m.userId === req.query.userId);
  list = list.filter(m => !m.userDeleted);
  res.json({ success: true, data: list });
});

// ── 쪽지 읽음 처리 ──
router.patch('/messages/:id/read', (req, res) => {
  let list = [];
  try { list = readData('messages.json'); } catch(e) {}
  const item = list.find(m => m.id === req.params.id);
  if (item) { item.read = true; writeData('messages.json', list); }
  res.json({ success: true });
});

// ── 쪽지 전체읽기 ──
router.patch('/messages/read-all', (req, res) => {
  let list = [];
  try { list = readData('messages.json'); } catch(e) {}
  const userId = req.body.userId;
  list.forEach(m => { if (m.userId === userId) m.read = true; });
  writeData('messages.json', list);
  res.json({ success: true });
});

// ── 쪽지 전체삭제 (유저: 소프트삭제) ──
router.delete('/messages/delete-all', (req, res) => {
  let list = [];
  try { list = readData('messages.json'); } catch(e) {}
  const userId = req.query.userId;
  list.forEach(m => { if (m.userId === userId) m.userDeleted = true; });
  writeData('messages.json', list);
  res.json({ success: true });
});

// ── 쪽지 삭제 (유저: 소프트삭제) ──
router.delete('/messages/:id', (req, res) => {
  let list = [];
  try { list = readData('messages.json'); } catch(e) {}
  const item = list.find(m => m.id === req.params.id);
  if (item) { item.userDeleted = true; writeData('messages.json', list); }
  res.json({ success: true });
});

// ── 로컬 머니 변경 (게임 종료 시 잔액 복원용) ──
router.post('/users/money-local', (req, res) => {
  const { username, amount: rawAmount } = req.body;
  const amount = Number(rawAmount);
  if (!username || !amount || isNaN(amount)) return res.json({ success: false });
  let users = [];
  try { users = readData('users.json'); } catch(e) { return res.json({ success: false }); }
  const u = users.find(u => u.username === username);
  if (!u) return res.json({ success: false });
  const before = u.money || 0;
  u.money = Math.max(0, before + amount);
  writeData('users.json', users);
  res.json({ success: true, before, after: u.money });
});

// ── 공개 설정 (한줄공지, 자동로그아웃) ──
router.get('/public-settings', (_req, res) => {
  try {
    const settingsPath = require('path').join(__dirname, '../data/admin_settings.json');
    const s = JSON.parse(require('fs').readFileSync(settingsPath, 'utf8'));
    res.json({
      success: true,
      noticeLine: s.noticeLine || '',
      noticeLineEnabled: s.noticeLineEnabled !== false,
      autoLogout: s.autoLogout || 60
    });
  } catch(e) {
    res.json({ success: true, noticeLine: '', noticeLineEnabled: false, autoLogout: 60 });
  }
});

// ── 최근 충전 승인 확인 (유저별) ──
router.get('/last-approved-deposit', (req, res) => {
  const { username, since } = req.query;
  if (!username) return res.json({ success: false });
  try {
    const transfers = readData('transfers.json');
    const found = transfers.find(function(t) {
      return t.userId === username && t.type === 'deposit' && t.status === 'approved'
        && t.processedAt && t.processedAt > (since || '');
    });
    if (found) {
      res.json({ success: true, approved: true, amount: Number(found.amount), processedAt: found.processedAt });
    } else {
      res.json({ success: true, approved: false });
    }
  } catch(e) { res.json({ success: false }); }
});

module.exports = router;
