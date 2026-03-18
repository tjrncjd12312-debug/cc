// ══════════════════════════════════════
//  파트너 페이지 메인 JS
// ══════════════════════════════════════

// ── 인증 헤더 자동 포함 fetch ──
(function() {
  var _origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.indexOf('/api/partner') !== -1 && url.indexOf('/api/partner/login') === -1 && url.indexOf('/api/partner/check-session') === -1) {
      var tk = sessionStorage.getItem('partnerToken') || '';
      if (!tk) return Promise.resolve(new Response(JSON.stringify({data:[]}), {status:200, headers:{'Content-Type':'application/json'}}));
      opts = opts || {};
      opts.headers = opts.headers || {};
      if (!opts.headers['Authorization']) opts.headers['Authorization'] = 'Bearer ' + tk;
    }
    return _origFetch.call(window, url, opts);
  };
})();

// ── 로딩 스피너 ──
function showLoading() {
  var existing = document.getElementById('partner-loading-overlay');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'partner-loading-overlay';
  ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.35);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
  ov.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;">'
    + '<div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.15);border-top:3px solid #10b981;border-radius:50%;animation:pSpin 0.7s linear infinite;"></div>'
    + '<div style="color:#fff;font-size:0.82rem;">로딩 중...</div></div>';
  document.body.appendChild(ov);
}
function hideLoading() {
  var ov = document.getElementById('partner-loading-overlay');
  if (ov) ov.remove();
}
(function() {
  var s = document.createElement('style');
  s.textContent = '@keyframes pSpin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }';
  document.head.appendChild(s);
})();

// ── 커스텀 alert/confirm ──
function customAlert(msg) {
  return new Promise(function(resolve) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);opacity:0;transition:opacity 0.2s;';
    ov.innerHTML = '<div style="background:var(--bg,#0f172a);border:1px solid var(--border,#1e293b);border-radius:14px;width:380px;max-width:92vw;box-shadow:0 20px 60px var(--shadow);animation:cfmPop 0.25s ease;">'
      + '<style>@keyframes cfmPop{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}</style>'
      + '<div style="padding:28px 24px 16px;text-align:center;"><div style="font-size:0.95rem;font-weight:600;color:var(--text,#e2e8f0);line-height:1.5;white-space:pre-line;">' + msg + '</div></div>'
      + '<div style="padding:8px 24px 22px;"><button id="calert-ok" style="width:100%;padding:10px 0;border-radius:8px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;">확인</button></div></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.style.opacity = '1'; });
    function close() { ov.style.opacity='0'; setTimeout(function(){ ov.remove(); }, 200); resolve(); }
    ov.querySelector('#calert-ok').addEventListener('click', close);
  });
}
function customConfirm(msg) {
  return new Promise(function(resolve) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);opacity:0;transition:opacity 0.2s;';
    ov.innerHTML = '<div style="background:var(--bg,#0f172a);border:1px solid var(--border,#1e293b);border-radius:14px;width:380px;max-width:92vw;box-shadow:0 20px 60px var(--shadow);animation:cfmPop 0.25s ease;">'
      + '<div style="padding:28px 24px 16px;text-align:center;"><div style="font-size:0.95rem;font-weight:600;color:var(--text,#e2e8f0);line-height:1.5;white-space:pre-line;">' + msg + '</div></div>'
      + '<div style="padding:12px 24px 22px;display:flex;gap:10px;">'
      + '<button id="cfm-cancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--border,#334155);background:var(--bg2,#1e293b);color:var(--text2,#94a3b8);font-size:0.85rem;font-weight:600;cursor:pointer;">취소</button>'
      + '<button id="cfm-ok" style="flex:1;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;">확인</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.style.opacity = '1'; });
    function close(val) { ov.style.opacity='0'; setTimeout(function(){ ov.remove(); }, 200); resolve(val); }
    ov.querySelector('#cfm-ok').addEventListener('click', function() { close(true); });
    ov.querySelector('#cfm-cancel').addEventListener('click', function() { close(false); });
  });
}

// ══════════════════════════════════════
//  인증 시스템
// ══════════════════════════════════════
var _partnerToken = sessionStorage.getItem('partnerToken') || '';
var _partnerInfo = null;

var _levelNames = { head: '본사', subhead: '부본사', distributor: '총판', store: '매장' };

function _showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.querySelector('.sidebar').style.display = 'none';
  document.querySelector('.main-wrap').style.display = 'none';
}
function _showPartnerUI() {
  document.getElementById('login-screen').style.display = 'none';
  document.querySelector('.sidebar').style.display = '';
  document.querySelector('.main-wrap').style.display = '';
}

// 세션 체크
(function() {
  if (!_partnerToken) { _showLoginScreen(); return; }
  fetch('/api/partner/check-session', { headers: { 'Authorization': 'Bearer ' + _partnerToken } })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.success) {
      _showPartnerUI();
      fetchPartnerInfo();
    } else {
      _partnerToken = ''; sessionStorage.removeItem('partnerToken'); _showLoginScreen();
    }
  })
  .catch(function() { _showLoginScreen(); });
})();

