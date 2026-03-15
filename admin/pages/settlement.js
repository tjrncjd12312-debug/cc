// ══════════════════════════════════════
//  통합 정산 관리 (슬롯 + 카지노)
// ══════════════════════════════════════

var _stlSelectedNode = null;
var _stlUserStats = {};
var _stlUserMoney = {};
var _stlLoaded = false;
var _stlEmptyBetView = 'applied'; // 'applied' = 공베팅 적용, 'none' = 공베팅 미적용

var _stlLevelLabel = { admin:'관리자', head:'본사', subhead:'부본사', distributor:'총판', store:'매장', member:'회원' };
var _stlLevelColor = { admin:'#8b5cf6', head:'#3b82f6', subhead:'#06b6d4', distributor:'#f59e0b', store:'#10b981', member:'#6b7280' };

// 3줄 셀 헬퍼: 카 / 슬 / 합
var _stlBdr = 'border-right:1px solid var(--border);border-bottom:1px solid var(--border);';
var _row = 'display:flex;justify-content:space-between;align-items:center;';
var _lbl = '<span style="opacity:0.85;font-size:0.6rem;font-weight:600;">';
function _c3(casino, slot, color) {
  var t = casino + slot;
  var c = color || 'var(--text)';
  return '<td style="color:' + c + ';padding:8px 6px;' + _stlBdr + '"><div style="line-height:1.6;">'
    + '<div style="' + _row + '">' + _lbl + '카</span><span>' + casino.toLocaleString() + '</span></div>'
    + '<div style="' + _row + '">' + _lbl + '슬</span><span>' + slot.toLocaleString() + '</span></div>'
    + '<div style="' + _row + 'font-weight:700;">' + _lbl + '합</span><span>' + t.toLocaleString() + '</span></div>'
    + '</div></td>';
}
function _c3color(casino, slot) {
  var t = casino + slot;
  var cc = casino >= 0 ? '#4ade80' : '#ef4444';
  var cs = slot >= 0 ? '#4ade80' : '#ef4444';
  var ct = t >= 0 ? '#4ade80' : '#ef4444';
  return '<td style="padding:8px 6px;' + _stlBdr + '"><div style="line-height:1.6;">'
    + '<div style="' + _row + '">' + _lbl + '카</span><span style="color:' + cc + ';">' + casino.toLocaleString() + '</span></div>'
    + '<div style="' + _row + '">' + _lbl + '슬</span><span style="color:' + cs + ';">' + slot.toLocaleString() + '</span></div>'
    + '<div style="' + _row + 'font-weight:700;">' + _lbl + '합</span><span style="color:' + ct + ';">' + t.toLocaleString() + '</span></div>'
    + '</div></td>';
}

function renderSettlementPage() {
  var el = document.getElementById('content');
  if (!el) return;

  var today = _dfLocalDate(new Date());

  var quickBtnStyle = 'background:var(--bg3);color:var(--text);border:1px solid var(--border);padding:5px 12px;border-radius:6px;font-size:0.73rem;cursor:pointer;transition:all 0.15s;';
  var cardStyle = 'background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;';

  el.innerHTML =
    '<div style="display:flex;gap:0;height:calc(100vh - 200px);min-height:500px;">'
    // ── 왼쪽: 트리 ──
    + '<div id="stl-tree-panel" style="width:230px;min-width:180px;background:var(--card);border-right:1px solid var(--border);overflow-y:auto;flex-shrink:0;">'
    +   '<div style="padding:8px 16px;font-size:0.78rem;color:#f59e0b;font-weight:700;border-bottom:1px solid var(--border);letter-spacing:0.03em;">파트너 트리</div>'
    +   '<div style="padding:6px 10px;border-bottom:1px solid var(--border);margin-bottom:4px;">'
    +     '<input type="text" id="stl-tree-search" placeholder="파트너 검색" style="width:100%;background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:5px;font-size:0.72rem;outline:none;box-sizing:border-box;">'
    +   '</div>'
    +   '<div class="pt-tree" id="stl-tree"></div>'
    + '</div>'
    // ── 오른쪽: 메인 ──
    + '<div style="flex:1;overflow-y:auto;padding:20px 24px;background:var(--bg);">'
    +   '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">'
    +     '<span style="color:var(--text2);font-size:0.75rem;background:rgba(100,116,139,0.15);padding:6px 12px;border-radius:6px;border:1px solid rgba(100,116,139,0.3);">※ 정산금 = (베팅 - 당첨 - 총롤링금) x 루징%  |  실지급금 = 정산금 - 하부정산금</span>'
    +   '</div>'
    +   '<div class="date-filter-bar" style="margin-bottom:20px;">'
    +     '<button class="stl-quick-btn df-preset active" data-preset="today">오늘</button>'
    +     '<button class="stl-quick-btn df-preset" data-preset="yesterday">어제</button>'
    +     '<button class="stl-quick-btn df-preset" data-preset="week">이번주</button>'
    +     '<button class="stl-quick-btn df-preset" data-preset="month">이번달</button>'
    +     '<button class="stl-quick-btn df-preset" data-preset="lastmonth">저번달</button>'
    +     '<div class="df-date-range">'
    +       '<input type="date" id="stl-start" value="' + today + '">'
    +       '<span style="color:#64748b;font-size:0.72rem;">~</span>'
    +       '<input type="date" id="stl-end" value="' + today + '">'
    +       '<button id="stl-search" class="df-query-btn">조회</button>'
    +     '</div>'
    +     '<div style="display:flex;gap:6px;margin-left:auto;">'
    +       '<button id="stl-eb-applied" style="padding:5px 14px;border-radius:6px;font-size:0.73rem;cursor:pointer;font-weight:600;border:1px solid #f59e0b;background:#f59e0b;color:#000;transition:all 0.15s;">공베팅 적용</button>'
    +       '<button id="stl-eb-none" style="padding:5px 14px;border-radius:6px;font-size:0.73rem;cursor:pointer;font-weight:600;border:1px solid #64748b;background:var(--bg3);color:var(--text);transition:all 0.15s;">공베팅 미적용</button>'
    +     '</div>'
    +   '</div>'
    // 나의 정산데이터
    +   '<div style="' + cardStyle + 'margin-bottom:20px;">'
    +     '<div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">나의 정산데이터</div>'
    +     '<div style="overflow-x:auto;">'
    +       '<table class="db-table" id="stl-my-table" style="font-size:0.75rem;border-collapse:collapse;width:100%;">'
    +         _stlTheadHtml(true)
    +         '<tbody id="stl-my-tbody"><tr><td colspan="14" style="color:#64748b;text-align:center;padding:24px;">조회 버튼을 눌러주세요.</td></tr></tbody>'
    +       '</table>'
    +     '</div>'
    +   '</div>'
    // 하부 정산데이터
    +   '<div style="' + cardStyle + '">'
    +     '<div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">하부 정산데이터</div>'
    +     '<div style="overflow-x:auto;">'
    +       '<table class="db-table" id="stl-sub-table" style="font-size:0.75rem;border-collapse:collapse;width:100%;">'
    +         _stlTheadHtml(false)
    +         '<tbody id="stl-sub-tbody"><tr><td colspan="14" style="color:#64748b;text-align:center;padding:24px;">조회 버튼을 눌러주세요.</td></tr></tbody>'
    +       '</table>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '</div>';

  _stlRenderTree();
  _stlBindEvents();
}

// ── 테이블 헤더 (각 컬럼이 슬/카/합계를 세로로 표시) ──
function _stlTheadHtml(isMyTable) {
  var thBase = 'padding:10px 8px;text-align:center;font-weight:600;letter-spacing:0.02em;border-bottom:2px solid var(--border);border-right:1px solid var(--border);';
  return '<thead><tr style="background:var(--input-bg);font-size:0.72rem;color:var(--text);">'
    + '<th style="' + thBase + 'width:60px;white-space:nowrap;">구분</th>'
    + '<th style="' + thBase + 'min-width:55px;white-space:nowrap;">' + (isMyTable ? '아이디' : '파트너명') + '</th>'
    + '<th style="' + thBase + 'min-width:70px;">총베팅</th>'
    + '<th style="' + thBase + 'min-width:70px;">총당첨</th>'
    + '<th style="' + thBase + 'min-width:70px;">베팅-당첨</th>'
    + '<th style="' + thBase + 'min-width:70px;background:rgba(245,158,11,0.15);"><span style="color:#d97706;">공베팅</span></th>'
    + '<th style="' + thBase + 'min-width:50px;background:rgba(96,165,250,0.15);"><span style="color:#2563eb;">롤링%</span></th>'
    + '<th style="' + thBase + 'min-width:70px;">통합롤링</th>'
    + '<th style="' + thBase + 'min-width:70px;">개별롤링</th>'
    + '<th style="' + thBase + 'min-width:70px;background:rgba(219,39,119,0.15);"><span style="color:#db2777;">베-당-롤</span></th>'
    + '<th style="' + thBase + 'min-width:40px;background:rgba(217,119,6,0.15);"><span style="color:#b45309;">루징%</span></th>'
    + '<th style="' + thBase + 'min-width:70px;background:rgba(217,119,6,0.12);"><span style="color:#b45309;">베-당-롤*루</span></th>'
    + '<th style="' + thBase + 'min-width:70px;background:rgba(22,163,74,0.15);border-right:none;"><span style="color:#059669;">라인총계</span></th>'
    + '</tr></thead>';
}

// ── 트리 렌더 (파트너 관리와 동일 형식) ──
var _stlTreeSearchKeyword = '';

function _stlNodeMatches(node, keyword) {
  if (!keyword) return true;
  if ((node.id || '').toLowerCase().indexOf(keyword) >= 0) return true;
  if ((node.label || '').toLowerCase().indexOf(keyword) >= 0) return true;
  if (node.children) {
    for (var i = 0; i < node.children.length; i++) {
      if (_stlNodeMatches(node.children[i], keyword)) return true;
    }
  }
  return false;
}

