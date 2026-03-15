// ══════════════════════════════════════
//  머니 내역 페이지
// ══════════════════════════════════════

// ── 서버 기반 로그 스토리지 ──
var _moneyLogCache = { admin: [], partner: [], user: [], point: [] };

function _fetchMoneyLog(type, callback) {
  fetch('/api/admin/money-logs/' + type)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _moneyLogCache[type] = Array.isArray(data) ? data : [];
      if (callback) callback(_moneyLogCache[type]);
    })
    .catch(function() {
      if (callback) callback(_moneyLogCache[type] || []);
    });
}

function _postMoneyLog(type, entry) {
  fetch('/api/admin/money-logs/' + type, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  }).catch(function() {});
}

function loadAdminMoneyLog()   { return _moneyLogCache.admin || []; }
function loadPartnerMoneyLog() { return _moneyLogCache.partner || []; }
function loadUserMoneyLog()    { return _moneyLogCache.user || []; }
function loadPartnerPointLog() { return _moneyLogCache.point || []; }

function addAdminMoneyLog(entry) {
  _moneyLogCache.admin = _moneyLogCache.admin || [];
  _moneyLogCache.admin.unshift(entry);
  if (_moneyLogCache.admin.length > 2000) _moneyLogCache.admin = _moneyLogCache.admin.slice(0, 2000);
  _postMoneyLog('admin', entry);
}

function addPartnerMoneyLog(entry) {
  _moneyLogCache.partner = _moneyLogCache.partner || [];
  _moneyLogCache.partner.unshift(entry);
  if (_moneyLogCache.partner.length > 2000) _moneyLogCache.partner = _moneyLogCache.partner.slice(0, 2000);
  _postMoneyLog('partner', entry);
}

function addUserMoneyLog(entry) {
  _moneyLogCache.user = _moneyLogCache.user || [];
  _moneyLogCache.user.unshift(entry);
  if (_moneyLogCache.user.length > 2000) _moneyLogCache.user = _moneyLogCache.user.slice(0, 2000);
  _postMoneyLog('user', entry);
}

function addPartnerPointLog(entry) {
  _moneyLogCache.point = _moneyLogCache.point || [];
  _moneyLogCache.point.unshift(entry);
  if (_moneyLogCache.point.length > 2000) _moneyLogCache.point = _moneyLogCache.point.slice(0, 2000);
  _postMoneyLog('point', entry);
}

// ── 날짜 포맷 헬퍼 ──
function nowStr() {
  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())
    +' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}

// ── 공통 테이블 렌더 ──
function _buildHierarchyHtml(log) {
  var labels = { admin:'관리자', head:'본사', subhead:'부본사', distributor:'총판', store:'매장', member:'회원' };
  var colors = { admin:'#8b5cf6', head:'#3b82f6', subhead:'#06b6d4', distributor:'#f59e0b', store:'#10b981', member:'#6b7280' };
  var pLevel = log.processorLevel;
  var pLabel = pLevel ? (labels[pLevel] || pLevel) : null;
  var pColor = pLevel ? (colors[pLevel] || '#888') : '#60a5fa';
  if(!pLabel) {
    var pInfo = _getPartnerLevelLabel(log.processor);
    if(pInfo) { pLabel = pInfo.label; pColor = pInfo.color; }
    else { pLabel = log.processor || '-'; }
  }
  var tLevel = log.targetLevel;
  var tLabel = tLevel ? (labels[tLevel] || tLevel) : null;
  var tColor = tLevel ? (colors[tLevel] || '#888') : '#f59e0b';
  if(!tLabel) {
    var tInfo = _getPartnerLevelLabel(log.targetId);
    if(tInfo) { tLabel = tInfo.label; tColor = tInfo.color; }
    else { tLabel = ''; }
  }
  var html = '<span style="color:'+pColor+';font-weight:600;">'+pLabel+'</span>';
  if(tLabel) html += '<span style="color:#555;margin:0 4px;">→</span><span style="color:'+tColor+';font-weight:600;">'+tLabel+'</span>';
  return html;
}

