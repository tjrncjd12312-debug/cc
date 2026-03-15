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
    if (res.success) _showAdminUI();
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
      // 초기 페이지 렌더
      var page = location.hash.replace('#', '') || 'dashboard';
      renderPage(page);
      fetchAgentBalance();
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
  'game-restrict':           '게임 설정 > 게임사 제한관리',
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
  'settings-settlement':     '설정 및 조회 > 통합 정산 설정',
  'settings-security':       '설정 및 조회 > 보안설정',
  'settings-transfer-limit': '설정 및 조회 > 충환전 제한설정',
  'settings-notice-line':    '설정 및 조회 > 한줄공지글 설정',
  'settings-account':        '설정 및 조회 > 계좌변경건 조회',
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
  setInterval(fetchTopStats, 30000);
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
  _topStatLastFetch = Date.now();

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
    }).catch(function(){});

  // 접속자 수
  fetch('/api/auth/online')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var cnt = (res.data || []).length;
      var el = document.getElementById('ts-online-users'); if(el) el.textContent = cnt;
    }).catch(function(){});

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
    }).catch(function(){});

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

      // 롤링 = 실제 분배된 rollingPoint 합계 (서버 기준)
      var rollingTotal = members.reduce(function(s, x) { return s + (x.rollingPoint || 0); }, 0);
      var b6 = document.getElementById('ts-rolling'); if(b6) b6.textContent = '₩' + rollingTotal.toLocaleString();
    }).catch(function(){});

  // 포인트 전환 (오늘 기준, localStorage)
  var todayStr2 = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0') + '-' + String(new Date().getDate()).padStart(2,'0');
  var pcLogs = [];
  try { pcLogs = pcLogs.concat(JSON.parse(localStorage.getItem('partnerMoneyLog') || '[]').filter(function(l){ return (l.type === 'rolling-convert' || l.type === '롤링전환') && (l.datetime||'').startsWith(todayStr2); })); } catch(ex){}
  try { pcLogs = pcLogs.concat(JSON.parse(localStorage.getItem('adminMoneyLog') || '[]').filter(function(l){ return (l.type === 'rolling-convert' || l.type === '롤링전환') && (l.datetime||'').startsWith(todayStr2); })); } catch(ex){}
  var pcTotal = pcLogs.reduce(function(s,l){ return s + Math.abs(Number(l.amount||0)); }, 0);
  var pcEl1 = document.getElementById('ts-point-convert-cnt'); if(pcEl1) pcEl1.textContent = pcLogs.length + '건';
  var pcEl2 = document.getElementById('ts-point-convert'); if(pcEl2) pcEl2.textContent = '₩' + pcTotal.toLocaleString();
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
  (async function() {
    try {

      var [trRes, memberRes, betRes, onlineRes, ptRes] = await Promise.all([
        fetch('/api/admin/transfers').then(function(r){ return r.json(); }),
        fetch('/api/admin/users').then(function(r){ return r.json(); }),
        (function(){ var k=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10); return fetch('/api/hl/transactions/local?types=bet,win&perPage=10000&start='+encodeURIComponent(k+' 00:00:00')+'&end='+encodeURIComponent(k+' 23:59:59')).then(function(r){return r.json();}); })(),
        fetch('/api/auth/online').then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; }),
        fetch('/api/admin/partner-tree').then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; })
      ]);

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
      var partnerMoney = partnerUsers.reduce(function(s,x){ return s+(x.money||0); }, 0);

      // 베팅 데이터
      var bets = txs.filter(function(t){ return t.type === 'bet'; });
      var wins = txs.filter(function(t){ return t.type === 'win'; });

      // ── 4 상단 카드 업데이트 ──
      var memberRolling = memberUsers.reduce(function(s,x){ return s+((x.point||0)+(x.rollingPoint||0)); }, 0);
      var partnerRolling = partnerUsers.reduce(function(s,x){ return s+((x.point||0)+(x.rollingPoint||0)); }, 0);
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
  })();

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
  } else if(page === 'game-restrict') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderGameRestrict();
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
  } else if(page === 'point-rolling') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderPointRollingPage();
  } else if(page === 'point-convert') {
    document.getElementById('page-title').textContent = pageTitles[page] || page;
    renderPointConvertPage();
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
document.getElementById('logout-btn').addEventListener('click', function() {
  if(!confirm('로그아웃 하시겠습니까?')) return;
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
  fetch('/api/hl/my-info')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var el = document.getElementById('agent-balance-val');
      if (!el) return;
      var bal = (res && res.balance !== undefined) ? res.balance : (res && res.data && res.data.balance !== undefined ? res.data.balance : null);
      if (bal !== null) {
        el.textContent = Number(bal).toLocaleString() + ' 원';
        el.style.color = '#60a5fa';
      } else {
        el.textContent = '조회 실패';
        el.style.color = '#f87171';
      }
    })
    .catch(function() {
      var el = document.getElementById('agent-balance-val');
      if (el) { el.textContent = '연결 오류'; el.style.color = '#f87171'; }
    });
}
fetchAgentBalance();
setInterval(fetchAgentBalance, 30000);
document.getElementById('agent-balance-refresh').addEventListener('click', function() {
  var el = document.getElementById('agent-balance-val');
  el.textContent = '조회중...';
  el.style.color = '#aaa';
  fetchAgentBalance();
});

// ── 테마 전환 (다크/화이트) ──
(function() {
  var saved = localStorage.getItem('admin-theme') || 'dark';
  applyTheme(saved);

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
