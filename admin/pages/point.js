// ══════════════════════════════════════
//  포인트 내역 (롤링내역 / 롤링전환내역)
// ══════════════════════════════════════

var _prLevelLabel = { admin:'관리자', head:'본사', subhead:'부본사', distributor:'총판', store:'매장', member:'회원' };
var _prLevelColor = { admin:'#8b5cf6', head:'#3b82f6', subhead:'#06b6d4', distributor:'#f59e0b', store:'#10b981', member:'#6b7280' };

// ── 롤링내역 ──
function renderPointRollingPage() {
  var el = document.getElementById('content');
  if (!el) return;
  var today = new Date().toISOString().slice(0, 10);
  var qBtn = 'background:var(--bg3);color:var(--text);border:1px solid var(--border);padding:5px 14px;border-radius:6px;font-size:0.73rem;cursor:pointer;';
  var thS = 'padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);border-right:1px solid var(--border);';

  el.innerHTML =
    '<div style="padding:16px 20px;">'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">'
    +   '<input type="text" id="pr-user-filter" placeholder="아이디 검색" style="width:150px;padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<button class="pr-quick-btn df-preset active" data-preset="today" style="' + qBtn + '">오늘</button>'
    +   '<button class="pr-quick-btn df-preset" data-preset="yesterday" style="' + qBtn + '">어제</button>'
    +   '<button class="pr-quick-btn df-preset" data-preset="week" style="' + qBtn + '">이번주</button>'
    +   '<button class="pr-quick-btn df-preset" data-preset="month" style="' + qBtn + '">이번달</button>'
    +   '<button class="pr-quick-btn df-preset" data-preset="all" style="' + qBtn + '">전체</button>'
    +   '<input type="date" id="pr-date-start" value="' + today + '" style="padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<span style="color:var(--text);">~</span>'
    +   '<input type="date" id="pr-date-end" value="' + today + '" style="padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<button id="pr-search" class="pt-action-btn pt-btn-blue" style="padding:6px 18px;font-size:0.8rem;border-radius:6px;font-weight:600;">조회</button>'
    + '</div>'
    + '<div style="overflow-x:auto;">'
    +   '<table class="db-table" style="font-size:0.78rem;border-collapse:collapse;width:100%;">'
    +     '<thead><tr style="background:var(--input-bg);font-size:0.72rem;color:var(--text);">'
    +       '<th style="' + thS + '">#</th>'
    +       '<th style="' + thS + '">시간</th>'
    +       '<th style="' + thS + '">구분</th>'
    +       '<th style="' + thS + '">아이디</th>'
    +       '<th style="' + thS + '">베팅회원</th>'
    +       '<th style="' + thS + '">게임타입</th>'
    +       '<th style="' + thS + '">게임사</th>'
    +       '<th style="' + thS + '">베팅금</th>'
    +       '<th style="' + thS + '">롤링%</th>'
    +       '<th style="' + thS + '">개별롤링금</th>'
    +       '<th style="' + thS + '">공베팅</th>'
    +       '<th style="' + thS + 'border-right:none;">누적롤링</th>'
    +     '</tr></thead>'
    +     '<tbody id="pr-tbody"><tr><td colspan="12" style="color:var(--text3);text-align:center;padding:24px;">조회 버튼을 눌러주세요.</td></tr></tbody>'
    +   '</table>'
    + '</div>'
    + '<div id="pr-pagination" style="display:flex;justify-content:center;gap:6px;margin-top:14px;"></div>'
    + '</div>';

  document.getElementById('pr-search').addEventListener('click', _prFetch);
  bindDatePresets('pr-quick-btn', 'pr-date-start', 'pr-date-end', _prFetch);

  var _prTimer = null;
  document.getElementById('pr-user-filter').addEventListener('input', function() {
    clearTimeout(_prTimer);
    _prTimer = setTimeout(_prFetch, 300);
  });

  _prFetch();
}