function buildMoneyLogTable(logs, emptyMsg) {
  if(!logs || logs.length === 0) {
    return '<tr><td colspan="9" style="color:#888;padding:24px;text-align:center;">'+emptyMsg+'</td></tr>';
  }
  return logs.map(function(log, i) {
    var typeLabel = log.type === 'give' ? '<span style="color:#4ade80;">지급</span>' : '<span style="color:#f87171;">회수</span>';
    var amountColor = log.type === 'give' ? '#4ade80' : '#f87171';
    var amountSign  = log.type === 'give' ? '+' : '-';
    return '<tr>'
      + '<td style="color:#888;">'+(i+1)+'</td>'
      + '<td style="font-size:0.75rem;white-space:nowrap;">'+log.datetime+'</td>'
      + '<td>'+typeLabel+'</td>'
      + '<td style="font-size:0.75rem;white-space:nowrap;">'+_buildHierarchyHtml(log)+'</td>'
      + '<td style="color:#f59e0b;font-weight:600;">'+( log.targetId   || '-' )+'</td>'
      + '<td style="color:#aaa;">'+( log.targetNick || '-' )+'</td>'
      + '<td style="text-align:right;color:'+amountColor+';font-weight:700;">'+amountSign+(log.amount||0).toLocaleString()+'</td>'
      + '<td style="text-align:right;font-size:0.78rem;white-space:nowrap;">'
      +   '<span style="color:#60a5fa;">'+(log.before||0).toLocaleString()+'</span>'
      +   '<span style="color:#666;margin:0 4px;">→</span>'
      +   '<span style="color:#f59e0b;">'+(log.after||0).toLocaleString()+'</span>'
      + '</td>'
      + '<td style="color:#888;font-size:0.75rem;">'+( log.memo || '' )+'</td>'
      + '</tr>';
  }).join('');
}

// ── 관리자머니 변동내역 ──
function renderMoneyAdminPage() {
  _fetchMoneyLog('admin', function(logs) {
    _renderMoneyAdminInner(logs);
  });
}
function _renderMoneyAdminInner(logs) {
  var today = _dfLocalDate(new Date());

  document.getElementById('content').innerHTML = `
    <div class="pt-wrap">
      <div class="date-filter-bar">
        <div class="df-search-box" style="flex:0 0 200px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="ma-search" placeholder="회원ID / 닉네임 검색"></div>
        <select class="pt-create-select" id="ma-type" style="width:100px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:5px 8px;font-size:0.72rem;">
          <option value="">전체</option>
          <option value="give">지급</option>
          <option value="take">회수</option>
        </select>
        <button class="df-preset active ma-preset" data-preset="today">오늘</button>
        <button class="df-preset ma-preset" data-preset="yesterday">어제</button>
        <button class="df-preset ma-preset" data-preset="week">이번주</button>
        <button class="df-preset ma-preset" data-preset="month">이번달</button>
        <button class="df-preset ma-preset" data-preset="all">전체</button>
        <div class="df-date-range">
          <input type="date" id="ma-from" value="${today}">
          <span style="color:#64748b;font-size:0.72rem;">~</span>
          <input type="date" id="ma-to" value="${today}">
          <button class="df-query-btn" id="ma-search-btn">조회</button>
        </div>
      </div>
      <div class="db-section" style="margin-bottom:0;overflow-x:auto;">
        <table class="db-table" style="font-size:0.8rem;">
          <thead>
            <tr>
              <th>#</th>
              <th>일시</th>
              <th>구분</th>
              <th>처리 파트너</th>
              <th>대상ID</th>
              <th>닉네임</th>
              <th style="text-align:right;">금액</th>
              <th style="text-align:right;">처리전 → 처리후</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody id="ma-tbody">
            ${buildMoneyLogTable(logs, '관리자 머니 변동 내역이 없습니다.')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:0.78rem;color:var(--text2);">
        총 <b style="color:var(--text);">${logs.length}</b> 건
      </div>
    </div>
  `;

  function maSearch() {
    var keyword = document.getElementById('ma-search').value.trim().toLowerCase();
    var type    = document.getElementById('ma-type').value;
    var from    = document.getElementById('ma-from').value;
    var to      = document.getElementById('ma-to').value;
    var filtered = loadAdminMoneyLog().filter(function(log) {
      if(type && log.type !== type) return false;
      if(keyword && !(log.targetId||'').toLowerCase().includes(keyword)
                 && !(log.targetNick||'').toLowerCase().includes(keyword)) return false;
      if(from && log.datetime < from) return false;
      if(to   && log.datetime > to+' 99') return false;
      return true;
    });
    document.getElementById('ma-tbody').innerHTML = buildMoneyLogTable(filtered, '검색 결과가 없습니다.');
  }
  document.getElementById('ma-search-btn').addEventListener('click', maSearch);
  bindDatePresets('ma-preset', 'ma-from', 'ma-to', maSearch);
  var _maTimer = null;
  document.getElementById('ma-search').addEventListener('input', function() {
    clearTimeout(_maTimer); _maTimer = setTimeout(maSearch, 300);
  });
  document.getElementById('ma-type').addEventListener('change', maSearch);
}

