// ══════════════════════════════════════
//  인증 헤더 자동 포함 fetch
// ══════════════════════════════════════
var _origFetch = window.fetch;
// 머니 변동이 일어나는 API 패턴
var _moneyApiPatterns = ['/money/', '/deposit', '/withdraw', '/give', '/take', '/approve', '/reject', '/add-balance', '/sub-balance', '/partner-tree'];
var _sidebarRefreshTimer = null;
window.fetch = function(url, opts) {
  if (typeof url === 'string' && (url.indexOf('/api/admin/') !== -1 || url.indexOf('/api/hl/') !== -1 || url.indexOf('/api/game/') !== -1) && url.indexOf('/api/admin/login') === -1 && url.indexOf('/api/admin/check-session') === -1) {
    var tk = sessionStorage.getItem('adminToken') || '';
    if (!tk) return Promise.resolve(new Response(JSON.stringify({data:[]}), {status:200, headers:{'Content-Type':'application/json'}}));
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (!opts.headers['Authorization']) {
      opts.headers['Authorization'] = 'Bearer ' + tk;
    }
  }
  var result = _origFetch.call(window, url, opts);
  // POST 요청 중 머니 관련 API 성공 시 사이드바 자동 갱신
  if (typeof url === 'string' && opts && opts.method && opts.method.toUpperCase() === 'POST') {
    var isMoneyApi = _moneyApiPatterns.some(function(p) { return url.indexOf(p) !== -1; });
    if (isMoneyApi) {
      result.then(function(res) {
        if (res.ok) {
          // 디바운스: 짧은 시간에 여러 요청이 오면 마지막 것만 실행
          clearTimeout(_sidebarRefreshTimer);
          _sidebarRefreshTimer = setTimeout(function() {
            if (typeof fetchSidebarStats === 'function') fetchSidebarStats();
          }, 1000);
        }
        return res;
      });
    }
  }
  return result;
};

// ══════════════════════════════════════
//  커스텀 Confirm 모달
// ══════════════════════════════════════
function customConfirm(message) {
  return new Promise(function(resolve) {
    var existing = document.getElementById('custom-confirm-overlay');
    if(existing) existing.remove();

    var ov = document.createElement('div');
    ov.id = 'custom-confirm-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:var(--shadow);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);opacity:0;transition:opacity 0.2s;';

    ov.innerHTML = '<div style="background:var(--bg);border:1px solid var(--bg3);border-radius:12px;width:400px;max-width:90vw;box-shadow:0 20px 60px var(--shadow);animation:cfPop 0.25s ease;">'
      + '<style>@keyframes cfPop{from{transform:scale(0.9) translateY(10px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}</style>'
      + '<div style="padding:24px 24px 16px;text-align:center;">'
      + '<div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:rgba(251,191,36,0.1);margin-bottom:14px;">'
      + '<i class="fas fa-exclamation-triangle" style="font-size:1.3rem;color:#fbbf24;"></i>'
      + '</div>'
      + '<div style="font-size:0.95rem;color:var(--text1);line-height:1.6;white-space:pre-line;">' + message + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:10px;padding:8px 24px 24px;">'
      + '<button id="cf-cancel" style="flex:1;padding:11px;border:1px solid var(--input-border);border-radius:8px;background:var(--bg3);color:var(--text2);font-size:0.88rem;font-weight:600;cursor:pointer;transition:background 0.15s;">취소</button>'
      + '<button id="cf-ok" style="flex:1;padding:11px;border:none;border-radius:8px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;font-size:0.88rem;font-weight:600;cursor:pointer;transition:background 0.15s;">확인</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(ov);
    requestAnimationFrame(function(){ ov.style.opacity = '1'; });

    function close(result) {
      ov.style.opacity = '0';
      setTimeout(function(){ ov.remove(); }, 200);
      resolve(result);
    }

    document.getElementById('cf-ok').addEventListener('click', function(){ close(true); });
    document.getElementById('cf-cancel').addEventListener('click', function(){ close(false); });
    ov.addEventListener('click', function(e){ if(e.target === ov) close(false); });
  });
}

// ══════════════════════════════════════
//  로딩 스피너
// ══════════════════════════════════════
var _loadingThrottle = {};
function showLoading(key) {
  // 같은 key로 2초 이내 재호출 방지 (서버 과부하 방지)
  if (key && _loadingThrottle[key] && Date.now() - _loadingThrottle[key] < 2000) return false;
  if (key) _loadingThrottle[key] = Date.now();
  var existing = document.getElementById('admin-loading-overlay');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'admin-loading-overlay';
  ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.35);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
  ov.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;">'
    + '<div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.15);border-top:3px solid #d4af37;border-radius:50%;animation:adminSpin 0.7s linear infinite;"></div>'
    + '<div style="color:#fff;font-size:0.82rem;">로딩 중...</div>'
    + '</div>';
  document.body.appendChild(ov);
  return true;
}
function hideLoading() {
  var ov = document.getElementById('admin-loading-overlay');
  if (ov) ov.remove();
}
// 스피너 애니메이션 CSS
(function() {
  var s = document.createElement('style');
  s.textContent = '@keyframes adminSpin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }';
  document.head.appendChild(s);
})();

// ══════════════════════════════════════
//  커스텀 confirm 모달
// ══════════════════════════════════════
function customConfirm(msg, opts) {
  opts = opts || {};
  return new Promise(function(resolve) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);opacity:0;transition:opacity 0.2s;';

    var icon = opts.icon || 'fa-question-circle';
    var iconColor = opts.type === 'danger' ? '#ef4444' : '#3b82f6';
    var confirmText = opts.confirmText || '확인';
    var cancelText = opts.cancelText || '취소';
    var confirmColor = opts.type === 'danger' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#3b82f6,#2563eb)';

    ov.innerHTML = '<div style="background:var(--bg,#0f172a);border:1px solid var(--border,#1e293b);border-radius:14px;width:380px;max-width:92vw;box-shadow:0 20px 60px var(--shadow);animation:cfmPop 0.25s ease;">'
      + '<style>@keyframes cfmPop{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}</style>'
      + '<div style="padding:28px 24px 16px;text-align:center;">'
      + '<div style="width:52px;height:52px;border-radius:50%;background:' + iconColor + '20;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;"><i class="fas ' + icon + '" style="font-size:1.4rem;color:' + iconColor + ';"></i></div>'
      + '<div style="font-size:0.95rem;font-weight:600;color:var(--text,#e2e8f0);line-height:1.5;">' + msg + '</div>'
      + '</div>'
      + '<div style="padding:12px 24px 22px;display:flex;gap:10px;justify-content:center;">'
      + '<button id="cfm-cancel" style="flex:1;padding:10px 0;border-radius:8px;border:1px solid var(--border,#334155);background:var(--bg2,#1e293b);color:var(--text2,#94a3b8);font-size:0.85rem;font-weight:600;cursor:pointer;transition:all 0.15s;">' + cancelText + '</button>'
      + '<button id="cfm-ok" style="flex:1;padding:10px 0;border-radius:8px;border:none;background:' + confirmColor + ';color:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;transition:all 0.15s;">' + confirmText + '</button>'
      + '</div></div>';

    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.style.opacity = '1'; });

    function close(val) { ov.style.opacity='0'; setTimeout(function(){ ov.remove(); }, 200); resolve(val); }
    document.getElementById('cfm-ok').addEventListener('click', function() { close(true); });
    document.getElementById('cfm-cancel').addEventListener('click', function() { close(false); });
  });
}

function customAlert(msg, opts) {
  opts = opts || {};
  return new Promise(function(resolve) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);opacity:0;transition:opacity 0.2s;';

    var icon = opts.icon || 'fa-check-circle';
    var iconColor = opts.type === 'error' ? '#ef4444' : opts.type === 'warning' ? '#fbbf24' : '#22c55e';

    ov.innerHTML = '<div style="background:var(--bg,#0f172a);border:1px solid var(--border,#1e293b);border-radius:14px;width:380px;max-width:92vw;box-shadow:0 20px 60px var(--shadow);animation:cfmPop 0.25s ease;">'
      + '<div style="padding:28px 24px 16px;text-align:center;">'
      + '<div style="width:52px;height:52px;border-radius:50%;background:' + iconColor + '20;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;"><i class="fas ' + icon + '" style="font-size:1.4rem;color:' + iconColor + ';"></i></div>'
      + '<div style="font-size:0.95rem;font-weight:600;color:var(--text,#e2e8f0);line-height:1.5;white-space:pre-line;">' + msg + '</div>'
      + '</div>'
      + '<div style="padding:8px 24px 22px;">'
      + '<button id="calert-ok" style="width:100%;padding:10px 0;border-radius:8px;border:none;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;transition:all 0.15s;">확인</button>'
      + '</div></div>';

    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.style.opacity = '1'; });

    function close() { ov.style.opacity='0'; setTimeout(function(){ ov.remove(); }, 200); resolve(); }
    document.getElementById('calert-ok').addEventListener('click', close);
  });
}

// ══════════════════════════════════════
//  관리자 인증 시스템
// ══════════════════════════════════════
var _adminToken = sessionStorage.getItem('adminToken') || '';

function _adminFetch(url, opts) {
  opts = opts || {};
  opts.headers = opts.headers || {};
  if (_adminToken) opts.headers['Authorization'] = 'Bearer ' + _adminToken;
  return fetch(url, opts);
}

// 기존 fetch를 래핑 (admin API 호출 시 토큰 자동 첨부)
(function() {
  var _origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.indexOf('/api/admin') === 0 && _adminToken) {
      opts = opts || {};
      opts.headers = opts.headers || {};
      if (typeof opts.headers.set === 'function') {
        opts.headers.set('Authorization', 'Bearer ' + _adminToken);
      } else {
        opts.headers['Authorization'] = 'Bearer ' + _adminToken;
      }
    }
    return _origFetch.call(window, url, opts);
  };
})();

function _showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.querySelector('.sidebar').style.display = 'none';
  document.querySelector('.main-wrap').style.display = 'none';
}

function _showAdminUI() {
  document.getElementById('login-screen').style.display = 'none';
  document.querySelector('.sidebar').style.display = '';
  document.querySelector('.main-wrap').style.display = '';
}

// 세션 체크
(function() {
  if (!_adminToken) {
    _showLoginScreen();
    return;
  }
  fetch('/api/admin/check-session', {
    headers: { 'Authorization': 'Bearer ' + _adminToken }
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.success) {
      if (typeof _loadPartnerTreeFromServer === 'function') _loadPartnerTreeFromServer();
      if (typeof _loadDashboardData === 'function') _loadDashboardData();
      _showAdminUI();
      fetchAgentBalance();
      fetchSidebarStats();
    }
    else { _adminToken = ''; sessionStorage.removeItem('adminToken'); _showLoginScreen(); }
  })
  .catch(function() { _showLoginScreen(); });
})();

// 로그인 처리
document.getElementById('login-btn').addEventListener('click', _doLogin);
document.getElementById('login-pw').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') _doLogin();
});
document.getElementById('login-id').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('login-pw').focus();
});

function _doLogin() {
  var id = document.getElementById('login-id').value.trim();
  var pw = document.getElementById('login-pw').value;
  var errEl = document.getElementById('login-error');
  if (!id || !pw) { errEl.textContent = '아이디와 비밀번호를 입력하세요.'; errEl.style.display = 'block'; return; }

  document.getElementById('login-btn').disabled = true;
  document.getElementById('login-btn').textContent = '로그인 중...';

  fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: id, password: pw })
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.success && res.token) {
      _adminToken = res.token;
      sessionStorage.setItem('adminToken', res.token);
      errEl.style.display = 'none';
      _showAdminUI();
      // 파트너 트리 로드 (로그인 후)
      if (typeof _loadPartnerTreeFromServer === 'function') _loadPartnerTreeFromServer();
      if (typeof _loadDashboardData === 'function') _loadDashboardData();
      // 초기 페이지 렌더
      var page = location.hash.replace('#', '') || 'dashboard';
      renderPage(page);
      fetchAgentBalance();
      fetchSidebarStats();
    } else {
      errEl.textContent = res.error || '로그인 실패';
      errEl.style.display = 'block';
    }
  })
  .catch(function() {
    errEl.textContent = '서버 연결 오류';
    errEl.style.display = 'block';
  })
  .finally(function() {
    document.getElementById('login-btn').disabled = false;
    document.getElementById('login-btn').textContent = '로그인';
  });
}

