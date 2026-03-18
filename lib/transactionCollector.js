// ══════════════════════════════════════
//  HonorLink 트랜잭션 자동 수집기
//  - 60초마다 최근 1시간 트랜잭션 수집
//  - data/transactions.json에 누적 저장
//  - 30일 이상 된 데이터 자동 정리
// ══════════════════════════════════════
const hl   = require('./honorlink');
const dal  = require('./dal');

const COLLECT_INTERVAL = 40 * 1000;   // 40초
const MAX_AGE_DAYS     = 90;          // 90일 보관

let _collecting = false;
let _lastCollect = 0;
let _serverStartTime = null;

// ── 파트너 트리에서 유저 노드 찾기
async function _readPartnerTree() {
  try { return await dal.readData('partnerTree.json'); } catch(e) { return []; }
}
function _findNodeInTree(nodes, id) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return nodes[i];
    if (nodes[i].children) {
      var found = _findNodeInTree(nodes[i].children, id);
      if (found) return found;
    }
  }
  return null;
}

// ── 상위 파트너 체인 구하기 (본인 포함, 아래→위 순서)
function _getAncestorChain(nodes, targetId, chain) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) {
      chain.push(nodes[i]);
      return true;
    }
    if (nodes[i].children && nodes[i].children.length > 0) {
      if (_getAncestorChain(nodes[i].children, targetId, chain)) {
        chain.push(nodes[i]);
        return true;
      }
    }
  }
  return false;
}

// ── 슬롯 벤더 목록 (설정에서 로드)
async function _getSlotVendors() {
  try {
    var s = await dal.readData('admin_settings.json');
    if (s.slotVendors && Array.isArray(s.slotVendors) && s.slotVendors.length > 0) return s.slotVendors;
  } catch(e) {}
  return ['pragmatic','habanero','cq9','jili','pg','pgsoft','booongo','netent','relax','nolimit','hacksaw','dreamtech','homeslot','playson','evoplay','dragoonsoft','fachai','jdb','avatarux','bigtimegaming','quickspin','redtiger','playngo','thunderkick','wazdan','spinomenal','yggdrasil','bgaming','gameart','greentube','novomatic','platipus','popok','redrake','rubyplay','amatic','bfgames','blueprint','booming','caletagaming','fantasma','kagaming','kalamba','mancala','merkur','octoplay','petersons','retrogames','revolver','netgame','playstar','fatpanda','yolted','1x2 gaming','7-mojos','smartsoft','microgaming plus slo'];
}

// ── 벤더 분류 → 롤링 타입 결정
async function _classifyVendorForRolling(vendor) {
  if (vendor.indexOf('pragmatic') !== -1 && vendor.indexOf('pragmatic_live') === -1 && vendor.indexOf('pragmaticlive') === -1) return 'slot';
  var slotVendors = await _getSlotVendors();
  for (var i = 0; i < slotVendors.length; i++) {
    if (vendor.indexOf(slotVendors[i]) !== -1 || vendor === slotVendors[i]) return 'slot';
  }
  if (vendor.indexOf('sport') !== -1 || vendor.indexOf('bti') !== -1 || vendor.indexOf('pinnacle') !== -1 || vendor.indexOf('sbo') !== -1 || vendor.indexOf('mini') !== -1 || vendor.indexOf('keno') !== -1 || vendor.indexOf('ladder') !== -1) return 'mini';
  return 'casino';
}

// ── 노드에서 롤링 비율 가져오기
function _getRate(node, gameType) {
  if (gameType === 'slot') return parseFloat(node.rollSlot || 0);
  if (gameType === 'mini') return parseFloat(node.rollMini || 0);
  return parseFloat(node.rollCasino || 0);
}

// ── 롤링 포인트 적립 (상위 파트너 연쇄 적립)
async function _readUsers() { try { return await dal.readData('users.json'); } catch(e) { return []; } }
async function _writeUsers(data) { await dal.writeData('users.json', data); }
async function _readRollingLog() { try { return await dal.readData('rolling_log.json'); } catch(e) { return []; } }
async function _writeRollingLog(data) { await dal.writeData('rolling_log.json', data); }

