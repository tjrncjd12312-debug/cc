// ══════════════════════════════════════
//  회원 관리 페이지
// ══════════════════════════════════════

// ── 은행 목록 ──
var _ptBankList = ['KB국민은행','신한은행','우리은행','하나은행','NH농협은행','IBK기업은행','SC제일은행','씨티은행','경남은행','광주은행','대구은행','부산은행','전북은행','제주은행','산업은행','수협은행','새마을금고','신협','우체국','케이뱅크','카카오뱅크','토스뱅크'];
function _ptBankOptions(selected) {
  return '<option value="">은행 선택</option>' + _ptBankList.map(function(b){ return '<option value="'+b+'"'+(b===selected?' selected':'')+'>'+b+'</option>'; }).join('');
}

// ── 그룹 선택 모달 (파트너/회원 공용) ──
function _openGroupSelectModal(label, currentGroup, onSelect) {
  var old = document.getElementById('group-select-modal');
  if (old) old.remove();

  fetch('/api/admin/games').then(function(r) { return r.json(); }).then(function(res) {
    var groups = (res.data && res.data.groups) || [];

    var overlay = document.createElement('div');
    overlay.id = 'group-select-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--shadow);display:flex;align-items:center;justify-content:center;z-index:99999;animation:cfd-in 0.2s ease;';

    var items = '';
    var isNone = !currentGroup;

    // 1) 그룹없음 — 게임사 기본설정 적용
    items += '<div class="gsm-item" data-group="" style="display:flex;align-items:center;gap:10px;padding:12px 18px;cursor:pointer;border-bottom:1px solid var(--border,#334155);border-radius:0;transition:background 0.15s;'
      + (isNone ? 'background:rgba(139,92,246,0.12);' : '') + '">'
      + '<div style="width:32px;height:32px;border-radius:8px;background:rgba(107,114,128,0.15);display:flex;align-items:center;justify-content:center;"><i class="fas fa-cog" style="font-size:0.85rem;color:#6b7280;"></i></div>'
      + '<span style="flex:1;font-size:0.88rem;color:' + (isNone ? '#c4b5fd' : 'var(--text,#e2e8f0)') + ';font-weight:' + (isNone ? '700' : '500') + ';">그룹없음</span>'
      + (isNone ? '<i class="fas fa-check-circle" style="color:#a78bfa;font-size:1rem;"></i>' : '')
      + '</div>';

    // 2) 그룹 목록
    groups.forEach(function(g) {
      var isDirect = currentGroup === g.name;
      items += '<div class="gsm-item" data-group="' + g.name.replace(/"/g, '&quot;') + '" style="display:flex;align-items:center;gap:10px;padding:12px 18px;cursor:pointer;border-bottom:1px solid var(--border,#334155);transition:background 0.15s;'
        + (isDirect ? 'background:rgba(139,92,246,0.12);' : '') + '">'
        + '<div style="width:32px;height:32px;border-radius:8px;background:rgba(139,92,246,0.15);display:flex;align-items:center;justify-content:center;"><i class="fas fa-layer-group" style="font-size:0.85rem;color:#8b5cf6;"></i></div>'
        + '<span style="flex:1;font-size:0.88rem;color:' + (isDirect ? '#c4b5fd' : 'var(--text,#e2e8f0)') + ';font-weight:' + (isDirect ? '700' : '500') + ';">' + g.name + '</span>'
        + (isDirect ? '<i class="fas fa-check-circle" style="color:#a78bfa;font-size:1rem;"></i>' : '')
        + '</div>';
    });

    if (groups.length === 0) {
      items += '<div style="padding:20px;text-align:center;color:var(--text3);font-size:0.82rem;">등록된 그룹이 없습니다.<br><span style="font-size:0.75rem;">게임사 그룹설정에서 그룹을 추가해주세요.</span></div>';
    }

    overlay.innerHTML =
      '<div style="width:380px;max-width:92vw;max-height:80vh;display:flex;flex-direction:column;background:var(--card,#1e293b);border:1px solid var(--border2,#2a3040);border-radius:16px;box-shadow:0 20px 60px var(--shadow);overflow:hidden;animation:cfm-pop 0.25s ease;">'
      + '<div style="padding:18px 20px;border-bottom:1px solid var(--border,#334155);display:flex;align-items:center;justify-content:space-between;">'
      +   '<div>'
      +     '<div style="font-size:1rem;font-weight:700;color:var(--text,#e2e8f0);">게임 그룹 변경</div>'
      +     '<div style="font-size:0.78rem;color:var(--text2,#94a3b8);margin-top:2px;">' + label + '</div>'
      +   '</div>'
      +   '<button id="gsm-close" style="background:none;border:none;color:var(--text3);font-size:1.3rem;cursor:pointer;padding:4px;">✕</button>'
      + '</div>'
      + '<div style="overflow-y:auto;flex:1;">' + items + '</div>'
      + '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#gsm-close').addEventListener('click', function() { overlay.remove(); });

    overlay.querySelectorAll('.gsm-item').forEach(function(item) {
      item.addEventListener('mouseenter', function() { if (!this.style.background.includes('139,92,246')) this.style.background = 'var(--bg2,rgba(255,255,255,0.03))'; });
      item.addEventListener('mouseleave', function() { if (!this.style.background.includes('139,92,246')) this.style.background = 'transparent'; });
      item.addEventListener('click', function() {
        var newGroup = this.getAttribute('data-group');
        overlay.remove();
        if (typeof onSelect === 'function') onSelect(newGroup);
      });
    });
  });
}

// ── 토스트 알림 ──
function _showToast(msg, type) {
  var toast = document.createElement('div');
  var bg = type === 'success' ? 'linear-gradient(135deg, #059669, #10b981)' : type === 'warn' ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #2563eb, #3b82f6)';
  toast.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%) translateY(-20px);z-index:100000;padding:16px 32px;border-radius:12px;color:#fff;font-size:0.9rem;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.4);background:' + bg + ';opacity:0;transition:all 0.4s cubic-bezier(0.16,1,0.3,1);pointer-events:none;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(function() {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(function() { toast.remove(); }, 400);
  }, 2500);
}

// ── 파트너 권한 체크 ──
var _partnerPermCache = null;
var _partnerPermCacheTime = 0;
async function _checkPartnerPerm(level, permKey) {
  // 캐시 5초
  if (!_partnerPermCache || Date.now() - _partnerPermCacheTime > 5000) {
    try {
      var r = await fetch('/api/admin/settings');
      var d = await r.json();
      _partnerPermCache = (d.success && d.data && d.data.partnerPerm) || {};
      _partnerPermCacheTime = Date.now();
    } catch(e) { _partnerPermCache = {}; }
  }
  var key = level + '_' + permKey;
  return _partnerPermCache[key] !== false; // 기본값 true
}

// 기본 트리 (관리자 루트만)
var _defaultPartnerTree = [
  {
    id: 'admin', label: '관리자', level: 'admin', expanded: true,
    children: []
  }
];

var partnerTree = _defaultPartnerTree;
var _treeLoadedFromServer = false;

// expanded 상태 복원
function _restoreExpanded(nodes, expandedMap) {
  (nodes || []).forEach(function(n) {
    if (typeof expandedMap[n.id] !== 'undefined') n.expanded = expandedMap[n.id];
    if (n.children) _restoreExpanded(n.children, expandedMap);
  });
}

// 트리가 머니/포인트의 원본 — DB와 동기화
function syncTreeWithUsers(tree, userMap) {
  (tree||[]).forEach(function(node) {
    if(userMap[node.id]) {
      var u = userMap[node.id];
      if(u.api && u.api.length > 0) {
        node.money = u.money || 0;
      } else {
        if((u.money || 0) > 0 && (node.money || 0) === 0) {
          node.money = u.money;
        }
      }
      node.point = u.point || 0;
      node.rollingPoint = u.rollingPoint || 0;
      node.gameGroup = u.gameGroup || '';
    }
    if(node.children) syncTreeWithUsers(node.children, userMap);
  });
}

// 서버에서 파트너 트리 로드 (로그인 후 호출)
function _loadPartnerTreeFromServer() {
  var tk = sessionStorage.getItem('adminToken') || '';
  if (!tk) return;

  // localStorage에서 expanded 상태 맵 추출
  var expandedMap = {};
  try {
    var local = JSON.parse(localStorage.getItem('partnerTree') || '[]');
    (function buildMap(nodes) {
      (nodes || []).forEach(function(n) {
        if (typeof n.expanded !== 'undefined') expandedMap[n.id] = n.expanded;
        if (n.children) buildMap(n.children);
      });
    })(local);
  } catch(e) {}

  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/admin/partner-tree', false);
    xhr.setRequestHeader('Authorization', 'Bearer ' + tk);
    xhr.send();
    if (xhr.status === 200) {
      var res = JSON.parse(xhr.responseText);
      if (res.data && res.data.length) {
        _restoreExpanded(res.data, expandedMap);
        partnerTree = res.data;
        _treeLoadedFromServer = true;
        try { localStorage.setItem('partnerTree', JSON.stringify(res.data)); } catch(e) {}
      }
    }
  } catch(e) {}

  // 유저 머니 동기화
  fetch('/api/admin/users', { headers: { 'Authorization': 'Bearer ' + tk } })
    .then(function(r){ return r.json(); })
    .then(function(res){
      var userMap = {};
      (res.data||[]).forEach(function(u){ userMap[u.username] = u; });
      syncTreeWithUsers(partnerTree, userMap);
      if (_treeLoadedFromServer) savePartnerTree();
      if (typeof renderTree === 'function') renderTree();
    }).catch(function(){});
}

// 토큰이 있으면 즉시 로드, 없으면 나중에 로드
if (sessionStorage.getItem('adminToken')) {
  _loadPartnerTreeFromServer();
}

function savePartnerTree() {
  try { localStorage.setItem('partnerTree', JSON.stringify(partnerTree)); } catch(e) {}
  // 서버에도 동기화 (롤링 계산용)
  try {
    fetch('/api/admin/partner-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partnerTree)
    }).catch(function(){});
  } catch(e) {}
}

var selectedPartnerId = localStorage.getItem('selectedPartnerId') || null;

var levelLabel = { admin:'관리자', head:'본사', subhead:'부본사', distributor:'총판', store:'매장', member:'회원' };
var levelColor  = { admin:'#8b5cf6', head:'#3b82f6', subhead:'#06b6d4', distributor:'#f59e0b', store:'#10b981', member:'#6b7280' };


var levelPageMap = {
  'partner-headquarter': 'head',
  'partner-sub':         'subhead',
  'partner-distributor': 'distributor',
  'partner-store':       'store',
};

async function renderPartnerPage(subPage) {
  // 페이지 진입 시 유저 데이터 + HonorLink 잔액 동기화
  try {
    var res = await fetch('/api/admin/users').then(function(r){ return r.json(); });
    var userMap = {};
    var users = res.data || [];
    users.forEach(function(u){ userMap[u.username] = u; });
    // API 연동 유저만 HonorLink 잔액 조회 (1회)
    var hlUsers = users.filter(function(u){ return u.api && u.api.length > 0; });
    if (hlUsers.length) {
      var balResults = await Promise.all(hlUsers.map(function(u) {
        return fetch('/api/hl/balance?username=' + encodeURIComponent(u.username))
          .then(function(r){ return r.json(); })
          .then(function(d){ return { username: u.username, balance: Number(d.balance) || 0 }; })
          .catch(function(){ return { username: u.username, balance: userMap[u.username].money || 0 }; });
      }));
      balResults.forEach(function(b){ if(userMap[b.username]) userMap[b.username].money = b.balance; });
    }
    syncTreeWithUsers(partnerTree, userMap);
    // 게임 그룹 목록 로드
    try {
      var gRes = await fetch('/api/admin/games').then(function(r){ return r.json(); });
      var gd = gRes.data || {};
      window._gdGameGroups = (gd.groups || []).map(function(g){ return g.name; });
    } catch(e2) { window._gdGameGroups = []; }
  } catch(e) {}

  if(levelPageMap[subPage]) {
    renderLevelListPage(subPage, levelPageMap[subPage]);
    return;
  }

  // partner-list: 파트너 목록 테이블
  _ptListFilter = '전체';
  _ptSearchText = '';
  _ptRenderListPage();
}

// ── 파트너 목록 테이블 뷰 ──
var _ptListFilter = '전체';
var _ptSearchText = '';

function _ptTreeStats(nodes) {
  var s = { partners: 0, members: 0, money: 0, point: 0 };
  (nodes || []).forEach(function(n) {
    if (n.level !== 'admin' && (n.status === 'blocked' || n.status === 'deleted')) { /* skip blocked/deleted */ }
    else if (n.level === 'admin') { /* skip */ }
    else if (n.level === 'member') { s.members++; s.money += (n.money || 0); s.point += ((n.point||0)+(n.rollingPoint||0)); }
    else { s.partners++; s.money += (n.money || 0); s.point += ((n.point||0)+(n.rollingPoint||0)); }
    if (n.children) {
      var sub = _ptTreeStats(n.children);
      s.partners += sub.partners; s.members += sub.members; s.money += sub.money; s.point += sub.point;
    }
  });
  return s;
}

function _ptMemberCount(node) {
  var c = 0;
  (node.children || []).forEach(function(n) {
    if (n.status === 'blocked' || n.status === 'deleted') return;
    if (n.level === 'member') c++;
    else c += _ptMemberCount(n);
  });
  return c;
}

function _ptSubMoney(node) {
  var s = 0;
  (node.children || []).forEach(function(n) {
    if (n.status === 'blocked' || n.status === 'deleted') return;
    s += (n.money || 0) + _ptSubMoney(n);
  });
  return s;
}

function _ptSubPoint(node) {
  var s = 0;
  (node.children || []).forEach(function(n) {
    if (n.status === 'blocked' || n.status === 'deleted') return;
    s += ((n.point||0)+(n.rollingPoint||0)) + _ptSubPoint(n);
  });
  return s;
}

function _ptFlattenTree(nodes, depth, result) {
  (nodes || []).forEach(function(n) {
    if (n.level !== 'admin' && (n.status === 'blocked' || n.status === 'deleted')) return;
    result.push({ node: n, depth: depth });
    if ((n.level === 'admin' || n.expanded) && n.children) {
      _ptFlattenTree(n.children, depth + 1, result);
    }
  });
  return result;
}

function _ptCollectByLevel(nodes, level, result) {
  (nodes || []).forEach(function(n) {
    if (n.status === 'blocked' || n.status === 'deleted') return;
    if (n.level === level) result.push(n);
    if (n.children) _ptCollectByLevel(n.children, level, result);
  });
  return result;
}

function _ptRenderListPage() {
  var el = document.getElementById('content');
  if (!el) return;

  var stats = _ptTreeStats(partnerTree);
  var cardS = 'background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 20px;flex:1;min-width:170px;display:flex;align-items:center;gap:14px;';
  var iconS = 'width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;';
  var _tabS = 'padding:6px 16px;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text2);transition:all 0.15s;';
  var _tabActiveS = 'padding:6px 16px;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid #3b82f6;background:#3b82f6;color:#fff;transition:all 0.15s;';

  var levels = [
    { key: '전체', label: '전체' },
    { key: 'head', label: '본사' },
    { key: 'subhead', label: '부본사' },
    { key: 'distributor', label: '총판' },
    { key: 'store', label: '매장' }
  ];
  var tabsHtml = levels.map(function(l) {
    return '<button class="ptl-tab" data-tab="' + l.key + '" style="' + (l.key === _ptListFilter ? _tabActiveS : _tabS) + '">' + l.label + '</button>';
  }).join('');

  var thS = 'padding:10px 8px;font-weight:600;border-bottom:2px solid var(--border);white-space:nowrap;';

  el.innerHTML =
    '<div style="padding:20px 24px;">'
    // ── 헤더 ──
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">'
    +   '<div><div style="font-size:1.1rem;font-weight:700;color:var(--text);"><i class="fas fa-users-cog" style="margin-right:8px;color:#f59e0b;"></i>파트너 관리</div>'
    +   '<div style="font-size:0.75rem;color:var(--text3);margin-top:2px;">파트너 목록 및 관리</div></div>'
    +   '<div style="display:flex;gap:8px;">'
    +     '<button id="ptl-refresh" style="padding:7px 10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);cursor:pointer;font-size:0.85rem;"><i class="fas fa-sync-alt"></i></button>'
    +     '<button class="pt-action-btn pt-btn-blue" id="ptl-sync" style="padding:7px 14px;border-radius:6px;font-size:0.78rem;font-weight:600;"><i class="fas fa-sync" style="margin-right:4px;"></i>하부 잔액 동기화</button>'
    +     '<button class="pt-action-btn pt-btn-purple" id="ptl-add" style="padding:7px 14px;border-radius:6px;font-size:0.78rem;font-weight:600;"><i class="fas fa-user-plus" style="margin-right:4px;"></i>파트너 추가</button>'
    +   '</div>'
    + '</div>'
    // ── 요약 카드 ──
    + '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">'
    +   '<div style="' + cardS + '"><div style="' + iconS + 'background:#eff6ff;color:#3b82f6;"><i class="fas fa-users"></i></div><div><div style="font-size:1.2rem;font-weight:700;color:var(--text);">' + stats.partners + '</div><div style="font-size:0.72rem;color:var(--text3);">전체 파트너</div></div></div>'
    +   '<div style="' + cardS + '"><div style="' + iconS + 'background:#f0fdf4;color:#22c55e;"><i class="fas fa-user-friends"></i></div><div><div style="font-size:1.2rem;font-weight:700;color:var(--text);">' + stats.members + '</div><div style="font-size:0.72rem;color:var(--text3);">총 하부회원</div></div></div>'
    +   '<div style="' + cardS + '"><div style="' + iconS + 'background:#eff6ff;color:#3b82f6;"><i class="fas fa-won-sign"></i></div><div><div style="font-size:1.15rem;font-weight:700;color:var(--text);">₩' + stats.money.toLocaleString() + '</div><div style="font-size:0.72rem;color:var(--text3);">머니(하부포함)</div></div></div>'
    +   '<div style="' + cardS + '"><div style="' + iconS + 'background:#fef3c7;color:#f59e0b;"><i class="fas fa-coins"></i></div><div><div style="font-size:1.15rem;font-weight:700;color:var(--text);">' + stats.point.toLocaleString() + '</div><div style="font-size:0.72rem;color:var(--text3);">포인트(하부포함)</div></div></div>'
    + '</div>'
    // ── 검색 + 탭 + 액션 ──
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
    +   '<div style="position:relative;"><i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:0.75rem;"></i><input type="text" id="ptl-search" placeholder="파트너 검색..." style="padding:7px 10px 7px 30px;border:1px solid var(--border);border-radius:6px;background:var(--input-bg);color:var(--text);font-size:0.8rem;width:170px;"></div>'
    +   '<div style="display:flex;gap:4px;">' + tabsHtml + '</div>'
    +   '<div style="margin-left:auto;display:flex;gap:8px;align-items:center;">'
    +     '<button id="ptl-expand" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:0.75rem;cursor:pointer;"><i class="fas fa-angle-double-down" style="margin-right:4px;"></i>펼치기</button>'
    +     '<button id="ptl-collapse" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:0.75rem;cursor:pointer;"><i class="fas fa-angle-double-up" style="margin-right:4px;"></i>접기</button>'
    +     '<button id="ptl-settlement" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:0.75rem;cursor:pointer;"><i class="fas fa-chart-line" style="margin-right:4px;"></i>정산내역</button>'
    +   '</div>'
    + '</div>'
    // ── 테이블 ──
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;">'
    +   '<div style="overflow-x:auto;">'
    +     '<table class="db-table" style="font-size:0.78rem;border-collapse:collapse;width:100%;">'
    +       '<thead><tr style="background:var(--input-bg);font-size:0.73rem;color:var(--text2);">'
    +         '<th style="' + thS + 'text-align:center;min-width:200px;">파트너</th>'
    +         '<th style="' + thS + 'text-align:center;min-width:60px;">메모</th>'
    +         '<th style="' + thS + 'text-align:center;min-width:60px;">그룹</th>'
    +         '<th style="' + thS + 'text-align:center;min-width:55px;">회원수</th>'
    +         '<th style="' + thS + 'text-align:right;min-width:80px;">머니</th>'
    +         '<th style="' + thS + 'text-align:right;min-width:90px;">머니(하부)</th>'
    +         '<th style="' + thS + 'text-align:right;min-width:70px;">포인트</th>'
    +         '<th style="' + thS + 'text-align:right;min-width:85px;">포인트(하부)</th>'
    +         '<th style="' + thS + 'text-align:center;min-width:75px;">지급/회수</th>'
    +         '<th style="' + thS + 'text-align:center;min-width:60px;">하위생성</th>'
    +         '<th style="' + thS + 'text-align:center;min-width:60px;">상위변경</th>'
    +         '<th style="' + thS + 'text-align:right;min-width:55px;">카지노</th>'
    +         '<th style="' + thS + 'text-align:right;min-width:55px;">슬롯</th>'
    +         '<th style="' + thS + 'text-align:right;min-width:55px;">루징</th>'
    +       '</tr></thead>'
    +       '<tbody id="ptl-tbody"></tbody>'
    +     '</table>'
    +   '</div>'
    + '</div>'
    + '</div>';

  _ptRenderTableBody();
  _ptBindListEvents();
}

function _ptRenderTableBody() {
  var tbody = document.getElementById('ptl-tbody');
  if (!tbody) return;

  var rows = [];
  var search = _ptSearchText.toLowerCase();

  if (_ptListFilter === '전체') {
    var flat = _ptFlattenTree(partnerTree, 0, []);
    if (search) flat = flat.filter(function(r) { return r.node.id.toLowerCase().indexOf(search) !== -1 || r.node.label.toLowerCase().indexOf(search) !== -1; });
    rows = flat;
  } else {
    var collected = _ptCollectByLevel(partnerTree, _ptListFilter, []);
    if (search) collected = collected.filter(function(n) { return n.id.toLowerCase().indexOf(search) !== -1 || n.label.toLowerCase().indexOf(search) !== -1; });
    rows = collected.map(function(n) { return { node: n, depth: 0 }; });
  }

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="14" style="color:var(--text3);text-align:center;padding:24px;">파트너가 없습니다.</td></tr>';
    return;
  }

  var html = '';
  rows.forEach(function(r) {
    var n = r.node;
    var d = r.depth;
    var color = levelColor[n.level] || '#888';
    var lbl = levelLabel[n.level] || n.level;
    var hasChildren = n.children && n.children.length > 0;
    var memberCount = _ptMemberCount(n);
    var subMoney = _ptSubMoney(n);
    var subPoint = _ptSubPoint(n);
    var indent = d * 24;

    var toggle = hasChildren
      ? '<span class="ptl-toggle" data-id="' + n.id + '" style="cursor:pointer;margin-right:8px;font-size:1.1rem;color:#60a5fa;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:4px;background:rgba(96,165,250,0.1);transition:transform 0.15s;">' + (n.expanded ? '▾' : '▸') + '</span>'
      : '<span style="display:inline-block;width:32px;"></span>';
    var badge = '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:600;color:#fff;background:' + color + ';margin-right:8px;white-space:nowrap;">' + lbl + '</span>';

    html += '<tr class="ptl-row" data-id="' + n.id + '" style="border-bottom:1px solid var(--border);transition:background 0.1s;" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'\'">'
      + '<td style="padding:10px 12px;white-space:nowrap;"><div style="display:flex;align-items:center;padding-left:' + indent + 'px;">' + toggle + badge + '<span class="ptl-name" data-id="' + n.id + '" style="font-weight:600;color:var(--text);cursor:pointer;" onmouseover="this.style.textDecoration=\'underline\'" onmouseout="this.style.textDecoration=\'none\'">' + n.label + '</span><span class="ptl-name" data-id="' + n.id + '" style="color:var(--text3);font-size:0.72rem;margin-left:4px;cursor:pointer;" onmouseover="this.previousElementSibling.style.textDecoration=\'underline\'" onmouseout="this.previousElementSibling.style.textDecoration=\'none\'">(' + n.id + ')</span></div></td>'
      + '<td style="padding:10px 8px;text-align:center;color:var(--text3);font-size:0.75rem;">' + (n.memo || '-') + '</td>'
      + (function() {
          var grp = n.gameGroup || '';
          var displayLabel = grp || '그룹없음';
          return '<td style="padding:10px 8px;text-align:center;">'
            + '<button class="ptl-group-btn" data-id="' + n.id + '" data-group="' + grp + '" '
            + 'style="padding:3px 10px;border-radius:6px;font-size:0.7rem;font-weight:600;cursor:pointer;border:1px solid ' + (grp ? '#8b5cf6' : 'var(--border)') + ';background:' + (grp ? 'rgba(139,92,246,0.15)' : 'transparent') + ';color:' + (grp ? '#c4b5fd' : 'var(--text2)') + ';white-space:nowrap;">'
            + displayLabel
            + '</button></td>';
        })()

      + '<td style="padding:10px 8px;text-align:center;font-weight:600;"><span class="ptl-member-count" data-id="' + n.id + '" style="color:#60a5fa;cursor:pointer;text-decoration:underline;text-underline-offset:2px;" title="하부 회원 목록 보기">' + memberCount + '</span></td>'
      + '<td style="padding:10px 8px;text-align:right;color:#60a5fa;font-weight:600;">' + (n.money || 0).toLocaleString() + '</td>'
      + '<td style="padding:10px 8px;text-align:right;color:#3b82f6;">' + subMoney.toLocaleString() + '</td>'
      + '<td style="padding:10px 8px;text-align:right;color:#f59e0b;font-weight:600;">' + ((n.point||0)+(n.rollingPoint||0)).toLocaleString() + '</td>'
      + '<td style="padding:10px 8px;text-align:right;color:#d97706;">' + subPoint.toLocaleString() + '</td>'
      + '<td style="padding:10px 8px;text-align:center;"><button class="ptl-give-take" data-id="' + n.id + '" style="padding:3px 10px;border-radius:4px;font-size:0.7rem;font-weight:600;border:1px solid #f59e0b;background:rgba(245,158,11,0.08);color:#f59e0b;cursor:pointer;white-space:nowrap;"><i class="fas fa-exchange-alt" style="margin-right:3px;font-size:0.65rem;"></i>지급/회수</button></td>'
      + '<td style="padding:10px 8px;text-align:center;"><button class="ptl-create-sub" data-id="' + n.id + '" style="background:none;border:none;cursor:pointer;color:var(--text2);font-size:0.85rem;" title="하위 파트너 생성"><i class="fas fa-sitemap"></i></button></td>'
      + '<td style="padding:10px 8px;text-align:center;"><button class="ptl-move" data-id="' + n.id + '" style="background:none;border:none;cursor:pointer;color:var(--text2);font-size:0.85rem;" title="상위 변경"><i class="fas fa-exchange-alt"></i></button></td>'
      + '<td style="padding:10px 8px;text-align:right;color:var(--text);font-weight:500;">' + (n.rollCasino || '0') + '%</td>'
      + '<td style="padding:10px 8px;text-align:right;color:var(--text);font-weight:500;">' + (n.rollSlot || '0') + '%</td>'
      + '<td style="padding:10px 8px;text-align:right;color:var(--text);font-weight:500;">' + (n.losingSlot || '0') + '%</td>'
      + '</tr>';
  });

  tbody.innerHTML = html;
  _ptBindTableRowEvents();
}

function _ptBindTableRowEvents() {
  document.querySelectorAll('.ptl-toggle').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleNode(partnerTree, this.dataset.id);
      savePartnerTree();
      _ptRenderTableBody();
    });
  });

  document.querySelectorAll('.ptl-name').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var node = findNode(partnerTree, this.dataset.id);
      if (node) openPartnerModal(node);
    });
  });

  document.querySelectorAll('.ptl-give-take').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var node = findNode(partnerTree, this.dataset.id);
      if (node) openInfoPopup('머니 지급', 'give', 'money', node);
    });
  });

  document.querySelectorAll('.ptl-member-count').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var partnerId = this.dataset.id;
      // 회원관리 페이지로 이동하면서 파트너 필터 적용
      if (typeof navigateToPage === 'function') {
        window._memberFilterPartner = partnerId;
        navigateToPage('member-list');
      }
    });
  });

  document.querySelectorAll('.ptl-create-sub').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var node = findNode(partnerTree, this.dataset.id);
      if (node) openCreateModal(node);
    });
  });

  document.querySelectorAll('.ptl-move').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var node = findNode(partnerTree, this.dataset.id);
      if(node && node.level === 'admin') { _showToast('관리자는 상위변경이 불가능합니다.', 'error'); return; }
      if(node) openMoveParentModal(node);
    });
  });

  // 그룹 변경 버튼
  document.querySelectorAll('.ptl-group-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var nodeId = this.getAttribute('data-id');
      var currentGroup = this.getAttribute('data-group') || '';
      var node = findNode(partnerTree, nodeId);
      if (!node) return;
      _openGroupSelectModal(node.label || nodeId, currentGroup, function(newGroup) {
        // 본인 + 하위 전체 gameGroup 변경
        var allIds = [];
        function collectAll(n) {
          n.gameGroup = newGroup;
          allIds.push(n.id);
          if (n.children) n.children.forEach(collectAll);
        }
        collectAll(node);

        // 로딩 효과
        var tableWrap = document.querySelector('.ptl-table') || document.getElementById('ptl-tbody');
        if (tableWrap) { tableWrap.style.opacity = '0.4'; tableWrap.style.pointerEvents = 'none'; }

        // 서버에 일괄 업데이트 (단일 요청)
        fetch('/api/admin/users/batch-group', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: allIds, gameGroup: newGroup })
        }).then(function() {
          savePartnerTree();
          setTimeout(function() {
            _ptRenderTableBody();
            _ptBindListEvents();
            if (tableWrap) { tableWrap.style.opacity = '1'; tableWrap.style.pointerEvents = ''; }
            _showToast((node.label || nodeId) + ' 외 ' + (allIds.length - 1) + '명 그룹 변경 완료', 'success');
          }, 400);
        });
      });
    });
  });
}