const pageTitles = {
  'partner-list':            '회원 관리 > 파트너 목록',
  'partner-headquarter':     '회원 관리 > 본사 목록',
  'partner-sub':             '회원 관리 > 부본사 목록',
  'partner-distributor':     '회원 관리 > 총판 목록',
  'partner-store':           '회원 관리 > 매장 목록',
  'member-online':           '회원 관리 > 접속자 목록',
  'member-list':             '회원 관리 > 회원 목록',
  'member-pending':          '회원 관리 > 승인 대기',
  'member-blacklist':        '회원 관리 > 블랙리스트',
  'member-emptybet':         '회원 관리 > 공베팅 목록',
  'betting-all':             '베팅 내역 > 전체 베팅 내역',
  'betting-slot':            '베팅 내역 > 슬롯 베팅내역',
  'betting-casino':          '베팅 내역 > 카지노 베팅내역',
  'betting-empty':           '베팅 내역 > 공베팅 내역',
  'money-admin':             '머니 내역 > 관리자 지급/차감',
  'money-partner':           '머니 내역 > 파트너 지급/차감',
  'money-user':              '머니 내역 > 유저머니 지급/차감',
  'transfer-deposit-req':    '충환전 관리 > 충전 신청',
  'transfer-withdraw-req':   '충환전 관리 > 환전 신청',
  'transfer-deposit-hist':   '충환전 관리 > 충전 내역',
  'transfer-withdraw-hist':  '충환전 관리 > 환전 내역',
  'settlement-total':        '정산 관리 > 통합 정산 (슬+카)',
  'settlement-daily':        '정산 관리 > 일자별 정산',
  'settlement-game':         '정산 관리 > 게임사별 정산',
  'settlement-provider':     '정산 관리 > 프로바이더별 정산',
  'point-rolling':           '포인트 내역 > 롤링내역',
  'point-convert':           '포인트 내역 > 롤링전환내역',
  'point-give':              '포인트 내역 > 포인트 지급/회수',
  'game-default':            '게임 설정 > 게임사 기본설정',
  'game-group':              '게임 설정 > 게임사 그룹설정',
  'emptybet-slot':           '공베팅 설정 > 슬롯 공베팅 설정',
  'emptybet-casino':         '공베팅 설정 > 카지노 공베팅 설정',
  'emptybet-restore':        '공베팅 설정 > 공베팅복구',
  'emptybet-missing':        '공베팅 설정 > 누락 현황',
  'support-notice':          '고객센터 > 공지사항',
  'support-inquiry-open':    '고객센터 > 상담문의 (접수)',
  'support-inquiry-done':    '고객센터 > 상담문의 (완료)',
  'support-quickreply':      '고객센터 > 고정답변 관리',
  'support-message':         '고객센터 > 쪽지보내기',
  'support-event':           '고객센터 > 이벤트 관리',
  'settings-maxwin':         '설정 및 조회 > 최대당첨금 알람 설정',
  'settings-partner-perm':   '설정 및 조회 > 파트너 권한 설정',

  'settings-security':       '설정 및 조회 > 보안설정',
  'settings-transfer-limit': '설정 및 조회 > 충환전 제한설정',
  'settings-domain':         '설정 및 조회 > 도메인목록 조회',
  'settings-blocked-ip':     '설정 및 조회 > 차단된 IP 조회',
  'settings-login-log':      '설정 및 조회 > 로그인기록 조회',
  'settings-telegram':       '설정 및 조회 > 텔레그램 알림설정',
};