// ── 파트너머니 변동내역 ──
function _filterPartnerOnlyLogs(logs) {
  return logs.filter(function(log) {
    if(log.processorLevel === 'admin' || log.processor === '관리자' || log.processor === '시스템') return false;
    return true;
  });
}
function renderMoneyPartnerPage() {
  _fetchMoneyLog('partner', function(logs) {
    _renderMoneyPartnerInner(_filterPartnerOnlyLogs(logs));
  });
}
function _renderMoneyPartnerInner(logs) {
  var today = _dfLocalDate(new Date());

  document.getElementById('content').innerHTML = `
    <div class="pt-wrap">
      <div class="date-filter-bar">
        <div class="df-search-box" style="flex:0 0 200px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="mp-search" placeholder="파트너ID / 대상ID 검색"></div>
        <select class="pt-create-select" id="mp-type" style="width:100px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:5px 8px;font-size:0.72rem;">
          <option value="">전체</option>
          <option value="give">지급</option>
          <option value="take">회수</option>
        </select>
        <button class="df-preset active mp-preset" data-preset="today">오늘</button>
        <button class="df-preset mp-preset" data-preset="yesterday">어제</button>
        <button class="df-preset mp-preset" data-preset="week">이번주</button>
        <button class="df-preset mp-preset" data-preset="month">이번달</button>
        <button class="df-preset mp-preset" data-preset="all">전체</button>
        <div class="df-date-range">
          <input type="date" id="mp-from" value="${today}">
          <span style="color:#64748b;font-size:0.72rem;">~</span>
          <input type="date" id="mp-to" value="${today}">
          <button class="df-query-btn" id="mp-search-btn">조회</button>
        </div>
      </div>
      <div class="db-section" style="margin-bottom:0;overflow-x:auto;">
        <table class="db-table" style="font-size:0.8rem;">
          <thead>
            <tr>
              <th>#</th>
              <th>일시</th>
              <th>구분</th>
              <th>처리 파트너</th>
              <th>대상ID</th>
              <th>닉네임</th>
              <th style="text-align:right;">금액</th>
              <th style="text-align:right;">처리전 → 처리후</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody id="mp-tbody">
            ${buildPartnerLogTable(logs, '파트너 머니 변동 내역이 없습니다.')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:0.78rem;color:var(--text2);">
        총 <b style="color:var(--text);">${logs.length}</b> 건
      </div>
    </div>
  `;

  function mpSearch() {
    var keyword = document.getElementById('mp-search').value.trim().toLowerCase();
    var type    = document.getElementById('mp-type').value;
    var from    = document.getElementById('mp-from').value;
    var to      = document.getElementById('mp-to').value;
    var filtered = _filterPartnerOnlyLogs(loadPartnerMoneyLog()).filter(function(log) {
      if(type && log.type !== type) return false;
      if(keyword && !(log.processor||'').toLowerCase().includes(keyword)
                 && !(log.targetId||'').toLowerCase().includes(keyword)) return false;
      if(from && log.datetime < from) return false;
      if(to   && log.datetime > to+' 99') return false;
      return true;
    });
    document.getElementById('mp-tbody').innerHTML = buildPartnerLogTable(filtered, '검색 결과가 없습니다.');
  }
  document.getElementById('mp-search-btn').addEventListener('click', mpSearch);
  bindDatePresets('mp-preset', 'mp-from', 'mp-to', mpSearch);
  var _mpTimer = null;
  document.getElementById('mp-search').addEventListener('input', function() {
    clearTimeout(_mpTimer); _mpTimer = setTimeout(mpSearch, 300);
  });
  document.getElementById('mp-type').addEventListener('change', mpSearch);
}