function _ptBindListEvents() {
  var _tabS = 'padding:6px 16px;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text2);transition:all 0.15s;';
  var _tabActiveS = 'padding:6px 16px;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid #3b82f6;background:#3b82f6;color:#fff;transition:all 0.15s;';

  document.querySelectorAll('.ptl-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _ptListFilter = btn.getAttribute('data-tab');
      document.querySelectorAll('.ptl-tab').forEach(function(b) { b.style.cssText = _tabS; });
      btn.style.cssText = _tabActiveS;
      _ptRenderTableBody();
    });
  });

  var searchInput = document.getElementById('ptl-search');
  if (searchInput) {
    var timer;
    searchInput.addEventListener('input', function() {
      clearTimeout(timer);
      timer = setTimeout(function() {
        _ptSearchText = searchInput.value;
        _ptRenderTableBody();
      }, 300);
    });
  }

  var expandBtn = document.getElementById('ptl-expand');
  if (expandBtn) expandBtn.addEventListener('click', function() {
    setAllExpanded(partnerTree, true);
    _ptRenderTableBody();
  });

  var collapseBtn = document.getElementById('ptl-collapse');
  if (collapseBtn) collapseBtn.addEventListener('click', function() {
    setAllExpanded(partnerTree, false);
    _ptRenderTableBody();
  });

  var refreshBtn = document.getElementById('ptl-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', function() {
    if (!showLoading('partnerRefresh')) return;
    setTimeout(function() { navigateToPage('partner-list'); hideLoading(); }, 300);
  });

  // 데이터 초기화 버튼 (localStorage 머니내역 + 베팅캐시 삭제)
  var resetBtn = document.getElementById('ptl-reset');
  if (resetBtn) resetBtn.addEventListener('click', async function() {
    if (!(await customConfirm('머니내역, 베팅내역 캐시를 모두 초기화하시겠습니까?'))) return;
    localStorage.removeItem('adminMoneyLog');
    localStorage.removeItem('partnerMoneyLog');
    localStorage.removeItem('userMoneyLog');
    localStorage.removeItem('partnerBettingCache');
    localStorage.removeItem('partnerTree');
    _showToast('초기화 완료', 'success');
    navigateToPage('partner-list');
  });

  var syncBtn = document.getElementById('ptl-sync');
  if (syncBtn) syncBtn.addEventListener('click', function() {
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="margin-right:4px;"></i>동기화중...';
    fetch('/api/admin/users').then(function(r) { return r.json(); }).then(function(res) {
      var userMap = {};
      var users = res.data || [];
      users.forEach(function(u) { userMap[u.username] = u; });
      // HonorLink API에서 실제 잔액 조회
      var hlUsers = users.filter(function(u) { return u.api && u.api.length > 0; });
      return Promise.all(hlUsers.map(function(u) {
        return fetch('/api/hl/balance?username=' + encodeURIComponent(u.username))
          .then(function(r) { return r.json(); })
          .then(function(d) { userMap[u.username].money = Number(d.balance) || 0; })
          .catch(function() {});
      })).then(function() {
        syncTreeWithUsers(partnerTree, userMap);
        // 로컬 DB에도 잔액 업데이트
        hlUsers.forEach(function(u) {
          fetch('/api/admin/users/' + encodeURIComponent(u.username), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ money: userMap[u.username].money })
          }).catch(function() {});
        });
        savePartnerTree();
        _ptRenderListPage();
      });
    }).catch(function() {
      _showToast('동기화 실패', 'error');
      syncBtn.disabled = false;
      syncBtn.innerHTML = '<i class="fas fa-sync" style="margin-right:4px;"></i>하부 잔액 동기화';
    });
  });

  var addBtn = document.getElementById('ptl-add');
  if (addBtn) addBtn.addEventListener('click', function() {
    openCreateModalFree();
  });

  var settlementBtn = document.getElementById('ptl-settlement');
  if (settlementBtn) settlementBtn.addEventListener('click', function() {
    navigateToPage('settlement-total');
  });
}

// ── 레벨별 목록 페이지 ──
function collectNodesByLevel(nodes, level, result) {
  nodes.forEach(function(node) {
    if(node.level === level) result.push(node);
    if(node.children && node.children.length) collectNodesByLevel(node.children, level, result);
  });
}

function findParentNode(nodes, childId, parent) {
  for(var i=0;i<nodes.length;i++) {
    if(nodes[i].id === childId) return parent;
    if(nodes[i].children) {
      var found = findParentNode(nodes[i].children, childId, nodes[i]);
      if(found) return found;
    }
  }
  return null;
}