function _stlRenderTree() {
  var el = document.getElementById('stl-tree');
  if (!el) return;
  var tree = [];
  try { tree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(e) {}
  el.innerHTML = _stlBuildTreeHtml(tree, 0);
  _stlBindTreeEvents();
}

function _stlBuildTreeHtml(nodes, depth) {
  if (!nodes || !nodes.length) return '';
  var keyword = _stlTreeSearchKeyword;
  return nodes.map(function(node) {
    if (keyword && !_stlNodeMatches(node, keyword)) return '';
    var hasChildren = node.children && node.children.length > 0;
    var color = _stlLevelColor[node.level] || '#888';
    var lbl = _stlLevelLabel[node.level] || node.level;
    var isSelected = _stlSelectedNode && _stlSelectedNode.id === node.id;
    var forceExpand = keyword && hasChildren;

    var toggle = hasChildren
      ? '<span class="pt-toggle" data-id="' + node.id + '">' + ((node.expanded || forceExpand) ? '▾' : '▸') + '</span>'
      : '<span class="pt-toggle-empty"></span>';
    var badge = '<span class="pt-badge" style="background:' + color + '">' + lbl.charAt(0) + '</span>';

    var row = '<div class="pt-node' + (isSelected ? ' selected' : '') + '" data-id="' + node.id + '" style="padding-left:' + (depth * 16 + 8) + 'px">'
      + toggle + badge
      + '<span class="pt-node-label" style="color:var(--text,#000)">' + node.label + '</span>'
      + '</div>';

    var children = (hasChildren && (node.expanded || forceExpand))
      ? '<div class="pt-children">' + _stlBuildTreeHtml(node.children, depth + 1) + '</div>'
      : '';

    return row + children;
  }).join('');
}

function _stlBindTreeEvents() {
  document.querySelectorAll('#stl-tree .pt-toggle').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var tree = [];
      try { tree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(e) {}
      var node = _stlFindNode(tree, this.dataset.id);
      if (node) {
        node.expanded = !node.expanded;
        try { localStorage.setItem('partnerTree', JSON.stringify(tree)); } catch(e) {}
      }
      _stlRenderTree();
    });
  });

  document.querySelectorAll('#stl-tree .pt-node').forEach(function(el) {
    el.addEventListener('click', function() {
      var tree = [];
      try { tree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(e) {}
      _stlSelectedNode = _stlFindNode(tree, this.dataset.id);
      _stlRenderTree();
      if (_stlLoaded) _stlRenderTables();
    });
  });
}

function _stlFindNode(nodes, id) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return nodes[i];
    if (nodes[i].children) {
      var found = _stlFindNode(nodes[i].children, id);
      if (found) return found;
    }
  }
  return null;
}

// ── 이벤트 바인딩 ──
function _stlBindEvents() {
  document.getElementById('stl-search').addEventListener('click', function() {
    _stlFetchData();
  });

  // 트리 검색 (실시간)
  var _stlTreeTimer = null;
  document.getElementById('stl-tree-search').addEventListener('input', function() {
    var self = this;
    clearTimeout(_stlTreeTimer);
    _stlTreeTimer = setTimeout(function() {
      _stlTreeSearchKeyword = self.value.trim().toLowerCase();
      _stlRenderTree();
    }, 250);
  });

  bindDatePresets('stl-quick-btn', 'stl-start', 'stl-end', _stlFetchData);

  // 공베팅 적용/미적용 토글
  document.getElementById('stl-eb-applied').addEventListener('click', function() {
    _stlEmptyBetView = 'applied';
    _stlUpdateEbButtons();
    if (_stlLoaded) _stlRenderTables();
  });
  document.getElementById('stl-eb-none').addEventListener('click', function() {
    _stlEmptyBetView = 'none';
    _stlUpdateEbButtons();
    if (_stlLoaded) _stlRenderTables();
  });

  if (!_stlSelectedNode) {
    var tree = [];
    try { tree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(e) {}
    if (tree.length) _stlSelectedNode = tree[0];
    _stlRenderTree();
  }

  // 페이지 진입 시 자동으로 오늘 데이터 조회
  _stlFetchData();
}

function _stlUpdateEbButtons() {
  var btnApplied = document.getElementById('stl-eb-applied');
  var btnNone = document.getElementById('stl-eb-none');
  if (!btnApplied || !btnNone) return;
  if (_stlEmptyBetView === 'applied') {
    btnApplied.style.background = '#f59e0b'; btnApplied.style.color = '#000'; btnApplied.style.border = '1px solid #f59e0b';
    btnNone.style.background = 'var(--bg3)'; btnNone.style.color = 'var(--text)'; btnNone.style.border = '1px solid #64748b';
  } else {
    btnNone.style.background = '#f59e0b'; btnNone.style.color = '#000'; btnNone.style.border = '1px solid #f59e0b';
    btnApplied.style.background = 'var(--bg3)'; btnApplied.style.color = 'var(--text)'; btnApplied.style.border = '1px solid #64748b';
  }
}

// ── 벤더 분류 (dashboard classifyVendor와 동일) ──
function _stlClassifyVendor(tx) {
  var vendor = '';
  try { vendor = ((tx.details && tx.details.game && (tx.details.game.vendor || tx.details.game.type)) || tx.vendor || tx.game_provider || '').toLowerCase(); } catch(e) {}
  if (!vendor) return 'casino';
  // pragmatic (라이브 제외) → slot
  if (vendor.indexOf('pragmatic') !== -1 && vendor.indexOf('pragmatic_live') === -1 && vendor.indexOf('pragmaticlive') === -1) return 'slot';
  // slot 계열
  if (vendor.indexOf('slot') !== -1 || vendor.indexOf('habanero') !== -1 || vendor.indexOf('cq9') !== -1 || vendor.indexOf('jili') !== -1 || vendor === 'pg' || vendor.indexOf('pgsoft') !== -1 || vendor.indexOf('booongo') !== -1 || vendor.indexOf('netent') !== -1 || vendor.indexOf('relax') !== -1 || vendor.indexOf('nolimit') !== -1 || vendor.indexOf('hacksaw') !== -1) return 'slot';
  // 스포츠/미니
  if (vendor.indexOf('sport') !== -1 || vendor.indexOf('bti') !== -1 || vendor.indexOf('pinnacle') !== -1 || vendor.indexOf('sbo') !== -1 || vendor.indexOf('mini') !== -1 || vendor.indexOf('keno') !== -1 || vendor.indexOf('ladder') !== -1) return 'mini';
  return 'casino';
}

// ── 데이터 조회 (로컬 트랜잭션 사용 — rate limit 없음) ──
function _stlFetchData() {
  var startDate = document.getElementById('stl-start').value;
  var endDate = document.getElementById('stl-end').value;
  if (!startDate || !endDate) { alert('기간을 선택해주세요.'); return; }

  var myTbody = document.getElementById('stl-my-tbody');
  var subTbody = document.getElementById('stl-sub-tbody');
  myTbody.innerHTML = '<tr><td colspan="16" style="color:var(--text3);text-align:center;padding:16px;"><i class="fas fa-circle-notch fa-spin"></i> 조회중...</td></tr>';
  subTbody.innerHTML = '<tr><td colspan="16" style="color:var(--text3);text-align:center;padding:16px;"><i class="fas fa-circle-notch fa-spin"></i> 조회중...</td></tr>';

  var start = startDate + ' 00:00:00';
  var end = endDate + ' 23:59:59';

  // 로컬 저장 트랜잭션 + 공베팅 로그 동시 조회
  Promise.all([
    fetch('/api/hl/transactions/local?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end) + '&types=bet,win&perPage=100000').then(function(r) { return r.json(); }),
    fetch('/api/admin/emptybet/log').then(function(r) { return r.json(); }).catch(function() { return { data: [] }; }),
    fetch('/api/admin/emptybet/mode').then(function(r) { return r.json(); }).catch(function() { return { mode: 'rolling' }; })
  ]).then(function(results) {
    var transactions = results[0].data || [];
    var ebLog = results[1].data || [];
    var currentMode = (results[2] && results[2].mode) || 'rolling';
    // 현재 모드를 모든 공베팅 로그에 적용
    ebLog.forEach(function(eb) { eb.mode = currentMode; });
    // 공베팅으로 빠진 betTxId 세트
    var ebTxIds = {};
    ebLog.forEach(function(eb) { if (eb.betTxId) ebTxIds[eb.betTxId] = eb; });
    _stlProcessData(transactions, ebTxIds);
  }).catch(function(e) {
    console.error('정산 조회 실패:', e);
    myTbody.innerHTML = '<tr><td colspan="16" style="color:#f87171;text-align:center;padding:16px;">데이터 조회 실패</td></tr>';
    subTbody.innerHTML = '<tr><td colspan="16" style="color:#f87171;text-align:center;padding:16px;">데이터 조회 실패</td></tr>';
  });
}

function _stlProcessData(transactions, ebTxIds) {
  _stlUserStats = {};
  ebTxIds = ebTxIds || {};

  // all 모드 공베팅의 roundId → 해당 win도 정산 제외
  var ebAllRounds = {};
  Object.keys(ebTxIds).forEach(function(txId) {
    var eb = ebTxIds[txId];
    if (eb.mode === 'all' && eb.roundId && eb.username) {
      ebAllRounds[eb.username + ':' + eb.roundId] = true;
    }
  });

  transactions.forEach(function(tx) {
    var txType = (tx.type || '').toLowerCase();
    if (txType !== 'bet' && txType !== 'win') return;

    var username = '';
    if (tx.user && typeof tx.user === 'object') username = tx.user.username || '';
    else username = tx.username || tx.user || '';
    if (!username) return;

    if (!_stlUserStats[username]) {
      _stlUserStats[username] = { slotBet: 0, slotWin: 0, casinoBet: 0, casinoWin: 0, emptySlotBet: 0, emptyCasinoBet: 0, emptySlotBetAll: 0, emptyCasinoBetAll: 0, emptySlotWin: 0, emptyCasinoWin: 0, emptySlotRoll: 0, emptyCasinoRoll: 0 };
    }

    var amount = Math.abs(Number(tx.amount || 0));
    var gameType = _stlClassifyVendor(tx);
    var isSlot = (gameType === 'slot');

    if (txType === 'bet') {
      // 총베팅에 항상 포함
      if (isSlot) _stlUserStats[username].slotBet += amount;
      else _stlUserStats[username].casinoBet += amount;

      if (ebTxIds[tx.id]) {
        // 공베팅 금액 별도 집계 (롤링 제외용 - 모든 모드)
        if (isSlot) _stlUserStats[username].emptySlotBet += amount;
        else _stlUserStats[username].emptyCasinoBet += amount;
        // 실제 누락 롤링 금액 (emptybet_log의 rollingAmount 사용)
        var ebRoll = Number(ebTxIds[tx.id].rollingAmount || 0);
        if (isSlot) _stlUserStats[username].emptySlotRoll += ebRoll;
        else _stlUserStats[username].emptyCasinoRoll += ebRoll;
        // all 모드 공베팅 bet (PL 제외용)
        if (ebTxIds[tx.id].mode === 'all') {
          if (isSlot) _stlUserStats[username].emptySlotBetAll += amount;
          else _stlUserStats[username].emptyCasinoBetAll += amount;
        }
      }
    } else if (txType === 'win') {
      // 총당첨에 항상 포함
      if (isSlot) _stlUserStats[username].slotWin += amount;
      else _stlUserStats[username].casinoWin += amount;

      // all 모드: 해당 라운드의 win도 정산에서 제외 (별도 집계)
      var round = (tx.details && tx.details.game && tx.details.game.round) || '';
      if (round && ebAllRounds[username + ':' + round]) {
        if (isSlot) _stlUserStats[username].emptySlotWin += amount;
        else _stlUserStats[username].emptyCasinoWin += amount;
      }
    }
  });

  _stlLoaded = true;

  fetch('/api/admin/users')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var users = res.data || res || [];
      _stlUserMoney = {};
      users.forEach(function(u) {
        _stlUserMoney[u.username] = u.money || 0;
      });
      _stlRenderTables();
    })
    .catch(function() {
      _stlRenderTables();
    });
}