async function processRolling(newBets) {
  if (!newBets || newBets.length === 0) return;

  var tree = await _readPartnerTree();
  if (!tree || tree.length === 0) return;

  var users = await _readUsers();
  var rollingLog = await _readRollingLog();
  var processedIds = {};
  rollingLog.forEach(function(r) { processedIds[r.txId] = true; });

  var changed = false;

  for (var ti = 0; ti < newBets.length; ti++) {
    var tx = newBets[ti];
    if (tx.type !== 'bet') continue;
    if (processedIds[tx.id]) continue; // 이미 처리됨

    var username = tx.user ? tx.user.username : '';
    if (!username) continue;

    // 베팅 유저의 상위 체인 구하기 [본인, 매장, 총판, 부본사, 본사, 관리자]
    var chain = [];
    _getAncestorChain(tree, username, chain);
    if (chain.length === 0) continue;

    var vendor = '';
    try { vendor = ((tx.details && tx.details.game && (tx.details.game.vendor || tx.details.game.type)) || tx.vendor || tx.game_provider || '').toLowerCase(); } catch(e) {}
    var gameType = await _classifyVendorForRolling(vendor);
    var betAmount = Math.abs(tx.amount || 0);
    if (betAmount <= 0) continue;

    // ── 공베팅(누락) 체크: N번째 베팅이면 롤링 적립 건너뛰기
    var ebSetting = _getEmptyBetSetting(tree, username);
    var ebKey = gameType === 'slot' ? 'slot' : gameType === 'mini' ? 'mini' : 'casino';
    var ebInterval = ebSetting[ebKey];
    if (ebInterval > 0) {
      var ebCounter = await _readEbCounter();
      var counterKey = username + ':' + ebKey;
      if (!ebCounter[counterKey]) ebCounter[counterKey] = 0;
      ebCounter[counterKey]++;
      if (ebCounter[counterKey] >= ebInterval) {
        ebCounter[counterKey] = 0;
        await _writeEbCounter(ebCounter);
        // 공베팅 로그 기록
        var ebMode = 'rolling';
        try { var ebSettings = await dal.readData('admin_settings.json'); ebMode = ebSettings.emptyBetMode || 'rolling'; } catch(e) {}
        var ebRoundId = (tx.details && tx.details.game) ? tx.details.game.round : '';
        // 전체 모드: 같은 라운드의 win 금액도 찾기
        var winAmount = 0;
        if (ebMode === 'all' && ebRoundId) {
          var allTx = await readAll();
          allTx.forEach(function(t) {
            if (t.type === 'win' && t.user && t.user.username === username && t.details && t.details.game && t.details.game.round === ebRoundId) {
              winAmount += Math.abs(t.amount || 0);
            }
          });
        }
        // 누락된 롤링 포인트 계산 (공베팅 설정 파트너까지만)
        var ebPid = ebSetting.ebPartnerId;
        var droppedRolling = 0;
        var _prevRate = 0;
        var ebPartnerIdx = -1;
        for (var ri = 0; ri < chain.length; ri++) {
          if (chain[ri].id === ebPid) { ebPartnerIdx = ri; break; }
        }
        // 공베팅 파트너까지의 롤링만 계산 (본인~공베팅파트너)
        for (var ri2 = 0; ri2 <= ebPartnerIdx && ri2 < chain.length; ri2++) {
          var rn = chain[ri2];
          if (rn.level === 'admin') continue;
          var rRate = _getRate(rn, gameType);
          var rDiff = rRate - _prevRate;
          if (rDiff > 0) droppedRolling += Math.floor(betAmount * rDiff / 100);
          _prevRate = rRate;
        }
        var ebLog = await _readEbLog();
        ebLog.push({
          timestamp: new Date().toISOString(),
          username: username,
          gameType: ebKey,
          roundId: ebRoundId,
          betTxId: tx.id,
          betAmount: betAmount,
          winAmount: winAmount,
          rollingAmount: droppedRolling,
          vendor: vendor,
          dropped: true,
          mode: ebMode
        });
        if (ebLog.length > 1000) ebLog = ebLog.slice(ebLog.length - 1000);
        await _writeEbLog(ebLog);
        processedIds[tx.id] = true;
        rollingLog.push({ txId: tx.id, username: username, betAmount: betAmount, vendor: vendor, gameType: gameType, processed: true, emptyBet: true, datetime: new Date().toISOString() });
        console.log('[EmptyBet] Skipped rolling for ' + ebPid + ': ' + username + ' gameType=' + ebKey + ' bet=' + betAmount + ' droppedRolling=' + droppedRolling);

        // 공베팅 파트너 위의 상위 파트너들은 정상 롤링 적립
        var ebPartnerRate = (ebPartnerIdx >= 0) ? _getRate(chain[ebPartnerIdx], gameType) : 0;
        var upperPrevRate = ebPartnerRate;
        for (var ui = ebPartnerIdx + 1; ui < chain.length; ui++) {
          var uNode = chain[ui];
          if (uNode.level === 'admin') continue;
          var uRate = _getRate(uNode, gameType);
          var uDiff = uRate - upperPrevRate;
          if (uDiff > 0) {
            var rollingPts = Math.floor(betAmount * uDiff / 100);
            if (rollingPts > 0) {
              var userIdx = users.findIndex(function(u) { return u.username === uNode.id; });
              if (userIdx >= 0) {
                users[userIdx].rollingPoint = (users[userIdx].rollingPoint || 0) + rollingPts;
                changed = true;
              }
              rollingLog.push({ txId: tx.id, username: uNode.id, betUser: username, amount: rollingPts, rate: uDiff, betAmount: betAmount, gameType: gameType, vendor: vendor, processed: true, datetime: new Date().toISOString() });
            }
          }
          upperPrevRate = uRate;
        }
        if (changed) await _writeUsers(users);
        continue; // 공베팅 파트너까지의 롤링만 스킵
      }
      await _writeEbCounter(ebCounter);
    }

    // 연쇄 적립: 하위 비율을 빼고 남은 차이만큼 각 상위에게 적립
    // chain[0]=베팅유저, chain[1]=직속상위, chain[2]=그 상위, ...
    // 각 노드는 자기 비율 - 바로 아래 자식 비율 = 자기 몫
    var prevRate = 0; // 하위의 비율 (가장 아래부터 시작)

    for (var i = 0; i < chain.length; i++) {
      var node = chain[i];
      if (node.level === 'admin') continue; // 관리자는 제외

      var myRate = _getRate(node, gameType);
      var diffRate = myRate - prevRate; // 나의 비율 - 하위 비율 = 내 몫

      if (diffRate > 0) {
        var rollingPoint = Math.floor(betAmount * diffRate / 100);
        if (rollingPoint > 0) {
          var user = users.find(function(u) { return u.username === node.id; });
          if (user) {
            user.rollingPoint = (user.rollingPoint || 0) + rollingPoint;
            changed = true;
          }

          // 롤링 로그 기록
          rollingLog.push({
            txId: tx.id + '_' + node.id,
            username: node.id,
            betBy: username,
            betAmount: betAmount,
            rate: diffRate,
            rollingPoint: rollingPoint,
            vendor: vendor,
            gameType: gameType,
            datetime: new Date().toISOString()
          });
        }
      }

      prevRate = myRate; // 다음 상위로 올라갈 때 현재 비율이 하위 비율이 됨
    }

    // 원본 txId도 처리 완료로 기록 (중복 방지)
    processedIds[tx.id] = true;
    rollingLog.push({
      txId: tx.id,
      username: username,
      betAmount: betAmount,
      vendor: vendor,
      gameType: gameType,
      processed: true,
      datetime: new Date().toISOString()
    });
  }

  if (changed) await _writeUsers(users);
  await _writeRollingLog(rollingLog);
}