function renderLevelListPage(subPage, level) {
  var nodes = [];
  collectNodesByLevel(partnerTree, level, nodes);
  var color = levelColor[level] || '#888';
  var lbl   = levelLabel[level] || level;

  var today = new Date().toISOString().slice(0,10);
  var sortBtns = ['디폴트순','생성 순','아이디 순','최신가입 순','보유머니 순','보유롤링금 순'];
  var sortHtml = sortBtns.map(function(t,i){
    return '<button class="pt-sort-btn'+(i===0?' active':'')+'" data-sort="'+i+'">'+t+'</button>';
  }).join('');

  var rows = nodes.length === 0
    ? '<tr><td colspan="14" style="color:#888;text-align:center;padding:20px;">등록된 '+lbl+'이 없습니다.</td></tr>'
    : nodes.map(function(node, i) {
        var subCount = { sub:0, dist:0, store:0, member:0 };
        if(node.children) node.children.forEach(function(c) {
          if(c.level==='subhead')     subCount.sub++;
          if(c.level==='distributor') subCount.dist++;
          if(c.level==='store')       subCount.store++;
          if(c.level==='member')      subCount.member++;
        });
        var regDate = node.registeredAt || '-';
        return '<tr class="pt-level-row" data-id="'+node.id+'">'
          + '<td style="color:#888;">'+(i+1)+'</td>'
          + '<td style="min-width:100px;">'
          +   '<div class="lvl-id-cell" data-id="'+node.id+'" style="color:'+'var(--text,#000)'+';font-weight:600;font-size:0.82rem;cursor:pointer;">'+node.label+'</div>'
          +   '<div style="color:'+'var(--text,#000)'+';font-size:0.7rem;">('+node.label+lbl+')</div>'
          + '</td>'
          + '<td style="font-size:0.75rem;color:var(--text2);">베/당</td>'
          + '<td style="text-align:right;font-size:0.78rem;">'
          +   '<div style="color:#60a5fa;">'+(node.money||0).toLocaleString()+'</div>'
          +   '<div style="color:#888;font-size:0.7rem;">'+((node.point||0)+(node.rollingPoint||0))+'</div>'
          + '</td>'
          + '<td style="text-align:right;font-size:0.78rem;">'
          +   '<div style="color:#4ade80;">0</div>'
          +   '<div style="color:#f87171;">0</div>'
          + '</td>'
          + '<td>'
          +   '<div style="display:flex;flex-direction:column;gap:3px;align-items:center;">'
          +     '<button class="mb-mini-btn mb-mini-yellow lvl-give-btn" data-id="'+node.id+'">알지급</button>'
          +     '<button class="mb-mini-btn mb-mini-teal  lvl-take-btn" data-id="'+node.id+'">알회수</button>'
          +   '</div>'
          + '</td>'
          + '<td style="text-align:right;font-size:0.78rem;">'
          +   '<div style="color:#4ade80;">'+(node.rollSlot||'0%')+'</div>'
          +   '<div style="color:#4ade80;">'+(node.rollCasino||'0%')+'</div>'
          + '</td>'
          + '<td style="text-align:right;font-size:0.78rem;">'
          +   '<div style="color:#f59e0b;">'+(node.losingSlot||'0%')+'</div>'
          +   '<div style="color:#f59e0b;">'+(node.losingCasino||'0%')+'</div>'
          + '</td>'
          + '<td style="text-align:right;font-size:0.78rem;">'
          +   '<div>0</div><div style="color:#888;">0</div>'
          + '</td>'
          + '<td style="text-align:right;font-size:0.78rem;">'
          +   '<div style="color:#60a5fa;">0</div>'
          +   '<div style="color:#888;">0</div>'
          + '</td>'
          + '<td style="font-size:0.72rem;color:var(--text2);text-align:center;line-height:1.8;">'
          +   '<div>'+subCount.sub+'</div>'
          +   '<div>'+subCount.dist+'</div>'
          +   '<div>'+subCount.store+'</div>'
          + '</td>'
          + '<td style="text-align:center;font-size:0.78rem;">'+subCount.member+'</td>'
          + '<td style="font-size:0.72rem;color:var(--text2);white-space:nowrap;">'+regDate+'</td>'
          + '<td>'
          +   '<button class="pt-action-btn pt-btn-purple lvl-detail-btn" style="padding:4px 12px;font-size:0.75rem;" data-id="'+node.id+'">회원정보/수정</button>'
          + '</td>'
          + '</tr>';
      }).join('');

  document.getElementById('content').innerHTML = `
    <div class="pt-wrap">
      <div class="pt-sort-bar">${sortHtml}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <input type="text" class="pt-search-input" placeholder="아이디 / 닉네임 검색" style="width:200px;">
        <input type="date" class="pt-date-input" value="${today}">
        <input type="date" class="pt-date-input" value="${today}">
        <button class="pt-action-btn pt-btn-purple">검색</button>
        <span style="margin-left:auto;font-size:0.76rem;color:var(--text2);">총 <b style="color:var(--text);">${nodes.length}</b> 명</span>
      </div>
      <div class="db-section" style="margin-bottom:0;overflow-x:auto;">
        <table class="db-table" style="font-size:0.78rem;">
          <thead>
            <tr>
              <th>#</th>
              <th>${lbl}</th>
              <th>정산방식</th>
              <th style="text-align:right;">보유머니<br>보유롤링금</th>
              <th style="text-align:right;">알지급(받음)<br>알회수(보냄)</th>
              <th>입출금</th>
              <th style="text-align:right;">롤링%(슬)<br>롤링%(카)</th>
              <th style="text-align:right;">루징%(슬)<br>루징%(카)</th>
              <th style="text-align:right;">롤링금(슬)<br>롤링금(카)</th>
              <th style="text-align:right;">하부 충 보유머니<br>하부 충 보유롤링금</th>
              <th style="text-align:center;">부본사<br>총판수<br>매장수</th>
              <th style="text-align:center;">회원수</th>
              <th>등록일시</th>
              <th>상세정보</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  document.querySelectorAll('.pt-sort-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.pt-sort-btn').forEach(function(b){ b.classList.remove('active'); });
      this.classList.add('active');
    });
  });

  document.querySelectorAll('.pt-level-row').forEach(function(row) {
    row.addEventListener('click', function(e) {
      if(e.target.tagName === 'BUTTON') return;
      if(e.target.classList.contains('lvl-id-cell')) return;
      selectedPartnerId = this.dataset.id;
      navigateToPage('partner-list');
    });
  });

  document.querySelectorAll('.lvl-id-cell').forEach(function(cell) {
    cell.addEventListener('click', function(e) {
      e.stopPropagation();
      var node = findNode(partnerTree, this.dataset.id);
      if(node) openPartnerModal(node);
    });
  });

  document.querySelectorAll('.lvl-detail-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectedPartnerId = this.dataset.id;
      navigateToPage('partner-list');
    });
  });

  document.querySelectorAll('.lvl-give-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var node = findNode(partnerTree, this.dataset.id);
      var name = node ? node.label : this.dataset.id;
      var val = prompt(name + ' — 지급할 금액을 입력하세요:');
      if(!val || isNaN(val) || parseInt(val) <= 0) return;
      var amount = parseInt(val);
      var before = node ? (node.money || 0) : 0;
      var after  = before + amount;
      if(node) node.money = after;
      savePartnerTree();
      var logEntry = {
        datetime:   nowStr(),
        type:       'give',
        processor:  '관리자',
        processorLevel: 'admin',
        targetId:   node ? node.id    : this.dataset.id,
        targetNick: node ? node.label : this.dataset.id,
        targetLevel: node ? node.level : '',
        amount:     amount,
        before:     before,
        after:      after,
        memo:       ''
      };
      if(typeof addPartnerMoneyLog === 'function') { addPartnerMoneyLog(logEntry); }
      if(node && node.level === 'member' && typeof addUserMoneyLog === 'function') { addUserMoneyLog(logEntry); }
      _showToast('✅ ' + name + ' 에게 ' + amount.toLocaleString() + '원 지급 완료', 'success');
    });
  });

  document.querySelectorAll('.lvl-take-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var node = findNode(partnerTree, this.dataset.id);
      var name = node ? node.label : this.dataset.id;
      var val = prompt(name + ' — 회수할 금액을 입력하세요:');
      if(!val || isNaN(val) || parseInt(val) <= 0) return;
      var amount = parseInt(val);
      var before = node ? (node.money || 0) : 0;
      var after  = Math.max(0, before - amount);
      if(node) node.money = after;
      savePartnerTree();
      var logEntry = {
        datetime:   nowStr(),
        type:       'take',
        processor:  '관리자',
        processorLevel: 'admin',
        targetId:   node ? node.id    : this.dataset.id,
        targetNick: node ? node.label : this.dataset.id,
        targetLevel: node ? node.level : '',
        amount:     amount,
        before:     before,
        after:      after,
        memo:       ''
      };
      if(typeof addPartnerMoneyLog === 'function') { addPartnerMoneyLog(logEntry); }
      if(node && node.level === 'member' && typeof addUserMoneyLog === 'function') { addUserMoneyLog(logEntry); }
      _showToast('📤 ' + name + ' 에서 ' + amount.toLocaleString() + '원 회수 완료', 'warn');
    });
  });
}

// ── 트리 렌더 ──
function renderTree() {
  var el = document.getElementById('pt-tree');
  if(!el) return;
  el.innerHTML = buildTreeHtml(partnerTree, 0);
  bindTreeEvents();
}

function buildTreeHtml(nodes, depth) {
  return nodes.filter(function(node) {
    return node.level === 'admin' || (node.status !== 'blocked' && node.status !== 'deleted');
  }).map(function(node) {
    var hasChildren = node.children && node.children.length > 0;
    var color = levelColor[node.level] || '#888';
    var lbl   = levelLabel[node.level] || node.level;
    var isSelected = node.id === selectedPartnerId;

    var toggle = hasChildren
      ? '<span class="pt-toggle" data-id="'+node.id+'">'+(node.expanded?'▾':'▸')+'</span>'
      : '<span class="pt-toggle-empty"></span>';

    var badge = '<span class="pt-badge" style="background:'+color+'">'+lbl.charAt(0)+'</span>';

    var row = '<div class="pt-node'+(isSelected?' selected':'')+'" data-id="'+node.id+'" style="padding-left:'+(depth*16+8)+'px">'
      + toggle + badge
      + '<span class="pt-node-label" style="color:'+'var(--text,#000)'+'">'+node.label+'</span>'
      + '</div>';

    var children = (hasChildren && node.expanded)
      ? '<div class="pt-children">'+buildTreeHtml(node.children, depth+1)+'</div>'
      : '';

    return row + children;
  }).join('');
}

function bindTreeEvents() {
  // 토글 클릭
  document.querySelectorAll('.pt-toggle').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var id = this.dataset.id;
      toggleNode(partnerTree, id);
      savePartnerTree();
      renderTree();
    });
  });

  // 노드 선택
  document.querySelectorAll('.pt-node').forEach(function(el) {
    el.addEventListener('click', function() {
      selectedPartnerId = this.dataset.id;
      try { localStorage.setItem('selectedPartnerId', selectedPartnerId); } catch(e){}
      renderTree();
      renderPartnerInfo(selectedPartnerId);
    });
  });
}

function toggleNode(nodes, id) {
  nodes.forEach(function(node) {
    if(node.id === id) {
      node.expanded = !node.expanded;
      if(!node.expanded && node.children) {
        // 닫을 때 하위 전부 닫기
        (function closeAll(children) {
          (children || []).forEach(function(c) { c.expanded = false; if(c.children) closeAll(c.children); });
        })(node.children);
      }
      return;
    }
    if(node.children) toggleNode(node.children, id);
  });
}

function setAllExpanded(nodes, val) {
  nodes.forEach(function(node) {
    node.expanded = val;
    if(node.children) setAllExpanded(node.children, val);
  });
}

// ── 파트너 정보 패널 ──
function renderPartnerInfo(id) {
  var node = findNode(partnerTree, id);
  if(!node) return;
  var color = levelColor[node.level] || '#888';
  var lbl   = levelLabel[node.level] || '';

  var parentNode = findParentNode(partnerTree, node.id, null);
  var pMaxRC = parentNode ? parseFloat(parentNode.rollCasino!=null?parentNode.rollCasino:5) : 5;
  var pMaxRS = parentNode ? parseFloat(parentNode.rollSlot!=null?parentNode.rollSlot:5) : 5;
  var pMaxRM = parentNode ? parseFloat(parentNode.rollMini!=null?parentNode.rollMini:5) : 5;
  var pMaxLS = parentNode ? parseInt(parentNode.losingSlot!=null?parentNode.losingSlot:100) : 100;

  document.getElementById('pt-info-grid').innerHTML = `
    <div class="pt-info-panel">
      <div class="pt-info-panel-title">기본정보</div>
      <div class="pt-info-field"><label>구분</label>
        <div class="pt-info-val" style="color:${color}">${lbl}</div>
      </div>
      <div class="pt-info-field"><label>접속ID / 닉네임</label>
        <div class="pt-info-val" style="color:var(--text,#000)">${node.label} / ${node.label}</div>
      </div>
      <div class="pt-info-field"><label>보유머니</label>
        <div class="pt-info-val-row" style="display:flex;align-items:center;gap:8px;">
          <span style="color:#60a5fa;font-weight:700;" id="pt-info-money">${(node.money||0).toLocaleString()}</span>
          <button class="pt-action-btn pt-btn-green" id="pt-info-money-give" style="padding:3px 10px;font-size:0.72rem;">지급</button>
          <button class="pt-action-btn pt-btn-red" id="pt-info-money-take" style="padding:3px 10px;font-size:0.72rem;">회수</button>
        </div>
      </div>
      <div class="pt-info-field"><label>보유롤링금</label>
        <div class="pt-info-val-row" style="display:flex;align-items:center;gap:8px;">
          <span style="color:#4ade80;font-weight:700;" id="pt-info-rolling">${((node.point||0)+(node.rollingPoint||0)).toLocaleString()}</span>
          <button class="pt-action-btn pt-btn-green" id="pt-info-rolling-give" style="padding:3px 10px;font-size:0.72rem;">지급</button>
          <button class="pt-action-btn pt-btn-red" id="pt-info-rolling-take" style="padding:3px 10px;font-size:0.72rem;">회수</button>
        </div>
      </div>
      <div class="pt-info-field"><label>비밀번호</label>
        <div class="pt-info-val-row" style="position:relative;">
          <input type="password" class="pt-input" id="pt-info-pw" value="${node.password||'1234'}" readonly style="padding-right:36px;">
          <button type="button" id="pt-pw-eye" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text2);font-size:1rem;padding:0;line-height:1;" title="비밀번호 보기">👁</button>
        </div>
      </div>
    </div>

    <div class="pt-info-panel">
      <div class="pt-info-panel-title">롤링 &amp; 루징</div>
      <div class="pt-info-field"><label>롤링 % (카지노) <span style="color:var(--text3);font-size:0.7rem;">max ${pMaxRC}%</span></label>
        <div class="pt-info-val-row">
          <select class="pt-input" id="pt-info-rc" style="width:120px;">${Array.from({length:Math.round(pMaxRC*10)+1},function(_,i){var v=(i*0.1).toFixed(1);return '<option value="'+v+'"'+(v==parseFloat(node.rollCasino||0).toFixed(1)?' selected':'')+'>'+v+'%</option>';}).join('')}</select>
          <button class="pt-action-btn pt-btn-purple pt-info-roll-save" data-field="rollCasino" data-input="pt-info-rc">변경</button>
        </div>
      </div>
      <div class="pt-info-field"><label>롤링 % (슬롯) <span style="color:var(--text3);font-size:0.7rem;">max ${pMaxRS}%</span></label>
        <div class="pt-info-val-row">
          <select class="pt-input" id="pt-info-rs" style="width:120px;">${Array.from({length:Math.round(pMaxRS*10)+1},function(_,i){var v=(i*0.1).toFixed(1);return '<option value="'+v+'"'+(v==parseFloat(node.rollSlot||0).toFixed(1)?' selected':'')+'>'+v+'%</option>';}).join('')}</select>
          <button class="pt-action-btn pt-btn-purple pt-info-roll-save" data-field="rollSlot" data-input="pt-info-rs">변경</button>
        </div>
      </div>
      <div class="pt-info-field"><label>롤링 % (미니게임) <span style="color:var(--text3);font-size:0.7rem;">max ${pMaxRM}%</span></label>
        <div class="pt-info-val-row">
          <select class="pt-input" id="pt-info-rm" style="width:120px;">${Array.from({length:Math.round(pMaxRM*10)+1},function(_,i){var v=(i*0.1).toFixed(1);return '<option value="'+v+'"'+(v==parseFloat(node.rollMini||0).toFixed(1)?' selected':'')+'>'+v+'%</option>';}).join('')}</select>
          <button class="pt-action-btn pt-btn-purple pt-info-roll-save" data-field="rollMini" data-input="pt-info-rm">변경</button>
        </div>
      </div>
      <div style="border-top:1px solid var(--border);margin:8px 0;"></div>
      <div class="pt-info-field"><label>루징 % <span style="color:var(--text3);font-size:0.7rem;">max ${pMaxLS}%</span></label>
        <div class="pt-info-val-row">
          <select class="pt-input" id="pt-info-ls" style="width:120px;">${Array.from({length:pMaxLS+1},function(_,i){return '<option value="'+i+'"'+(i==parseInt(node.losingSlot||0)?' selected':'')+'>'+i+'%</option>';}).join('')}</select>
          <button class="pt-action-btn pt-btn-purple pt-info-roll-save" data-field="losingSlot" data-input="pt-info-ls">변경</button>
        </div>
      </div>
    </div>

    <div class="pt-info-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="pt-info-panel-title" style="margin:0;">베팅 및 당첨금</div>
        <button class="pt-action-btn pt-btn-purple" id="pt-info-bet-load" style="padding:3px 12px;font-size:0.72rem;">조회</button>
      </div>
      <div id="pt-info-betting" style="font-size:0.8rem;padding:8px 0;"></div>
    </div>

    <div class="pt-info-panel">
      <div class="pt-info-panel-title">자금이동</div>
      <div class="pt-info-field"><label>충전금 합계</label>
        <div class="pt-info-val">0</div>
      </div>
      <div class="pt-info-field"><label>환전금 합계</label>
        <div class="pt-info-val">0</div>
      </div>
      <div class="pt-info-field"><label>알지급금 합계</label>
        <div class="pt-info-val">0</div>
      </div>
      <div class="pt-info-field"><label>알회수금 합계</label>
        <div class="pt-info-val">0</div>
      </div>
    </div>

    <div style="grid-column:1/-1;display:flex;justify-content:center;gap:8px;padding:4px 0;">
      <button class="pt-action-btn pt-btn-purple" id="pt-info-edit-btn" style="padding:7px 0;font-size:0.82rem;width:160px;text-align:center;">상세정보 / 수정</button>
      ${createBtnHtml(node.level)}
    </div>

    <div class="pt-sub-panel">
      <div class="pt-info-panel-title">하부 파트너 목록</div>
      ${buildSubTable(node)}
    </div>
  `;
  bindSubTableEvents();

  var editBtn = document.getElementById('pt-info-edit-btn');
  if(editBtn) editBtn.addEventListener('click', function(){ openPartnerModal(node); });

  var createBtn = document.getElementById('pt-create-btn');
  if(createBtn) createBtn.addEventListener('click', function(){ openCreateModal(node); });

  var pwEye = document.getElementById('pt-pw-eye');
  var pwInput = document.getElementById('pt-info-pw');
  if(pwEye && pwInput) {
    pwEye.addEventListener('click', function() {
      if(pwInput.type === 'password') {
        pwInput.type = 'text';
        pwEye.textContent = '🙈';
        pwEye.title = '비밀번호 숨기기';
      } else {
        pwInput.type = 'password';
        pwEye.textContent = '👁';
        pwEye.title = '비밀번호 보기';
      }
    });
  }

  // 보유머니 지급
  var moneyGiveBtn = document.getElementById('pt-info-money-give');
  if(moneyGiveBtn) moneyGiveBtn.addEventListener('click', function() {
    openInfoPopup('머니 지급', 'give', 'money', node);
  });

  // 보유머니 회수
  var moneyTakeBtn = document.getElementById('pt-info-money-take');
  if(moneyTakeBtn) moneyTakeBtn.addEventListener('click', function() {
    openInfoPopup('머니 회수', 'take', 'money', node);
  });

  // 보유롤링금 지급
  var rollingGiveBtn = document.getElementById('pt-info-rolling-give');
  if(rollingGiveBtn) rollingGiveBtn.addEventListener('click', function() {
    openInfoPopup('포인트 지급', 'give', 'point', node);
  });

  // 보유포인트 회수
  var rollingTakeBtn = document.getElementById('pt-info-rolling-take');
  if(rollingTakeBtn) rollingTakeBtn.addEventListener('click', function() {
    openInfoPopup('포인트 회수', 'take', 'point', node);
  });

  // 롤링/루징 변경 버튼
  document.querySelectorAll('.pt-info-roll-save').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 위임 핸들러 중복 실행 방지
      var field = this.getAttribute('data-field');
      var inputId = this.getAttribute('data-input');
      var sel = document.getElementById(inputId);
      if(!sel) return;
      node[field] = sel.value;
      savePartnerTree();
      _showToast(field + ' → ' + sel.value + '% 변경 완료', 'success');
      if (typeof renderTree === 'function') renderTree();
      renderPartnerInfo(id);
    });
  });

  // 베팅 데이터: 캐시 먼저 표시 + 자동 API 조회
  var betContainer = document.getElementById('pt-info-betting');
  var betCache = getBettingCache();
  if(betCache[node.id] && betCache[node.id].stats) {
    betContainer.innerHTML = renderBettingHtml(betCache[node.id].stats, node);
  } else {
    betContainer.innerHTML = '<div style="color:#888;text-align:center;padding:12px;"><i class="fas fa-spinner fa-spin"></i> 로드중...</div>';
  }
  loadPartnerBettingData(node);

  var betLoadBtn = document.getElementById('pt-info-bet-load');
  if(betLoadBtn) betLoadBtn.addEventListener('click', function() {
    var el = document.getElementById('pt-info-betting');
    if(el) el.innerHTML = '<div style="color:#888;text-align:center;padding:12px;"><i class="fas fa-spinner fa-spin"></i> 로드중...</div>';
    loadPartnerBettingData(node);
  });
}

// ── 하위 유저 ID 수집 ──
function collectChildUserIds(node) {
  var ids = [];
  if(node.level === 'member') { ids.push(node.id); return ids; }
  if(node.children) {
    node.children.forEach(function(c) {
      ids = ids.concat(collectChildUserIds(c));
    });
  }
  return ids;
}

// ── 파트너 베팅 데이터 API 로드 ──
var _bettingLoadId = 0;

function getBettingCache() {
  try { return JSON.parse(localStorage.getItem('partnerBettingCache') || '{}'); } catch(e){ return {}; }
}
function saveBettingCache(partnerId, stats) {
  try {
    var cache = getBettingCache();
    cache[partnerId] = { stats: stats, ts: Date.now() };
    localStorage.setItem('partnerBettingCache', JSON.stringify(cache));
  } catch(e){}
}

function renderBettingHtml(stats, node) {
  var rc = parseFloat(node.rollCasino || 0) / 100;
  var rs = parseFloat(node.rollSlot || 0) / 100;
  var rm = parseFloat(node.rollMini || 0) / 100;
  var rollAmtCasino = Math.floor(stats.betCasino * rc);
  var rollAmtSlot = Math.floor(stats.betSlot * rs);
  var rollAmtMini = Math.floor(stats.betMini * rm);

  return ''
    + '<div class="pt-info-field"><label>베팅/당첨금 (카지노)</label>'
    +   '<div class="pt-info-val"><span style="color:#60a5fa;">'+stats.betCasino.toLocaleString()+'</span> / <span style="color:#4ade80;">'+stats.winCasino.toLocaleString()+'</span></div></div>'
    + '<div class="pt-info-field"><label>베팅/당첨금 (슬롯)</label>'
    +   '<div class="pt-info-val"><span style="color:#60a5fa;">'+stats.betSlot.toLocaleString()+'</span> / <span style="color:#4ade80;">'+stats.winSlot.toLocaleString()+'</span></div></div>'
    + '<div class="pt-info-field"><label>베팅/당첨금 (미니게임)</label>'
    +   '<div class="pt-info-val"><span style="color:#60a5fa;">'+stats.betMini.toLocaleString()+'</span> / <span style="color:#4ade80;">'+stats.winMini.toLocaleString()+'</span></div></div>'
    + '<div style="border-top:1px solid var(--border);margin:8px 0;"></div>'
    + '<div class="pt-info-field"><label>롤링금 (카지노)</label>'
    +   '<div class="pt-info-val" style="color:#a78bfa;">'+rollAmtCasino.toLocaleString()+'</div></div>'
    + '<div class="pt-info-field"><label>롤링금 (슬롯)</label>'
    +   '<div class="pt-info-val" style="color:#a78bfa;">'+rollAmtSlot.toLocaleString()+'</div></div>'
    + '<div class="pt-info-field"><label>롤링금 (미니게임)</label>'
    +   '<div class="pt-info-val" style="color:#a78bfa;">'+rollAmtMini.toLocaleString()+'</div></div>';
}

function loadPartnerBettingData(node) {
  var container = document.getElementById('pt-info-betting');
  if(!container) return;

  var loadId = ++_bettingLoadId;

  var cache = getBettingCache();

  // 하위 회원 ID 수집
  var userIds = collectChildUserIds(node);
  if(node.level !== 'admin') userIds.push(node.id);

  // 상단 날짜 입력 사용, 없으면 최근 30일
  var dateFrom = document.getElementById('pt-date-from');
  var dateTo = document.getElementById('pt-date-to');
  var kstNow2 = new Date(new Date().getTime() + 9*60*60*1000);
  var today = kstNow2.toISOString().split('T')[0];
  var startDate = dateFrom ? dateFrom.value : today;
  var endDate = dateTo ? dateTo.value : today;
  if(!startDate) {
    var d = new Date(kstNow2.getTime() - 30*24*60*60*1000);
    startDate = d.toISOString().split('T')[0];
  }
  if(!endDate) endDate = today;

  // 로컬 저장 데이터 조회 (rate limit 없음)
  var url = '/api/hl/transactions/local?perPage=5000&order=desc'
    + '&types=bet,win'
    + '&start=' + encodeURIComponent(startDate + ' 00:00:00')
    + '&end=' + encodeURIComponent(endDate + ' 23:59:59');
  if(userIds.length > 0) url += '&usernames=' + encodeURIComponent(userIds.join(','));

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if(loadId !== _bettingLoadId) return;
      var el = document.getElementById('pt-info-betting');
      if(!el) return;

      var allData = (res.data || []).filter(function(t) {
        return t.details && t.details.game;
      });

      var stats = { betCasino:0, winCasino:0, betSlot:0, winSlot:0, betMini:0, winMini:0 };
      allData.forEach(function(t) {
        var gameType = (t.details.game.type || '').toLowerCase();
        var amt = Math.abs(t.amount || 0);
        if(gameType === 'slot' || gameType === 'slots') {
          if(t.type === 'bet') stats.betSlot += amt;
          else stats.winSlot += amt;
        } else if(gameType === 'mini') {
          if(t.type === 'bet') stats.betMini += amt;
          else stats.winMini += amt;
        } else {
          if(t.type === 'bet') stats.betCasino += amt;
          else stats.winCasino += amt;
        }
      });

      saveBettingCache(node.id, stats);
      el.innerHTML = renderBettingHtml(stats, node);
    })
    .catch(function(e) {
      if(loadId !== _bettingLoadId) return;
      var el = document.getElementById('pt-info-betting');
      if(!el) return;
      if(!cache[node.id]) {
        el.innerHTML = '<div style="color:#f87171;font-size:0.78rem;padding:8px;">베팅 데이터 로드 실패</div>';
      }
    });
}

// ── 쪽지 탭 데이터 로드 ──
function loadModalMessageData(node, overlay) {
  var listEl = overlay.querySelector('#pd-msg-list');
  if(!listEl) return;
  listEl.innerHTML = '<div style="color:#888;text-align:center;padding:24px;"><i class="fas fa-circle-notch fa-spin"></i> 로딩중...</div>';

  fetch('/api/admin/messages?userId=' + encodeURIComponent(node.id))
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var listEl2 = overlay.querySelector('#pd-msg-list');
      if(!listEl2) return;
      var data = res.data || [];

      if(data.length === 0) {
        listEl2.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">쪽지 내역이 없습니다</div>';
        return;
      }

      var rows = data.map(function(m, idx) {
        var date = m.createdAt ? new Date(m.createdAt).toLocaleString('ko-KR') : '-';
        var readLabel = m.read
          ? '<span style="color:#4ade80;">읽음</span>'
          : '<span style="color:#fbbf24;">안읽음</span>';

        var html = '<tr class="pd-msg-row" data-idx="' + idx + '" style="cursor:pointer;">'
          + '<td style="font-size:0.72rem;">' + date + '</td>'
          + '<td style="font-weight:600;">' + (m.title || '-') + '</td>'
          + '<td>' + readLabel + '</td>'
          + '<td><button class="pd-msg-del" data-id="' + m.id + '" style="padding:3px 10px;font-size:0.7rem;border-radius:4px;border:1px solid #ef4444;background:transparent;color:#ef4444;cursor:pointer;">삭제</button></td>'
          + '</tr>';

        html += '<tr class="pd-msg-detail" id="pd-msg-detail-' + idx + '" style="display:none;">'
          + '<td colspan="4" style="padding:0;">'
          + '<div style="background:var(--sidebar);padding:14px 18px;border-top:1px solid var(--border);">'
          + '<div style="font-size:0.82rem;color:var(--text);white-space:pre-wrap;line-height:1.6;">' + (m.content || '-') + '</div>'
          + '</div></td></tr>';

        return html;
      }).join('');

      listEl2.innerHTML = '<table class="db-table" style="font-size:0.78rem;">'
        + '<thead><tr><th>일시</th><th>제목</th><th>읽음</th><th>관리</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';

      // 행 클릭 시 내용 토글
      listEl2.querySelectorAll('.pd-msg-row').forEach(function(row) {
        row.addEventListener('click', function(e) {
          if(e.target.closest('.pd-msg-del')) return;
          var idx = this.dataset.idx;
          var detail = document.getElementById('pd-msg-detail-' + idx);
          if(detail) detail.style.display = detail.style.display === 'none' ? '' : 'none';
        });
      });

      // 삭제 버튼
      listEl2.querySelectorAll('.pd-msg-del').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          if(!(await customConfirm('이 쪽지를 삭제하시겠습니까?'))) return;
          var msgId = this.dataset.id;
          fetch('/api/admin/messages/' + msgId, { method: 'DELETE' })
            .then(function(r){ return r.json(); })
            .then(function() {
              _showToast('🗑 쪽지가 삭제되었습니다.', 'warn');
              loadModalMessageData(node, overlay);
            });
        });
      });
    })
    .catch(function() {
      var listEl2 = overlay.querySelector('#pd-msg-list');
      if(listEl2) listEl2.innerHTML = '<div style="color:#f87171;text-align:center;padding:24px;">데이터 로드 실패</div>';
    });
}

// ── 추천코드 탭 데이터 로드 ──
function loadModalReferralData(node, overlay) {
  var listEl = overlay.querySelector('#pd-referral-list');
  if(!listEl) return;
  listEl.innerHTML = '<div style="color:#888;text-align:center;padding:24px;"><i class="fas fa-circle-notch fa-spin"></i> 로딩중...</div>';

  fetch('/api/admin/referrals?userId=' + encodeURIComponent(node.id))
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var listEl2 = overlay.querySelector('#pd-referral-list');
      if(!listEl2) return;
      var data = res.data || [];

      if(data.length === 0) {
        listEl2.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">등록된 추천인 코드가 없습니다.</div>';
        return;
      }

      var rows = data.map(function(r) {
        var date = r.createdAt ? new Date(r.createdAt).toLocaleString('ko-KR') : '-';
        var usedList = (r.usedBy || []).join(', ') || '-';
        return '<tr>'
          + '<td style="font-weight:700;color:#00e5ff;font-size:0.85rem;">' + (r.code || '-') + '</td>'
          + '<td>' + (r.usedCount || 0) + '명</td>'
          + '<td style="font-size:0.72rem;color:var(--text2);">' + usedList + '</td>'
          + '<td style="font-size:0.72rem;">' + date + '</td>'
          + '<td><button class="pd-ref-del" data-id="' + r.id + '" style="padding:3px 10px;font-size:0.7rem;border-radius:4px;border:1px solid #ef4444;background:transparent;color:#ef4444;cursor:pointer;">삭제</button></td>'
          + '</tr>';
      }).join('');

      listEl2.innerHTML = '<table class="db-table" style="font-size:0.78rem;">'
        + '<thead><tr><th>코드</th><th>사용 수</th><th>사용자</th><th>생성일</th><th>관리</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';

      // 삭제 버튼
      listEl2.querySelectorAll('.pd-ref-del').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          if(!(await customConfirm('이 추천코드를 삭제하시겠습니까?'))) return;
          var refId = this.dataset.id;
          fetch('/api/admin/referrals/' + refId, { method: 'DELETE' })
            .then(function(r){ return r.json(); })
            .then(function() { loadModalReferralData(node, overlay); });
        });
      });
    })
    .catch(function() {
      var listEl2 = overlay.querySelector('#pd-referral-list');
      if(listEl2) listEl2.innerHTML = '<div style="color:#f87171;text-align:center;padding:24px;">데이터 로드 실패</div>';
    });
}

// ── 문의내역 탭 데이터 로드 ──
function loadModalInquiryData(node, overlay) {
  var listEl = overlay.querySelector('#pd-inquiry-list');
  if(!listEl) return;
  listEl.innerHTML = '<div style="color:#888;text-align:center;padding:24px;"><i class="fas fa-circle-notch fa-spin"></i> 로딩중...</div>';

  var activeCat = overlay.querySelector('.pd-inq-cat.active');
  var cat = activeCat ? activeCat.dataset.cat : 'all';

  var activePeriod = overlay.querySelector('.pd-inq-period.active');
  var period = activePeriod ? activePeriod.dataset.period : 'today';

  fetch('/api/admin/inquiries?userId=' + encodeURIComponent(node.id))
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var listEl2 = overlay.querySelector('#pd-inquiry-list');
      if(!listEl2) return;
      var allData = res.data || [];

      // 상단 카드 + 카테고리 버튼 카운트 업데이트
      var totalCount = allData.length;
      var pendingCount = allData.filter(function(q){ return q.status !== 'done'; }).length;
      var doneCount = allData.filter(function(q){ return q.status === 'done'; }).length;

      var totalEl = overlay.querySelector('#pd-inq-total');
      var pendEl = overlay.querySelector('#pd-inq-pending');
      var doneEl = overlay.querySelector('#pd-inq-done');
      if(totalEl) totalEl.textContent = totalCount + '건';
      if(pendEl) pendEl.textContent = pendingCount + '건';
      if(doneEl) doneEl.textContent = doneCount + '건';

      // 카테고리 버튼 텍스트 업데이트
      overlay.querySelectorAll('.pd-inq-cat').forEach(function(btn) {
        if(btn.dataset.cat === 'all') btn.textContent = '전체 (' + totalCount + ')';
        else if(btn.dataset.cat === 'pending') btn.textContent = '미답변 (' + pendingCount + ')';
        else if(btn.dataset.cat === 'done') btn.textContent = '답변완료 (' + doneCount + ')';
      });

      var data = allData;

      // 카테고리 필터
      if(cat === 'pending') data = data.filter(function(q){ return q.status !== 'done'; });
      else if(cat === 'done') data = data.filter(function(q){ return q.status === 'done'; });

      // 기간 필터
      var today = new Date();
      var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
      var startDate = todayStr, endDate = todayStr;

      if(period === 'yesterday') {
        var yd = new Date(today); yd.setDate(yd.getDate()-1);
        startDate = endDate = yd.getFullYear() + '-' + String(yd.getMonth()+1).padStart(2,'0') + '-' + String(yd.getDate()).padStart(2,'0');
      } else if(period === '7d') {
        var d7 = new Date(today); d7.setDate(d7.getDate()-7);
        startDate = d7.getFullYear() + '-' + String(d7.getMonth()+1).padStart(2,'0') + '-' + String(d7.getDate()).padStart(2,'0');
      } else if(period === '30d') {
        var d30 = new Date(today); d30.setDate(d30.getDate()-30);
        startDate = d30.getFullYear() + '-' + String(d30.getMonth()+1).padStart(2,'0') + '-' + String(d30.getDate()).padStart(2,'0');
      }

      data = data.filter(function(q) {
        var d = (q.datetime || q.createdAt || '').split(' ')[0];
        return d >= startDate && d <= endDate;
      });

      if(data.length === 0) {
        listEl2.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">문의 내역이 없습니다.</div>';
        return;
      }

      var rows = data.map(function(q, idx) {
        var statusLabel = q.status === 'done'
          ? '<span style="color:#4ade80;font-weight:600;">답변완료</span>'
          : '<span style="color:#fbbf24;font-weight:600;">대기중</span>';
        var date = q.datetime || q.createdAt || '-';

        var html = '<tr class="pd-inq-row" data-idx="' + idx + '" style="cursor:pointer;">'
          + '<td style="font-size:0.72rem;">' + date + '</td>'
          + '<td style="font-weight:600;">' + (q.title || '-') + '</td>'
          + '<td>' + statusLabel + '</td>'
          + '</tr>';

        html += '<tr class="pd-inq-detail" id="pd-inq-detail-' + idx + '" style="display:none;">'
          + '<td colspan="3" style="padding:0;">'
          + '<div style="background:var(--sidebar);padding:14px 18px;border-top:1px solid var(--border);">'
          + '<div style="margin-bottom:10px;"><span style="font-size:0.72rem;color:var(--text2);">문의 내용</span>'
          + '<div style="margin-top:4px;font-size:0.82rem;color:var(--text);white-space:pre-wrap;line-height:1.6;">' + (q.content || '-') + '</div></div>';

        if(q.answer) {
          html += '<div style="background:rgba(74,222,128,0.05);border:1px solid rgba(74,222,128,0.15);border-radius:6px;padding:10px 14px;">'
            + '<span style="font-size:0.72rem;color:#4ade80;">관리자 답변</span>'
            + '<div style="margin-top:4px;font-size:0.82rem;color:var(--text);white-space:pre-wrap;line-height:1.6;">' + q.answer + '</div>'
            + (q.answeredAt ? '<div style="font-size:0.68rem;color:var(--text2);margin-top:6px;">' + q.answeredAt + '</div>' : '')
            + '</div>';
        } else {
          html += '<div style="margin-top:10px;">'
            + '<textarea class="inq-reply-text" data-id="' + q.id + '" placeholder="답변을 입력하세요..." style="width:100%;min-height:80px;padding:10px;font-size:0.82rem;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);resize:vertical;box-sizing:border-box;"></textarea>'
            + '<div style="text-align:right;margin-top:6px;">'
            + '<button class="inq-reply-btn" data-id="' + q.id + '" style="padding:6px 20px;font-size:0.75rem;background:#10b981;border:none;color:#fff;border-radius:4px;cursor:pointer;font-weight:600;">답변 등록</button>'
            + '</div></div>';
        }

        html += '</div></td></tr>';
        return html;
      }).join('');

      listEl2.innerHTML = '<table class="db-table" style="font-size:0.78rem;">'
        + '<thead><tr><th>일시</th><th>제목</th><th>상태</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';

      listEl2.querySelectorAll('.pd-inq-row').forEach(function(row) {
        row.addEventListener('click', function() {
          var idx = this.dataset.idx;
          var detail = document.getElementById('pd-inq-detail-' + idx);
          if(detail) detail.style.display = detail.style.display === 'none' ? '' : 'none';
        });
      });

      // 답변 등록 버튼 이벤트
      listEl2.querySelectorAll('.inq-reply-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var qId = this.dataset.id;
          var textarea = listEl2.querySelector('.inq-reply-text[data-id="' + qId + '"]');
          var answer = textarea ? textarea.value.trim() : '';
          if(!answer) { _showToast('답변 내용을 입력하세요.', 'warn'); return; }

          fetch('/api/admin/inquiries/' + qId + '/reply', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: answer, answeredAt: nowStr() })
          })
          .then(function(r){ return r.json(); })
          .then(function(res) {
            if(res.success) {
              _showToast('✅ 답변이 등록되었습니다.', 'success');
              loadModalInquiryData(node, overlay);
            } else {
              _showToast(res.error || '답변 등록 실패', 'warn');
            }
          });
        });
      });
    })
    .catch(function() {
      var listEl2 = overlay.querySelector('#pd-inquiry-list');
      if(listEl2) listEl2.innerHTML = '<div style="color:#f87171;text-align:center;padding:24px;">데이터 로드 실패</div>';
    });
}

// ── 입출금 탭 데이터 로드 ──
function loadModalTransferData(node, overlay) {
  var listEl = overlay.querySelector('#pd-transfer-list');
  if(!listEl) return;
  listEl.innerHTML = '<div style="color:#888;text-align:center;padding:24px;"><i class="fas fa-circle-notch fa-spin"></i> 로딩중...</div>';

  var activeCat = overlay.querySelector('.pd-transfer-cat.active');
  var cat = activeCat ? activeCat.dataset.cat : 'all';

  var activeStatus = overlay.querySelector('.pd-transfer-status.active');
  var statusFilter = activeStatus ? activeStatus.dataset.status : 'all';

  var activePeriod = overlay.querySelector('.pd-transfer-period.active');
  var period = activePeriod ? activePeriod.dataset.period : 'today';

  var fromInput = overlay.querySelector('.pd-transfer-date-from');
  var toInput = overlay.querySelector('.pd-transfer-date-to');

  var url = '/api/admin/transfers?userId=' + encodeURIComponent(node.id);
  if(cat !== 'all') url += '&type=' + encodeURIComponent(cat);
  if(statusFilter !== 'all') url += '&status=' + encodeURIComponent(statusFilter);

  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var listEl2 = overlay.querySelector('#pd-transfer-list');
      if(!listEl2) return;

      var data = (res.data || []);

      // 날짜 필터
      var today = new Date();
      var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
      var startDate, endDate;

      if(fromInput && fromInput.value && toInput && toInput.value) {
        startDate = fromInput.value;
        endDate = toInput.value;
      } else if(period === 'today') {
        startDate = endDate = todayStr;
      } else if(period === 'yesterday') {
        var yd = new Date(today); yd.setDate(yd.getDate()-1);
        startDate = endDate = yd.getFullYear() + '-' + String(yd.getMonth()+1).padStart(2,'0') + '-' + String(yd.getDate()).padStart(2,'0');
      } else if(period === '7d') {
        var d7 = new Date(today); d7.setDate(d7.getDate()-7);
        startDate = d7.getFullYear() + '-' + String(d7.getMonth()+1).padStart(2,'0') + '-' + String(d7.getDate()).padStart(2,'0');
        endDate = todayStr;
      } else if(period === '30d') {
        var d30 = new Date(today); d30.setDate(d30.getDate()-30);
        startDate = d30.getFullYear() + '-' + String(d30.getMonth()+1).padStart(2,'0') + '-' + String(d30.getDate()).padStart(2,'0');
        endDate = todayStr;
      }

      if(startDate && endDate) {
        data = data.filter(function(t) {
          var d = (t.datetime || '').split(' ')[0];
          return d >= startDate && d <= endDate;
        });
      }

      // 상단 카드 업데이트 (전체 데이터 기준)
      var allData = res.data || [];
      var totalDep = 0, totalWit = 0, pendingCount = 0;
      allData.forEach(function(t) {
        if(t.type === 'deposit' && t.status === 'approved') totalDep += (t.amount || 0);
        if(t.type === 'withdraw' && t.status === 'approved') totalWit += (t.amount || 0);
        if(t.status === 'pending') pendingCount++;
      });
      var depEl = overlay.querySelector('#pd-transfer-total-dep');
      var witEl = overlay.querySelector('#pd-transfer-total-wit');
      var pendEl = overlay.querySelector('#pd-transfer-pending');
      if(depEl) depEl.textContent = totalDep.toLocaleString();
      if(witEl) witEl.textContent = totalWit.toLocaleString();
      if(pendEl) pendEl.textContent = pendingCount + '건';

      if(data.length === 0) {
        listEl2.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">입출금 내역이 없습니다</div>';
        return;
      }

      var rows = data.map(function(t, idx) {
        var isDeposit = t.type === 'deposit';
        var typeLabel = isDeposit ? '<span style="color:#4ade80;font-weight:600;">입금</span>' : '<span style="color:#f59e0b;font-weight:600;">출금</span>';
        var statusMap = { pending: '<span style="color:#fbbf24;">대기</span>', approved: '<span style="color:#4ade80;">완료</span>', rejected: '<span style="color:#ef4444;">취소</span>' };
        var statusLabel = statusMap[t.status] || t.status || '-';
        var amt = (t.amount || 0).toLocaleString();
        var actionBtns = '';
        if(t.status === 'pending') {
          actionBtns = '<button class="tf-approve-btn" data-id="' + t.id + '" style="padding:2px 8px;font-size:0.68rem;background:#10b981;border:none;color:#fff;border-radius:3px;cursor:pointer;margin-right:3px;">승인</button>'
            + '<button class="tf-reject-btn" data-id="' + t.id + '" style="padding:2px 8px;font-size:0.68rem;background:#ef4444;border:none;color:#fff;border-radius:3px;cursor:pointer;">취소</button>';
        } else {
          var processedDate = t.processedAt ? new Date(t.processedAt).toLocaleString('ko-KR') : '-';
          actionBtns = '<span style="font-size:0.68rem;color:var(--text2);">' + processedDate + '</span>';
        }

        return '<tr>'
          + '<td style="font-size:0.72rem;">' + (t.datetime || '-') + '</td>'
          + '<td>' + typeLabel + '</td>'
          + '<td style="color:' + (isDeposit ? '#4ade80' : '#f59e0b') + ';font-weight:600;">' + amt + '</td>'
          + '<td style="font-size:0.72rem;">' + (t.bank || '-') + '</td>'
          + '<td style="font-size:0.72rem;">' + (t.holder || '-') + '</td>'
          + '<td style="font-size:0.72rem;">' + (t.account || '-') + '</td>'
          + '<td>' + statusLabel + '</td>'
          + '<td>' + actionBtns + '</td>'
          + '</tr>';
      }).join('');

      listEl2.innerHTML = '<table class="db-table" style="font-size:0.78rem;">'
        + '<thead><tr><th>일시</th><th>구분</th><th>금액</th><th>은행</th><th>예금주</th><th>계좌</th><th>상태</th><th>처리</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';

      // 승인/취소 버튼 이벤트
      listEl2.querySelectorAll('.tf-approve-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var tid = this.dataset.id;
          if(!(await customConfirm('입출금을 승인하시겠습니까?'))) return;
          fetch('/api/admin/transfers/' + tid + '/approve', { method: 'PATCH' })
            .then(function(r){ return r.json(); })
            .then(function(res) {
              if(res.success) {
                _showToast('✅ 승인 완료', 'success');
                loadModalTransferData(node, overlay);
              } else {
                _showToast(res.error || '승인 실패', 'warn');
              }
            });
        });
      });
      listEl2.querySelectorAll('.tf-reject-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var tid = this.dataset.id;
          if(!(await customConfirm('입출금을 취소하시겠습니까?'))) return;
          fetch('/api/admin/transfers/' + tid + '/reject', { method: 'PATCH' })
            .then(function(r){ return r.json(); })
            .then(function(res) {
              if(res.success) {
                _showToast('❌ 취소 완료', 'warn');
                loadModalTransferData(node, overlay);
              } else {
                _showToast(res.error || '취소 실패', 'warn');
              }
            });
        });
      });
    })
    .catch(function() {
      var listEl2 = overlay.querySelector('#pd-transfer-list');
      if(listEl2) listEl2.innerHTML = '<div style="color:#f87171;text-align:center;padding:24px;">데이터 로드 실패</div>';
    });
}

// ── 포인트 탭 데이터 로드 ──
var _pdPointLoadId = 0;

function loadModalPointData(node, overlay) {
  var listEl = overlay.querySelector('#pd-point-list');
  if(!listEl) return;

  var activeCat = overlay.querySelector('.pd-point-cat.active');
  var cat = activeCat ? activeCat.dataset.cat : 'all';

  var activePeriod = overlay.querySelector('.pd-point-period.active');
  var period = activePeriod ? activePeriod.dataset.period : 'today';
  var fromInput = overlay.querySelector('.pd-point-date-from');
  var toInput = overlay.querySelector('.pd-point-date-to');
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  var startDate, endDate;

  if(fromInput && fromInput.value && toInput && toInput.value) {
    startDate = fromInput.value;
    endDate = toInput.value;
  } else if(period === 'today') {
    startDate = endDate = todayStr;
  } else if(period === 'yesterday') {
    var y = new Date(today); y.setDate(y.getDate()-1);
    startDate = endDate = y.getFullYear() + '-' + String(y.getMonth()+1).padStart(2,'0') + '-' + String(y.getDate()).padStart(2,'0');
  } else if(period === '7d') {
    var d7 = new Date(today); d7.setDate(d7.getDate()-7);
    startDate = d7.getFullYear() + '-' + String(d7.getMonth()+1).padStart(2,'0') + '-' + String(d7.getDate()).padStart(2,'0');
    endDate = todayStr;
  } else if(period === '30d') {
    var d30 = new Date(today); d30.setDate(d30.getDate()-30);
    startDate = d30.getFullYear() + '-' + String(d30.getMonth()+1).padStart(2,'0') + '-' + String(d30.getDate()).padStart(2,'0');
    endDate = todayStr;
  } else {
    startDate = endDate = todayStr;
  }

  // 서버에서 포인트 로그 가져오기
  var _pointStartDate = startDate, _pointEndDate = endDate, _pointCat = cat;
  _fetchMoneyLog('point', function(allLogs) {
    var data = allLogs.filter(function(log) {
      return log.targetId === node.id;
    });

    data = data.filter(function(log) {
      var d = (log.datetime || '').split(' ')[0];
      return d >= _pointStartDate && d <= _pointEndDate;
    });

    if(_pointCat === 'give') data = data.filter(function(log){ return log.type === 'give'; });
    else if(_pointCat === 'take') data = data.filter(function(log){ return log.type === 'take'; });
    else if(_pointCat === 'rolling') data = data.filter(function(log){ return log.memo && log.memo.indexOf('롤링') >= 0; });
    else if(_pointCat === 'losing') data = data.filter(function(log){ return log.memo && log.memo.indexOf('루징') >= 0; });
    else if(_pointCat === 'convert') data = data.filter(function(log){ return log.memo && log.memo.indexOf('전환') >= 0; });
    else if(_pointCat === 'attend') data = data.filter(function(log){ return log.memo && log.memo.indexOf('출석') >= 0; });
    else if(_pointCat === 'event') data = data.filter(function(log){ return log.memo && log.memo.indexOf('이벤트') >= 0; });

  // rolling_log.json에서 롤링 데이터 가져와서 병합
  fetch('/api/admin/rolling/log')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var allRolling = (res.data || []).filter(function(r) {
        return r.username === node.id && r.rollingPoint > 0;
      });

      var rollingTxs = allRolling.map(function(r) {
        var dt = r.datetime || '';
        if(dt) {
          try {
            var d = new Date(dt);
            dt = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
              + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
          } catch(e) {}
        }
        return {
          datetime: dt,
          type: 'give',
          processor: '시스템',
          amount: r.rollingPoint || 0,
          before: 0,
          after: 0,
          memo: '롤링 (' + (r.gameType || '') + '/' + (r.vendor || '') + ') - ' + (r.betBy || r.betUser || '')
        };
      });

      // 날짜 필터
      rollingTxs = rollingTxs.filter(function(r) {
        var d = (r.datetime || '').split(' ')[0];
        return d >= _pointStartDate && d <= _pointEndDate;
      });

      // 롤링 카테고리이거나 전체일 때 병합
      if(_pointCat === 'all' || _pointCat === 'rolling') {
        data = data.concat(rollingTxs);
      }

      // 날짜순 정렬 (최신순)
      data.sort(function(a, b) {
        return (b.datetime || '').localeCompare(a.datetime || '');
      });

      _renderPointList(data, overlay);
    })
    .catch(function() {
      _renderPointList(data, overlay);
    });
  }); // _fetchMoneyLog
}

function _renderPointList(data, overlay) {
  var listEl = overlay.querySelector('#pd-point-list');
  if(!listEl) return;

  // 총 지급/회수 계산
  var totalGive = 0, totalTake = 0;
  data.forEach(function(log) {
    if(log.type === 'give') totalGive += (log.amount || 0);
    else totalTake += (log.amount || 0);
  });
  var giveEl = overlay.querySelector('#pd-point-total-give');
  var takeEl = overlay.querySelector('#pd-point-total-take');
  if(giveEl) giveEl.textContent = '+' + totalGive.toLocaleString();
  if(takeEl) takeEl.textContent = '-' + totalTake.toLocaleString();

  if(data.length === 0) {
    listEl.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">거래 내역이 없습니다</div>';
    return;
  }

  var rows = data.map(function(log) {
    var isGive = log.type === 'give';
    var typeLabel = isGive ? '<span style="color:#4ade80;font-weight:600;">지급</span>' : '<span style="color:#ef4444;font-weight:600;">회수</span>';
    var amt = log.amount || 0;
    var amtColor = isGive ? '#4ade80' : '#ef4444';
    var amtStr = (isGive ? '+' : '-') + amt.toLocaleString();

    return '<tr>'
      + '<td style="font-size:0.72rem;">' + (log.datetime || '-') + '</td>'
      + '<td>' + typeLabel + '</td>'
      + '<td style="font-size:0.72rem;">' + (log.processor || '-') + '</td>'
      + '<td style="color:' + amtColor + ';font-weight:600;">' + amtStr + '</td>'
      + '<td style="font-weight:600;">' + (log.before || 0).toLocaleString() + '</td>'
      + '<td style="font-weight:600;">' + (log.after || 0).toLocaleString() + '</td>'
      + '<td style="font-size:0.72rem;color:var(--text2);">' + (log.memo || '-') + '</td>'
      + '</tr>';
  }).join('');

  listEl.innerHTML = '<table class="db-table" style="font-size:0.78rem;">'
    + '<thead><tr><th>일시</th><th>구분</th><th>처리자</th><th>변동</th><th>이전</th><th>이후</th><th>메모</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>';
}

// ── 머니 탭 데이터 로드 ──
var _pdMoneyLoadId = 0;

function loadModalMoneyData(node, overlay) {
  var loadId = ++_pdMoneyLoadId;
  var listEl = overlay.querySelector('#pd-money-list');
  if(!listEl) return;
  listEl.innerHTML = '<div style="color:#888;text-align:center;padding:24px;"><i class="fas fa-circle-notch fa-spin"></i> 로딩중...</div>';

  // 카테고리
  var activeCat = overlay.querySelector('.pd-money-cat.active');
  var cat = activeCat ? activeCat.dataset.cat : 'all';

  // 기간
  var activePeriod = overlay.querySelector('.pd-money-period.active');
  var period = activePeriod ? activePeriod.dataset.period : 'today';
  var fromInput = overlay.querySelector('.pd-money-date-from');
  var toInput = overlay.querySelector('.pd-money-date-to');
  var kstNow = new Date(new Date().getTime() + 9*60*60*1000);
  var today = kstNow.toISOString().split('T')[0];
  var startDate, endDate;

  if(fromInput && fromInput.value && toInput && toInput.value) {
    startDate = fromInput.value;
    endDate = toInput.value;
  } else if(period === 'today') {
    startDate = endDate = today;
  } else if(period === 'yesterday') {
    var y = new Date(kstNow.getTime() - 24*60*60*1000);
    startDate = endDate = y.toISOString().split('T')[0];
  } else if(period === '7d') {
    var d7 = new Date(kstNow.getTime() - 7*24*60*60*1000);
    startDate = d7.toISOString().split('T')[0]; endDate = today;
  } else if(period === '30d') {
    var d30 = new Date(kstNow.getTime() - 30*24*60*60*1000);
    startDate = d30.toISOString().split('T')[0]; endDate = today;
  } else {
    startDate = endDate = today;
  }

  // 카테고리 → API 타입 매핑
  var typeMap = {
    'all': '',
    'give': 'agent.add_balance',
    'take': 'causer.agent.add_balance',
    'deposit': 'charge',
    'withdraw': 'adjust',
    'rolling': 'promo_win'
  };
  var apiTypes = typeMap[cat] || '';

  var url = '/api/hl/transactions/local?perPage=5000&order=desc'
    + '&start=' + encodeURIComponent(startDate + ' 00:00:00')
    + '&end=' + encodeURIComponent(endDate + ' 23:59:59');
  if(apiTypes) url += '&types=' + encodeURIComponent(apiTypes);
  url += '&usernames=' + encodeURIComponent(node.id);

  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(res) {
      if(loadId !== _pdMoneyLoadId) return;
      var listEl2 = overlay.querySelector('#pd-money-list');
      if(!listEl2) return;

      var apiData = (res.data || []).filter(function(t) {
        return t.type !== 'bet' && t.type !== 'win';
      });

      // localStorage 머니 로그도 병합
      var localLogs = typeof loadPartnerMoneyLog === 'function' ? loadPartnerMoneyLog() : [];
      var localFiltered = localLogs.filter(function(log) {
        if(log.targetId !== node.id) return false;
        var d = (log.datetime || '').split(' ')[0];
        if(d < startDate || d > endDate) return false;
        if(cat === 'give' && log.type !== 'give') return false;
        if(cat === 'take' && log.type !== 'take') return false;
        return true;
      });

      // localStorage 로그를 API 형식으로 변환
      var localConverted = localFiltered.map(function(log) {
        return {
          type: log.type === 'give' ? 'agent.add_balance' : 'causer.agent.add_balance',
          amount: log.type === 'give' ? (log.amount || 0) : -(log.amount || 0),
          before: log.before || 0,
          processed_at: log.datetime,
          details: { ip: log.memo || '' },
          _source: 'local',
          _processor: log.processor || '관리자'
        };
      });

      var data = apiData.concat(localConverted);
      // 날짜순 정렬 (최신순)
      data.sort(function(a, b) {
        var da = a.processed_at || a.created_at || '';
        var db = b.processed_at || b.created_at || '';
        return db.localeCompare(da);
      });

      // 총 지급/회수 계산
      var totalGive = 0, totalTake = 0;
      data.forEach(function(t) {
        if(t.type === 'agent.add_balance' && t.amount > 0) totalGive += t.amount;
        if((t.type === 'causer.agent.add_balance' || t.type === 'agent.subtract_balance_all') && t.amount < 0) totalTake += Math.abs(t.amount);
      });
      var giveEl = overlay.querySelector('#pd-money-total-give');
      var takeEl = overlay.querySelector('#pd-money-total-take');
      if(giveEl) giveEl.textContent = '+' + totalGive.toLocaleString();
      if(takeEl) takeEl.textContent = '-' + totalTake.toLocaleString();

      if(data.length === 0) {
        listEl2.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">거래 내역이 없습니다</div>';
        return;
      }

      // 타입 한글 매핑
      var typeNameMap = {
        'cancel': '취소',
        'agent.add_balance': '지급',
        'causer.agent.add_balance': '회수',
        'agent.subtract_balance_all': '회수',
        'charge': '입금',
        'adjust': '출금',
        'promo_win': '롤링',
        'tip': '팁'
      };

      var rows = data.map(function(t) {
        var typeName = typeNameMap[t.type] || t.type;
        var typeColor = '#888';
        if(t.type === 'agent.add_balance') typeColor = '#4ade80';
        else if(t.type === 'causer.agent.add_balance') typeColor = '#ef4444';
        else if(t.type === 'agent.subtract_balance_all') typeColor = '#ef4444';
        else if(t.type === 'charge') typeColor = '#a78bfa';
        else if(t.type === 'adjust') typeColor = '#f97316';
        else if(t.type === 'promo_win') typeColor = '#ec4899';

        var amt = t.amount || 0;
        var amtColor = amt >= 0 ? '#4ade80' : '#ef4444';
        var amtStr = (amt >= 0 ? '+' : '') + amt.toLocaleString();
        var after = (t.before || 0) + amt;

        var date = t.processed_at || t.created_at || '-';
        if(date !== '-') date = new Date(date).toLocaleString('ko-KR');

        var detail = '';
        if(t.details && t.details.game) detail = t.details.game.title || '';
        if(t.details && t.details.ip) detail = t.details.ip;

        var processor = t._processor || '시스템';

        return '<tr>'
          + '<td style="font-size:0.72rem;">' + processor + '</td>'
          + '<td style="font-size:0.72rem;">' + date + '</td>'
          + '<td><span style="color:' + typeColor + ';font-weight:600;font-size:0.75rem;">' + typeName + '</span></td>'
          + '<td style="color:' + amtColor + ';font-weight:600;">' + amtStr + '</td>'
          + '<td style="font-weight:600;">' + after.toLocaleString() + '</td>'
          + '<td style="font-size:0.72rem;color:var(--text2);">' + detail + '</td>'
          + '</tr>';
      }).join('');

      listEl2.innerHTML = '<table class="db-table" style="font-size:0.78rem;">'
        + '<thead><tr><th>처리자</th><th>일시</th><th>구분</th><th>변동금액</th><th>잔액</th><th>상세</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';
    })
    .catch(function() {
      if(loadId !== _pdMoneyLoadId) return;
      var listEl2 = overlay.querySelector('#pd-money-list');
      if(listEl2) listEl2.innerHTML = '<div style="color:#f87171;text-align:center;padding:24px;">데이터 로드 실패</div>';
    });
}

// ── 베팅 탭 데이터 로드 ──
var _pdBetLoadId = 0;

function loadModalBettingData(node, overlay) {
  var loadId = ++_pdBetLoadId;
  var listEl = overlay.querySelector('#pd-bet-list');
  if(!listEl) return;

  listEl.innerHTML = '<div style="color:#888;text-align:center;padding:24px;"><i class="fas fa-circle-notch fa-spin"></i> 로딩중...</div>';

  // 선택된 카테고리
  var activeCat = overlay.querySelector('.pd-bet-cat.active');
  var cat = activeCat ? activeCat.dataset.cat : 'casino';

  // 기간 계산
  var activePeriod = overlay.querySelector('.pd-bet-period.active');
  var period = activePeriod ? activePeriod.dataset.period : 'today';
  var fromInput = overlay.querySelector('.pd-bet-date-from');
  var toInput = overlay.querySelector('.pd-bet-date-to');
  // KST 기준 오늘 날짜
  var kstNow = new Date(new Date().getTime() + 9*60*60*1000);
  var today = kstNow.toISOString().split('T')[0];
  var startDate, endDate;

  if(fromInput && fromInput.value && toInput && toInput.value) {
    startDate = fromInput.value;
    endDate = toInput.value;
  } else if(period === 'today') {
    startDate = endDate = today;
  } else if(period === 'yesterday') {
    var y = new Date(kstNow.getTime() - 24*60*60*1000);
    startDate = endDate = y.toISOString().split('T')[0];
  } else if(period === '7d') {
    var d7 = new Date(kstNow.getTime() - 7*24*60*60*1000);
    startDate = d7.toISOString().split('T')[0]; endDate = today;
  } else if(period === '30d') {
    var d30 = new Date(kstNow.getTime() - 30*24*60*60*1000);
    startDate = d30.toISOString().split('T')[0]; endDate = today;
  } else {
    startDate = endDate = today;
  }

  // 로컬 저장 데이터 조회 (해당 파트너 본인만)
  var userIds = [node.id];

  var url = '/api/hl/transactions/local?perPage=5000&order=desc'
    + '&types=bet,win'
    + '&start=' + encodeURIComponent(startDate + ' 00:00:00')
    + '&end=' + encodeURIComponent(endDate + ' 23:59:59');
  if(userIds.length > 0) url += '&usernames=' + encodeURIComponent(userIds.join(','));

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if(loadId !== _pdBetLoadId) return;
      var listEl2 = overlay.querySelector('#pd-bet-list');
      if(!listEl2) return;

      var allData = (res.data || []).filter(function(t) {
        return t.details && t.details.game;
      });

      // 카테고리 필터
      var catFiltered = allData.filter(function(t) {
        var gt = (t.details.game.type || '').toLowerCase();
        if(cat === 'casino') return gt !== 'slot' && gt !== 'slots' && gt !== 'mini';
        if(cat === 'slot') return gt === 'slot' || gt === 'slots';
        if(cat === 'mini') return gt === 'mini';
        return true;
      });

      // 통계 계산
      var totalBet = 0, totalWin = 0;
      catFiltered.forEach(function(t) {
        var amt = Math.abs(t.amount || 0);
        if(t.type === 'bet') totalBet += amt;
        else totalWin += amt;
      });
      var profit = totalWin - totalBet;

      // 상단 카드 업데이트
      var te = overlay.querySelector('#pd-bet-total');
      var we = overlay.querySelector('#pd-bet-win');
      var pe = overlay.querySelector('#pd-bet-profit');
      if(te) te.textContent = totalBet.toLocaleString();
      if(we) we.textContent = totalWin.toLocaleString();
      if(pe) {
        pe.textContent = (profit >= 0 ? '+' : '') + profit.toLocaleString();
        pe.style.color = profit >= 0 ? '#4ade80' : '#ef4444';
      }

      // 마지막 수집 시간 표시
      var lastInfo = res.lastCollect ? new Date(res.lastCollect).toLocaleString('ko-KR') : '-';
      var infoHtml = '<div style="text-align:right;font-size:0.68rem;color:var(--text2);margin-bottom:6px;">마지막 수집: ' + lastInfo + ' | 총 ' + (res.total||0) + '건</div>';

      // bet/win을 라운드 기준으로 묶기
      var roundMap = {};
      var roundOrder = [];
      catFiltered.forEach(function(t) {
        var key = (t.details.game.id || '') + '|' + (t.details.game.round || '') + '|' + ((t.user && t.user.username) || '');
        if(!roundMap[key]) {
          roundMap[key] = { bets: [], wins: [], game: t.details.game, user: t.user };
          roundOrder.push(key);
        }
        if(t.type === 'bet') roundMap[key].bets.push(t);
        else roundMap[key].wins.push(t);
      });

      if(roundOrder.length === 0) {
        listEl2.innerHTML = infoHtml + '<div style="color:#888;text-align:center;padding:24px;">베팅 내역이 없습니다</div>';
        return;
      }

      var rows = roundOrder.map(function(key) {
        var r = roundMap[key];
        var betAmt = 0, winAmt = 0;
        r.bets.forEach(function(t){ betAmt += Math.abs(t.amount || 0); });
        r.wins.forEach(function(t){ winAmt += Math.abs(t.amount || 0); });
        // 당첨 후 보유금: win 트랜잭션의 before + amount, 없으면 bet의 before - betAmt
        var afterBalance = '-';
        if(r.wins.length > 0) {
          var lastWin = r.wins[r.wins.length - 1];
          afterBalance = ((lastWin.before || 0) + Math.abs(lastWin.amount || 0)).toLocaleString();
        } else if(r.bets.length > 0) {
          var lastBet = r.bets[r.bets.length - 1];
          afterBalance = ((lastBet.before || 0) - Math.abs(lastBet.amount || 0)).toLocaleString();
        }
        var firstTx = r.bets[0] || r.wins[0];
        var date = firstTx.processed_at || firstTx.created_at || '-';
        if(date !== '-') date = new Date(date).toLocaleString('ko-KR');
        var username = (r.user && r.user.username) || '-';
        var gameName = (r.game.title || r.game.identifier || '-');
        var vendor = (r.game.vendor || '-');
        // 결과
        var resultLabel = '-';
        if(r.wins.length > 0 && winAmt > 0) {
          resultLabel = '<span style="color:#4ade80;font-weight:600;">승</span>';
        } else if(r.wins.length > 0) {
          resultLabel = '<span style="color:#ef4444;font-weight:600;">패</span>';
        } else {
          resultLabel = '<span style="color:#888;">대기</span>';
        }
        var provider = vendor;
        var gameType = (r.game.type || '-');
        return '<tr>'
          + '<td style="font-size:0.72rem;">' + date + '</td>'
          + '<td>' + username + '</td>'
          + '<td style="font-size:0.72rem;">' + provider + '</td>'
          + '<td style="font-size:0.72rem;">' + gameType + '</td>'
          + '<td>' + gameName + '</td>'
          + '<td style="color:#ef4444;font-weight:600;">' + betAmt.toLocaleString() + '</td>'
          + '<td style="color:#4ade80;font-weight:600;">' + winAmt.toLocaleString() + '</td>'
          + '<td style="font-weight:600;">' + afterBalance + '</td>'
          + '<td>' + resultLabel + '</td>'
          + '</tr>';
      }).join('');

      listEl2.innerHTML = infoHtml + '<table class="db-table" style="font-size:0.78rem;">'
        + '<thead><tr><th>일시</th><th>유저</th><th>프로바이더</th><th>게임사</th><th>게임</th><th>베팅금</th><th>당첨금</th><th>보유금</th><th>결과</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';
    })
    .catch(function() {
      if(loadId !== _pdBetLoadId) return;
      var listEl2 = overlay.querySelector('#pd-bet-list');
      if(listEl2) listEl2.innerHTML = '<div style="color:#f87171;text-align:center;padding:24px;">데이터 로드 실패</div>';
    });
}

// ── 정보 패널 지급/회수 팝업 ──
function openInfoPopup(title, mode, field, node) {
  var old = document.getElementById('pt-info-popup-overlay');
  if(old) old.remove();

  var cur = (field === 'point') ? ((node.point||0)+(node.rollingPoint||0)) : (node[field] || 0);
  var isGive = mode === 'give';

  var overlay = document.createElement('div');
  overlay.id = 'pt-info-popup-overlay';
  overlay.className = 'money-popup-overlay';
  overlay.innerHTML = '<div class="money-popup" style="width:420px;">'
    + '<div class="money-popup-header" style="background:var(--sidebar);border-bottom:2px solid var(--blue);">'
    +   '<div style="display:flex;align-items:center;gap:10px;">'
    +     '<i class="fas fa-exchange-alt" style="color:var(--blue);font-size:1.1rem;"></i>'
    +     '<h3 style="margin:0;font-size:0.95rem;font-weight:700;color:var(--text);">머니 지급/회수</h3>'
    +   '</div>'
    +   '<button class="money-popup-close" id="info-popup-close">✕</button>'
    + '</div>'
    + '<div class="money-popup-body" style="padding:20px;">'
    +   '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;margin-bottom:14px;background:var(--bg);border-radius:8px;font-size:0.82rem;">'
    +     '<span style="color:var(--text3);">대상</span>'
    +     '<span style="color:var(--blue);font-weight:700;">'+node.id+'</span>'
    +     '<span style="color:var(--text2);">('+( node.label || node.id )+')</span>'
    +     '<span style="margin-left:auto;font-size:0.72rem;color:var(--text3);">'+(levelLabel[node.level]||node.level)+'</span>'
    +   '</div>'
    +   '<div class="money-popup-current">'
    +     '<span class="mp-label">현재 보유</span>'
    +     '<span class="mp-val" id="info-popup-balance" style="color:#60a5fa;">'+cur.toLocaleString()+'<span style="font-size:0.75rem;color:var(--text2);margin-left:2px;">원</span></span>'
    +   '</div>'
    +   '<div style="display:flex;gap:6px;margin-bottom:14px;">'
    +     '<button id="info-mode-give" style="flex:1;padding:8px;border-radius:6px;font-size:0.82rem;font-weight:700;cursor:pointer;border:2px solid '+(isGive?'#4ade80':'var(--border)')+';background:'+(isGive?'rgba(74,222,128,0.1)':'var(--bg)')+';color:'+(isGive?'#4ade80':'var(--text3)')+';transition:all 0.15s;">지급</button>'
    +     '<button id="info-mode-take" style="flex:1;padding:8px;border-radius:6px;font-size:0.82rem;font-weight:700;cursor:pointer;border:2px solid '+(!isGive?'#f87171':'var(--border)')+';background:'+(!isGive?'rgba(248,113,113,0.1)':'var(--bg)')+';color:'+(!isGive?'#f87171':'var(--text3)')+';transition:all 0.15s;">회수</button>'
    +   '</div>'
    +   '<div class="money-popup-field">'
    +     '<label id="info-popup-label">'+(isGive?'지급':'회수')+' 금액</label>'
    +     '<input type="number" id="info-popup-amount" placeholder="금액을 입력하세요" min="0">'
    +   '</div>'
    +   '<div class="mp-quick-btns">'
    +     '<button data-val="1000000">100만</button>'
    +     '<button data-val="500000">50만</button>'
    +     '<button data-val="100000">10만</button>'
    +     '<button data-val="50000">5만</button>'
    +     '<button data-val="10000">1만</button>'
    +   '</div>'
    +   '<div class="mp-quick-btns" style="margin-top:6px;">'
    +     '<button data-val="'+cur+'" id="info-all-btn" style="color:#60a5fa;border-color:#60a5fa;font-weight:700;display:'+(isGive?'none':'inline-block')+';">전체</button>'
    +     '<button class="mp-reset-btn" data-val="reset">초기화</button>'
    +   '</div>'
    + '</div>'
    + '<div class="money-popup-actions" style="padding:14px 20px;border-top:1px solid var(--border);background:var(--sidebar);">'
    +   '<button id="info-popup-cancel" style="background:var(--bg3);color:var(--text2);border:1px solid var(--border2);">취소</button>'
    +   '<button id="info-popup-confirm" style="background:'+(isGive?'#4ade80':'#f87171')+';color:#fff;">확인</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);

  var amountInput = document.getElementById('info-popup-amount');
  var giveBtn = document.getElementById('info-mode-give');
  var takeBtn = document.getElementById('info-mode-take');
  var confirmBtn2 = document.getElementById('info-popup-confirm');
  var labelEl = document.getElementById('info-popup-label');
  var allBtn2 = document.getElementById('info-all-btn');

  // 지급/회수 모드 전환
  function setMode(giveMode) {
    isGive = giveMode;
    giveBtn.style.borderColor = isGive ? '#4ade80' : 'var(--border)';
    giveBtn.style.background = isGive ? 'rgba(74,222,128,0.1)' : 'var(--bg)';
    giveBtn.style.color = isGive ? '#4ade80' : 'var(--text3)';
    takeBtn.style.borderColor = !isGive ? '#f87171' : 'var(--border)';
    takeBtn.style.background = !isGive ? 'rgba(248,113,113,0.1)' : 'var(--bg)';
    takeBtn.style.color = !isGive ? '#f87171' : 'var(--text3)';
    confirmBtn2.style.background = isGive ? '#4ade80' : '#f87171';
    labelEl.textContent = (isGive ? '지급' : '회수') + ' 금액';
    if(allBtn2) allBtn2.style.display = isGive ? 'none' : 'inline-block';
  }
  giveBtn.addEventListener('click', function() { setMode(true); });
  takeBtn.addEventListener('click', function() { setMode(false); });

  // 빠른 금액 버튼
  overlay.querySelectorAll('.mp-quick-btns button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var v = this.getAttribute('data-val');
      if(v === 'reset') { amountInput.value = ''; return; }
      v = parseInt(v, 10);
      if(isGive) { amountInput.value = (parseInt(amountInput.value) || 0) + v; }
      else { amountInput.value = v; }
    });
  });

  // 확인
  document.getElementById('info-popup-confirm').addEventListener('click', async function() {
    var val = parseInt(amountInput.value, 10);
    if(!val || val <= 0) { alert('금액을 입력하세요.'); return; }
    if(!isGive && val > cur) { alert('보유금액보다 클 수 없습니다.'); return; }

    // 파트너 권한 체크 (머니 이동)
    if(field === 'money' && node.level && node.level !== 'admin' && node.level !== 'member') {
      var permKey = isGive ? 'partnerMoneyGive' : 'partnerMoneyTake';
      var canDo = await _checkPartnerPerm(node.level, permKey);
      if(!canDo) { alert('해당 등급은 ' + (isGive ? '머니 지급' : '머니 회수') + ' 권한이 없습니다.'); return; }
    }
    // member 머니이동은 admin 직접 조작이므로 권한 체크 생략

    var confirmBtn = this;
    confirmBtn.disabled = true;
    confirmBtn.textContent = '처리중...';

    var apiAmount = isGive ? val : -val;

    // 머니: API 호출로 서버+게임사 반영
    if(field === 'money') {
      fetch('/api/admin/users/money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: node.id, amount: apiAmount })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if(res.success) {
          // 지급/회수 후 잔액 계산 (트리 기준)
          var newBal = isGive ? cur + val : cur - val;
          node.money = newBal;
          savePartnerTree();
          // 머니내역 로그 기록
          var logEntry = { datetime: nowStr(), type: isGive ? 'give' : 'take', processor: '관리자', processorLevel: 'admin', targetId: node.id, targetNick: node.label || node.id, targetLevel: node.level || '', amount: val, before: cur, after: newBal, memo: '' };
          if(typeof addPartnerMoneyLog === 'function') addPartnerMoneyLog(logEntry);
          if(typeof addAdminMoneyLog === 'function') addAdminMoneyLog(logEntry);
          var el = document.getElementById('pt-info-money');
          if(el) el.textContent = newBal.toLocaleString();
          // 회원 목록 머니셀 갱신
          var mCell = document.querySelector('.mb-money-cell[data-username="'+node.id+'"] div');
          if(mCell) mCell.textContent = '₩' + newBal.toLocaleString();
          if(typeof _ptRenderTableBody === 'function') _ptRenderTableBody();
          if(typeof _ptRenderListPage === 'function' && document.getElementById('ptl-tbody')) _ptRenderListPage();
          overlay.remove();
          _showToast((isGive ? '✅ 지급' : '📤 회수') + ' 완료: ' + val.toLocaleString() + '원', isGive ? 'success' : 'warn');
        } else {
          _showToast('처리 실패: ' + (res.error || ''), 'error');
          confirmBtn.disabled = false;
          confirmBtn.textContent = '확인';
        }
      })
      .catch(function(e) {
        _showToast('API 오류: ' + e.message, 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = '확인';
      });
    } else {
      // 포인트: 로컬 + 서버 처리 (point 필드만 변경, rollingPoint는 유지)
      if(isGive) { node.point = (node.point||0) + val; }
      else { var takeAmt2 = Math.min(val, cur); node.point = (node.point||0) - takeAmt2; }
      savePartnerTree();
      // 서버에도 반영
      var _updateFields = {};
      _updateFields['point'] = node.point;
      fetch('/api/admin/users/' + (node.username || node.id) + '/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(_updateFields)
      }).catch(function(){});
      // 포인트 내역 로그
      var totalAfter = (node.point||0) + (node.rollingPoint||0);
      var logEntry = { datetime: nowStr(), type: isGive ? 'give' : 'take', processor: '관리자', targetId: node.id, targetNick: node.label || node.id, amount: val, before: cur, after: totalAfter, memo: '포인트' };
      if(typeof addPartnerMoneyLog === 'function') addPartnerMoneyLog(logEntry);
      var displayId = 'pt-info-rolling';
      var el = document.getElementById(displayId);
      if(el) el.textContent = totalAfter.toLocaleString();
      if(typeof _ptRenderTableBody === 'function') _ptRenderTableBody();
      if(typeof _ptRenderListPage === 'function' && document.getElementById('ptl-tbody')) _ptRenderListPage();
      overlay.remove();
      _showToast((isGive ? '✅ 지급' : '📤 회수') + ' 완료: ' + val.toLocaleString() + 'P', isGive ? 'success' : 'warn');
    }
  });

  // 닫기
  document.getElementById('info-popup-close').addEventListener('click', function() { overlay.remove(); });
  document.getElementById('info-popup-cancel').addEventListener('click', function() { overlay.remove(); });
  overlay.addEventListener('click', function(e) { if(e.target === overlay) overlay.remove(); });
}

// ── 하부 생성 버튼 라벨 ──
var createChildLabel = {
  admin:       '본사생성',
  head:        '부본사생성',
  subhead:     '총판생성',
  distributor: '매장생성',
  store:       '회원생성',
};

function createBtnHtml(level) {
  var lbl = createChildLabel[level];
  if(!lbl) return '';
  return '<button class="pt-action-btn pt-btn-green" id="pt-create-btn" style="padding:7px 0;font-size:0.82rem;width:160px;text-align:center;">'+lbl+'</button>';
}

// ── 커스텀 확인 모달 ──
function showConfirmModal(opts) {
  // opts: { icon, iconColor, iconBg, title, message, confirmText, confirmColor, cancelText, onConfirm }
  var dim = document.createElement('div');
  dim.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--shadow);z-index:99999;display:flex;align-items:center;justify-content:center;animation:cfd-in 0.2s ease;';
  dim.innerHTML = ''
    + '<div style="background:var(--card,#1e293b);border:1px solid var(--border,#334155);border-radius:16px;padding:32px 28px 24px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px var(--shadow);animation:cfm-pop 0.25s ease;">'
    +   '<div style="width:56px;height:56px;border-radius:50%;background:'+(opts.iconBg||'rgba(248,113,113,0.15)')+';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
    +     '<i class="'+(opts.icon||'fas fa-exclamation-triangle')+'" style="font-size:1.4rem;color:'+(opts.iconColor||'#f87171')+';"></i>'
    +   '</div>'
    +   '<div style="font-size:1rem;font-weight:700;color:var(--text,#e2e8f0);margin-bottom:8px;">'+(opts.title||'확인')+'</div>'
    +   '<div style="font-size:0.85rem;color:var(--text2,#94a3b8);margin-bottom:24px;line-height:1.5;">'+(opts.message||'')+'</div>'
    +   '<div style="display:flex;gap:10px;">'
    +     '<button id="cfm-cancel" style="flex:1;padding:10px 0;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;border:1px solid var(--border,#334155);background:transparent;color:var(--text2,#94a3b8);transition:all 0.15s;">'+(opts.cancelText||'취소')+'</button>'
    +     '<button id="cfm-ok" style="flex:1;padding:10px 0;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;border:none;background:'+(opts.confirmColor||'#f87171')+';color:#fff;transition:all 0.15s;">'+(opts.confirmText||'확인')+'</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(dim);

  // 애니메이션 스타일
  if (!document.getElementById('cfm-anim-style')) {
    var st = document.createElement('style');
    st.id = 'cfm-anim-style';
    st.textContent = '@keyframes cfd-in{from{opacity:0}to{opacity:1}} @keyframes cfm-pop{from{opacity:0;transform:scale(0.9) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}';
    document.head.appendChild(st);
  }

  dim.querySelector('#cfm-cancel').addEventListener('click', function() { dim.remove(); });
  dim.addEventListener('click', function(e) { if(e.target === dim) dim.remove(); });
  dim.querySelector('#cfm-ok').addEventListener('click', function() {
    var btn = this;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
    if (opts.onConfirm) opts.onConfirm(function(){ dim.remove(); });
  });
}

// ── 커스텀 알림 모달 (alert 대체) ──
function showAlertModal(opts) {
  // opts: { icon, iconColor, iconBg, title, message, buttonText, buttonColor }
  var dim = document.createElement('div');
  dim.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--shadow);z-index:99999;display:flex;align-items:center;justify-content:center;animation:cfd-in 0.2s ease;';
  dim.innerHTML = ''
    + '<div style="background:var(--card,#1e293b);border:1px solid var(--border,#334155);border-radius:16px;padding:32px 28px 24px;max-width:360px;width:90%;text-align:center;box-shadow:0 20px 60px var(--shadow);animation:cfm-pop 0.25s ease;">'
    +   '<div style="width:56px;height:56px;border-radius:50%;background:'+(opts.iconBg||'rgba(96,165,250,0.15)')+';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
    +     '<i class="'+(opts.icon||'fas fa-info-circle')+'" style="font-size:1.4rem;color:'+(opts.iconColor||'#60a5fa')+';"></i>'
    +   '</div>'
    +   '<div style="font-size:1rem;font-weight:700;color:var(--text,#e2e8f0);margin-bottom:8px;">'+(opts.title||'알림')+'</div>'
    +   '<div style="font-size:0.85rem;color:var(--text2,#94a3b8);margin-bottom:24px;line-height:1.5;">'+(opts.message||'')+'</div>'
    +   '<button id="alert-ok" style="width:100%;padding:10px 0;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;border:none;background:'+(opts.buttonColor||'#60a5fa')+';color:#fff;transition:all 0.15s;">'+(opts.buttonText||'확인')+'</button>'
    + '</div>';
  document.body.appendChild(dim);
  dim.querySelector('#alert-ok').addEventListener('click', function() { dim.remove(); });
  dim.addEventListener('click', function(e) { if(e.target === dim) dim.remove(); });
}

// ── 비밀번호 지정 모달 ──
function _showPasswordSetModal(node) {
  var old = document.getElementById('pw-set-modal');
  if (old) old.remove();
  var dim = document.createElement('div');
  dim.id = 'pw-set-modal';
  dim.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--shadow);z-index:100001;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  dim.innerHTML =
    '<div style="background:linear-gradient(145deg,#1a1a2e,#16213e);border:1px solid var(--input-border);border-radius:16px;width:400px;max-width:90vw;overflow:hidden;box-shadow:0 20px 60px var(--shadow);animation:cfmIn 0.2s ease;">'
    + '<div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:20px 24px;display:flex;align-items:center;gap:14px;">'
    +   '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">'
    +     '<i class="fas fa-key" style="color:#fff;font-size:1.1rem;"></i>'
    +   '</div>'
    +   '<div>'
    +     '<div style="font-size:1rem;font-weight:700;color:#fff;">비밀번호 지정</div>'
    +     '<div style="font-size:0.75rem;color:rgba(255,255,255,0.7);margin-top:2px;">' + (node.label || node.id) + '</div>'
    +   '</div>'
    + '</div>'
    + '<div style="padding:24px;">'
    +   '<div style="margin-bottom:16px;">'
    +     '<label style="display:block;font-size:0.78rem;color:var(--text2);margin-bottom:6px;font-weight:600;">새 비밀번호</label>'
    +     '<input type="text" id="pw-set-input" placeholder="새 비밀번호를 입력하세요" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--input-border);background:var(--bg);color:var(--text1);font-size:0.85rem;outline:none;box-sizing:border-box;" autocomplete="off">'
    +   '</div>'
    +   '<div style="display:flex;gap:10px;justify-content:flex-end;">'
    +     '<button id="pw-set-cancel" style="padding:9px 20px;border-radius:8px;border:1px solid var(--input-border);background:var(--bg3);color:var(--text2);font-size:0.82rem;cursor:pointer;font-weight:600;">취소</button>'
    +     '<button id="pw-set-confirm" style="padding:9px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:0.82rem;cursor:pointer;font-weight:700;">변경</button>'
    +   '</div>'
    + '</div>'
    + '</div>';
  document.body.appendChild(dim);

  var input = document.getElementById('pw-set-input');
  input.focus();
  document.getElementById('pw-set-cancel').addEventListener('click', function() { dim.remove(); });
  dim.addEventListener('click', function(e) { if (e.target === dim) dim.remove(); });
  document.getElementById('pw-set-confirm').addEventListener('click', function() {
    var pw = input.value.trim();
    if (!pw) { input.style.borderColor = '#f87171'; input.focus(); return; }
    if (pw.length < 3) { alert('비밀번호는 3자 이상이어야 합니다.'); input.focus(); return; }
    node.password = pw;
    savePartnerTree();
    fetch('/api/admin/users/' + node.id + '/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    }).catch(function(){});
    dim.remove();
    showAlertModal({ title: '변경 완료', message: '비밀번호가 성공적으로 변경되었습니다.' });
  });
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('pw-set-confirm').click(); });
}

// ── 파트너 상세 모달 (레퍼런스 디자인) ──
function openPartnerModal(node) {
  var existing = document.getElementById('pt-detail-modal');
  if(existing) existing.remove();

  // 서버에서 최신 유저 데이터 반영
  fetch('/api/admin/users').then(function(r){ return r.json(); }).then(function(res) {
    if(res.success && res.data) {
      var fresh = res.data.find(function(u){ return u.id === node.id || u.username === node.id || u.username === node.label; });
      if(fresh) {
        node.money = fresh.money || 0;
        node.status = fresh.status || node.status;
        node.phone = fresh.phone || node.phone;
        node.bank = fresh.bank || node.bank;
        node.account = fresh.account || node.account;
        node.holder = fresh.holder || node.holder;
        node.memo = fresh.memo || node.memo;
        if(fresh.password) node.password = fresh.password;
        node.lastLoginAt = fresh.lastLoginAt || node.lastLoginAt;
        node.lastLoginIp = fresh.lastLoginIp || node.lastLoginIp;
        // users.json의 casino/slot 값을 perm 필드에 동기화
        if (fresh.casino !== undefined) node['perm카지노'] = fresh.casino !== 'OFF';
        if (fresh.slot !== undefined) node['perm슬롯'] = fresh.slot !== 'OFF';
      }
    }
    _renderPartnerModal(node);
  }).catch(function(){ _renderPartnerModal(node); });
}

function _renderPartnerModal(node) {
  var existing = document.getElementById('pt-detail-modal');
  if(existing) existing.remove();

  var parentNode = findParentNode(partnerTree, node.id, null);
  var parentLabel = parentNode ? parentNode.label : '-';
  var pMaxRC = parentNode ? parseFloat(parentNode.rollCasino!=null?parentNode.rollCasino:5) : 5;
  var pMaxRS = parentNode ? parseFloat(parentNode.rollSlot!=null?parentNode.rollSlot:5) : 5;
  var pMaxRM = parentNode ? parseFloat(parentNode.rollMini!=null?parentNode.rollMini:5) : 5;
  var pMaxLS = parentNode ? parseInt(parentNode.losingSlot!=null?parentNode.losingSlot:100) : 100;
  var childCount = node.children ? node.children.length : 0;
  var lbl = levelLabel[node.level] || node.level;
  var color = levelColor[node.level] || '#888';
  var money = node.money || 0;
  var statusColor = (node.status||'정상')==='정상' ? '#4ade80' : '#f87171';
  var statusText = node.status || '정상';
  var regDate = node.registeredAt ? new Date(node.registeredAt).toLocaleString('ko-KR') : '-';

  // 하부 목록 행
  var subRows = '';
  if(node.children && node.children.length) {
    node.children.forEach(function(ch, idx) {
      var chLbl = levelLabel[ch.level] || ch.level;
      var chColor = levelColor[ch.level] || '#888';
      subRows += '<tr>'
        + '<td>'+(idx+1)+'</td>'
        + '<td><span style="background:'+chColor+';color:#fff;padding:2px 8px;border-radius:4px;font-size:0.72rem;">'+chLbl+'</span></td>'
        + '<td style="color:'+'var(--text,#000)'+';cursor:pointer;" class="pd-sub-click" data-id="'+ch.id+'">'+ch.id+'</td>'
        + '<td style="color:var(--text,#000);">'+ch.label+'</td>'
        + '<td style="text-align:right;">'+(ch.money||0).toLocaleString()+'</td>'
        + '<td style="color:#888;">'+(ch.registeredAt ? new Date(ch.registeredAt).toLocaleString('ko-KR') : '-')+'</td>'
        + '</tr>';
    });
  } else {
    subRows = '<tr><td colspan="6" style="color:#888;padding:24px;text-align:center;">하부가 없습니다.</td></tr>';
  }

  // 머니 변동내역
  var moneyLogs = [];
  try {
    var allLogs = JSON.parse(localStorage.getItem('partnerMoneyLog') || '[]');
    moneyLogs = allLogs.filter(function(l){ return l.targetId === node.id || l.processor === node.label; });
  } catch(e){}
  var moneyLogRows = '';
  if(moneyLogs.length) {
    moneyLogs.slice(0, 50).forEach(function(log, idx) {
      moneyLogRows += '<tr>'
        + '<td>'+(idx+1)+'</td>'
        + '<td>'+log.datetime+'</td>'
        + '<td>'+(log.type==='give'?'<span style="color:#4ade80;">지급</span>':'<span style="color:#f87171;">회수</span>')+'</td>'
        + '<td>'+log.processor+'</td>'
        + '<td style="text-align:right;">'+(log.amount||0).toLocaleString()+'</td>'
        + '<td style="text-align:right;font-size:0.78rem;white-space:nowrap;">'
        +   '<span style="color:#60a5fa;">'+(log.before||0).toLocaleString()+'</span>'
        +   '<span style="color:#666;margin:0 4px;">→</span>'
        +   '<span style="color:#f59e0b;">'+(log.after||0).toLocaleString()+'</span>'
        + '</td>'
        + '<td>'+(log.memo||'-')+'</td>'
        + '</tr>';
    });
  } else {
    moneyLogRows = '<tr><td colspan="7" style="color:#888;padding:24px;text-align:center;">변동 내역이 없습니다.</td></tr>';
  }

  var overlay = document.createElement('div');
  overlay.id = 'pt-detail-modal';
  overlay.className = 'pt-modal-overlay';
  overlay.style.background = 'rgba(0,0,0,0.95)';
  overlay.innerHTML = `
    <div class="mbd-modal">

      <!-- 헤더: 아이콘 + 이름 + 등급뱃지 + 상태뱃지 -->
      <div style="display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.05rem;font-weight:700;color:var(--text,#000);">${node.id}</span>
            <span style="background:${color};color:#fff;padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">${lbl}</span>
            <span style="background:${statusColor};color:#000;padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">${statusText}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text2,#666);margin-top:2px;">${node.label} · Lv.${node.level === 'admin'?'0':node.level === 'head'?'1':node.level === 'subhead'?'2':node.level === 'distributor'?'3':node.level === 'store'?'4':'5'}</div>
        </div>
        <button class="pt-modal-close" id="pd-close" style="font-size:1.2rem;">✕</button>
      </div>

      <!-- 탭 -->
      <div class="mbd-tabs">
        <button class="mbd-tab active" data-tab="pd-info">🏠 기본</button>
        <button class="mbd-tab" data-tab="pd-betting">🎰 베팅</button>
        <button class="mbd-tab" data-tab="pd-money">💰 머니</button>
        <button class="mbd-tab" data-tab="pd-point">🪙 포인트</button>
        <button class="mbd-tab" data-tab="pd-moneylog">📋 입출금</button>
        <button class="mbd-tab" data-tab="pd-inquiry">💬 문의내역</button>
        <button class="mbd-tab" data-tab="pd-referral">🔗 추천코드</button>
        <button class="mbd-tab" data-tab="pd-memo">✉ 쪽지</button>
      </div>

      <!-- 탭 콘텐츠 -->
      <div class="mbd-body">

        <!-- ===== 기본 탭 ===== -->
        <div class="mbd-pane active" data-pane="pd-info">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:stretch;">

            <!-- ▼ 좌측 칼럼 -->
            <div style="display:flex;flex-direction:column;">
              <!-- 보유머니 / 포인트 -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-size:0.75rem;color:var(--text2);">보유머니</span>
                    <div style="display:flex;gap:4px;">
                      <button class="pd-money-plus" style="width:22px;height:22px;border-radius:50%;border:none;background:#4ade80;color:#000;font-weight:700;cursor:pointer;font-size:0.85rem;line-height:1;">+</button>
                      <button class="pd-money-minus" style="width:22px;height:22px;border-radius:50%;border:none;background:#f87171;color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;line-height:1;">−</button>
                    </div>
                  </div>
                  <div style="font-size:1.3rem;font-weight:700;color:#60a5fa;" id="pd-money-display">${money.toLocaleString()}</div>
                </div>
                <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-size:0.75rem;color:var(--text2);">포인트</span>
                    <div style="display:flex;gap:4px;">
                      <button class="pd-point-plus" style="width:22px;height:22px;border-radius:50%;border:none;background:#4ade80;color:#000;font-weight:700;cursor:pointer;font-size:0.85rem;line-height:1;">+</button>
                      <button class="pd-point-minus" style="width:22px;height:22px;border-radius:50%;border:none;background:#f87171;color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;line-height:1;">−</button>
                    </div>
                  </div>
                  <div style="font-size:1.3rem;font-weight:700;color:#a78bfa;" id="pd-point-val">${((node.point||0)+(node.rollingPoint||0)).toLocaleString()}</div>
                </div>
              </div>

              <!-- 총 입금 / 총 출금 -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">
                <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:12px;">
                  <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 입금</div>
                  <div style="font-size:1.05rem;font-weight:700;color:#4ade80;">${(node.totalDeposit||0).toLocaleString()}원</div>
                </div>
                <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:12px;">
                  <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 출금</div>
                  <div style="font-size:1.05rem;font-weight:700;color:#f87171;">${(node.totalWithdraw||0).toLocaleString()}원</div>
                </div>
              </div>

              <!-- 롤링율(%) / 루징율 -->
              <div style="margin-bottom:18px;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:10px;">롤링율(%) / 루징율</div>
                <div class="pd-view-rolling" style="display:grid;grid-template-columns:repeat(4,1fr);text-align:center;font-size:0.78rem;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
                  <div style="padding:10px 0;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;">카지노</div><div style="font-weight:600;">${node.rollCasino||0}%</div></div>
                  <div style="padding:10px 0;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;">슬롯</div><div style="font-weight:600;">${node.rollSlot||0}%</div></div>
                  <div style="padding:10px 0;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;">미니게임</div><div style="font-weight:600;">${node.rollMini||0}%</div></div>
                  <div style="padding:10px 0;background:#7c3aed22;"><div style="color:#a78bfa;margin-bottom:3px;">루징</div><div style="font-weight:600;">${node.losingSlot||0}%</div></div>
                </div>
                <div class="pd-edit-rolling" style="display:none;grid-template-columns:repeat(4,1fr);text-align:center;font-size:0.78rem;border:1px solid var(--primary);border-radius:8px;overflow:hidden;">
                  <div style="padding:8px 4px;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;font-size:0.72rem;">카지노 <span style="color:var(--text3);font-size:0.65rem;">(max ${pMaxRC}%)</span></div><select class="pd-edit-input" data-key="rollCasino" style="width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text1);padding:4px;border-radius:4px;font-size:0.78rem;text-align:center;">${Array.from({length:Math.round(pMaxRC*10)+1},function(_,i){var v=String(i/10);return '<option value="'+v+'"'+(String(node.rollCasino||0)===v?' selected':'')+'>'+v+'%</option>';}).join('')}</select></div>
                  <div style="padding:8px 4px;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;font-size:0.72rem;">슬롯 <span style="color:var(--text3);font-size:0.65rem;">(max ${pMaxRS}%)</span></div><select class="pd-edit-input" data-key="rollSlot" style="width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text1);padding:4px;border-radius:4px;font-size:0.78rem;text-align:center;">${Array.from({length:Math.round(pMaxRS*10)+1},function(_,i){var v=String(i/10);return '<option value="'+v+'"'+(String(node.rollSlot||0)===v?' selected':'')+'>'+v+'%</option>';}).join('')}</select></div>
                  <div style="padding:8px 4px;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;font-size:0.72rem;">미니게임 <span style="color:var(--text3);font-size:0.65rem;">(max ${pMaxRM}%)</span></div><select class="pd-edit-input" data-key="rollMini" style="width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text1);padding:4px;border-radius:4px;font-size:0.78rem;text-align:center;">${Array.from({length:Math.round(pMaxRM*10)+1},function(_,i){var v=String(i/10);return '<option value="'+v+'"'+(String(node.rollMini||0)===v?' selected':'')+'>'+v+'%</option>';}).join('')}</select></div>
                  <div style="padding:8px 4px;background:#7c3aed22;"><div style="color:#a78bfa;margin-bottom:3px;font-size:0.72rem;">루징 <span style="color:var(--text3);font-size:0.65rem;">(max ${pMaxLS}%)</span></div><select class="pd-edit-input" data-key="losingSlot" style="width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text1);padding:4px;border-radius:4px;font-size:0.78rem;text-align:center;">${Array.from({length:pMaxLS+1},function(_,i){var v=String(i);return '<option value="'+v+'"'+(String(node.losingSlot||0)===v?' selected':'')+'>'+v+'%</option>';}).join('')}</select></div>
                </div>
              </div>

              <!-- 베팅 권한 -->
              <div style="margin-bottom:18px;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:10px;">베팅 권한</div>
                <div class="pd-view-perm" style="display:flex;flex-wrap:wrap;gap:8px;font-size:0.78rem;">
                  ${['카지노','슬롯','미니게임'].map(function(g){
                    var key = 'perm'+g;
                    var on = node[key] !== false;
                    return '<span style="color:var(--text);">'+g+'</span><span style="background:'+(on?'#4ade80':'#f87171')+';color:#000;padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:600;">'+(on?'허용':'차단')+'</span>';
                  }).join('')}
                </div>
                <div class="pd-edit-perm" style="display:none;flex-wrap:wrap;gap:8px;font-size:0.78rem;">
                  ${['카지노','슬롯','미니게임'].map(function(g){
                    var key = 'perm'+g;
                    var on = node[key] !== false;
                    return '<span style="color:var(--text);">'+g+'</span><button class="pd-perm-toggle" data-key="'+key+'" data-on="'+(on?'true':'false')+'" style="background:'+(on?'#4ade80':'#f87171')+';color:#000;padding:2px 12px;border-radius:4px;font-size:0.68rem;font-weight:600;border:none;cursor:pointer;">'+(on?'허용':'차단')+'</button>';
                  }).join('')}
                </div>
              </div>

              <!-- 누락(공베팅) 설정 -->
              ${(function(){
                var _pHasEB = parentNode && ((parentNode['emptyBet카지노']||0) > 0 || (parentNode['emptyBet슬롯']||0) > 0 || (parentNode['emptyBet미니게임']||0) > 0);
                if(_pHasEB) {
                  return '<div style="border:2px dashed var(--border,#555);border-radius:10px;padding:14px;margin-bottom:10px;">'
                    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
                    + '<span style="color:#f59e0b;font-weight:700;font-size:0.85rem;">⚠ 누락(공베팅) 설정</span>'
                    + '<span style="background:rgba(239,68,68,0.2);color:#ef4444;padding:2px 8px;border-radius:4px;font-size:0.65rem;">상위('+parentNode.id+')에서 설정됨 — 수정 불가</span>'
                    + '</div>'
                    + '<div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">상위 파트너에 공베팅이 설정되어 있으면 하위에서 별도 설정할 수 없습니다.</div>'
                    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;font-size:0.75rem;">'
                    + ['카지노','슬롯','미니게임'].map(function(g){ var v=parentNode['emptyBet'+g]||0; return '<div><div style="color:var(--text3);margin-bottom:3px;">'+g+'</div><div style="font-weight:600;color:var(--text3);">'+(v?v+'회 (상속)':'미적용')+'</div></div>'; }).join('')
                    + '</div></div>';
                }
                return '<div style="border:2px dashed #f59e0b;border-radius:10px;padding:14px;margin-bottom:10px;">'
                  + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
                  + '<span style="color:#f59e0b;font-weight:700;font-size:0.85rem;">⚠ 누락(공베팅) 설정</span>'
                  + '<span style="background:#f59e0b33;color:#f59e0b;padding:2px 8px;border-radius:4px;font-size:0.65rem;">주의: 하위에게 상속됨</span>'
                  + '</div>'
                  + '<div style="font-size:0.72rem;color:var(--text2);margin-bottom:10px;">N회 베팅마다 1회 누락됩니다. 0=미적용. 상위 파트너 설정이 없으면 하위로 상속됩니다.</div>'
                  + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;font-size:0.75rem;">'
                  + ['카지노','슬롯','미니게임'].map(function(g){ var key='emptyBet'+g; var val=node[key]||0; return '<div><div style="color:var(--text2);margin-bottom:3px;">'+g+'</div><input type="number" class="pd-emptybet-input pt-modal-input" data-key="'+key+'" value="'+val+'" min="0" max="100" style="width:60px;text-align:center;padding:4px 6px;font-size:0.78rem;font-weight:600;border-radius:5px;"></div>'; }).join('')
                  + '</div>'
                  + '<div style="text-align:right;margin-top:8px;">'
                  + '<button id="pd-emptybet-save" style="background:#f59e0b;color:#000;border:none;padding:5px 16px;border-radius:5px;font-size:0.72rem;font-weight:600;cursor:pointer;">변경</button>'
                  + '</div></div>';
              })()}

              <!-- 메모 -->
              <div style="margin-top:10px;border:1px solid var(--border,#ddd);border-radius:10px;padding:14px;flex:1;display:flex;flex-direction:column;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:8px;">메모</div>
                <div class="pd-memo-view" style="font-size:0.82rem;color:var(--text2);">${node.memo||'메모 없음'}</div>
                <textarea class="pd-edit-input pt-modal-input" data-key="memo" style="display:none;width:100%;padding:6px 8px;font-size:0.8rem;min-height:60px;border-radius:5px;resize:vertical;">${node.memo||''}</textarea>
              </div>
            </div>

            <!-- ▼ 우측 칼럼 -->
            <div>
              <!-- 기본 정보 -->
              <div style="margin-bottom:24px;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:12px;">기본 정보</div>
                <div style="display:flex;flex-direction:column;gap:0;">
                  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">가입일</span><span style="color:var(--text);font-weight:500;">${regDate}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">최근접속</span><span style="color:var(--text);">${node.lastLoginAt ? new Date(node.lastLoginAt).toLocaleString('ko-KR') : '-'}</span>
                  </div>
                  <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">닉네임</span>
                    <span class="pd-view-val" style="color:var(--text);font-weight:500;">${node.label}</span>
                    <input class="pd-edit-input pt-modal-input" data-key="label" value="${node.label}" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;">
                  </div>
                  <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">연락처</span>
                    <span class="pd-view-val" style="color:var(--text);">${node.phone||'-'}</span>
                    <input class="pd-edit-input pt-modal-input" data-key="phone" value="${node.phone||''}" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;">
                  </div>
                  <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">게임 그룹</span>
                    <span class="pd-view-val" style="color:var(--text);">${node.gameGroup || '그룹없음'}</span>
                    <select class="pd-edit-input pt-modal-input" data-key="gameGroup" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;">
                      <option value="" ${!node.gameGroup?'selected':''}>그룹없음</option>
                      ${(window._gdGameGroups||[]).map(function(g){return '<option value="'+g+'" '+(node.gameGroup===g?'selected':'')+'>'+g+'</option>';}).join('')}
                    </select>
                  </div>
                  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">현재 비밀번호</span><span style="color:#f59e0b;font-weight:500;font-family:monospace;letter-spacing:0.5px;">${node.password||'-'}</span>
                  </div>
                </div>
              </div>

              <!-- 출금 계좌 -->
              <div style="margin-bottom:24px;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:12px;">출금 계좌</div>
                <div style="display:flex;flex-direction:column;gap:0;">
                  <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">은행</span>
                    <span class="pd-view-val" style="color:var(--text);">${node.bank||'-'}</span>
                    <select class="pd-edit-input pt-modal-input" data-key="bank" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;cursor:pointer;background:var(--bg3);border:1px solid var(--primary);color:var(--text1);border-radius:4px;">${_ptBankOptions(node.bank||'')}</select>
                  </div>
                  <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">계좌번호</span>
                    <span class="pd-view-val" style="color:var(--text);">${node.account||'-'}</span>
                    <input class="pd-edit-input pt-modal-input" data-key="account" value="${node.account||''}" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;">
                  </div>
                  <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">예금주</span>
                    <span class="pd-view-val" style="color:var(--text);">${node.holder||'-'}</span>
                    <input class="pd-edit-input pt-modal-input" data-key="holder" value="${node.holder||''}" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;">
                  </div>
                  <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">환전 비밀번호</span>
                    <span class="pd-view-val" style="color:var(--text);">${node.withdrawPw||'-'}</span>
                    <input class="pd-edit-input pt-modal-input" data-key="withdrawPw" value="${node.withdrawPw||''}" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;">
                  </div>
                </div>
              </div>

              <!-- 가상계좌 정보 -->
              <div style="background:#1a1625;border:1px solid #f59e0b44;border-radius:8px;padding:16px;margin-bottom:24px;">
                <div style="font-weight:700;font-size:0.85rem;color:#f59e0b;margin-bottom:12px;">가상계좌 정보</div>
                <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:0.82rem;">
                  <span style="color:#ccc;">은행</span>
                  <span class="pd-view-val" style="color:#fff;">${node.vBank||'-'}</span>
                  <input class="pd-edit-input" data-key="vBank" value="${node.vBank||''}" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;color:#fff;background:#2d2640;border:1px solid #f59e0b66;border-radius:4px;">
                </div>
                <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:0.82rem;">
                  <span style="color:#ccc;">계좌번호</span>
                  <span class="pd-view-val" style="color:#fff;">${node.vAccount||'-'}</span>
                  <input class="pd-edit-input" data-key="vAccount" value="${node.vAccount||''}" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;color:#fff;background:#2d2640;border:1px solid #f59e0b66;border-radius:4px;">
                </div>
                <div class="pd-edit-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:0.82rem;">
                  <span style="color:#ccc;">예금주</span>
                  <span class="pd-view-val" style="color:#fff;">${node.vHolder||'-'}</span>
                  <input class="pd-edit-input" data-key="vHolder" value="${node.vHolder||''}" style="display:none;width:55%;padding:4px 8px;font-size:0.8rem;color:#fff;background:#2d2640;border:1px solid #f59e0b66;border-radius:4px;">
                </div>
              </div>


              <!-- 하단 버튼들 -->
              <div style="display:flex;gap:10px;justify-content:flex-end;margin-bottom:20px;flex-wrap:wrap;">
                <button class="pt-action-btn" id="pd-edit-btn" style="padding:7px 18px;font-size:0.8rem;background:var(--sidebar);border:1px solid var(--border);color:var(--text);">✏ 수정</button>
                <button class="pt-action-btn pt-btn-purple" id="pd-save-btn" style="padding:7px 18px;font-size:0.8rem;display:none;">💾 저장</button>
                <button class="pt-action-btn pt-btn-gray" id="pd-cancel-btn" style="padding:7px 18px;font-size:0.8rem;display:none;">✕ 취소</button>
                <button class="pt-action-btn" id="pd-pw-reset-btn" style="padding:7px 18px;font-size:0.8rem;background:var(--sidebar);border:1px solid var(--border);color:var(--text);">🔒 비밀번호 초기화</button>
                <button class="pt-action-btn" id="pd-pw-set-btn" style="padding:7px 18px;font-size:0.8rem;background:var(--sidebar);border:1px solid var(--border);color:var(--text);">🔑 비밀번호 지정</button>
              </div>

              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button class="pt-action-btn" id="pd-block-btn" style="padding:7px 18px;font-size:0.8rem;background:transparent;border:1px solid #f87171;color:#f87171;border-radius:6px;">⊘ 차단</button>
                <button class="pt-action-btn" id="pd-delete-btn" style="padding:7px 18px;font-size:0.8rem;background:#f87171;border:none;color:#fff;border-radius:6px;">🗑 삭제</button>
              </div>
            </div>

          </div>
        </div>

        <!-- ===== 하부목록 탭 ===== -->
        <!-- ===== 베팅 탭 ===== -->
        <div class="mbd-pane" data-pane="pd-betting">
          <!-- 상단 요약 카드 -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
            <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">베팅</div>
              <div style="font-size:1.2rem;font-weight:700;color:var(--text);" id="pd-bet-total">0</div>
            </div>
            <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 당첨액</div>
              <div style="font-size:1.2rem;font-weight:700;color:#4ade80;" id="pd-bet-win">0</div>
            </div>
            <div style="background:linear-gradient(135deg,rgba(239,68,68,0.1),rgba(239,68,68,0.05));border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:14px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">손익 (입금-출금)</div>
              <div style="font-size:1.2rem;font-weight:700;color:#ef4444;" id="pd-bet-profit">+0</div>
            </div>
          </div>
          <!-- 게임 카테고리 + 기간 필터 -->
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
            <button class="pd-bet-cat active" data-cat="casino" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);background:var(--primary);color:#fff;cursor:pointer;font-weight:600;">카지노</button>
            <button class="pd-bet-cat" data-cat="slot" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);background:var(--sidebar);color:var(--text);cursor:pointer;">슬롯</button>
            <span style="flex:1;"></span>
            <button class="pd-bet-period active" data-period="today" style="padding:4px 10px;font-size:0.7rem;border-radius:4px;border:1px solid var(--border);background:var(--primary);color:#fff;cursor:pointer;font-weight:600;">오늘</button>
            <button class="pd-bet-period" data-period="yesterday" style="padding:4px 10px;font-size:0.7rem;border-radius:4px;border:1px solid var(--border);background:var(--sidebar);color:var(--text);cursor:pointer;">어제</button>
            <button class="pd-bet-period" data-period="7d" style="padding:4px 10px;font-size:0.7rem;border-radius:4px;border:1px solid var(--border);background:var(--sidebar);color:var(--text);cursor:pointer;">7일</button>
            <button class="pd-bet-period" data-period="30d" style="padding:4px 10px;font-size:0.7rem;border-radius:4px;border:1px solid var(--border);background:var(--sidebar);color:var(--text);cursor:pointer;">30일</button>
            <input type="date" class="pd-bet-date-from pt-modal-input" style="width:130px;padding:4px 8px;font-size:0.72rem;">
            <span style="color:var(--text2);">~</span>
            <input type="date" class="pd-bet-date-to pt-modal-input" style="width:130px;padding:4px 8px;font-size:0.72rem;">
          </div>
          <!-- 베팅 내역 테이블 -->
          <div id="pd-bet-list" style="color:#888;text-align:center;padding:24px;font-size:0.82rem;">베팅 내역이 없습니다</div>
        </div>

        <!-- ===== 머니 탭 ===== -->
        <div class="mbd-pane" data-pane="pd-money">
          <!-- 상단: 현재 잔액 + 총 지급 + 총 회수 -->
          <div style="display:flex;gap:10px;margin-bottom:14px;">
            <div style="flex:1;background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px 18px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">현재 잔역</div>
                  <div style="font-size:1.2rem;font-weight:700;color:#60a5fa;" id="pd-money-val2">${money.toLocaleString()}</div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="pt-action-btn pt-btn-blue pd-money-plus2" style="padding:4px 14px;font-size:0.72rem;">+ 지급</button>
                  <button class="pt-action-btn pt-btn-red pd-money-minus2" style="padding:4px 14px;font-size:0.72rem;">− 회수</button>
                </div>
              </div>
            </div>
            <div style="flex:1;background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 지급</div>
              <div style="font-size:1.2rem;font-weight:700;color:#4ade80;" id="pd-money-total-give">+0</div>
            </div>
            <div style="flex:1;background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 회수</div>
              <div style="font-size:1.2rem;font-weight:700;color:#ef4444;" id="pd-money-total-take">-0</div>
            </div>
          </div>
          <!-- 카테고리 + 날짜 필터 -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;gap:4px;" id="pd-money-cats">
              <button class="pd-money-cat active" data-cat="all" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:#3b82f6;color:#fff;">전체</button>
              <button class="pd-money-cat" data-cat="give" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">지급</button>
              <button class="pd-money-cat" data-cat="take" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">회수</button>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button class="pd-money-period active" data-period="today" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:#3b82f6;color:#fff;">오늘</button>
              <button class="pd-money-period" data-period="yesterday" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">어제</button>
              <button class="pd-money-period" data-period="7d" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">7일</button>
              <button class="pd-money-period" data-period="30d" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">30일</button>
              <input type="date" class="pd-money-date-from" style="padding:3px 6px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text);">
              <span style="color:var(--text2);font-size:0.72rem;">~</span>
              <input type="date" class="pd-money-date-to" style="padding:3px 6px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text);">
            </div>
          </div>
          <!-- 내역 리스트 -->
          <div id="pd-money-list"><div style="color:#888;text-align:center;padding:24px;">로딩중...</div></div>
        </div>

        <!-- ===== 포인트 탭 ===== -->
        <div class="mbd-pane" data-pane="pd-point">
          <!-- 상단: 현재 포인트 + 총 지급 + 총 회수/사용 -->
          <div style="display:flex;gap:10px;margin-bottom:14px;">
            <div style="flex:1;background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px 18px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">현재 포인트</div>
                  <div style="font-size:1.2rem;font-weight:700;color:#a78bfa;" id="pd-point-val2">${((node.point||0)+(node.rollingPoint||0)).toLocaleString()}P</div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="pt-action-btn" id="pd-point-tab-plus" style="padding:4px 14px;font-size:0.72rem;background:#7c3aed;border:none;color:#fff;border-radius:4px;cursor:pointer;">+ 지급</button>
                  <button class="pt-action-btn" id="pd-point-tab-minus" style="padding:4px 14px;font-size:0.72rem;background:#7c3aed;border:none;color:#fff;border-radius:4px;cursor:pointer;">− 회수</button>
                </div>
              </div>
            </div>
            <div style="flex:1;background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 지급</div>
              <div style="font-size:1.2rem;font-weight:700;color:#4ade80;" id="pd-point-total-give">+0</div>
            </div>
            <div style="flex:1;background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 회수/사용</div>
              <div style="font-size:1.2rem;font-weight:700;color:#ef4444;" id="pd-point-total-take">-0</div>
            </div>
          </div>
          <!-- 카테고리 + 날짜 필터 -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;gap:4px;" id="pd-point-cats">
              <button class="pd-point-cat active" data-cat="all" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:#7c3aed;color:#fff;">전체</button>
              <button class="pd-point-cat" data-cat="give" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">지급</button>
              <button class="pd-point-cat" data-cat="take" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">회수</button>
              <button class="pd-point-cat" data-cat="rolling" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">롤링</button>
              <button class="pd-point-cat" data-cat="convert" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">전환</button>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button class="pd-point-period active" data-period="today" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:#7c3aed;color:#fff;">오늘</button>
              <button class="pd-point-period" data-period="yesterday" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">어제</button>
              <button class="pd-point-period" data-period="7d" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">7일</button>
              <button class="pd-point-period" data-period="30d" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">30일</button>
              <input type="date" class="pd-point-date-from" style="padding:3px 6px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text);">
              <span style="color:var(--text2);font-size:0.72rem;">~</span>
              <input type="date" class="pd-point-date-to" style="padding:3px 6px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text);">
            </div>
          </div>
          <!-- 내역 리스트 -->
          <div id="pd-point-list"><div style="color:#888;text-align:center;padding:24px;">로딩중...</div></div>
        </div>

        <!-- ===== 입출금 탭 ===== -->
        <div class="mbd-pane" data-pane="pd-moneylog">
          <!-- 상단 카드: 총 입금 / 총 출금 / 대기 중 -->
          <div style="display:flex;gap:10px;margin-bottom:14px;">
            <div style="flex:1;background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 입금</div>
              <div style="font-size:1.2rem;font-weight:700;color:#4ade80;" id="pd-transfer-total-dep">0</div>
            </div>
            <div style="flex:1;background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 출금</div>
              <div style="font-size:1.2rem;font-weight:700;color:#f59e0b;" id="pd-transfer-total-wit">0</div>
            </div>
            <div style="flex:1;background:var(--sidebar);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">대기 중</div>
              <div style="font-size:1.2rem;font-weight:700;color:#ef4444;" id="pd-transfer-pending">0건</div>
            </div>
          </div>
          <!-- 카테고리(타입+상태) + 날짜 필터 -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
              <button class="pd-transfer-cat active" data-cat="all" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:#3b82f6;color:#fff;">전체</button>
              <button class="pd-transfer-cat" data-cat="deposit" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">입금</button>
              <button class="pd-transfer-cat" data-cat="withdraw" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">출금</button>
              <span style="display:inline-block;width:1px;height:20px;background:var(--border);margin:0 6px;"></span>
              <button class="pd-transfer-status active" data-status="all" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:#10b981;color:#fff;">전체</button>
              <button class="pd-transfer-status" data-status="pending" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">대기</button>
              <button class="pd-transfer-status" data-status="approved" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">완료</button>
              <button class="pd-transfer-status" data-status="rejected" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">취소</button>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button class="pd-transfer-period active" data-period="today" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:#3b82f6;color:#fff;">오늘</button>
              <button class="pd-transfer-period" data-period="yesterday" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">어제</button>
              <button class="pd-transfer-period" data-period="7d" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">7일</button>
              <button class="pd-transfer-period" data-period="30d" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">30일</button>
              <input type="date" class="pd-transfer-date-from" style="padding:3px 6px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text);">
              <span style="color:var(--text2);font-size:0.72rem;">~</span>
              <input type="date" class="pd-transfer-date-to" style="padding:3px 6px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text);">
            </div>
          </div>
          <div id="pd-transfer-list"><div style="color:#888;text-align:center;padding:24px;">로딩중...</div></div>
        </div>

        <!-- ===== 문의내역 탭 ===== -->
        <div class="mbd-pane" data-pane="pd-inquiry">
          <!-- 상단 카드: 전체 문의 / 미답변 / 답변완료 -->
          <div style="display:flex;gap:10px;margin-bottom:14px;">
            <div style="flex:1;background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">전체 문의</div>
              <div style="font-size:1.2rem;font-weight:700;color:var(--text);" id="pd-inq-total">0건</div>
            </div>
            <div style="flex:1;background:var(--sidebar);border:1px solid rgba(251,191,36,0.2);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">미답변</div>
              <div style="font-size:1.2rem;font-weight:700;color:#fbbf24;" id="pd-inq-pending">0건</div>
            </div>
            <div style="flex:1;background:var(--sidebar);border:1px solid rgba(74,222,128,0.2);border-radius:8px;padding:14px 18px;">
              <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">답변완료</div>
              <div style="font-size:1.2rem;font-weight:700;color:#4ade80;" id="pd-inq-done">0건</div>
            </div>
          </div>
          <!-- 카테고리 + 기간 필터 -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;gap:4px;">
              <button class="pd-inq-cat active" data-cat="all" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:#3b82f6;color:#fff;">전체 (0)</button>
              <button class="pd-inq-cat" data-cat="pending" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">미답변 (0)</button>
              <button class="pd-inq-cat" data-cat="done" style="padding:4px 12px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">답변완료 (0)</button>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button class="pd-inq-period active" data-period="today" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:#f59e0b;color:#fff;">오늘</button>
              <button class="pd-inq-period" data-period="yesterday" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">어제</button>
              <button class="pd-inq-period" data-period="7d" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">7일</button>
              <button class="pd-inq-period" data-period="30d" style="padding:4px 10px;font-size:0.72rem;border-radius:4px;border:1px solid var(--border);cursor:pointer;background:var(--bg3);color:var(--text2);">30일</button>
            </div>
          </div>
          <!-- 내역 리스트 -->
          <div id="pd-inquiry-list"><div style="color:#888;text-align:center;padding:24px;">로딩중...</div></div>
        </div>

        <!-- ===== 추천코드 탭 ===== -->
        <div class="mbd-pane" data-pane="pd-referral">
          <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
            <button id="pd-ref-add-btn" style="padding:6px 16px;font-size:0.78rem;border-radius:6px;border:none;cursor:pointer;background:#00e5ff;color:#000;font-weight:600;display:flex;align-items:center;gap:4px;">
              <span style="font-size:1rem;">+</span> 코드 추가
            </button>
          </div>
          <div id="pd-referral-list"><div style="color:#888;text-align:center;padding:24px;">로딩중...</div></div>
        </div>

        <!-- ===== 쪽지 탭 ===== -->
        <div class="mbd-pane" data-pane="pd-memo">
          <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
            <button id="pd-msg-send-btn" style="padding:6px 16px;font-size:0.78rem;border-radius:6px;border:none;cursor:pointer;background:#00e5ff;color:#000;font-weight:600;display:flex;align-items:center;gap:6px;">
              <i class="fas fa-envelope"></i> 쪽지 보내기
            </button>
          </div>
          <div id="pd-msg-list"><div style="color:#888;text-align:center;padding:24px;">로딩중...</div></div>
        </div>

      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // 닫기
  overlay.querySelector('#pd-close').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });

  // 탭 전환
  overlay.querySelectorAll('.mbd-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      overlay.querySelectorAll('.mbd-tab').forEach(function(t){ t.classList.remove('active'); });
      overlay.querySelectorAll('.mbd-pane').forEach(function(p){ p.classList.remove('active'); });
      this.classList.add('active');
      overlay.querySelector('.mbd-pane[data-pane="'+this.dataset.tab+'"]').classList.add('active');
      // 베팅 탭 진입 시 자동 로드
      if(this.dataset.tab === 'pd-betting') loadModalBettingData(node, overlay);
    });
  });

  // 베팅 탭 - 카테고리 토글
  overlay.querySelectorAll('.pd-bet-cat').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-bet-cat').forEach(function(b) {
        b.style.background = 'var(--sidebar)'; b.style.color = 'var(--text)'; b.style.fontWeight = 'normal';
        b.classList.remove('active');
      });
      this.style.background = 'var(--primary)'; this.style.color = '#fff'; this.style.fontWeight = '600';
      this.classList.add('active');
      loadModalBettingData(node, overlay);
    });
  });
  // 베팅 탭 - 기간 토글
  overlay.querySelectorAll('.pd-bet-period').forEach(function(btn) {
    btn.addEventListener('click', function() {
      // 날짜 직접입력 초기화
      var fi = overlay.querySelector('.pd-bet-date-from');
      var ti = overlay.querySelector('.pd-bet-date-to');
      if(fi) fi.value = '';
      if(ti) ti.value = '';
      overlay.querySelectorAll('.pd-bet-period').forEach(function(b) {
        b.style.background = 'var(--sidebar)'; b.style.color = 'var(--text)'; b.style.fontWeight = 'normal';
        b.classList.remove('active');
      });
      this.style.background = 'var(--primary)'; this.style.color = '#fff'; this.style.fontWeight = '600';
      this.classList.add('active');
      loadModalBettingData(node, overlay);
    });
  });
  // 베팅 탭 - 날짜 직접 선택 시 로드
  var betDateFrom = overlay.querySelector('.pd-bet-date-from');
  var betDateTo = overlay.querySelector('.pd-bet-date-to');
  if(betDateFrom && betDateTo) {
    betDateTo.addEventListener('change', function() {
      if(betDateFrom.value && betDateTo.value) {
        // 기간 버튼 active 해제
        overlay.querySelectorAll('.pd-bet-period').forEach(function(b) {
          b.style.background = 'var(--sidebar)'; b.style.color = 'var(--text)'; b.style.fontWeight = 'normal';
          b.classList.remove('active');
        });
        loadModalBettingData(node, overlay);
      }
    });
  }

  // 하부 목록에서 ID 클릭 시 해당 파트너 상세 열기
  overlay.querySelectorAll('.pd-sub-click').forEach(function(td) {
    td.addEventListener('click', function() {
      var subNode = findNode(partnerTree, this.dataset.id);
      if(subNode) { overlay.remove(); openPartnerModal(subNode); }
    });
  });

  // 머니/포인트 팝업
  function openMoneyPopup(type, mode) {
    // type: 'money' or 'point', mode: 'give' or 'take'
    var isPoint = type === 'point';
    var isGive = mode === 'give';
    var label = isPoint ? '포인트' : '머니';
    var title = label + (isGive ? ' 지급' : ' 회수');
    var currentVal = isPoint ? ((node.point||0)+(node.rollingPoint||0)) : (node.money || 0);

    var pop = document.createElement('div');
    pop.className = 'money-popup-overlay';
    pop.innerHTML = '<div class="money-popup">'
      + '<div class="money-popup-header"><h3>' + (isGive ? '💰 ' : '📤 ') + node.label + ' — ' + title + '</h3><button class="money-popup-close">✕</button></div>'
      + '<div class="money-popup-body">'
      + '<div class="money-popup-current"><span class="mp-label">현재 ' + label + '</span><span class="mp-val" style="color:' + (isPoint ? 'var(--purple)' : 'var(--blue)') + ';">' + currentVal.toLocaleString() + '원</span></div>'
      + '<div class="money-popup-field"><label>' + (isGive ? '지급' : '회수') + ' 금액</label><input type="number" id="mp-amount" placeholder="금액을 입력하세요" min="1"><div class="mp-quick-btns"><button data-val="1000000">100만</button><button data-val="500000">50만</button><button data-val="100000">10만</button><button data-val="50000">5만</button><button data-val="10000">1만</button></div><div class="mp-quick-btns" style="margin-top:0;"><button data-val="' + currentVal + '">전체 (' + currentVal.toLocaleString() + ')</button><button class="mp-reset-btn" data-val="reset">초기화</button></div></div>'
      + '<div class="money-popup-field"><label>메모 (선택)</label><textarea id="mp-memo" placeholder="메모를 입력하세요"></textarea></div>'
      + '<div class="money-popup-actions">'
      + '<button class="mp-btn-cancel">취소</button>'
      + '<button class="' + (isGive ? 'mp-btn-give' : 'mp-btn-take') + '" id="mp-confirm">' + (isGive ? '지급' : '회수') + '</button>'
      + '</div></div></div>';
    document.body.appendChild(pop);

    pop.querySelector('.money-popup-close').addEventListener('click', function(){ pop.remove(); });
    pop.querySelector('.mp-btn-cancel').addEventListener('click', function(){ pop.remove(); });
    pop.addEventListener('click', function(e){ if(e.target === pop) pop.remove(); });

    var amountInput = pop.querySelector('#mp-amount');
    amountInput.focus();

    pop.querySelectorAll('.mp-quick-btns button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if(this.dataset.val === 'reset') { amountInput.value = ''; amountInput.style.borderColor = ''; return; }
        var v = parseInt(this.dataset.val);
        if(isGive) { amountInput.value = (parseInt(amountInput.value) || 0) + v; }
        else { amountInput.value = v; }
        amountInput.style.borderColor = '';
      });
    });

    pop.querySelector('#mp-confirm').addEventListener('click', function() {
      var val = parseInt(amountInput.value);
      if(!val || val <= 0) { amountInput.style.borderColor = 'var(--red)'; amountInput.focus(); return; }
      var memo = pop.querySelector('#mp-memo').value.trim();

      if(isPoint) {
        var totalBefore = (node.point||0) + (node.rollingPoint||0);
        var before = totalBefore;
        if(isGive) { node.point = (node.point||0) + val; }
        else { var takeAmt = Math.min(val, totalBefore); node.point = (node.point||0) - takeAmt; }
        var after = (node.point||0) + (node.rollingPoint||0);
        savePartnerTree();
        // 서버에도 포인트 반영
        fetch('/api/admin/users/' + (node.username || node.id) + '/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ point: node.point })
        }).catch(function(){});
        var logEntry = {
          datetime: nowStr(), type: isGive ? 'give' : 'take', processor: '관리자', processorLevel: 'admin',
          targetId: node.id, targetNick: node.label, targetLevel: node.level || '',
          amount: val, before: before, after: after, memo: memo
        };
        if(typeof addPartnerPointLog === 'function') addPartnerPointLog(logEntry);
      } else {
        var before = node.money || 0;
        var apiAmount = isGive ? val : -val;
        // DB에 머니 반영
        fetch('/api/admin/users/money', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: node.id, amount: apiAmount })
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if(res.success) {
            var after = res.after !== undefined ? res.after : (isGive ? before + val : Math.max(0, before - val));
            node.money = after;
            savePartnerTree();
            var logEntry = {
              datetime: nowStr(), type: isGive ? 'give' : 'take', processor: '관리자', processorLevel: 'admin',
              targetId: node.id, targetNick: node.label, targetLevel: node.level || '',
              amount: val, before: before, after: after, memo: memo
            };
            if(typeof addPartnerMoneyLog === 'function') addPartnerMoneyLog(logEntry);
            if(typeof addAdminMoneyLog === 'function') addAdminMoneyLog(logEntry);
            if(node.level === 'member' && typeof addUserMoneyLog === 'function') addUserMoneyLog(logEntry);
            // DOM 업데이트
            var mnDisp = overlay.querySelector('#pd-money-display');
            var mnVal2 = overlay.querySelector('#pd-money-val2');
            if(mnDisp) mnDisp.textContent = after.toLocaleString();
            if(mnVal2) mnVal2.textContent = after.toLocaleString();
            loadModalMoneyData(node, overlay);
            if(typeof fetchSidebarStats === 'function') fetchSidebarStats();
            if(typeof _ptRenderTableBody === 'function') _ptRenderTableBody();
            if(typeof _ptRenderListPage === 'function' && document.getElementById('ptl-tbody')) _ptRenderListPage();
          } else {
            _showToast('처리 실패: ' + (res.error || ''), 'error');
          }
        })
        .catch(function(e) { _showToast('서버 오류: ' + e.message, 'error'); });
      }

      pop.remove();
      _showToast((isGive ? '✅' : '📤') + ' ' + node.label + (isGive ? ' 에게 ' : ' 에서 ') + val.toLocaleString() + '원 ' + (isGive ? '지급' : '회수') + ' 완료', isGive ? 'success' : 'warn');

      // DOM만 업데이트 (모달 새로고침 없이)
      if(isPoint) {
        var ptVal = overlay.querySelector('#pd-point-val');
        var ptVal2 = overlay.querySelector('#pd-point-val2');
        if(ptVal) ptVal.textContent = ((node.point||0)+(node.rollingPoint||0)).toLocaleString();
        if(ptVal2) ptVal2.textContent = ((node.point||0)+(node.rollingPoint||0)).toLocaleString() + 'P';
        loadModalPointData(node, overlay);
      }
      // 머니 DOM 업데이트는 fetch 콜백 안에서 처리됨
    });
  }

  overlay.querySelector('.pd-money-plus').addEventListener('click', function(){ openMoneyPopup('money','give'); });
  overlay.querySelector('.pd-money-minus').addEventListener('click', function(){ openMoneyPopup('money','take'); });
  overlay.querySelector('.pd-money-plus2').addEventListener('click', function(){ openMoneyPopup('money','give'); });
  overlay.querySelector('.pd-money-minus2').addEventListener('click', function(){ openMoneyPopup('money','take'); });

  // ── 머니 탭: 카테고리/기간 필터 이벤트 ──
  overlay.querySelectorAll('.pd-money-cat').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-money-cat').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.classList.remove('active'); });
      this.style.background='#3b82f6'; this.style.color='#fff'; this.classList.add('active');
      loadModalMoneyData(node, overlay);
    });
  });
  overlay.querySelectorAll('.pd-money-period').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-money-period').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.classList.remove('active'); });
      this.style.background='#3b82f6'; this.style.color='#fff'; this.classList.add('active');
      // 기간 버튼 클릭 시 커스텀 날짜 초기화
      var f = overlay.querySelector('.pd-money-date-from'); if(f) f.value='';
      var t = overlay.querySelector('.pd-money-date-to'); if(t) t.value='';
      loadModalMoneyData(node, overlay);
    });
  });
  var mdFrom = overlay.querySelector('.pd-money-date-from');
  var mdTo = overlay.querySelector('.pd-money-date-to');
  if(mdFrom) mdFrom.addEventListener('change', function(){ loadModalMoneyData(node, overlay); });
  if(mdTo) mdTo.addEventListener('change', function(){ loadModalMoneyData(node, overlay); });

  // 첫 로드
  loadModalMoneyData(node, overlay);

  // ── 입출금 탭: 카테고리/상태/기간 필터 이벤트 ──
  overlay.querySelectorAll('.pd-transfer-cat').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-transfer-cat').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.classList.remove('active'); });
      this.style.background='#3b82f6'; this.style.color='#fff'; this.classList.add('active');
      loadModalTransferData(node, overlay);
    });
  });
  overlay.querySelectorAll('.pd-transfer-status').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-transfer-status').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.classList.remove('active'); });
      this.style.background='#10b981'; this.style.color='#fff'; this.classList.add('active');
      loadModalTransferData(node, overlay);
    });
  });
  overlay.querySelectorAll('.pd-transfer-period').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-transfer-period').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.classList.remove('active'); });
      this.style.background='#3b82f6'; this.style.color='#fff'; this.classList.add('active');
      var f = overlay.querySelector('.pd-transfer-date-from'); if(f) f.value='';
      var t = overlay.querySelector('.pd-transfer-date-to'); if(t) t.value='';
      loadModalTransferData(node, overlay);
    });
  });
  var tfFrom = overlay.querySelector('.pd-transfer-date-from');
  var tfTo = overlay.querySelector('.pd-transfer-date-to');
  if(tfFrom) tfFrom.addEventListener('change', function(){ loadModalTransferData(node, overlay); });
  if(tfTo) tfTo.addEventListener('change', function(){ loadModalTransferData(node, overlay); });
  loadModalTransferData(node, overlay);

  // ── 문의내역 탭: 카테고리/기간 필터 이벤트 ──
  overlay.querySelectorAll('.pd-inq-cat').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-inq-cat').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.classList.remove('active'); });
      this.style.background='#3b82f6'; this.style.color='#fff'; this.classList.add('active');
      loadModalInquiryData(node, overlay);
    });
  });
  overlay.querySelectorAll('.pd-inq-period').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-inq-period').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.classList.remove('active'); });
      this.style.background='#f59e0b'; this.style.color='#fff'; this.classList.add('active');
      loadModalInquiryData(node, overlay);
    });
  });
  loadModalInquiryData(node, overlay);

  // ── 추천코드 탭: 코드 추가 + 로드 ──
  var refAddBtn = overlay.querySelector('#pd-ref-add-btn');
  if(refAddBtn) {
    refAddBtn.addEventListener('click', function() {
      var code = prompt('추천코드를 입력하세요:');
      if(!code || !code.trim()) return;
      fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: node.id, code: code.trim() })
      })
      .then(function(r){ return r.json(); })
      .then(function(res) {
        if(!res.success) { alert(res.error || '추가 실패'); return; }
        loadModalReferralData(node, overlay);
      });
    });
  }
  loadModalReferralData(node, overlay);

  // ── 쪽지 탭: 보내기 + 로드 ──
  var msgSendBtn = overlay.querySelector('#pd-msg-send-btn');
  if(msgSendBtn) {
    msgSendBtn.addEventListener('click', function() {
      var pop = document.createElement('div');
      pop.className = 'money-popup-overlay';
      pop.innerHTML = '<div class="money-popup">'
        + '<div class="money-popup-header"><h3>✉ ' + node.label + ' 에게 쪽지 보내기</h3><button class="money-popup-close">✕</button></div>'
        + '<div class="money-popup-body">'
        + '<div class="money-popup-field"><label>제목</label><input type="text" id="msg-title" placeholder="쪽지 제목을 입력하세요" style="width:100%;padding:8px 12px;font-size:0.85rem;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);box-sizing:border-box;"></div>'
        + '<div class="money-popup-field"><label>내용</label><textarea id="msg-content" placeholder="쪽지 내용을 입력하세요" style="width:100%;min-height:120px;padding:10px 12px;font-size:0.85rem;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);resize:vertical;box-sizing:border-box;"></textarea></div>'
        + '<div class="money-popup-actions">'
        + '<button class="mp-btn-cancel">취소</button>'
        + '<button class="mp-btn-give" id="msg-send-confirm">보내기</button>'
        + '</div></div></div>';
      document.body.appendChild(pop);

      pop.querySelector('.money-popup-close').addEventListener('click', function(){ pop.remove(); });
      pop.querySelector('.mp-btn-cancel').addEventListener('click', function(){ pop.remove(); });
      pop.addEventListener('click', function(e){ if(e.target === pop) pop.remove(); });
      pop.querySelector('#msg-title').focus();

      pop.querySelector('#msg-send-confirm').addEventListener('click', function() {
        var title = pop.querySelector('#msg-title').value.trim();
        var content = pop.querySelector('#msg-content').value.trim();
        if(!title) { pop.querySelector('#msg-title').style.borderColor = 'var(--red)'; pop.querySelector('#msg-title').focus(); return; }

        fetch('/api/admin/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: node.id, title: title, content: content })
        })
        .then(function(r){ return r.json(); })
        .then(function(res) {
          if(!res.success) { _showToast(res.error || '전송 실패', 'warn'); return; }
          pop.remove();
          _showToast('✅ 쪽지가 전송되었습니다.', 'success');
          loadModalMessageData(node, overlay);
        });
      });
    });
  }
  loadModalMessageData(node, overlay);

  overlay.querySelectorAll('.pd-point-plus').forEach(function(btn){ btn.addEventListener('click', function(){ openMoneyPopup('point','give'); }); });
  overlay.querySelectorAll('.pd-point-minus').forEach(function(btn){ btn.addEventListener('click', function(){ openMoneyPopup('point','take'); }); });
  var ptTabPlus = overlay.querySelector('#pd-point-tab-plus');
  var ptTabMinus = overlay.querySelector('#pd-point-tab-minus');
  if(ptTabPlus) ptTabPlus.addEventListener('click', function(){ openMoneyPopup('point','give'); });
  if(ptTabMinus) ptTabMinus.addEventListener('click', function(){ openMoneyPopup('point','take'); });

  // ── 포인트 → 머니 전환 ──
  var convertBtn = overlay.querySelector('#pd-point-convert');
  if(convertBtn) {
    convertBtn.addEventListener('click', function() {
      var currentPoint = (node.point||0) + (node.rollingPoint||0);
      if(currentPoint <= 0) { _showToast('전환할 포인트가 없습니다.', 'warn'); return; }

      var pop = document.createElement('div');
      pop.className = 'money-popup-overlay';
      pop.innerHTML = '<div class="money-popup">'
        + '<div class="money-popup-header"><h3>🔄 ' + node.label + ' — 포인트 → 머니 전환</h3><button class="money-popup-close">✕</button></div>'
        + '<div class="money-popup-body">'
        + '<div class="money-popup-current"><span class="mp-label">현재 포인트</span><span class="mp-val" style="color:var(--purple);">' + currentPoint.toLocaleString() + 'P</span></div>'
        + '<div class="money-popup-current" style="margin-top:8px;"><span class="mp-label">현재 머니</span><span class="mp-val" style="color:var(--blue);">' + (node.money||0).toLocaleString() + '원</span></div>'
        + '<div class="money-popup-field"><label>전환 금액 (1P = 1원)</label><input type="number" id="mp-convert-amount" placeholder="전환할 포인트" min="1" max="' + currentPoint + '"><div class="mp-quick-btns"><button data-val="' + currentPoint + '">전체 (' + currentPoint.toLocaleString() + 'P)</button><button data-val="' + Math.floor(currentPoint/2) + '">절반 (' + Math.floor(currentPoint/2).toLocaleString() + 'P)</button><button class="mp-reset-btn" data-val="reset">초기화</button></div></div>'
        + '<div class="money-popup-actions">'
        + '<button class="mp-btn-cancel">취소</button>'
        + '<button class="mp-btn-give" id="mp-convert-confirm">전환</button>'
        + '</div></div></div>';
      document.body.appendChild(pop);

      pop.querySelector('.money-popup-close').addEventListener('click', function(){ pop.remove(); });
      pop.querySelector('.mp-btn-cancel').addEventListener('click', function(){ pop.remove(); });
      pop.addEventListener('click', function(e){ if(e.target === pop) pop.remove(); });

      var amtInput = pop.querySelector('#mp-convert-amount');
      amtInput.focus();

      pop.querySelectorAll('.mp-quick-btns button').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if(this.dataset.val === 'reset') { amtInput.value = ''; amtInput.style.borderColor = ''; return; }
          amtInput.value = parseInt(this.dataset.val);
          amtInput.style.borderColor = '';
        });
      });

      pop.querySelector('#mp-convert-confirm').addEventListener('click', function() {
        var val = parseInt(amtInput.value);
        if(!val || val <= 0) { amtInput.style.borderColor = 'var(--red)'; amtInput.focus(); return; }
        if(val > currentPoint) { amtInput.style.borderColor = 'var(--red)'; _showToast('보유 포인트를 초과할 수 없습니다.', 'warn'); return; }

        // 포인트 차감 (point 필드에서 차감, rollingPoint는 유지)
        var pointBefore = (node.point||0) + (node.rollingPoint||0);
        node.point = (node.point||0) - val;

        // 머니 추가
        var moneyBefore = node.money || 0;
        node.money = moneyBefore + val;

        savePartnerTree();
        // 서버에 포인트 변경 반영
        fetch('/api/admin/users/' + (node.username || node.id) + '/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ point: node.point })
        }).catch(function(){});

        // 포인트 로그 (전환 차감)
        if(typeof addPartnerPointLog === 'function') {
          addPartnerPointLog({
            datetime: nowStr(), type: 'take', processor: '시스템',
            targetId: node.id, targetNick: node.label,
            amount: val, before: pointBefore, after: (node.point||0)+(node.rollingPoint||0), memo: '전환 (포인트→머니)'
          });
        }

        // 머니 로그 (전환 입금)
        if(typeof addPartnerMoneyLog === 'function') {
          addPartnerMoneyLog({
            datetime: nowStr(), type: 'give', processor: '시스템', processorLevel: '',
            targetId: node.id, targetNick: node.label, targetLevel: node.level || '',
            amount: val, before: moneyBefore, after: node.money, memo: '전환 (포인트→머니)'
          });
        }

        pop.remove();
        _showToast('🔄 ' + node.label + ' — ' + val.toLocaleString() + 'P → ' + val.toLocaleString() + '원 전환 완료', 'success');

        // DOM 업데이트
        var ptVal = overlay.querySelector('#pd-point-val');
        var ptVal2 = overlay.querySelector('#pd-point-val2');
        if(ptVal) ptVal.textContent = ((node.point||0)+(node.rollingPoint||0)).toLocaleString();
        if(ptVal2) ptVal2.textContent = ((node.point||0)+(node.rollingPoint||0)).toLocaleString() + 'P';
        var mnDisp = overlay.querySelector('#pd-money-display');
        var mnVal2 = overlay.querySelector('#pd-money-val2');
        if(mnDisp) mnDisp.textContent = (node.money || 0).toLocaleString();
        if(mnVal2) mnVal2.textContent = (node.money || 0).toLocaleString();
        loadModalPointData(node, overlay);
      });
    });
  }

  // ── 포인트 탭: 카테고리/기간 필터 이벤트 ──
  overlay.querySelectorAll('.pd-point-cat').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-point-cat').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.classList.remove('active'); });
      this.style.background='#7c3aed'; this.style.color='#fff'; this.classList.add('active');
      loadModalPointData(node, overlay);
    });
  });
  overlay.querySelectorAll('.pd-point-period').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-point-period').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.classList.remove('active'); });
      this.style.background='#7c3aed'; this.style.color='#fff'; this.classList.add('active');
      var f = overlay.querySelector('.pd-point-date-from'); if(f) f.value='';
      var t = overlay.querySelector('.pd-point-date-to'); if(t) t.value='';
      loadModalPointData(node, overlay);
    });
  });
  var ptFrom = overlay.querySelector('.pd-point-date-from');
  var ptTo = overlay.querySelector('.pd-point-date-to');
  if(ptFrom) ptFrom.addEventListener('change', function(){ loadModalPointData(node, overlay); });
  if(ptTo) ptTo.addEventListener('change', function(){ loadModalPointData(node, overlay); });
  loadModalPointData(node, overlay);

  // 수정 버튼 → 인라인 편집 모드 토글
  var editBtn = overlay.querySelector('#pd-edit-btn');
  var saveBtn = overlay.querySelector('#pd-save-btn');
  var cancelBtn = overlay.querySelector('#pd-cancel-btn');
  var viewVals = overlay.querySelectorAll('.pd-view-val');
  var editInputs = overlay.querySelectorAll('.pd-edit-input');
  var memoView = overlay.querySelector('.pd-memo-view');

  var viewRolling = overlay.querySelector('.pd-view-rolling');
  var editRolling = overlay.querySelector('.pd-edit-rolling');
  var viewPerm = overlay.querySelector('.pd-view-perm');
  var editPerm = overlay.querySelector('.pd-edit-perm');

  function enterEditMode() {
    viewVals.forEach(function(el){ el.style.display = 'none'; });
    editInputs.forEach(function(el){
      el.style.display = 'block';
    });
    if(memoView) memoView.style.display = 'none';
    if(viewRolling) viewRolling.style.display = 'none';
    if(editRolling) editRolling.style.display = 'grid';
    if(viewPerm) viewPerm.style.display = 'none';
    if(editPerm) editPerm.style.display = 'flex';
    editBtn.style.display = 'none';
    saveBtn.style.display = '';
    cancelBtn.style.display = '';
  }
  function exitEditMode() {
    viewVals.forEach(function(el){ el.style.display = ''; });
    editInputs.forEach(function(el){ el.style.display = 'none'; });
    if(memoView) memoView.style.display = '';
    if(viewRolling) viewRolling.style.display = 'grid';
    if(editRolling) editRolling.style.display = 'none';
    if(viewPerm) viewPerm.style.display = 'flex';
    if(editPerm) editPerm.style.display = 'none';
    editBtn.style.display = '';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  }

  // 베팅권한 토글 클릭
  overlay.querySelectorAll('.pd-perm-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var on = this.dataset.on === 'true';
      var newOn = !on;
      this.dataset.on = String(newOn);
      this.textContent = newOn ? '허용' : '차단';
      this.style.background = newOn ? '#4ade80' : '#f87171';
    });
  });

  editBtn.addEventListener('click', enterEditMode);
  cancelBtn.addEventListener('click', exitEditMode);
  saveBtn.addEventListener('click', function() {
    editInputs.forEach(function(inp) {
      var key = inp.dataset.key;
      if(key && inp.value !== undefined) node[key] = inp.value.trim();
    });
    overlay.querySelectorAll('.pd-perm-toggle').forEach(function(btn) {
      node[btn.dataset.key] = btn.dataset.on === 'true';
    });
    overlay.querySelectorAll('.pd-emptybet-input').forEach(function(inp) {
      node[inp.dataset.key] = parseInt(inp.value) || 0;
    });
    savePartnerTree();

    // 수정된 정보를 users.json에도 반영
    var permUpdate = {};
    var casinoVal = node['perm카지노'] !== false ? 'ON' : 'OFF';
    var slotVal = node['perm슬롯'] !== false ? 'ON' : 'OFF';
    permUpdate.casino = casinoVal;
    permUpdate.slot = slotVal;
    if (node.label) permUpdate.nickname = node.label;
    permUpdate.gameGroup = node.gameGroup || '';
    // 은행/계좌/예금주/연락처/메모/비밀번호도 반영
    if (node.bank !== undefined) permUpdate.bank = node.bank;
    if (node.account !== undefined) permUpdate.account = node.account;
    if (node.holder !== undefined) permUpdate.holder = node.holder;
    if (node.phone !== undefined) permUpdate.phone = node.phone;
    if (node.memo !== undefined) permUpdate.memo = node.memo;
    if (node.password !== undefined) permUpdate.password = node.password;
    // 본인 저장
    fetch('/api/admin/users/' + node.id + '/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permUpdate)
    }).catch(function(){});

    showAlertModal({ icon:'fas fa-check-circle', iconColor:'#4ade80', iconBg:'rgba(74,222,128,0.15)', title:'완료', message:'저장되었습니다.' });
    overlay.remove();
    openPartnerModal(findNode(partnerTree, node.id));
  });

  // 공베팅 변경
  var emptyBetSaveBtn = overlay.querySelector('#pd-emptybet-save');
  if (emptyBetSaveBtn) {
    emptyBetSaveBtn.addEventListener('click', function() {
      overlay.querySelectorAll('.pd-emptybet-input').forEach(function(inp) {
        node[inp.dataset.key] = parseInt(inp.value) || 0;
      });
      savePartnerTree();
      _showToast('✅ 공베팅 설정이 저장되었습니다.', 'success');
    });
  }

  // 비밀번호 초기화
  overlay.querySelector('#pd-pw-reset-btn').addEventListener('click', function() {
    showConfirmModal({
      icon: 'fas fa-lock',
      iconColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.15)',
      title: '비밀번호 초기화',
      message: '<strong style="color:var(--text,#e2e8f0);">' + (node.label || node.id) + '</strong> 의 비밀번호를 초기화하시겠습니까?<br><span style="color:#f59e0b;font-size:0.82rem;">기본 비밀번호: <strong>1234</strong></span>',
      confirmText: '초기화',
      confirmColor: '#f59e0b',
      onConfirm: function(close) {
        node.password = '1234';
        savePartnerTree();
        fetch('/api/admin/users/' + node.id + '/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: '1234' })
        }).catch(function(){});
        close();
        showAlertModal({ title: '초기화 완료', message: '비밀번호가 <strong style="color:#f59e0b;">1234</strong> 로 초기화되었습니다.' });
      }
    });
  });

  // 비밀번호 지정
  overlay.querySelector('#pd-pw-set-btn').addEventListener('click', function() {
    _showPasswordSetModal(node);
  });

  // 하부 전체 노드 수집 (자기 자신 포함)
  function _collectAllDescendants(n, list) {
    list.push(n);
    (n.children || []).forEach(function(c) { _collectAllDescendants(c, list); });
    return list;
  }

  // 정지
  overlay.querySelector('#pd-block-btn').addEventListener('click', function() {
    var isBlocked = node.status === 'blocked' || node.status === '차단';
    var allNodes = _collectAllDescendants(node, []);
    var count = allNodes.length;
    showConfirmModal({
      icon: isBlocked ? 'fas fa-unlock' : 'fas fa-ban',
      iconColor: isBlocked ? '#4ade80' : '#f87171',
      iconBg: isBlocked ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
      title: isBlocked ? '파트너 차단 해제' : '파트너 차단',
      message: '<strong style="color:var(--text,#e2e8f0);">' + (node.label || node.id) + '</strong> 파트너' + (count > 1 ? ' 및 하부 ' + (count - 1) + '개' : '') + '를 ' + (isBlocked ? '차단 해제' : '차단') + '하시겠습니까?',
      confirmText: isBlocked ? '해제' : '차단',
      confirmColor: isBlocked ? '#4ade80' : '#f87171',
      onConfirm: function(close) {
        if (isBlocked) {
          // 차단 해제: 하부 전체 순차 처리
          var chain = Promise.resolve();
          allNodes.forEach(function(n) {
            if (n.status !== 'blocked' && n.status !== '차단') return;
            chain = chain.then(function() {
              return fetch('/api/admin/users/' + n.id + '/unblock', { method: 'POST' })
                .then(function(r){ return r.json(); })
                .then(function(res) {
                  if (res.success) n.status = 'active';
                });
            });
          });
          chain.then(function() {
            savePartnerTree();
            close();
            if (overlay.parentNode) overlay.remove();
            if (typeof _ptRenderTableBody === 'function') _ptRenderTableBody();
            if (typeof renderTree === 'function') renderTree();
          });
        } else {
          // 차단: 하부 전체 순차 처리
          // 각 노드의 belongTo를 미리 수집
          var belongMap = {};
          allNodes.forEach(function(n) {
            var pn = (typeof findParentNode === 'function') ? findParentNode(partnerTree, n.id, null) : null;
            belongMap[n.id] = pn ? pn.id : '';
          });
          var chain = Promise.resolve();
          allNodes.forEach(function(n) {
            if (n.status === 'blocked' || n.status === 'deleted') return;
            chain = chain.then(function() {
              return fetch('/api/admin/users/' + n.id + '/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ belongTo: belongMap[n.id] })
              }).then(function(r){ return r.json(); }).then(function(res) {
                if (res.success) n.status = 'blocked';
              });
            });
          });
          chain.then(function() {
            savePartnerTree();
            close();
            if (overlay.parentNode) overlay.remove();
            if (typeof _ptRenderTableBody === 'function') _ptRenderTableBody();
            if (typeof renderTree === 'function') renderTree();
          });
        }
      }
    });
  });

  // 삭제
  overlay.querySelector('#pd-delete-btn').addEventListener('click', function() {
    var allNodes = _collectAllDescendants(node, []);
    var count = allNodes.length;
    showConfirmModal({
      icon: 'fas fa-trash-alt',
      iconColor: '#f87171',
      iconBg: 'rgba(248,113,113,0.15)',
      title: '파트너 삭제',
      message: '<strong style="color:var(--text,#e2e8f0);">' + (node.label || node.id) + '</strong> 파트너' + (count > 1 ? ' 및 하부 ' + (count - 1) + '개' : '') + '를 정말 삭제하시겠습니까?<br><span style="font-size:0.78rem;color:#f87171;">하부 데이터도 모두 삭제됩니다.</span>',
      confirmText: '삭제',
      confirmColor: '#dc2626',
      onConfirm: function(close) {
        // 각 노드의 belongTo를 미리 수집
        var belongMap = {};
        allNodes.forEach(function(n) {
          var pn = (typeof findParentNode === 'function') ? findParentNode(partnerTree, n.id, null) : null;
          belongMap[n.id] = pn ? pn.id : '';
        });
        var chain = Promise.resolve();
        allNodes.forEach(function(n) {
          if (n.status === 'deleted') return;
          chain = chain.then(function() {
            return fetch('/api/admin/users/' + n.id + '/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ belongTo: belongMap[n.id] })
            }).then(function(r){ return r.json(); }).then(function(res) {
              if (res.success) n.status = 'deleted';
            });
          });
        });
        chain.then(function() {
          savePartnerTree();
          close();
          if (overlay.parentNode) overlay.remove();
          if (typeof _ptRenderTableBody === 'function') _ptRenderTableBody();
          if (typeof renderTree === 'function') renderTree();
        });
      }
    });
  });
}