// ── 테이블 렌더 ──
function _stlRenderTables() {
  var tree = [];
  try { tree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(e) {}
  var node = _stlSelectedNode || (tree.length ? tree[0] : null);
  if (!node) return;

  // 나의 정산데이터
  var myTbody = document.getElementById('stl-my-tbody');
  var myRow = _stlCalcRow(node);
  myTbody.innerHTML = _stlRowHtml(myRow, 1, true);

  // 하부 정산데이터
  var subTbody = document.getElementById('stl-sub-tbody');
  var children = node.children || [];
  if (!children.length) {
    subTbody.innerHTML = '<tr><td colspan="16" style="color:var(--text3);text-align:center;padding:16px;">하부 데이터가 없습니다.</td></tr>';
    return;
  }

  var rows = '';
  var tot = { slotBet:0, slotWin:0, casinoBet:0, casinoWin:0, emptyCasino:0, emptySlot:0,
              rollSlotAmt:0, rollCasinoAmt:0,
              realRollSlotAmt:0, realRollCasinoAmt:0, bdrSlot:0, bdrCasino:0,
              bdrLosing:0, line:0, money:0 };
  children.forEach(function(child, idx) {
    var r = _stlCalcRow(child);
    rows += _stlRowHtml(r, idx + 1, false);
    tot.slotBet += r.slotBet; tot.slotWin += r.slotWin;
    tot.casinoBet += r.casinoBet; tot.casinoWin += r.casinoWin;
    tot.emptyCasino += r.emptyCasino; tot.emptySlot += r.emptySlot;
    tot.rollSlotAmt += r.rollSlotAmt; tot.rollCasinoAmt += r.rollCasinoAmt;
    tot.realRollSlotAmt += r.realRollSlotAmt; tot.realRollCasinoAmt += r.realRollCasinoAmt;
    tot.bdrSlot += r.bdrSlot; tot.bdrCasino += r.bdrCasino;
    tot.bdrLosing += r.bdrLosing;
    tot.line += r.line;
    tot.money += r.money;
  });

  // 합계 행
  var slotPL = tot.slotBet - tot.slotWin;
  var casinoPL = tot.casinoBet - tot.casinoWin;
  var totTd = 'padding:10px 6px;border-right:1px solid var(--border);';
  rows += '<tr style="background:rgba(245,158,11,0.1);font-weight:700;border-top:2px solid rgba(245,158,11,0.3);color:var(--text);">'
    + '<td colspan="2" style="color:#f59e0b;' + totTd + 'font-size:0.82rem;letter-spacing:0.05em;">합계</td>'
    + _c3(tot.casinoBet, tot.slotBet)
    + _c3(tot.casinoWin, tot.slotWin)
    + _c3color(casinoPL, slotPL)
    + _c3(tot.emptyCasino, tot.emptySlot, '#f59e0b')
    + '<td style="' + totTd + '"></td>'
    + _c3(tot.rollCasinoAmt, tot.rollSlotAmt, '#60a5fa')
    + _c3(tot.realRollCasinoAmt, tot.realRollSlotAmt, '#4ade80')
    + _c3(tot.bdrCasino, tot.bdrSlot, '#f472b6')
    + '<td style="' + totTd + '"></td>'
    + '<td style="color:#fbbf24;font-weight:700;text-align:right;' + totTd + '">' + tot.bdrLosing.toLocaleString() + '</td>'
    + '<td style="color:#34d399;font-weight:700;text-align:right;padding:10px 6px;border-right:none;">' + tot.line.toLocaleString() + '</td>'
    + '</tr>';

  subTbody.innerHTML = rows;
}

// ── 1행 계산 ──
function _stlCalcRow(node) {
  var stats = _stlGetSubtreeStats(node);
  var rollSlot = parseFloat(node.rollSlot || 0);
  var rollCasino = parseFloat(node.rollCasino || 0);
  var losing = parseFloat(node.losingSlot || 0);

  // 공베팅 미적용 모드일 때 모든 empty 값을 0으로 처리
  var isNoEmpty = (_stlEmptyBetView === 'none');
  var eSlotAll = isNoEmpty ? 0 : stats.emptySlotAll;
  var eCasinoAll = isNoEmpty ? 0 : stats.emptyCasinoAll;
  var eSlotWin = isNoEmpty ? 0 : stats.emptySlotWin;
  var eCasinoWin = isNoEmpty ? 0 : stats.emptyCasinoWin;

  // all 모드 공베팅: bet+win 모두 정산에서 제외 (실제 머니 회수는 안 함)
  var slotPL = (stats.slotBet - eSlotAll) - (stats.slotWin - eSlotWin);
  var casinoPL = (stats.casinoBet - eCasinoAll) - (stats.casinoWin - eCasinoWin);

  // 롤링 계산: 전체 베팅 기준 롤링에서 실제 누락 롤링 차감
  // 단, 공베팅 설정이 있는 파트너만 롤링 차감 적용
  var hasEB = (parseFloat(node['emptyBet카지노'] || 0) > 0 || parseFloat(node['emptyBet슬롯'] || 0) > 0);
  var eSlotRoll = (hasEB && !isNoEmpty) ? stats.emptySlotRoll : 0;
  var eCasinoRoll = (hasEB && !isNoEmpty) ? stats.emptyCasinoRoll : 0;

  var subRollSlot = 0, subRollCasino = 0;
  if (node.children) {
    node.children.forEach(function(child) {
      var childStats = _stlGetSubtreeStats(child);
      var childHasEB = (parseFloat(child['emptyBet카지노'] || 0) > 0 || parseFloat(child['emptyBet슬롯'] || 0) > 0);
      var childESlotRoll = (childHasEB && !isNoEmpty) ? childStats.emptySlotRoll : 0;
      var childECasinoRoll = (childHasEB && !isNoEmpty) ? childStats.emptyCasinoRoll : 0;
      subRollSlot += Math.floor(childStats.slotBet * parseFloat(child.rollSlot || 0) / 100) - childESlotRoll;
      subRollCasino += Math.floor(childStats.casinoBet * parseFloat(child.rollCasino || 0) / 100) - childECasinoRoll;
    });
  }

  // admin은 자체 롤링%가 없으므로 하부(본사)의 통합롤링을 그대로 사용
  var rollSlotAmt, rollCasinoAmt;
  if (node.level === 'admin') {
    rollSlotAmt = subRollSlot;
    rollCasinoAmt = subRollCasino;
  } else {
    rollSlotAmt = Math.floor(stats.slotBet * rollSlot / 100) - eSlotRoll;
    rollCasinoAmt = Math.floor(stats.casinoBet * rollCasino / 100) - eCasinoRoll;
  }
  var realRollSlotAmt = rollSlotAmt - subRollSlot;
  var realRollCasinoAmt = rollCasinoAmt - subRollCasino;

  var bdrSlot = slotPL - rollSlotAmt;
  var bdrCasino = casinoPL - rollCasinoAmt;
  var bdrTotal = bdrSlot + bdrCasino;

  // 루징은 슬/카 통합 (베-당-롤 합계 * 루징%)
  var bdrLosing = Math.floor(bdrTotal * losing / 100);

  // 라인총계 = 내 베-당-롤*루 - 하부 베-당-롤*루 합계
  var subBdrLosing = 0;
  if (node.children) {
    node.children.forEach(function(child) {
      var cr = _stlCalcRow(child);
      subBdrLosing += cr.bdrLosing;
    });
  }
  var line = bdrLosing - subBdrLosing;

  var money = 0;
  if (_stlUserMoney[node.id] !== undefined) {
    money = _stlUserMoney[node.id];
  } else {
    (function sumMoney(n) {
      if (_stlUserMoney[n.id] !== undefined) {
        money += _stlUserMoney[n.id];
      }
      if (n.children) n.children.forEach(sumMoney);
    })(node);
  }

  return {
    label: node.label, level: node.level,
    slotBet: stats.slotBet - eSlotAll, slotWin: stats.slotWin - eSlotWin,
    casinoBet: stats.casinoBet - eCasinoAll, casinoWin: stats.casinoWin - eCasinoWin,
    emptyCasino: isNoEmpty ? 0 : stats.emptyCasino, emptySlot: isNoEmpty ? 0 : stats.emptySlot, emptyCasinoAll: eCasinoAll, emptySlotAll: eSlotAll,
    slotPL: slotPL, casinoPL: casinoPL,
    rollSlot: rollSlot, rollCasino: rollCasino,
    rollSlotAmt: rollSlotAmt, rollCasinoAmt: rollCasinoAmt,
    realRollSlotAmt: realRollSlotAmt, realRollCasinoAmt: realRollCasinoAmt,
    bdrSlot: bdrSlot, bdrCasino: bdrCasino,
    losing: losing, bdrLosing: bdrLosing,
    line: line, money: money
  };
}

// ── 하위 회원 베팅 합산 (공베팅 분리) ──
function _stlGetSubtreeStats(node) {
  var result = { slotBet: 0, slotWin: 0, casinoBet: 0, casinoWin: 0, emptyCasino: 0, emptySlot: 0, emptyCasinoAll: 0, emptySlotAll: 0, emptyCasinoWin: 0, emptySlotWin: 0, emptySlotRoll: 0, emptyCasinoRoll: 0 };

  function addStats(n) {
    var s = _stlUserStats[n.id];
    if (!s) return;
    result.slotBet += s.slotBet;
    result.slotWin += s.slotWin;
    result.casinoBet += s.casinoBet;
    result.casinoWin += s.casinoWin;
    // 공베팅 금액 (모든 모드 - 롤링 제외용)
    result.emptySlot += (s.emptySlotBet || 0);
    result.emptyCasino += (s.emptyCasinoBet || 0);
    // 실제 누락 롤링 금액
    result.emptySlotRoll += (s.emptySlotRoll || 0);
    result.emptyCasinoRoll += (s.emptyCasinoRoll || 0);
    // all 모드 공베팅 bet/win (PL 제외용)
    result.emptySlotAll += (s.emptySlotBetAll || 0);
    result.emptyCasinoAll += (s.emptyCasinoBetAll || 0);
    result.emptySlotWin += (s.emptySlotWin || 0);
    result.emptyCasinoWin += (s.emptyCasinoWin || 0);
  }

  function collect(n) {
    if (n.level === 'member') addStats(n);
    if (n.children) n.children.forEach(collect);
  }

  if (node.level === 'member') addStats(node);
  if (node.children) node.children.forEach(collect);
  return result;
}

// ── 행 HTML (세로 3줄 구조) ──
function _stlRowHtml(r, idx, isMyTable) {
  var lvlBadge = '<span style="background:' + (_stlLevelColor[r.level] || '#888') + ';color:#fff;padding:2px 8px;border-radius:3px;font-size:0.65rem;white-space:nowrap;display:inline-block;">'
    + (_stlLevelLabel[r.level] || r.level) + '</span>';

  var nameLines = isMyTable
    ? r.label + '<br>' + r.label
    : r.label;

  var rowBg = idx % 2 === 0 ? 'background:var(--bg2);' : '';
  var tdStyle = 'padding:8px 6px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);';
  var tdR = tdStyle + 'text-align:right;';

  return '<tr style="' + rowBg + 'color:var(--text);transition:background 0.15s;" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'' + (idx % 2 === 0 ? 'var(--bg2)' : 'transparent') + '\'">'
    + '<td style="' + tdStyle + 'white-space:nowrap;text-align:center;">' + lvlBadge + '</td>'
    + '<td style="' + tdStyle + 'font-weight:600;color:var(--text);white-space:nowrap;">' + nameLines + '</td>'
    // 총베팅 (카/슬/합)
    + _c3(r.casinoBet, r.slotBet)
    // 총당첨
    + _c3(r.casinoWin, r.slotWin)
    // 베팅-당첨
    + _c3color(r.casinoPL, r.slotPL)
    // 공베팅 (카/슬/합)
    + _c3(r.emptyCasino, r.emptySlot, '#f59e0b')
    // 롤링% (카/슬)
    + '<td style="color:#60a5fa;font-weight:600;' + tdStyle + '"><div style="line-height:1.6;">'
      + '<div style="' + _row + '">' + _lbl + '카</span><span>' + r.rollCasino.toFixed(1) + '%</span></div>'
      + '<div style="' + _row + '">' + _lbl + '슬</span><span>' + r.rollSlot.toFixed(1) + '%</span></div>'
      + '</div></td>'
    // 통합롤링 (카/슬/합)
    + _c3(r.rollCasinoAmt, r.rollSlotAmt, '#60a5fa')
    // 개별롤링
    + _c3(r.realRollCasinoAmt, r.realRollSlotAmt, '#4ade80')
    // 베-당-롤
    + _c3(r.bdrCasino, r.bdrSlot, '#f472b6')
    // 루징%
    + '<td style="color:#fbbf24;font-weight:600;text-align:right;' + tdStyle + '">' + r.losing.toFixed(1) + '%</td>'
    // 베-당-롤*루
    + '<td style="color:#fbbf24;' + tdR + '">' + r.bdrLosing.toLocaleString() + '</td>'
    // 라인총계
    + '<td style="color:#34d399;' + tdR + 'border-right:none;">' + r.line.toLocaleString() + '</td>'
    + '</tr>';
}

// ══════════════════════════════════════
//  일자별 정산
// ══════════════════════════════════════

function _dailyKstDate(d) {
  return new Date(d.getTime() + 9*60*60*1000).toISOString().slice(0,10);
}

// UTC 트랜잭션 시간 → KST 날짜 문자열
function _txToKstDate(tx) {
  var dt = tx.processed_at || tx.created_at || '';
  if (!dt) return '';
  return new Date(new Date(dt).getTime() + 9*60*60*1000).toISOString().slice(0,10);
}

function renderSettlementDailyPage() {
  var el = document.getElementById('content');
  if (!el) return;
  var today = _dailyKstDate(new Date());
  var qBtn = 'background:var(--bg3);color:var(--text);border:1px solid var(--border);padding:5px 14px;border-radius:6px;font-size:0.73rem;cursor:pointer;';

  var dTh = 'padding:10px 8px;text-align:center;font-weight:600;border-bottom:2px solid var(--border);border-right:1px solid var(--border);';
  el.innerHTML =
    '<div style="padding:16px 20px;">'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">'
    +   '<input type="date" id="stl-daily-start" value="' + today + '" class="pt-modal-input" style="width:140px;padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<span style="color:var(--text);font-weight:600;">~</span>'
    +   '<input type="date" id="stl-daily-end" value="' + today + '" class="pt-modal-input" style="width:140px;padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<button id="stl-daily-search" class="pt-action-btn pt-btn-blue" style="padding:6px 18px;font-size:0.8rem;border-radius:6px;font-weight:600;">조회</button>'
    +   '<button class="stl-daily-quick" data-range="today" style="' + qBtn + '">오늘</button>'
    +   '<button class="stl-daily-quick" data-range="yesterday" style="' + qBtn + '">어제</button>'
    +   '<button class="stl-daily-quick" data-range="week" style="' + qBtn + '">최근 7일</button>'
    +   '<button class="stl-daily-quick" data-range="month" style="' + qBtn + '">이번달</button>'
    + '</div>'
    + '<div style="overflow-x:auto;">'
    +   '<table class="db-table" style="font-size:0.75rem;border-collapse:collapse;width:100%;">'
    +     '<thead><tr style="background:var(--input-bg);font-size:0.72rem;color:var(--text);">'
    +       '<th style="' + dTh + 'min-width:90px;">날짜</th>'
    +       '<th style="' + dTh + 'min-width:70px;"><span style="color:#22c55e;">입금</span><br><span style="color:#ef4444;">출금</span><br>합계</th>'
    +       '<th style="' + dTh + 'min-width:70px;"><span style="color:#22c55e;">관리자 지급</span><br><span style="color:#ef4444;">관리자 회수</span><br>합계</th>'
    +       '<th style="' + dTh + 'min-width:60px;">게임타입</th>'
    +       '<th style="' + dTh + 'min-width:80px;">베팅</th>'
    +       '<th style="' + dTh + 'min-width:80px;">당첨</th>'
    +       '<th style="' + dTh + 'min-width:80px;">베팅 손익<br><span style="opacity:0.6;font-size:0.6rem;">(베팅-당첨)</span></th>'
    +       '<th style="' + dTh + 'min-width:70px;">개별 롤링</th>'
    +       '<th style="' + dTh + 'min-width:70px;background:rgba(217,119,6,0.12);"><span style="color:#b45309;">루징금</span></th>'
    +       '<th style="' + dTh + 'min-width:80px;">게임 손익</th>'
    +       '<th style="' + dTh + 'min-width:90px;background:rgba(22,163,74,0.12);border-right:none;"><span style="color:#059669;">라인 총계</span><br><span style="opacity:0.6;font-size:0.55rem;">(관리자 지급/회수+게임타입)</span></th>'
    +     '</tr></thead>'
    +     '<tbody id="stl-daily-tbody"><tr><td colspan="11" style="color:var(--text3);text-align:center;padding:16px;">조회 버튼을 눌러주세요.</td></tr></tbody>'
    +   '</table>'
    + '</div>'
    + '</div>';

  // 퀵 버튼 바인딩
  document.querySelectorAll('.stl-daily-quick').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var range = btn.getAttribute('data-range');
      var now = new Date();
      var s, e;
      if (range === 'today') { s = e = _dailyKstDate(now); }
      else if (range === 'yesterday') { var y = new Date(now); y.setDate(y.getDate()-1); s = e = _dailyKstDate(y); }
      else if (range === 'week') { var w = new Date(now); w.setDate(w.getDate()-6); s = _dailyKstDate(w); e = _dailyKstDate(now); }
      else if (range === 'month') { s = _dailyKstDate(now).slice(0,8) + '01'; e = _dailyKstDate(now); }
      document.getElementById('stl-daily-start').value = s;
      document.getElementById('stl-daily-end').value = e;
      _stlDailyFetch();
    });
  });

  document.getElementById('stl-daily-search').addEventListener('click', _stlDailyFetch);

  // 자동 조회
  _stlDailyFetch();
}