// ── 공베팅(누락) 카운터/로그 관리
async function _readEbCounter() { try { return await dal.readData('emptybet_counter.json'); } catch(e) { return {}; } }
async function _writeEbCounter(d) { await dal.writeData('emptybet_counter.json', d); }
async function _readEbLog() { try { return await dal.readData('emptybet_log.json'); } catch(e) { return []; } }
async function _writeEbLog(d) { await dal.writeData('emptybet_log.json', d); }

// 유저의 공베팅 설정값 가져오기 (상위 파트너에서 상속)
// ebPartnerId: 공베팅이 설정된 파트너의 ID도 반환
function _getEmptyBetSetting(tree, username) {
  var chain = [];
  _getAncestorChain(tree, username, chain);
  if (chain.length === 0) return { casino: 0, slot: 0, mini: 0, ebPartnerId: null };

  var casino = 0, slot = 0, mini = 0, ebPartnerId = null;
  // chain은 [본인, 매장, 총판, ...] 순서 — 본인부터 상위로 올라가며 첫 설정값 사용
  for (var i = 0; i < chain.length; i++) {
    var n = chain[i];
    if (!casino && (n['emptyBet카지노'] || 0) > 0) { casino = n['emptyBet카지노']; if (!ebPartnerId) ebPartnerId = n.id; }
    if (!slot && (n['emptyBet슬롯'] || 0) > 0) { slot = n['emptyBet슬롯']; if (!ebPartnerId) ebPartnerId = n.id; }
    if (!mini && (n['emptyBet미니게임'] || 0) > 0) { mini = n['emptyBet미니게임']; if (!ebPartnerId) ebPartnerId = n.id; }
  }
  return { casino: casino, slot: slot, mini: mini, ebPartnerId: ebPartnerId };
}