// openPartnerEditModal 제거됨 — 인라인 수정으로 대체

// ── 상위 변경 모달 ──
function openMoveParentModal(node) {
  var old = document.getElementById('pt-move-overlay');
  if(old) old.remove();

  var currentParent = findParentNode(partnerTree, node.id, null);

  // 이동 가능한 상위 후보
  var parentLevelMap = { head:'admin', subhead:'head', distributor:'subhead', store:'distributor', member:'store' };
  var requiredParentLevel = parentLevelMap[node.level];

  // 회원은 매장뿐 아니라 모든 파트너 레벨로 이동 가능
  var allowedParentLevels = requiredParentLevel ? [requiredParentLevel] : [];
  if (node.level === 'member') {
    allowedParentLevels = ['store','distributor','subhead','head'];
  }

  // 자기 하위 노드 ID 수집 (순환 방지)
  function collectDescendantIds(n, result) {
    result[n.id] = true;
    (n.children||[]).forEach(function(c){ collectDescendantIds(c, result); });
  }
  var descendantIds = {};
  collectDescendantIds(node, descendantIds);

  // 후보 수집
  var candidates = [];
  function collectCandidates(nodes) {
    (nodes||[]).forEach(function(n) {
      if(allowedParentLevels.indexOf(n.level) !== -1 && !descendantIds[n.id] && n.id !== node.id) {
        candidates.push(n);
      }
      if(n.children) collectCandidates(n.children);
    });
  }
  collectCandidates(partnerTree);

  var opts = '<option value="">파트너를 선택하세요</option>' + candidates.map(function(c) {
    return '<option value="'+c.id+'">'+c.label+' ('+(levelLabel[c.level]||c.level)+')</option>';
  }).join('');

  var nodeColor = levelColor[node.level] || '#888';
  var nodeLevelText = levelLabel[node.level] || node.level;
  var confirmText = '지금이동';

  var overlay = document.createElement('div');
  overlay.id = 'pt-move-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--shadow);z-index:10000;display:flex;align-items:center;justify-content:center;';

  overlay.innerHTML = '<div style="background:var(--bg,#1a1a2e);border-radius:12px;width:380px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.4);border:1px solid var(--border,#2a2a4a);">'
    // 헤더
    + '<div style="padding:16px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border,#2a2a4a);">'
    +   '<i class="fas fa-exchange-alt" style="color:#3b82f6;font-size:1rem;"></i>'
    +   '<div style="flex:1;">'
    +     '<div style="font-size:0.95rem;font-weight:700;color:var(--text,#eee);">상위 변경</div>'
    +     '<div style="display:flex;align-items:center;gap:6px;margin-top:3px;">'
    +       '<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:0.62rem;font-weight:600;color:#fff;background:'+nodeColor+';">'+nodeLevelText+'</span>'
    +       '<span style="font-size:0.78rem;color:var(--text2,#aaa);">'+node.label+' ('+node.id+')</span>'
    +     '</div>'
    +   '</div>'
    +   '<button id="mv-close" style="background:none;border:none;font-size:1.1rem;color:var(--text3,#666);cursor:pointer;">✕</button>'
    + '</div>'
    // 바디
    + '<div style="padding:20px;">'
    // 최상위로 지정 체크박스
    +   '<label id="mv-top-label" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--border,#2a2a4a);border-radius:8px;cursor:pointer;margin-bottom:16px;transition:border-color 0.15s;">'
    +     '<input type="checkbox" id="mv-top-check" style="width:16px;height:16px;cursor:pointer;accent-color:#3b82f6;">'
    +     '<div>'
    +       '<div style="font-size:0.82rem;font-weight:600;color:var(--text,#eee);">최상위로 지정</div>'
    +       '<div style="font-size:0.7rem;color:var(--text3,#888);">상위 파트너 없이 최상위로 이동합니다.</div>'
    +     '</div>'
    +   '</label>'
    // 새 상위 파트너
    +   '<div id="mv-parent-wrap" style="margin-bottom:16px;">'
    +     '<label style="font-size:0.78rem;color:var(--text2,#aaa);margin-bottom:6px;display:block;">새 상위 파트너</label>'
    +     '<select id="mv-new-parent" style="width:100%;padding:10px 12px;border:1px solid var(--border,#2a2a4a);border-radius:8px;font-size:0.82rem;background:var(--bg2,#16213e);color:var(--text,#eee);box-sizing:border-box;">'+opts+'</select>'
    +   '</div>'
    // 확인 입력
    +   '<div style="margin-bottom:4px;">'
    +     '<label style="font-size:0.78rem;color:var(--text2,#aaa);margin-bottom:6px;display:block;">확인을 위해 \'<span style="color:#3b82f6;font-weight:700;">'+confirmText+'</span>\'을 입력하세요</label>'
    +     '<input id="mv-confirm-input" type="text" placeholder="'+confirmText+'" style="width:100%;padding:10px 12px;border:1px solid var(--border,#2a2a4a);border-radius:8px;font-size:0.82rem;background:var(--bg2,#16213e);color:var(--text,#eee);box-sizing:border-box;">'
    +   '</div>'
    + '</div>'
    // 푸터
    + '<div style="padding:14px 20px;border-top:1px solid var(--border,#2a2a4a);display:flex;justify-content:flex-end;gap:8px;">'
    +   '<button id="mv-cancel" style="padding:8px 18px;border-radius:6px;font-size:0.82rem;border:1px solid var(--border,#2a2a4a);background:transparent;color:var(--text2,#aaa);cursor:pointer;">취소</button>'
    +   '<button id="mv-confirm" style="padding:8px 18px;border-radius:6px;font-size:0.82rem;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-weight:600;opacity:0.5;pointer-events:none;"><i class="fas fa-exchange-alt" style="margin-right:4px;font-size:0.72rem;"></i>이동</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);

  var confirmInput = document.getElementById('mv-confirm-input');
  var confirmBtn = document.getElementById('mv-confirm');
  var topCheck = document.getElementById('mv-top-check');
  var parentWrap = document.getElementById('mv-parent-wrap');

  // 확인 텍스트 입력 시 버튼 활성화
  confirmInput.addEventListener('input', function() {
    var valid = this.value.trim() === confirmText;
    confirmBtn.style.opacity = valid ? '1' : '0.5';
    confirmBtn.style.pointerEvents = valid ? 'auto' : 'none';
  });

  // 최상위 체크 시 상위 파트너 선택 비활성화
  topCheck.addEventListener('change', function() {
    if(this.checked) {
      parentWrap.style.opacity = '0.4';
      parentWrap.style.pointerEvents = 'none';
    } else {
      parentWrap.style.opacity = '1';
      parentWrap.style.pointerEvents = 'auto';
    }
  });

  document.getElementById('mv-close').addEventListener('click', function(){ overlay.remove(); });
  document.getElementById('mv-cancel').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });

  confirmBtn.addEventListener('click', function() {
    if(confirmInput.value.trim() !== confirmText) return;

    var isTop = topCheck.checked;
    var newParentId = document.getElementById('mv-new-parent').value;

    if(!isTop && !newParentId) { alert('상위 파트너를 선택하거나 최상위를 체크하세요.'); return; }

    var newParent;
    if(isTop) {
      newParent = partnerTree[0]; // admin
    } else {
      newParent = findNode(partnerTree, newParentId);
      if(!newParent) { alert('상위 파트너를 찾을 수 없습니다.'); return; }
    }

    if(currentParent && newParent.id === currentParent.id) { alert('현재와 동일한 상위입니다.'); overlay.remove(); return; }

    // 기존 상위에서 제거
    if(currentParent && currentParent.children) {
      currentParent.children = currentParent.children.filter(function(c){ return c.id !== node.id; });
    }

    // 새 상위에 추가
    if(!newParent.children) newParent.children = [];
    newParent.children.push(node);

    // 최상위 이동 시 등급을 head로 변경
    if(isTop && node.level !== 'head') {
      node.level = 'head';
    }

    savePartnerTree();
    overlay.remove();
    if(typeof _ptRenderListPage === 'function') _ptRenderListPage();
    _showToast(node.label + '의 상위가 ' + (isTop ? '최상위(관리자)' : newParent.label) + '(으)로 변경되었습니다.', 'success');
  });
}