function _stlDailyFetch() {
  var s = document.getElementById('stl-daily-start').value;
  var e = document.getElementById('stl-daily-end').value;
  if (!s || !e) return;
  var tbody = document.getElementById('stl-daily-tbody');
  tbody.innerHTML = '<tr><td colspan="11" style="color:var(--text3);text-align:center;padding:16px;"><i class="fas fa-circle-notch fa-spin"></i> 조회중...</td></tr>';

  // 파트너 트리에서 회원→본사(head) 매핑 생성 (본사가 여러개일 때 대응)
  var tree = [];
  try { tree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(ex) {}
  var _memberHeadMap = {}; // username → { rollSlot, rollCasino, losingSlot }
  function _dailyMapMembers(nodes, headNode) {
    if (!nodes) return;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var curHead = (n.level === 'head') ? n : headNode;
      if (n.level === 'member' && curHead) {
        _memberHeadMap[n.id] = {
          rollSlot: parseFloat(curHead.rollSlot || 0),
          rollCasino: parseFloat(curHead.rollCasino || 0),
          losingSlot: parseFloat(curHead.losingSlot || 0)
        };
      }
      if (n.children) _dailyMapMembers(n.children, curHead);
    }
  }
  _dailyMapMembers(tree, null);

  // 로컬 트랜잭션 + transfers + 공베팅 로그 동시 조회
  Promise.all([
    fetch('/api/hl/transactions/local?types=bet,win&perPage=100000&start=' + encodeURIComponent(s + ' 00:00:00') + '&end=' + encodeURIComponent(e + ' 23:59:59')).then(function(r){ return r.json(); }),
    fetch('/api/admin/transfers').then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; }),
    fetch('/api/admin/emptybet/log').then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; }),
    fetch('/api/admin/emptybet/mode').then(function(r){ return r.json(); }).catch(function(){ return {mode:'rolling'}; }),
    fetch('/api/admin/money-logs/admin').then(function(r){ return r.json(); }).catch(function(){ return []; }),
    fetch('/api/admin/money-logs/partner').then(function(r){ return r.json(); }).catch(function(){ return []; })
  ]).then(function(results) {
    var txs = results[0].data || [];
    var transfers = (results[1].data || results[1] || []);
    var ebLog = results[2].data || [];
    var curMode = (results[3] && results[3].mode) || 'rolling';
    var _svrAdminMoneyLogs = results[4] || [];
    var _svrPartnerMoneyLogs = results[5] || [];

    // 현재 모드를 모든 공베팅 로그에 적용
    ebLog.forEach(function(eb) { eb.mode = curMode; });
    // 공베팅 betTxId → eb 객체 매핑
    var ebTxIds = {};
    ebLog.forEach(function(eb) {
      if (eb.betTxId) ebTxIds[eb.betTxId] = eb;
    });

    // all 모드 공베팅의 roundId → win도 정산 제외
    var ebAllRounds = {};
    ebLog.forEach(function(eb) {
      if (eb.mode === 'all' && eb.roundId && eb.username) {
        ebAllRounds[eb.username + ':' + eb.roundId] = true;
      }
    });

    // 일자별 집계
    var daily = {};
    var emptyInit = { casinoBet:0, casinoWin:0, slotBet:0, slotWin:0, emptyCasinoBet:0, emptySlotBet:0, emptyCasinoBetAll:0, emptySlotBetAll:0, emptyCasinoWin:0, emptySlotWin:0, rollCasinoAmt:0, rollSlotAmt:0, deposit:0, withdraw:0, give:0, take:0 };

    // 트랜잭션 (베팅/당첨) — 모든 bet/win 포함, 공베팅 bet은 별도 집계
    txs.forEach(function(tx) {
      var txType = (tx.type || '').toLowerCase();
      if (txType !== 'bet' && txType !== 'win') return;

      var date = _txToKstDate(tx);
      if (!date || date < s || date > e) return;
      if (!daily[date]) daily[date] = JSON.parse(JSON.stringify(emptyInit));
      var amount = Math.abs(Number(tx.amount || 0));
      var gameType = _stlClassifyVendor(tx);
      var username = '';
      if (tx.user && typeof tx.user === 'object') username = tx.user.username || '';
      else username = tx.username || tx.user || '';

      // 해당 회원의 본사 롤링%/루징% 조회
      var memberHead = _memberHeadMap[username] || { rollSlot: 0, rollCasino: 0, losingSlot: 0 };

      if (txType === 'bet') {
        if (gameType === 'slot') daily[date].slotBet += amount;
        else daily[date].casinoBet += amount;

        var isEmpty = !!ebTxIds[tx.id];
        // 공베팅 별도 집계 (모든 모드 - 롤링 제외용)
        if (isEmpty) {
          if (gameType === 'slot') daily[date].emptySlotBet += amount;
          else daily[date].emptyCasinoBet += amount;
          // all 모드만 PL 제외용
          if (ebTxIds[tx.id].mode === 'all') {
            if (gameType === 'slot') daily[date].emptySlotBetAll += amount;
            else daily[date].emptyCasinoBetAll += amount;
          }
        }

        // 롤링 금액 누적 (공베팅 아닌 bet만)
        if (!isEmpty) {
          if (gameType === 'slot') daily[date].rollSlotAmt += Math.floor(amount * memberHead.rollSlot / 100);
          else daily[date].rollCasinoAmt += Math.floor(amount * memberHead.rollCasino / 100);
        }
      } else {
        if (gameType === 'slot') daily[date].slotWin += amount;
        else daily[date].casinoWin += amount;
        // all 모드: 해당 라운드의 win도 정산에서 제외
        var round = (tx.details && tx.details.game && tx.details.game.round) || '';
        if (round && username && ebAllRounds[username + ':' + round]) {
          if (gameType === 'slot') daily[date].emptySlotWin += amount;
          else daily[date].emptyCasinoWin += amount;
        }
      }
    });

    // transfers (입금/출금)
    transfers.forEach(function(tr) {
      var date = (tr.datetime || '').slice(0, 10);
      if (!date || date < s || date > e) return;
      if (!daily[date]) daily[date] = { casinoBet:0, casinoWin:0, slotBet:0, slotWin:0, deposit:0, withdraw:0, give:0, take:0 };
      var amount = Math.abs(Number(tr.amount || 0));
      var type = (tr.type || '').toLowerCase();
      if (type === 'deposit' || type === '충전') daily[date].deposit += amount;
      else if (type === 'withdraw' || type === '환전') daily[date].withdraw += amount;
    });

    // 관리자 지급/회수 (서버 머니로그)
    var moneyLogs = [].concat(_svrAdminMoneyLogs).concat(_svrPartnerMoneyLogs);
    moneyLogs.forEach(function(log) {
      if (log.processor !== '관리자') return;
      var date = (log.datetime || '').slice(0, 10);
      if (!date || date < s || date > e) return;
      if (!daily[date]) daily[date] = { casinoBet:0, casinoWin:0, slotBet:0, slotWin:0, deposit:0, withdraw:0, give:0, take:0 };
      var amount = Math.abs(Number(log.amount || 0));
      var type = (log.type || '').toLowerCase();
      if (type === 'give') daily[date].give += amount;
      else if (type === 'take') daily[date].take += amount;
    });

    var dates = Object.keys(daily).sort();
    if (!dates.length) { tbody.innerHTML = '<tr><td colspan="11" style="color:var(--text3);text-align:center;padding:16px;">데이터 없음</td></tr>'; return; }

    var rows = '';
    var tot = { cB:0, cW:0, sB:0, sW:0, eCB:0, eSB:0, eCBAll:0, eSBAll:0, eCW:0, eSW:0, rC:0, rS:0, dep:0, wit:0, give:0, take:0 };
    var dBdr = 'border-right:1px solid var(--border);';
    var dTd = 'padding:6px 8px;' + dBdr;
    var dTdR = dTd + 'text-align:right;';

    dates.forEach(function(d) {
      var r = daily[d];
      tot.cB+=r.casinoBet; tot.cW+=r.casinoWin;
      tot.sB+=r.slotBet; tot.sW+=r.slotWin;
      tot.eCB+=(r.emptyCasinoBet||0); tot.eSB+=(r.emptySlotBet||0);
      tot.eCBAll+=(r.emptyCasinoBetAll||0); tot.eSBAll+=(r.emptySlotBetAll||0);
      tot.eCW+=(r.emptyCasinoWin||0); tot.eSW+=(r.emptySlotWin||0);
      tot.rC+=(r.rollCasinoAmt||0); tot.rS+=(r.rollSlotAmt||0);
      tot.dep+=r.deposit; tot.wit+=r.withdraw;
      tot.give+=r.give; tot.take+=r.take;

      // all 모드 공베팅: bet+win 모두 정산에서 제외
      var cPL = (r.casinoBet - (r.emptyCasinoBetAll||0)) - (r.casinoWin - (r.emptyCasinoWin||0));
      var sPL = (r.slotBet - (r.emptySlotBetAll||0)) - (r.slotWin - (r.emptySlotWin||0));
      var totalBet = (r.casinoBet - (r.emptyCasinoBetAll||0)) + (r.slotBet - (r.emptySlotBetAll||0));
      var totalWin = (r.casinoWin - (r.emptyCasinoWin||0)) + (r.slotWin - (r.emptySlotWin||0));
      var totalPL = totalBet - totalWin;

      // 롤링은 트랜잭션별로 해당 회원의 본사 롤링%로 이미 누적됨
      var rollCasinoAmt = r.rollCasinoAmt || 0;
      var rollSlotAmt = r.rollSlotAmt || 0;
      var totalRoll = rollCasinoAmt + rollSlotAmt;

      // 루징: PL 대비 비율 (본사 루징% 없으므로 0 처리 — 통합정산에서 파트너별로 계산)
      var cLosing = 0;
      var sLosing = 0;
      var totalLosing = cLosing + sLosing;

      var cGamePL = cPL - rollCasinoAmt - cLosing;
      var sGamePL = sPL - rollSlotAmt - sLosing;
      var totalGamePL = cGamePL + sGamePL;

      var depWit = r.deposit - r.withdraw;
      var giveTake = r.give - r.take;
      var lineTot = giveTake + totalGamePL;

      // 카지노 행
      rows += '<tr style="border-top:2px solid var(--border);color:var(--text);">';
      rows += '<td rowspan="4" style="' + dTd + 'font-weight:600;vertical-align:middle;">' + d + '</td>';
      rows += '<td rowspan="4" style="' + dTd + 'vertical-align:middle;text-align:right;"><div style="line-height:1.8;"><span style="color:#22c55e;">' + r.deposit.toLocaleString() + '</span><br><span style="color:#ef4444;">' + r.withdraw.toLocaleString() + '</span><br><b>' + depWit.toLocaleString() + '</b></div></td>';
      rows += '<td rowspan="4" style="' + dTd + 'vertical-align:middle;text-align:right;"><div style="line-height:1.8;"><span style="color:#22c55e;">' + r.give.toLocaleString() + '</span><br><span style="color:#ef4444;">' + r.take.toLocaleString() + '</span><br><b>' + giveTake.toLocaleString() + '</b></div></td>';
      rows += '<td style="' + dTd + '">카지노</td>';
      var netCBet = r.casinoBet - (r.emptyCasinoBetAll||0);
      var netCWin = r.casinoWin - (r.emptyCasinoWin||0);
      rows += '<td style="' + dTdR + '">' + netCBet.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + '">' + netCWin.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + 'color:' + (cPL >= 0 ? '#ef4444' : '#22c55e') + ';">' + cPL.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + '">' + rollCasinoAmt.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + '">' + cLosing.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + '">' + cGamePL.toLocaleString() + '</td>';
      rows += '<td rowspan="4" style="' + dTd + 'text-align:right;vertical-align:middle;font-weight:700;font-size:0.85rem;color:' + (lineTot >= 0 ? '#ef4444' : '#22c55e') + ';border-right:none;">' + lineTot.toLocaleString() + '</td>';
      rows += '</tr>';

      // 슬롯 행
      rows += '<tr style="color:var(--text);">';
      var netSBet = r.slotBet - (r.emptySlotBetAll||0);
      var netSWin = r.slotWin - (r.emptySlotWin||0);
      rows += '<td style="' + dTd + '">슬롯</td>';
      rows += '<td style="' + dTdR + '">' + netSBet.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + '">' + netSWin.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + 'color:' + (sPL >= 0 ? '#ef4444' : '#22c55e') + ';">' + sPL.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + '">' + rollSlotAmt.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + '">' + sLosing.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + '">' + sGamePL.toLocaleString() + '</td>';
      rows += '</tr>';

      // 스포츠 행 (데이터 없으면 0)
      rows += '<tr style="color:var(--text);">';
      rows += '<td style="' + dTd + '">스포츠</td>';
      rows += '<td style="' + dTdR + '">0</td>';
      rows += '<td style="' + dTdR + '">0</td>';
      rows += '<td style="' + dTdR + '">0</td>';
      rows += '<td style="' + dTdR + '">0</td>';
      rows += '<td style="' + dTdR + '">0</td>';
      rows += '<td style="' + dTdR + '">0</td>';
      rows += '</tr>';

      // 합계 행
      rows += '<tr style="color:var(--text);background:rgba(255,255,255,0.03);">';
      rows += '<td style="' + dTd + 'font-weight:700;">합계</td>';
      rows += '<td style="' + dTdR + 'font-weight:700;">' + totalBet.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + 'font-weight:700;">' + totalWin.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + 'font-weight:700;color:' + (totalPL >= 0 ? '#ef4444' : '#22c55e') + ';">' + totalPL.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + 'font-weight:700;">' + totalRoll.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + 'font-weight:700;">' + totalLosing.toLocaleString() + '</td>';
      rows += '<td style="' + dTdR + 'font-weight:700;">' + totalGamePL.toLocaleString() + '</td>';
      rows += '</tr>';
    });

    // ── 전체 합계 ──
    // all 모드 공베팅 제외한 정산 기준 금액
    var netCB = tot.cB - tot.eCBAll, netCW = tot.cW - tot.eCW;
    var netSB = tot.sB - tot.eSBAll, netSW = tot.sW - tot.eSW;
    var gCPL = netCB - netCW, gSPL = netSB - netSW;
    var gTotalBet = netCB + netSB, gTotalWin = netCW + netSW, gTotalPL = gTotalBet - gTotalWin;
    // 롤링은 트랜잭션별로 이미 누적됨
    var gRollC = tot.rC, gRollS = tot.rS, gTotalRoll = gRollC + gRollS;
    var gCLos = 0, gSLos = 0, gTotalLos = 0;
    var gCGPL = gCPL - gRollC - gCLos, gSGPL = gSPL - gRollS - gSLos, gTotalGPL = gCGPL + gSGPL;
    var gDepWit = tot.dep - tot.wit, gGiveTake = tot.give - tot.take;
    var gLine = gGiveTake + gTotalGPL;

    rows += '<tr style="background:rgba(245,158,11,0.1);border-top:3px solid rgba(245,158,11,0.4);color:var(--text);">';
    rows += '<td rowspan="4" style="' + dTd + 'color:#f59e0b;font-weight:700;vertical-align:middle;font-size:0.85rem;">합계</td>';
    rows += '<td rowspan="4" style="' + dTd + 'vertical-align:middle;text-align:right;"><div style="line-height:1.8;"><span style="color:#22c55e;">' + tot.dep.toLocaleString() + '</span><br><span style="color:#ef4444;">' + tot.wit.toLocaleString() + '</span><br><b>' + gDepWit.toLocaleString() + '</b></div></td>';
    rows += '<td rowspan="4" style="' + dTd + 'vertical-align:middle;text-align:right;"><div style="line-height:1.8;"><span style="color:#22c55e;">' + tot.give.toLocaleString() + '</span><br><span style="color:#ef4444;">' + tot.take.toLocaleString() + '</span><br><b>' + gGiveTake.toLocaleString() + '</b></div></td>';
    rows += '<td style="' + dTd + 'font-weight:600;">카지노</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + netCB.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + netCW.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;color:' + (gCPL >= 0 ? '#ef4444' : '#22c55e') + ';">' + gCPL.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gRollC.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gCLos.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gCGPL.toLocaleString() + '</td>';
    rows += '<td rowspan="4" style="' + dTd + 'text-align:right;vertical-align:middle;font-weight:700;font-size:0.9rem;color:' + (gLine >= 0 ? '#ef4444' : '#22c55e') + ';border-right:none;">' + gLine.toLocaleString() + '</td>';
    rows += '</tr>';

    rows += '<tr style="background:rgba(245,158,11,0.1);color:var(--text);">';
    rows += '<td style="' + dTd + 'font-weight:600;">슬롯</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + netSB.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + netSW.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;color:' + (gSPL >= 0 ? '#ef4444' : '#22c55e') + ';">' + gSPL.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gRollS.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gSLos.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gSGPL.toLocaleString() + '</td>';
    rows += '</tr>';

    rows += '<tr style="background:rgba(245,158,11,0.1);color:var(--text);">';
    rows += '<td style="' + dTd + 'font-weight:600;">스포츠</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">0</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">0</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">0</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">0</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">0</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">0</td>';
    rows += '</tr>';

    rows += '<tr style="background:rgba(245,158,11,0.15);color:var(--text);">';
    rows += '<td style="' + dTd + 'font-weight:700;color:#f59e0b;">합계</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gTotalBet.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gTotalWin.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;color:' + (gTotalPL >= 0 ? '#ef4444' : '#22c55e') + ';">' + gTotalPL.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gTotalRoll.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gTotalLos.toLocaleString() + '</td>';
    rows += '<td style="' + dTdR + 'font-weight:700;">' + gTotalGPL.toLocaleString() + '</td>';
    rows += '</tr>';

    tbody.innerHTML = rows;
  }).catch(function() {
    tbody.innerHTML = '<tr><td colspan="11" style="color:#f87171;text-align:center;padding:16px;">조회 실패</td></tr>';
  });
}