// ── 고정 상단 바 (모든 페이지 공통) ──
function renderPersistentTop() {
  var el = document.getElementById('persistent-top');
  if(!el || el.dataset.rendered) return;
  el.dataset.rendered = '1';
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:0.85rem;font-weight:700;color:var(--text);">📈 오늘의 통계</span>
        <span id="top-stat-time" style="font-size:0.7rem;color:var(--text3);">⏱ 0초전</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button id="top-stat-settings" style="background:none;border:1px solid var(--border);color:var(--text3);border-radius:4px;cursor:pointer;font-size:0.72rem;padding:2px 8px;" title="설정"><i class="fas fa-cog"></i></button>
        <button id="top-stat-refresh" style="background:none;border:1px solid var(--border);color:var(--text3);border-radius:4px;cursor:pointer;font-size:0.72rem;padding:2px 8px;" title="새로고침"><i class="fas fa-sync-alt"></i></button>
      </div>
    </div>
    <div id="top-stat-cards" style="display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;">
      <div class="top-stat-card" data-stat-key="members">
        <div class="top-stat-label">👤 전체회원 / 접속회원</div>
        <div class="top-stat-val"><span style="color:#3b82f6;" id="ts-total-users">0</span> / <span style="color:#4ade80;" id="ts-online-users">0</span></div>
      </div>
      <div class="top-stat-card" data-stat-key="newquit">
        <div class="top-stat-label">신규 / 탈퇴</div>
        <div class="top-stat-val"><span style="color:#4ade80;" id="ts-new-users">+0</span> / <span style="color:#ef4444;" id="ts-quit-users">-0</span></div>
      </div>
      <div class="top-stat-card" data-stat-key="pointconvert">
        <div class="top-stat-label">🔄 포인트 전환</div>
        <div class="top-stat-val"><span id="ts-point-convert-cnt" style="color:var(--text);">0건</span> / <span style="color:#a855f7;" id="ts-point-convert">₩0</span></div>
      </div>
      <div class="top-stat-card" data-stat-key="deposit">
        <div class="top-stat-label">🟢 입금</div>
        <div class="top-stat-val"><span style="color:#4ade80;font-weight:700;" id="ts-deposit-cnt">0건</span> / <span style="color:#4ade80;" id="ts-deposit">₩0</span></div>
      </div>
      <div class="top-stat-card" data-stat-key="withdraw">
        <div class="top-stat-label">🔴 출금</div>
        <div class="top-stat-val"><span style="color:#ef4444;font-weight:700;" id="ts-withdraw-cnt">0건</span> / <span style="color:#ef4444;" id="ts-withdraw">₩0</span></div>
      </div>
      <div class="top-stat-card" data-stat-key="transferprofit">
        <div class="top-stat-label">입출 손익</div>
        <div class="top-stat-val" id="ts-transfer-profit" style="color:#4ade80;">+₩0</div>
      </div>
      <div class="top-stat-card" data-stat-key="betting">
        <div class="top-stat-label">🎰 베팅</div>
        <div class="top-stat-val" style="color:#f59e0b;" id="ts-bet-amount">₩0</div>
      </div>
      <div class="top-stat-card" data-stat-key="win">
        <div class="top-stat-label">📈 당첨</div>
        <div class="top-stat-val" style="color:#4ade80;" id="ts-win-amount">₩0</div>
      </div>
      <div class="top-stat-card" data-stat-key="betprofit">
        <div class="top-stat-label">베팅 손익</div>
        <div class="top-stat-val" id="ts-bet-profit" style="color:#ef4444;">₩0</div>
      </div>
      <div class="top-stat-card" data-stat-key="rolling">
        <div class="top-stat-label">📈 롤링</div>
        <div class="top-stat-val" style="color:#a855f7;" id="ts-rolling">₩0</div>
      </div>
      <div class="top-stat-card" data-stat-key="gamedetail" style="cursor:pointer;border-color:var(--primary);padding:0 14px;" id="ts-game-detail-btn">
        <div style="font-size:0.78rem;color:var(--text2);white-space:nowrap;height:100%;display:flex;align-items:center;justify-content:center;" class="top-stat-val">🎮 게임별 상세 ∨</div>
      </div>
    </div>
  `;
  // 새로고침 버튼
  var refreshBtn = el.querySelector('#top-stat-refresh');
  if(refreshBtn) refreshBtn.addEventListener('click', function(){ fetchTopStats(); });

  // 게임별 상세 토글
  var gameDetailBtn = el.querySelector('#ts-game-detail-btn');
  if(gameDetailBtn) gameDetailBtn.addEventListener('click', function() {
    var existing = document.getElementById('ts-game-detail-table');
    if(existing) { existing.remove(); this.querySelector('.top-stat-val').textContent = '🎮 게임별 상세 ∨'; return; }
    this.querySelector('.top-stat-val').textContent = '🎮 게임별 상세 ∧';

    var tableWrap = document.createElement('div');
    tableWrap.id = 'ts-game-detail-table';
    tableWrap.style.cssText = 'margin-top:10px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;overflow:hidden;';
    tableWrap.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
      + '<thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border);">'
      + '<th style="text-align:left;padding:10px 16px;color:var(--text2);font-weight:600;">게임타입</th>'
      + '<th style="text-align:center;padding:10px 16px;color:var(--text2);font-weight:600;">건수 / 인원</th>'
      + '<th style="text-align:center;padding:10px 16px;color:var(--text2);font-weight:600;">베팅 금액</th>'
      + '<th style="text-align:center;padding:10px 16px;color:var(--text2);font-weight:600;">당첨 금액</th>'
      + '<th style="text-align:center;padding:10px 16px;color:var(--text2);font-weight:600;">손익 (베팅-당첨)</th>'
      + '<th style="text-align:center;padding:10px 16px;color:var(--text2);font-weight:600;">롤링</th>'
      + '</tr></thead>'
      + '<tbody id="ts-game-detail-body"><tr><td colspan="6" style="text-align:center;padding:16px;color:var(--text3);">로딩중...</td></tr></tbody>'
      + '</table>';
    el.appendChild(tableWrap);

    _loadGameDetailStats();
  });

  // 설정 버튼 (카드 ON/OFF)
  var settingsBtn = el.querySelector('#top-stat-settings');
  if(settingsBtn) settingsBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    var existing = document.getElementById('top-stat-settings-popup');
    if(existing) { existing.remove(); return; }

    var statItems = [
      { key: 'members', label: '전체회원 / 접속회원' },
      { key: 'newquit', label: '신규 / 탈퇴' },
      { key: 'pointconvert', label: '포인트 전환' },
      { key: 'deposit', label: '입금' },
      { key: 'withdraw', label: '출금' },
      { key: 'transferprofit', label: '입출 손익' },
      { key: 'betting', label: '베팅' },
      { key: 'win', label: '당첨' },
      { key: 'betprofit', label: '베팅 손익' },
      { key: 'rolling', label: '롤링' },
      { key: 'gamedetail', label: '게임별 상세' }
    ];

    var hidden = _getHiddenStats();
    var rows = statItems.map(function(item) {
      var isOn = hidden.indexOf(item.key) === -1;
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">'
        + '<span style="font-size:0.78rem;color:var(--text);">' + item.label + '</span>'
        + '<label style="position:relative;display:inline-block;width:36px;height:20px;cursor:pointer;">'
        + '<input type="checkbox" class="ts-toggle" data-key="' + item.key + '" ' + (isOn ? 'checked' : '') + ' style="opacity:0;width:0;height:0;">'
        + '<span style="position:absolute;top:0;left:0;right:0;bottom:0;background:' + (isOn ? '#4ade80' : '#374151') + ';border-radius:10px;transition:0.2s;"></span>'
        + '<span style="position:absolute;top:2px;left:' + (isOn ? '18px' : '2px') + ';width:16px;height:16px;background:#fff;border-radius:50%;transition:0.2s;"></span>'
        + '</label></div>';
    }).join('');

    var popup = document.createElement('div');
    popup.id = 'top-stat-settings-popup';
    popup.style.cssText = 'position:absolute;right:60px;top:36px;z-index:9999;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:14px 18px;min-width:240px;box-shadow:0 8px 24px rgba(0,0,0,0.4);';
    popup.innerHTML = '<div style="font-size:0.78rem;font-weight:700;color:var(--text);margin-bottom:10px;">통계 항목 설정</div>' + rows;
    el.querySelector('div').style.position = 'relative';
    el.appendChild(popup);

    popup.querySelectorAll('.ts-toggle').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var key = this.dataset.key;
        var hidden = _getHiddenStats();
        if(this.checked) {
          hidden = hidden.filter(function(k){ return k !== key; });
        } else {
          if(hidden.indexOf(key) === -1) hidden.push(key);
        }
        localStorage.setItem('topStatHidden', JSON.stringify(hidden));
        _applyHiddenStats();
        // 토글 시각 업데이트
        var slider = this.nextElementSibling;
        var dot = slider.nextElementSibling;
        slider.style.background = this.checked ? '#4ade80' : '#374151';
        dot.style.left = this.checked ? '18px' : '2px';
      });
    });

    // 바깥 클릭 시 닫기
    setTimeout(function() {
      document.addEventListener('click', function closePopup(ev) {
        if(!popup.contains(ev.target) && ev.target !== settingsBtn) {
          popup.remove();
          document.removeEventListener('click', closePopup);
        }
      });
    }, 10);
  });

  // 저장된 설정 적용
  _applyHiddenStats();

  fetchTopStats();
  setInterval(fetchTopStats, 60000);
}

function _getHiddenStats() {
  try { return JSON.parse(localStorage.getItem('topStatHidden') || '[]'); } catch(e) { return []; }
}

function _applyHiddenStats() {
  var hidden = _getHiddenStats();
  document.querySelectorAll('#top-stat-cards .top-stat-card').forEach(function(card) {
    var key = card.dataset.statKey;
    if(key) card.style.display = hidden.indexOf(key) === -1 ? '' : 'none';
  });
}

function _loadGameDetailStats() {
  var body = document.getElementById('ts-game-detail-body');
  if(!body) return;

  var _todayKst = new Date(Date.now() + 9*60*60*1000).toISOString().slice(0,10);
  var _todayStart = _todayKst + ' 00:00:00';
  var _todayEnd = _todayKst + ' 23:59:59';
  fetch('/api/hl/transactions/local?types=bet,win&perPage=10000&start='+encodeURIComponent(_todayStart)+'&end='+encodeURIComponent(_todayEnd))
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var txs = res.data || [];
      var gameTypes = {
        'casino': { icon: '🎰', label: '카지노', bets: [], wins: [], users: [] },
        'slot': { icon: '🎲', label: '슬롯', bets: [], wins: [], users: [] }
      };

      function _gdClassifyV(tx) {
        var v = '';
        try { v = ((tx.details && tx.details.game && (tx.details.game.vendor || tx.details.game.type)) || tx.vendor || tx.game_provider || '').toLowerCase(); } catch(e3) {}
        if (!v) return 'casino';
        if (v.indexOf('pragmatic') !== -1 && v.indexOf('pragmatic_live') === -1 && v.indexOf('pragmaticlive') === -1) return 'slot';
        if (v.indexOf('slot') !== -1 || v.indexOf('habanero') !== -1 || v.indexOf('cq9') !== -1 || v.indexOf('jili') !== -1 || v === 'pg' || v.indexOf('pgsoft') !== -1 || v.indexOf('booongo') !== -1 || v.indexOf('netent') !== -1 || v.indexOf('relax') !== -1 || v.indexOf('nolimit') !== -1 || v.indexOf('hacksaw') !== -1) return 'slot';
        return 'casino';
      }

      txs.forEach(function(t) {
        var cat = _gdClassifyV(t);

        var g = gameTypes[cat];
        if(t.type === 'bet') {
          g.bets.push(t);
          if(t.username && g.users.indexOf(t.username) === -1) g.users.push(t.username);
        } else if(t.type === 'win') {
          g.wins.push(t);
        }
      });

      var _gdTree = [];
      try { _gdTree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(e2) {}
      var _gdHead = (_gdTree[0] && _gdTree[0].children && _gdTree[0].children[0]) ? _gdTree[0].children[0] : null;
      var _gdRollSlot = _gdHead ? parseFloat(_gdHead.rollSlot || 0) : 0;
      var _gdRollCasino = _gdHead ? parseFloat(_gdHead.rollCasino || 0) : 0;

      var rows = '';
      ['casino','slot'].forEach(function(key) {
        var g = gameTypes[key];
        var betAmt = g.bets.reduce(function(s,t){ return s + Math.abs(t.amount||0); }, 0);
        var winAmt = g.wins.reduce(function(s,t){ return s + Math.abs(t.amount||0); }, 0);
        var profit = betAmt - winAmt;
        var rollPct = (key === 'slot') ? _gdRollSlot : _gdRollCasino;
        var rolling = g.bets.reduce(function(s,t){ return s + Math.floor(Math.abs(t.amount||0) * rollPct / 100); }, 0);

        rows += '<tr style="border-bottom:1px solid var(--border);">'
          + '<td style="padding:10px 16px;color:var(--text);">' + g.icon + ' ' + g.label + '</td>'
          + '<td style="text-align:center;padding:10px 16px;color:var(--text);">' + g.bets.length + ' / ' + g.users.length + '</td>'
          + '<td style="text-align:center;padding:10px 16px;color:#f59e0b;font-weight:600;">₩' + betAmt.toLocaleString() + '</td>'
          + '<td style="text-align:center;padding:10px 16px;color:#ef4444;font-weight:600;">₩' + winAmt.toLocaleString() + '</td>'
          + '<td style="text-align:center;padding:10px 16px;color:' + (profit >= 0 ? '#4ade80' : '#ef4444') + ';font-weight:600;">₩' + (profit >= 0 ? '' : '-') + Math.abs(profit).toLocaleString() + '</td>'
          + '<td style="text-align:center;padding:10px 16px;color:#a855f7;font-weight:600;">' + rolling.toLocaleString() + '</td>'
          + '</tr>';
      });

      if(body) body.innerHTML = rows;
    })
    .catch(function() {
      if(body) body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#f87171;">데이터 로드 실패</td></tr>';
    });
}

var _topStatLastFetch = 0;
function fetchTopStats() {
  if (!showLoading('topStats')) return;
  _topStatLastFetch = Date.now();
  var _pendingCalls = 4;
  function _checkDone() { _pendingCalls--; if (_pendingCalls <= 0) hideLoading(); }

  // 타이머 업데이트
  clearInterval(window._topStatTimer);
  window._topStatTimer = setInterval(function() {
    var el = document.getElementById('top-stat-time');
    if(el) {
      var sec = Math.floor((Date.now() - _topStatLastFetch) / 1000);
      el.textContent = '⏱ ' + sec + '초전';
    }
  }, 1000);

  // 유저 데이터
  fetch('/api/admin/users')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var users = res.data || [];
      var today = new Date();
      var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
      var totalUsers = users.filter(function(u){ return u.status !== 'deleted'; }).length;
      var newUsers = users.filter(function(u){ return u.registeredAt && u.registeredAt.startsWith(todayStr); }).length;
      var quitUsers = users.filter(function(u){ return u.status === 'deleted'; }).length;

      var el1 = document.getElementById('ts-total-users'); if(el1) el1.textContent = totalUsers;
      var el2 = document.getElementById('ts-new-users'); if(el2) el2.textContent = '+' + newUsers;
      var el3 = document.getElementById('ts-quit-users'); if(el3) el3.textContent = '-' + quitUsers;
    }).catch(function(){}).then(_checkDone);

  // 접속자 수
  fetch('/api/auth/online')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var cnt = (res.data || []).length;
      var el = document.getElementById('ts-online-users'); if(el) el.textContent = cnt;
    }).catch(function(){}).then(_checkDone);

  // 입출금 데이터
  fetch('/api/admin/transfers')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var list = res.data || [];
      var today = new Date();
      var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
      var todayList = list.filter(function(t){ return (t.datetime||'').startsWith(todayStr); });

      var depItems = todayList.filter(function(t){ return t.type === 'deposit' && t.status === 'approved'; });
      var witItems = todayList.filter(function(t){ return t.type === 'withdraw' && t.status === 'approved'; });
      var depTotal = depItems.reduce(function(s,t){ return s + (t.amount||0); }, 0);
      var witTotal = witItems.reduce(function(s,t){ return s + (t.amount||0); }, 0);
      var profit = depTotal - witTotal;

      var e1 = document.getElementById('ts-deposit-cnt'); if(e1) e1.textContent = depItems.length + '건';
      var e2 = document.getElementById('ts-deposit'); if(e2) e2.textContent = '₩' + depTotal.toLocaleString();
      var e3 = document.getElementById('ts-withdraw-cnt'); if(e3) e3.textContent = witItems.length + '건';
      var e4 = document.getElementById('ts-withdraw'); if(e4) e4.textContent = '₩' + witTotal.toLocaleString();
      var e5 = document.getElementById('ts-transfer-profit');
      if(e5) {
        e5.textContent = (profit >= 0 ? '+' : '') + '₩' + profit.toLocaleString();
        e5.style.color = profit >= 0 ? '#4ade80' : '#ef4444';
      }
    }).catch(function(){}).then(_checkDone);

  // 베팅 데이터 (로컬 수집 — 오늘 KST 기준)
  var _tKst = new Date(Date.now() + 9*60*60*1000).toISOString().slice(0,10);
  var _tStart = _tKst + ' 00:00:00';
  var _tEnd = _tKst + ' 23:59:59';
  fetch('/api/hl/transactions/local?types=bet,win&perPage=10000&start='+encodeURIComponent(_tStart)+'&end='+encodeURIComponent(_tEnd))
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var txs = res.data || [];
      var bets = txs.filter(function(t){ return t.type === 'bet'; });
      var wins = txs.filter(function(t){ return t.type === 'win'; });
      var betTotal = bets.reduce(function(s,t){ return s + Math.abs(t.amount||0); }, 0);
      var winTotal = wins.reduce(function(s,t){ return s + Math.abs(t.amount||0); }, 0);
      var betProfit = betTotal - winTotal;
      var bettingUsers = [];
      bets.forEach(function(t){ if(t.username && bettingUsers.indexOf(t.username) === -1) bettingUsers.push(t.username); });

      var b1 = document.getElementById('ts-betting-users'); if(b1) b1.textContent = bettingUsers.length;
      var b2 = document.getElementById('ts-bet-cnt'); if(b2) b2.textContent = bets.length + '건';
      var b3 = document.getElementById('ts-bet-amount'); if(b3) b3.textContent = '₩' + betTotal.toLocaleString();
      var b4 = document.getElementById('ts-win-amount'); if(b4) b4.textContent = '₩' + winTotal.toLocaleString();
      var b5 = document.getElementById('ts-bet-profit');
      if(b5) {
        b5.textContent = '₩' + (betProfit >= 0 ? '' : '-') + Math.abs(betProfit).toLocaleString();
        b5.style.color = betProfit >= 0 ? '#4ade80' : '#ef4444';
      }

    }).catch(function(){}).then(_checkDone);

  // 롤링 = 회원 rollingPoint 합계 (서버 기준)
  fetch('/api/admin/users')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var members = res.data || res || [];
      var rollingTotal = members.reduce(function(s, x) { return s + (Number(x.rollingPoint) || 0); }, 0);
      var b6 = document.getElementById('ts-rolling'); if(b6) b6.textContent = '₩' + rollingTotal.toLocaleString();
    }).catch(function(){});

  // 포인트 전환 (오늘 기준, 서버 조회)
  var todayStr2 = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0') + '-' + String(new Date().getDate()).padStart(2,'0');
  fetch('/api/admin/money-logs/rolling-convert')
    .then(function(r){ return r.json(); })
    .then(function(allLogs) {
      if(!Array.isArray(allLogs)) allLogs = [];
      var pcLogs = allLogs.filter(function(l){ return (l.datetime||'').startsWith(todayStr2); });
      var pcTotal = pcLogs.reduce(function(s,l){ return s + Math.abs(Number(l.amount||0)); }, 0);
      var pcEl1 = document.getElementById('ts-point-convert-cnt'); if(pcEl1) pcEl1.textContent = pcLogs.length + '건';
      var pcEl2 = document.getElementById('ts-point-convert'); if(pcEl2) pcEl2.textContent = '₩' + pcTotal.toLocaleString();
    }).catch(function(){});
}

// ── 대시보드 렌더 ──
function renderDashboard() {
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('page-title').textContent = '대시보드';
  document.getElementById('content').innerHTML = `

    <!-- 통계 카드 4개 -->
    <div class="db-new-stat-row">
      <div class="db-new-stat-card">
        <div class="db-nsc-icon" style="background:rgba(96,165,250,0.12);color:var(--blue);"><i class="fa-solid fa-wallet"></i></div>
        <div class="db-nsc-body">
          <div class="db-nsc-label">회원보유머니</div>
          <div class="db-nsc-val" id="dsc-member-money">₩0</div>
        </div>
      </div>
      <div class="db-new-stat-card">
        <div class="db-nsc-icon" style="background:rgba(167,139,250,0.12);color:var(--purple);"><i class="fa-solid fa-rotate"></i></div>
        <div class="db-nsc-body">
          <div class="db-nsc-label">회원보유롤링</div>
          <div class="db-nsc-val" id="dsc-member-rolling">₩0</div>
        </div>
      </div>
      <div class="db-new-stat-card">
        <div class="db-nsc-icon" style="background:rgba(74,222,128,0.12);color:var(--green);"><i class="fa-solid fa-briefcase"></i></div>
        <div class="db-nsc-body">
          <div class="db-nsc-label">파트너보유머니</div>
          <div class="db-nsc-val" id="dsc-partner-money">₩0</div>
        </div>
      </div>
      <div class="db-new-stat-card">
        <div class="db-nsc-icon" style="background:rgba(251,191,36,0.12);color:var(--yellow);"><i class="fa-solid fa-coins"></i></div>
        <div class="db-nsc-body">
          <div class="db-nsc-label">파트너보유롤링</div>
          <div class="db-nsc-val" id="dsc-partner-rolling">₩0</div>
        </div>
      </div>
    </div>

    <!-- 게임별 수익 + 실시간 접속자 -->
    <div class="db-game-row">
      <div class="db-section db-game-revenue" style="flex:2;">
        <div class="db-section-head"><span>게임별 수익</span></div>
        <div class="db-game-chart" id="db-game-chart">
          <div class="db-game-item">
            <div class="db-game-top">
              <div class="db-game-label"><span class="db-game-dot" style="background:#f97316;"></span>카지노</div>
              <div class="db-game-info">
                <div class="db-game-val" id="gv-casino">+₩0</div>
                <div class="db-game-sub"><span>베팅: <b id="gv-casino-bet">₩0</b></span><span>당첨: <b id="gv-casino-win">₩0</b></span><span style="color:var(--red);">롤링: <b id="gv-casino-roll">₩0</b></span></div>
              </div>
            </div>
            <div class="db-bar-wrap"><div class="db-bar bet" id="bar-casino-bet" style="width:0%;"></div></div>
          </div>
          <div class="db-game-item">
            <div class="db-game-top">
              <div class="db-game-label"><span class="db-game-dot" style="background:#d946ef;"></span>슬롯</div>
              <div class="db-game-info">
                <div class="db-game-val" id="gv-slot">+₩0</div>
                <div class="db-game-sub"><span>베팅: <b id="gv-slot-bet">₩0</b></span><span>당첨: <b id="gv-slot-win">₩0</b></span><span style="color:var(--red);">롤링: <b id="gv-slot-roll">₩0</b></span></div>
              </div>
            </div>
            <div class="db-bar-wrap"><div class="db-bar bet" id="bar-slot-bet" style="width:0%;"></div></div>
          </div>
          <div class="db-game-item">
            <div class="db-game-top">
              <div class="db-game-label"><span class="db-game-dot" style="background:#22c55e;"></span>미니게임</div>
              <div class="db-game-info">
                <div class="db-game-val" id="gv-sport">+₩0</div>
                <div class="db-game-sub"><span>베팅: <b id="gv-sport-bet">₩0</b></span><span>당첨: <b id="gv-sport-win">₩0</b></span><span style="color:var(--red);">롤링: <b id="gv-sport-roll">₩0</b></span></div>
              </div>
            </div>
            <div class="db-bar-wrap"><div class="db-bar bet" id="bar-sport-bet" style="width:0%;"></div></div>
          </div>
          <div class="db-game-item">
            <div class="db-game-top">
              <div class="db-game-label"><span class="db-game-dot" style="background:var(--text3);"></span>호텔카지노</div>
              <div class="db-game-info">
                <div class="db-game-val" id="gv-hotel">+₩0</div>
                <div class="db-game-sub"><span>베팅: <b id="gv-hotel-bet">₩0</b></span><span>당첨: <b id="gv-hotel-win">₩0</b></span><span style="color:var(--red);">롤링: <b id="gv-hotel-roll">₩0</b></span></div>
              </div>
            </div>
            <div class="db-bar-wrap"><div class="db-bar bet" id="bar-hotel-bet" style="width:0%;"></div></div>
          </div>
        </div>
      </div>
      <div class="db-section db-realtime-panel" style="flex:1;">
        <div class="db-section-head"><span><i class="fa-solid fa-wave-square" style="margin-right:6px;"></i>실시간 접속자</span><div class="db-rt-live-dot"></div></div>
        <div class="db-rt-body">
          <div class="db-rt-big" id="db-rt-total">0<div class="db-rt-unit">명 접속중</div></div>
          <div class="db-rt-grid">
            <div class="db-rt-item"><b id="db-rt-casino" style="color:var(--red);">0</b><span>카지노</span></div>
            <div class="db-rt-item"><b id="db-rt-slot" style="color:var(--purple);">0</b><span>슬롯</span></div>
            <div class="db-rt-item"><b id="db-rt-sport" style="color:var(--green);">0</b><span>스포츠</span></div>
            <div class="db-rt-item"><b id="db-rt-etc" style="color:var(--teal);">0</b><span>기타</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 최근 입금 / 출금 / 문의 -->
    <div class="db-three-col">
      <div class="db-section" style="margin-bottom:0;">
        <div class="db-section-head"><span>최근 입금</span></div>
        <table class="db-table">
          <thead>
            <tr><th>#</th><th>닉네임</th><th>금액</th><th>상태</th></tr>
          </thead>
          <tbody id="db-recent-dep">
            <tr><td colspan="4" style="color:var(--text3);">데이터 없음</td></tr>
          </tbody>
        </table>
      </div>
      <div class="db-section" style="margin-bottom:0;">
        <div class="db-section-head"><span>최근 출금</span></div>
        <table class="db-table">
          <thead>
            <tr><th>#</th><th>닉네임</th><th>금액</th><th>상태</th></tr>
          </thead>
          <tbody id="db-recent-wit">
            <tr><td colspan="4" style="color:var(--text3);">데이터 없음</td></tr>
          </tbody>
        </table>
      </div>
      <div class="db-section" style="margin-bottom:0;">
        <div class="db-section-head"><span>최근 문의</span></div>
        <table class="db-table">
          <thead>
            <tr><th>#</th><th>닉네임</th><th>제목</th><th>상태</th></tr>
          </thead>
          <tbody id="db-recent-inquiry">
            <tr><td colspan="4" style="color:var(--text3);">데이터 없음</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // 대시보드 실제 데이터 연동 (서버 API)
  window._loadDashboardData = async function() {
    try {

      var _tk = sessionStorage.getItem('adminToken') || '';
      var _authH = { 'Authorization': 'Bearer ' + _tk };
      var _results = await Promise.all([
        fetch('/api/admin/transfers', {headers:_authH}).then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; }),
        fetch('/api/admin/users', {headers:_authH}).then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; }),
        (function(){ var k=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10); return fetch('/api/hl/transactions/local?types=bet,win&perPage=10000&start='+encodeURIComponent(k+' 00:00:00')+'&end='+encodeURIComponent(k+' 23:59:59'),{headers:_authH}).then(function(r){return r.json();}).catch(function(){ return {data:[]}; }); })(),
        fetch('/api/auth/online',{headers:_authH}).then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; }),
        fetch('/api/admin/partner-tree',{headers:_authH}).then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; })
      ]);
      var trRes = _results[0];
      var memberRes = _results[1];
      var betRes = _results[2];
      var onlineRes = _results[3];
      var ptRes = _results[4];

      var transfers = trRes.data  || [];
      var members   = memberRes.data || [];
      var txs       = betRes.data || [];
      var onlineUsers = onlineRes.data || [];
      var partnerTree = ptRes.data || [];

      // 파트너트리에서 파트너 ID 추출 (member/admin 제외)
      var partnerIds = {};
      var memberIds = {};
      function walkTree(nodes) {
        (nodes||[]).forEach(function(n) {
          if(n.level === 'member') { memberIds[n.id] = true; }
          else if(n.level !== 'admin') { partnerIds[n.id] = true; }
          if(n.children) walkTree(n.children);
        });
      }
      walkTree(partnerTree);

      // 파트너/회원 분류 (트리에 없는 유저는 회원으로 간주)
      var partnerUsers = members.filter(function(u) { return partnerIds[u.username]; });
      var memberUsers = members.filter(function(u) { return !partnerIds[u.username]; });

      var deps = transfers.filter(function(x){ return x.type === 'deposit'; });
      var wits = transfers.filter(function(x){ return x.type === 'withdraw'; });

      var memberMoney = memberUsers.reduce(function(s,x){ return s+(x.money||0); }, 0);
      // 파트너 머니는 트리 데이터 기준 (트리가 원본)
      var partnerMoney = 0;
      (function calcPartnerMoney(nodes) {
        (nodes||[]).forEach(function(n) {
          if (n.level !== 'admin' && n.level !== 'member') partnerMoney += (n.money || 0);
          if (n.children) calcPartnerMoney(n.children);
        });
      })(partnerTree);

      // 베팅 데이터
      var bets = txs.filter(function(t){ return t.type === 'bet'; });
      var wins = txs.filter(function(t){ return t.type === 'win'; });

      // ── 4 상단 카드 업데이트 ──
      var memberRolling = memberUsers.reduce(function(s,x){ return s+((x.point||0)+(x.rollingPoint||0)); }, 0);
      var partnerRolling = 0;
      (function calcPartnerRolling(nodes) {
        (nodes||[]).forEach(function(n) {
          if (n.level !== 'admin' && n.level !== 'member') partnerRolling += ((n.point||0)+(n.rollingPoint||0));
          if (n.children) calcPartnerRolling(n.children);
        });
      })(partnerTree);
      var e;
      e = document.getElementById('dsc-member-money'); if(e) e.textContent = '₩' + memberMoney.toLocaleString();
      e = document.getElementById('dsc-member-rolling'); if(e) e.textContent = '₩' + memberRolling.toLocaleString();
      e = document.getElementById('dsc-partner-money'); if(e) e.textContent = '₩' + partnerMoney.toLocaleString();
      e = document.getElementById('dsc-partner-rolling'); if(e) e.textContent = '₩' + partnerRolling.toLocaleString();

      // ── 게임별 수익 바 차트 ──
      var gameMap = { casino: {bet:0,win:0,roll:0}, slot: {bet:0,win:0,roll:0}, sport: {bet:0,win:0,roll:0}, hotel: {bet:0,win:0,roll:0} };
      function classifyVendor(v) {
        v = (v||'').toLowerCase();
        if(v.indexOf('pragmatic')!==-1 && v.indexOf('pragmatic_live')===-1 && v.indexOf('pragmaticlive')===-1) return 'slot';
        if(v.indexOf('casino')!==-1 || v.indexOf('baccarat')!==-1 || v.indexOf('roulette')!==-1 || v.indexOf('blackjack')!==-1 || v.indexOf('dream')!==-1 || v.indexOf('evolution')!==-1 || v.indexOf('pragmatic_live')!==-1 || v.indexOf('pragmaticlive')!==-1 || v==='ag' || v==='sa' || v==='wm' || v==='dg' || v==='og' || v.indexOf('mg_live')!==-1 || v.indexOf('allbet')!==-1 || v.indexOf('bbin_live')!==-1 || v.indexOf('sexy')!==-1 || v.indexOf('venus')!==-1 || v==='big') return 'casino';
        if(v.indexOf('slot')!==-1 || v.indexOf('habanero')!==-1 || v.indexOf('cq9')!==-1 || v.indexOf('jili')!==-1 || v==='pg' || v.indexOf('booongo')!==-1 || v.indexOf('netent')!==-1 || v.indexOf('ygg')!==-1 || v.indexOf('nolimit')!==-1 || v.indexOf('hacksaw')!==-1 || v.indexOf('micro')!==-1 || v.indexOf('bbin')!==-1 || v.indexOf('fishing')!==-1) return 'slot';
        if(v.indexOf('sport')!==-1 || v.indexOf('bti')!==-1 || v.indexOf('pinnacle')!==-1 || v.indexOf('sbo')!==-1) return 'sport';
        if(v.indexOf('hotel')!==-1) return 'hotel';
        return 'slot';
      }
      bets.forEach(function(t) {
        var vendor = (t.details && t.details.game && t.details.game.vendor) || t.vendor || t.game_provider || '';
        var cat = classifyVendor(vendor);
        var amt = Math.abs(t.amount || 0);
        gameMap[cat].bet += amt;
        gameMap[cat].roll += Math.floor(amt * 0.01);
      });
      wins.forEach(function(t) {
        var vendor = (t.details && t.details.game && t.details.game.vendor) || t.vendor || t.game_provider || '';
        var cat = classifyVendor(vendor);
        gameMap[cat].win += Math.abs(t.amount || 0);
      });

      var maxBet = Math.max(gameMap.casino.bet, gameMap.slot.bet, gameMap.sport.bet, gameMap.hotel.bet, 1);
      ['casino','slot','sport','hotel'].forEach(function(key) {
        var profit = gameMap[key].bet - gameMap[key].win;
        var betPct = Math.round(gameMap[key].bet / maxBet * 100);
        var barBet = document.getElementById('bar-' + key + '-bet');
        if(barBet) barBet.style.width = betPct + '%';
        var valEl = document.getElementById('gv-' + key);
        if(valEl) {
          var sign = profit >= 0 ? '+' : '-';
          valEl.textContent = sign + '₩' + Math.abs(profit).toLocaleString();
          valEl.style.color = profit >= 0 ? 'var(--green)' : 'var(--red)';
        }
        var betEl = document.getElementById('gv-' + key + '-bet');
        if(betEl) betEl.textContent = '₩' + gameMap[key].bet.toLocaleString();
        var winEl = document.getElementById('gv-' + key + '-win');
        if(winEl) winEl.textContent = '₩' + gameMap[key].win.toLocaleString();
        var rollEl = document.getElementById('gv-' + key + '-roll');
        if(rollEl) rollEl.textContent = '₩' + gameMap[key].roll.toLocaleString();
      });

      // ── 실시간 접속자 (최근 베팅 기반 게임 분류) ──
      var rtTotal = document.getElementById('db-rt-total');
      if(rtTotal) rtTotal.innerHTML = onlineUsers.length + '<span class="db-rt-unit">명 접속중</span>';

      var onlineIds = onlineUsers.map(function(u){ return u.username; });
      var rtCasino = 0, rtSlot = 0, rtMini = 0, rtEtc = 0;
      // 온라인 유저별 최근 베팅에서 게임 종류 판별
      var userLastGame = {};
      bets.forEach(function(t) {
        var uname = (t.user && t.user.username) || t.username || '';
        if(onlineIds.indexOf(uname) === -1) return;
        var prevTime = userLastGame[uname] ? userLastGame[uname].time : '';
        var curTime = t.datetime || t.created_at || '';
        if(curTime >= prevTime) {
          var vendor = (t.details && t.details.game && t.details.game.vendor) || t.vendor || t.game_provider || '';
          userLastGame[uname] = { time: curTime, vendor: vendor };
        }
      });
      onlineUsers.forEach(function(u) {
        var info = userLastGame[u.username];
        if(!info) { rtEtc++; return; }
        var cat = classifyVendor(info.vendor);
        if(cat === 'casino' || cat === 'hotel') rtCasino++;
        else if(cat === 'slot') rtSlot++;
        else if(cat === 'sport') rtMini++;
        else rtEtc++;
      });
      var rce = document.getElementById('db-rt-casino'); if(rce) rce.textContent = rtCasino;
      var rse = document.getElementById('db-rt-slot'); if(rse) rse.textContent = rtSlot;
      var rme = document.getElementById('db-rt-sport'); if(rme) rme.textContent = rtMini;
      var ree = document.getElementById('db-rt-etc'); if(ree) ree.textContent = rtEtc;

      // ── 닉네임 조회 헬퍼 ──
      var nickMap = {};
      members.forEach(function(u){ nickMap[u.username] = u.nickname || u.username; });
      function getNick(tr) { return tr.nick || nickMap[tr.userId] || tr.userId || '-'; }

      // ── 최근 입금/출금/문의 테이블 ──
      var recentDeps = deps.slice().sort(function(a,b){ return (b.datetime||b.processedAt||'') > (a.datetime||a.processedAt||'') ? 1 : -1; }).slice(0,5);
      var recentWits = wits.slice().sort(function(a,b){ return (b.datetime||b.processedAt||'') > (a.datetime||a.processedAt||'') ? 1 : -1; }).slice(0,5);
      var depTbody = document.getElementById('db-recent-dep');
      var witTbody = document.getElementById('db-recent-wit');
      if(depTbody) {
        depTbody.innerHTML = recentDeps.length === 0
          ? '<tr><td colspan="4" style="color:var(--text3);">데이터 없음</td></tr>'
          : recentDeps.map(function(x,i){
              var badge = x.status==='approved'?'<span style="color:var(--green);">승인</span>':x.status==='rejected'?'<span style="color:var(--red);">거절</span>':'<span style="color:var(--yellow);">대기</span>';
              return '<tr><td>'+(i+1)+'</td><td>'+getNick(x)+'</td><td style="color:var(--blue);">'+(x.amount||0).toLocaleString()+'</td><td>'+badge+'</td></tr>';
            }).join('');
      }
      if(witTbody) {
        witTbody.innerHTML = recentWits.length === 0
          ? '<tr><td colspan="4" style="color:var(--text3);">데이터 없음</td></tr>'
          : recentWits.map(function(x,i){
              var badge = x.status==='approved'?'<span style="color:var(--green);">승인</span>':x.status==='rejected'?'<span style="color:var(--red);">거절</span>':'<span style="color:var(--yellow);">대기</span>';
              return '<tr><td>'+(i+1)+'</td><td>'+getNick(x)+'</td><td style="color:var(--red);">'+(x.amount||0).toLocaleString()+'</td><td>'+badge+'</td></tr>';
            }).join('');
      }
      // ── 최근 문의 ──
      var inqTbody = document.getElementById('db-recent-inquiry');
      if(inqTbody) {
        fetch('/api/admin/inquiries').then(function(r){ return r.json(); }).then(function(res){
          var list = (res.data||[]).slice(0,5);
          inqTbody.innerHTML = list.length === 0
            ? '<tr><td colspan="4" style="color:var(--text3);">데이터 없음</td></tr>'
            : list.map(function(q,i){
                var badge = q.status==='done'?'<span style="color:var(--green);">완료</span>':'<span style="color:var(--yellow);">대기</span>';
                return '<tr><td>'+(i+1)+'</td><td>'+(q.nick||nickMap[q.userId]||q.userId||'-')+'</td><td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(q.title||q.subject||'-')+'</td><td>'+badge+'</td></tr>';
              }).join('');
        }).catch(function(){});
      }
    } catch(e){ console.error('dashboard data error', e); }
  };
  // 정의 후 즉시 실행
  if (sessionStorage.getItem('adminToken')) _loadDashboardData();

}