// 공베팅 처리: 새로운 bet 트랜잭션마다 카운터 증가, N번째면 다음 win을 차감
// ── 저장된 트랜잭션 읽기
async function readAll() {
  try {
    return await dal.readData('transactions.json');
  } catch(e) { return []; }
}

// ── 저장
async function writeAll(data) {
  await dal.writeData('transactions.json', data);
}

// ── UTC 포맷
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function toUTC(d) {
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth()+1) + '-' + pad2(d.getUTCDate())
    + ' ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds());
}

// ── 수집 실행
async function collect() {
  if (_collecting) return;
  _collecting = true;

  try {
    // 서버 시작 시점 이후만 수집 (과거 데이터 재수집 방지)
    var now = new Date();
    var oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    var collectFrom = _serverStartTime && _serverStartTime > oneHourAgo ? _serverStartTime : oneHourAgo;
    var start = toUTC(collectFrom);
    var end   = toUTC(now);

    var page = 1;
    var allNew = [];
    var hasMore = true;

    while (hasMore) {
      var res = await hl.get('/transactions', {
        start: start,
        end: end,
        page: page,
        perPage: 1000,
        withDetails: 1,
        order: 'desc'
      });

      // 429 에러 시 35초 후 재시도
      if (res._status === 429 || (res.message && res.message.indexOf('Too Many') >= 0)) {
        console.log('[TransactionCollector] 429 rate limit, waiting 35s...');
        await new Promise(r => setTimeout(r, 35000));
        continue; // 같은 페이지 재시도
      }

      var data = res.data || [];
      if (data.length === 0) {
        hasMore = false;
      } else {
        allNew = allNew.concat(data);
        if (data.length < 1000) {
          hasMore = false;
        } else {
          page++;
          // 페이지 간 35초 대기 (rate limit 준수)
          await new Promise(r => setTimeout(r, 35000));
        }
      }
    }

    if (allNew.length === 0) {
      _lastCollect = Date.now();
      return;  // finally에서 _collecting = false 처리
    }

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

    // 새 베팅에 대한 롤링 포인트 적립
    if (newBets.length > 0) {
      try { await processRolling(newBets); } catch(e) { console.error('[TransactionCollector] Rolling error:', e.message); }
    }

    // 오래된 데이터 정리
    var cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    var before = existing.length;
    existing = existing.filter(function(t) {
      var dt = t.processed_at || t.created_at || '';
      return dt >= cutoff;
    });
    var removed = before - existing.length;

    // 저장
    await writeAll(existing);
    _lastCollect = Date.now();
    console.log('[TransactionCollector] +' + added + ' new, -' + removed + ' old, total: ' + existing.length);

  } catch(e) {
    console.error('[TransactionCollector] Error:', e.message);
  } finally {
    _collecting = false;
  }
}