// ══════════════════════════════════════
//  게임사별 정산
// ══════════════════════════════════════
var _sgFilter = '전체';
var _sgData = null; // cached fetched data

function _sgClassifyGameType(tx) {
  var vendor = '';
  var gameType = '';
  try {
    vendor = ((tx.details && tx.details.game && tx.details.game.vendor) || '').toLowerCase();
    gameType = ((tx.details && tx.details.game && tx.details.game.type) || '').toLowerCase();
  } catch(e) {}
  // 슬롯 계열
  if (gameType === 'slot' || gameType === 'slots') return '슬롯';
  if (vendor.indexOf('pragmatic') !== -1 && vendor.indexOf('pragmatic_live') === -1 && vendor.indexOf('pragmaticlive') === -1) return '슬롯';
  if (vendor.indexOf('slot') !== -1 || vendor.indexOf('habanero') !== -1 || vendor.indexOf('cq9') !== -1 || vendor.indexOf('jili') !== -1 || vendor === 'pg' || vendor.indexOf('pgsoft') !== -1 || vendor.indexOf('booongo') !== -1 || vendor.indexOf('netent') !== -1 || vendor.indexOf('relax') !== -1 || vendor.indexOf('nolimit') !== -1 || vendor.indexOf('hacksaw') !== -1) return '슬롯';
  // 스포츠
  if (vendor.indexOf('sport') !== -1 || vendor.indexOf('bti') !== -1 || vendor.indexOf('pinnacle') !== -1 || vendor.indexOf('sbo') !== -1) return '스포츠';
  // 미니게임
  if (vendor.indexOf('mini') !== -1 || vendor.indexOf('keno') !== -1 || vendor.indexOf('ladder') !== -1) return '미니게임';
  // 홀덤
  if (vendor.indexOf('holdem') !== -1 || vendor.indexOf('poker') !== -1) return '홀덤';
  // 슈팅게임
  if (vendor.indexOf('fish') !== -1 || vendor.indexOf('shoot') !== -1) return '슈팅게임';
  // 보드게임
  if (vendor.indexOf('board') !== -1) return '보드게임';
  // 호텔카지노
  if (vendor.indexOf('hotel') !== -1) return '호텔카지노';
  // 코인선물
  if (vendor.indexOf('coin') !== -1 || vendor.indexOf('crypto') !== -1) return '코인선물';
  // 기본 → 카지노
  return '카지노';
}