// ── 유저머니 지급/차감 ──
function renderMoneyUserPage() {
  _fetchMoneyLog('user', function(logs) {
    _renderMoneyUserInner(logs);
  });
}
function _renderMoneyUserInner(logs) {
  var today = _dfLocalDate(new Date());

  document.getElementById('content').innerHTML =
    '<div class="pt-wrap">'
    + '<div class="date-filter-bar">'
    +   '<div class="df-search-box" style="flex:0 0 200px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="mu-search" placeholder="유저ID / 닉네임 검색"></div>'
    +   '<select class="pt-create-select" id="mu-type" style="width:100px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:5px 8px;font-size:0.72rem;">'
    +     '<option value="">전체</option>'
    +     '<option value="give">지급</option>'
    +     '<option value="take">차감</option>'
    +   '</select>'
    +   '<button class="df-preset active mu-preset" data-preset="today">오늘</button>'
    +   '<button class="df-preset mu-preset" data-preset="yesterday">어제</button>'
    +   '<button class="df-preset mu-preset" data-preset="week">이번주</button>'
    +   '<button class="df-preset mu-preset" data-preset="month">이번달</button>'
    +   '<button class="df-preset mu-preset" data-preset="all">전체</button>'
    +   '<div class="df-date-range">'
    +     '<input type="date" id="mu-from" value="' + today + '">'
    +     '<span style="color:#64748b;font-size:0.72rem;">~</span>'
    +     '<input type="date" id="mu-to" value="' + today + '">'
    +     '<button class="df-query-btn" id="mu-search-btn">조회</button>'
    +   '</div>'
    + '</div>'
    + '<div class="db-section" style="margin-bottom:0;overflow-x:auto;">'
    +   '<table class="db-table" style="font-size:0.8rem;">'
    +     '<thead><tr>'
    +       '<th>#</th><th>일시</th><th>구분</th><th>처리 파트너</th><th>유저ID</th><th>닉네임</th>'
    +       '<th style="text-align:right;">금액</th><th style="text-align:right;">처리전 → 처리후</th><th>메모</th>'
    +     '</tr></thead>'
    +     '<tbody id="mu-tbody">' + buildUserLogTable(logs, '유저머니 변동 내역이 없습니다.') + '</tbody>'
    +   '</table>'
    + '</div>'
    + '<div style="margin-top:10px;font-size:0.78rem;color:var(--text2);">총 <b style="color:var(--text);">' + logs.length + '</b> 건</div>'
    + '</div>';

  function muSearch() {
    var keyword = document.getElementById('mu-search').value.trim().toLowerCase();
    var type    = document.getElementById('mu-type').value;
    var from    = document.getElementById('mu-from').value;
    var to      = document.getElementById('mu-to').value;
    var filtered = loadUserMoneyLog().filter(function(log) {
      if(type && log.type !== type) return false;
      if(keyword && !(log.targetId||'').toLowerCase().includes(keyword)
                 && !(log.targetNick||'').toLowerCase().includes(keyword)) return false;
      if(from && log.datetime < from) return false;
      if(to   && log.datetime > to+' 99') return false;
      return true;
    });
    document.getElementById('mu-tbody').innerHTML = buildUserLogTable(filtered, '검색 결과가 없습니다.');
  }
  document.getElementById('mu-search-btn').addEventListener('click', muSearch);
  bindDatePresets('mu-preset', 'mu-from', 'mu-to', muSearch);
  var _muTimer = null;
  document.getElementById('mu-search').addEventListener('input', function() {
    clearTimeout(_muTimer); _muTimer = setTimeout(muSearch, 300);
  });
  document.getElementById('mu-type').addEventListener('change', muSearch);
}