// 로그인
document.getElementById('login-btn').addEventListener('click', _doLogin);
document.getElementById('login-pw').addEventListener('keydown', function(e) { if (e.key === 'Enter') _doLogin(); });
document.getElementById('login-id').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('login-pw').focus(); });

function _doLogin() {
  var id = document.getElementById('login-id').value.trim();
  var pw = document.getElementById('login-pw').value;
  var errEl = document.getElementById('login-error');
  if (!id || !pw) { errEl.textContent = '아이디와 비밀번호를 입력하세요.'; errEl.style.display = 'block'; return; }

  document.getElementById('login-btn').disabled = true;
  document.getElementById('login-btn').textContent = '로그인 중...';

  fetch('/api/partner/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: id, password: pw })
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.success && res.token) {
      _partnerToken = res.token;
      sessionStorage.setItem('partnerToken', res.token);
      errEl.style.display = 'none';
      _showPartnerUI();
      fetchPartnerInfo();
      renderPage('dashboard');
    } else {
      errEl.textContent = res.error || '로그인 실패';
      errEl.style.display = 'block';
    }
  })
  .catch(function() { errEl.textContent = '서버 연결 오류'; errEl.style.display = 'block'; })
  .finally(function() {
    document.getElementById('login-btn').disabled = false;
    document.getElementById('login-btn').textContent = '로그인';
  });
}

// ── 내 정보 조회 ──
function fetchPartnerInfo() {
  fetch('/api/partner/me')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (!res.success) return;
      _partnerInfo = res.data;
      var el;
      el = document.getElementById('partner-id-display'); if(el) el.textContent = res.data.id;
      el = document.getElementById('partner-level-display'); if(el) el.textContent = _levelNames[res.data.level] || res.data.level;
      el = document.getElementById('partner-money-display'); if(el) el.textContent = Math.floor(res.data.money || 0).toLocaleString() + ' 원';
      el = document.getElementById('partner-rolling-display'); if(el) el.textContent = Math.floor((res.data.point || 0) + (res.data.rollingPoint || 0)).toLocaleString() + ' P';
      el = document.getElementById('topbar-partner-name'); if(el) el.textContent = (_levelNames[res.data.level] || '') + ' ' + res.data.id;
    })
    .catch(function(){});
}

document.getElementById('partner-info-refresh').addEventListener('click', function() { fetchPartnerInfo(); });

// ══════════════════════════════════════
//  페이지 라우팅
// ══════════════════════════════════════
var pageTitles = {
  'dashboard':        '대시보드',
  'partner-tree':     '회원관리 > 하위 파트너',
  'member-list':      '회원관리 > 회원 목록',
  'betting-all':      '베팅 내역 > 전체 베팅 내역',
  'money-give':       '머니 관리 > 머니 지급/차감',
  'money-log':        '머니 관리 > 머니 내역',
  'transfer-list':    '충환전 내역',
  'settlement-daily': '정산 > 일자별 정산',
  'notice-list':      '공지사항',
  'settings-password':'설정 > 비밀번호 변경'
};

function syncSidebar(page) {
  document.querySelectorAll('.sub-item.active').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-single').forEach(function(el) { el.classList.remove('active'); });
  if(page === 'dashboard') {
    document.querySelector('.nav-single[data-page="dashboard"]').classList.add('active');
    document.querySelectorAll('.nav-group.open').forEach(function(g) { g.classList.remove('open'); });
    return;
  }
  var target = document.querySelector('.sub-item[data-page="' + page + '"]');
  if(target) {
    var group = target.closest('.nav-group');
    document.querySelectorAll('.nav-group.open').forEach(function(g) { g.classList.remove('open'); });
    if(group) group.classList.add('open');
    target.classList.add('active');
  }
}

function renderPage(page) {
  showLoading();
  setTimeout(hideLoading, 500);
  syncSidebar(page);
  document.getElementById('page-title').textContent = pageTitles[page] || page;

  if (page === 'dashboard') renderDashboard();
  else if (page === 'partner-tree') renderPartnerTree();
  else if (page === 'member-list') renderMemberList();
  else if (page === 'betting-all') renderBettingPage();
  else if (page === 'money-give') renderMoneyGive();
  else if (page === 'money-log') renderMoneyLog();
  else if (page === 'transfer-list') renderTransferList();
  else if (page === 'settlement-daily') renderSettlement();
  else if (page === 'notice-list') renderNoticeList();
  else if (page === 'settings-password') renderPasswordChange();
  else {
    document.getElementById('content').innerHTML = '<div class="placeholder"><i class="fas fa-handshake placeholder-icon" style="color:#10b981;"></i><p>준비 중입니다</p></div>';
  }
}