function _sgGetVendorName(tx) {
  var vendor = '';
  try { vendor = (tx.details && tx.details.game && tx.details.game.vendor) || '알수없음'; } catch(e) { vendor = '알수없음'; }
  return vendor;
}

function renderSettlementGamePage() {
  var el = document.getElementById('content');
  if (!el) return;
  var today = _dfLocalDate(new Date());
  _sgFilter = '전체';
  _sgData = null;

  var quickBtnStyle = 'background:var(--bg3);color:var(--text);border:1px solid var(--border);padding:5px 12px;border-radius:6px;font-size:0.73rem;cursor:pointer;transition:all 0.15s;';
  var cardS = 'background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 20px;min-width:160px;flex:1;';
  var tabStyle = 'padding:6px 14px;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text2);transition:all 0.15s;white-space:nowrap;';
  var tabActiveStyle = 'padding:6px 14px;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid #f59e0b;background:#f59e0b;color:#fff;transition:all 0.15s;white-space:nowrap;';

  var tabs = ['전체','카지노','슬롯','홀덤','스포츠','슈팅게임','코인선물','미니게임','보드게임','호텔카지노'];
  var tabsHtml = tabs.map(function(t) {
    return '<button class="sg-tab" data-tab="' + t + '" style="' + (t === '전체' ? tabActiveStyle : tabStyle) + '">' + t + '</button>';
  }).join('');

  el.innerHTML =
    '<div style="padding:20px 24px;">'
    // ── 요약 카드 ──
    + '<div id="sg-cards" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">'
    +   '<div style="' + cardS + '"><div style="font-size:0.7rem;color:var(--text2);margin-bottom:6px;">총 베팅액</div><div style="font-size:1.3rem;font-weight:700;color:#60a5fa;" id="sg-card-bet">0</div><div style="font-size:0.68rem;color:var(--text3);margin-top:2px;" id="sg-card-betcount">0건</div></div>'
    +   '<div style="' + cardS + '"><div style="font-size:0.7rem;color:var(--text2);margin-bottom:6px;">총 당첨금</div><div style="font-size:1.3rem;font-weight:700;color:#f87171;" id="sg-card-win">0</div></div>'
    +   '<div style="' + cardS + '"><div style="font-size:0.7rem;color:var(--text2);margin-bottom:6px;">하우스 수익</div><div style="font-size:1.3rem;font-weight:700;" id="sg-card-profit">0</div><div style="font-size:0.68rem;margin-top:2px;" id="sg-card-profitrate">0.0%</div></div>'
    +   '<div style="' + cardS + '"><div style="font-size:0.7rem;color:var(--text2);margin-bottom:6px;">베팅유저</div><div style="font-size:1.3rem;font-weight:700;color:#f59e0b;" id="sg-card-users">0</div></div>'
    + '</div>'
    // ── 날짜 선택 ──
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px;">'
    +   '<input type="date" id="sg-start" value="' + today + '" class="pt-modal-input" style="width:140px;padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<span style="color:var(--text);font-weight:600;">~</span>'
    +   '<input type="date" id="sg-end" value="' + today + '" class="pt-modal-input" style="width:140px;padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<button id="sg-search" class="pt-action-btn pt-btn-blue" style="padding:6px 18px;font-size:0.8rem;border-radius:6px;font-weight:600;">조회</button>'
    +   '<button class="sg-quick-btn" data-range="today" style="' + quickBtnStyle + '">오늘</button>'
    +   '<button class="sg-quick-btn" data-range="yesterday" style="' + quickBtnStyle + '">어제</button>'
    +   '<button class="sg-quick-btn" data-range="week" style="' + quickBtnStyle + '">최근 7일</button>'
    +   '<button class="sg-quick-btn" data-range="month" style="' + quickBtnStyle + '">이번달</button>'
    + '</div>'
    // ── 게임타입 탭 ──
    + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:16px;">'
    +   '<div id="sg-tabs" style="display:flex;gap:6px;flex-wrap:wrap;">'
    +   tabsHtml
    +   '</div>'
    +   '<span style="margin-left:auto;font-size:0.72rem;color:#f87171;">*공베팅 미적용입니다.</span>'
    + '</div>'
    // ── 테이블 ──
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;">'
    +   '<div style="overflow-x:auto;">'
    +     '<table class="db-table" style="font-size:0.78rem;border-collapse:collapse;width:100%;">'
    +       '<thead><tr style="background:var(--input-bg);font-size:0.73rem;color:var(--text);">'
    +         '<th style="padding:10px 12px;text-align:center;font-weight:600;border-bottom:2px solid var(--border);min-width:80px;">게임타입</th>'
    +         '<th style="padding:10px 12px;text-align:center;font-weight:600;border-bottom:2px solid var(--border);min-width:140px;">게임사</th>'
    +         '<th style="padding:10px 12px;text-align:right;font-weight:600;border-bottom:2px solid var(--border);min-width:80px;">베팅 건수</th>'
    +         '<th style="padding:10px 12px;text-align:right;font-weight:600;border-bottom:2px solid var(--border);min-width:110px;">총 베팅액</th>'
    +         '<th style="padding:10px 12px;text-align:right;font-weight:600;border-bottom:2px solid var(--border);min-width:110px;">총 당첨금</th>'
    +         '<th style="padding:10px 12px;text-align:right;font-weight:600;border-bottom:2px solid var(--border);min-width:110px;">하우스 수익</th>'
    +         '<th style="padding:10px 12px;text-align:right;font-weight:600;border-bottom:2px solid var(--border);min-width:70px;">수익률</th>'
    +         '<th style="padding:10px 12px;text-align:right;font-weight:600;border-bottom:2px solid var(--border);min-width:70px;">환수률</th>'
    +         '<th style="padding:10px 12px;text-align:right;font-weight:600;border-bottom:2px solid var(--border);min-width:70px;">베팅유저</th>'
    +       '</tr></thead>'
    +       '<tbody id="sg-tbody"><tr><td colspan="9" style="color:var(--text3);text-align:center;padding:24px;">조회 버튼을 눌러주세요.</td></tr></tbody>'
    +     '</table>'
    +   '</div>'
    + '</div>'
    + '</div>';

  // ── 이벤트 바인딩 ──
  document.getElementById('sg-search').addEventListener('click', _sgFetchData);

  // 빠른 날짜 버튼
  function _kst(d) { return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10); }
  document.querySelectorAll('.sg-quick-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var range = btn.getAttribute('data-range');
      var now = new Date();
      var s, e;
      if (range === 'today') { s = e = _kst(now); }
      else if (range === 'yesterday') { var y = new Date(now); y.setDate(y.getDate() - 1); s = e = _kst(y); }
      else if (range === 'week') { var w = new Date(now); w.setDate(w.getDate() - 6); s = _kst(w); e = _kst(now); }
      else if (range === 'month') { s = _kst(now).slice(0, 8) + '01'; e = _kst(now); }
      document.getElementById('sg-start').value = s;
      document.getElementById('sg-end').value = e;
      _sgFetchData();
    });
  });

  // 탭 클릭
  document.querySelectorAll('.sg-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _sgFilter = btn.getAttribute('data-tab');
      document.querySelectorAll('.sg-tab').forEach(function(b) {
        b.style.cssText = tabStyle;
      });
      btn.style.cssText = tabActiveStyle;
      if (_sgData) _sgRenderTable();
    });
  });

  // 페이지 진입 시 자동 조회
  _sgFetchData();
}