function buildUserLogTable(logs, emptyMsg) {
  if(!logs || logs.length === 0) {
    return '<tr><td colspan="9" style="color:#888;padding:24px;text-align:center;">'+emptyMsg+'</td></tr>';
  }
  return logs.map(function(log, i) {
    var typeLabel = log.type === 'give' ? '<span style="color:#4ade80;">지급</span>' : '<span style="color:#f87171;">차감</span>';
    var amountColor = log.type === 'give' ? '#4ade80' : '#f87171';
    var amountSign  = log.type === 'give' ? '+' : '-';
    return '<tr>'
      + '<td style="color:#888;">'+(i+1)+'</td>'
      + '<td style="font-size:0.75rem;white-space:nowrap;">'+log.datetime+'</td>'
      + '<td>'+typeLabel+'</td>'
      + '<td style="font-size:0.75rem;white-space:nowrap;">'+_buildHierarchyHtml(log)+'</td>'
      + '<td style="color:#f59e0b;font-weight:600;">'+( log.targetId || '-' )+'</td>'
      + '<td style="color:#aaa;">'+( log.targetNick || '-' )+'</td>'
      + '<td style="text-align:right;color:'+amountColor+';font-weight:700;">'+amountSign+(log.amount||0).toLocaleString()+'</td>'
      + '<td style="text-align:right;font-size:0.78rem;white-space:nowrap;">'
      +   '<span style="color:#60a5fa;">'+(log.before||0).toLocaleString()+'</span>'
      +   '<span style="color:#666;margin:0 4px;">&rarr;</span>'
      +   '<span style="color:#f59e0b;">'+(log.after||0).toLocaleString()+'</span>'
      + '</td>'
      + '<td style="color:#888;font-size:0.75rem;">'+( log.memo || '' )+'</td>'
      + '</tr>';
  }).join('');
}

function _getPartnerLevelLabel(id) {
  var labels = { admin:'관리자', head:'본사', subhead:'부본사', distributor:'총판', store:'매장', member:'회원' };
  var colors = { admin:'#8b5cf6', head:'#3b82f6', subhead:'#06b6d4', distributor:'#f59e0b', store:'#10b981', member:'#6b7280' };
  if(id === '관리자' || id === 'admin') return { label: '관리자', color: '#8b5cf6' };
  if(id === '시스템') return { label: '시스템', color: '#888' };
  if(typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
    var node = findNode(partnerTree, id);
    if(node) return { label: labels[node.level] || node.level, color: colors[node.level] || '#888' };
  }
  return null;
}

function buildPartnerLogTable(logs, emptyMsg) {
  if(!logs || logs.length === 0) {
    return '<tr><td colspan="9" style="color:#888;padding:24px;text-align:center;">'+emptyMsg+'</td></tr>';
  }
  return logs.map(function(log, i) {
    var typeLabel = log.type === 'give' ? '<span style="color:#4ade80;">지급</span>' : '<span style="color:#f87171;">회수</span>';
    var amountColor = log.type === 'give' ? '#4ade80' : '#f87171';
    var amountSign  = log.type === 'give' ? '+' : '-';

    return '<tr>'
      + '<td style="color:#888;">'+(i+1)+'</td>'
      + '<td style="font-size:0.75rem;white-space:nowrap;">'+log.datetime+'</td>'
      + '<td>'+typeLabel+'</td>'
      + '<td style="font-size:0.75rem;white-space:nowrap;">'+_buildHierarchyHtml(log)+'</td>'
      + '<td style="color:#f59e0b;font-weight:600;">'+( log.targetId   || '-' )+'</td>'
      + '<td style="color:#aaa;">'+( log.targetNick || '-' )+'</td>'
      + '<td style="text-align:right;color:'+amountColor+';font-weight:700;">'+amountSign+(log.amount||0).toLocaleString()+'</td>'
      + '<td style="text-align:right;font-size:0.78rem;white-space:nowrap;">'
      +   '<span style="color:#60a5fa;">'+(log.before||0).toLocaleString()+'</span>'
      +   '<span style="color:#666;margin:0 4px;">→</span>'
      +   '<span style="color:#f59e0b;">'+(log.after||0).toLocaleString()+'</span>'
      + '</td>'
      + '<td style="color:#888;font-size:0.75rem;">'+( log.memo || '' )+'</td>'
      + '</tr>';
  }).join('');
}