// ── 사이드바 UI 동기화 (해시 변경 없이 순수 UI만) ──
function syncSidebar(page) {
  document.querySelectorAll('.sub-item.active').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-single').forEach(function(el) { el.classList.remove('active'); });

  if(page === 'dashboard') {
    document.querySelector('.nav-single[data-page="dashboard"]').classList.add('active');
    document.querySelectorAll('.nav-group.open').forEach(function(g) { g.classList.remove('open'); });
    return;
  }

  const target = document.querySelector('.sub-item[data-page="' + page + '"]');
  if(target) {
    const group = target.closest('.nav-group');
    document.querySelectorAll('.nav-group.open').forEach(function(g) { g.classList.remove('open'); });
    if(group) group.classList.add('open');
    target.classList.add('active');
  }
}

// ── 콘텐츠 렌더 ──
function renderPage(page) {
  showLoading('pageNav');
  setTimeout(hideLoading, 600);
  renderPersistentTop();
  syncSidebar(page);
  if(page === 'dashboard') {
    renderDashboard();
  } else if(page.startsWith('partner-')) {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderPartnerPage(page);
  } else if(page.startsWith('member-')) {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderMemberPage(page);
  } else if(page === 'money-admin') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderMoneyAdminPage();
  } else if(page === 'money-partner') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderMoneyPartnerPage();
  } else if(page === 'money-user') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderMoneyUserPage();
  } else if(page === 'support-notice') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderNoticePage();
  } else if(page === 'transfer-deposit-req') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderTransferDepositReq();
  } else if(page === 'transfer-withdraw-req') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderTransferWithdrawReq();
  } else if(page === 'transfer-deposit-hist') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderTransferDepositHist();
  } else if(page === 'transfer-withdraw-hist') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderTransferWithdrawHist();
  } else if(page === 'support-inquiry-open') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderInquiryOpen();
  } else if(page === 'support-inquiry-done') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderInquiryDone();
  } else if(page === 'support-event') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderEventPage();
  } else if(page === 'betting-all') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderBettingPage('all');
  } else if(page === 'betting-slot') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderBettingPage('slot');
  } else if(page === 'betting-casino') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderBettingPage('casino');
  } else if(page === 'betting-empty') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderEmptyBettingPage();
  } else if(page === 'game-default') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderGameDefault();
  } else if(page === 'game-group') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderGameGroup();
  } else if(page === 'settlement-total') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettlementPage();
  } else if(page === 'settlement-daily') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettlementDailyPage();
  } else if(page === 'settlement-game') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettlementGamePage();
  } else if(page === 'settlement-provider') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettlementProviderPage();
  } else if(page === 'support-quickreply') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderQuickReplyPage();
  } else if(page === 'support-message') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderMessagePage();
  } else if(page === 'point-rolling') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderPointRollingPage();
  } else if(page === 'point-convert') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderPointConvertPage();
  } else if(page === 'point-give') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderPointGivePage();
  } else if(page === 'settings-maxwin') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettingsMaxwin();
  } else if(page === 'settings-partner-perm') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettingsPartnerPerm();
  } else if(page === 'settings-security') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettingsSecurity();
  } else if(page === 'settings-transfer-limit') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettingsTransferLimit();
  } else if(page === 'settings-domain') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettingsDomain();
  } else if(page === 'settings-blocked-ip') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettingsBlockedIp();
  } else if(page === 'settings-login-log') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettingsLoginLog();
  } else if(page === 'settings-telegram') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderSettingsTelegram();
  } else {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    document.getElementById('content').innerHTML =
      '<div class="placeholder">' +
        '<i class="fas fa-circle-notch fa-spin placeholder-icon"></i>' +
        '<p>' + (pageTitles[page] || '') + '</p>' +
      '</div>';
  }
}