var _prPage = 1;
var _prPerPage = 50;

function _prFetch() {
  var startDate = document.getElementById('pr-date-start').value;
  var endDate = document.getElementById('pr-date-end').value;
  var userFilter = (document.getElementById('pr-user-filter').value || '').trim().toLowerCase();
  var tbody = document.getElementById('pr-tbody');
  tbody.innerHTML = '<tr><td colspan="12" style="color:var(--text3);text-align:center;padding:16px;"><i class="fas fa-circle-notch fa-spin"></i> 조회중...</td></tr>';

  var start = (startDate || '2020-01-01') + ' 00:00:00';
  var end = (endDate || '2099-12-31') + ' 23:59:59';

  Promise.all([
    fetch('/api/hl/transactions/local?types=bet&perPage=100000&start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end)).then(function(r) { return r.json(); }),
    fetch('/api/admin/emptybet/log').then(function(r) { return r.json(); }).catch(function() { return { data: [] }; })
  ]).then(function(results) {
    var bets = results[0].data || [];
    var ebLog = results[1].data || [];

    var ebTxIds = {};
    ebLog.forEach(function(eb) { if (eb.betTxId) ebTxIds[eb.betTxId] = eb; });

    var tree = [];
    try { tree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(e) {}

    // 벤더 분류
    function classifyVendor(tx) {
      var vendor = '';
      try { vendor = ((tx.details && tx.details.game && (tx.details.game.vendor || tx.details.game.type)) || tx.vendor || '').toLowerCase(); } catch(e) {}
      if (!vendor) return 'casino';
      if (vendor.indexOf('pragmatic') !== -1 && vendor.indexOf('pragmatic_live') === -1 && vendor.indexOf('pragmaticlive') === -1) return 'slot';
      if (vendor.indexOf('slot') !== -1 || vendor.indexOf('habanero') !== -1 || vendor.indexOf('cq9') !== -1 || vendor.indexOf('jili') !== -1 || vendor === 'pg' || vendor.indexOf('pgsoft') !== -1 || vendor.indexOf('booongo') !== -1 || vendor.indexOf('netent') !== -1 || vendor.indexOf('relax') !== -1 || vendor.indexOf('nolimit') !== -1 || vendor.indexOf('hacksaw') !== -1) return 'slot';
      return 'casino';
    }

    // 회원 → 상위 파트너 체인 찾기 (member → store → distributor → ... → admin)
    function findChain(username) {
      var chain = [];
      function search(nodes, ancestors) {
        if (!nodes) return false;
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          var current = ancestors.concat([{ id: n.id, level: n.level, rollSlot: parseFloat(n.rollSlot || 0), rollCasino: parseFloat(n.rollCasino || 0) }]);
          if (n.id === username) {
            chain = current;
            return true;
          }
          if (n.children && search(n.children, current)) return true;
        }
        return false;
      }
      search(tree, []);
      return chain;
    }

    // bet 필터
    var filtered = bets.filter(function(tx) {
      return tx.details && tx.details.game;
    });

    // 최신순 정렬
    filtered.sort(function(a, b) {
      return (b.processed_at || b.created_at || '').localeCompare(a.processed_at || a.created_at || '');
    });

    // 각 베팅 건당 파트너 체인 전체 롤링 행 생성
    var allRows = [];
    // 파트너별 누적롤링 추적 (오래된 것부터)
    var cumulativeByUser = {};
    var forCumulative = filtered.slice().reverse();
    forCumulative.forEach(function(tx) {
      var amount = Math.abs(Number(tx.amount || 0));
      var uname = '';
      if (tx.user && typeof tx.user === 'object') uname = tx.user.username || '';
      else uname = tx.username || tx.user || '';
      var gameType = classifyVendor(tx);
      var isEmpty = !!ebTxIds[tx.id];
      var chain = findChain(uname);

      // 체인의 각 노드별 개별 롤링 계산
      for (var c = 0; c < chain.length; c++) {
        var node = chain[c];
        if (node.level === 'admin') continue;
        var rollPct = gameType === 'slot' ? node.rollSlot : node.rollCasino;
        var totalRoll = isEmpty ? 0 : Math.floor(amount * rollPct / 100);

        // 하위 노드 롤링 빼기 (개별 롤링 = 내 통합롤링 - 직속하위 통합롤링)
        var subRoll = 0;
        if (c + 1 < chain.length) {
          var child = chain[c + 1];
          var childPct = gameType === 'slot' ? child.rollSlot : child.rollCasino;
          subRoll = isEmpty ? 0 : Math.floor(amount * childPct / 100);
        }
        var indivRoll = totalRoll - subRoll;

        if (!cumulativeByUser[node.id]) cumulativeByUser[node.id] = {};
        if (!cumulativeByUser[node.id][tx.id]) {
          cumulativeByUser[node.id]._total = (cumulativeByUser[node.id]._total || 0) + indivRoll;
          cumulativeByUser[node.id][tx.id] = cumulativeByUser[node.id]._total;
        }
      }
    });

    // 최신순으로 행 생성
    var num = 0;
    filtered.forEach(function(tx) {
      var amount = Math.abs(Number(tx.amount || 0));
      var uname = '';
      if (tx.user && typeof tx.user === 'object') uname = tx.user.username || '';
      else uname = tx.username || tx.user || '';
      var game = (tx.details && tx.details.game) || {};
      var gameType = classifyVendor(tx);
      var isEmpty = !!ebTxIds[tx.id];
      var chain = findChain(uname);

      var time = tx.processed_at || tx.created_at || '';
      if (time) {
        var d = new Date(time);
        time = String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
          + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
      }

      var gameLabel = gameType === 'slot' ? '<span style="color:#a78bfa;">슬롯</span>' : '<span style="color:#f59e0b;">카지노</span>';

      for (var c = 0; c < chain.length; c++) {
        var node = chain[c];
        if (node.level === 'admin') continue;
        var rollPct = gameType === 'slot' ? node.rollSlot : node.rollCasino;
        var totalRoll = isEmpty ? 0 : Math.floor(amount * rollPct / 100);
        var subRoll = 0;
        if (c + 1 < chain.length) {
          var child = chain[c + 1];
          var childPct = gameType === 'slot' ? child.rollSlot : child.rollCasino;
          subRoll = isEmpty ? 0 : Math.floor(amount * childPct / 100);
        }
        var indivRoll = totalRoll - subRoll;

        // 유저 필터: 아이디 또는 베팅회원 매칭
        if (userFilter && node.id.toLowerCase().indexOf(userFilter) === -1 && uname.toLowerCase().indexOf(userFilter) === -1) continue;

        num++;
        allRows.push({
          num: num,
          time: time,
          level: node.level,
          partnerId: node.id,
          memberName: uname,
          gameLabel: gameLabel,
          vendor: game.vendor || '-',
          betAmt: amount,
          rollPct: rollPct,
          indivRoll: indivRoll,
          isEmpty: isEmpty,
          cumulative: (cumulativeByUser[node.id] && cumulativeByUser[node.id][tx.id]) || 0
        });
      }
    });

    // 페이징
    var totalPages = Math.ceil(allRows.length / _prPerPage);
    var pageRows = allRows.slice((_prPage - 1) * _prPerPage, _prPage * _prPerPage);

    if (!pageRows.length) {
      tbody.innerHTML = '<tr><td colspan="12" style="color:var(--text3);text-align:center;padding:24px;">롤링 내역이 없습니다.</td></tr>';
      document.getElementById('pr-pagination').innerHTML = '';
      return;
    }

    var tdS = 'padding:8px 6px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);';
    var tdR = tdS + 'text-align:right;';
    tbody.innerHTML = pageRows.map(function(r) {
      var lvlColor = _prLevelColor[r.level] || '#888';
      var lvlLabel = _prLevelLabel[r.level] || r.level;
      var badge = '<span style="background:' + lvlColor + ';color:#fff;padding:2px 8px;border-radius:3px;font-size:0.65rem;font-weight:600;white-space:nowrap;">' + lvlLabel + '</span>';
      var emptyBadge = r.isEmpty
        ? '<span style="background:rgba(245,158,11,0.2);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:700;">공</span>'
        : '';
      return '<tr style="color:var(--text);">'
        + '<td style="' + tdS + 'text-align:center;">' + r.num + '</td>'
        + '<td style="' + tdS + 'white-space:nowrap;font-size:0.76rem;">' + r.time + '</td>'
        + '<td style="' + tdS + 'text-align:center;">' + badge + '</td>'
        + '<td style="' + tdS + 'font-weight:600;color:' + lvlColor + ';">' + r.partnerId + '</td>'
        + '<td style="' + tdS + 'color:var(--text3);">' + r.memberName + '</td>'
        + '<td style="' + tdS + 'text-align:center;">' + r.gameLabel + '</td>'
        + '<td style="' + tdS + 'font-size:0.76rem;">' + r.vendor + '</td>'
        + '<td style="' + tdR + 'color:#ef4444;font-weight:600;">' + r.betAmt.toLocaleString() + '</td>'
        + '<td style="' + tdR + 'color:#60a5fa;">' + r.rollPct.toFixed(1) + '%</td>'
        + '<td style="' + tdR + 'color:#4ade80;font-weight:600;">' + r.indivRoll.toLocaleString() + '</td>'
        + '<td style="' + tdS + 'text-align:center;">' + emptyBadge + '</td>'
        + '<td style="' + tdR + 'color:#a78bfa;font-weight:600;border-right:none;">' + r.cumulative.toLocaleString() + '</td>'
        + '</tr>';
    }).join('');

    // 페이지네이션
    if (totalPages > 1) {
      var pagHtml = '';
      for (var p = 1; p <= totalPages; p++) {
        pagHtml += '<button class="pr-page-btn" data-page="' + p + '" style="padding:4px 10px;border-radius:4px;border:1px solid var(--border);background:' + (p === _prPage ? '#6366f1' : 'var(--bg3)') + ';color:' + (p === _prPage ? '#fff' : 'var(--text)') + ';font-size:0.72rem;cursor:pointer;">' + p + '</button>';
      }
      document.getElementById('pr-pagination').innerHTML = pagHtml;
      document.querySelectorAll('.pr-page-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          _prPage = parseInt(this.dataset.page, 10);
          _prFetch();
        });
      });
    } else {
      document.getElementById('pr-pagination').innerHTML = '';
    }
  }).catch(function(e) {
    tbody.innerHTML = '<tr><td colspan="12" style="color:#f87171;text-align:center;padding:16px;">조회 실패: ' + (e.message || e) + '</td></tr>';
  });
}

