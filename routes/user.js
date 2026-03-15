// ══════════════════════════════════════
//  유저 전용 API (인증 불필요)
//  고객센터, 충환전, 공지, 이벤트 등
// ══════════════════════════════════════
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

function readData(file) {
  const p = path.join(__dirname, '../data', file);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeData(file, data) {
  const p = path.join(__dirname, '../data', file);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

// ── 공지사항 (읽기 전용) ──
router.get('/notices', (_req, res) => {
  try { res.json({ success: true, data: readData('notices.json') }); }
  catch(e) { res.json({ success: true, data: [] }); }
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
  const item = { ...req.body, id: Date.now() + '' + Math.floor(Math.random() * 1000) };
  list.unshift(item);
  writeData('inquiries.json', list);
  res.json({ success: true, data: item });
});

// ── 내 문의 목록 ──
router.get('/inquiries', (req, res) => {
  let list = [];
  try { list = readData('inquiries.json'); } catch(e) {}
  if (req.query.userId) list = list.filter(i => i.userId === req.query.userId);
  if (req.query.status) list = list.filter(i => i.status === req.query.status);
  res.json({ success: true, data: list });
});

// ── 충환전 신청 ──
router.post('/transfers', (req, res) => {
  let list = [];
  try { list = readData('transfers.json'); } catch(e) {}
  const item = { ...req.body, id: Date.now() + '' + Math.floor(Math.random() * 1000) };
  list.unshift(item);
  writeData('transfers.json', list);
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
  res.json({ success: true, data: list });
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

module.exports = router;