// ── 네비게이션 이벤트 ──
document.querySelector('.nav-single[data-page="dashboard"]').addEventListener('click', function() { location.hash = 'dashboard'; });
document.querySelectorAll('.nav-item[data-group]').forEach(function(el) {
  el.addEventListener('click', function() {
    var group = this.closest('.nav-group');
    var isOpen = group.classList.contains('open');
    document.querySelectorAll('.nav-group.open').forEach(function(g) { g.classList.remove('open'); });
    if(!isOpen) group.classList.add('open');
  });
});
document.querySelectorAll('.sub-item').forEach(function(el) {
  el.addEventListener('click', function() { location.hash = this.dataset.page; });
});
window.addEventListener('hashchange', function() {
  var page = location.hash.replace('#', '') || 'dashboard';
  renderPage(page);
});

// 로그아웃
document.getElementById('logout-btn').addEventListener('click', async function() {
  if(!(await customConfirm('로그아웃 하시겠습니까?'))) return;
  fetch('/api/partner/logout', { method: 'POST' }).catch(function(){});
  _partnerToken = '';
  sessionStorage.removeItem('partnerToken');
  _showLoginScreen();
  document.getElementById('login-id').value = '';
  document.getElementById('login-pw').value = '';
});

// 시계
function updateTime() {
  var now = new Date();
  var el = document.getElementById('topbar-time');
  if(el) el.textContent = now.getFullYear() + '.' + String(now.getMonth()+1).padStart(2,'0') + '.' + String(now.getDate()).padStart(2,'0') + '  ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
}
updateTime(); setInterval(updateTime, 1000);

// 테마
(function() {
  var saved = localStorage.getItem('partner-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  var icon = document.getElementById('theme-icon');
  var label = document.getElementById('theme-label');
  if(saved === 'light') { if(icon) icon.className = 'fas fa-sun'; if(label) label.textContent = '라이트'; }
  document.getElementById('theme-toggle').addEventListener('click', function() {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('partner-theme', next);
    if(icon) icon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    if(label) label.textContent = next === 'dark' ? '다크' : '라이트';
  });
})();

// 초기 진입
(function() {
  var page = location.hash.replace('#', '') || 'dashboard';
  renderPage(page);
  if(!location.hash) location.replace('#dashboard');
})();

// ══════════════════════════════════════
//  대시보드
// ══════════════════════════════════════
function renderDashboard() {
  var content = document.getElementById('content');
  content.innerHTML = '<div style="display:flex;flex-direction:column;gap:16px;">'
    + '<div style="display:flex;gap:12px;flex-wrap:wrap;" id="dash-cards"></div>'
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;" id="dash-recent">'
    + '<div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:12px;">최근 베팅 내역</div>'
    + '<div id="dash-recent-body" style="color:var(--text3);font-size:0.82rem;">로딩중...</div>'
    + '</div></div>';

  // 내 정보 카드
  Promise.all([
    fetch('/api/partner/me').then(function(r){ return r.json(); }),
    fetch('/api/partner/users').then(function(r){ return r.json(); }),
    fetch('/api/partner/transfers').then(function(r){ return r.json(); }),
    fetch('/api/partner/settlement?start=' + _dfLocalDate(new Date()) + '&end=' + _dfLocalDate(new Date())).then(function(r){ return r.json(); })
  ]).then(function(results) {
    var me = results[0].data || {};
    var users = results[1].data || [];
    var transfers = results[2].data || [];
    var settlement = results[3].data || [];

    var todayStr = _dfLocalDate(new Date());
    var todayDep = transfers.filter(function(t){ return t.type==='deposit' && t.status==='approved' && (t.datetime||'').startsWith(todayStr); });
    var todayWit = transfers.filter(function(t){ return t.type==='withdraw' && t.status==='approved' && (t.datetime||'').startsWith(todayStr); });
    var depTotal = todayDep.reduce(function(s,t){ return s+(t.amount||0); }, 0);
    var witTotal = todayWit.reduce(function(s,t){ return s+(t.amount||0); }, 0);

    var todaySett = settlement[0] || { bet: 0, win: 0, count: 0 };
    var profit = todaySett.bet - todaySett.win;

    var cards = document.getElementById('dash-cards');
    if(cards) cards.innerHTML = ''
      + _dashCard('fa-wallet', '#60a5fa', '보유 머니', '₩' + Math.floor(me.money||0).toLocaleString())
      + _dashCard('fa-rotate', '#f59e0b', '보유 롤링', Math.floor((me.point||0)+(me.rollingPoint||0)).toLocaleString() + ' P')
      + _dashCard('fa-users', '#a78bfa', '하위 회원', users.length + '명')
      + _dashCard('fa-arrow-up', '#4ade80', '오늘 입금', '₩' + depTotal.toLocaleString())
      + _dashCard('fa-arrow-down', '#ef4444', '오늘 출금', '₩' + witTotal.toLocaleString())
      + _dashCard('fa-dice', '#f59e0b', '오늘 베팅', '₩' + Math.floor(todaySett.bet).toLocaleString())
      + _dashCard('fa-trophy', profit >= 0 ? '#4ade80' : '#ef4444', '오늘 손익', (profit>=0?'+':'') + '₩' + Math.floor(profit).toLocaleString());
  }).catch(function(){});

  // 최근 베팅
  fetch('/api/partner/betting?perPage=10')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var data = res.data || [];
      var el = document.getElementById('dash-recent-body');
      if(!el) return;
      if(data.length === 0) { el.textContent = '베팅 내역이 없습니다.'; return; }
      el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        + '<thead><tr style="border-bottom:1px solid var(--border);"><th style="text-align:left;padding:8px;color:var(--text2);">시간</th><th style="text-align:left;padding:8px;color:var(--text2);">유저</th><th style="text-align:left;padding:8px;color:var(--text2);">타입</th><th style="text-align:right;padding:8px;color:var(--text2);">금액</th></tr></thead>'
        + '<tbody>' + data.map(function(t) {
          var uname = (t.user && t.user.username) || t.username || '-';
          var dt = (t.processed_at || t.created_at || '').replace('T',' ').substring(0,19);
          var color = t.type === 'bet' ? '#f59e0b' : '#4ade80';
          return '<tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;color:var(--text3);">' + dt + '</td><td style="padding:8px;color:var(--text);">' + uname + '</td><td style="padding:8px;color:' + color + ';">' + (t.type||'-') + '</td><td style="text-align:right;padding:8px;color:var(--text);">' + Math.abs(t.amount||0).toLocaleString() + '</td></tr>';
        }).join('') + '</tbody></table>';
    }).catch(function(){});
}