// ── 롤링전환내역 ──
function renderPointConvertPage() {
  var el = document.getElementById('content');
  if (!el) return;
  var today = new Date().toISOString().slice(0, 10);
  var qBtn = 'background:var(--bg3);color:var(--text);border:1px solid var(--border);padding:5px 14px;border-radius:6px;font-size:0.73rem;cursor:pointer;';

  el.innerHTML =
    '<div style="padding:16px 20px;">'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">'
    +   '<input type="text" id="pc-user-filter" placeholder="아이디 검색" style="width:150px;padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<button class="pc-quick-btn df-preset active" data-preset="today" style="' + qBtn + '">오늘</button>'
    +   '<button class="pc-quick-btn df-preset" data-preset="yesterday" style="' + qBtn + '">어제</button>'
    +   '<button class="pc-quick-btn df-preset" data-preset="week" style="' + qBtn + '">이번주</button>'
    +   '<button class="pc-quick-btn df-preset" data-preset="month" style="' + qBtn + '">이번달</button>'
    +   '<button class="pc-quick-btn df-preset" data-preset="all" style="' + qBtn + '">전체</button>'
    +   '<input type="date" id="pc-date-start" value="' + today + '" style="padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<span style="color:var(--text);">~</span>'
    +   '<input type="date" id="pc-date-end" value="' + today + '" style="padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<button id="pc-search" class="pt-action-btn pt-btn-blue" style="padding:6px 18px;font-size:0.8rem;border-radius:6px;font-weight:600;">조회</button>'
    + '</div>'
    + '<div style="overflow-x:auto;">'
    +   '<table class="db-table" style="font-size:0.78rem;border-collapse:collapse;width:100%;">'
    +     '<thead><tr style="background:var(--input-bg);font-size:0.72rem;color:var(--text);">'
    +       '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);border-right:1px solid var(--border);">#</th>'
    +       '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);border-right:1px solid var(--border);">시간</th>'
    +       '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);border-right:1px solid var(--border);">아이디</th>'
    +       '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);border-right:1px solid var(--border);">전환금액</th>'
    +       '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);border-right:1px solid var(--border);">전환 전 롤링</th>'
    +       '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);border-right:1px solid var(--border);">전환 후 롤링</th>'
    +       '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);border-right:1px solid var(--border);">전환 전 머니</th>'
    +       '<th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);">전환 후 머니</th>'
    +     '</tr></thead>'
    +     '<tbody id="pc-tbody"><tr><td colspan="8" style="color:var(--text3);text-align:center;padding:24px;">조회 버튼을 눌러주세요.</td></tr></tbody>'
    +   '</table>'
    + '</div>'
    + '<div id="pc-pagination" style="display:flex;justify-content:center;gap:6px;margin-top:14px;"></div>'
    + '</div>';

  document.getElementById('pc-search').addEventListener('click', _pcFetch);
  bindDatePresets('pc-quick-btn', 'pc-date-start', 'pc-date-end', _pcFetch);

  var _pcTimer = null;
  document.getElementById('pc-user-filter').addEventListener('input', function() {
    clearTimeout(_pcTimer);
    _pcTimer = setTimeout(_pcFetch, 300);
  });

  _pcFetch();
}

