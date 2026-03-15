// ══════════════════════════════════════
//  게임 API 프록시 라우트
// ══════════════════════════════════════
const express = require('express');
const router  = express.Router();
const cs      = require('../lib/csapi');
const path    = require('path');
const fs      = require('fs');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json'), 'utf8')); } catch(e) { return []; }
}

// ── 게임사 목록 (type=1)
router.post('/providers', async (req, res) => {
  try {
    const r = await cs.post('/csapi/Provider', {
      type:     '1',
      gametype: req.body.gametype || '',
    });
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 게임 리스트 (type=2)
router.post('/games', async (req, res) => {
  try {
    const r = await cs.post('/csapi/Provider', {
      type:     '2',
      gameid:   req.body.gameid,
      code:     req.body.code,
      gametype: req.body.gametype || '',
    });
    res.json(r);
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
    res.json(r);
  } catch(e) { res.json({ result: 0, msg: e.message }); }
});

// ── 베팅 내역 조회
router.post('/betting', async (req, res) => {
  try {
    const r = await cs.post('/csapi/getBetting', req.body);
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

module.exports = router;