// ── 페이지 이동 (해시 push) ──
function navigateToPage(page) {
  location.hash = page;
}

// ── 해시 변경 감지 (뒤로가기/앞으로가기 포함) ──
window.addEventListener('hashchange', function() {
  var page = location.hash.replace('#', '') || 'dashboard';
  renderPage(page);
  if (window.updateTopbarCountsWithAlarm) window.updateTopbarCountsWithAlarm();
});

// ── 대시보드 메뉴 클릭 ──
document.querySelector('.nav-single[data-page="dashboard"]').addEventListener('click', function() {
  navigateToPage('dashboard');
});

// ── 메인 메뉴 아코디언 ──
document.querySelectorAll('.nav-item[data-group]').forEach(function(el) {
  el.addEventListener('click', function() {
    const group = this.closest('.nav-group');
    const isOpen = group.classList.contains('open');
    document.querySelectorAll('.nav-group.open').forEach(function(g) { g.classList.remove('open'); });
    if(!isOpen) group.classList.add('open');
  });
});

// ── 서브메뉴 클릭 ──
document.querySelectorAll('.sub-item').forEach(function(el) {
  el.addEventListener('click', function() {
    navigateToPage(this.dataset.page);
  });
});

// ── 로그아웃 ──
document.getElementById('logout-btn').addEventListener('click', async function() {
  if(!(await customConfirm('로그아웃 하시겠습니까?'))) return;
  fetch('/api/admin/logout', { method: 'POST' }).catch(function(){});
  _adminToken = '';
  sessionStorage.removeItem('adminToken');
  _showLoginScreen();
  document.getElementById('login-id').value = '';
  document.getElementById('login-pw').value = '';
});