var _pcPage = 1;
var _pcPerPage = 50;

function _pcFetch() {
  var startDate = document.getElementById('pc-date-start').value;
  var endDate = document.getElementById('pc-date-end').value;
  var userFilter = (document.getElementById('pc-user-filter').value || '').trim().toLowerCase();
  var tbody = document.getElementById('pc-tbody');
  tbody.innerHTML = '<tr><td colspan="8" style="color:var(--text3);text-align:center;padding:16px;"><i class="fas fa-circle-notch fa-spin"></i> 조회중...</td></tr>';

  // 서버에서 조회 + localStorage 폴백 병합
  fetch('/api/admin/money-logs/rolling-convert')
    .then(function(r){ return r.json(); })
    .then(function(serverLogs) {
      if(!Array.isArray(serverLogs)) serverLogs = [];
      // localStorage 기존 데이터도 병합 (마이그레이션 호환)
      var localLogs = [];
      try {
        var partnerLog = JSON.parse(localStorage.getItem('partnerMoneyLog') || '[]');
        localLogs = localLogs.concat(partnerLog.filter(function(l) { return l.type === 'rolling-convert' || l.type === '롤링전환'; }));
      } catch(e) {}
      try {
        var adminLog = JSON.parse(localStorage.getItem('adminMoneyLog') || '[]');
        localLogs = localLogs.concat(adminLog.filter(function(l) { return l.type === 'rolling-convert' || l.type === '롤링전환'; }));
      } catch(e) {}
      // 서버 로그 우선, 중복 제거 (datetime+target 기준)
      var seen = {};
      serverLogs.forEach(function(l){ seen[(l.datetime||'')+'_'+(l.target||l.username||'')] = true; });
      localLogs.forEach(function(l){ var key = (l.datetime||'')+'_'+(l.target||l.username||''); if(!seen[key]) serverLogs.push(l); });
      _pcRender(serverLogs, startDate, endDate, userFilter);
    })
    .catch(function() {
      // 서버 실패 시 localStorage 폴백
      var logs = [];
      try {
        var partnerLog = JSON.parse(localStorage.getItem('partnerMoneyLog') || '[]');
        logs = logs.concat(partnerLog.filter(function(l) { return l.type === 'rolling-convert' || l.type === '롤링전환'; }));
      } catch(e) {}
      try {
        var adminLog = JSON.parse(localStorage.getItem('adminMoneyLog') || '[]');
        logs = logs.concat(adminLog.filter(function(l) { return l.type === 'rolling-convert' || l.type === '롤링전환'; }));
      } catch(e) {}
      _pcRender(logs, startDate, endDate, userFilter);
    });
}