function _dashCard(icon, color, label, value) {
  return '<div style="flex:1;min-width:160px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 20px;display:flex;align-items:center;gap:14px;">'
    + '<div style="width:42px;height:42px;border-radius:10px;background:' + color + '18;display:flex;align-items:center;justify-content:center;"><i class="fas ' + icon + '" style="font-size:1rem;color:' + color + ';"></i></div>'
    + '<div><div style="font-size:0.7rem;color:var(--text3);margin-bottom:4px;">' + label + '</div><div style="font-size:1.05rem;font-weight:700;color:var(--text);">' + value + '</div></div></div>';
}

// ══════════════════════════════════════
//  하위 파트너 트리
// ══════════════════════════════════════
function renderPartnerTree() {
  var content = document.getElementById('content');
  content.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;">'
    + '<div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:12px;">하위 파트너 트리</div>'
    + '<div id="tree-body" style="color:var(--text3);font-size:0.82rem;">로딩중...</div></div>';

  fetch('/api/partner/tree')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var tree = res.data || [];
      var el = document.getElementById('tree-body');
      if(!el) return;
      if(tree.length === 0) { el.textContent = '데이터가 없습니다.'; return; }
      el.innerHTML = _renderTreeNodes(tree, 0);
    }).catch(function(){ var el = document.getElementById('tree-body'); if(el) el.textContent = '로드 실패'; });
}

function _renderTreeNodes(nodes, depth) {
  return (nodes || []).map(function(n) {
    var indent = depth * 24;
    var levelColor = n.level === 'head' ? '#ef4444' : n.level === 'subhead' ? '#f59e0b' : n.level === 'distributor' ? '#3b82f6' : n.level === 'store' ? '#10b981' : '#6b7280';
    var levelName = _levelNames[n.level] || n.level;
    var money = Math.floor(n.money || 0).toLocaleString();
    var html = '<div style="padding:8px 12px;margin-left:' + indent + 'px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">'
      + '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + levelColor + ';"></span>'
      + '<span style="font-size:0.75rem;color:' + levelColor + ';font-weight:600;min-width:40px;">' + levelName + '</span>'
      + '<span style="font-size:0.85rem;color:var(--text);font-weight:600;">' + (n.label || n.id) + '</span>'
      + '<span style="font-size:0.78rem;color:var(--blue);margin-left:auto;">₩' + money + '</span>'
      + '</div>';
    if (n.children && n.children.length > 0) {
      html += _renderTreeNodes(n.children, depth + 1);
    }
    return html;
  }).join('');
}

