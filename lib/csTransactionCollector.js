// ══════════════════════════════════════
//  오닉스(CS API) 트랜잭션 자동 수집기
//  - 30초마다 최근 1시간 베팅 내역 수집
//  - data/cs_transactions.json에 누적 저장
//  - 90일 이상 된 데이터 자동 정리
//  - 롤링 포인트 적립 (기존 processRolling 재사용)
// ══════════════════════════════════════
const cs   = require('./csapi');
const dal  = require('./dal');
const { processRolling } = require('./transactionCollector');

const COLLECT_INTERVAL = 15 * 1000;   // 15초
const MAX_AGE_DAYS     = 90;          // 90일 보관

let _collecting = false;
let _lastCollect = 0;
let _serverStartTime = null;

// ── 저장된 트랜잭션 읽기/쓰기
async function readAll() {
  try { return await dal.readData('cs_transactions.json'); } catch(e) { return []; }
}
async function writeAll(data) {
  await dal.writeData('cs_transactions.json', data);
}

// ── 날짜 포맷 (CS API용: YYYY-MM-DD HH:mm:ss.000)
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function toCSDate(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate())
    + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '.000';
}

// ── 벤더명 기반 라이브 판별
var _liveNames = ['evolution','pragmatic play live','dream gaming','sa gaming','sexy gaming','wm casino','asia gaming','micro gaming live','all bet','big gaming','skywind live'];
function _isLive(vendor) {
  var v = (vendor || '').toLowerCase();
  return _liveNames.some(function(n) { return v.indexOf(n) >= 0; });
}

// ── CS API 베팅 데이터 → HonorLink 트랜잭션 형식으로 변환
function convertToTx(tx) {
  var vendor = tx.vendorName || tx.vendor || tx.provider || '';
  var isLive = _isLive(vendor);
  var betAmt = Math.abs(Number(tx.betAmount || tx.bet || 0));
  var winAmt = Number(tx.winAmount || tx.win || 0);
  var username = tx.username || tx.user_id || '';
  var roundId = tx.roundId || tx.round_id || '';
  var datetime = tx.betTime || tx.datetime || tx.created_at || new Date().toISOString();
  var result = [];

  if (betAmt > 0) {
    result.push({
      id: 'cs_bet_' + roundId + '_' + username,
      type: 'bet',
      amount: -betAmt,
      processed_at: datetime,
      created_at: datetime,
      user: { username: username },
      details: { game: { vendor: vendor, title: tx.gameName || tx.game || '', round: roundId, type: isLive ? 'live' : 'slot' } },
      _source: 'csapi'
    });
  }
  if (winAmt > 0) {
    result.push({
      id: 'cs_win_' + roundId + '_' + username,
      type: 'win',
      amount: winAmt,
      processed_at: datetime,
      created_at: datetime,
      user: { username: username },
      details: { game: { vendor: vendor, title: tx.gameName || tx.game || '', round: roundId, type: isLive ? 'live' : 'slot' } },
      _source: 'csapi'
    });
  }
  return result;
}

// ── 수집 실행
async function collect() {
  if (_collecting) return;
  _collecting = true;

  try {
    var now = new Date();
    var oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    var collectFrom = _serverStartTime && _serverStartTime > oneHourAgo ? _serverStartTime : oneHourAgo;

    var body = {
      sdate: toCSDate(collectFrom),
      edate: toCSDate(now),
      pagesize: 1000
    };

    var res = await cs.post('/csapi/getBetting', body);
    var rawList = res.data || res.list || [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      _collecting = false;
      _lastCollect = Date.now();
      return;
    }

    // 변환
    var allNew = [];
    rawList.forEach(function(tx) {
      var converted = convertToTx(tx);
      converted.forEach(function(c) { allNew.push(c); });
    });

    // 기존 데이터와 병합 (중복 제거 by id)
    var existing = await readAll();
    var idMap = {};
    existing.forEach(function(t) { idMap[t.id] = true; });

    var added = 0;
    var newBets = [];
    allNew.forEach(function(t) {
      if (!idMap[t.id]) {
        existing.push(t);
        idMap[t.id] = true;
        added++;
        if (t.type === 'bet') newBets.push(t);
      }
    });

    // 새 베팅에 대한 롤링 포인트 적립 (기존 processRolling 재사용)
    if (newBets.length > 0) {
      try { await processRolling(newBets); } catch(e) { console.error('[CSTransactionCollector] Rolling error:', e.message); }
    }

    // 오래된 데이터 정리
    var cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    var before = existing.length;
    existing = existing.filter(function(t) {
      var dt = t.processed_at || t.created_at || '';
      return dt >= cutoff;
    });
    var removed = before - existing.length;

    await writeAll(existing);
    _lastCollect = Date.now();
    if (added > 0 || removed > 0) {
      console.log('[CSTransactionCollector] +' + added + ' new, -' + removed + ' old, total: ' + existing.length);
    }
  } catch(e) {
    console.error('[CSTransactionCollector] Error:', e.message);
  } finally {
    _collecting = false;
  }
}

// ── 시작
function start() {
  _serverStartTime = new Date();
  console.log('[CSTransactionCollector] Started (interval: 15s)');
  // 서버 시작 10초 후 첫 수집 (HL 수집기와 겹치지 않게)
  setTimeout(collect, 10000);
  setInterval(function() {
    if (Date.now() - _lastCollect >= 10000) {
      collect();
    }
  }, COLLECT_INTERVAL);
}

// ── 로컬 데이터 조회 API용
async function query(options) {
  var all = await readAll();
  var result = all;

  function parseDate(s) {
    if (!s) return null;
    return new Date(s.replace(' ', 'T') + (s.indexOf('Z') >= 0 || s.indexOf('+') >= 0 ? '' : '+09:00'));
  }
  var startTime = options.start ? parseDate(options.start).getTime() : null;
  var endTime = options.end ? parseDate(options.end).getTime() : null;
  if (startTime) {
    result = result.filter(function(t) {
      var ts = new Date(t.processed_at || t.created_at || '').getTime();
      return ts >= startTime;
    });
  }
  if (endTime) {
    result = result.filter(function(t) {
      var ts = new Date(t.processed_at || t.created_at || '').getTime();
      return ts <= endTime;
    });
  }

  if (options.usernames && options.usernames.length > 0) {
    result = result.filter(function(t) {
      return t.user && t.user.username && options.usernames.indexOf(t.user.username) !== -1;
    });
  }

  if (options.types && options.types.length > 0) {
    result = result.filter(function(t) {
      return options.types.indexOf(t.type) !== -1;
    });
  }

  result.sort(function(a, b) {
    var da = a.processed_at || a.created_at || '';
    var db = b.processed_at || b.created_at || '';
    return options.order === 'asc' ? (da > db ? 1 : -1) : (da < db ? 1 : -1);
  });

  var page    = parseInt(options.page) || 1;
  var perPage = parseInt(options.perPage) || 100;
  var total   = result.length;
  var start   = (page - 1) * perPage;
  var paged   = result.slice(start, start + perPage);

  return {
    data: paged,
    total: total,
    page: page,
    perPage: perPage,
    lastCollect: _lastCollect ? new Date(_lastCollect).toISOString() : null
  };
}

module.exports = { start, query, collect };