function _pcRender(logs, startDate, endDate, userFilter) {
  var tbody = document.getElementById('pc-tbody');
  if(!tbody) return;

  var filtered = logs.filter(function(l) {
    var date = (l.datetime || '').slice(0, 10);
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    if (userFilter) {
      var target = (l.target || l.username || '').toLowerCase();
      if (target.indexOf(userFilter) === -1) return false;
    }
    return true;
  });

  filtered.sort(function(a, b) { return (b.datetime || '').localeCompare(a.datetime || ''); });

  var totalPages = Math.ceil(filtered.length / _pcPerPage);
  var pageRows = filtered.slice((_pcPage - 1) * _pcPerPage, _pcPage * _pcPerPage);

  if (!pageRows.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="color:var(--text3);text-align:center;padding:24px;">롤링전환 내역이 없습니다.</td></tr>';
    document.getElementById('pc-pagination').innerHTML = '';
    return;
  }

  var tdS = 'padding:8px 6px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);';
  var tdR = tdS + 'text-align:right;';
  tbody.innerHTML = pageRows.map(function(l, i) {
    var time = (l.datetime || '').replace('T', ' ').slice(0, 19);
    var username = l.target || l.username || '-';
    var amount = Math.abs(Number(l.amount || 0));

    return '<tr style="color:var(--text);">'
      + '<td style="' + tdS + 'text-align:center;">' + ((_pcPage - 1) * _pcPerPage + i + 1) + '</td>'
      + '<td style="' + tdS + 'white-space:nowrap;font-size:0.76rem;">' + time + '</td>'
      + '<td style="' + tdS + 'color:#f59e0b;font-weight:600;">' + username + '</td>'
      + '<td style="' + tdR + 'color:#4ade80;font-weight:600;">' + amount.toLocaleString() + '</td>'
      + '<td style="' + tdR + '">' + (l.beforeRolling != null ? l.beforeRolling.toLocaleString() : '-') + '</td>'
      + '<td style="' + tdR + '">' + (l.afterRolling != null ? l.afterRolling.toLocaleString() : '-') + '</td>'
      + '<td style="' + tdR + '">' + (l.beforeMoney != null ? l.beforeMoney.toLocaleString() : '-') + '</td>'
      + '<td style="' + tdR + 'border-right:none;">' + (l.afterMoney != null ? l.afterMoney.toLocaleString() : '-') + '</td>'
      + '</tr>';
  }).join('');

  if (totalPages > 1) {
    var pagHtml = '';
    for (var p = 1; p <= totalPages; p++) {
      pagHtml += '<button class="pc-page-btn" data-page="' + p + '" style="padding:4px 10px;border-radius:4px;border:1px solid var(--border);background:' + (p === _pcPage ? '#6366f1' : 'var(--bg3)') + ';color:' + (p === _pcPage ? '#fff' : 'var(--text)') + ';font-size:0.72rem;cursor:pointer;">' + p + '</button>';
    }
    document.getElementById('pc-pagination').innerHTML = pagHtml;
    document.querySelectorAll('.pc-page-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _pcPage = parseInt(this.dataset.page, 10);
        _pcFetch();
      });
    });
  } else {
    document.getElementById('pc-pagination').innerHTML = '';
  }
}