// ══════════════════════════════════════
//  회원 목록
// ══════════════════════════════════════
function renderMemberList() {
  var content = document.getElementById('content');
  content.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;">'
    + '<div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:12px;">하위 회원 목록</div>'
    + '<div id="member-body" style="color:var(--text3);font-size:0.82rem;">로딩중...</div></div>';

  Promise.all([
    fetch('/api/partner/users').then(function(r){ return r.json(); }),
    fetch('/api/partner/users/stats').then(function(r){ return r.json(); })
  ]).then(function(results) {
    var users = results[0].data || [];
    var stats = results[1].data || {};
    var el = document.getElementById('member-body');
    if(!el) return;
    if(users.length === 0) { el.textContent = '회원이 없습니다.'; return; }

    el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
      + '<thead><tr style="background:var(--table-th-bg);border-bottom:1px solid var(--border);">'
      + '<th style="text-align:left;padding:10px;">아이디</th>'
      + '<th style="text-align:left;padding:10px;">닉네임</th>'
      + '<th style="text-align:right;padding:10px;">보유머니</th>'
      + '<th style="text-align:right;padding:10px;">베팅</th>'
      + '<th style="text-align:right;padding:10px;">당첨</th>'
      + '<th style="text-align:center;padding:10px;">상태</th>'
      + '</tr></thead><tbody>' + users.map(function(u) {
        var s = stats[u.username] || { bet: 0, win: 0 };
        var statusColor = u.status === 'active' ? '#4ade80' : u.status === 'blocked' ? '#ef4444' : '#f59e0b';
        var statusText = u.status === 'active' ? '정상' : u.status === 'blocked' ? '차단' : u.status === 'pending' ? '대기' : u.status;
        return '<tr style="border-bottom:1px solid var(--border);">'
          + '<td style="padding:10px;color:var(--text);">' + u.username + '</td>'
          + '<td style="padding:10px;color:var(--text2);">' + (u.nickname||'-') + '</td>'
          + '<td style="text-align:right;padding:10px;color:var(--blue);font-weight:600;">₩' + (u.money||0).toLocaleString() + '</td>'
          + '<td style="text-align:right;padding:10px;color:#f59e0b;">₩' + Math.floor(s.bet).toLocaleString() + '</td>'
          + '<td style="text-align:right;padding:10px;color:#4ade80;">₩' + Math.floor(s.win).toLocaleString() + '</td>'
          + '<td style="text-align:center;padding:10px;"><span style="color:' + statusColor + ';font-weight:600;">' + statusText + '</span></td>'
          + '</tr>';
      }).join('') + '</tbody></table>';
  }).catch(function(){ var el = document.getElementById('member-body'); if(el) el.textContent = '로드 실패'; });
}

// ══════════════════════════════════════
//  베팅 내역
// ══════════════════════════════════════
function renderBettingPage() {
  var today = _dfLocalDate(new Date());
  var content = document.getElementById('content');
  content.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">'
    + '<input type="date" id="bet-from" value="' + today + '" style="padding:6px 10px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text);font-size:0.82rem;">'
    + '<span style="color:var(--text3);">~</span>'
    + '<input type="date" id="bet-to" value="' + today + '" style="padding:6px 10px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text);font-size:0.82rem;">'
    + '<button id="bet-search" style="padding:6px 16px;background:#10b981;color:#fff;border:none;border-radius:6px;font-size:0.82rem;font-weight:600;cursor:pointer;">조회</button>'
    + '</div>'
    + '<div id="bet-body" style="color:var(--text3);font-size:0.82rem;">로딩중...</div></div>';

  document.getElementById('bet-search').addEventListener('click', _loadBetting);
  _loadBetting();
}

function _loadBetting() {
  var from = document.getElementById('bet-from').value;
  var to = document.getElementById('bet-to').value;
  fetch('/api/partner/betting?start=' + from + '&end=' + to + '&perPage=100')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var data = res.data || [];
      var el = document.getElementById('bet-body');
      if(!el) return;
      if(data.length === 0) { el.textContent = '베팅 내역이 없습니다.'; return; }
      el.innerHTML = '<div style="margin-bottom:8px;font-size:0.75rem;color:var(--text3);">총 ' + (res.total||data.length) + '건</div>'
        + '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        + '<thead><tr style="background:var(--table-th-bg);border-bottom:1px solid var(--border);">'
        + '<th style="text-align:left;padding:8px;">시간</th><th style="text-align:left;padding:8px;">유저</th><th style="text-align:left;padding:8px;">타입</th><th style="text-align:left;padding:8px;">게임</th><th style="text-align:right;padding:8px;">금액</th></tr></thead>'
        + '<tbody>' + data.map(function(t) {
          var uname = (t.user && t.user.username) || t.username || '-';
          var dt = (t.processed_at || t.created_at || '').replace('T',' ').substring(0,19);
          var game = (t.details && t.details.game && t.details.game.vendor) || t.vendor || '-';
          var color = t.type === 'bet' ? '#f59e0b' : '#4ade80';
          return '<tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;color:var(--text3);">' + dt + '</td><td style="padding:8px;color:var(--text);">' + uname + '</td><td style="padding:8px;color:' + color + ';">' + (t.type||'-') + '</td><td style="padding:8px;color:var(--text2);">' + game + '</td><td style="text-align:right;padding:8px;color:var(--text);font-weight:600;">₩' + Math.abs(t.amount||0).toLocaleString() + '</td></tr>';
        }).join('') + '</tbody></table>';
    }).catch(function(){ var el = document.getElementById('bet-body'); if(el) el.textContent = '로드 실패'; });
}