// ── 시계 ──
function updateTime() {
  const now = new Date();
  document.getElementById('topbar-time').textContent =
    now.getFullYear() + '.' +
    String(now.getMonth()+1).padStart(2,'0') + '.' +
    String(now.getDate()).padStart(2,'0') + '  ' +
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0') + ':' +
    String(now.getSeconds()).padStart(2,'0');
}
updateTime();
setInterval(updateTime, 1000);

// ── 초기 진입: 해시 읽어서 렌더 ──
(function() {
  var page = location.hash.replace('#', '') || 'dashboard';
  renderPage(page);
  if(!location.hash) location.replace('#dashboard');
})();

// ── 에이전트 보유머니 (사이드바) ──
function fetchAgentBalance() {
  // HonorLink 잔고
  fetch('/api/hl/my-info')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var el = document.getElementById('agent-balance-hl');
      if (!el) return;
      var bal = (res && res.balance !== undefined) ? res.balance : (res && res.data && res.data.balance !== undefined ? res.data.balance : null);
      if (bal !== null) {
        el.textContent = Math.floor(Number(bal)).toLocaleString() + ' 원';
        el.style.color = '#60a5fa';
      } else {
        el.textContent = '조회 실패';
        el.style.color = '#f87171';
      }
    })
    .catch(function() {
      var el = document.getElementById('agent-balance-hl');
      if (el) { el.textContent = '연결 오류'; el.style.color = '#f87171'; }
    });

  // CS API 잔고
  fetch('/api/game/aginfo')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var el = document.getElementById('agent-balance-cs');
      if (!el) return;
      if (res && res.result === 1) {
        var bal = Number(res.balance2 || res.balance || 0);
        el.textContent = Math.floor(bal).toLocaleString() + ' 원';
        el.style.color = '#60a5fa';
      } else {
        el.textContent = '조회 실패';
        el.style.color = '#f87171';
      }
    })
    .catch(function() {
      var el = document.getElementById('agent-balance-cs');
      if (el) { el.textContent = '연결 오류'; el.style.color = '#f87171'; }
    });
}
if (sessionStorage.getItem('adminToken')) fetchAgentBalance();
setInterval(function(){ if (sessionStorage.getItem('adminToken')) fetchAgentBalance(); }, 60000);
document.getElementById('agent-balance-refresh').addEventListener('click', function() {
  var hlEl = document.getElementById('agent-balance-hl');
  var csEl = document.getElementById('agent-balance-cs');
  if (hlEl) { hlEl.textContent = '조회중...'; hlEl.style.color = '#aaa'; }
  if (csEl) { csEl.textContent = '조회중...'; csEl.style.color = '#aaa'; }
  fetchAgentBalance();
});

// ── 사이드바 파트너/회원 보유머니·롤링 ──
function fetchSidebarStats() {
  // 파트너 트리 + users.json 동시 조회
  Promise.all([
    fetch('/api/admin/partner-tree').then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; }),
    fetch('/api/admin/users').then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; })
  ]).then(function(results) {
    var tree = results[0].data || [];
    var users = results[1].data || [];

    // 트리에서 파트너 ID 수집
    var partnerIds = {};
    (function walkTree(nodes) {
      (nodes||[]).forEach(function(n) {
        if (n.level !== 'admin' && n.level !== 'member') partnerIds[n.id] = true;
        if (n.children) walkTree(n.children);
      });
    })(tree);

    // 파트너 머니는 트리에서 (트리가 파트너 원본)
    var pMoney = 0, pRolling = 0;
    (function calcPartner(nodes) {
      (nodes||[]).forEach(function(n) {
        if (n.level !== 'admin' && n.level !== 'member') {
          pMoney += Number(n.money || 0);
          pRolling += Number((n.point||0) + (n.rollingPoint||0));
        }
        if (n.children) calcPartner(n.children);
      });
    })(tree);

    // 회원 = 파트너가 아닌 유저
    var members = users.filter(function(u) {
      return !partnerIds[u.username] && !partnerIds[u.id];
    });

    // API 연동 중인 회원의 게임사 잔액 조회
    var apiMembers = members.filter(function(u) { return u.api && u.api.length > 0; });
    var balancePromises = apiMembers.map(function(u) {
      return fetch('/api/auth/balance?userId=' + encodeURIComponent(u.id))
        .then(function(r){ return r.json(); })
        .then(function(d){ return { id: u.id, balance: Number(d.balance) || 0 }; })
        .catch(function(){ return { id: u.id, balance: Number(u.money) || 0 }; });
    });

    Promise.all(balancePromises).then(function(balResults) {
      var balMap = {};
      balResults.forEach(function(b){ balMap[b.id] = b.balance; });

      var mMoney = 0, mRolling = 0;
      members.forEach(function(u) {
        // API 연동 중이면 게임사 잔액 포함된 값, 아니면 로컬 머니
        mMoney += (balMap[u.id] !== undefined) ? balMap[u.id] : Number(u.money || 0);
        mRolling += Number((u.point||0) + (u.rollingPoint||0));
      });

      var e1 = document.getElementById('sidebar-partner-money'); if(e1) e1.textContent = Math.floor(pMoney).toLocaleString() + ' 원';
      var e2 = document.getElementById('sidebar-partner-rolling'); if(e2) e2.textContent = Math.floor(pRolling).toLocaleString() + ' P';
      var e3 = document.getElementById('sidebar-member-money'); if(e3) e3.textContent = Math.floor(mMoney).toLocaleString() + ' 원';
      var e4 = document.getElementById('sidebar-member-rolling'); if(e4) e4.textContent = Math.floor(mRolling).toLocaleString() + ' P';
    });
  }).catch(function(){});
}
if (sessionStorage.getItem('adminToken')) fetchSidebarStats();
setInterval(function(){ if (sessionStorage.getItem('adminToken')) fetchSidebarStats(); }, 60000);
document.getElementById('sidebar-stats-refresh').addEventListener('click', function() {
  var icon = this.querySelector('i') || this;
  icon.style.transform = 'rotate(360deg)';
  setTimeout(function(){ icon.style.transform = ''; }, 600);
  fetchSidebarStats();
});

// ── 즐겨찾기 ──
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('admin-favorites') || '[]'); } catch(e) { return []; }
}
function saveFavorites(list) {
  localStorage.setItem('admin-favorites', JSON.stringify(list));
}
function updateFavStars() {
  var favs = getFavorites();
  document.querySelectorAll('.sub-item[data-page]').forEach(function(item) {
    // 즐겨찾기 메뉴 자체는 제외
    if(item.closest('#fav-menu')) return;
    var star = item.querySelector('.fav-star');
    var isFav = favs.indexOf(item.dataset.page) !== -1;
    if(isFav && !star) {
      var s = document.createElement('i');
      s.className = 'fas fa-star fav-star';
      s.style.cssText = 'color:#fbbf24;font-size:0.55rem;margin-left:6px;';
      item.appendChild(s);
    } else if(!isFav && star) {
      star.remove();
    }
  });
}
function renderFavMenu() {
  var menu = document.getElementById('fav-menu');
  if(!menu) return;
  var favs = getFavorites();
  updateFavStars();
  if(favs.length === 0) {
    menu.innerHTML = '<li style="padding:6px 16px 6px 42px;font-size:0.72rem;color:var(--text3);">우클릭으로 메뉴 추가</li>';
    return;
  }
  menu.innerHTML = favs.map(function(f) {
    var title = (pageTitles[f] || f).split(' > ').pop();
    return '<li class="sub-item" data-page="'+f+'" style="display:flex;justify-content:space-between;align-items:center;">'
      + '<span>'+title+'</span>'
      + '<button class="fav-remove" data-page="'+f+'" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:0.65rem;padding:0 4px;" title="즐겨찾기 해제"><i class="fas fa-times"></i></button>'
      + '</li>';
  }).join('');
  // 삭제 버튼
  menu.querySelectorAll('.fav-remove').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var page = btn.dataset.page;
      var title = (pageTitles[page] || page).split(' > ').pop();
      var list = getFavorites().filter(function(f){ return f !== page; });
      saveFavorites(list);
      renderFavMenu();
      showFavToast('⭐ "'+title+'" 즐겨찾기 해제', false);
    });
  });
  // 클릭 이동
  menu.querySelectorAll('.sub-item').forEach(function(item) {
    item.addEventListener('click', function() {
      renderPage(item.dataset.page);
    });
  });
}
renderFavMenu();

// 즐겨찾기 토스트
function showFavToast(msg, isAdd) {
  var old = document.getElementById('fav-toast');
  if(old) old.remove();
  var t = document.createElement('div');
  t.id = 'fav-toast';
  t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);z-index:999999;background:var(--bg);border:1px solid '+(isAdd?'#fbbf24':'#f87171')+';border-radius:12px;padding:24px 36px;text-align:center;box-shadow:0 20px 60px var(--shadow);opacity:0;transition:all 0.25s ease;';
  t.innerHTML = '<div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:'+(isAdd?'rgba(251,191,36,0.15)':'rgba(248,113,113,0.15)')+';margin-bottom:12px;">'
    + '<i class="fas fa-star" style="font-size:1.3rem;color:'+(isAdd?'#fbbf24':'#f87171')+';"></i>'
    + '</div>'
    + '<div style="font-size:0.95rem;color:var(--text1);font-weight:600;">'+msg+'</div>';
  document.body.appendChild(t);
  requestAnimationFrame(function(){ t.style.opacity='1'; t.style.transform='translate(-50%,-50%) scale(1)'; });
  setTimeout(function(){
    t.style.opacity='0'; t.style.transform='translate(-50%,-50%) scale(0.8)';
    setTimeout(function(){ t.remove(); }, 250);
  }, 1200);
}