// ══════════════════════════════════════
//  포인트 지급/회수 내역
// ══════════════════════════════════════
var _pgData = [];
var _pgPage = 1;
var _pgPerPage = 30;

function renderPointGivePage() {
  var el = document.getElementById('content');
  if (!el) return;
  var today = new Date().toISOString().slice(0, 10);
  var qBtn = 'background:var(--bg3);color:var(--text);border:1px solid var(--border);padding:5px 14px;border-radius:6px;font-size:0.73rem;cursor:pointer;';
  var thS = 'padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);border-right:1px solid var(--border);';

  el.innerHTML =
    '<div style="padding:16px 20px;">'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">'
    +   '<input type="text" id="pg-user-filter" placeholder="아이디 검색" style="width:150px;padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<select id="pg-type-filter" style="padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +     '<option value="">전체</option><option value="give">지급</option><option value="take">회수</option>'
    +   '</select>'
    +   '<button class="pg-quick-btn df-preset active" data-preset="today" style="' + qBtn + '">오늘</button>'
    +   '<button class="pg-quick-btn df-preset" data-preset="yesterday" style="' + qBtn + '">어제</button>'
    +   '<button class="pg-quick-btn df-preset" data-preset="week" style="' + qBtn + '">이번주</button>'
    +   '<button class="pg-quick-btn df-preset" data-preset="month" style="' + qBtn + '">이번달</button>'
    +   '<button class="pg-quick-btn df-preset" data-preset="all" style="' + qBtn + '">전체</button>'
    +   '<input type="date" id="pg-date-start" value="' + today + '" style="padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<span style="color:var(--text);">~</span>'
    +   '<input type="date" id="pg-date-end" value="' + today + '" style="padding:6px 10px;font-size:0.8rem;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);">'
    +   '<button id="pg-search" class="pt-action-btn pt-btn-blue" style="padding:6px 18px;font-size:0.8rem;border-radius:6px;font-weight:600;">조회</button>'
    + '</div>'
    + '<div style="overflow-x:auto;">'
    +   '<table class="db-table" style="font-size:0.78rem;border-collapse:collapse;width:100%;">'
    +     '<thead><tr style="background:var(--input-bg);font-size:0.72rem;color:var(--text);">'
    +       '<th style="' + thS + '">#</th>'
    +       '<th style="' + thS + '">시간</th>'
    +       '<th style="' + thS + '">구분</th>'
    +       '<th style="' + thS + '">처리자</th>'
    +       '<th style="' + thS + '">대상</th>'
    +       '<th style="' + thS + '">닉네임</th>'
    +       '<th style="' + thS + '">금액</th>'
    +       '<th style="' + thS + '">변동전</th>'
    +       '<th style="' + thS + '">변동후</th>'
    +       '<th style="' + thS + 'border-right:none;">메모</th>'
    +     '</tr></thead>'
    +     '<tbody id="pg-tbody"><tr><td colspan="10" style="color:var(--text3);text-align:center;padding:24px;">조회 버튼을 눌러주세요.</td></tr></tbody>'
    +   '</table>'
    + '</div>'
    + '<div id="pg-pagination" style="display:flex;justify-content:center;gap:6px;margin-top:14px;"></div>'
    + '</div>';

  document.getElementById('pg-search').addEventListener('click', _pgFetch);
  bindDatePresets('pg-quick-btn', 'pg-date-start', 'pg-date-end', _pgFetch);

  var _pgTimer = null;
  document.getElementById('pg-user-filter').addEventListener('input', function() {
    clearTimeout(_pgTimer);
    _pgTimer = setTimeout(_pgFetch, 300);
  });
  document.getElementById('pg-type-filter').addEventListener('change', _pgFetch);

  _pgFetch();
}