// ══════════════════════════════════════
//  머니 지급/차감
// ══════════════════════════════════════
function renderMoneyGive() {
  var content = document.getElementById('content');
  content.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;">'
    + '<div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:16px;">머니 지급/차감</div>'
    + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;">'
    + '<select id="mg-user" style="padding:8px 12px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text);font-size:0.85rem;min-width:150px;"><option value="">회원 선택</option></select>'
    + '<input type="number" id="mg-amount" placeholder="금액" style="padding:8px 12px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text);font-size:0.85rem;width:160px;">'
    + '<input type="text" id="mg-memo" placeholder="메모 (선택)" style="padding:8px 12px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text);font-size:0.85rem;width:200px;">'
    + '<button id="mg-give-btn" style="padding:8px 20px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;">지급</button>'
    + '<button id="mg-take-btn" style="padding:8px 20px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;">차감</button>'
    + '</div>'
    + '<div id="mg-result" style="font-size:0.82rem;color:var(--text3);"></div></div>';

  // 유저 목록 로드
  fetch('/api/partner/users').then(function(r){ return r.json(); }).then(function(res) {
    var select = document.getElementById('mg-user');
    (res.data || []).forEach(function(u) {
      var opt = document.createElement('option');
      opt.value = u.username;
      opt.textContent = u.username + ' (' + (u.nickname||'-') + ') - ₩' + (u.money||0).toLocaleString();
      select.appendChild(opt);
    });
  });

  document.getElementById('mg-give-btn').addEventListener('click', function() { _doMoneyAction('give'); });
  document.getElementById('mg-take-btn').addEventListener('click', function() { _doMoneyAction('take'); });
}

async function _doMoneyAction(action) {
  var username = document.getElementById('mg-user').value;
  var amount = Number(document.getElementById('mg-amount').value);
  var memo = document.getElementById('mg-memo').value;
  if (!username) return customAlert('회원을 선택하세요.');
  if (!amount || amount <= 0) return customAlert('올바른 금액을 입력하세요.');

  var label = action === 'give' ? '지급' : '차감';
  if (!(await customConfirm(username + '에게 ₩' + amount.toLocaleString() + ' ' + label + '하시겠습니까?'))) return;

  showLoading();
  fetch('/api/partner/users/' + encodeURIComponent(username) + '/' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amount, memo: memo })
  })
  .then(function(r){ return r.json(); })
  .then(function(res) {
    hideLoading();
    if (res.success) {
      customAlert(label + ' 완료!\n내 머니: ₩' + (res.partnerMoney||0).toLocaleString() + '\n유저 머니: ₩' + (res.userMoney||0).toLocaleString());
      fetchPartnerInfo();
      renderMoneyGive(); // 새로고침
    } else {
      customAlert(res.error || label + ' 실패');
    }
  })
  .catch(function() { hideLoading(); customAlert('서버 오류'); });
}

// ══════════════════════════════════════
//  머니 내역
// ══════════════════════════════════════
function renderMoneyLog() {
  var content = document.getElementById('content');
  content.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;">'
    + '<div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:12px;">머니 지급/차감 내역</div>'
    + '<div id="mlog-body" style="color:var(--text3);font-size:0.82rem;">로딩중...</div></div>';

  fetch('/api/partner/money-logs')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var logs = res.data || [];
      var el = document.getElementById('mlog-body');
      if(!el) return;
      if(logs.length === 0) { el.textContent = '내역이 없습니다.'; return; }
      el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        + '<thead><tr style="background:var(--table-th-bg);border-bottom:1px solid var(--border);">'
        + '<th style="text-align:left;padding:8px;">시간</th><th style="text-align:left;padding:8px;">대상</th><th style="text-align:center;padding:8px;">구분</th><th style="text-align:right;padding:8px;">금액</th><th style="text-align:left;padding:8px;">메모</th></tr></thead>'
        + '<tbody>' + logs.map(function(l) {
          var dt = (l.datetime || '').replace('T', ' ').substring(0, 19);
          var typeColor = l.type === 'give' ? '#3b82f6' : '#ef4444';
          var typeText = l.type === 'give' ? '지급' : '차감';
          return '<tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;color:var(--text3);">' + dt + '</td><td style="padding:8px;color:var(--text);">' + (l.to||'-') + '</td><td style="text-align:center;padding:8px;color:' + typeColor + ';font-weight:600;">' + typeText + '</td><td style="text-align:right;padding:8px;color:var(--text);font-weight:600;">₩' + (l.amount||0).toLocaleString() + '</td><td style="padding:8px;color:var(--text3);">' + (l.memo||'-') + '</td></tr>';
        }).join('') + '</tbody></table>';
    }).catch(function(){ var el = document.getElementById('mlog-body'); if(el) el.textContent = '로드 실패'; });
}