// ── 상단 "파트너 추가" 버튼용 — 등급/상위 파트너 선택 가능 ──
function openCreateModalFree() {
  var existing = document.getElementById('pt-modal-overlay');
  if(existing) existing.remove();

  var parentLevelMap = { head:'admin', subhead:'head', distributor:'subhead', store:'distributor' };
  var bankOpts = '<option value="">선택없음</option>' + ['하나','국민','신한','우리','농협','기업','카카오','케이뱅크','토스','씨티','SC제일']
    .map(function(v){ return '<option>'+v+'</option>'; }).join('');
  var groupOpts = '<option value="">선택없음</option>';
  var req = '<span style="color:#e74c3c;font-size:0.7rem;margin-left:2px;">*</span>';

  // 등급 옵션
  var levelOptions = ['head','subhead','distributor','store'].map(function(lv) {
    return '<option value="'+lv+'">'+(levelLabel[lv]||lv)+'</option>';
  }).join('');

  // 특정 레벨의 상위가 될 수 있는 노드 수집
  function getParentOptionsForLevel(targetLevel) {
    var pLevel = parentLevelMap[targetLevel];
    var opts = '';
    function collect(nodes) {
      (nodes||[]).forEach(function(n) {
        if(n.level === pLevel) {
          opts += '<option value="'+n.id+'">'+n.label+' ('+(levelLabel[n.level]||n.level)+')</option>';
        }
        if(n.children) collect(n.children);
      });
    }
    collect(partnerTree);
    return opts || '<option value="">선택 가능한 상위 없음</option>';
  }

  // 특정 parentNode의 max 값
  function getMaxValues(parentId) {
    var p = findNode(partnerTree, parentId);
    if(!p) p = partnerTree[0]; // admin
    return {
      casino: parseFloat(p.rollCasino) || 5,
      slot: parseFloat(p.rollSlot) || 5,
      mini: parseFloat(p.rollMini) || 1,
      losing: parseFloat(p.losingSlot) || 100
    };
  }

  var overlay = document.createElement('div');
  overlay.id = 'pt-modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--shadow);z-index:10000;display:flex;align-items:center;justify-content:center;';

  function buildHTML(selectedLevel, parentOpts, mx) {
    return '<div style="background:var(--bg,#fff);border-radius:12px;width:780px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'
    + '<div style="padding:18px 24px;border-bottom:1px solid var(--border,#eee);display:flex;align-items:center;gap:12px;">'
    +   '<div style="width:36px;height:36px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user-plus" style="color:#8b5cf6;font-size:0.95rem;"></i></div>'
    +   '<div>'
    +     '<div style="font-size:1rem;font-weight:700;color:var(--text,#222);">파트너 추가</div>'
    +     '<div style="font-size:0.72rem;color:var(--text3,#999);">등급과 상위 파트너를 선택하세요</div>'
    +   '</div>'
    +   '<button id="pc-close-btn" style="margin-left:auto;background:none;border:none;font-size:1.2rem;color:var(--text3,#999);cursor:pointer;">✕</button>'
    + '</div>'
    + '<div style="display:flex;gap:0;padding:24px;">'
    +   '<div style="flex:1;padding-right:24px;border-right:1px solid var(--border,#eee);">'
    +     '<div style="font-size:0.8rem;font-weight:700;color:var(--text,#222);margin-bottom:16px;padding-left:8px;border-left:3px solid #8b5cf6;">계정 정보</div>'
    +     '<div style="margin-bottom:12px;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">아이디'+req+'</label><div style="position:relative;"><input id="pc-id" type="text" placeholder="4~20자" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"><span id="pc-id-status" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:0.7rem;"></span></div><div id="pc-id-msg" style="font-size:0.68rem;margin-top:3px;min-height:14px;"></div></div>'
    +     '<div style="margin-bottom:12px;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">비밀번호'+req+'</label><input id="pc-pw" type="password" placeholder="3자 이상" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"></div>'
    +     '<div style="margin-bottom:12px;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">닉네임'+req+'</label><input id="pc-nick" type="text" placeholder="2~20자" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"></div>'
    +     '<div style="display:flex;gap:10px;margin-bottom:12px;">'
    +       '<div style="flex:1;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">연락처</label><input id="pc-phone" type="text" placeholder="010-0000-0000" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"></div>'
    +       '<div style="flex:1;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">그룹</label><select id="pc-group" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);">'+groupOpts+'</select></div>'
    +     '</div>'
    +     '<div style="display:flex;gap:10px;margin-bottom:12px;">'
    +       '<div style="flex:1;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">은행</label><select id="pc-bank" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);">'+bankOpts+'</select></div>'
    +       '<div style="flex:1;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">계좌번호</label><input id="pc-account" type="text" placeholder="000-0000-0000" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"></div>'
    +       '<div style="flex:1;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">예금주</label><input id="pc-owner" type="text" placeholder="홍길동" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"></div>'
    +     '</div>'
    +     '<div><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">메모</label><textarea id="pc-memo" placeholder="관리용 메모" rows="3" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);resize:vertical;box-sizing:border-box;"></textarea></div>'
    +   '</div>'
    +   '<div style="flex:1;padding-left:24px;">'
    +     '<div style="font-size:0.8rem;font-weight:700;color:var(--text,#222);margin-bottom:16px;padding-left:8px;border-left:3px solid #e74c3c;">파트너 설정</div>'
    +     '<div style="display:flex;gap:10px;margin-bottom:16px;">'
    +       '<div style="flex:1;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">파트너 등급'+req+'</label><select id="pc-level" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);">'+levelOptions+'</select></div>'
    +       '<div style="flex:1;"><label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">상위 파트너'+req+'</label><select id="pc-parent" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);">'+parentOpts+'</select></div>'
    +     '</div>'
    +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    +       '<span style="font-size:0.75rem;font-weight:600;color:var(--text2,#666);">롤링율 설정 (%)</span>'
    +       '<input id="pc-roll-all" type="number" value="0" min="0" step="0.1" style="width:60px;padding:5px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);">'
    +       '<button id="pc-roll-apply" style="padding:4px 10px;border:1px solid #8b5cf6;border-radius:4px;font-size:0.7rem;color:#8b5cf6;background:rgba(139,92,246,0.08);cursor:pointer;">전체 적용</button>'
    +     '</div>'
    +     '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">'
    +       '<div><label style="font-size:0.7rem;color:var(--text3,#999);display:flex;justify-content:space-between;margin-bottom:3px;"><span>카지노</span><span style="color:#8b5cf6;font-size:0.62rem;">(max '+mx.casino+'%)</span></label><input id="pc-roll-casino" type="number" value="0" min="0" max="'+mx.casino+'" step="0.1" style="width:100%;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"></div>'
    +       '<div><label style="font-size:0.7rem;color:var(--text3,#999);display:flex;justify-content:space-between;margin-bottom:3px;"><span>슬롯</span><span style="color:#8b5cf6;font-size:0.62rem;">(max '+mx.slot+'%)</span></label><input id="pc-roll-slot" type="number" value="0" min="0" max="'+mx.slot+'" step="0.1" style="width:100%;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"></div>'
    +       '<div><label style="font-size:0.7rem;color:var(--text3,#999);display:flex;justify-content:space-between;margin-bottom:3px;"><span>미니게임</span><span style="color:#8b5cf6;font-size:0.62rem;">(max '+mx.mini+'%)</span></label><input id="pc-roll-mini" type="number" value="0" min="0" max="'+mx.mini+'" step="0.1" style="width:100%;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"></div>'
    +     '</div>'
    +     '<div><label style="font-size:0.7rem;color:var(--text3,#999);display:flex;justify-content:space-between;margin-bottom:3px;"><span>루징</span><span style="color:#8b5cf6;font-size:0.62rem;">(max '+mx.losing+'%)</span></label><input id="pc-losing" type="number" value="0" min="0" max="'+mx.losing+'" step="1" style="width:33%;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;"></div>'
    +     '<div style="border:2px dashed #f59e0b;border-radius:10px;padding:14px;margin-top:14px;">'
    +       '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
    +         '<span style="color:#f59e0b;font-weight:700;font-size:0.85rem;">⚠ 누락(공베팅) 설정</span>'
    +         '<span style="background:#f59e0b33;color:#f59e0b;padding:2px 8px;border-radius:4px;font-size:0.65rem;">주의: 하위에게 상속됨</span>'
    +       '</div>'
    +       '<div style="font-size:0.72rem;color:var(--text3,#999);margin-bottom:10px;">N회 베팅마다 1회 누락됩니다. 0=미적용. 상위 파트너 설정이 없으면 하위로 상속됩니다.</div>'
    +       '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:0.75rem;">'
    +         '<div><div style="color:var(--text3,#999);margin-bottom:3px;">카지노</div><input id="pc-empty-casino" type="number" value="0" min="0" max="100" style="width:60px;text-align:center;padding:4px 6px;font-size:0.78rem;font-weight:600;border-radius:5px;border:1px solid var(--border,#ddd);background:var(--bg2,#f8f8f8);color:var(--text,#222);"></div>'
    +         '<div><div style="color:var(--text3,#999);margin-bottom:3px;">슬롯</div><input id="pc-empty-slot" type="number" value="0" min="0" max="100" style="width:60px;text-align:center;padding:4px 6px;font-size:0.78rem;font-weight:600;border-radius:5px;border:1px solid var(--border,#ddd);background:var(--bg2,#f8f8f8);color:var(--text,#222);"></div>'
    +         '<div><div style="color:var(--text3,#999);margin-bottom:3px;">미니게임</div><input id="pc-empty-mini" type="number" value="0" min="0" max="100" style="width:60px;text-align:center;padding:4px 6px;font-size:0.78rem;font-weight:600;border-radius:5px;border:1px solid var(--border,#ddd);background:var(--bg2,#f8f8f8);color:var(--text,#222);"></div>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div style="padding:14px 24px;border-top:1px solid var(--border,#eee);display:flex;align-items:center;justify-content:space-between;">'
    +   '<span style="font-size:0.7rem;color:var(--text3,#999);">'+req+' 필수 입력 항목</span>'
    +   '<div style="display:flex;gap:8px;">'
    +     '<button id="pc-cancel-btn" style="padding:8px 20px;border-radius:6px;font-size:0.82rem;border:1px solid var(--border,#ddd);background:var(--bg2,#f5f5f5);color:var(--text2,#666);cursor:pointer;">취소</button>'
    +     '<button id="pc-confirm-btn" style="padding:8px 20px;border-radius:6px;font-size:0.82rem;border:none;background:#8b5cf6;color:#fff;cursor:pointer;font-weight:600;"><i class="fas fa-user-plus" style="margin-right:4px;font-size:0.75rem;"></i>파트너 추가</button>'
    +   '</div>'
    + '</div>'
    + '</div>';
  }

  // 초기 렌더
  var initLevel = 'head';
  var initParentOpts = getParentOptionsForLevel(initLevel);
  var initMx = getMaxValues('admin');
  overlay.innerHTML = buildHTML(initLevel, initParentOpts, initMx);
  document.body.appendChild(overlay);

  function bindEvents() {
    document.getElementById('pc-close-btn').addEventListener('click', function(){ overlay.remove(); });
    document.getElementById('pc-cancel-btn').addEventListener('click', function(){ overlay.remove(); });
    overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });

    // 실시간 아이디 중복 체크
    var _pcDupTimer = null;
    document.getElementById('pc-id').addEventListener('input', function() {
      var val = this.value.trim();
      var statusEl = document.getElementById('pc-id-status');
      var msgEl = document.getElementById('pc-id-msg');
      if (_pcDupTimer) clearTimeout(_pcDupTimer);
      if (!val) { statusEl.innerHTML = ''; msgEl.innerHTML = ''; return; }
      if (val.length < 4) { statusEl.innerHTML = ''; msgEl.innerHTML = '<span style="color:#f59e0b;">4자 이상 입력하세요</span>'; return; }
      statusEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:var(--text2);"></i>';
      msgEl.innerHTML = '';
      _pcDupTimer = setTimeout(function() {
        var exists = !!findNode(partnerTree, val);
        if (!exists) {
          fetch('/api/admin/users').then(function(r){ return r.json(); }).then(function(res) {
            var users = res.data || res || [];
            exists = users.some(function(u){ return u.username === val; });
            if (exists) {
              statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i>';
              msgEl.innerHTML = '<span style="color:#ef4444;">이미 사용중인 아이디입니다</span>';
            } else {
              statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i>';
              msgEl.innerHTML = '<span style="color:#10b981;">사용 가능한 아이디입니다</span>';
            }
          }).catch(function(){ statusEl.innerHTML = ''; msgEl.innerHTML = ''; });
        } else {
          statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i>';
          msgEl.innerHTML = '<span style="color:#ef4444;">이미 사용중인 아이디입니다</span>';
        }
      }, 300);
    });

    // 등급 변경 → 상위 파트너 목록 + max값 갱신
    document.getElementById('pc-level').addEventListener('change', function() {
      var lv = this.value;
      var pOpts = getParentOptionsForLevel(lv);
      var parentSel = document.getElementById('pc-parent');
      parentSel.innerHTML = pOpts;
      // max 값 갱신
      var firstParentId = parentSel.value;
      var mx = firstParentId ? getMaxValues(firstParentId) : getMaxValues('admin');
      updateMaxLabels(mx);
    });

    // 상위 파트너 변경 → max값 갱신
    document.getElementById('pc-parent').addEventListener('change', function() {
      var mx = this.value ? getMaxValues(this.value) : getMaxValues('admin');
      updateMaxLabels(mx);
    });

    // 전체 적용
    document.getElementById('pc-roll-apply').addEventListener('click', function() {
      var allVal = document.getElementById('pc-roll-all').value;
      ['pc-roll-casino','pc-roll-slot','pc-roll-mini'].forEach(function(id) {
        var el = document.getElementById(id);
        if(el) {
          var mx = parseFloat(el.getAttribute('max')) || 0;
          el.value = Math.min(parseFloat(allVal)||0, mx);
        }
      });
    });

    // 확인
    document.getElementById('pc-confirm-btn').addEventListener('click', async function() {
      var id = document.getElementById('pc-id').value.trim();
      var nick = document.getElementById('pc-nick').value.trim();
      var pw = document.getElementById('pc-pw').value.trim();
      var selectedLevel = document.getElementById('pc-level').value;
      var parentId = document.getElementById('pc-parent').value;
      if(!id){ _showToast('아이디를 입력하세요.', 'error'); return; }
      if(id.length < 4){ _showToast('아이디는 4자 이상이어야 합니다.', 'error'); return; }
      if(!pw){ _showToast('비밀번호를 입력하세요.', 'error'); return; }
      if(pw.length < 3){ _showToast('비밀번호는 3자 이상이어야 합니다.', 'error'); return; }
      if(!nick){ _showToast('닉네임을 입력하세요.', 'error'); return; }
      if(!parentId){ _showToast('상위 파트너를 선택하세요.', 'error'); return; }
      if(findNode(partnerTree, id)){ _showToast('이미 존재하는 아이디입니다.', 'error'); return; }

      var parentNode = findNode(partnerTree, parentId);
      if(!parentNode){ alert('상위 파트너를 찾을 수 없습니다.'); return; }

      // 파트너 권한 체크
      var parentLevel = parentNode.level || 'admin';
      if(parentLevel !== 'admin') {
        var canCreate = await _checkPartnerPerm(parentLevel, 'createPartner');
        if(!canCreate) { alert('해당 등급은 파트너 생성 권한이 없습니다.'); return; }
      }

      var rollCasino = document.getElementById('pc-roll-casino').value || '0';
      var rollSlot = document.getElementById('pc-roll-slot').value || '0';
      var rollMini = document.getElementById('pc-roll-mini').value || '0';
      var losing = document.getElementById('pc-losing').value || '0';

      showLoading('partnerCreate');
      fetch('/api/admin/partner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: id, nickname: nick, password: pw })
      })
      .then(function(r){ return r.json(); })
      .then(function(res) {
        hideLoading();
        if (!res.success) { _showToast(res.error || '생성 실패', 'error'); return; }
        var newNode = {
          id: id, label: nick, level: selectedLevel, expanded: false, children: [],
          money: 0, point: 0,
          rollCasino: rollCasino, rollSlot: rollSlot, rollMini: rollMini,
          losingSlot: losing,
          phone: document.getElementById('pc-phone').value.trim(),
          password: pw,
          bank: document.getElementById('pc-bank').value,
          account: document.getElementById('pc-account').value.trim(),
          holder: document.getElementById('pc-owner').value.trim(),
          memo: document.getElementById('pc-memo').value.trim(),
          group: document.getElementById('pc-group').value,
          'emptyBet카지노': parseInt(document.getElementById('pc-empty-casino').value) || 0,
          'emptyBet슬롯': parseInt(document.getElementById('pc-empty-slot').value) || 0,
          'emptyBet미니게임': parseInt(document.getElementById('pc-empty-mini').value) || 0,
          status: '정상',
          registeredAt: new Date().toISOString()
        };
        if(!parentNode.children) parentNode.children = [];
        parentNode.children.push(newNode);
        parentNode.expanded = true;
        savePartnerTree();
        overlay.remove();
        if(typeof _ptRenderListPage === 'function') _ptRenderListPage();
        _showToast('✅ ' + nick + ' 파트너 생성 완료', 'success');
      })
      .catch(function(){ hideLoading(); alert('서버 오류'); });
    });
  }

  function updateMaxLabels(mx) {
    var rc = document.getElementById('pc-roll-casino');
    var rs = document.getElementById('pc-roll-slot');
    var rm = document.getElementById('pc-roll-mini');
    var lo = document.getElementById('pc-losing');
    if(rc) rc.setAttribute('max', mx.casino);
    if(rs) rs.setAttribute('max', mx.slot);
    if(rm) rm.setAttribute('max', mx.mini);
    if(lo) lo.setAttribute('max', mx.losing);
  }

  bindEvents();
}