function _pgFetch() {
  _pgPage = 1;
  adminFetch('/api/admin/money-logs/point')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var logs = Array.isArray(res) ? res : (res.data || []);
      var uf = (document.getElementById('pg-user-filter').value || '').trim().toLowerCase();
      var tf = document.getElementById('pg-type-filter').value;
      var ds = document.getElementById('pg-date-start').value;
      var de = document.getElementById('pg-date-end').value;

      _pgData = logs.filter(function(l) {
        if (uf && !(l.targetId || '').toLowerCase().includes(uf) && !(l.processor || '').toLowerCase().includes(uf)) return false;
        if (tf && l.type !== tf) return false;
        var dt = (l.datetime || '').slice(0, 10);
        if (ds && dt < ds) return false;
        if (de && dt > de) return false;
        return true;
      });
      _pgRender();
    }).catch(function() { _pgData = []; _pgRender(); });
}

function _pgRender() {
  var tbody = document.getElementById('pg-tbody');
  if (!tbody) return;
  var tdS = 'padding:8px 6px;text-align:center;border-bottom:1px solid var(--border);border-right:1px solid var(--border);white-space:nowrap;';

  if (_pgData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="color:var(--text3);text-align:center;padding:24px;">데이터가 없습니다.</td></tr>';
    document.getElementById('pg-pagination').innerHTML = '';
    return;
  }

  var totalPages = Math.ceil(_pgData.length / _pgPerPage);
  if (_pgPage > totalPages) _pgPage = totalPages;
  var start = (_pgPage - 1) * _pgPerPage;
  var page = _pgData.slice(start, start + _pgPerPage);

  tbody.innerHTML = page.map(function(l, i) {
    var isGive = l.type === 'give';
    var typeLabel = isGive ? '지급' : '회수';
    var typeColor = isGive ? '#4ade80' : '#f87171';
    var dt = l.datetime || '';
    if (dt instanceof Date) dt = dt.toISOString().replace('T', ' ').slice(0, 19);
    return '<tr>'
      + '<td style="' + tdS + '">' + (start + i + 1) + '</td>'
      + '<td style="' + tdS + 'font-size:0.72rem;">' + dt + '</td>'
      + '<td style="' + tdS + 'color:' + typeColor + ';font-weight:600;">' + typeLabel + '</td>'
      + '<td style="' + tdS + '">' + (l.processor || '-') + '</td>'
      + '<td style="' + tdS + '">' + (l.targetId || '-') + '</td>'
      + '<td style="' + tdS + '">' + (l.targetNick || '-') + '</td>'
      + '<td style="' + tdS + 'color:' + typeColor + ';font-weight:600;">' + (isGive ? '+' : '-') + Number(l.amount || 0).toLocaleString() + '</td>'
      + '<td style="' + tdS + '">' + Number(l.before || 0).toLocaleString() + '</td>'
      + '<td style="' + tdS + '">' + Number(l.after || 0).toLocaleString() + '</td>'
      + '<td style="' + tdS + 'border-right:none;text-align:left;max-width:200px;overflow:hidden;text-overflow:ellipsis;">' + (l.memo || '-') + '</td>'
      + '</tr>';
  }).join('');

  if (totalPages > 1) {
    var pagHtml = '';
    for (var p = 1; p <= totalPages; p++) {
      pagHtml += '<button class="pg-page-btn" data-page="' + p + '" style="padding:4px 10px;border-radius:4px;border:1px solid var(--border);background:' + (p === _pgPage ? '#6366f1' : 'var(--bg3)') + ';color:' + (p === _pgPage ? '#fff' : 'var(--text)') + ';font-size:0.72rem;cursor:pointer;">' + p + '</button>';
    }
    document.getElementById('pg-pagination').innerHTML = pagHtml;
    document.querySelectorAll('.pg-page-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _pgPage = parseInt(this.dataset.page, 10);
        _pgRender();
      });
    });
  } else {
    document.getElementById('pg-pagination').innerHTML = '';
  }
}