// ══════════════════════════════════════
//  충환전 내역
// ══════════════════════════════════════
function renderTransferList() {
  var content = document.getElementById('content');
  content.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;">'
    + '<div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:12px;">하위 회원 충환전 내역</div>'
    + '<div id="transfer-body" style="color:var(--text3);font-size:0.82rem;">로딩중...</div></div>';

  fetch('/api/partner/transfers')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var list = res.data || [];
      var el = document.getElementById('transfer-body');
      if(!el) return;
      if(list.length === 0) { el.textContent = '내역이 없습니다.'; return; }
      el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        + '<thead><tr style="background:var(--table-th-bg);border-bottom:1px solid var(--border);">'
        + '<th style="text-align:left;padding:8px;">시간</th><th style="text-align:left;padding:8px;">회원</th><th style="text-align:center;padding:8px;">구분</th><th style="text-align:right;padding:8px;">금액</th><th style="text-align:center;padding:8px;">상태</th></tr></thead>'
        + '<tbody>' + list.slice(0, 100).map(function(t) {
          var dt = (t.datetime || t.processedAt || '').replace('T',' ').substring(0,19);
          var typeColor = t.type === 'deposit' ? '#4ade80' : '#ef4444';
          var typeText = t.type === 'deposit' ? '충전' : '환전';
          var statusColor = t.status === 'approved' ? '#4ade80' : t.status === 'rejected' ? '#ef4444' : '#f59e0b';
          var statusText = t.status === 'approved' ? '승인' : t.status === 'rejected' ? '거절' : '대기';
          return '<tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;color:var(--text3);">' + dt + '</td><td style="padding:8px;color:var(--text);">' + (t.userId||t.nick||'-') + '</td><td style="text-align:center;padding:8px;color:' + typeColor + ';font-weight:600;">' + typeText + '</td><td style="text-align:right;padding:8px;color:var(--text);font-weight:600;">₩' + (t.amount||0).toLocaleString() + '</td><td style="text-align:center;padding:8px;color:' + statusColor + ';font-weight:600;">' + statusText + '</td></tr>';
        }).join('') + '</tbody></table>';
    }).catch(function(){ var el = document.getElementById('transfer-body'); if(el) el.textContent = '로드 실패'; });
}

// ══════════════════════════════════════
//  정산
// ══════════════════════════════════════
function renderSettlement() {
  var today = _dfLocalDate(new Date());
  var weekAgo = _dfLocalDate(new Date(Date.now() - 7*86400000));
  var content = document.getElementById('content');
  content.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">'
    + '<input type="date" id="sett-from" value="' + weekAgo + '" style="padding:6px 10px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text);font-size:0.82rem;">'
    + '<span style="color:var(--text3);">~</span>'
    + '<input type="date" id="sett-to" value="' + today + '" style="padding:6px 10px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text);font-size:0.82rem;">'
    + '<button id="sett-search" style="padding:6px 16px;background:#10b981;color:#fff;border:none;border-radius:6px;font-size:0.82rem;font-weight:600;cursor:pointer;">조회</button>'
    + '</div>'
    + '<div id="sett-body" style="color:var(--text3);font-size:0.82rem;">로딩중...</div></div>';

  document.getElementById('sett-search').addEventListener('click', _loadSettlement);
  _loadSettlement();
}

function _loadSettlement() {
  var from = document.getElementById('sett-from').value;
  var to = document.getElementById('sett-to').value;
  fetch('/api/partner/settlement?start=' + from + '&end=' + to)
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var data = res.data || [];
      var el = document.getElementById('sett-body');
      if(!el) return;
      if(data.length === 0) { el.textContent = '정산 데이터가 없습니다.'; return; }

      var totalBet = data.reduce(function(s,d){ return s+d.bet; }, 0);
      var totalWin = data.reduce(function(s,d){ return s+d.win; }, 0);
      var totalProfit = totalBet - totalWin;

      el.innerHTML = '<div style="display:flex;gap:12px;margin-bottom:14px;">'
        + '<div style="padding:10px 16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:8px;"><span style="font-size:0.7rem;color:#f59e0b;">총 베팅</span><div style="font-size:1rem;font-weight:700;color:#f59e0b;">₩' + Math.floor(totalBet).toLocaleString() + '</div></div>'
        + '<div style="padding:10px 16px;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.2);border-radius:8px;"><span style="font-size:0.7rem;color:#4ade80;">총 당첨</span><div style="font-size:1rem;font-weight:700;color:#4ade80;">₩' + Math.floor(totalWin).toLocaleString() + '</div></div>'
        + '<div style="padding:10px 16px;background:rgba(' + (totalProfit>=0?'74,222,128':'239,68,68') + ',0.1);border:1px solid rgba(' + (totalProfit>=0?'74,222,128':'239,68,68') + ',0.2);border-radius:8px;"><span style="font-size:0.7rem;color:' + (totalProfit>=0?'#4ade80':'#ef4444') + ';">손익</span><div style="font-size:1rem;font-weight:700;color:' + (totalProfit>=0?'#4ade80':'#ef4444') + ';">' + (totalProfit>=0?'+':'') + '₩' + Math.floor(totalProfit).toLocaleString() + '</div></div>'
        + '</div>'
        + '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        + '<thead><tr style="background:var(--table-th-bg);border-bottom:1px solid var(--border);">'
        + '<th style="text-align:left;padding:8px;">날짜</th><th style="text-align:right;padding:8px;">건수</th><th style="text-align:right;padding:8px;">베팅</th><th style="text-align:right;padding:8px;">당첨</th><th style="text-align:right;padding:8px;">손익</th></tr></thead>'
        + '<tbody>' + data.map(function(d) {
          var profit = d.bet - d.win;
          return '<tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;color:var(--text);">' + d.date + '</td><td style="text-align:right;padding:8px;color:var(--text2);">' + d.count + '</td><td style="text-align:right;padding:8px;color:#f59e0b;font-weight:600;">₩' + Math.floor(d.bet).toLocaleString() + '</td><td style="text-align:right;padding:8px;color:#4ade80;font-weight:600;">₩' + Math.floor(d.win).toLocaleString() + '</td><td style="text-align:right;padding:8px;color:' + (profit>=0?'#4ade80':'#ef4444') + ';font-weight:600;">' + (profit>=0?'+':'') + '₩' + Math.floor(profit).toLocaleString() + '</td></tr>';
        }).join('') + '</tbody></table>';
    }).catch(function(){ var el = document.getElementById('sett-body'); if(el) el.textContent = '로드 실패'; });
}