function _sgFetchData() {
  var s = document.getElementById('sg-start').value;
  var e = document.getElementById('sg-end').value;
  if (!s || !e) return;
  var tbody = document.getElementById('sg-tbody');
  tbody.innerHTML = '<tr><td colspan="9" style="color:var(--text3);text-align:center;padding:24px;"><i class="fas fa-circle-notch fa-spin"></i> 조회중...</td></tr>';

  fetch('/api/hl/transactions/local?types=bet,win&perPage=100000&start=' + encodeURIComponent(s + ' 00:00:00') + '&end=' + encodeURIComponent(e + ' 23:59:59'))
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var txs = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      // 게임타입 + 게임사별 집계
      var games = {};
      txs.forEach(function(tx) {
        var txType = (tx.type || '').toLowerCase();
        if (txType !== 'bet' && txType !== 'win') return;
        var category = _sgClassifyGameType(tx);
        var vendorName = _sgGetVendorName(tx);
        var key = category + '||' + vendorName;
        var username = '';
        if (tx.user && typeof tx.user === 'object') username = tx.user.username || '';
        else username = tx.username || tx.user || '';

        if (!games[key]) games[key] = { vendor: vendorName, category: category, bet: 0, win: 0, count: 0, users: {} };
        var amount = Math.abs(Number(tx.amount || 0));
        if (txType === 'bet') {
          games[key].bet += amount;
          games[key].count++;
          if (username) games[key].users[username] = true;
        } else {
          games[key].win += amount;
        }
      });

      _sgData = Object.values(games);
      _sgRenderTable();
    })
    .catch(function() {
      document.getElementById('sg-tbody').innerHTML = '<tr><td colspan="9" style="color:#f87171;text-align:center;padding:24px;">조회 실패</td></tr>';
    });
}

function _sgRenderTable() {
  var tbody = document.getElementById('sg-tbody');
  if (!_sgData) return;

  // 필터 적용
  var filtered = _sgData;
  if (_sgFilter !== '전체') {
    filtered = _sgData.filter(function(g) { return g.category === _sgFilter; });
  }

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="color:var(--text3);text-align:center;padding:24px;">데이터 없음</td></tr>';
    _sgUpdateCards(0, 0, 0, 0);
    return;
  }

  // 게임타입별 그룹
  var typeOrder = ['카지노','슬롯','홀덤','스포츠','슈팅게임','코인선물','미니게임','보드게임','호텔카지노'];
  var typeColor = { '카지노':'#f59e0b', '슬롯':'#3b82f6', '홀덤':'#8b5cf6', '스포츠':'#10b981', '슈팅게임':'#ec4899', '코인선물':'#06b6d4', '미니게임':'#6366f1', '보드게임':'#84cc16', '호텔카지노':'#f97316' };
  var groups = {};
  filtered.forEach(function(g) {
    if (!groups[g.category]) groups[g.category] = [];
    groups[g.category].push(g);
  });

  var rows = '';
  var grandBet = 0, grandWin = 0, grandCount = 0, grandUsers = {};

  typeOrder.forEach(function(typeName) {
    var items = groups[typeName];
    if (!items || !items.length) return;
    items.sort(function(a, b) { return b.bet - a.bet; });
    var color = typeColor[typeName] || '#888';

    var tBet = 0, tWin = 0, tCount = 0, tUsers = {};
    items.forEach(function(g) { tBet += g.bet; tWin += g.win; tCount += g.count; Object.keys(g.users).forEach(function(u) { tUsers[u] = true; }); });

    items.forEach(function(g, i) {
      var profit = g.bet - g.win;
      var profitRate = g.bet > 0 ? ((profit / g.bet) * 100).toFixed(1) : '0.0';
      var returnRate = g.bet > 0 ? ((g.win / g.bet) * 100).toFixed(1) : '0.0';
      var userCount = Object.keys(g.users).length;

      rows += '<tr style="border-bottom:1px solid var(--border);">';
      if (i === 0) {
        rows += '<td rowspan="' + (items.length + 1) + '" style="vertical-align:middle;text-align:center;border-right:1px solid var(--border);padding:8px;">'
          + '<span style="border:1px solid ' + color + ';color:' + color + ';padding:3px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;white-space:nowrap;">' + typeName + '</span>'
          + '</td>';
      }
      rows += '<td style="padding:8px 12px;text-align:center;color:var(--text);font-weight:500;"><i class="fas fa-gamepad" style="color:var(--text3);margin-right:6px;font-size:0.7rem;"></i>' + g.vendor + '</td>'
        + '<td style="padding:8px 12px;text-align:right;">' + g.count.toLocaleString() + '</td>'
        + '<td style="padding:8px 12px;text-align:right;color:#60a5fa;">' + g.bet.toLocaleString() + '</td>'
        + '<td style="padding:8px 12px;text-align:right;color:#f87171;">' + g.win.toLocaleString() + '</td>'
        + '<td style="padding:8px 12px;text-align:right;color:' + (profit >= 0 ? '#10b981' : '#ef4444') + ';font-weight:600;">' + (profit >= 0 ? '+' : '') + profit.toLocaleString() + '</td>'
        + '<td style="padding:8px 12px;text-align:right;">' + profitRate + '%</td>'
        + '<td style="padding:8px 12px;text-align:right;">' + returnRate + '%</td>'
        + '<td style="padding:8px 12px;text-align:right;">' + userCount + '</td>'
        + '</tr>';
    });

    // 소계 행
    var tProfit = tBet - tWin;
    var tProfitRate = tBet > 0 ? ((tProfit / tBet) * 100).toFixed(1) : '0.0';
    var tReturnRate = tBet > 0 ? ((tWin / tBet) * 100).toFixed(1) : '0.0';
    var tUserCount = Object.keys(tUsers).length;
    rows += '<tr style="background:var(--bg2);border-bottom:2px solid var(--border);">'
      + '<td style="padding:8px 12px;text-align:center;color:var(--text2);font-weight:600;font-size:0.72rem;">소계</td>'
      + '<td style="padding:8px 12px;text-align:right;font-weight:600;">' + tCount.toLocaleString() + '</td>'
      + '<td style="padding:8px 12px;text-align:right;font-weight:600;color:#60a5fa;">' + tBet.toLocaleString() + '</td>'
      + '<td style="padding:8px 12px;text-align:right;font-weight:600;color:#f87171;">' + tWin.toLocaleString() + '</td>'
      + '<td style="padding:8px 12px;text-align:right;color:' + (tProfit >= 0 ? '#10b981' : '#ef4444') + ';font-weight:700;">' + (tProfit >= 0 ? '+' : '') + tProfit.toLocaleString() + '</td>'
      + '<td style="padding:8px 12px;text-align:right;font-weight:600;">' + tProfitRate + '%</td>'
      + '<td style="padding:8px 12px;text-align:right;font-weight:600;">' + tReturnRate + '%</td>'
      + '<td style="padding:8px 12px;text-align:right;font-weight:600;">' + tUserCount + '</td>'
      + '</tr>';

    grandBet += tBet; grandWin += tWin; grandCount += tCount;
    Object.keys(tUsers).forEach(function(u) { grandUsers[u] = true; });
  });

  // ── 합계 행 ──
  var grandProfit = grandBet - grandWin;
  var grandProfitRate = grandBet > 0 ? ((grandProfit / grandBet) * 100).toFixed(1) : '0.0';
  var grandReturnRate = grandBet > 0 ? ((grandWin / grandBet) * 100).toFixed(1) : '0.0';
  var grandUserCount = Object.keys(grandUsers).length;
  rows += '<tr style="background:#f59e0b18;font-weight:700;border-top:2px solid #f59e0b44;">'
    + '<td colspan="2" style="padding:10px 12px;color:#f59e0b;text-align:center;">합계</td>'
    + '<td style="padding:10px 12px;text-align:right;color:#f59e0b;">' + grandCount.toLocaleString() + '</td>'
    + '<td style="padding:10px 12px;text-align:right;color:#10b981;">' + grandBet.toLocaleString() + '</td>'
    + '<td style="padding:10px 12px;text-align:right;color:#ef4444;">' + grandWin.toLocaleString() + '</td>'
    + '<td style="padding:10px 12px;text-align:right;color:' + (grandProfit >= 0 ? '#10b981' : '#ef4444') + ';">' + (grandProfit >= 0 ? '+' : '') + grandProfit.toLocaleString() + '</td>'
    + '<td style="padding:10px 12px;text-align:right;color:#60a5fa;">' + grandProfitRate + '%</td>'
    + '<td style="padding:10px 12px;text-align:right;color:#a78bfa;">' + grandReturnRate + '%</td>'
    + '<td style="padding:10px 12px;text-align:right;color:#f59e0b;">' + grandUserCount + '</td>'
    + '</tr>';

  tbody.innerHTML = rows;
  _sgUpdateCards(grandBet, grandWin, grandCount, grandUserCount);
}

function _sgUpdateCards(bet, win, count, users) {
  var profit = bet - win;
  var profitRate = bet > 0 ? ((profit / bet) * 100).toFixed(1) : '0.0';
  var profitColor = profit >= 0 ? '#10b981' : '#ef4444';
  try {
    document.getElementById('sg-card-bet').textContent = bet.toLocaleString();
    document.getElementById('sg-card-betcount').textContent = count.toLocaleString() + '건';
    document.getElementById('sg-card-win').textContent = win.toLocaleString();
    var profitEl = document.getElementById('sg-card-profit');
    profitEl.textContent = (profit >= 0 ? '+' : '') + profit.toLocaleString();
    profitEl.style.color = profitColor;
    var rateEl = document.getElementById('sg-card-profitrate');
    rateEl.textContent = (profit >= 0 ? '+' : '') + profitRate + '%';
    rateEl.style.color = profitColor;
    document.getElementById('sg-card-users').textContent = users.toLocaleString();
  } catch(e) {}
}