// ── 파트너 생성 모달 (하위 생성 버튼용 — 상위 고정) ──
function openCreateModal(parentNode) {
  var existing = document.getElementById('pt-modal-overlay');
  if(existing) existing.remove();

  var childLevel = { admin:'head', head:'subhead', subhead:'distributor', distributor:'store', store:'member' };
  var newLevel = childLevel[parentNode.level] || 'member';

  // 매장 → 회원 생성은 회원관리 페이지 모달 사용
  if(newLevel === 'member') {
    if (typeof _showCreateMemberModal === 'function') {
      _showCreateMemberModal('single', parentNode.id);
    }
    return;
  }

  // 상위 파트너의 롤링/루징 최대치
  var maxCasino = parseFloat(parentNode.rollCasino) || 1;
  var maxSlot = parseFloat(parentNode.rollSlot) || 1;
  var maxMini = parseFloat(parentNode.rollMini) || 1;
  var maxLosingSlot = parseFloat(parentNode.losingSlot) || 10;

  // 등급은 직하위 1단계만 가능
  var levelOptions = '<option value="'+newLevel+'" selected>'+(levelLabel[newLevel]||newLevel)+'</option>';

  // 상위 파트너 옵션
  var parentOptions = '<option value="" selected>선택없음</option>';
  // 현재 parentNode가 상위
  function collectParents(nodes) {
    (nodes||[]).forEach(function(n) {
      if(n.level !== 'member' && n.level !== 'admin') {
        parentOptions += '<option value="'+n.id+'"'+(n.id===parentNode.id?' selected':'')+'>'+n.label+' ('+( levelLabel[n.level]||n.level)+')</option>';
      }
      if(n.children) collectParents(n.children);
    });
  }
  collectParents(partnerTree);

  var bankOpts = '<option value="">선택없음</option>' + ['하나','국민','신한','우리','농협','기업','카카오','케이뱅크','토스','씨티','SC제일']
    .map(function(v){ return '<option>'+v+'</option>'; }).join('');

  // 그룹 옵션
  var groupOpts = '<option value="">선택없음</option>';

  var req = '<span style="color:#e74c3c;font-size:0.7rem;margin-left:2px;">*</span>';

  var overlay = document.createElement('div');
  overlay.id = 'pt-modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--shadow);z-index:10000;display:flex;align-items:center;justify-content:center;';

  overlay.innerHTML = '<div style="background:var(--bg,#fff);border-radius:12px;width:780px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'
    // ── 헤더 ──
    + '<div style="padding:18px 24px;border-bottom:1px solid var(--border,#eee);display:flex;align-items:center;gap:12px;">'
    +   '<div style="width:36px;height:36px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user-plus" style="color:#8b5cf6;font-size:0.95rem;"></i></div>'
    +   '<div>'
    +     '<div style="font-size:1rem;font-weight:700;color:var(--text,#222);">하위 파트너 생성</div>'
    +     '<div style="font-size:0.72rem;color:var(--text3,#999);">상위 파트너: '+parentNode.id+' <span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:0.65rem;font-weight:600;color:#fff;background:'+(levelColor[parentNode.level]||'#888')+';">'+(levelLabel[parentNode.level]||parentNode.level)+'</span></div>'
    +   '</div>'
    +   '<button id="pc-close-btn" style="margin-left:auto;background:none;border:none;font-size:1.2rem;color:var(--text3,#999);cursor:pointer;">✕</button>'
    + '</div>'
    // ── 바디: 2컬럼 ──
    + '<div style="display:flex;gap:0;padding:24px;">'
    // ── 왼쪽: 계정 정보 ──
    +   '<div style="flex:1;padding-right:24px;border-right:1px solid var(--border,#eee);">'
    +     '<div style="font-size:0.8rem;font-weight:700;color:var(--text,#222);margin-bottom:16px;padding-left:8px;border-left:3px solid #8b5cf6;">계정 정보</div>'
    +     '<div style="margin-bottom:12px;">'
    +       '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">아이디'+req+'</label>'
    +       '<div style="position:relative;"><input id="pc-id" type="text" placeholder="4~20자" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +       '<span id="pc-id-status" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:0.7rem;"></span></div>'
    +       '<div id="pc-id-msg" style="font-size:0.68rem;margin-top:3px;min-height:14px;"></div>'
    +     '</div>'
    +     '<div style="margin-bottom:12px;">'
    +       '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">비밀번호'+req+'</label>'
    +       '<input id="pc-pw" type="password" placeholder="3자 이상" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +     '</div>'
    +     '<div style="margin-bottom:12px;">'
    +       '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">닉네임'+req+'</label>'
    +       '<input id="pc-nick" type="text" placeholder="2~20자" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +     '</div>'
    +     '<div style="display:flex;gap:10px;margin-bottom:12px;">'
    +       '<div style="flex:1;">'
    +         '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">연락처</label>'
    +         '<input id="pc-phone" type="text" placeholder="010-0000-0000" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +       '</div>'
    +       '<div style="flex:1;">'
    +         '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">그룹</label>'
    +         '<select id="pc-group" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);">'+groupOpts+'</select>'
    +       '</div>'
    +     '</div>'
    +     '<div style="display:flex;gap:10px;margin-bottom:12px;">'
    +       '<div style="flex:1;">'
    +         '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">은행</label>'
    +         '<select id="pc-bank" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);">'+bankOpts+'</select>'
    +       '</div>'
    +       '<div style="flex:1;">'
    +         '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">계좌번호</label>'
    +         '<input id="pc-account" type="text" placeholder="000-0000-0000" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +       '</div>'
    +       '<div style="flex:1;">'
    +         '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">예금주</label>'
    +         '<input id="pc-owner" type="text" placeholder="홍길동" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +       '</div>'
    +     '</div>'
    +     '<div>'
    +       '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">메모</label>'
    +       '<textarea id="pc-memo" placeholder="관리용 메모" rows="3" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);resize:vertical;box-sizing:border-box;"></textarea>'
    +     '</div>'
    +   '</div>'
    // ── 오른쪽: 파트너 설정 ──
    +   '<div style="flex:1;padding-left:24px;">'
    +     '<div style="font-size:0.8rem;font-weight:700;color:var(--text,#222);margin-bottom:16px;padding-left:8px;border-left:3px solid #e74c3c;">파트너 설정</div>'
    +     '<div style="display:flex;gap:10px;margin-bottom:16px;">'
    +       '<div style="flex:1;">'
    +         '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">파트너 등급'+req+'</label>'
    +         '<select id="pc-level" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);">'+levelOptions+'</select>'
    +       '</div>'
    +       '<div style="flex:1;">'
    +         '<label style="font-size:0.75rem;color:var(--text2,#666);margin-bottom:4px;display:block;">상위 파트너</label>'
    +         '<select id="pc-parent" style="width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:0.82rem;background:var(--bg2,#f8f8f8);color:var(--text,#222);" disabled>'+parentOptions+'</select>'
    +       '</div>'
    +     '</div>'
    // 롤링율 설정
    +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    +       '<span style="font-size:0.75rem;font-weight:600;color:var(--text2,#666);">롤링율 설정 (%)</span>'
    +       '<input id="pc-roll-all" type="number" value="0" min="0" step="0.1" style="width:60px;padding:5px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);">'
    +       '<button id="pc-roll-apply" style="padding:4px 10px;border:1px solid #8b5cf6;border-radius:4px;font-size:0.7rem;color:#8b5cf6;background:rgba(139,92,246,0.08);cursor:pointer;">전체 적용</button>'
    +     '</div>'
    +     '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">'
    +       '<div>'
    +         '<label style="font-size:0.7rem;color:var(--text3,#999);display:flex;justify-content:space-between;margin-bottom:3px;"><span>카지노</span><span style="color:#8b5cf6;font-size:0.62rem;">(max '+maxCasino+'%)</span></label>'
    +         '<input id="pc-roll-casino" type="number" value="0" min="0" max="'+maxCasino+'" step="0.1" style="width:100%;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +       '</div>'
    +       '<div>'
    +         '<label style="font-size:0.7rem;color:var(--text3,#999);display:flex;justify-content:space-between;margin-bottom:3px;"><span>슬롯</span><span style="color:#8b5cf6;font-size:0.62rem;">(max '+maxSlot+'%)</span></label>'
    +         '<input id="pc-roll-slot" type="number" value="0" min="0" max="'+maxSlot+'" step="0.1" style="width:100%;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +       '</div>'
    +       '<div>'
    +         '<label style="font-size:0.7rem;color:var(--text3,#999);display:flex;justify-content:space-between;margin-bottom:3px;"><span>미니게임</span><span style="color:#8b5cf6;font-size:0.62rem;">(max '+maxMini+'%)</span></label>'
    +         '<input id="pc-roll-mini" type="number" value="0" min="0" max="'+maxMini+'" step="0.1" style="width:100%;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +       '</div>'
    +     '</div>'
    // 루징
    +     '<div>'
    +       '<label style="font-size:0.7rem;color:var(--text3,#999);display:flex;justify-content:space-between;margin-bottom:3px;"><span>루징</span><span style="color:#8b5cf6;font-size:0.62rem;">(max '+maxLosingSlot+'%)</span></label>'
    +       '<input id="pc-losing" type="number" value="0" min="0" max="'+maxLosingSlot+'" step="1" style="width:33%;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:0.78rem;text-align:center;background:var(--bg2,#f8f8f8);color:var(--text,#222);box-sizing:border-box;">'
    +     '</div>'
    // 공베팅 설정
    +     '<div style="border:2px dashed #f59e0b;border-radius:10px;padding:14px;margin-top:14px;">'
    +       '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
    +         '<span style="color:#f59e0b;font-weight:700;font-size:0.85rem;">⚠ 누락(공베팅) 설정</span>'
    +         '<span style="background:#f59e0b33;color:#f59e0b;padding:2px 8px;border-radius:4px;font-size:0.65rem;">주의: 하위에게 상속됨</span>'
    +       '</div>'
    +       '<div style="font-size:0.72rem;color:var(--text3,#999);margin-bottom:10px;">N회 베팅마다 1회 누락됩니다. 0=미적용. 상위 파트너 설정이 없으면 하위로 상속됩니다.</div>'
    +       '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:0.75rem;">'
    +         '<div><div style="color:var(--text3,#999);margin-bottom:3px;">카지노</div><input id="pc-empty-casino" type="number" value="0" min="0" max="100" style="width:60px;text-align:center;padding:4px 6px;font-size:0.78rem;font-weight:600;border-radius:5px;border:1px solid var(--border,#ddd);background:var(--bg2,#f8f8f8);color:var(--text,#222);"></div>'
    +         '<div><div style="color:var(--text3,#999);margin-bottom:3px;">슬롯</div><input id="pc-empty-slot" type="number" value="0" min="0" max="100" style="width:60px;text-align:center;padding:4px 6px;font-size:0.78rem;font-weight:600;border-radius:5px;border:1px solid var(--border,#ddd);background:var(--bg2,#f8f8f8);color:var(--text,#222);"></div>'
    +         '<div><div style="color:var(--text3,#999);margin-bottom:3px;">미니게임</div><input id="pc-empty-mini" type="number" value="0" min="0" max="100" style="width:60px;text-align:center;padding:4px 6px;font-size:0.78rem;font-weight:600;border-radius:5px;border:1px solid var(--border,#ddd);background:var(--bg2,#f8f8f8);color:var(--text,#222);"></div>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    // ── 푸터 ──
    + '<div style="padding:14px 24px;border-top:1px solid var(--border,#eee);display:flex;align-items:center;justify-content:space-between;">'
    +   '<span style="font-size:0.7rem;color:var(--text3,#999);">'+req+' 필수 입력 항목</span>'
    +   '<div style="display:flex;gap:8px;">'
    +     '<button id="pc-cancel-btn" style="padding:8px 20px;border-radius:6px;font-size:0.82rem;border:1px solid var(--border,#ddd);background:var(--bg2,#f5f5f5);color:var(--text2,#666);cursor:pointer;">취소</button>'
    +     '<button id="pc-confirm-btn" style="padding:8px 20px;border-radius:6px;font-size:0.82rem;border:none;background:#8b5cf6;color:#fff;cursor:pointer;font-weight:600;"><i class="fas fa-user-plus" style="margin-right:4px;font-size:0.75rem;"></i>파트너 추가</button>'
    +   '</div>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);

  // 닫기
  document.getElementById('pc-close-btn').addEventListener('click', function(){ overlay.remove(); });
  document.getElementById('pc-cancel-btn').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });

  // 실시간 아이디 중복 체크
  var _pcDupTimer2 = null;
  document.getElementById('pc-id').addEventListener('input', function() {
    var val = this.value.trim();
    var statusEl = document.getElementById('pc-id-status');
    var msgEl = document.getElementById('pc-id-msg');
    if (_pcDupTimer2) clearTimeout(_pcDupTimer2);
    if (!val) { statusEl.innerHTML = ''; msgEl.innerHTML = ''; return; }
    if (val.length < 4) { statusEl.innerHTML = ''; msgEl.innerHTML = '<span style="color:#f59e0b;">4자 이상 입력하세요</span>'; return; }
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:var(--text2);"></i>';
    msgEl.innerHTML = '';
    _pcDupTimer2 = setTimeout(function() {
      var exists = !!findNode(partnerTree, val);
      if (!exists) {
        fetch('/api/admin/users').then(function(r){ return r.json(); }).then(function(res) {
          var users = res.data || res || [];
          exists = users.some(function(u){ return u.username === val; });
          if (exists) {
            statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i>';
            msgEl.innerHTML = '<span style="color:#ef4444;">이미 사용중인 아이디입니다</span>';
          } else {
            statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i>';
            msgEl.innerHTML = '<span style="color:#10b981;">사용 가능한 아이디입니다</span>';
          }
        }).catch(function(){ statusEl.innerHTML = ''; msgEl.innerHTML = ''; });
      } else {
        statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i>';
        msgEl.innerHTML = '<span style="color:#ef4444;">이미 사용중인 아이디입니다</span>';
      }
    }, 300);
  });

  // 전체 적용 버튼
  document.getElementById('pc-roll-apply').addEventListener('click', function() {
    var allVal = document.getElementById('pc-roll-all').value;
    ['pc-roll-casino','pc-roll-slot','pc-roll-mini'].forEach(function(id) {
      var el = document.getElementById(id);
      if(el) {
        var mx = parseFloat(el.getAttribute('max')) || 0;
        el.value = Math.min(parseFloat(allVal)||0, mx);
      }
    });
  });

  // 확인
  document.getElementById('pc-confirm-btn').addEventListener('click', async function() {
    var id = document.getElementById('pc-id').value.trim();
    var nick = document.getElementById('pc-nick').value.trim();
    var pw = document.getElementById('pc-pw').value.trim();
    var selectedLevel = document.getElementById('pc-level').value;
    if(!id){ _showToast('아이디를 입력하세요.', 'error'); return; }
    if(id.length < 4){ _showToast('아이디는 4자 이상이어야 합니다.', 'error'); return; }
    if(!pw){ _showToast('비밀번호를 입력하세요.', 'error'); return; }
    if(pw.length < 3){ _showToast('비밀번호는 3자 이상이어야 합니다.', 'error'); return; }
    if(!nick){ _showToast('닉네임을 입력하세요.', 'error'); return; }
    if(findNode(partnerTree, id)){ _showToast('이미 존재하는 아이디입니다.', 'error'); return; }

    // 파트너 권한 체크
    var pLevel = parentNode.level || 'admin';
    if(pLevel !== 'admin') {
      var canCreate = await _checkPartnerPerm(pLevel, 'createPartner');
      if(!canCreate) { alert('해당 등급은 파트너 생성 권한이 없습니다.'); return; }
    }

    var rollCasino = document.getElementById('pc-roll-casino').value || '0';
    var rollSlot = document.getElementById('pc-roll-slot').value || '0';
    var rollMini = document.getElementById('pc-roll-mini').value || '0';
    var losing = document.getElementById('pc-losing').value || '0';

    fetch('/api/admin/partner/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: id, nickname: nick, password: pw })
    })
    .then(function(r){ return r.json(); })
    .then(function(res) {
      if (!res.success) { _showToast(res.error || '생성 실패', 'error'); return; }
      var newNode = {
        id: id, label: nick, level: selectedLevel, expanded: false, children: [],
        money: 0, point: 0,
        rollCasino: rollCasino, rollSlot: rollSlot, rollMini: rollMini,
        losingSlot: losing,
        phone: document.getElementById('pc-phone').value.trim(),
        password: pw,
        bank: document.getElementById('pc-bank').value,
        account: document.getElementById('pc-account').value.trim(),
        holder: document.getElementById('pc-owner').value.trim(),
        memo: document.getElementById('pc-memo').value.trim(),
        group: document.getElementById('pc-group').value,
        'emptyBet카지노': parseInt(document.getElementById('pc-empty-casino').value) || 0,
        'emptyBet슬롯': parseInt(document.getElementById('pc-empty-slot').value) || 0,
        'emptyBet미니게임': parseInt(document.getElementById('pc-empty-mini').value) || 0,
        status: '정상',
        registeredAt: new Date().toISOString()
      };
      if(!parentNode.children) parentNode.children = [];
      parentNode.children.push(newNode);
      savePartnerTree();
      overlay.remove();
      if(typeof _ptRenderListPage === 'function') _ptRenderListPage();
      _showToast(nick + ' 파트너 생성 완료', 'success');
    })
    .catch(function(){ alert('서버 오류'); });
  });
}