// ══════════════════════════════════════
//  공지사항
// ══════════════════════════════════════
function renderNoticeList() {
  var content = document.getElementById('content');
  content.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;">'
    + '<div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:12px;">공지사항</div>'
    + '<div id="notice-body" style="color:var(--text3);font-size:0.82rem;">로딩중...</div></div>';

  fetch('/api/partner/notices')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var list = res.data || [];
      var el = document.getElementById('notice-body');
      if(!el) return;
      if(list.length === 0) { el.textContent = '공지사항이 없습니다.'; return; }
      el.innerHTML = list.map(function(n) {
        return '<div style="padding:14px;border-bottom:1px solid var(--border);cursor:pointer;" class="notice-item">'
          + '<div style="font-size:0.88rem;font-weight:600;color:var(--text);">' + (n.title||'제목 없음') + '</div>'
          + '<div style="font-size:0.72rem;color:var(--text3);margin-top:4px;">' + (n.date||n.createdAt||'') + '</div>'
          + '<div class="notice-content" style="display:none;margin-top:10px;padding:12px;background:var(--bg3);border-radius:8px;font-size:0.82rem;color:var(--text2);line-height:1.6;white-space:pre-wrap;">' + (n.content||'') + '</div>'
          + '</div>';
      }).join('');

      el.querySelectorAll('.notice-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var c = item.querySelector('.notice-content');
          c.style.display = c.style.display === 'none' ? 'block' : 'none';
        });
      });
    }).catch(function(){ var el = document.getElementById('notice-body'); if(el) el.textContent = '로드 실패'; });
}

// ══════════════════════════════════════
//  비밀번호 변경
// ══════════════════════════════════════
function renderPasswordChange() {
  var content = document.getElementById('content');
  content.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;max-width:400px;">'
    + '<div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:16px;">비밀번호 변경</div>'
    + '<div style="display:flex;flex-direction:column;gap:12px;">'
    + '<input type="password" id="pw-current" placeholder="현재 비밀번호" style="padding:10px 14px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;color:var(--text);font-size:0.85rem;">'
    + '<input type="password" id="pw-new" placeholder="새 비밀번호" style="padding:10px 14px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;color:var(--text);font-size:0.85rem;">'
    + '<input type="password" id="pw-confirm" placeholder="새 비밀번호 확인" style="padding:10px 14px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;color:var(--text);font-size:0.85rem;">'
    + '<button id="pw-change-btn" style="padding:10px;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">변경</button>'
    + '</div></div>';

  document.getElementById('pw-change-btn').addEventListener('click', async function() {
    var cur = document.getElementById('pw-current').value;
    var nw = document.getElementById('pw-new').value;
    var cf = document.getElementById('pw-confirm').value;
    if (!cur || !nw) return customAlert('비밀번호를 입력하세요.');
    if (nw !== cf) return customAlert('새 비밀번호가 일치하지 않습니다.');
    if (nw.length < 4) return customAlert('새 비밀번호는 4자 이상이어야 합니다.');

    showLoading();
    fetch('/api/partner/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: cur, newPassword: nw })
    })
    .then(function(r){ return r.json(); })
    .then(function(res) {
      hideLoading();
      if (res.success) {
        customAlert('비밀번호가 변경되었습니다.');
        document.getElementById('pw-current').value = '';
        document.getElementById('pw-new').value = '';
        document.getElementById('pw-confirm').value = '';
      } else {
        customAlert(res.error || '변경 실패');
      }
    })
    .catch(function() { hideLoading(); customAlert('서버 오류'); });
  });
}