// ══════════════════════════════════════
//  프로바이더별 정산
// ══════════════════════════════════════
function renderSettlementProviderPage() {
  var el = document.getElementById('content');
  if (!el) return;
  var today = new Date().toISOString().slice(0,10);

  el.innerHTML =
    '<div style="padding:16px 20px;">'
    + '<div class="date-filter-bar" style="margin-bottom:16px;">'
    +   '<button class="stl-prov-quick df-preset active" data-preset="today">오늘</button>'
    +   '<button class="stl-prov-quick df-preset" data-preset="yesterday">어제</button>'
    +   '<button class="stl-prov-quick df-preset" data-preset="week">이번주</button>'
    +   '<button class="stl-prov-quick df-preset" data-preset="month">이번달</button>'
    +   '<button class="stl-prov-quick df-preset" data-preset="lastmonth">저번달</button>'
    +   '<div class="df-date-range">'
    +     '<input type="date" id="stl-prov-start" value="' + today + '">'
    +     '<span style="color:#64748b;font-size:0.72rem;">~</span>'
    +     '<input type="date" id="stl-prov-end" value="' + today + '">'
    +     '<button id="stl-prov-search" class="df-query-btn">조회</button>'
    +   '</div>'
    + '</div>'
    + '<div style="overflow-x:auto;">'
    +   '<table class="db-table" style="font-size:0.78rem;border-collapse:collapse;">'
    +     '<thead><tr style="background:var(--bg3);">'
    +       '<th style="min-width:120px;">프로바이더</th>'
    +       '<th style="min-width:70px;">게임타입</th>'
    +       '<th style="min-width:80px;">베팅 건수</th>'
    +       '<th style="min-width:100px;">총 베팅액</th>'
    +       '<th style="min-width:100px;">총 당첨금</th>'
    +       '<th style="min-width:110px;">하우스 수익</th>'
    +       '<th style="min-width:70px;">수익률</th>'
    +       '<th style="min-width:70px;">환수율</th>'
    +       '<th style="min-width:70px;">베팅유저</th>'
    +     '</tr></thead>'
    +     '<tbody id="stl-prov-tbody"><tr><td colspan="9" style="color:var(--text3);text-align:center;padding:16px;">조회 버튼을 눌러주세요.</td></tr></tbody>'
    +   '</table>'
    + '</div>'
    + '</div>';

  document.getElementById('stl-prov-search').addEventListener('click', function() {
    var s = document.getElementById('stl-prov-start').value;
    var e = document.getElementById('stl-prov-end').value;
    if (!s || !e) return;
    var tbody = document.getElementById('stl-prov-tbody');
    tbody.innerHTML = '<tr><td colspan="9" style="color:var(--text3);text-align:center;padding:16px;"><i class="fas fa-circle-notch fa-spin"></i> 조회중...</td></tr>';

    fetch('/api/hl/transactions?start=' + encodeURIComponent(s + ' 00:00:00') + '&end=' + encodeURIComponent(e + ' 23:59:59') + '&per_page=5000&with_details=1')
      .then(function(r) { return r.json(); })
      .then(function(res) {
        var txs = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        // 프로바이더별 + 게임타입별 집계
        var provData = {}; // { vendor: { casino: {bet,win,count,users}, slot: {bet,win,count,users} } }
        txs.forEach(function(tx) {
          var txType = (tx.type || '').toLowerCase();
          if (txType !== 'bet' && txType !== 'win') return;
          // 현재 HonorLink API 데이터 → 프로바이더는 "아너링크"
          // 추후 다른 API 연동 시 tx.source 등으로 구분
          var vendor = '아너링크';
          var gameType = (tx.details && tx.details.game && tx.details.game.type) ? tx.details.game.type.toLowerCase() : '';
          var category = (gameType === 'slot' || gameType === 'slots') ? 'slot' : 'casino';
          var username = '';
          if (tx.user && typeof tx.user === 'object') username = tx.user.username || '';
          else username = tx.username || tx.user || '';

          if (!provData[vendor]) provData[vendor] = {};
          if (!provData[vendor][category]) provData[vendor][category] = { bet:0, win:0, count:0, users:{} };
          var amount = Math.abs(Number(tx.amount || 0));
          if (txType === 'bet') {
            provData[vendor][category].bet += amount;
            provData[vendor][category].count++;
            if (username) provData[vendor][category].users[username] = true;
          } else {
            provData[vendor][category].win += amount;
          }
        });

        var vendors = Object.keys(provData).sort(function(a, b) {
          var aTot = 0, bTot = 0;
          Object.keys(provData[a]).forEach(function(c) { aTot += provData[a][c].bet; });
          Object.keys(provData[b]).forEach(function(c) { bTot += provData[b][c].bet; });
          return bTot - aTot;
        });
        if (!vendors.length) { tbody.innerHTML = '<tr><td colspan="9" style="color:var(--text3);text-align:center;padding:16px;">데이터 없음</td></tr>'; return; }

        var rows = '';
        var grandBet=0, grandWin=0, grandCount=0, grandUsers={};

        vendors.forEach(function(vendor) {
          var types = [];
          if (provData[vendor].casino) types.push({ key:'casino', label:'카지노', color:'#f59e0b', data: provData[vendor].casino });
          if (provData[vendor].slot) types.push({ key:'slot', label:'슬롯', color:'#3b82f6', data: provData[vendor].slot });
          var rowCount = types.length + 1; // types + 소계

          // 프로바이더 소계 계산
          var pBet=0, pWin=0, pCount=0, pUsers={};
          types.forEach(function(t) {
            pBet += t.data.bet; pWin += t.data.win; pCount += t.data.count;
            Object.keys(t.data.users).forEach(function(u) { pUsers[u] = true; });
          });

          types.forEach(function(t, i) {
            var profit = t.data.bet - t.data.win;
            var profitRate = t.data.bet > 0 ? ((profit / t.data.bet) * 100).toFixed(1) : '0.0';
            var returnRate = t.data.bet > 0 ? ((t.data.win / t.data.bet) * 100).toFixed(1) : '0.0';
            var userCount = Object.keys(t.data.users).length;

            rows += '<tr' + (i === 0 ? ' style="border-top:1px solid var(--border);"' : '') + '>';
            if (i === 0) {
              rows += '<td rowspan="' + rowCount + '" style="vertical-align:middle;font-weight:600;color:var(--text);">'
                + '<i class="fas fa-server" style="color:var(--text2);margin-right:6px;"></i>' + vendor + '</td>';
            }
            rows += '<td style="text-align:center;">'
              + '<span style="border:1px solid ' + t.color + ';color:' + t.color + ';padding:2px 10px;border-radius:4px;font-size:0.7rem;font-weight:600;">' + t.label + '</span></td>'
              + '<td style="text-align:right;">' + t.data.count.toLocaleString() + '</td>'
              + '<td style="text-align:right;color:#60a5fa;">' + t.data.bet.toLocaleString() + '</td>'
              + '<td style="text-align:right;color:#f87171;">' + t.data.win.toLocaleString() + '</td>'
              + '<td style="text-align:right;color:' + (profit >= 0 ? '#10b981' : '#ef4444') + ';font-weight:600;">' + (profit >= 0 ? '+' : '') + profit.toLocaleString() + '</td>'
              + '<td style="text-align:right;">' + profitRate + '%</td>'
              + '<td style="text-align:right;">' + returnRate + '%</td>'
              + '<td style="text-align:right;">' + userCount + '</td>'
              + '</tr>';
          });

          // 소계
          var pProfit = pBet - pWin;
          var pProfitRate = pBet > 0 ? ((pProfit / pBet) * 100).toFixed(1) : '0.0';
          var pReturnRate = pBet > 0 ? ((pWin / pBet) * 100).toFixed(1) : '0.0';
          var pUserCount = Object.keys(pUsers).length;
          rows += '<tr style="background:var(--bg2);">'
            + '<td style="text-align:center;color:var(--text2);font-weight:600;">소계</td>'
            + '<td style="text-align:right;font-weight:600;">' + pCount.toLocaleString() + '</td>'
            + '<td style="text-align:right;font-weight:600;color:#60a5fa;">' + pBet.toLocaleString() + '</td>'
            + '<td style="text-align:right;font-weight:600;color:#f87171;">' + pWin.toLocaleString() + '</td>'
            + '<td style="text-align:right;color:' + (pProfit >= 0 ? '#10b981' : '#ef4444') + ';font-weight:700;">' + (pProfit >= 0 ? '+' : '') + pProfit.toLocaleString() + '</td>'
            + '<td style="text-align:right;font-weight:600;">' + pProfitRate + '%</td>'
            + '<td style="text-align:right;font-weight:600;">' + pReturnRate + '%</td>'
            + '<td style="text-align:right;font-weight:600;">' + pUserCount + '</td>'
            + '</tr>';

          grandBet += pBet; grandWin += pWin; grandCount += pCount;
          Object.keys(pUsers).forEach(function(u) { grandUsers[u] = true; });
        });

        // ── 합계 ──
        var grandProfit = grandBet - grandWin;
        var grandProfitRate = grandBet > 0 ? ((grandProfit / grandBet) * 100).toFixed(1) : '0.0';
        var grandReturnRate = grandBet > 0 ? ((grandWin / grandBet) * 100).toFixed(1) : '0.0';
        var grandUserCount = Object.keys(grandUsers).length;
        rows += '<tr style="background:#f59e0b18;font-weight:700;border-top:2px solid #f59e0b44;">'
          + '<td colspan="2" style="color:#f59e0b;">합계</td>'
          + '<td style="text-align:right;color:#f59e0b;">' + grandCount.toLocaleString() + '</td>'
          + '<td style="text-align:right;color:#10b981;">' + grandBet.toLocaleString() + '</td>'
          + '<td style="text-align:right;color:#ef4444;">' + grandWin.toLocaleString() + '</td>'
          + '<td style="text-align:right;color:' + (grandProfit >= 0 ? '#10b981' : '#ef4444') + ';">' + (grandProfit >= 0 ? '+' : '') + grandProfit.toLocaleString() + '</td>'
          + '<td style="text-align:right;color:#60a5fa;">' + grandProfitRate + '%</td>'
          + '<td style="text-align:right;color:#a78bfa;">' + grandReturnRate + '%</td>'
          + '<td style="text-align:right;color:#f59e0b;">' + grandUserCount + '</td>'
          + '</tr>';

        tbody.innerHTML = rows;
      })
      .catch(function() { tbody.innerHTML = '<tr><td colspan="9" style="color:#f87171;text-align:center;padding:16px;">조회 실패</td></tr>'; });
  });

  bindDatePresets('stl-prov-quick', 'stl-prov-start', 'stl-prov-end', function() {
    document.getElementById('stl-prov-search').click();
  });

  // 페이지 진입 시 자동 조회
  document.getElementById('stl-prov-search').click();
}