function openSimpleCreateModal(parentNode, newLevel, btnLabel) {
  var existing = document.getElementById('pt-modal-overlay');
  if(existing) existing.remove();

  var numOpts = function(from, to) {
    var s = '<option value="-">-</option>';
    for(var i=from;i<=to;i++) s += '<option>'+i+'</option>';
    return s;
  };
  var rollingOpts = ['0%','0.5%','1%','1.5%','2%','2.5%','3%','3.5%','4%','4.5%','5%']
    .map(function(v){ return '<option>'+v+'</option>'; }).join('');
  var losingOpts = ['-','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%']
    .map(function(v){ return '<option>'+v+'</option>'; }).join('');
  var bankOpts = ['하나','국민','신한','우리','농협','기업','카카오','케이뱅크','토스','씨티','SC제일']
    .map(function(v){ return '<option>'+v+'</option>'; }).join('');
  var req = '<span style="color:#e05c5c;margin-left:3px;">*</span>';

  var overlay = document.createElement('div');
  overlay.id = 'pt-modal-overlay';
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML = `
    <div class="pt-create-modal">
      <div class="pt-create-modal-header">
        <span>회원 추가</span>
        <button class="pt-modal-close" id="pt-modal-close" style="color:#555;">✕</button>
      </div>
      <div class="pt-create-modal-body">

        <!-- 행1: 접속ID / 시작번호 / 끝번호 -->
        <div class="pt-create-row pt-create-row-3" style="margin-bottom:18px;">
          <div class="pt-create-field">
            <div class="pt-create-label">접속 ID (영문소문자, 숫자 4자 이상)${req}</div>
            <input id="pc-id" type="text" class="pt-create-input" placeholder="접속ID를 입력해 주세요.">
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label">시작번호</div>
            <select id="pc-start" class="pt-create-select">${numOpts(1,99)}</select>
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label">끝 번호</div>
            <select id="pc-end" class="pt-create-select">${numOpts(1,99)}</select>
          </div>
        </div>

        <!-- 행2: 비밀번호 / 비밀번호확인 / 닉네임 / 환전비밀번호 / 환전비밀번호확인 -->
        <div class="pt-create-row" style="margin-bottom:18px;">
          <div class="pt-create-field">
            <div class="pt-create-label">비밀번호${req}</div>
            <input id="pc-pw" type="password" class="pt-create-input" placeholder="비밀번호">
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label">비밀번호확인${req}</div>
            <input id="pc-pw2" type="password" class="pt-create-input" placeholder="비밀번호">
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label">닉네임${req}</div>
            <input id="pc-nick" type="text" class="pt-create-input" placeholder="닉네임">
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label">환전비밀번호${req}</div>
            <input id="pc-wpw" type="password" class="pt-create-input" placeholder="비밀번호(3자 이상)">
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label">환전비밀번호확인${req}</div>
            <input id="pc-wpw2" type="password" class="pt-create-input" placeholder="비밀번호(3자 이상)">
          </div>
        </div>

        <!-- 행3: 롤링/루징 -->
        <div class="pt-create-row pt-create-row-4" style="margin-bottom:18px;">
          <div class="pt-create-field">
            <div class="pt-create-label" style="display:flex;justify-content:space-between;">
              <span>롤링수수료율 (슬롯)</span><span style="color:#aaa;font-size:0.65rem;">최대치0%</span>
            </div>
            <select class="pt-create-select">${rollingOpts}</select>
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label" style="display:flex;justify-content:space-between;">
              <span>루징수수료율 (슬롯)</span><span style="color:#aaa;font-size:0.65rem;">최대치0%</span>
            </div>
            <select class="pt-create-select">${losingOpts}</select>
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label" style="display:flex;justify-content:space-between;">
              <span>롤링수수료율 (카지노)</span><span style="color:#aaa;font-size:0.65rem;">최대치0%</span>
            </div>
            <select class="pt-create-select">${rollingOpts}</select>
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label" style="display:flex;justify-content:space-between;">
              <span>루징수수료율 (카지노)</span><span style="color:#aaa;font-size:0.65rem;">최대치0%</span>
            </div>
            <select class="pt-create-select">${losingOpts}</select>
          </div>
        </div>

        <!-- 행4: 은행 / 계좌번호 / 예금주 -->
        <div class="pt-create-row pt-create-row-3" style="margin-bottom:18px;">
          <div class="pt-create-field">
            <div class="pt-create-label">은행</div>
            <select id="pc-bank" class="pt-create-select">${bankOpts}</select>
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label">계좌번호</div>
            <input id="pc-account" type="text" class="pt-create-input" value="0000">
          </div>
          <div class="pt-create-field">
            <div class="pt-create-label">예금주</div>
            <input id="pc-owner" type="text" class="pt-create-input">
          </div>
        </div>

        <!-- 행5: 카지노 접근 허용 토글 -->
        <div class="pt-create-toggle-box">
          <span class="pt-create-label" style="margin-bottom:0;">카지노 접근 허용</span>
          <label class="pt-toggle-switch">
            <input type="checkbox" id="pc-casino" checked>
            <span class="pt-toggle-slider"></span>
          </label>
        </div>

        <div class="pt-create-footer">
          <button class="pt-create-submit-btn pt-create-submit-teal" id="pt-create-confirm-btn">✓추가하기</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('pt-modal-close').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
  document.getElementById('pt-create-confirm-btn').addEventListener('click', function(){
    var id = document.getElementById('pc-id').value.trim();
    var nick = document.getElementById('pc-nick').value.trim();
    var pw = document.getElementById('pc-pw') ? document.getElementById('pc-pw').value.trim() : '';
    if(!id){ _showToast('접속ID를 입력하세요.', 'error'); return; }
    if(!nick){ _showToast('닉네임을 입력하세요.', 'error'); return; }
    if(!pw){ _showToast('비밀번호를 입력하세요.', 'error'); return; }
    if(pw.length < 3){ _showToast('비밀번호는 3자 이상이어야 합니다.', 'error'); return; }
    if(findNode(partnerTree, id)){ _showToast('이미 존재하는 아이디입니다.', 'error'); return; }

    showLoading('partnerCreate');
    fetch('/api/admin/partner/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: id, nickname: nick, password: pw })
    })
    .then(function(r){ return r.json(); })
    .then(function(res) {
      hideLoading();
      if (!res.success) { _showToast(res.error || '생성 실패', 'error'); return; }
      var newNode = { id: id, label: nick, level: newLevel, expanded: false, children: [] };
      if(!parentNode.children) parentNode.children = [];
      parentNode.children.push(newNode);
      parentNode.expanded = true;
      savePartnerTree();
      overlay.remove();
      renderTree();
      selectedPartnerId = id;
      renderPartnerInfo(id);
      _showToast('✅ ' + nick + ' 생성 완료 (회원+게임사 등록됨)', 'success');
    })
    .catch(function(){ hideLoading(); alert('서버 오류'); });
  });
}

function buildSubTable(node) {
  var children = node.children || [];
  if(children.length === 0) {
    return '<div class="pt-sub-empty">하부 파트너가 없습니다.</div>';
  }
  var rows = children.map(function(child) {
    var c = levelColor[child.level] || '#888';
    var l = (levelLabel[child.level] || child.level).charAt(0);
    var regDate = child.registeredAt || '2026-03-03 00:00:00';
    return '<tr class="pt-sub-row" data-id="'+child.id+'">'
      + '<td style="min-width:80px;">'
      +   '<div class="sub-id-cell" data-id="'+child.id+'" style="color:'+'var(--text,#000)'+';font-weight:600;font-size:0.8rem;cursor:pointer;">'+child.id+'</div>'
      +   '<div class="sub-nick-cell" style="color:'+'var(--text,#000)'+';font-weight:600;font-size:0.8rem;cursor:default;">'+child.label+'</div>'
      + '</td>'
      + '<td><span class="mb-belong-badge" style="background:'+c+';">'+l+'</span></td>'
      + '<td style="font-size:0.72rem;color:var(--text2);">'+(child.group||'-')+'</td>'
      + '<td style="font-size:0.78rem;text-align:right;">'
      +   '<div style="color:#60a5fa;">'+(child.money||0).toLocaleString()+'</div>'
      +   '<div style="color:#888;font-size:0.7rem;">'+(child.rolling||0)+'</div>'
      + '</td>'
      + '<td style="font-size:0.72rem;text-align:right;">'
      +   '<div>'+(child.rollSlot||'0')+'</div>'
      +   '<div>'+(child.rollCasino||'0')+'</div>'
      + '</td>'
      + '<td>'
      +   '<div style="display:flex;flex-direction:column;gap:3px;align-items:center;">'
      +     '<button class="mb-mini-btn mb-mini-yellow sub-give-btn" data-id="'+child.id+'">알지급</button>'
      +     '<button class="mb-mini-btn mb-mini-teal  sub-take-btn" data-id="'+child.id+'">알회수</button>'
      +   '</div>'
      + '</td>'
      + '<td style="font-size:0.72rem;text-align:right;">'
      +   '<div style="color:#4ade80;">'+(child.rollSlot||'0%')+'</div>'
      +   '<div style="color:#4ade80;">'+(child.rollCasino||'0%')+'</div>'
      + '</td>'
      + '<td style="font-size:0.72rem;text-align:right;">'
      +   '<div style="color:#f59e0b;">'+(child.losingSlot||'0%')+'</div>'
      +   '<div style="color:#f59e0b;">'+(child.losingCasino||'0%')+'</div>'
      + '</td>'
      + '<td style="font-size:0.72rem;color:var(--text2);">'+regDate+'</td>'
      + '<td style="font-size:0.72rem;text-align:right;">'
      +   '<div>0</div><div>0</div>'
      + '</td>'
      + '<td style="font-size:0.72rem;text-align:right;">'
      +   '<div style="color:#4ade80;">0</div>'
      +   '<div style="color:#f87171;">0</div>'
      + '</td>'
      + '<td style="font-size:0.72rem;text-align:right;">'
      +   '<div>0</div><div>0</div>'
      + '</td>'
      + '<td>'
      +   '<button class="mb-mini-btn mb-mini-green sub-create-btn" data-id="'+child.id+'">회원생성</button>'
      + '</td>'
      + '<td>'
      +   '<div style="display:flex;flex-direction:column;gap:3px;">'
      +     '<button class="mb-mini-btn mb-mini-blue sub-detail-btn" data-id="'+child.id+'">상세정보</button>'
      +     '<button class="mb-mini-btn mb-mini-yellow sub-info-btn" data-id="'+child.id+'">자세히</button>'
      +   '</div>'
      + '</td>'
      + '</tr>';
  }).join('');

  return '<div style="overflow-x:auto;">'
    + '<table class="db-table" style="font-size:0.78rem;">'
    + '<thead><tr>'
    + '<th>접속ID<br>닉네임</th>'
    + '<th>형태</th>'
    + '<th>그룹</th>'
    + '<th style="text-align:right;">보유머니<br>보유롤링금</th>'
    + '<th style="text-align:right;">롤링금(슬)<br>롤링금(카)</th>'
    + '<th>입출금</th>'
    + '<th style="text-align:right;">롤링%<br>(슬/카)</th>'
    + '<th style="text-align:right;">루징%<br>(슬/카)</th>'
    + '<th>등록일시</th>'
    + '<th style="text-align:right;">본사충전<br>본사환전</th>'
    + '<th style="text-align:right;">알지급(받음)<br>알회수(보냄)</th>'
    + '<th style="text-align:right;">베팅(슬)<br>베팅(카)</th>'
    + '<th>하부관리</th>'
    + '<th>상세정보</th>'
    + '</tr></thead>'
    + '<tbody>'+rows+'</tbody>'
    + '</table></div>';
}

function bindSubTableEvents() {
  // 아이디 클릭 → 정보수정 팝업
  document.querySelectorAll('.sub-id-cell').forEach(function(cell) {
    cell.addEventListener('click', function(e) {
      e.stopPropagation();
      var node = findNode(partnerTree, this.dataset.id);
      if(node) openPartnerModal(node);
    });
  });

  // 행 클릭 → 파트너 정보 이동 (버튼/아이디셀 클릭 시 제외)
  document.querySelectorAll('.pt-sub-row').forEach(function(row) {
    row.addEventListener('click', function(e) {
      if(e.target.tagName === 'BUTTON') return;
      if(e.target.classList.contains('sub-id-cell')) return;
      if(e.target.closest && e.target.closest('.sub-id-cell')) return;
      if(e.target.classList.contains('sub-nick-cell')) return;
      selectedPartnerId = this.dataset.id;
      renderTree();
      renderPartnerInfo(selectedPartnerId);
    });
  });

  // 상세정보 버튼
  document.querySelectorAll('.sub-detail-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectedPartnerId = this.dataset.id;
      renderTree();
      renderPartnerInfo(selectedPartnerId);
    });
  });

  // 자세히 버튼
  document.querySelectorAll('.sub-info-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var node = findNode(partnerTree, this.dataset.id);
      if(node) openPartnerModal(node);
    });
  });

  // 회원생성 버튼
  document.querySelectorAll('.sub-create-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var node = findNode(partnerTree, this.dataset.id);
      if(node) openSimpleCreateModal(node);
    });
  });

  // 알지급 버튼
  document.querySelectorAll('.sub-give-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var node = findNode(partnerTree, this.dataset.id);
      var name = node ? node.label : this.dataset.id;
      var parentNode = selectedPartnerId ? findNode(partnerTree, selectedPartnerId) : null;
      var processorId = parentNode ? parentNode.label : selectedPartnerId || '파트너';
      var val = prompt(name + ' — 지급할 금액을 입력하세요:');
      if(!val || isNaN(val) || parseInt(val) <= 0) return;
      var amount = parseInt(val);
      var before = node ? (node.money || 0) : 0;
      var after  = before + amount;
      if(node) node.money = after;
      savePartnerTree();
      var logEntry = {
        datetime:   nowStr(),
        type:       'give',
        processor:  processorId,
        processorLevel: parentNode ? parentNode.level : '',
        targetId:   node ? node.id    : this.dataset.id,
        targetNick: node ? node.label : this.dataset.id,
        targetLevel: node ? node.level : '',
        amount:     amount,
        before:     before,
        after:      after,
        memo:       ''
      };
      if(typeof addPartnerMoneyLog === 'function') { addPartnerMoneyLog(logEntry); }
      if(node && node.level === 'member' && typeof addUserMoneyLog === 'function') { addUserMoneyLog(logEntry); }
      _showToast('✅ ' + name + ' 에게 ' + amount.toLocaleString() + '원 지급 완료', 'success');
    });
  });

  // 알회수 버튼
  document.querySelectorAll('.sub-take-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var node = findNode(partnerTree, this.dataset.id);
      var name = node ? node.label : this.dataset.id;
      var parentNode = selectedPartnerId ? findNode(partnerTree, selectedPartnerId) : null;
      var processorId = parentNode ? parentNode.label : selectedPartnerId || '파트너';
      var val = prompt(name + ' — 회수할 금액을 입력하세요:');
      if(!val || isNaN(val) || parseInt(val) <= 0) return;
      var amount = parseInt(val);
      var before = node ? (node.money || 0) : 0;
      var after  = Math.max(0, before - amount);
      if(node) node.money = after;
      savePartnerTree();
      var logEntry = {
        datetime:   nowStr(),
        type:       'take',
        processor:  processorId,
        processorLevel: parentNode ? parentNode.level : '',
        targetId:   node ? node.id    : this.dataset.id,
        targetNick: node ? node.label : this.dataset.id,
        targetLevel: node ? node.level : '',
        amount:     amount,
        before:     before,
        after:      after,
        memo:       ''
      };
      if(typeof addPartnerMoneyLog === 'function') { addPartnerMoneyLog(logEntry); }
      if(node && node.level === 'member' && typeof addUserMoneyLog === 'function') { addUserMoneyLog(logEntry); }
      _showToast('📤 ' + name + ' 에서 ' + amount.toLocaleString() + '원 회수 완료', 'warn');
    });
  });
}

function findNode(nodes, id) {
  for(var i=0;i<nodes.length;i++) {
    if(nodes[i].id === id) return nodes[i];
    if(nodes[i].children) {
      var found = findNode(nodes[i].children, id);
      if(found) return found;
    }
  }
  return null;
}

// ── 버튼 이벤트 ──
function bindPartnerEvents() {
  var expandBtn = document.getElementById('pt-expand-all');
  var collapseBtn = document.getElementById('pt-collapse-all');
  if(expandBtn)   expandBtn.addEventListener('click', function(){ setAllExpanded(partnerTree, true);  renderTree(); });
  if(collapseBtn) collapseBtn.addEventListener('click', function(){ setAllExpanded(partnerTree, false); renderTree(); });

  document.querySelectorAll('.pt-sort-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.pt-sort-btn').forEach(function(b){ b.classList.remove('active'); });
      this.classList.add('active');
    });
  });

  // ── 날짜 검색 버튼 ──
  var searchBtn = document.querySelector('.pt-right-top .pt-btn-purple');
  if(searchBtn) {
    searchBtn.addEventListener('click', function() {
      if(!selectedPartnerId) { alert('파트너를 먼저 선택하세요.'); return; }
      var node = findNode(partnerTree, selectedPartnerId);
      if(node) loadPartnerBettingData(node);
    });
  }

  // ── 롤링 & 루징 변경 버튼 ──
  var infoGrid = document.getElementById('pt-info-grid');
  if(infoGrid) {
    infoGrid.addEventListener('click', function(e) {
      if(!e.target.classList.contains('pt-btn-purple')) return;
      var row = e.target.closest('.pt-info-field');
      if(!row) return;
      var input = row.querySelector('.pt-input');
      if(!input) return;
      var label = (row.querySelector('label') || {}).textContent || '';
      var val   = input.value.trim();
      if(val === '') { alert('값을 입력해주세요.'); return; }

      if(selectedPartnerId) {
        var node = findNode(partnerTree, selectedPartnerId);
        if(node) {
          var updateData = {};
          if(label.includes('롤링') && label.includes('슬롯'))   { node.rollSlot    = val; updateData.rollSlot    = val; }
          if(label.includes('롤링') && label.includes('카지노')) { node.rollCasino  = val; updateData.rollCasino  = val; }
          if(label.includes('루징') && label.includes('슬롯'))   { node.losingSlot  = val; updateData.losingSlot  = val; }
          if(label.includes('루징') && label.includes('카지노')) { node.losingCasino = val; updateData.losingCasino = val; }
          if(label.includes('전화'))                              { node.phone       = val; updateData.phone       = val; }
          savePartnerTree();

          // 서버 users.json에도 반영
          fetch('/api/admin/users/' + encodeURIComponent(selectedPartnerId) + '/update', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify(updateData)
          }).catch(function(){});
        }
      }
      _showToast('"' + label + '" 값이 ' + val + '(으)로 변경되었습니다.', 'success');
    });
  }
}

function findNode(nodes, id) {
  for(var i=0; i<nodes.length; i++) {
    if(nodes[i].id === id) return nodes[i];
    if(nodes[i].children) {
      var found = findNode(nodes[i].children, id);
      if(found) return found;
    }
  }
  return null;
}
