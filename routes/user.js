// ══════════════════════════════════════
//  유저 전용 API (인증 불필요)
//  고객센터, 충환전, 공지, 이벤트 등
// ══════════════════════════════════════
const express = require('express');
const router  = express.Router();

const dal      = require('../lib/dal');
const telegram = require('../lib/telegram');

// ── 롤링전환 로그 저장 ──
router.post('/rolling-convert-log', async (req, res) => {
  let logs = [];
  try { logs = await dal.readData('money_log_rolling-convert.json'); } catch(e) {}
  if (!Array.isArray(logs)) logs = [];
  logs.unshift(req.body);
  if (logs.length > 5000) logs = logs.slice(0, 5000);
  await dal.writeData('money_log_rolling-convert.json', logs);
  res.json({ success: true });
});

// ── 공지사항 (읽기 전용, 도메인 필터링) ──
router.get('/notices', async (req, res) => {
  try {
    const all = await dal.readData('notices.json');
    const host = (req.headers['host'] || '').replace(/:\d+$/, '').toLowerCase();
    const filtered = all.filter(n => {
      if (!n.domains || n.domains.length === 0) return true; // 전체
      return n.domains.indexOf(host) >= 0;
    });
    res.json({ success: true, data: filtered });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ── 이벤트 (읽기 전용) ──
router.get('/events', async (_req, res) => {
  try { res.json({ success: true, data: await dal.readData('events.json') }); }
  catch(e) { res.json({ success: true, data: [] }); }
});

// ── 문의 등록 ──
router.post('/inquiries', async (req, res) => {
  let list = [];
  try { list = await dal.readData('inquiries.json'); } catch(e) {}

  // 입금계좌요청 중복 방지: 같은 유저의 미답변 요청이 있으면 차단
  if (req.body.title === '입금계좌요청') {
    const pending = list.find(i => i.userId === req.body.userId && i.title === '입금계좌요청' && i.status === 'open');
    if (pending) return res.json({ success: false, error: 'duplicate' });
  }

  // 허용된 필드만 추출
  const { title, content, userId } = req.body;
  if (!userId || typeof userId !== 'string') return res.json({ success: false, error: '잘못된 요청입니다.' });
  if (!title || typeof title !== 'string' || title.length > 200) return res.json({ success: false, error: '제목을 입력해주세요.' });
  if (content && typeof content === 'string' && content.length > 5000) return res.json({ success: false, error: '내용이 너무 깁니다.' });
  const item = { title, content: content || '', userId, status: 'open', datetime: new Date().toISOString(), id: Date.now().toString(36) + Math.random().toString(36).slice(2) };
  list.unshift(item);
  await dal.writeData('inquiries.json', list);

  // 텔레그램 알림
  telegram.send('inquiry', '📩 <b>고객문의 접수</b>\n회원: ' + (item.userId || '') + '\n제목: ' + (item.title || ''));

  res.json({ success: true, data: item });
});

// ── 내 문의 목록 ──
router.get('/inquiries', async (req, res) => {
  let list = [];
  try { list = await dal.readData('inquiries.json'); } catch(e) {}
  if (req.query.userId) list = list.filter(i => i.userId === req.query.userId);
  if (req.query.status) list = list.filter(i => i.status === req.query.status);
  list = list.filter(i => !i.userDeleted);
  res.json({ success: true, data: list });
});

// ── 문의 전체삭제 (유저: 소프트삭제) ──
router.delete('/inquiries/delete-all', async (req, res) => {
  let list = [];
  try { list = await dal.readData('inquiries.json'); } catch(e) {}
  const userId = req.query.userId;
  list.forEach(i => { if (i.userId === userId) i.userDeleted = true; });
  await dal.writeData('inquiries.json', list);
  res.json({ success: true });
});

// ── 문의 삭제 (유저: 소프트삭제) ──
router.delete('/inquiries/:id', async (req, res) => {
  let list = [];
  try { list = await dal.readData('inquiries.json'); } catch(e) {}
  const item = list.find(i => String(i.id) === String(req.params.id));
  if (item) { item.userDeleted = true; await dal.writeData('inquiries.json', list); }
  res.json({ success: true });
});

// ── 충환전 신청 ──
router.post('/transfers', async (req, res) => {
  // 입력값 검증
  const { type, amount, userId, datetime, bank, account, holder, nick, bonus } = req.body;
  if (!type || !['deposit', 'withdraw'].includes(type)) return res.json({ success: false, error: '잘못된 요청입니다.' });
  const reqAmount = Number(amount) || 0;
  if (reqAmount <= 0 || !Number.isFinite(reqAmount)) return res.json({ success: false, error: '올바른 금액을 입력해주세요.' });
  if (!userId || typeof userId !== 'string') return res.json({ success: false, error: '잘못된 요청입니다.' });

  let list = [];
  try { list = await dal.readData('transfers.json'); } catch(e) {}
  // 허용된 필드만 추출 (임의 필드 주입 차단)
  const item = { type, amount: reqAmount, userId, nick: nick || '', bank: bank || '', account: account || '', holder: holder || '', bonus: bonus || '', datetime: datetime || new Date().toISOString(), status: 'pending', id: Date.now().toString(36) + Math.random().toString(36).slice(2) };

  // 이체 한도 체크
  try {
    const settings = await dal.readData('admin_settings.json');
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
  } catch(e) { console.error('[Transfer] 한도체크 오류:', e.message); }

  // 환전 신청 시 즉시 보유머니 차감 (atomic)
  if (item.type === 'withdraw' && item.userId) {
    const currentMoney = await dal.users.getMoney(item.userId);
    if (currentMoney < reqAmount) {
      return res.json({ success: false, error: '보유 금액이 부족합니다.' });
    }
    await dal.users.addMoney(item.userId, -reqAmount);
  }

  try {
    list.unshift(item);
    await dal.writeData('transfers.json', list);
  } catch(e) {
    console.error('[Transfer] 저장 오류:', e.message);
    return res.json({ success: false, error: '처리 중 오류가 발생했습니다.' });
  }

  // 텔레그램 알림
  const tgType = item.type === 'deposit' ? 'deposit' : 'withdraw';
  const tgLabel = item.type === 'deposit' ? '충전' : '환전';
  const amt = Number(item.amount || 0).toLocaleString();
  try { telegram.send(tgType, '📢 <b>' + tgLabel + ' 신청</b>\n회원: ' + (item.userId || '') + '\n금액: ' + amt + '원\n시간: ' + (item.datetime || '')); } catch(e) {}

  res.json({ success: true, data: item });
});

// ── 내 충환전 목록 ──
router.get('/transfers', async (req, res) => {
  let list = [];
  try { list = await dal.readData('transfers.json'); } catch(e) {}
  if (req.query.userId) list = list.filter(t => t.userId === req.query.userId);
  if (req.query.type)   list = list.filter(t => t.type   === req.query.type);
  if (req.query.status) list = list.filter(t => t.status === req.query.status);
  res.json({ success: true, data: list });
});

// ── 쪽지 목록 (읽기 전용) ──
router.get('/messages', async (req, res) => {
  let list = [];
  try { list = await dal.readData('messages.json'); } catch(e) {}
  if (req.query.userId) list = list.filter(m => m.userId === req.query.userId);
  list = list.filter(m => !m.userDeleted);
  res.json({ success: true, data: list });
});

// ── 쪽지 읽음 처리 ──
router.patch('/messages/:id/read', async (req, res) => {
  let list = [];
  try { list = await dal.readData('messages.json'); } catch(e) {}
  const item = list.find(m => String(m.id) === String(req.params.id));
  if (item) { item.read = true; await dal.writeData('messages.json', list); }
  res.json({ success: true });
});

// ── 쪽지 전체읽기 ──
router.patch('/messages/read-all', async (req, res) => {
  let list = [];
  try { list = await dal.readData('messages.json'); } catch(e) {}
  const userId = req.body.userId;
  list.forEach(m => { if (m.userId === userId) m.read = true; });
  await dal.writeData('messages.json', list);
  res.json({ success: true });
});

// ── 쪽지 전체삭제 (유저: 소프트삭제) ──
router.delete('/messages/delete-all', async (req, res) => {
  let list = [];
  try { list = await dal.readData('messages.json'); } catch(e) {}
  const userId = req.query.userId;
  list.forEach(m => { if (m.userId === userId) m.userDeleted = true; });
  await dal.writeData('messages.json', list);
  res.json({ success: true });
});

// ── 쪽지 삭제 (유저: 소프트삭제) ──
router.delete('/messages/:id', async (req, res) => {
  let list = [];
  try { list = await dal.readData('messages.json'); } catch(e) {}
  const item = list.find(m => String(m.id) === String(req.params.id));
  if (item) { item.userDeleted = true; await dal.writeData('messages.json', list); }
  res.json({ success: true });
});

// ── 로컬 머니 변경 (게임 종료 시 잔액 복원용) ──
router.post('/users/money-local', async (req, res) => {
  const { username, amount: rawAmount } = req.body;
  if (!username || typeof username !== 'string') return res.json({ success: false });
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount === 0) return res.json({ success: false });
  const userRow = await dal.users.getByUsername(username);
  if (!userRow) return res.json({ success: false });
  const before = userRow.money || 0;
  await dal.users.addMoney(username, amount);
  const after = await dal.users.getMoney(username);
  res.json({ success: true, before, after });
});

// ── 공개 설정 (한줄공지, 자동로그아웃) ──
router.get('/public-settings', async (_req, res) => {
  try {
    const s = await dal.readData('admin_settings.json');
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
router.get('/last-approved-deposit', async (req, res) => {
  const { username, since } = req.query;
  if (!username) return res.json({ success: false });
  try {
    const transfers = await dal.readData('transfers.json');
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