// 우클릭 즐겨찾기 추가
document.querySelectorAll('.sub-item[data-page]').forEach(function(item) {
  item.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    var page = item.dataset.page;
    if(!page) return;
    var title = (pageTitles[page] || page).split(' > ').pop();
    var favs = getFavorites();
    if(favs.indexOf(page) !== -1) {
      favs = favs.filter(function(f){ return f !== page; });
      saveFavorites(favs);
      renderFavMenu();
      showFavToast('⭐ "'+title+'" 즐겨찾기 해제', false);
      return;
    }
    favs.push(page);
    saveFavorites(favs);
    renderFavMenu();
    showFavToast('⭐ "'+title+'" 즐겨찾기 추가', true);
  });
});

// ── 테마 전환 (다크/화이트) ──
(function() {
  var saved = localStorage.getItem('admin-theme') || 'dark';
  applyTheme(saved);

  // 상단바 승인대기/충전/환전/고객센터 버튼
  var _topPending = document.getElementById('topbar-pending-btn');
  var _topDeposit = document.getElementById('topbar-deposit-btn');
  var _topWithdraw = document.getElementById('topbar-withdraw-btn');
  var _topCs = document.getElementById('topbar-cs-btn');
  if (_topPending) _topPending.addEventListener('click', function() { navigateToPage('member-pending'); });
  if (_topDeposit) _topDeposit.addEventListener('click', function() { navigateToPage('transfer-deposit-req'); });
  if (_topWithdraw) _topWithdraw.addEventListener('click', function() { navigateToPage('transfer-withdraw-req'); });
  if (_topCs) _topCs.addEventListener('click', function() { navigateToPage('support-inquiry-open'); });

  // ── 알람 설정 ──
  var _alarmSettings = JSON.parse(localStorage.getItem('admin-alarm-settings') || '{}');
  if (typeof _alarmSettings.deposit === 'undefined') _alarmSettings.deposit = true;
  if (typeof _alarmSettings.withdraw === 'undefined') _alarmSettings.withdraw = true;
  if (typeof _alarmSettings.inquiry === 'undefined') _alarmSettings.inquiry = true;
  if (typeof _alarmSettings.member === 'undefined') _alarmSettings.member = true;
  if (typeof _alarmSettings.sound === 'undefined') _alarmSettings.sound = true;
  if (typeof _alarmSettings.volume === 'undefined') _alarmSettings.volume = 70;
  localStorage.setItem('admin-alarm-settings', JSON.stringify(_alarmSettings));

  var _prevCounts = { deposit: -1, withdraw: -1, inquiry: -1, member: -1 };
  var _alarmDismissed = false;

  // 브라우저 알림 권한 요청
  if ('Notification' in window && Notification.permission === 'default') {
    document.addEventListener('click', function _reqNoti() {
      Notification.requestPermission();
      document.removeEventListener('click', _reqNoti);
    });
  }

  // ── 오디오 언락 + 알림음 시스템 ──
  // 브라우저 autoplay 정책: 사용자 상호작용 전에는 audio.play() 차단됨
  // → 첫 클릭/키 입력 시 무음 재생으로 오디오 언락
  var _audioUnlocked = false;
  var _alarmAudio = null; // 재사용할 Audio 엘리먼트

  function _generateAlarmWav() {
    var sampleRate = 22050;
    var duration = 0.8;
    var samples = Math.floor(sampleRate * duration);
    var buffer = new ArrayBuffer(44 + samples * 2);
    var view = new DataView(buffer);
    function writeStr(o, s) { for(var i=0;i<s.length;i++) view.setUint8(o+i, s.charCodeAt(i)); }
    writeStr(0,'RIFF'); view.setUint32(4, 36+samples*2, true); writeStr(8,'WAVE');
    writeStr(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
    view.setUint16(22,1,true); view.setUint32(24,sampleRate,true);
    view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
    writeStr(36,'data'); view.setUint32(40,samples*2,true);
    var notes = [{f:523,s:0,d:0.15},{f:659,s:0.15,d:0.15},{f:784,s:0.3,d:0.15},{f:1047,s:0.45,d:0.35}];
    for(var i=0;i<samples;i++){
      var t=i/sampleRate; var val=0;
      for(var n=0;n<notes.length;n++){
        var note=notes[n];
        if(t>=note.s && t<note.s+note.d){
          var env=Math.exp(-(t-note.s)*8)*0.4;
          val+=Math.sin(2*Math.PI*note.f*(t-note.s))*env;
        }
      }
      var s16=Math.max(-32768,Math.min(32767,Math.floor(val*32767)));
      view.setInt16(44+i*2, s16, true);
    }
    var blob = new Blob([buffer], {type:'audio/wav'});
    return URL.createObjectURL(blob);
  }
  var _alarmAudioUrl = _generateAlarmWav();

  // Audio 엘리먼트 미리 생성 + 로드
  _alarmAudio = new Audio(_alarmAudioUrl);
  _alarmAudio.load(); // 미리 로드

  function _unlockAudio() {
    if (_audioUnlocked) return;
    // 무음으로 재생하여 오디오 언락
    _alarmAudio.volume = 0;
    var p = _alarmAudio.play();
    if (p && p.then) {
      p.then(function() {
        _alarmAudio.pause();
        _alarmAudio.currentTime = 0;
        _alarmAudio.volume = 1;
        _audioUnlocked = true;
        console.log('[Alarm] Audio unlocked');
      }).catch(function(){});
    }
  }

  // 모든 사용자 상호작용에서 오디오 언락 시도
  ['click','keydown','touchstart','mousedown'].forEach(function(evt) {
    document.addEventListener(evt, _unlockAudio, {once: false, passive: true});
  });

  function playAlarmSound(force) {
    if (!force && !_alarmSettings.sound) return;
    try {
      var vol = (_alarmSettings.volume || 70) / 100;
      var audio = new Audio(_alarmAudioUrl);
      audio.volume = vol;
      var p = audio.play();
      if (p && p.then) {
        p.then(function() { _audioUnlocked = true; }).catch(function(){});
      }
    } catch(e) {}
  }

  function showAlarmModal(items) {
    var ex = document.getElementById('alarm-notify-modal');
    if (ex) ex.remove();

    var overlay = document.createElement('div');
    overlay.id = 'alarm-notify-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--shadow);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);opacity:0;transition:opacity 0.3s;';

    var rows = '';
    items.forEach(function(item) {
      rows += '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg2,#1e293b);border-radius:8px;border-left:4px solid ' + item.color + ';">'
        + '<div style="width:32px;height:32px;border-radius:50%;background:' + item.color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas ' + item.icon + '" style="color:#fff;font-size:0.8rem;"></i></div>'
        + '<div style="flex:1;"><div style="font-size:0.85rem;color:var(--text,#e2e8f0);font-weight:600;">' + item.title + '</div>'
        + '<div style="font-size:0.72rem;color:var(--text3,#64748b);margin-top:2px;">' + item.desc + '</div></div>'
        + '<span style="background:' + item.color + ';color:#fff;border-radius:12px;padding:2px 10px;font-size:0.78rem;font-weight:700;">' + item.count + '</span>'
        + '</div>';
    });

    overlay.innerHTML = '<div style="background:var(--bg,#0f172a);border-radius:14px;width:420px;max-width:95vw;box-shadow:0 20px 60px var(--shadow);border:1px solid var(--border,#1e293b);animation:alarmPop 0.3s ease;">'
      + '<style>@keyframes alarmPop{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}</style>'
      + '<div style="padding:20px 24px;border-bottom:1px solid var(--border,#1e293b);display:flex;align-items:center;gap:12px;">'
      + '<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#f97316);display:flex;align-items:center;justify-content:center;animation:bellShake 0.5s ease;"><i class="fas fa-bell" style="color:#fff;font-size:1.1rem;"></i></div>'
      + '<style>@keyframes bellShake{0%,100%{transform:rotate(0)}25%{transform:rotate(15deg)}50%{transform:rotate(-15deg)}75%{transform:rotate(10deg)}}</style>'
      + '<div><div style="font-size:1.05rem;font-weight:700;color:var(--text,#e2e8f0);">알림</div>'
      + '<div style="font-size:0.72rem;color:var(--text3,#64748b);">처리가 필요한 항목이 있습니다</div></div>'
      + '<button id="alarm-notify-close" style="margin-left:auto;background:none;border:none;font-size:1.3rem;color:var(--text3,#64748b);cursor:pointer;">✕</button>'
      + '</div>'
      + '<div style="padding:16px 24px;display:flex;flex-direction:column;gap:8px;">' + rows + '</div>'
      + '<div style="padding:14px 24px;border-top:1px solid var(--border,#1e293b);display:flex;justify-content:flex-end;">'
      + '<button id="alarm-notify-ok" style="padding:8px 28px;border-radius:6px;font-size:0.82rem;border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;cursor:pointer;font-weight:600;">확인</button>'
      + '</div></div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.style.opacity = '1'; });

    var _alarmSoundTimer = null;

    // 즉시 재생 (언락 상태면 바로 울림)
    playAlarmSound(true);
    // 3초마다 반복
    _alarmSoundTimer = setInterval(function(){ playAlarmSound(true); }, 3000);

    // 모달 클릭 시 소리 재생 (사용자 상호작용으로 autoplay 강제 언락)
    overlay.addEventListener('click', function() {
      _unlockAudio();
      playAlarmSound(true);
    });

    function dismissAlarm() {
      if (_alarmSoundTimer) clearInterval(_alarmSoundTimer);
      _alarmDismissed = true;
      sessionStorage.setItem('alarm-dismissed-counts', JSON.stringify(_prevCounts));
      overlay.remove();
    }
    document.getElementById('alarm-notify-close').addEventListener('click', dismissAlarm);
    document.getElementById('alarm-notify-ok').addEventListener('click', dismissAlarm);
  }

  function checkAlarms(depCount, witCount, csCount, memCount) {
    if (_alarmDismissed) {
      // 닫은 후 건수가 새로 증가했을 때만 다시 알림
      if (depCount > _prevCounts.deposit || witCount > _prevCounts.withdraw || csCount > _prevCounts.inquiry || memCount > _prevCounts.member) {
        _alarmDismissed = false;
      } else {
        _prevCounts = { deposit: depCount, withdraw: witCount, inquiry: csCount, member: memCount };
        return;
      }
    }
    var isFirst = _prevCounts.deposit === -1;
    // 첫 로드 시 이전에 dismiss한 건수가 저장되어 있으면 비교
    if (isFirst) {
      try {
        var saved = JSON.parse(sessionStorage.getItem('alarm-dismissed-counts') || 'null');
        if (saved) {
          // 저장된 건수 이하면 알림 안 띄움
          if (depCount <= saved.deposit && witCount <= saved.withdraw && csCount <= saved.inquiry && memCount <= saved.member) {
            _prevCounts = { deposit: depCount, withdraw: witCount, inquiry: csCount, member: memCount };
            _alarmDismissed = true;
            return;
          }
          // 건수가 증가한 항목만 알림
          _prevCounts = saved;
          isFirst = false;
        }
      } catch(e){}
    }
    var items = [];

    if (_alarmSettings.member && memCount > 0 && (isFirst || memCount > _prevCounts.member)) {
      items.push({ title: '가입 승인 대기', desc: isFirst ? '승인 대기중인 회원이 있습니다' : '새로운 가입 신청이 들어왔습니다', count: memCount, color: '#ef4444', icon: 'fa-user-clock' });
    }
    if (_alarmSettings.deposit && depCount > 0 && (isFirst || depCount > _prevCounts.deposit)) {
      items.push({ title: '충전 신청 대기', desc: isFirst ? '처리 대기중인 충전 신청이 있습니다' : '새로운 충전 신청이 들어왔습니다', count: depCount, color: '#3b82f6', icon: 'fa-plus-circle' });
    }
    if (_alarmSettings.withdraw && witCount > 0 && (isFirst || witCount > _prevCounts.withdraw)) {
      items.push({ title: '환전 신청 대기', desc: isFirst ? '처리 대기중인 환전 신청이 있습니다' : '새로운 환전 신청이 들어왔습니다', count: witCount, color: '#f59e0b', icon: 'fa-minus-circle' });
    }
    if (_alarmSettings.inquiry && csCount > 0 && (isFirst || csCount > _prevCounts.inquiry)) {
      items.push({ title: '고객 문의 대기', desc: isFirst ? '미답변 문의가 있습니다' : '새로운 문의가 들어왔습니다', count: csCount, color: '#10b981', icon: 'fa-headset' });
    }

    if (items.length > 0) {
      showAlarmModal(items);
      // 백그라운드 탭일 때 시스템 알림
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        var body = items.map(function(i){ return i.title + ' ' + i.count + '건'; }).join(', ');
        try { new Notification('관리자 알림', { body: body, icon: '/static/logos/logo_white.png', tag: 'admin-alarm' }); } catch(e){}
      }
    }

    _prevCounts = { deposit: depCount, withdraw: witCount, inquiry: csCount, member: memCount };
  }

  // 건수 업데이트 + 알람 체크
  function updateTopbarCountsWithAlarm() {
    var ad = { ready: 0 };

    function tryCheckAlarms() {
      ad.ready++;
      if (ad.ready >= 3) {
        checkAlarms(ad.deposit || 0, ad.withdraw || 0, ad.inquiry || 0, ad.member || 0);
      }
    }

    fetch('/api/admin/users').then(function(r){ return r.json(); }).then(function(res) {
      var users = res.data || res || [];
      var count = users.filter(function(u){ return u.status === 'pending'; }).length;
      var el = document.getElementById('topbar-pending-count');
      if (el) el.textContent = count;
      ad.member = count;
      tryCheckAlarms();
    }).catch(function(){ ad.member = 0; tryCheckAlarms(); });

    fetch('/api/admin/deposits/pending').then(function(r){ return r.json(); }).then(function(res) {
      var depEl = document.getElementById('topbar-deposit-count');
      var witEl = document.getElementById('topbar-withdraw-count');
      if (depEl) depEl.textContent = res.deposit || 0;
      if (witEl) witEl.textContent = res.withdraw || 0;
      ad.deposit = res.deposit || 0;
      ad.withdraw = res.withdraw || 0;
      tryCheckAlarms();
    }).catch(function(){ ad.deposit = 0; ad.withdraw = 0; tryCheckAlarms(); });

    fetch('/api/admin/inquiries').then(function(r){ return r.json(); }).then(function(res) {
      var list = res.data || res || [];
      var count = list.filter(function(q){ return !q.answer && q.status !== 'done'; }).length;
      var el = document.getElementById('topbar-cs-count');
      if (el) el.textContent = count;
      ad.inquiry = count;
      tryCheckAlarms();
    }).catch(function(){ ad.inquiry = 0; tryCheckAlarms(); });
  }
  // 승인/거절 후 알림 상태 리셋 (건수 변동 감지를 위해)
  window.resetAlarmState = function() {
    _alarmDismissed = false;
    _prevCounts = { deposit: -1, withdraw: -1, inquiry: -1, member: -1 };
    sessionStorage.removeItem('alarm-dismissed-counts');
  };
  window.updateTopbarCountsWithAlarm = updateTopbarCountsWithAlarm;
  if (sessionStorage.getItem('adminToken')) updateTopbarCountsWithAlarm();
  setInterval(function(){ if (sessionStorage.getItem('adminToken')) updateTopbarCountsWithAlarm(); }, 3000);

  // 백그라운드에서 돌아올 때 즉시 체크
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      updateTopbarCountsWithAlarm();
    }
  });

  // 알람 설정 모달
  document.getElementById('topbar-alarm-btn').addEventListener('click', function() {
    var ex = document.getElementById('alarm-settings-modal');
    if (ex) { ex.remove(); return; }

    var overlay = document.createElement('div');
    overlay.id = 'alarm-settings-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--shadow);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

    function chk(key, label, color) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg2,#1e293b);border-radius:8px;">'
        + '<div style="display:flex;align-items:center;gap:10px;">'
        + '<div style="width:8px;height:8px;border-radius:50%;background:' + color + ';"></div>'
        + '<span style="font-size:0.85rem;color:var(--text,#e2e8f0);font-weight:500;">' + label + '</span>'
        + '</div>'
        + '<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">'
        + '<input type="checkbox" data-alarm-key="' + key + '" ' + (_alarmSettings[key] ? 'checked' : '') + ' style="opacity:0;width:0;height:0;">'
        + '<span style="position:absolute;top:0;left:0;right:0;bottom:0;background:' + (_alarmSettings[key] ? color : '#475569') + ';border-radius:12px;transition:0.3s;"></span>'
        + '<span style="position:absolute;top:2px;left:' + (_alarmSettings[key] ? '22px' : '2px') + ';width:20px;height:20px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>'
        + '</label></div>';
    }

    overlay.innerHTML = '<div style="background:var(--bg,#0f172a);border-radius:12px;width:380px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.4);border:1px solid var(--border,#1e293b);">'
      + '<div style="padding:18px 24px;border-bottom:1px solid var(--border,#1e293b);display:flex;align-items:center;gap:12px;">'
      + '<div style="width:36px;height:36px;border-radius:50%;background:rgba(167,139,250,0.15);display:flex;align-items:center;justify-content:center;"><i class="fas fa-bell" style="color:#a78bfa;font-size:0.95rem;"></i></div>'
      + '<div><div style="font-size:1rem;font-weight:700;color:var(--text,#e2e8f0);">알람 설정</div>'
      + '<div style="font-size:0.72rem;color:var(--text3,#64748b);">항목별 알림을 ON/OFF 할 수 있습니다</div></div>'
      + '<button id="alarm-close-btn" style="margin-left:auto;background:none;border:none;font-size:1.2rem;color:var(--text3,#64748b);cursor:pointer;">✕</button>'
      + '</div>'
      + '<div style="padding:20px 24px;display:flex;flex-direction:column;gap:8px;">'
      + chk('member', '회원가입 신청', '#ef4444')
      + chk('deposit', '충전 신청', '#3b82f6')
      + chk('withdraw', '환전 신청', '#f59e0b')
      + chk('inquiry', '고객센터 문의', '#10b981')
      + '<div style="margin-top:8px;border-top:1px solid var(--border,#1e293b);padding-top:12px;">'
      + chk('sound', '알림 소리', '#a78bfa')
      + '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg2,#1e293b);border-radius:8px;margin-top:8px;">'
      + '<i class="fas fa-volume-down" style="color:var(--text3);font-size:0.85rem;"></i>'
      + '<input type="range" id="alarm-volume" min="0" max="100" value="' + (_alarmSettings.volume || 70) + '" style="flex:1;height:6px;-webkit-appearance:none;appearance:none;background:linear-gradient(to right,#a78bfa ' + (_alarmSettings.volume || 70) + '%,var(--input-border) ' + (_alarmSettings.volume || 70) + '%);border-radius:3px;outline:none;cursor:pointer;">'
      + '<i class="fas fa-volume-up" style="color:#a78bfa;font-size:0.85rem;"></i>'
      + '<span id="alarm-volume-val" style="font-size:0.78rem;color:var(--text,#e2e8f0);font-weight:600;min-width:32px;text-align:right;">' + (_alarmSettings.volume || 70) + '%</span>'
      + '</div>'
      + '<button id="alarm-test-btn" style="width:100%;margin-top:8px;padding:8px;border-radius:6px;font-size:0.78rem;font-weight:600;border:1px solid #a78bfa;background:rgba(167,139,250,0.08);color:#a78bfa;cursor:pointer;transition:all 0.2s;"><i class="fas fa-play" style="margin-right:6px;"></i>테스트 재생</button>'
      + '</div>'
      + '</div>'
      + '<div style="padding:14px 24px;border-top:1px solid var(--border,#1e293b);text-align:right;">'
      + '<button id="alarm-save-btn" style="padding:8px 24px;border-radius:6px;font-size:0.82rem;border:none;background:#a78bfa;color:#fff;cursor:pointer;font-weight:600;">저장</button>'
      + '</div></div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.getElementById('alarm-close-btn').addEventListener('click', function() { overlay.remove(); });

    // 토글 스위치 시각 업데이트
    overlay.querySelectorAll('input[data-alarm-key]').forEach(function(inp) {
      inp.addEventListener('change', function() {
        var slider = this.nextElementSibling;
        var dot = slider.nextElementSibling;
        var colors = { member:'#ef4444', deposit:'#3b82f6', withdraw:'#f59e0b', inquiry:'#10b981', sound:'#a78bfa' };
        if (this.checked) {
          slider.style.background = colors[this.dataset.alarmKey] || '#a78bfa';
          dot.style.left = '22px';
        } else {
          slider.style.background = '#475569';
          dot.style.left = '2px';
        }
      });
    });

    // 볼륨 슬라이더
    var volSlider = document.getElementById('alarm-volume');
    var volVal = document.getElementById('alarm-volume-val');
    if (volSlider) {
      volSlider.addEventListener('input', function() {
        volVal.textContent = this.value + '%';
        this.style.background = 'linear-gradient(to right,#a78bfa ' + this.value + '%,var(--input-border) ' + this.value + '%)';
      });
    }

    // 테스트 재생
    document.getElementById('alarm-test-btn').addEventListener('click', function() {
      _alarmSettings.volume = parseInt(volSlider.value) || 70;
      playAlarmSound();
    });

    document.getElementById('alarm-save-btn').addEventListener('click', function() {
      overlay.querySelectorAll('input[data-alarm-key]').forEach(function(inp) {
        _alarmSettings[inp.dataset.alarmKey] = inp.checked;
      });
      _alarmSettings.volume = parseInt(volSlider.value) || 70;
      localStorage.setItem('admin-alarm-settings', JSON.stringify(_alarmSettings));
      overlay.remove();
      // 벨 아이콘 색상 업데이트
      var anyOn = _alarmSettings.deposit || _alarmSettings.withdraw || _alarmSettings.inquiry || _alarmSettings.member;
      var bellBtn = document.getElementById('topbar-alarm-btn');
      if (bellBtn) bellBtn.style.color = anyOn ? '#a78bfa' : '#475569';
    });
  });

  // 벨 아이콘 초기 색상
  var _anyAlarmOn = _alarmSettings.deposit || _alarmSettings.withdraw || _alarmSettings.inquiry || _alarmSettings.member;
  var _bellBtn = document.getElementById('topbar-alarm-btn');
  if (_bellBtn) _bellBtn.style.color = _anyAlarmOn ? '#a78bfa' : '#475569';

  document.getElementById('theme-toggle').addEventListener('click', function() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('admin-theme', next);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var icon = document.getElementById('theme-icon');
    var label = document.getElementById('theme-label');
    if(theme === 'light') {
      icon.className = 'fas fa-sun';
      label.textContent = '라이트';
    } else {
      icon.className = 'fas fa-moon';
      label.textContent = '다크';
    }
  }
})();