// ── point → rollingPoint 마이그레이션 (1회만 실행)
async function _migrateRollingPoint() {
  var users = await _readUsers();
  var rollingLog = await _readRollingLog();
  if (rollingLog.length === 0) return; // 롤링 로그 없으면 마이그레이션 불필요

  // 이미 rollingPoint 필드가 있으면 마이그레이션 완료
  var alreadyMigrated = users.some(function(u) { return u.rollingPoint && u.rollingPoint > 0; });
  if (alreadyMigrated) return;

  // 롤링 로그에서 유저별 총 롤링 합산
  var rollingTotals = {};
  rollingLog.forEach(function(entry) {
    if (entry.rollingPoint && entry.username) {
      rollingTotals[entry.username] = (rollingTotals[entry.username] || 0) + entry.rollingPoint;
    }
    if (entry.amount && entry.username && !entry.processed) {
      rollingTotals[entry.username] = (rollingTotals[entry.username] || 0) + entry.amount;
    }
  });

  var changed = false;
  users.forEach(function(u) {
    var total = rollingTotals[u.username] || 0;
    if (total > 0) {
      u.rollingPoint = total;
      // point에서 롤링 분 차감 (음수 방지)
      u.point = Math.max(0, (u.point || 0) - total);
      changed = true;
    }
  });

  if (changed) {
    await _writeUsers(users);
    console.log('[TransactionCollector] Migrated rolling to rollingPoint field');
  }
}

// ── 기존 미적립 롤링 처리
async function processExistingRolling() {
  try {
    // 1회성 마이그레이션: 기존 point에 포함된 롤링을 rollingPoint로 분리
    await _migrateRollingPoint();

    var all = await readAll();
    var bets = all.filter(function(t) { return t.type === 'bet'; });
    if (bets.length > 0) {
      await processRolling(bets);
      console.log('[TransactionCollector] Processed rolling for ' + bets.length + ' existing bets');
    }
  } catch(e) { console.error('[TransactionCollector] Existing rolling error:', e.message); }
}

// ── 시작
function start() {
  _serverStartTime = new Date();
  console.log('[TransactionCollector] Started (interval: 40s)');
  // 서버 시작 시 기존 미적립 롤링 처리
  setTimeout(processExistingRolling, 2000);
  // 서버 시작 5초 후 첫 수집
  setTimeout(collect, 5000);
  setInterval(function() {
    // 최소 35초 간격 보장
    if (Date.now() - _lastCollect >= 36000) {
      collect();
    }
  }, COLLECT_INTERVAL);
}

// ── 로컬 데이터 조회 API용
async function query(options) {
  var all = await readAll();
  var result = all;

  // 기간 필터 (Date 객체로 비교 — ISO/일반 형식 모두 지원)
  function parseDate(s) {
    if (!s) return null;
    return new Date(s.replace(' ', 'T') + (s.indexOf('Z') >= 0 || s.indexOf('+') >= 0 ? '' : '+09:00'));
  }
  var startTime = options.start ? parseDate(options.start).getTime() : null;
  var endTime = options.end ? parseDate(options.end).getTime() : null;
  if (startTime) {
    result = result.filter(function(t) {
      var dt = t.processed_at || t.created_at || '';
      var ts = new Date(dt).getTime();
      return ts >= startTime;
    });
  }
  if (endTime) {
    result = result.filter(function(t) {
      var dt = t.processed_at || t.created_at || '';
      var ts = new Date(dt).getTime();
      return ts <= endTime;
    });
  }

  // 유저 필터
  if (options.usernames && options.usernames.length > 0) {
    result = result.filter(function(t) {
      return t.user && t.user.username && options.usernames.indexOf(t.user.username) !== -1;
    });
  }

  // 타입 필터 (bet, win, cancel 등)
  if (options.types && options.types.length > 0) {
    result = result.filter(function(t) {
      return options.types.indexOf(t.type) !== -1;
    });
  }

  // 정렬
  result.sort(function(a, b) {
    var da = a.processed_at || a.created_at || '';
    var db = b.processed_at || b.created_at || '';
    return options.order === 'asc' ? (da > db ? 1 : -1) : (da < db ? 1 : -1);
  });

  // 페이지네이션
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

module.exports = { start, query, collect, processRolling };
