// ══ 커스텀 Confirm ══
function customConfirm(message) {
  return new Promise(function(resolve) {
    var existing = document.getElementById('custom-confirm-overlay');
    if(existing) existing.remove();
    var ov = document.createElement('div');
    ov.id = 'custom-confirm-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);opacity:0;transition:opacity 0.2s;';
    ov.innerHTML = '<div style="background:#111827;border:1px solid #1e293b;border-radius:12px;width:380px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.5);animation:cfPop 0.25s ease;">'
      + '<style>@keyframes cfPop{from{transform:scale(0.9) translateY(10px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}</style>'
      + '<div style="padding:24px 24px 16px;text-align:center;">'
      + '<div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:rgba(251,191,36,0.1);margin-bottom:14px;">'
      + '<i class="fas fa-exclamation-triangle" style="font-size:1.3rem;color:#fbbf24;"></i>'
      + '</div>'
      + '<div style="font-size:0.95rem;color:#e2e8f0;line-height:1.6;white-space:pre-line;">' + message + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:10px;padding:8px 24px 24px;">'
      + '<button id="cf-cancel" style="flex:1;padding:11px;border:1px solid #334155;border-radius:8px;background:#1e293b;color:#94a3b8;font-size:0.88rem;font-weight:600;cursor:pointer;">취소</button>'
      + '<button id="cf-ok" style="flex:1;padding:11px;border:none;border-radius:8px;background:linear-gradient(135deg,#d4af37,#b8943b);color:#1a1500;font-size:0.88rem;font-weight:600;cursor:pointer;">확인</button>'
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

// ══ 세션 관리 ══
let _session = null;
try { _session = JSON.parse(sessionStorage.getItem('casino_user') || localStorage.getItem('casino_user') || 'null'); } catch{}

function saveSession(data, remember) {
  _session = data;
  const s = JSON.stringify(data);
  sessionStorage.setItem('casino_user', s);
  if (remember) localStorage.setItem('casino_user', s);
}
function clearSession() {
  _session = null;
  sessionStorage.removeItem('casino_user');
  localStorage.removeItem('casino_user');
}

// ══ 인증 포함 fetch wrapper ══
function authFetch(url, options) {
  options = options || {};
  if (_session && _session.sessionToken) {
    if (!options.headers) options.headers = {};
    // 기존 headers가 Headers 객체일 수도 있으므로 처리
    if (typeof options.headers.set === 'function') {
      options.headers.set('Authorization', 'Bearer ' + _session.sessionToken);
    } else {
      options.headers['Authorization'] = 'Bearer ' + _session.sessionToken;
    }
  }
  return fetch(url, options);
}

// ══ 비활동 자동 로그아웃 (10분) + 접속 유지 핑 + 잔액 갱신 ══
(function() {
  var IDLE_TIMEOUT = 10 * 60 * 1000; // 10분
  var _lastActivity = Date.now();
  var _idleWarned = false;

  // 유저 활동 감지 (마우스, 키보드, 터치, 스크롤)
  ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(function(evt) {
    document.addEventListener(evt, function() {
      _lastActivity = Date.now();
      _idleWarned = false;
    }, { passive: true });
  });

  // 비활동 체크 (30초마다)
  setInterval(function() {
    if (!_session || !_session.id) return;
    var idle = Date.now() - _lastActivity;
    if (idle >= IDLE_TIMEOUT) {
      clearSession();
      renderHeader();
      _showLogoutModal();
    }
  }, 30000);

  function sendPing() {
    if (!_session || !_session.id) return;
    // 활동이 없으면 ping도 보내지 않음 (서버에서 5분 후 오프라인 처리)
    if (Date.now() - _lastActivity > IDLE_TIMEOUT) return;
    authFetch('/api/auth/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: _session.id, sessionToken: _session.sessionToken || '' })
    }).then(function(r){ return r.json(); })
    .then(function(res) {
      if (res.kicked) {
        clearSession();
        renderHeader();
        var kickMsg = res.reason === 'duplicate_login'
          ? '다른 기기에서 로그인하여\n현재 세션이 종료되었습니다.'
          : '세션이 만료되었습니다.\n재로그인 후 이용해주세요.';
        var kickIcon = res.reason === 'duplicate_login'
          ? '<i class="fas fa-user-slash" style="font-size:1.3rem;color:#f87171;"></i>'
          : '<i class="fas fa-ban" style="font-size:1.3rem;color:#fbbf24;"></i>';
        var kov = document.createElement('div');
        kov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);';
        kov.innerHTML = '<div style="background:#111827;border:1px solid #1e293b;border-radius:12px;width:380px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.5);animation:cfPop 0.25s ease;">'
          + '<style>@keyframes cfPop{from{transform:scale(0.9) translateY(10px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}</style>'
          + '<div style="padding:28px 24px 16px;text-align:center;">'
          + '<div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;background:rgba(248,113,113,0.1);margin-bottom:16px;">'
          + kickIcon + '</div>'
          + '<div style="font-size:0.95rem;color:#e2e8f0;line-height:1.7;white-space:pre-line;">' + kickMsg + '</div>'
          + '</div>'
          + '<div style="padding:8px 24px 24px;">'
          + '<button id="kick-ok-btn" style="width:100%;padding:12px;border:none;border-radius:8px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;font-size:0.9rem;font-weight:600;cursor:pointer;">확인</button>'
          + '</div></div>';
        document.body.appendChild(kov);
        document.getElementById('kick-ok-btn').addEventListener('click', function() {
          location.hash = '';
          location.reload();
        });
        return;
      }
    }).catch(function(){});
  }
  var _prevBalance = _session ? Number(_session.balance || 0) : 0;
  window._lastDepositCheck = new Date().toISOString();
  function refreshBalance() {
    if (!_session || !_session.id) return;
    if (Date.now() - _lastActivity > IDLE_TIMEOUT) return;
    authFetch('/api/auth/balance?userId=' + encodeURIComponent(_session.id))
      .then(function(r){ return r.json(); })
      .then(function(res) {
        if (res.success && res.balance !== undefined) {
          var newBal = Number(res.balance);
          var oldBal = _prevBalance;
          _session.balance = res.balance;
          _session.money = res.balance;
          if (res.point !== undefined) _session.point = Number(res.point);
          if (res.rollingPoint !== undefined) _session.rollingPoint = Number(res.rollingPoint);
          var s = JSON.stringify(_session);
          sessionStorage.setItem('casino_user', s);
          if (localStorage.getItem('casino_user')) localStorage.setItem('casino_user', s);
          renderHeader();
          var myBal = document.getElementById('my-balance');
          if (myBal) myBal.textContent = newBal.toLocaleString() + ' 원';
          var myPt = document.getElementById('my-point');
          if (myPt) myPt.textContent = ((_session.point||0)+(_session.rollingPoint||0)).toLocaleString() + 'P';
          // 충전 승인 확인 → 충전 완료 알림
          if (newBal > oldBal && _session && _session.username) {
            authFetch('/api/user/last-approved-deposit?username=' + encodeURIComponent(_session.username) + '&since=' + encodeURIComponent(window._lastDepositCheck || ''))
              .then(function(r){ return r.json(); })
              .then(function(d) {
                if (d.success && d.approved) {
                  _showDepositCompleteModal(d.amount, newBal);
                  window._lastDepositCheck = d.processedAt;
                }
              }).catch(function(){});
          }
          _prevBalance = newBal;
        }
      }).catch(function(){});
  }
  sendPing();
  refreshBalance();
  setInterval(sendPing, 3000);
  setInterval(refreshBalance, 3000);

  // 한줄공지 + 자동로그아웃 설정 로드
  fetch('/api/user/public-settings')
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data.success) {
        // 한줄공지
        if (data.noticeLineEnabled && data.noticeLine) {
          var bar = document.getElementById('notice-line-bar');
          var txt = document.getElementById('notice-line-text');
          if (bar && txt) {
            txt.textContent = '📢 ' + data.noticeLine;
            bar.style.display = 'block';
          }
        }
        // 자동 로그아웃 시간 적용
        if (data.autoLogout && data.autoLogout > 0) {
          IDLE_TIMEOUT = data.autoLogout * 60 * 1000;
        }
      }
    }).catch(function(){});
})();
function renderHeader() {
  const right = document.getElementById('hdr-auth');
  if (!right) return;
  if (_session) {
    right.innerHTML = '<span style="font-size:0.82rem;color:var(--gold2);margin-right:6px;">' + (_session.nickname||_session.username) + '님</span>'
      + '<span style="font-size:0.78rem;color:var(--text2);margin-right:10px;">' + Number(_session.balance||0).toLocaleString() + '원</span>'
      + '<button class="btn-filled" style="background:#1a5c2e;border-color:#1a5c2e;margin-right:4px;" onclick="openModal(\'deposit\')">충전</button>'
      + '<button class="btn-filled" style="background:#5c1a1a;border-color:#5c1a1a;margin-right:4px;" onclick="openModal(\'withdraw\')">환전</button>'
      + '<button class="btn-ghost" onclick="openMypage()">마이페이지</button>';
  } else {
    right.innerHTML = `<button class="btn-ghost" onclick="openModal('login')">로그인</button>`
  + `<button class="btn-filled" onclick="openModal('register')">회원가입</button>`;
  }
}

// ══ 로그인 팝업 공지 ══
function _loginHideKey(title) { return 'loginhide_' + title; }
function _loginTodayStr() { var d = new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function _loginIsHidden(title) { return localStorage.getItem(_loginHideKey(title)) === _loginTodayStr(); }
function _loginSetHide(title) { localStorage.setItem(_loginHideKey(title), _loginTodayStr()); }

async function showLoginPopupNotices() {
  try {
    // 공지사항
    var res = await authFetch('/api/user/notices');
    var data = await res.json();
    var all = data.success ? (data.data || []) : [];
    all.sort(function(a,b){ return (a.rank||99)-(b.rank||99); });
    // 이벤트
    var evRes = await authFetch('/api/user/events');
    var evData = await evRes.json();
    var evAll = (evData.data || []).filter(function(ev){ return ev.loginPopup; });
    // 합치기 (공지 먼저, 이벤트 뒤)
    var loginList = all.filter(function(n){ return n.loginPopup && !_loginIsHidden(n.title); });
    evAll.forEach(function(ev){ if(!_loginIsHidden(ev.title)) loginList.push(ev); });
    if(loginList.length === 0) return;

    var ovId = 'nc-login-overlay';
    var existing = document.getElementById(ovId);
    if(existing) existing.remove();

    var ov = document.createElement('div');
    ov.id = ovId;
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;';

    var cardsHtml = loginList.map(function(n){
      var hasImg = n.image && n.image.length > 0;
      return '<div class="nc-popup-card" data-title="'+encodeURIComponent(n.title)+'" style="background:#111118;border:1px solid #d4af37;width:280px;height:496px;flex-shrink:0;position:relative;overflow:hidden;">'
        + '<div style="position:absolute;top:7px;right:8px;z-index:3;"><button class="nc-card-x" style="background:rgba(0,0,0,0.55);border:none;color:#fff;font-size:1rem;cursor:pointer;border-radius:50%;width:28px;height:28px;line-height:1;">✕</button></div>'
        + (hasImg
          ? '<img src="'+n.image+'" style="position:absolute;top:0;left:0;width:280px;height:448px;display:block;object-fit:cover;">'
          : '<div style="position:absolute;top:0;left:0;width:280px;height:448px;box-sizing:border-box;padding:14px 16px;overflow-y:auto;white-space:pre-wrap;line-height:1.75;color:#ddd;font-size:0.83rem;">'
          +   '<div style="color:#d4af37;font-weight:700;font-size:0.9rem;margin-bottom:10px;">'+(n.title||'')+'</div>'
          +   (n.content||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          + '</div>')
        + '<div style="position:absolute;bottom:0;left:0;width:280px;height:48px;box-sizing:border-box;border-top:1px solid rgba(212,175,55,0.25);padding:7px 14px;background:#111118;">'
        +   '<button class="nc-card-hide" style="width:252px;height:34px;background:#1c1c28;border:1px solid rgba(212,175,55,0.3);color:#aaa;border-radius:6px;cursor:pointer;font-size:0.78rem;">오늘 하루 이창을 열지 않음</button>'
        + '</div></div>';
    }).join('');

    ov.innerHTML = '<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:nowrap;">'+cardsHtml+'</div>';
    document.body.appendChild(ov);

    ov.querySelectorAll('.nc-popup-card').forEach(function(card){
      var title = decodeURIComponent(card.dataset.title);
      function removeCard() { card.remove(); if(!ov.querySelector('.nc-popup-card')) ov.remove(); }
      card.querySelector('.nc-card-x').addEventListener('click', removeCard);
      card.querySelector('.nc-card-hide').addEventListener('click', function(){ _loginSetHide(title); removeCard(); });
    });
  } catch(e) {}
}

// ══ 로그인 ══
async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('login-remember').checked;
  const errEl = document.getElementById('login-err');
  const btn = document.getElementById('login-btn');
  errEl.style.display = 'none';
  if (!username || !password) { errEl.textContent='아이디와 비밀번호를 입력해주세요.'; errEl.style.display='block'; return; }
  btn.textContent = '로그인 중...'; btn.disabled = true;
  try {
    const res = await fetch('/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.success) { errEl.textContent = data.error || '로그인 실패'; errEl.style.display='block'; return; }
    saveSession(data.data, remember);
    // 로그인 직후 핑 전송 (접속자 표시)
    authFetch('/api/auth/ping', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:data.data.id, sessionToken:data.data.sessionToken||''}) }).catch(function(){});
    // gameGroup이 있으면 페이지 새로고침 (벤더 필터링 적용)
    if (data.data.gameGroup) {
      location.reload();
      return;
    }
    closeModal('login');
    renderHeader();
    showToast('✅ 환영합니다, ' + (data.data.nickname||data.data.username) + '님!');
    // 로그인 팝업 공지 표시
    showLoginPopupNotices();
    document.getElementById('login-username').value='';
    document.getElementById('login-password').value='';
  } catch(e) {
    errEl.textContent = '서버 연결 오류가 발생했습니다.'; errEl.style.display='block';
  } finally {
    btn.textContent = '로그인'; btn.disabled = false;
  }
}

// ══ 회원가입 ══
async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const nickname = document.getElementById('reg-nickname').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;
  const phone    = document.getElementById('reg-phone').value.trim();
  const bank     = document.getElementById('reg-bank').value;
  const account  = document.getElementById('reg-account').value.trim();
  const holder   = document.getElementById('reg-holder').value.trim();
  const referral = document.getElementById('reg-referral').value.trim();
  const agree    = document.getElementById('reg-agree').checked;
  const errEl    = document.getElementById('reg-err');
  const okEl     = document.getElementById('reg-ok');
  const btn      = document.getElementById('reg-btn');
  errEl.style.display='none'; okEl.style.display='none';
  if (!username) { errEl.textContent='아이디를 입력해주세요.'; errEl.style.display='block'; return; }
  if (username.length < 4) { errEl.textContent='아이디는 4자 이상이어야 합니다.'; errEl.style.display='block'; return; }
  if (!nickname) { errEl.textContent='닉네임을 입력해주세요.'; errEl.style.display='block'; return; }
  if (!password || password.length < 6) { errEl.textContent='비밀번호는 6자 이상이어야 합니다.'; errEl.style.display='block'; return; }
  if (password !== password2) { errEl.textContent='비밀번호가 일치하지 않습니다.'; errEl.style.display='block'; return; }
  if (!phone) { errEl.textContent='연락처를 입력해주세요.'; errEl.style.display='block'; return; }
  if (!bank) { errEl.textContent='은행을 선택해주세요.'; errEl.style.display='block'; return; }
  if (!account) { errEl.textContent='계좌번호를 입력해주세요.'; errEl.style.display='block'; return; }
  if (!holder) { errEl.textContent='예금주를 입력해주세요.'; errEl.style.display='block'; return; }
  if (!referral) { errEl.textContent='추천코드를 입력해주세요.'; errEl.style.display='block'; return; }
  if (!agree) { errEl.textContent='이용약관에 동의해주세요.'; errEl.style.display='block'; return; }
  btn.innerHTML='<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>가입 중...'; btn.disabled=true;
  try {
    const res = await fetch('/api/auth/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, nickname, password, phone, bank, account, holder, referral })
    });
    const data = await res.json();
    if (!data.success) { errEl.textContent = data.error||'가입 실패'; errEl.style.display='block'; return; }
    okEl.textContent = '🎉 가입 완료! 관리자 승인 후 이용 가능합니다.'; okEl.style.display='block';
    setTimeout(()=>{ closeModal('register'); switchModal('register','login'); }, 2000);
    ['username','nickname','password','password2','phone','account','holder','referral'].forEach(f => {
      document.getElementById('reg-' + f).value = '';
      document.getElementById('reg-' + f).style.border = '';
      var c = document.getElementById('chk-' + f); if(c) c.className = 'reg-check';
      var m = document.getElementById('msg-' + f); if(m) { m.className = 'reg-msg'; m.textContent = ''; }
    });
    document.getElementById('reg-bank').value='';
    document.getElementById('bank-selected-text').textContent='은행을 선택하세요';
    document.getElementById('bank-selected').classList.remove('has-value');
    document.getElementById('bank-selected').style.border='';
    document.querySelectorAll('.bank-option').forEach(o => o.classList.remove('selected'));
    var bm = document.getElementById('msg-bank'); if(bm) { bm.className='reg-msg'; bm.textContent=''; }
    document.getElementById('reg-agree').checked=false;
  } catch(e) {
    errEl.textContent='서버 연결 오류가 발생했습니다.'; errEl.style.display='block';
  } finally {
    btn.innerHTML='<i class="fas fa-user-plus" style="margin-right:6px;"></i>회원가입'; btn.disabled=false;
  }
}

// ══ 로그아웃 ══
function doLogout() {
  clearSession();
  closeModal('mypage');
  renderHeader();
  showToast('로그아웃 되었습니다.');
}

// ══ 마이페이지 ══
function openMypage() {
  if (!_session) { openModal('login'); return; }
  document.getElementById('my-nickname').textContent = _session.nickname || _session.username;
  document.getElementById('my-username').textContent = '@' + _session.username;
  document.getElementById('my-balance').textContent = Number(_session.balance||0).toLocaleString() + ' 원';
  document.getElementById('my-point').textContent = _getUserPoint().toLocaleString() + 'P';
  const statusMap = { active:'<span style="background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.25);color:#4ade80;padding:4px 12px;border-radius:4px;font-size:0.75rem;font-weight:600;">✅ 정상 이용 중</span>',
    pending:'<span style="background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.25);color:#fbbf24;padding:4px 12px;border-radius:4px;font-size:0.75rem;font-weight:600;">⏳ 승인 대기 중</span>',
    suspended:'<span style="background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25);color:#f87171;padding:4px 12px;border-radius:4px;font-size:0.75rem;font-weight:600;">🚫 이용 정지</span>' };
  document.getElementById('my-status-wrap').innerHTML = statusMap[_session.status] || '';
  openModal('mypage');
}

// Enter 키 로그인
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.getElementById('modal-login').classList.contains('active')) doLogin();
    if (document.getElementById('modal-register').classList.contains('active')) doRegister();
  }
});

// 실시간 필드 검증
(function() {
  function _setField(name, valid, msg) {
    const chk = document.getElementById('chk-' + name);
    const msgEl = document.getElementById('msg-' + name);
    const inp = document.getElementById('reg-' + name);
    if (chk) { chk.className = 'reg-check ' + (valid ? 'valid' : 'invalid'); chk.textContent = valid ? '✔' : '✘'; }
    if (msgEl) { msgEl.className = 'reg-msg ' + (valid ? 'valid' : 'invalid'); msgEl.textContent = msg; }
    if (inp) { inp.style.border = valid ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(248,113,113,0.4)'; }
  }
  function _clearField(name) {
    const chk = document.getElementById('chk-' + name);
    const msgEl = document.getElementById('msg-' + name);
    const inp = document.getElementById('reg-' + name);
    if (chk) { chk.className = 'reg-check'; chk.textContent = ''; }
    if (msgEl) { msgEl.className = 'reg-msg'; msgEl.textContent = ''; }
    if (inp) inp.style.border = '';
  }

  let _refTimer = null;
  document.addEventListener('DOMContentLoaded', () => {
    // 아이디
    let _usernameTimer = null;
    document.getElementById('reg-username').addEventListener('input', function() {
      clearTimeout(_usernameTimer);
      const v = this.value.trim();
      if (!v) return _clearField('username');
      if (v.length < 4) return _setField('username', false, '4자 이상 입력해주세요.');
      _usernameTimer = setTimeout(async () => {
        try {
          const res = await fetch('/api/auth/check-username?username=' + encodeURIComponent(v));
          const data = await res.json();
          if (data.available) _setField('username', true, '사용 가능한 아이디입니다.');
          else _setField('username', false, '이미 사용중인 아이디입니다.');
        } catch(e) { _setField('username', false, '확인 실패'); }
      }, 400);
    });
    // 비밀번호
    document.getElementById('reg-password').addEventListener('input', function() {
      const v = this.value;
      if (!v) return _clearField('password');
      if (v.length < 6) _setField('password', false, '6자 이상 입력해주세요.');
      else _setField('password', true, '사용 가능한 비밀번호입니다.');
      // 비밀번호 확인도 재검증
      const p2 = document.getElementById('reg-password2').value;
      if (p2) {
        if (p2 === v) _setField('password2', true, '비밀번호가 일치합니다.');
        else _setField('password2', false, '비밀번호가 일치하지 않습니다.');
      }
    });
    // 비밀번호 확인
    document.getElementById('reg-password2').addEventListener('input', function() {
      const v = this.value;
      const pw = document.getElementById('reg-password').value;
      if (!v) return _clearField('password2');
      if (v === pw) _setField('password2', true, '비밀번호가 일치합니다.');
      else _setField('password2', false, '비밀번호가 일치하지 않습니다.');
    });
    // 닉네임
    document.getElementById('reg-nickname').addEventListener('input', function() {
      const v = this.value.trim();
      if (!v) return _clearField('nickname');
      _setField('nickname', true, '사용 가능한 닉네임입니다.');
    });
    // 휴대폰
    document.getElementById('reg-phone').addEventListener('input', function() {
      const v = this.value.trim();
      if (!v) return _clearField('phone');
      if (!/^\d+$/.test(v)) _setField('phone', false, '숫자만 입력해주세요.');
      else if (v.length < 10) _setField('phone', false, '올바른 번호를 입력해주세요.');
      else _setField('phone', true, '올바른 번호입니다.');
    });
    // 추천코드 (서버 검증)
    document.getElementById('reg-referral').addEventListener('input', function() {
      clearTimeout(_refTimer);
      const v = this.value.trim();
      if (!v) return _clearField('referral');
      _refTimer = setTimeout(async () => {
        try {
          const res = await fetch('/api/auth/check-referral?code=' + encodeURIComponent(v));
          const data = await res.json();
          if (data.valid) _setField('referral', true, '유효한 추천코드입니다.');
          else _setField('referral', false, '존재하지 않는 추천코드입니다.');
        } catch(e) {}
      }, 400);
    });
    // 계좌번호
    document.getElementById('reg-account').addEventListener('input', function() {
      const v = this.value.trim();
      if (!v) return _clearField('account');
      _setField('account', true, '');
    });
    // 예금주
    document.getElementById('reg-holder').addEventListener('input', function() {
      const v = this.value.trim();
      if (!v) return _clearField('holder');
      _setField('holder', true, '');
    });
  });
})();

// ══ 커스텀 은행 드롭다운 ══
function toggleBankDropdown() {
  const opts = document.getElementById('bank-options');
  const sel = document.getElementById('bank-selected');
  const arrow = document.getElementById('bank-arrow');
  const isOpen = opts.classList.contains('open');
  if (isOpen) {
    opts.classList.remove('open'); sel.classList.remove('open'); arrow.classList.remove('open');
  } else {
    opts.classList.add('open'); sel.classList.add('open'); arrow.classList.add('open');
    document.getElementById('bank-search').value = '';
    filterBanks();
    setTimeout(() => document.getElementById('bank-search').focus(), 50);
  }
}
function selectBank(el) {
  const val = el.dataset.value;
  document.getElementById('reg-bank').value = val;
  document.getElementById('bank-selected-text').textContent = val;
  document.getElementById('bank-selected').classList.add('has-value');
  // 선택 표시
  document.querySelectorAll('.bank-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  // 닫기
  toggleBankDropdown();
  // 검증 표시 (bank는 chk-bank가 없으므로 selected 스타일로 표현)
  document.getElementById('bank-selected').style.border = '1px solid rgba(74,222,128,0.4)';
  var msgEl = document.getElementById('msg-bank');
  if (msgEl) { msgEl.className = 'reg-msg valid'; msgEl.textContent = ''; }
}
function filterBanks() {
  const q = document.getElementById('bank-search').value.trim().toLowerCase();
  document.querySelectorAll('.bank-option').forEach(o => {
    o.style.display = o.dataset.value.toLowerCase().includes(q) ? '' : 'none';
  });
}
// 외부 클릭 시 닫기
document.addEventListener('click', function(e) {
  const dd = document.getElementById('bank-dropdown');
  if (dd && !dd.contains(e.target)) {
    const opts = document.getElementById('bank-options');
    if (opts && opts.classList.contains('open')) toggleBankDropdown();
  }
});

function showToast(msg) {
  let t = document.getElementById('site-toast');
  if (!t) { t = document.createElement('div'); t.id='site-toast';
    t.style.cssText='position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#1a1500,#2a2000);border:1px solid var(--gold);color:var(--gold);padding:12px 20px;border-radius:8px;font-size:0.82rem;z-index:9999;display:none;box-shadow:0 4px 20px rgba(200,168,75,0.3);';
    document.body.appendChild(t); }
  t.textContent = msg; t.style.display='block';
  clearTimeout(t._timer); t._timer = setTimeout(()=>{ t.style.display='none'; }, 3000);
}

// ── 충전 완료 알림 모달 ──
function _showDepositCompleteModal(amount, totalBalance) {
  var existing = document.getElementById('deposit-complete-modal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'deposit-complete-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);opacity:0;transition:opacity 0.3s;';

  overlay.innerHTML = '<div style="background:linear-gradient(180deg,#1a1500 0%,#0d0d0d 100%);border:1px solid var(--gold,#c8a84b);border-radius:16px;width:400px;max-width:90vw;box-shadow:0 20px 60px rgba(200,168,75,0.25);animation:dcPop 0.4s ease;overflow:hidden;">'
    + '<style>'
    + '@keyframes dcPop{from{transform:scale(0.85) translateY(20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}'
    + '@keyframes dcShine{0%{background-position:-200% center}100%{background-position:200% center}}'
    + '@keyframes dcCoin{0%,100%{transform:rotateY(0deg)}50%{transform:rotateY(180deg)}}'
    + '</style>'
    // 상단 아이콘 영역
    + '<div style="text-align:center;padding:28px 24px 12px;">'
    + '<div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#c8a84b,#e8d48b);margin-bottom:14px;animation:dcCoin 1.5s ease-in-out infinite;">'
    + '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1a1500" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a1500">&#8361;</text></svg>'
    + '</div>'
    + '<div style="font-size:1.2rem;font-weight:800;color:var(--gold,#c8a84b);background:linear-gradient(90deg,#c8a84b,#e8d48b,#c8a84b);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:dcShine 2s linear infinite;">충전 완료</div>'
    + '</div>'
    // 금액 정보
    + '<div style="padding:4px 24px 20px;">'
    + '<div style="background:rgba(200,168,75,0.08);border:1px solid rgba(200,168,75,0.2);border-radius:10px;padding:16px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
    + '<span style="font-size:0.8rem;color:#999;">충전 금액</span>'
    + '<span style="font-size:1.1rem;font-weight:700;color:#5cd65c;">+ ' + Number(amount).toLocaleString() + ' 원</span>'
    + '</div>'
    + '<div style="border-top:1px solid rgba(200,168,75,0.15);padding-top:10px;display:flex;justify-content:space-between;align-items:center;">'
    + '<span style="font-size:0.8rem;color:#999;">보유 머니</span>'
    + '<span style="font-size:1.1rem;font-weight:700;color:var(--gold,#c8a84b);">' + Number(totalBalance).toLocaleString() + ' 원</span>'
    + '</div>'
    + '</div>'
    + '</div>'
    // 확인 버튼
    + '<div style="padding:0 24px 24px;">'
    + '<button id="dc-modal-ok" style="width:100%;padding:12px;border:none;border-radius:8px;background:linear-gradient(135deg,#c8a84b,#b8943b);color:#1a1500;font-size:0.9rem;font-weight:700;cursor:pointer;transition:all 0.2s;">확인</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);
  requestAnimationFrame(function() { overlay.style.opacity = '1'; });

  function closeModal() {
    overlay.style.opacity = '0';
    setTimeout(function() { overlay.remove(); }, 300);
  }
  document.getElementById('dc-modal-ok').addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeModal();
  });
}

// ── 고객센터 답변 알림 폴링 ──
var _prevAnsweredIds = null;

function _startInquiryPolling() {
  if (!_session) return;
  // 초기 답변 ID 목록 세팅
  authFetch('/api/user/inquiries?userId=' + encodeURIComponent(_session.username))
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.success) {
        _prevAnsweredIds = {};
        (d.data || []).forEach(function(inq){
          if (inq.status === 'done' && inq.answer) _prevAnsweredIds[inq.id] = true;
        });
      }
    }).catch(function(){});

  setInterval(function(){
    if (!_session || _prevAnsweredIds === null) return;
    authFetch('/api/user/inquiries?userId=' + encodeURIComponent(_session.username))
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (!d.success) return;
        var list = d.data || [];
        list.forEach(function(inq){
          if (inq.status === 'done' && inq.answer && !_prevAnsweredIds[inq.id]) {
            _prevAnsweredIds[inq.id] = true;
            _showInquiryAnswerModal(inq);
          }
        });
      }).catch(function(){});
  }, 5000);
}

function _showInquiryAnswerModal(inq) {
  var existing = document.getElementById('inquiry-answer-modal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'inquiry-answer-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);opacity:0;transition:opacity 0.3s;';

  var title = (inq.title || '').replace(/</g, '&lt;');
  var answer = (inq.answer || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');

  overlay.innerHTML = '<div style="background:linear-gradient(180deg,#0a1628 0%,#0d0d1a 100%);border:1px solid #3b82f6;border-radius:16px;width:440px;max-width:90vw;box-shadow:0 20px 60px rgba(59,130,246,0.25);animation:iqPop 0.4s ease;overflow:hidden;">'
    + '<style>'
    + '@keyframes iqPop{from{transform:scale(0.85) translateY(20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}'
    + '</style>'
    + '<div style="text-align:center;padding:28px 24px 12px;">'
    + '<div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#60a5fa);margin-bottom:14px;">'
    + '<i class="fas fa-comment-dots" style="font-size:1.8rem;color:#fff;"></i>'
    + '</div>'
    + '<div style="font-size:1.2rem;font-weight:800;color:#60a5fa;">답변이 도착했습니다</div>'
    + '</div>'
    + '<div style="padding:4px 24px 20px;">'
    + '<div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:16px;">'
    + '<div style="font-size:0.78rem;color:#64748b;margin-bottom:6px;">문의 제목</div>'
    + '<div style="font-size:0.92rem;font-weight:600;color:#e2e8f0;margin-bottom:14px;">' + title + '</div>'
    + '<div style="border-top:1px solid rgba(59,130,246,0.15);padding-top:12px;">'
    + '<div style="font-size:0.78rem;color:#64748b;margin-bottom:6px;">답변 내용</div>'
    + '<div style="font-size:0.88rem;color:#cbd5e1;line-height:1.6;">' + answer + '</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '<div style="padding:0 24px 24px;">'
    + '<button id="iq-answer-ok" style="width:100%;padding:12px;border:none;border-radius:8px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;">확인</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);
  requestAnimationFrame(function(){ overlay.style.opacity = '1'; });

  function closeModal() {
    overlay.style.opacity = '0';
    setTimeout(function(){ overlay.remove(); }, 300);
  }
  document.getElementById('iq-answer-ok').addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e){
    if (e.target === overlay) closeModal();
  });
}

// 로그인 후 폴링 시작
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(_startInquiryPolling, 2000);
});

// 헤더 초기 렌더
document.addEventListener('DOMContentLoaded', renderHeader);

function openModal(t) {
  if(t === 'deposit') {
    if(!_session) { openModal('login'); return; }
    try { _updateTwMoney(); } catch(e){}
    document.getElementById('deposit-modal').style.display = 'flex';
    document.body.style.overflow='hidden';
    try { switchTransferTab('deposit'); } catch(e){ console.error('switchTransferTab error:', e); }
    return;
  }
  if(t === 'withdraw') {
    if(!_session) { openModal('login'); return; }
    try { _updateTwMoney(); } catch(e){}
    document.getElementById('deposit-modal').style.display = 'flex';
    document.body.style.overflow='hidden';
    try { switchTransferTab('withdraw'); } catch(e){ console.error('switchTransferTab error:', e); }
    return;
  }
  document.getElementById('modal-'+t).classList.add('active');
  document.body.style.overflow='hidden';
}
function closeModal(t) {
  if(t === 'deposit' || t === 'withdraw') {
    document.getElementById('deposit-modal').style.display = 'none';
    document.body.style.overflow='';
    return;
  }
  if(t){ document.getElementById('modal-'+t).classList.remove('active'); }
  else { document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('active')); }
  document.body.style.overflow='';
}

// ── 입금/출금 탭 전환 ──
function switchTransferTab(tab) {
  var depTab = document.getElementById('tw-tab-deposit');
  var witTab = document.getElementById('tw-tab-withdraw');
  var depForm = document.getElementById('tw-deposit-form');
  var witForm = document.getElementById('tw-withdraw-form');
  var depRules = document.getElementById('tw-deposit-rules');
  var witRules = document.getElementById('tw-withdraw-rules');
  var title = document.getElementById('tw-banner-title');
  var ruleHeader = document.getElementById('tw-rule-header');
  if(!depTab || !witTab || !depForm || !witForm) return;

  if(tab === 'deposit') {
    depTab.classList.add('active'); witTab.classList.remove('active');
    depForm.style.display = 'block'; witForm.style.display = 'none';
    if(depRules) depRules.style.display = 'block';
    if(witRules) witRules.style.display = 'none';
    if(title) title.textContent = '입금신청';
    if(ruleHeader) ruleHeader.textContent = '입금 규정';
  } else {
    witTab.classList.add('active'); depTab.classList.remove('active');
    witForm.style.display = 'block'; depForm.style.display = 'none';
    if(witRules) witRules.style.display = 'block';
    if(depRules) depRules.style.display = 'none';
    if(title) title.textContent = '출금신청';
    if(ruleHeader) ruleHeader.textContent = '출금 규정';
    // 예금주/계좌 정보 서버에서 최신 조회
    if(_session) {
      authFetch('/api/auth/profile?userId=' + encodeURIComponent(_session.id))
        .then(function(r){ return r.json(); })
        .then(function(res) {
          if(res.success) {
            _session.bank = res.bank;
            _session.account = res.account;
            _session.holder = res.holder;
            var holderEl = document.getElementById('tw-holder-name');
            var accountEl = document.getElementById('tw-account-info');
            if(holderEl) holderEl.textContent = res.holder || '-';
            if(accountEl) accountEl.textContent = (res.bank ? res.bank + ' ' : '') + (res.account || '-');
          }
        }).catch(function(){});
    }
    try { _updateWithdrawAfter(); } catch(e){}
    try { loadWithdrawHistory(); } catch(e){}
  }
}

// ── 머니 갱신 ──
function _updateTwMoney() {
  var el = document.getElementById('tw-game-money');
  if(el && _session) el.textContent = Number(_session.balance||_session.money||0).toLocaleString() + ' 원';
}

// ── 금액 추가 ──
function twAddAmount(prefix, n) {
  var el = document.getElementById(prefix + '-amount');
  var cur = parseInt(el.value.replace(/,/g,'')) || 0;
  el.value = (cur + n).toLocaleString();
  if(prefix === 'wit') _updateWithdrawAfter();
}

// ── 출금 후 금액 ──
function _updateWithdrawAfter() {
  var el = document.getElementById('tw-wit-after');
  if(!el) return;
  var bal = _session ? Number(_session.balance||_session.money||0) : 0;
  var amt = parseInt((document.getElementById('wit-amount').value||'0').replace(/,/g,'')) || 0;
  el.innerHTML = '출금 후 금액 <strong>' + Math.max(0, bal - amt).toLocaleString() + ' 원</strong>';
}

// ── 보너스 선택 ──
function selectBonus(btn) {
  document.querySelectorAll('.tw-bonus-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
}

// ── 입금계좌 요청 ──
function requestDepositAccount() {
  if(!_session) { showToast('로그인이 필요합니다.'); return; }
  var now = new Date();
  var dt = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
  authFetch('/api/user/inquiries', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      userId: _session.userId || _session.username,
      nick: _session.nick || _session.nickname || _session.userId,
      title: '입금계좌요청',
      content: '입금 계좌 정보를 요청합니다.',
      datetime: dt,
      status: 'open',
      answer: '',
      answeredAt: ''
    })
  }).then(function(r){ return r.json(); }).then(function(d){
    if(d.success) showToast('입금 계좌가 요청되었습니다. 고객센터에서 확인해주세요.');
    else if(d.error==='duplicate') showToast('이미 요청 중입니다. 고객센터에서 답변을 확인해주세요.');
    else showToast('요청에 실패했습니다. 다시 시도해주세요.');
  }).catch(function(){ showToast('네트워크 오류가 발생했습니다.'); });
}

// ── 최대 금액 ──
function twSetMax() {
  if(!_session) return;
  var bal = Number(_session.balance||_session.money||0);
  document.getElementById('wit-amount').value = bal.toLocaleString();
  _updateWithdrawAfter();
}

// ── 출금 내역 로드 ──
function loadWithdrawHistory() {
  if(!_session) return;
  authFetch('/api/user/transfers?userId='+encodeURIComponent(_session.username)+'&type=withdraw')
    .then(function(r){ return r.json(); })
    .then(function(res){
      var list = (res.data||[]).slice(0,10);
      var tbody = document.getElementById('tw-wit-history');
      if(!tbody) return;
      if(list.length===0){ tbody.innerHTML='<tr class="empty-row"><td colspan="5">출금 내역이 없습니다.</td></tr>'; return; }
      tbody.innerHTML = list.map(function(t,i){
        var st = t.status==='pending'?'<span style="color:#f59e0b;">대기</span>': t.status==='approved'?'<span style="color:#4ade80;">완료</span>':'<span style="color:#f87171;">거절</span>';
        return '<tr><td>'+(i+1)+'</td><td>'+t.datetime+'</td><td>출금</td><td>'+Number(t.amount).toLocaleString()+'</td><td>'+st+'</td></tr>';
      }).join('');
    }).catch(function(){});
}
function switchModal(a,b){closeModal(a);setTimeout(()=>openModal(b),150);}
function toggleMobile(){const h=document.getElementById('ham');h.classList.toggle('open');}
document.querySelectorAll('.modal-overlay').forEach(el=>{
  el.addEventListener('click',e=>{
    if(e.target===el){
      if(el.id==='modal-login'||el.id==='modal-register') return;
      el.classList.remove('active');document.body.style.overflow='';
    }
  });
});

// ── LIVE CARD RIPPLE ──
document.querySelectorAll('.live-card').forEach(card=>{
  card.addEventListener('click', function(e){
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 1.2;

    // ripple
    const ripple = document.createElement('div');
    ripple.className = 'ripple-wave';
    ripple.style.cssText = 'width:'+size+'px;height:'+size+'px;left:'+(x - size/2)+'px;top:'+(y - size/2)+'px;';
    this.appendChild(ripple);

    // flash overlay
    const flash = document.createElement('div');
    flash.className = 'card-flash';
    this.appendChild(flash);

    // 정리
    setTimeout(()=>{ ripple.remove(); flash.remove(); }, 600);
  });
});
// ── HERO PARTICLES ──
(function(){
  const cv = document.getElementById('hero-particles');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const heroSection = cv.closest('section') || cv.parentElement;
  function resize(){cv.width=cv.offsetWidth;cv.height=cv.offsetHeight;}
  resize();
  window.addEventListener('resize', resize);

  // 마우스 위치 추적 — section 전체에서 받기
  const mouse = { x: -9999, y: -9999 };
  const REPEL_RADIUS = 120;
  const REPEL_FORCE = 6;

  heroSection.addEventListener('mousemove', e => {
    const rect = cv.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  heroSection.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  const N = 70;
  const pts = Array.from({length:N}, () => ({
    x: Math.random() * cv.width,
    y: Math.random() * cv.height,
    ox: 0, oy: 0,
    r: Math.random() * 0.8 + 0.3,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    a: Math.random() * 0.5 + 0.5,
  }));
  pts.forEach(p => { p.ox = p.vx; p.oy = p.vy; });

  function draw(){
    ctx.clearRect(0, 0, cv.width, cv.height);
    pts.forEach(p => {
      // 마우스 반발력 계산
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if(dist < REPEL_RADIUS && dist > 0){
        const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
        p.vx += (dx / dist) * force * REPEL_FORCE * 0.08;
        p.vy += (dy / dist) * force * REPEL_FORCE * 0.08;
      }

      // 원래 속도로 서서히 복귀 (마찰)
      p.vx += (p.ox - p.vx) * 0.04;
      p.vy += (p.oy - p.vy) * 0.04;

      // 최대 속도 제한
      const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if(speed > 4){ p.vx = (p.vx/speed)*4; p.vy = (p.vy/speed)*4; }

      p.x += p.vx; p.y += p.vy;
      if(p.x < 0) p.x = cv.width;
      if(p.x > cv.width) p.x = 0;
      if(p.y < 0) p.y = cv.height;
      if(p.y > cv.height) p.y = 0;

      // dot glow
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grd.addColorStop(0, `rgba(245,216,122,${p.a})`);
      grd.addColorStop(0.4, `rgba(200,168,75,${p.a * 0.6})`);
      grd.addColorStop(1, `rgba(200,168,75,0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI*2);
      ctx.fillStyle = grd;
      ctx.fill();

      // dot core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,235,150,${p.a})`;
      ctx.fill();

      // lines to nearby
      pts.forEach(q => {
        const lx = p.x - q.x, ly = p.y - q.y;
        const ldist = Math.sqrt(lx*lx + ly*ly);
        if(ldist < 130){
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(200,168,75,${(1 - ldist/130) * 0.18})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── INFO SECTION PARTICLES ──
(function(){
  const cv = document.getElementById('info-particles');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const section = document.getElementById('info-section');
  function resize(){ cv.width = section.offsetWidth; cv.height = section.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);

  const mouse = { x: -9999, y: -9999 };
  const REPEL_RADIUS = 120, REPEL_FORCE = 6;
  section.addEventListener('mousemove', e => {
    const rect = cv.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  section.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  const N = 70;
  const pts = Array.from({length:N}, () => ({
    x: Math.random() * cv.width,
    y: Math.random() * cv.height,
    r: Math.random() * 0.8 + 0.3,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    a: Math.random() * 0.5 + 0.5,
  }));
  pts.forEach(p => { p.ox = p.vx; p.oy = p.vy; });

  function draw(){
    ctx.clearRect(0, 0, cv.width, cv.height);
    pts.forEach(p => {
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(dist < REPEL_RADIUS && dist > 0){
        const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
        p.vx += (dx/dist) * force * REPEL_FORCE * 0.08;
        p.vy += (dy/dist) * force * REPEL_FORCE * 0.08;
      }
      p.vx += (p.ox - p.vx) * 0.04;
      p.vy += (p.oy - p.vy) * 0.04;
      const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if(speed > 4){ p.vx = (p.vx/speed)*4; p.vy = (p.vy/speed)*4; }
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0) p.x = cv.width;
      if(p.x > cv.width) p.x = 0;
      if(p.y < 0) p.y = cv.height;
      if(p.y > cv.height) p.y = 0;

      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grd.addColorStop(0, `rgba(245,216,122,${p.a})`);
      grd.addColorStop(0.4, `rgba(200,168,75,${p.a * 0.6})`);
      grd.addColorStop(1, `rgba(200,168,75,0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI*2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,235,150,${p.a})`;
      ctx.fill();

      pts.forEach(q => {
        const lx = p.x - q.x, ly = p.y - q.y;
        const ldist = Math.sqrt(lx*lx + ly*ly);
        if(ldist < 130){
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(200,168,75,${(1 - ldist/130) * 0.18})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── LIVE SECTION PARTICLES ──
(function(){
  const cv = document.getElementById('live-particles');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const section = document.getElementById('live-section');
  function resize(){ cv.width = section.offsetWidth; cv.height = section.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);
  // 카드 동적 로드 후 캔버스 크기 재조정
  var _resizeObserver = new MutationObserver(function(){ resize(); });
  _resizeObserver.observe(section, { childList: true, subtree: true });

  const mouse = { x: -9999, y: -9999 };
  const REPEL_RADIUS = 120, REPEL_FORCE = 6;
  section.addEventListener('mousemove', e => {
    const rect = cv.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  section.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  var pts = [];
  function initParticles() {
    var area = cv.width * cv.height;
    var N = Math.max(120, Math.min(300, Math.round(area / 2500)));
    pts.length = 0;
    for (var i = 0; i < N; i++) {
      var p = {
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        r: Math.random() * 0.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        a: Math.random() * 0.5 + 0.5,
      };
      p.ox = p.vx; p.oy = p.vy;
      pts.push(p);
    }
  }
  initParticles();
  // 캔버스 리사이즈 시 파티클도 재생성
  var _origResize = resize;
  resize = function() { _origResize(); initParticles(); };

  function draw(){
    ctx.clearRect(0, 0, cv.width, cv.height);
    pts.forEach(p => {
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(dist < REPEL_RADIUS && dist > 0){
        const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
        p.vx += (dx/dist) * force * REPEL_FORCE * 0.08;
        p.vy += (dy/dist) * force * REPEL_FORCE * 0.08;
      }
      p.vx += (p.ox - p.vx) * 0.04;
      p.vy += (p.oy - p.vy) * 0.04;
      const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if(speed > 4){ p.vx = (p.vx/speed)*4; p.vy = (p.vy/speed)*4; }
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0) p.x = cv.width;
      if(p.x > cv.width) p.x = 0;
      if(p.y < 0) p.y = cv.height;
      if(p.y > cv.height) p.y = 0;

      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grd.addColorStop(0, `rgba(245,216,122,${p.a})`);
      grd.addColorStop(0.4, `rgba(200,168,75,${p.a * 0.6})`);
      grd.addColorStop(1, `rgba(200,168,75,0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI*2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,235,150,${p.a})`;
      ctx.fill();

      pts.forEach(q => {
        const lx = p.x - q.x, ly = p.y - q.y;
        const ldist = Math.sqrt(lx*lx + ly*ly);
        if(ldist < 130){
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(200,168,75,${(1 - ldist/130) * 0.18})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
})();
function setGTab(el){
  document.querySelectorAll('.g-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  const gem = document.getElementById('gem-deco');
  if(!gem) return;
  const side = el.dataset.side;
  gem.classList.remove('tilt-left','tilt-right');
  if(side === 'left') gem.classList.add('tilt-left');
  else if(side === 'right') gem.classList.add('tilt-right');
  // 섹션 전환
  const liveSection = document.getElementById('live-section');
  const slotSection = document.getElementById('slot-section');
  const hotelSec = document.getElementById('hotel-section');
  if(side === 'left'){
    if(liveSection) liveSection.style.display = '';
    if(slotSection) slotSection.style.display = 'none';
    if(hotelSec) hotelSec.style.display = '';
    // nav-link 동기화
    document.querySelectorAll('.nav-link[data-tab]').forEach(n=>n.classList.remove('active'));
    const casinoNav = document.querySelector('.nav-link[data-tab="casino"]');
    if(casinoNav) casinoNav.classList.add('active');
  } else {
    if(liveSection) liveSection.style.display = 'none';
    if(slotSection) slotSection.style.display = '';
    if(hotelSec) hotelSec.style.display = 'none';
    // nav-link 동기화
    document.querySelectorAll('.nav-link[data-tab]').forEach(n=>n.classList.remove('active'));
    const slotNav = document.querySelector('.nav-link[data-tab="slot"]');
    if(slotNav) slotNav.classList.add('active');
  }
}
function switchTab(tab, el){
  // nav-link active 처리
  document.querySelectorAll('.nav-link[data-tab]').forEach(n=>n.classList.remove('active'));
  if(el && el.classList) el.classList.add('active');

  const gameWrapper    = document.getElementById('game-section-wrapper');
  const liveSection    = document.getElementById('live-section');
  const slotSection    = document.getElementById('slot-section');
  const hotelSection   = document.getElementById('hotel-section');
  const gameTabs       = document.querySelector('.game-tabs');
  const eventSection   = document.getElementById('event-section');
  const supportSection = document.getElementById('support-section');
  const noticeSection  = document.getElementById('notice-section');
  const messageSection = document.getElementById('message-section');
  const infoSection    = document.getElementById('info-section');
  const sportsSection  = document.getElementById('sports-section');

  // 모든 커스텀 섹션 숨기기 헬퍼
  function hideAll() {
    if(gameWrapper)    gameWrapper.style.display    = 'none';
    if(eventSection)   eventSection.style.display   = 'none';
    if(supportSection) supportSection.style.display = 'none';
    if(noticeSection)  noticeSection.style.display  = 'none';
    if(messageSection) messageSection.style.display = 'none';
    if(sportsSection)  sportsSection.style.display  = 'none';
    if(infoSection)    infoSection.style.display    = 'none';
  }

  // 이벤트 탭
  if(tab === 'event') {
    hideAll();
    if(eventSection) eventSection.style.display = 'block';
    loadEventSection();
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }

  // 스포츠 탭
  if(tab === 'sports') {
    hideAll();
    if(sportsSection) sportsSection.style.display = 'block';
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }

  // 공지사항 탭
  if(tab === 'notice') {
    hideAll();
    if(noticeSection) noticeSection.style.display = 'block';
    loadNoticeSection();
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }

  // 쪽지 탭
  if(tab === 'message') {
    hideAll();
    if(messageSection) messageSection.style.display = 'block';
    loadMessageSection();
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }

  // 고객센터 탭
  if(tab === 'support') {
    hideAll();
    if(supportSection) supportSection.style.display = 'block';
    loadSupportSection();
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }

  // 게임 탭 (casino / slot 등)
  hideAll();
  if(gameWrapper)    gameWrapper.style.display    = '';
  if(infoSection)    infoSection.style.display    = '';
  if(gameTabs)       gameTabs.style.display       = '';

  // 섹션 전환
  if(tab === 'casino'){
    if(liveSection) liveSection.style.display = '';
    if(slotSection) slotSection.style.display = 'none';
    if(hotelSection) hotelSection.style.display = '';
    // game-tab 버튼 동기화
    document.querySelectorAll('.g-tab').forEach(t=>t.classList.remove('active'));
    const leftTab = document.querySelector('.g-tab[data-side="left"]');
    if(leftTab) leftTab.classList.add('active');
    const gem = document.getElementById('gem-deco');
    if(gem){ gem.classList.remove('tilt-left','tilt-right'); gem.classList.add('tilt-left'); }
  } else {
    if(liveSection) liveSection.style.display = 'none';
    if(slotSection) slotSection.style.display = '';
    if(hotelSection) hotelSection.style.display = 'none';
    // game-tab 버튼 동기화
    document.querySelectorAll('.g-tab').forEach(t=>t.classList.remove('active'));
    const rightTab = document.querySelector('.g-tab[data-side="right"]');
    if(rightTab) rightTab.classList.add('active');
    const gem = document.getElementById('gem-deco');
    if(gem){ gem.classList.remove('tilt-left','tilt-right'); gem.classList.add('tilt-right'); }
  }
}
// 마우스오버시 다이아 기울기
document.querySelectorAll('.g-tab.toggle-btn').forEach(btn => {
  btn.addEventListener('mouseenter', function(){
    const gem = document.getElementById('gem-deco');
    if(!gem) return;
    gem.classList.remove('tilt-left','tilt-right');
    if(this.dataset.side === 'left') gem.classList.add('tilt-left');
    else if(this.dataset.side === 'right') gem.classList.add('tilt-right');
  });
  btn.addEventListener('mouseleave', function(){
    const gem = document.getElementById('gem-deco');
    if(!gem) return;
    gem.classList.remove('tilt-left','tilt-right');
  });
});
function setSTab(el){document.querySelectorAll('.s-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');}
document.querySelectorAll('.nav-link').forEach(el=>{
  el.addEventListener('click',function(){document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));this.classList.add('active');});
});

// 스크롤시 헤더 숨기고 navbar 상단 고정
(function(){
  const hdr = document.querySelector('header');
  const nav = document.querySelector('.navbar');
  const HDR_H = 64;
  let lastY = 0;
  window.addEventListener('scroll', function(){
    const y = window.scrollY;
    if(y > HDR_H){
      hdr.classList.add('hidden');
      nav.classList.add('top-fixed');
    } else {
      hdr.classList.remove('hidden');
      nav.classList.remove('top-fixed');
    }
    lastY = y;
  }, {passive:true});
})();

// ── 게임 에러 모달 ────────────────────────
function _showLogoutModal() {
  var old = document.getElementById('logout-timeout-modal');
  if (old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = 'logout-timeout-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:gemFadeIn 0.2s ease;';
  overlay.innerHTML =
    '<div style="background:linear-gradient(145deg,#1a1a2e,#16213e);border:1px solid #334155;border-radius:20px;width:400px;max-width:90vw;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.6);animation:gemSlideUp 0.3s ease;">'
    + '<div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 24px;text-align:center;">'
    +   '<div style="width:64px;height:64px;margin:0 auto 14px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">'
    +     '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    +   '</div>'
    +   '<div style="font-size:1.1rem;font-weight:800;color:#fff;letter-spacing:0.5px;">자동 로그아웃</div>'
    + '</div>'
    + '<div style="padding:28px 24px;">'
    +   '<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center;">'
    +     '<div style="font-size:0.92rem;color:#fcd34d;font-weight:600;line-height:1.6;">'+(function(){var m=Math.round(IDLE_TIMEOUT/60000);return m>=60?(m/60)+'시간':m+'분';})()+'간 활동이 없어<br>자동 로그아웃 되었습니다.</div>'
    +   '</div>'
    +   '<button id="logout-modal-btn" style="width:100%;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:0.5px;">확인</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(overlay);

  if (!document.getElementById('gem-style')) {
    var s = document.createElement('style');
    s.id = 'gem-style';
    s.textContent = '@keyframes gemFadeIn{from{opacity:0}to{opacity:1}}@keyframes gemSlideUp{from{opacity:0;transform:translateY(30px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}';
    document.head.appendChild(s);
  }

  document.getElementById('logout-modal-btn').addEventListener('click', function() {
    overlay.remove();
    location.hash = '';
    location.reload();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.remove();
      location.hash = '';
      location.reload();
    }
  });
}

function _showGameErrorModal(msg) {
  var old = document.getElementById('game-error-modal');
  if (old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = 'game-error-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:gemFadeIn 0.2s ease;';
  overlay.innerHTML =
    '<div style="background:linear-gradient(145deg,#1a1a2e,#16213e);border:1px solid #334155;border-radius:20px;width:400px;max-width:90vw;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.6);animation:gemSlideUp 0.3s ease;">'
    // 상단 아이콘 영역
    + '<div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 24px;text-align:center;">'
    +   '<div style="width:64px;height:64px;margin:0 auto 14px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">'
    +     '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    +   '</div>'
    +   '<div style="font-size:1.1rem;font-weight:800;color:#fff;letter-spacing:0.5px;">게임 실행 불가</div>'
    + '</div>'
    // 메시지 영역
    + '<div style="padding:28px 24px;">'
    +   '<div style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.2);border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center;">'
    +     '<div style="font-size:0.92rem;color:#fca5a5;font-weight:600;line-height:1.6;">' + msg + '</div>'
    +   '</div>'
    +   '<button id="gem-close-btn" style="width:100%;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:0.5px;">확인</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(overlay);

  // 애니메이션 스타일
  if (!document.getElementById('gem-style')) {
    var s = document.createElement('style');
    s.id = 'gem-style';
    s.textContent = '@keyframes gemFadeIn{from{opacity:0}to{opacity:1}}@keyframes gemSlideUp{from{opacity:0;transform:translateY(30px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}';
    document.head.appendChild(s);
  }

  document.getElementById('gem-close-btn').addEventListener('click', function() { overlay.remove(); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

// ── 게임 실행 (CSAPI용 — 기존 게임사) ────────────────────────
async function launchGame(code, subcode, title, lobby) {
  if (!_session) { openModal('login'); return; }
  // 점검 게임 체크 (blockedGames 기준, 오닉스는 _cs 키)
  var _csBg = (window._hlBlockedGames && window._hlBlockedGames[code + '_cs']) || [];
  if (_csBg.indexOf(String(subcode)) >= 0) {
    _showGameErrorModal('해당 게임은 현재 점검중 입니다.');
    return;
  }
  // 에이전트 잔고 체크 (OnX)
  try {
    var agInfo = await authFetch('/api/game/aginfo').then(function(r){ return r.json(); });
    if (!agInfo || agInfo.result !== 1 || Number(agInfo.balance2 || 0) <= 0) {
      alert('에이전트 잔고 부족');
      return;
    }
  } catch(e) { alert('에이전트 잔고 확인 실패'); return; }
  try {
    // 1) CS API 회원가입 (최초 1회)
    if (!_session._csRegistered) {
      var regRes = await authFetch('/api/game/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: _session.username, username: _session.nickname || _session.username })
      }).then(function(r){ return r.json(); });
      console.log('[CS] register:', regRes);
      _session._csRegistered = true;
    }

    // 2) 아너링크 잔액 회수 → 로컬로 복원 (게임 전환 대비)
    await authFetch('/api/auth/recover-for-switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: _session.username, target: 'csapi' })
    });

    // 3) 로컬 잔액을 CS API로 동기화 (Transfer Wallet)
    var balRes = await authFetch('/api/auth/balance?userId=' + encodeURIComponent(_session.id)).then(function(r){ return r.json(); });
    var localBal = (balRes.success && balRes.local !== undefined) ? Number(balRes.local) : 0;
    console.log('[CS] balance check:', balRes, 'localBal:', localBal);
    if (localBal > 0) {
      var depRes = await authFetch('/api/game/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: _session.username, amount: localBal })
      }).then(function(r){ return r.json(); });
      console.log('[CS] deposit:', depRes);
      if (depRes.result === 1) {
        // 입금 성공 시 로컬 잔액 차감
        await authFetch('/api/user/users/money-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: _session.username, amount: -localBal })
        });
      }
    }

    // 4) 게임 실행
    var isMobile = /Mobi|Android/i.test(navigator.userAgent);
    var r = await authFetch('/api/game/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        subcode: subcode || code,
        userid: _session.username,
        username: _session.nickname || _session.username,
        platform: isMobile ? 'mobile' : 'pc',
        lobby: lobby || '0',
        gameTitle: title || code
      })
    });
    var data = await r.json();
    if (data.result === 1 && data.link) {
      var w = 1280, h = 800;
      var left = (screen.width - w) / 2, top = (screen.height - h) / 2;
      window.open(data.link, 'game_cs_' + code, 'width='+w+',height='+h+',left='+left+',top='+top+',resizable=yes,scrollbars=yes');
    } else {
      _showGameErrorModal(data.msg || '알 수 없는 오류가 발생했습니다.');
    }
  } catch(e) {
    _showGameErrorModal('게임 서버에 연결할 수 없습니다.');
  }
}

// ── 게임 실행 (HonorLink용) ────────────────────────
async function launchHL(vendor, gameId, title) {
  if (!_session) { openModal('login'); return; }
  // 점검 게임 체크 (blockedGames 기준)
  var _bg = (window._hlBlockedGames && window._hlBlockedGames[vendor]) || [];
  if (_bg.indexOf(String(gameId)) >= 0) {
    _showGameErrorModal('해당 게임은 현재 점검중 입니다.');
    return;
  }
  // 에이전트 잔고 체크 (HonorLink)
  try {
    var agInfo = await authFetch('/api/hl/my-info').then(function(r){ return r.json(); });
    if (!agInfo || Number(agInfo.balance || 0) <= 0) {
      alert('에이전트 잔고 부족');
      return;
    }
  } catch(e) { alert('에이전트 잔고 확인 실패'); return; }
  try {
    // 1) 오닉스 잔액 회수 → 로컬로 복원 (게임 전환 대비)
    await authFetch('/api/auth/recover-for-switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: _session.username, target: 'honorlink' })
    });

    // 2) 로컬 잔액을 게임사로 동기화 (Transfer Wallet)
    var balRes = await authFetch('/api/auth/balance?userId=' + encodeURIComponent(_session.id)).then(function(r){ return r.json(); });
    var localBal = (balRes.success && balRes.local !== undefined) ? Number(balRes.local) : 0;
    if (localBal > 0) {
      await authFetch('/api/hl/user/add-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: _session.username, amount: localBal })
      });
      // 로컬 잔액을 0으로 차감 (게임사로 이동했으므로) — 게임사 API 호출 안함
      await authFetch('/api/user/users/money-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: _session.username, amount: -localBal })
      });
    }

    // 3) 게임 실행
    var r = await authFetch('/api/hl/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: _session.username,
        nickname: _session.nickname || _session.username,
        game_id:  gameId,
        vendor:   vendor,
        gameTitle: title || '',
      })
    });
    var data = await r.json();
    if (data.link) {
      var w = 1280, h = 800;
      var left = (screen.width - w) / 2, top = (screen.height - h) / 2;
      window.open(data.link, 'game_' + gameId, 'width='+w+',height='+h+',left='+left+',top='+top+',resizable=yes,scrollbars=yes');
    } else {
      _showGameErrorModal(data.error || data.message || '알 수 없는 오류가 발생했습니다.');
    }
  } catch(e) {
    _showGameErrorModal('게임 서버에 연결할 수 없습니다.');
  }
}

// ── 슬롯 게임 목록 모달 (CSAPI용) ────────────────────────
async function openSlotGameModal(providerCode, providerGameid, providerName) {
  if (!_session) { openModal('login'); return; }
  var existing = document.getElementById('slot-game-modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'slot-game-modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML =
    '<div style="width:900px;max-width:96vw;max-height:80vh;display:flex;flex-direction:column;background:#141824;border-radius:12px;border:1px solid #2a3040;box-shadow:0 8px 32px rgba(0,0,0,0.6);">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #2a3040;"><span style="font-size:1rem;font-weight:600;color:#fff;">' + providerName + ' 게임 목록</span>'
    + '<button onclick="document.getElementById(\'slot-game-modal-overlay\').remove()" style="background:none;border:none;color:#ccc;font-size:1.2rem;cursor:pointer;">✕</button></div>'
    + '<div style="padding:12px;overflow-y:auto;flex:1;">'
    + '<div id="slot-game-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">'
    + '<div style="grid-column:1/-1;text-align:center;color:#888;padding:24px;">게임 목록 불러오는 중...</div>'
    + '</div></div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  try {
    // 아너링크 순서로 정렬된 게임 목록 가져오기
    var _hlName = providerName;
    // CS code → HL name 매핑 확인
    var _csToHlSorted = {
      'pragmaticplay': 'PragmaticPlay',
      'cq9': 'CQ9',
      'hbn': 'Habanero',
      'bng': 'Booongo',
      'nolimitcity': 'Nolimit City',
      'pg': 'PG Soft',
      'hacksaw': 'Hacksaw',
      'jili': 'jili'
    };
    if (_csToHlSorted[providerCode.toLowerCase()]) _hlName = _csToHlSorted[providerCode.toLowerCase()];

    var r = await authFetch('/api/game/games/sorted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor: _hlName, gameid: providerGameid, code: providerCode, gametype: 'slot' })
    });
    var data = await r.json();
    var games = data.data || [];
    // 숨김 게임 목록에서 제거 (아예 안 보임) - 오닉스는 _cs 접미사 키 사용
    var _csHiddenKey = providerCode + '_cs';
    var _csHidden = (window._hlHiddenGames && window._hlHiddenGames[_csHiddenKey]) || [];
    if (_csHidden.length) {
      games = games.filter(function(g) {
        return _csHidden.indexOf(String(g.subcode)) < 0;
      });
    }
    // 점검 게임 목록 (보이지만 클릭 시 점검 메시지) - 오닉스는 _cs 접미사 키 사용
    var _csBlocked = (window._hlBlockedGames && window._hlBlockedGames[_csHiddenKey]) || [];
    var grid = document.getElementById('slot-game-grid');
    if (!grid) return;
    if (!games.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:24px;">게임 목록이 없습니다.</div>';
      return;
    }
    // 인기게임 상단 고정 (CS API: subcode로 식별)
    var _csPinned = (window._pinnedGames && window._pinnedGames[providerCode]) || [];
    if (_csPinned.length) {
      games.sort(function(a, b) {
        var ai = _csPinned.indexOf(String(a.subcode));
        var bi = _csPinned.indexOf(String(b.subcode));
        if (ai >= 0 && bi >= 0) return ai - bi;
        if (ai >= 0) return -1;
        if (bi >= 0) return 1;
        return 0;
      });
    }
    grid.innerHTML = games.map(function(g) {
      var name    = g.name_kor || g.name_eng || '';
      var subcode = g.subcode || '';
      var img     = g.img || '';
      var isBlocked = _csBlocked.indexOf(String(subcode)) >= 0;
      var clickAction = isBlocked
        ? '_showGameErrorModal(\'해당 게임은 현재 점검중 입니다.\')'
        : 'launchGame(\'' + providerCode + '\',\'' + subcode + '\',\'' + name.replace(/'/g,'') + '\')';
      return '<div style="cursor:pointer;border-radius:8px;overflow:hidden;background:#1a2030;border:1px solid #2a3040;position:relative;' + (isBlocked ? 'opacity:0.5;' : '') + '" onclick="' + clickAction + '">'
        + (isBlocked ? '<div style="position:absolute;top:6px;right:6px;background:#dc2626;color:#fff;font-size:0.6rem;padding:2px 6px;border-radius:4px;z-index:1;">점검중</div>' : '')
        + (img ? '<img src="'+img+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#0a0800;">' : '<div style="width:100%;aspect-ratio:4/3;background:#2a3040;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#666;padding:4px;text-align:center;">'+name+'</div>')
        + '<div style="padding:5px 6px;font-size:0.72rem;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>'
        + '</div>';
    }).join('');
  } catch(e) {
    var grid2 = document.getElementById('slot-game-grid');
    if (grid2) grid2.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#f87;padding:24px;">게임 목록을 불러오지 못했습니다.</div>';
  }
}

// ── HonorLink 슬롯 게임 목록 모달 ────────────────────────
// 게임사 합치기 매핑: key 게임사 클릭 시 value 게임사의 게임도 함께 로드
var _mergeVendors = {
  'MicroGamingSlot': ['MicroGaming Plus Slo']
};

async function openHLGameModal(vendor, vendorName, filterType) {
  if (!_session) { openModal('login'); return; }
  var existing = document.getElementById('slot-game-modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'slot-game-modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';
  overlay.innerHTML =
    '<div style="width:900px;max-width:96vw;max-height:80vh;display:flex;flex-direction:column;background:#141824;border-radius:12px;border:1px solid #2a3040;overflow:hidden;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #2a3040;"><span style="font-size:1.1rem;font-weight:bold;color:#fff;">' + vendorName + ' 게임 목록</span>'
    + '<button onclick="document.getElementById(\'slot-game-modal-overlay\').remove()" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer;line-height:1;">✕</button></div>'
    + '<div style="padding:12px;overflow-y:auto;flex:1;">'
    + '<div id="slot-game-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">'
    + '<div style="grid-column:1/-1;text-align:center;color:#888;padding:24px;">게임 목록 불러오는 중...</div>'
    + '</div></div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  try {
    // 합쳐야 할 게임사 목록
    var vendorsToLoad = [vendor].concat(_mergeVendors[vendor] || []);
    var allGames = [];
    for (var vi = 0; vi < vendorsToLoad.length; vi++) {
      var r = await authFetch('/api/hl/games?vendor=' + encodeURIComponent(vendorsToLoad[vi]));
      var g = await r.json();
      if (!g.error && !g._status && Array.isArray(g)) {
        g.forEach(function(game) { game._vendor = vendorsToLoad[vi]; });
        allGames = allGames.concat(g);
      }
    }
    var games = allGames;
    // 숨김 게임 목록에서 제거 (아예 안 보임)
    var hg = (window._hlHiddenGames && window._hlHiddenGames[vendor]) || [];
    if (hg.length) {
      games = games.filter(function(g) {
        return hg.indexOf(String(g.id)) < 0;
      });
    }
    // 점검 게임 목록 (보이지만 클릭 시 점검 메시지)
    var bg = (window._hlBlockedGames && window._hlBlockedGames[vendor]) || [];
    // 타입 필터링
    if (filterType === 'live') {
      games = games.filter(function(g) { return g.type !== 'slot'; });
    } else if (filterType === 'slot') {
      games = games.filter(function(g) { return g.type === 'slot'; });
    }
    var grid = document.getElementById('slot-game-grid');
    if (!grid) return;
    if (!games.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:24px;">게임 목록이 없습니다.</div>';
      return;
    }
    // rank 기준 정렬 (rank가 있는 것 우선)
    games.sort(function(a, b) {
      var ra = a.rank !== null && a.rank !== undefined ? a.rank : 99999;
      var rb = b.rank !== null && b.rank !== undefined ? b.rank : 99999;
      return ra - rb;
    });
    // 인기게임 상단 고정
    var _pinned = (window._pinnedGames && window._pinnedGames[vendor]) || [];
    if (_pinned.length) {
      games.sort(function(a, b) {
        var ai = _pinned.indexOf(String(a.id));
        var bi = _pinned.indexOf(String(b.id));
        if (ai >= 0 && bi >= 0) return ai - bi;
        if (ai >= 0) return -1;
        if (bi >= 0) return 1;
        return 0;
      });
    }
    grid.innerHTML = games.map(function(g) {
      var name = (g.langs && g.langs.ko) || g.title || '';
      var img  = (g.thumbnails && g.thumbnails['300x300']) || g.thumbnail || '';
      var safeVendor = (g._vendor || vendor).replace(/'/g, '');
      var safeId     = String(g.id).replace(/'/g, '');
      var safeName2  = name.replace(/'/g, '');
      var isBlocked = bg.indexOf(String(g.id)) >= 0;
      var clickAction = isBlocked
        ? '_showGameErrorModal(\'해당 게임은 현재 점검중 입니다.\')'
        : 'launchHL(\'' + safeVendor + '\',\'' + safeId + '\',\'' + safeName2 + '\')';
      return '<div style="cursor:pointer;border-radius:8px;overflow:hidden;background:#1a2030;border:1px solid #2a3040;position:relative;' + (isBlocked ? 'opacity:0.5;' : '') + '" onclick="' + clickAction + '">'
        + (isBlocked ? '<div style="position:absolute;top:6px;right:6px;background:#dc2626;color:#fff;font-size:0.6rem;padding:2px 6px;border-radius:4px;z-index:1;">점검중</div>' : '')
        + (img ? '<img src="'+img+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#0a0800;" loading="lazy">' : '<div style="width:100%;aspect-ratio:4/3;background:#2a3040;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#666;padding:4px;text-align:center;">'+name+'</div>')
        + '<div style="padding:5px 6px;font-size:0.72rem;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>'
        + '</div>';
    }).join('');
  } catch(e) {
    var grid2 = document.getElementById('slot-game-grid');
    if (grid2) grid2.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#f87;padding:24px;">게임 목록을 불러오지 못했습니다.</div>';
  }
}

// ── 게임 API 연동: 게임카드 동적 렌더링 ────────────────────────
(function(){
  // ── 로컬 카드 이미지 목록 (랜덤 배정용) ──
  var localCards = [];
  for (var ci = 1; ci <= 12; ci++) localCards.push('/static/card_' + (ci < 10 ? '0'+ci : ci) + '.jpg');

  // 셔플 복사본 생성 (Fisher-Yates)
  var shuffled = localCards.slice();
  for (var si = shuffled.length - 1; si > 0; si--) {
    var sj = Math.floor(Math.random() * (si + 1));
    var tmp = shuffled[si]; shuffled[si] = shuffled[sj]; shuffled[sj] = tmp;
  }
  var cardIdx = 0;
  function nextCardImg() {
    var img = shuffled[cardIdx % shuffled.length];
    cardIdx++;
    return img;
  }

  // ── 벤더명 → 로고 매핑 ──
  var logoMap = {
    'evolution':'/static/logos/logo_evolution.png',
    '1X2 Gaming':'/static/slot_logos/1x2_gaming_logo.png',
    'Asia Gaming':'/static/ag.png',
    'Asia Gaming Slot':'/static/slot_logos/asia_gaming_slot_logo.png',
    'bbin':'/static/logos/logo_bbin.png',
    'Booongo':'/static/slot_logos/booongo_logo.png',
    'CQ9':'/static/logos/logo_cq9.png',
    'dragoonsoft':'/static/slot_logos/dragoonsoft_logo.png',
    'DreamGame':'/static/casino_logos/dreamgame_logo.png',
    'evoplay':'/static/slot_logos/evoplay_logo.png',
    'Fantasma':'/static/slot_logos/fantasma_logo.png',
    'GameArt':'/static/slot_logos/gameart_logo.png',
    'Hacksaw':'/static/slot_logos/hacksaw_logo.png',
    'MicroGaming':'/static/casino_logos/microgaming_logo.png',
    'MicroGaming Plus':'/static/slot_logos/microgaming_plus_slot_logo.png',
    'MicroGaming Plus Slo':'/static/slot_logos/microgaming_plus_slot_logo.png',
    'MicroGamingSlot':'/static/slot_logos/microgaming_plus_slot_logo.png',
    'Nolimit City':'/static/logos/logo_nolimit.png',
    'playngo':'/static/slot_logos/playngo_logo.png',
    'PragmaticPlay':'/static/slot_logos/pragmatic_play_logo.png',
    'PragmaticPlay Live':'/static/logos/logo_pragmatic.png',
    'Relax Gaming':'/static/slot_logos/relax_gaming_logo.png',
    'Skywind Live':'/static/logos/logo_skywind.png',
    'Skywind Slot':'/static/logos/logo_skywind.png',
    'spribe':'/static/slot_logos/spribe_logo.png',
    'WM Live':'/static/logos/logo_vmcasino.png',
    'ELK':'/static/logos/logo_elk.png',
    'mobilots':'/static/logos/logo_mobilots.png',
    'AllBet':'/static/casino_logos/allbet_logo.png',
    'ezugi':'/static/ezugi_new.png',
    '7777':'/static/slot_logos/7777_logo.png',
    '7-mojos':'/static/slot_logos/7_mojos_logo.png',
    '7-mojos-slots':'/static/slot_logos/7_mojos_logo.png',
    'amigogaming':'/static/slot_logos/amigogaming_logo.png',
    'AvatarUX':'/static/slot_logos/avatarux_logo.png',
    'Betgames.tv':'/static/slot_logos/betgames_tv_slot_logo.png',
    'bfgames':'/static/slot_logos/bfgames_logo.png',
    'bgaming':'/static/slot_logos/bgaming_logo.png',
    'BigTimeGaming':'/static/slot_logos/bigtimegaming_logo.png',
    'Blueprint Gaming':'/static/slot_logos/blueprint_gaming_logo.png',
    'booming':'/static/slot_logos/booming_logo.png',
    'caletagaming':'/static/slot_logos/caletagaming_logo.png',
    'dreamtech':'/static/slot_logos/dreamtech_logo.png',
    'eagaming':'/static/slot_logos/eagaming_logo.png',
    'expanse':'/static/slot_logos/expanse_logo.png',
    'ezugiZ':'/static/slot_logos/ezugiz_logo.png',
    'fils':'/static/slot_logos/fils_logo.png',
    'galaxsys':'/static/slot_logos/galaxsys_logo.png',
    'greentube':'/static/slot_logos/greentube_logo.png',
    'iconix':'/static/slot_logos/iconix_logo.png',
    'Imoon':'/static/slot_logos/imoon_logo.png',
    'intouch-games':'/static/slot_logos/intouch_games_logo.png',
    'JDB':'/static/slot_logos/jdb_logo.png',
    'jili':'/static/slot_logos/jili_logo.png',
    'kagaming':'/static/slot_logos/kagaming_logo.png',
    'Kalamba':'/static/slot_logos/kalamba_logo.png',
    'macaw':'/static/slot_logos/macaw_logo.png',
    'mancala':'/static/slot_logos/mancala_logo.png',
    'merkur':'/static/slot_logos/merkur_logo.png',
    'mplay':'/static/slot_logos/mplay_logo.png',
    'netent':'/static/slot_logos/netent_logo.png',
    'Novomatic':'/static/slot_logos/novomatic_logo.png',
    'Octoplay':'/static/slot_logos/octoplay_logo.png',
    'onetouch':'/static/slot_logos/onetouch_logo.png',
    'oriental':'/static/slot_logos/oriental_logo.png',
    'PeterSons':'/static/slot_logos/petersons_logo.png',
    'PG Soft':'/static/slot_logos/pg_soft_logo.png',
    'platingaming':'/static/slot_logos/platingaming_logo.png',
    'platipus':'/static/slot_logos/platipus_logo.png',
    'PlayStar':'/static/slot_logos/playstar_logo.png',
    'PlayTech':'/static/slot_logos/playtech_logo.png',
    'PlayTechSlot':'/static/slot_logos/playtech_logo.png',
    'popok':'/static/slot_logos/popok_logo.png',
    'quickspin':'/static/slot_logos/quickspin_logo.png',
    'redrake':'/static/slot_logos/redrake_logo.png',
    'redtiger':'/static/slot_logos/redtiger_logo.png',
    'retrogames':'/static/slot_logos/retrogames_logo.png',
    'revolver':'/static/slot_logos/revolver_logo.png',
    'rsg':'/static/slot_logos/rsg_logo.png',
    'RubyPlay':'/static/slot_logos/rubyplay_logo.png',
    'Slotmill':'/static/slot_logos/slotmill_logo.png',
    'Smartsoft':'/static/slot_logos/smartsoft_logo.png',
    'spinomenal':'/static/slot_logos/spinomenal_logo.png',
    'Thunderkick':'/static/slot_logos/thunderkick_logo.png',
    'Wazdan':'/static/slot_logos/wazdan_logo.png',
    'Yggdrasil':'/static/slot_logos/yggdrasil_logo.png',
    'Habanero':'/static/slot_logos/habanero.png',
    'Yolted':'/static/slot_logos/yolted_logo.png',
    'amatic':'/static/slot_logos/아마틱.png',
    'homeslot':'/static/slot_logos/homeslot_logo.png',
    'playson':'/static/slot_logos/playson_logo.png',
    'fachai':'/static/slot_logos/fachai_logo.png',
    'netgame':'/static/slot_logos/netgame_logo.png',
    'SA Gaming':'/static/casino_logos/sagaming_logo.png',
    'saGaming':'/static/casino_logos/sagaming_logo.png',
    'casino-sa':'/static/casino_logos/sagaming_logo.png',
    'sexybcrt':'/static/casino_logos/sexybcrt_logo.png',
    'Sexy Baccarat':'/static/casino_logos/sexybcrt_logo.png',
    'rocketman':'/static/casino_logos/rocketman_logo.png',
    'tvbet':'/static/casino_logos/tvbet_logo.png',
    'SuperSpade':'/static/casino_logos/superspade_logo.png',
    'XPro Gaming':'/static/casino_logos/xprogaming_logo.png',
    'XProGaming':'/static/casino_logos/xprogaming_logo.png',
    'xprogaming':'/static/casino_logos/xprogaming_logo.png',
    'Vivo Gaming':'/static/casino_logos/vivo_logo.png',
    'vivo':'/static/casino_logos/vivo_logo.png',
    'Live88':'/static/casino_logos/live88_logo.png',
    'live88':'/static/casino_logos/live88_logo.png',
    'Absolute':'/static/casino_logos/absolute_logo.png',
    'absolute':'/static/casino_logos/absolute_logo.png',
  };

  // ── 공통 카드 생성 함수 ──
  function makeCard(name, img, onclick, origName) {
    var bgImg = nextCardImg();
    var logo = logoMap[name] || logoMap[origName] || '';
    var logoHtml = logo
      ? '<img src="'+logo+'" alt="'+name+'" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);height:48px;max-width:85%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.8));pointer-events:none;">'
      : '<span style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:0.8rem;font-weight:bold;text-shadow:0 2px 6px rgba(0,0,0,0.9);white-space:nowrap;pointer-events:none;">'+name+'</span>';
    return '<div class="live-card" onclick="' + onclick + '">'
      + '<div class="shine"></div>'
      + '<div class="enter-overlay"><span class="enter-label"><i class="fas fa-play"></i>게임입장</span></div>'
      + '<div class="live-thumb" style="position:relative;">'
      + '<img src="'+bgImg+'" alt="'+name+'" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;" loading="lazy">'
      + logoHtml
      + '</div>'
      + '<div class="live-footer"><span class="live-name">'+name+'</span></div>'
      + '</div>';
  }

  // ── 슬롯 전용 카드 (게임사 이미지 배경 + 로고) ──
  function makeSlotCard(name, img, onclick, origName) {
    var logo = logoMap[name] || logoMap[origName] || '';
    var logoHtml = logo
      ? '<img src="'+logo+'" alt="'+name+'" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);height:48px;max-width:85%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.8));pointer-events:none;">'
      : '<span style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:0.8rem;font-weight:bold;text-shadow:0 2px 6px rgba(0,0,0,0.9);white-space:nowrap;pointer-events:none;">'+name+'</span>';
    var bgHtml = img
      ? '<img src="'+img+'" alt="'+name+'" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;" loading="lazy">'
      : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#0d1117 0%,#161b22 50%,#0d1117 100%);"></div>';
    return '<div class="live-card" onclick="' + onclick + '">'
      + '<div class="shine"></div>'
      + '<div class="enter-overlay"><span class="enter-label"><i class="fas fa-play"></i>게임입장</span></div>'
      + '<div class="live-thumb" style="position:relative;">'
      + bgHtml
      + logoHtml
      + '</div>'
      + '<div class="live-footer"><span class="live-name">'+name+'</span></div>'
      + '</div>';
  }

  // ═══ HonorLink 벤더/게임 로딩 ═══
  var liveNames = ['evolution','PragmaticPlay Live','Asia Gaming','DreamGame','WM Live','ezugi','bota','sexybcrt','SuperSpade','Skywind Live','vivo','AllBet','saGaming','Live88','XProGaming','MicroGaming','oriental','7-mojos','absolute','ezugiZ','PlayTech','rocketman','tvbet'];

  // 로그인된 유저의 gameGroup을 서버에서 최신값으로 갱신
  var sessionRefresh = (_session && _session.username)
    ? authFetch('/api/auth/game-group?username=' + encodeURIComponent(_session.username))
        .then(function(r){ return r.json(); })
        .then(function(res){ _session.gameGroup = res.gameGroup || ''; })
        .catch(function(){})
    : Promise.resolve();

  sessionRefresh.then(function(){
  Promise.all([
    authFetch('/api/hl/vendors').then(function(r){ return r.json(); }),
    authFetch('/api/hl/lobbies').then(function(r){ return r.json(); }),
    authFetch('/api/hl/settings').then(function(r){ return r.json(); }).catch(function(){ return {}; }),
    authFetch('/api/game/providers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'1', gametype:'' }) }).then(function(r){ return r.json(); }).catch(function(){ return { result:0, data:[] }; })
  ])
    .then(function(results){
      var vendors = results[0];
      var lobbies = results[1];
      var gameSettings = results[2] || {};
      var csProviders = results[3];
      var hiddenVendors = gameSettings.hiddenVendors || [];
      var hiddenGames = gameSettings.hiddenGames || {};
      var vendorOrder = gameSettings.vendorOrder || { live: [], slot: [] };
      var blockedGames = gameSettings.blockedGames || {};
      var vendorApi = gameSettings.vendorApi || {};

      // 유저에 그룹 설정이 있으면 그룹 설정으로 덮어씌우기
      if (_session && _session.gameGroup && gameSettings.groups) {
        var userGroup = gameSettings.groups.find(function(g) { return g.name === _session.gameGroup; });
        if (userGroup) {
          hiddenVendors = userGroup.hiddenVendors || [];
          hiddenGames = userGroup.hiddenGames || {};
          blockedGames = userGroup.blockedGames || {};
          // 그룹별 vendorApi 오버라이드
          if (userGroup.vendorApi) {
            Object.keys(userGroup.vendorApi).forEach(function(k) {
              vendorApi[k] = userGroup.vendorApi[k];
            });
          }
          // 그룹별 vendorOrder 오버라이드
          if (userGroup.vendorOrder) {
            Object.keys(userGroup.vendorOrder).forEach(function(k) {
              if (userGroup.vendorOrder[k] && userGroup.vendorOrder[k].length) {
                vendorOrder[k] = userGroup.vendorOrder[k];
              }
            });
          }
        }
      }

      // 글로벌에 저장 (게임 목록 모달에서 사용)
      window._hlHiddenGames = hiddenGames;
      window._hlBlockedGames = blockedGames;
      window._pinnedGames = gameSettings.pinnedGames || {};

      if (vendors.error || vendors._status) return;
      if (!Array.isArray(lobbies)) lobbies = [];

      // 로비 맵 (vendor → {thumbnail, id})
      var lobbyMap = {};
      // 커스텀 로고 (로비 데이터 없는 벤더용)
      var _customLogos = {
        '1X2 Gaming':'/static/slots/1x2_gaming.png',
        '7777':'/static/slots/7777.png',
        '7-mojos':'/static/slots/7_mojos.png',
        '7-mojos-slots':'/static/slots/7_mojos.png',
        'amatic':'/static/slots/amatic.png',
        'amigogaming':'/static/slots/amigogaming.png',
        'Asia Gaming Slot':'/static/slots/asia_gaming_slot.png',
        'AvatarUX':'/static/slots/avatarux.png',
        'Betgames.tv':'/static/slots/betgames_tv_slot.png',
        'bfgames':'/static/slots/bfgames.png',
        'bgaming':'/static/slots/bgaming.png',
        'BigTimeGaming':'/static/slots/bigtimegaming.png',
        'Blueprint Gaming':'/static/slots/blueprint_gaming.png',
        'booming':'/static/slots/booming.png',
        'Booongo':'/static/slots/booongo.png',
        'caletagaming':'/static/slots/caletagaming.png',
        'CQ9':'/static/slots/cq9.png',
        'dragoonsoft':'/static/slots/dragoonsoft.png',
        'dreamtech':'/static/slots/dreamtech.png',
        'eagaming':'/static/slots/eagaming.png',
        'evoplay':'/static/slots/evoplay.png',
        'expanse':'/static/slots/expanse.png',
        'ezugiZ':'/static/slots/ezugiz.png',
        'Fantasma':'/static/slots/fantasma.png',
        'fils':'/static/slots/fils.png',
        'galaxsys':'/static/slots/galaxsys.png',
        'GameArt':'/static/slots/gameart.png',
        'greentube':'/static/slots/greentube.png',
        'Habanero':'/static/slots/habanero.png',
        'Hacksaw':'/static/slots/hacksaw.png',
        'iconix':'/static/slots/iconix.png',
        'Imoon':'/static/slots/imoon.png',
        'intouch-games':'/static/slots/intouch_games.png',
        'JDB':'/static/slots/jdb.png',
        'jili':'/static/slots/jili.png',
        'kagaming':'/static/slots/kagaming.png',
        'Kalamba':'/static/slots/kalamba.png',
        'macaw':'/static/slots/macaw.png',
        'mancala':'/static/slots/mancala.png',
        'merkur':'/static/slots/merkur.png',
        'MicroGaming Plus':'/static/slots/microgaming_plus_slot.png',
        'MicroGaming Plus Slo':'/static/slots/microgaming_plus_slot.png',
        'MicroGamingSlot':'/static/slots/microgaming_plus_slot.png',
        'mplay':'/static/slots/mplay.png',
        'netent':'/static/slots/netent.png',
        'Nolimit City':'/static/slots/nolimit_city.png',
        'Novomatic':'/static/slots/novomatic.png',
        'Octoplay':'/static/slots/octoplay.png',
        'onetouch':'/static/slots/onetouch.png',
        'oriental':'/static/slots/oriental.png',
        'PeterSons':'/static/slots/petersons.png',
        'PG Soft':'/static/slots/pg_soft.png',
        'platingaming':'/static/slots/platingaming.png',
        'platipus':'/static/slots/platipus.png',
        'playngo':'/static/slots/playngo.png',
        'PlayStar':'/static/slots/playstar.png',
        'PlayTech':'/static/slots/playtech.png',
        'PlayTechSlot':'/static/slots/playtech.png',
        'popok':'/static/slots/popok.png',
        'PragmaticPlay':'/static/slots/pragmatic_play.png',
        'quickspin':'/static/slots/quickspin.png',
        'redrake':'/static/slots/redrake.png',
        'redtiger':'/static/slots/redtiger.png',
        'Relax Gaming':'/static/slots/retrogames.png',
        'retrogames':'/static/slots/retrogames.png',
        'homeslot':'/static/slots/homeslot.webp',
        'playson':'/static/slots/playson.png',
        'revolver':'/static/slots/revolver.png',
        'rsg':'/static/slots/rsg.png',
        'RubyPlay':'/static/slots/rubyplay.png',
        'Skywind Slot':'/static/slots/skywind_slot.png',
        'Slotmill':'/static/slots/slotmill.png',
        'Smartsoft':'/static/slots/smartsoft.png',
        'spinomenal':'/static/slots/spinomenal.png',
        'spribe':'/static/slots/spribe.png',
        'Thunderkick':'/static/slots/thunderkick.png',
        'Wazdan':'/static/slots/wazdan.png',
        'Yggdrasil':'/static/slots/yggdrasil.png',
        'Yolted':'/static/slots/yolted.png',
        'fachai':'/static/slots/fc_slot.png',
        'netgame':'/static/slots/netgame.png'
      };
      lobbies.forEach(function(lb){
        if (!lobbyMap[lb.vendor]) {
          lobbyMap[lb.vendor] = {
            img: (lb.thumbnails && lb.thumbnails['300x300']) || lb.thumbnail || '',
            id: lb.id,
            vendor: lb.vendor
          };
        }
      });
      // 로비 직접 접속 설정 (게임 목록 대신 바로 로비로 이동)
      var _directLobby = {
        'AllBet': 'allBet_lobby',
        'saGaming': 'sacasino',
        'sexybcrt': 'MX-LIVE-001',
        'Skywind Live': 'sw_liveGame_all_live'
      };
      Object.keys(_directLobby).forEach(function(k) {
        if (!lobbyMap[k]) lobbyMap[k] = { img: '', id: _directLobby[k], vendor: k };
        else if (!lobbyMap[k].id) lobbyMap[k].id = _directLobby[k];
      });

      // 커스텀 로고 강제 적용
      Object.keys(_customLogos).forEach(function(k) {
        if (lobbyMap[k]) lobbyMap[k].img = _customLogos[k];
        else lobbyMap[k] = { img: _customLogos[k], id: '', vendor: k };
      });

      // ── vendorApi 설정에 따라 게임사 소스 결정 ──
      var csLiveNames = ['evolution','casino-sa','ag','wm','dream-gaming','sexybcrt','ezugi','allbet','bigGaming','skywind-live','pragmaticplay-live'];
      var csVendorByCode = {};
      if (csProviders && csProviders.result === 1 && Array.isArray(csProviders.data)) {
        csProviders.data.forEach(function(cp) {
          csVendorByCode[(cp.code||'').toLowerCase()] = cp;
        });
      }

      // vendorApi 설정에 따라 HonorLink 게임사를 CS API로 전환
      var hlVendorNames = {};
      Object.keys(vendors).forEach(function(k){ hlVendorNames[(vendors[k].name||'').toLowerCase()] = true; });

      // 벤더 표시이름 매핑
      var _csDisplayNames = { 'oriental': '오리엔탈 카지노 호텔' };
      // 한국어 게임사명 매핑
      var _krNames = {
        // 라이브 카지노
        'evolution': '에볼루션',
        'PragmaticPlay Live': '프라그마틱플레이 라이브',
        'Asia Gaming': '아시아게이밍',
        'DreamGame': '드림게임',
        'WM Live': 'WM 카지노',
        'ezugi': '에주기',
        'bota': '보타',
        'sexybcrt': '섹시바카라',
        'SuperSpade': '슈퍼스페이드',
        'Skywind Live': '스카이윈드 라이브',
        'vivo': '비보게이밍',
        'AllBet': '올벳',
        'saGaming': 'SA 게이밍',
        'SA Gaming': 'SA 게이밍',
        'Live88': '라이브88',
        'XProGaming': 'X프로게이밍',
        'MicroGaming': '마이크로게이밍',
        'oriental': '오리엔탈 카지노',
        '7-mojos': '세븐모조스',
        'absolute': '앱솔루트',
        'PlayTech': '플레이텍',
        'rocketman': '로켓맨',
        'tvbet': 'TV벳',
        'Betgames.tv': '벳게임즈TV',
        'bigGaming': '빅게이밍',
        // 슬롯
        'PragmaticPlay': '프라그마틱플레이',
        'Booongo': '부운고',
        'CQ9': 'CQ9',
        'evoplay': '에보플레이',
        'Nolimit City': '노리밋시티',
        'playngo': '플레이앤고',
        'Relax Gaming': '릴랙스게이밍',
        'retrogames': '레트로게임즈',
        'spribe': '스프라이브',
        'ELK': '엘크 스튜디오',
        'mobilots': '모비롯',
        'Hacksaw': '핵소',
        'dragoonsoft': '드라군소프트',
        'JILI': '질리',
        'jili': '질리',
        'PG Soft': 'PG소프트',
        'pgsoft': 'PG소프트',
        '1X2 Gaming': '1X2 게이밍',
        '7777': '7777',
        '7-mojos-slots': '세븐모조스 슬롯',
        'amatic': '아마틱',
        'amigogaming': '아미고게이밍',
        'AvatarUX': '아바타UX',
        'bfgames': 'BF게임즈',
        'bgaming': 'B게이밍',
        'Blueprint Gaming': '블루프린트 게이밍',
        'Booming': '부밍게임즈',
        'caletagaming': '칼레타게이밍',
        'eagaming': 'EA게이밍',
        'Expanse': '익스팬스',
        'Fantasma': '판타즈마',
        'FILS': 'FILS',
        'Galaxsys': '갤럭시스',
        'GameArt': '게임아트',
        'Greentube': '그린튜브',
        'Habanero': '하바네로',
        'homeslot': '홈슬롯',
        'iCONiX': '아이코닉스',
        'iMoon': '아이문',
        'Intouch Games': '인터치 게임즈',
        'JDB': 'JDB',
        'KA Gaming': 'KA게이밍',
        'kagaming': 'KA게이밍',
        'Kalamba': '칼람바',
        'Macaw': '마카오',
        'Mancala': '만칼라',
        'Merkur': '메르쿠르',
        'MicroGaming Plus': '마이크로게이밍 플러스',
        'MicroGaming Plus Slo': '마이크로게이밍 플러스',
        'MicroGamingSlot': '마이크로게이밍 슬롯',
        'mplay': 'M플레이',
        'NetEnt': '넷엔트',
        'netent': '넷엔트',
        'Octoplay': '옥토플레이',
        'OneTouch': '원터치',
        'onetouch': '원터치',
        'Petersons': '피터슨즈',
        'Platin Gaming': '플래틴게이밍',
        'Platipus': '플라티푸스',
        'PlayStar': '플레이스타',
        'playson': '플레이슨',
        'Popok': '포폭',
        'Quickspin': '퀵스핀',
        'Red Rake': '레드레이크',
        'redrake': '레드레이크',
        'Revolver': '리볼버',
        'RSG': 'RSG',
        'RubyPlay': '루비플레이',
        'Slotmill': '슬롯밀',
        'SmartSoft': '스마트소프트',
        'Spinomenal': '스피노메날',
        'Thunderkick': '썬더킥',
        'Wazdan': '와즈단',
        'Yggdrasil': '이그드라실',
        'Yolted': '욜티드',
        'fachai': '파차이',
        'netgame': '넷게임',
        'Asia Gaming Slot': '아시아게이밍 슬롯',
        'Skywind Slot': '스카이윈드 슬롯',
        'Betgames.tv Slot': '벳게임즈TV 슬롯',
        'Red Tiger': '레드타이거',
        'redtiger': '레드타이거',
        'Big Time Gaming': '빅타임게이밍',
        'bigtimegaming': '빅타임게이밍',
        'DreamTech': '드림텍',
        'dreamtech': '드림텍',
        'Novomatic': '노보매틱',
        'novomatic': '노보매틱'
      };
      // HonorLink 벤더 표시이름 오버라이드
      var _hlDisplayNames = {};

      // CS code → HL name 수동 매핑
      var csToHlMap = {
        'casino-pragmatic': 'PragmaticPlay Live',
        'casino-sa': 'saGaming',
        'casino-dream': 'DreamGame',
        'casino-ezugi': 'ezugi',
        'casino-micro': 'MicroGaming',
        'pragmaticplay': 'PragmaticPlay',
        'cq9': 'CQ9',
        'hbn': 'Habanero',
        'bng': 'Booongo',
        'nolimitcity': 'Nolimit City',
        'pg': 'PG Soft',
        'casino-playace': 'Asia Gaming'
      };
      // HL name → CS code 역방향 매핑
      var hlToCsMap = {};
      Object.keys(csToHlMap).forEach(function(code) { hlToCsMap[csToHlMap[code]] = code; });

      // 1) HonorLink 게임사 중 vendorApi가 'csapi'인 것을 CS API로 교체
      Object.keys(vendors).forEach(function(k) {
        var v = vendors[k];
        if (_hlDisplayNames[v.name]) v.displayName = _hlDisplayNames[v.name];
        var api = vendorApi[v.name];
        if (api === 'csapi') {
          // CS API에 같은 이름의 게임사가 있는지 확인 (직접 매칭 또는 수동 매핑)
          var csCode = hlToCsMap[v.name] || v.name.toLowerCase();
          var csMatch = csVendorByCode[csCode];
          if (csMatch) {
            vendors[k] = {
              name: v.name,
              displayName: v.displayName || v.name,
              enabled: true,
              _csapi: true,
              _gameid: csMatch.gameid,
              _code: csMatch.code
            };
          }
        }
      });

      // 2) CS API에만 있는 게임사 추가 (vendorApi가 'csapi'이거나 HonorLink에 없는 것)
      if (csProviders && csProviders.result === 1 && Array.isArray(csProviders.data)) {
        csProviders.data.forEach(function(cp) {
          // SxHotel은 별도 처리 (아너링크와 독립)
          if (cp.gameid === 'SxHotel') {
            var hotelName = cp.code + '_hotel';
            var hotelApi = vendorApi[hotelName];
            if (hotelApi === 'none') return;
            var hotelVendor = {
              name: hotelName,
              displayName: _csDisplayNames[(cp.code||'').toLowerCase()] || cp.name,
              enabled: true,
              _csapi: true,
              _gameid: cp.gameid,
              _code: cp.code
            };
            if (!lobbyMap[hotelName]) lobbyMap[hotelName] = { img: '', id: '', vendor: cp.code };
            vendors['cs_' + hotelName] = hotelVendor;
            return;
          }
          // 아너링크에 같은 이름이 있으면 중복 추가 안함
          var hlMapped = csToHlMap[(cp.code||'').toLowerCase()];
          if (hlMapped && hlVendorNames[hlMapped.toLowerCase()]) return;
          if (hlVendorNames[(cp.code||'').toLowerCase()] || hlVendorNames[(cp.name||'').toLowerCase()]) return;
          var api = vendorApi[cp.code];
          if (api === 'none') return; // 노출안함
          var fakeVendor = {
            name: cp.code,
            displayName: _csDisplayNames[(cp.code||'').toLowerCase()] || cp.name,
            enabled: true,
            _csapi: true,
            _gameid: cp.gameid,
            _code: cp.code
          };
          if (!lobbyMap[cp.code]) lobbyMap[cp.code] = { img: '', id: '', vendor: cp.code };
          vendors['cs_' + cp.code] = fakeVendor;
        });
      }

      var sportsNames = ['bti','xj'];
      var hotelNames = (vendorOrder.hotel || []).map(function(n){ return n.toLowerCase(); });
      var liveVendors = [];
      var slotVendors = [];
      var hotelVendors = [];
      var sportsVendors = [];
      // _mergeVendors에서 합쳐질 하위 게임사 목록
      var _mergedSubs = {};
      Object.keys(_mergeVendors).forEach(function(k) {
        _mergeVendors[k].forEach(function(sub) { _mergedSubs[sub] = true; });
      });

      // 라이브+슬롯 혼합 벤더 (양쪽에 모두 표시)
      var mixedVendors = ['Betgames.tv','onetouch'];

      Object.keys(vendors).forEach(function(key){
        var v = vendors[key];
        if (!v.enabled) return;
        if (_mergedSubs[v.name]) return;
        // 혼합 벤더: hiddenVendors/vendorApi를 각 clone별로 개별 체크
        if (mixedVendors.indexOf(v.name) >= 0) {
          var liveApi = vendorApi[v.name] || 'honorlink';
          if (hiddenVendors.indexOf(v.name) < 0 && liveApi !== 'none') liveVendors.push(v);
          var slotClone = Object.assign({}, v, { name: v.name + '_slot', _mixedSlot: true, _hlVendor: v.name, displayName: v.name + '_slot' });
          var slotApi = vendorApi[slotClone.name] || vendorApi[v.name] || 'none';
          if (hiddenVendors.indexOf(slotClone.name) < 0 && hiddenVendors.indexOf(v.name) < 0 && slotApi !== 'none') slotVendors.push(slotClone);
          return;
        }
        if (hiddenVendors.indexOf(v.name) >= 0) return;
        if (vendorApi[v.name] === 'none') return;
        if (sportsNames.indexOf(v.name.toLowerCase()) >= 0) sportsVendors.push(v);
        else if (v._csapi && v._gameid === 'SxHotel') hotelVendors.push(v);
        else if (hotelNames.indexOf(v.name.toLowerCase()) >= 0) hotelVendors.push(v);
        else if (v._csapi && (v._code && (csLiveNames.indexOf(v._code) >= 0 || (csVendorByCode[v._code.toLowerCase()] && csVendorByCode[v._code.toLowerCase()].type === 'live')))) liveVendors.push(v);
        else if (v._csapi) slotVendors.push(v);
        else if (liveNames.indexOf(v.name) >= 0) liveVendors.push(v);
        else slotVendors.push(v);
      });

      // 어드민 설정 순서 적용
      function sortByOrder(list, order) {
        if (!order || !order.length) return list;
        list.sort(function(a, b) {
          var ai = order.indexOf(a.name);
          var bi = order.indexOf(b.name);
          if (ai < 0) ai = 99999;
          if (bi < 0) bi = 99999;
          return ai - bi;
        });
        return list;
      }
      sortByOrder(liveVendors, vendorOrder.live);
      sortByOrder(slotVendors, vendorOrder.slot);
      sortByOrder(hotelVendors, vendorOrder.hotel);
      sortByOrder(sportsVendors, vendorOrder.sports);

      // ── 라이브 카지노: 클릭 시 바로 로비 접속 ──
      {
        var row1 = document.getElementById('live-grid-row1');
        if (row1) {
          row1.innerHTML = liveVendors.map(function(v){
            var safeName = v.name.replace(/'/g, '');
            var lobby = lobbyMap[v.name];
            var img = lobby ? lobby.img : '';
            var lobbyId = lobby ? lobby.id : '';
            var click;
            if (v._csapi) {
              // CS API 라이브: subcode는 게임 리스트의 subcode 사용 (evolution만 특수)
              var _liveSub = (v._code||'').toLowerCase() === 'evolution' ? 'evolution' : 'lobby';
              click = 'launchGame(\'' + (v._code||'').replace(/'/g,'') + '\',\'' + _liveSub + '\',\'' + safeName + '\')';
            } else if (v.name === '7-mojos') {
              click = 'launchHL(\'7-mojos\',\'30511\',\'Turkish Roulette\')';
            } else if (v.name === 'Betgames.tv') {
              click = 'launchHL(\'Betgames.tv\',\'bg_combination_game\',\'Betgames.tv\')';
            } else if (v.name === 'PlayTech') {
              click = 'launchHL(\'PlayTech\',\'ubal\',\'Baccarat Live\')';
            } else if (v.name === 'rocketman') {
              click = 'launchHL(\'rocketman\',\'256\',\'Rocketman\')';
            } else if (v.name === 'tvbet') {
              click = 'launchHL(\'tvbet\',\'46012\',\'TVBet\')';
            } else {
              click = lobbyId
                ? 'launchHL(\'' + safeName + '\',\'' + lobbyId + '\',\'' + safeName + '\')'
                : 'openHLGameModal(\'' + safeName + '\',\'' + safeName + '\',\'live\')';
            }
            var _dn = v.displayName || v.name;
            return makeCard(_krNames[_dn] || _krNames[v.name] || _dn, img, click, v.name);
          }).join('');
        }
        // 라이브 벤더 없으면 섹션 숨기기 (현재 탭 상태 유지)
        var liveSection = document.getElementById('live-section');
        var isLiveTab = document.querySelector('.g-tab.active[data-side="left"]');
        if (liveSection) {
          if (!liveVendors.length) liveSection.style.display = 'none';
          else if (isLiveTab) liveSection.style.display = '';
        }
      }

      // ── 슬롯: 게임사 이미지 + 로고 카드 ──
      var srow1 = document.getElementById('slot-grid-row1');
      if (srow1) {
        srow1.innerHTML = slotVendors.map(function(v){
          var safeName = v.name.replace(/'/g, '');
          var lobby = lobbyMap[v.name];
          var img = lobby ? lobby.img : '';
          var click;
          if (v._csapi) {
            // CS API 슬롯: 게임 목록 모달
            click = 'openSlotGameModal(\'' + (v._code||'').replace(/'/g,'') + '\',\'' + (v._gameid||'').replace(/'/g,'') + '\',\'' + (v.displayName||v.name).replace(/'/g,'') + '\')';
          } else {
            var _hlName = v._hlVendor ? v._hlVendor.replace(/'/g,'') : safeName;
            var _slotFilter = v._mixedSlot ? ',\'slot\'' : '';
            click = 'openHLGameModal(\'' + _hlName + '\',\'' + (v.displayName || v.name).replace(/'/g,'') + '\'' + _slotFilter + ')';
          }
          var _sdn = v.displayName || v.name;
          return makeSlotCard(_krNames[_sdn] || _krNames[v.name] || _sdn, img, click, v.name);
        }).join('');

        // 썸네일 없는 벤더만 첫 게임 이미지 비동기 로드
        slotVendors.forEach(function(v, idx){
          if (lobbyMap[v.name] && lobbyMap[v.name].img) return;
          var _fetchVendor = v._hlVendor || v.name;
          authFetch('/api/hl/games?vendor=' + encodeURIComponent(_fetchVendor))
            .then(function(r){ return r.json(); })
            .then(function(games){
              if (!Array.isArray(games) || !games.length) return;
              var img = (games[0].thumbnails && games[0].thumbnails['300x300']) || games[0].thumbnail || '';
              if (!img) return;
              var cards = srow1.querySelectorAll('.live-card');
              if (cards[idx]) {
                var thumb = cards[idx].querySelector('.live-thumb');
                if (thumb) {
                  var existingLogo = thumb.querySelector('img[style*="position:absolute"], span[style*="position:absolute"]');
                  var logoKeep = existingLogo ? existingLogo.outerHTML : '';
                  thumb.innerHTML = '<img src="'+img+'" alt="'+v.name+'" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;" loading="lazy">' + logoKeep;
                }
              }
            })
            .catch(function(){});
        });
        // 슬롯 벤더 없으면 섹션 숨기기 (현재 탭 상태 유지)
        var slotSection = document.getElementById('slot-section');
        var isSlotTab = document.querySelector('.g-tab.active[data-side="right"]');
        if (slotSection) {
          if (!slotVendors.length) slotSection.style.display = 'none';
          else if (isSlotTab) slotSection.style.display = '';
        }
      }

      // ── 호텔카지노: 슬롯 아래 ──
      var hrow1 = document.getElementById('hotel-grid-row1');
      if (hrow1) {
        hrow1.innerHTML = hotelVendors.map(function(v){
          var safeName = v.name.replace(/'/g, '');
          var lobby = lobbyMap[v.name];
          var img = lobby ? lobby.img : '';
          var click;
          if (v._csapi) {
            click = 'launchGame(\'' + (v._code||'').replace(/'/g,'') + '\',\'' + (v._code||'').replace(/'/g,'') + '\',\'' + safeName + '\')';
          } else {
            click = 'launchHL(\'' + safeName + '\',\'1\',\'' + (v.displayName || v.name).replace(/'/g,'') + '\')';
          }
          var _hdn = v.displayName || v.name;
          return makeCard(_krNames[_hdn] || _krNames[v.name] || _hdn, img, click, v.name);
        }).join('');
      }
      var hotelSection = document.getElementById('hotel-section');
      var isLiveCasinoTab = document.querySelector('.g-tab.active[data-side="left"]');
      if (hotelSection) {
        if (!hotelVendors.length) hotelSection.style.display = 'none';
        else if (isLiveCasinoTab) hotelSection.style.display = '';
        else hotelSection.style.display = 'none';
      }

      // ── 스포츠 섹션 렌더링 ──
      var sportsGrid = document.getElementById('sports-grid');
      if (sportsGrid && sportsVendors.length) {
        sportsGrid.innerHTML = sportsVendors.map(function(v){
          var safeName = v.name.replace(/'/g, '');
          var lobby = lobbyMap[v.name];
          var img = lobby ? lobby.img : '';
          var click = 'openHLGameModal(\'' + safeName + '\',\'' + safeName + '\')';
          return makeCard(v.name, img, click);
        }).join('');
      }
    })
    .catch(function(){});

  }); // sessionRefresh.then 끝
})();

// ── 슬라이드 리스트 공통 함수 ──
function makeSlideList(containerId, rows) {
  const container = document.getElementById(containerId);
  if(!container) return;

  // 트랙 생성 (20개 복제해서 무한루프)
  const track = document.createElement('div');
  track.style.cssText = 'will-change:transform;';
  track.innerHTML = rows + rows;
  container.appendChild(track);

  let paused = false;
  let pos = 0;

  container.addEventListener('mouseenter', function(){ paused = true; });
  container.addEventListener('mouseleave', function(){ paused = false; });
  container.addEventListener('wheel', function(e){ e.preventDefault(); }, { passive: false });

  setTimeout(function(){
    const rowH = track.scrollHeight / 2 / 20;
    const totalH = track.scrollHeight / 2;

    function step() {
      if(paused) { timeoutId = setTimeout(step, 100); return; }
      const target = pos + rowH;
      const duration = 600;
      const startTime = performance.now();
      const from = pos;

      function animate(now) {
        if(paused) { setTimeout(step, 100); return; }
        const t = Math.min((now - startTime) / duration, 1);
        const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
        pos = from + rowH * ease;
        if(pos >= totalH) pos -= totalH;
        track.style.transform = 'translateY(-'+pos+'px)';
        if(t < 1) {
          requestAnimationFrame(animate);
        } else {
          pos = target >= totalH ? target - totalH : target;
          track.style.transform = 'translateY(-'+pos+'px)';
          setTimeout(step, 1500);
        }
      }
      rafId = requestAnimationFrame(animate);
    }
    step();
  }, 100);
}

// ── 실시간 당첨 ──
(function(){
  const names = ['kim','lee','par','cho','han','yoo','jung','kang','shin','oh','lim','choi','moon','song','ahn','jang','hong','bae','yoon','ryu'];
  function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function nowTime(){ const d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
  let html = '';
  for(let i=0;i<20;i++){
    const name = names[rand(0,names.length-1)]+'***';
    const amount = (rand(1,50)*10000).toLocaleString();
    html += `<div class="t-row"><div class="t-user"><div class="t-avatar">👤</div>${name}</div><div class="t-amount">₩${amount}</div><div class="t-time">${nowTime()}</div></div>`;
  }
  makeSlideList('win-list', html);
})();

// ── 입금 현황 ──
(function(){
  const names = ['min','seo','yoo','kang','lim','kim','lee','par','cho','han','jung','shin','oh','choi','moon','hong','bae','yoon','ahn','ryu'];
  function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function nowTime(){ const d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
  let html = '';
  for(let i=0;i<20;i++){
    const name = names[rand(0,names.length-1)]+'***';
    const amount = (rand(1,50)*10000).toLocaleString();
    html += `<div class="t-row"><div class="t-user"><div class="t-avatar">👤</div>${name}</div><div class="t-amount green">₩${amount}</div><div class="t-time">${nowTime()}</div></div>`;
  }
  makeSlideList('deposit-list', html);
})();


// ── 공지사항 (유저보이기 ON인 공지만 표시) ──
(function(){
  function todayStr() {
    var d = new Date();
    return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
  }
  function hideKey(title) { return 'noticehide_' + title; }
  function isHiddenToday(title) { return localStorage.getItem(hideKey(title)) === todayStr(); }
  function setHideToday(title)  { localStorage.setItem(hideKey(title), todayStr()); }

  async function loadAllNotices() {
    try {
      var res = await authFetch('/api/user/notices');
      var data = await res.json();
      var all = data.success ? (data.data || []) : [];
      return all.sort(function(a,b){ return (a.rank||99)-(b.rank||99); });
    } catch(e) { return []; }
  }

  async function renderNotices() {
    var el = document.getElementById('notice-list');
    if(!el) return;
    var all = await loadAllNotices();

    // 공지사항 목록: userShow ON인 것만
    var showList = all.filter(function(n){ return n.userShow; });
    if(showList.length === 0) {
      el.innerHTML = '<div style="color:#666;font-size:0.82rem;padding:16px;text-align:center;">등록된 공지사항이 없습니다.</div>';
    } else {
      el.innerHTML = showList.map(function(n, i){
        return '<div class="notice-item" data-ni="'+i+'" style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;">'
          + '<div style="font-size:0.82rem;color:#d4af37;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(n.title||'')+'</div>'
          + '<div style="font-size:0.7rem;color:#666;margin-top:2px;">'+(n.createdAt||'')+'</div>'
          + '</div>';
      }).join('');
      el.querySelectorAll('.notice-item').forEach(function(item){
        item.addEventListener('click', function(){
          switchTab('notice', document.querySelector('.nav-link[data-tab="notice"]'));
        });
      });
    }

    // 팝업: userPopup ON인 것 (userShow 여부 무관) + 오늘 숨김 아닌 것
    var popupList = all.filter(function(n){ return n.userPopup && !isHiddenToday(n.title); });
    // 이벤트 userPopup도 합침
    try {
      var evRes = await authFetch('/api/user/events');
      var evData = await evRes.json();
      (evData.data || []).forEach(function(ev){ if(ev.userPopup && !isHiddenToday(ev.title)) popupList.push(ev); });
    } catch(e) {}
    if(popupList.length > 0) openMultiPopup(popupList);
  }

  // ── 여러 팝업을 가로로 나란히 띄우는 오버레이 ──
  function openMultiPopup(notices) {
    var ovId = 'nc-multi-overlay';
    var existing = document.getElementById(ovId);
    if(existing) existing.remove();

    var ov = document.createElement('div');
    ov.id = ovId;
    ov.style.cssText = [
      'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;',
      'display:flex;align-items:center;justify-content:center;',
      'padding:20px;overflow:auto;'
    ].join('');

    var cardsHtml = notices.map(function(n, i){
      var hasImg = n.image && n.image.length > 0;
      return '<div class="nc-popup-card" data-title="'+encodeURIComponent(n.title)+'" style="'
        + 'background:#111118;border:1px solid #d4af37;'
        + 'width:280px;height:496px;flex-shrink:0;'
        + 'position:relative;overflow:hidden;'
        + '">'
        // X 버튼 절대 고정
        + '<div style="position:absolute;top:7px;right:8px;z-index:3;">'
        +   '<button class="nc-card-x" style="background:rgba(0,0,0,0.55);border:none;color:#fff;font-size:1rem;cursor:pointer;border-radius:50%;width:28px;height:28px;line-height:1;">✕</button>'
        + '</div>'
        // 이미지 or 텍스트 (상단~버튼위까지)
        + (hasImg
          ? '<img src="'+n.image+'" style="position:absolute;top:0;left:0;width:280px;height:448px;display:block;object-fit:cover;">'
          : '<div style="position:absolute;top:0;left:0;width:280px;height:448px;box-sizing:border-box;padding:14px 16px;overflow-y:auto;white-space:pre-wrap;line-height:1.75;color:#ddd;font-size:0.83rem;">'
          +   '<div style="color:#d4af37;font-weight:700;font-size:0.9rem;margin-bottom:10px;">'+(n.title||'')+'</div>'
          +   (n.content||'내용 없음').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          + '</div>'
        )
        // 하단 버튼 절대 고정 (항상 동일 위치)
        + '<div style="position:absolute;bottom:0;left:0;width:280px;height:48px;box-sizing:border-box;border-top:1px solid rgba(212,175,55,0.25);padding:7px 14px;background:#111118;">'
        +   '<button class="nc-card-hide" style="width:252px;height:34px;background:#1c1c28;border:1px solid rgba(212,175,55,0.3);color:#aaa;border-radius:6px;cursor:pointer;font-size:0.78rem;">오늘 하루 이창을 열지 않음</button>'
        + '</div>'
        + '</div>';
    }).join('');

    ov.innerHTML = '<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:nowrap;">'+cardsHtml+'</div>';
    document.body.appendChild(ov);

    // 각 카드 이벤트
    ov.querySelectorAll('.nc-popup-card').forEach(function(card, i){
      var n = notices[i];
      function removeCard() {
        card.remove();
        // 모든 카드 사라지면 오버레이도 제거
        if(!ov.querySelector('.nc-popup-card')) ov.remove();
      }
      card.querySelector('.nc-card-x').addEventListener('click', removeCard);
      card.querySelector('.nc-card-hide').addEventListener('click', function(){
        setHideToday(n.title);
        removeCard();
      });
    });

  }

  renderNotices();

  // ── 이벤트 info-box 채우기 ──
  (async function() {
    var el = document.getElementById('event-info-list');
    if(!el) return;
    var events = [];
    try {
      var res = await authFetch('/api/user/events');
      var data = await res.json();
      if(data.success) events = data.data;
    } catch(e) {}
    var visible = events.filter(function(ev){ return ev.userShow; });
    if(visible.length === 0) {
      el.innerHTML = '<div style="color:#666;font-size:0.82rem;padding:16px;text-align:center;">진행 중인 이벤트가 없습니다.</div>';
      return;
    }
    el.innerHTML = visible.map(function(ev){
      var period = (ev.startDate||'') + (ev.endDate ? ' ~ '+ev.endDate : '');
      return '<div class="notice-item" style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;" onclick="openInfoModal(\'event\')">'
        + '<div style="font-size:0.82rem;color:#d4af37;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(ev.title||'')+'</div>'
        + '<div style="font-size:0.7rem;color:#666;margin-top:2px;">'+(period||ev.createdAt||'')+'</div>'
        + '</div>';
    }).join('');
  })();
})();

// ── 충전 신청 제출 ──
async function submitDeposit() {
  if(!_session) return;
  var amount  = parseInt((document.getElementById('dep-amount').value||'0').replace(/,/g,'')) || 0;
  var errEl   = document.getElementById('dep-err');
  errEl.style.display = 'none';
  if(amount <= 0) { errEl.textContent='금액을 입력해주세요.'; errEl.style.display='block'; return; }
  if(amount < 10000) { errEl.textContent='최소 입금금액은 10,000원입니다.'; errEl.style.display='block'; return; }

  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var dt = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());

  // 선택된 보너스
  var bonusEl = document.querySelector('.tw-bonus-btn.active');
  var bonus = bonusEl ? bonusEl.textContent.trim() : '';

  try {
    var res = await authFetch('/api/user/transfers', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        type: 'deposit',
        userId: _session.username, nick: _session.nickname||_session.username,
        amount: amount, bonus: bonus,
        bank: _session.bank||'', account: _session.account||'', holder: _session.holder||'',
        datetime: dt, status: 'pending', memo: ''
      })
    });
    var data = await res.json();
    if(!data.success) { errEl.textContent='신청 오류: '+(data.error||''); errEl.style.display='block'; return; }
    closeModal('deposit');
    document.getElementById('dep-amount').value='0';
    showToast('입금 신청이 완료되었습니다.');
  } catch(e) {
    errEl.textContent='서버 연결 오류가 발생했습니다.'; errEl.style.display='block';
  }
}

// ── 환전 신청 제출 ──
async function submitWithdraw() {
  if(!_session) return;
  var amount  = parseInt((document.getElementById('wit-amount').value||'0').replace(/,/g,'')) || 0;
  var errEl   = document.getElementById('wit-err');
  errEl.style.display = 'none';
  var witPw = (document.getElementById('wit-password') ? document.getElementById('wit-password').value : '').trim();
  if(!witPw) { errEl.textContent='출금 비밀번호를 입력해주세요.'; errEl.style.display='block'; return; }
  if(amount <= 0) { errEl.textContent='금액을 입력해주세요.'; errEl.style.display='block'; return; }
  if(amount < 10000) { errEl.textContent='최소 출금금액은 10,000원입니다.'; errEl.style.display='block'; return; }
  var bal = Number(_session.balance||_session.money||0);
  if(amount > bal) { errEl.textContent='보유 금액이 부족합니다.'; errEl.style.display='block'; return; }

  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var dt = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());

  try {
    var res = await authFetch('/api/user/transfers', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        type: 'withdraw',
        userId: _session.username, nick: _session.nickname||_session.username,
        amount: amount,
        bank: _session.bank||'', account: _session.account||'', holder: _session.holder||'',
        datetime: dt, status: 'pending', memo: ''
      })
    });
    var data = await res.json();
    if(!data.success) { errEl.textContent=data.error||'신청 오류'; errEl.style.display='block'; return; }
    // 즉시 잔액 반영 (서버에서 이미 차감됨)
    _session.balance = (Number(_session.balance||0) - amount);
    _session.money = _session.balance;
    _prevBalance = _session.balance;
    var s = JSON.stringify(_session);
    sessionStorage.setItem('casino_user', s);
    if (localStorage.getItem('casino_user')) localStorage.setItem('casino_user', s);
    renderHeader();
    closeModal('withdraw');
    document.getElementById('wit-amount').value='0';
    showToast('출금 신청이 완료되었습니다.');
  } catch(e) {
    errEl.textContent='서버 연결 오류가 발생했습니다.'; errEl.style.display='block';
  }
}

// ── 문의 제출 ──
async function submitInquiry() {
  if(!_session) { showToast('로그인이 필요합니다.'); return; }
  var title   = document.getElementById('inq-title').value.trim();
  var content = document.getElementById('inq-content').value.trim();
  if(!title)   { showToast('제목을 입력해주세요.'); return; }
  if(!content) { showToast('내용을 입력해주세요.'); return; }

  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var dt = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());

  try {
    var res = await authFetch('/api/user/inquiries', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        userId: _session.username, nick: _session.nickname||_session.username,
        title: title, content: content,
        datetime: dt, status: 'open', answer: '', answeredAt: ''
      })
    });
    var data = await res.json();
    if(!data.success) { showToast('접수 오류: '+(data.error||'')); return; }
    document.getElementById('inq-title').value='';
    document.getElementById('inq-content').value='';
    closeInquiryModal();
    showToast('문의가 접수되었습니다.');
    loadSupportSection();
  } catch(e) {
    showToast('서버 연결 오류가 발생했습니다.');
  }
}

// ── 이벤트 섹션 로드 ──
async function loadEventSection() {
  var el = document.getElementById('event-list');
  if(!el) return;
  var events = [];
  try {
    var res = await authFetch('/api/user/events');
    var data = await res.json();
    if(data.success) events = data.data;
  } catch(e) {}
  var visible = events.filter(function(ev){ return ev.userShow; });
  if(visible.length === 0) {
    el.innerHTML = '<div style="color:#666;font-size:0.85rem;text-align:center;padding:40px;grid-column:1/-1;">진행 중인 이벤트가 없습니다.</div>';
    return;
  }
  el.innerHTML = visible.map(function(ev){
    var period = (ev.startDate||'') + ' ~ ' + (ev.endDate||'');
    return '<div style="background:rgba(8,7,5,0.8);border:1px solid rgba(200,168,75,0.25);border-radius:10px;overflow:hidden;cursor:pointer;" onclick="openEventDetail(this)" data-title="'+encodeURIComponent(ev.title||'')+'" data-content="'+encodeURIComponent(ev.content||'')+'">'
      + (ev.image ? '<img src="'+ev.image+'" style="width:100%;height:180px;object-fit:cover;display:block;">' : '<div style="width:100%;height:120px;background:rgba(200,168,75,0.06);display:flex;align-items:center;justify-content:center;"><i class="fas fa-gift" style="font-size:2rem;color:rgba(200,168,75,0.3);"></i></div>')
      + '<div style="padding:16px;">'
      + '<div style="color:#d4af37;font-weight:700;font-size:0.9rem;margin-bottom:6px;">'+(ev.title||'')+'</div>'
      + '<div style="color:#666;font-size:0.74rem;">'+(period)+'</div>'
      + '</div></div>';
  }).join('');
}

function openEventDetail(card) {
  var title   = decodeURIComponent(card.dataset.title||'');
  var content = decodeURIComponent(card.dataset.content||'');
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = '<div style="background:#111118;border:1px solid rgba(200,168,75,0.3);border-radius:10px;width:100%;max-width:500px;max-height:80vh;overflow-y:auto;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(200,168,75,0.15);">'
    + '<span style="color:#d4af37;font-weight:700;">'+title+'</span>'
    + '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:none;border:none;color:#aaa;font-size:1.2rem;cursor:pointer;">✕</button>'
    + '</div>'
    + '<div style="padding:20px;color:#ddd;font-size:0.85rem;line-height:1.7;white-space:pre-wrap;">'+content+'</div>'
    + '</div>';
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);
}

// ── 고객센터 섹션 로드 ──
var _csPage = 1;
var _csPerPage = 10;
var _csData = [];

// ── 쪽지함 섹션 ──
var _msgList = [];
var _msgPage = 1;
var _msgPerPage = 10;

async function loadMessageSection() {
  if(!_session) {
    var tbody = document.getElementById('msg-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:#475569;">로그인 후 확인하실 수 있습니다.</td></tr>';
    return;
  }
  try {
    var res = await authFetch('/api/user/messages?userId=' + encodeURIComponent(_session.username));
    var data = await res.json();
    _msgList = data.success ? (data.data || []) : [];
  } catch(e) { _msgList = []; }
  _msgPage = 1;
  _renderMsgTable();
  _updateMsgBadge();
}

function _renderMsgTable() {
  var tbody = document.getElementById('msg-tbody');
  if(!tbody) return;
  var total = _msgList.length;
  if(total === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:#475569;">쪽지가 없습니다.</td></tr>';
    var pg = document.getElementById('msg-pagination');
    if(pg) pg.innerHTML = '';
    return;
  }
  var start = (_msgPage - 1) * _msgPerPage;
  var pageItems = _msgList.slice(start, start + _msgPerPage);
  tbody.innerHTML = pageItems.map(function(m, i){
    var num = total - start - i;
    var dateStr = m.createdAt ? m.createdAt.replace('T',' ').substring(0,16) : '';
    var title = (m.title || '').replace(/</g, '&lt;');
    var readStatus = m.read
      ? '<span style="color:#4ade80;font-size:0.78rem;">읽음</span>'
      : '<span style="color:#f59e0b;font-size:0.78rem;font-weight:700;">안읽음</span>';
    var rowBg = m.read ? 'transparent' : 'rgba(245,158,11,0.04)';
    var titleWeight = m.read ? '400' : '600';
    return '<tr style="border-bottom:1px solid #1e293b;cursor:pointer;background:'+rowBg+';" onclick="openMsgDetail('+start+'+'+i+')" onmouseover="this.style.background=\'#1e293b\'" onmouseout="this.style.background=\''+rowBg+'\'">'
      + '<td style="padding:12px 16px;text-align:center;color:#64748b;">'+num+'</td>'
      + '<td style="padding:12px 16px;color:#e2e8f0;font-weight:'+titleWeight+';">'+title+'</td>'
      + '<td style="padding:12px 16px;text-align:center;">'+readStatus+'</td>'
      + '<td style="padding:12px 16px;text-align:center;color:#64748b;">'+dateStr+'</td>'
      + '<td style="padding:12px 16px;text-align:center;"><button onclick="event.stopPropagation();deleteMsg(\''+m.id+'\')" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:0.85rem;"><i class="fas fa-trash"></i></button></td>'
      + '</tr>';
  }).join('');

  // 페이지네이션
  var totalPages = Math.ceil(total / _msgPerPage);
  var pg = document.getElementById('msg-pagination');
  if(!pg || totalPages <= 1) { if(pg) pg.innerHTML = ''; return; }
  var html = '';
  if(_msgPage > 1) html += '<button onclick="_msgGoPage('+(_msgPage-1)+')" style="background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:0.8rem;">이전</button>';
  for(var p=1;p<=totalPages;p++){
    var active = p === _msgPage;
    html += '<button onclick="_msgGoPage('+p+')" style="background:'+(active?'#d4af37':'#1e293b')+';border:1px solid '+(active?'#d4af37':'#334155')+';color:'+(active?'#000':'#94a3b8')+';border-radius:4px;padding:6px 12px;cursor:pointer;font-size:0.8rem;font-weight:'+(active?'700':'400')+';">'+p+'</button>';
  }
  if(_msgPage < totalPages) html += '<button onclick="_msgGoPage('+(_msgPage+1)+')" style="background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:0.8rem;">다음</button>';
  pg.innerHTML = html;
}

function _msgGoPage(p) { _msgPage = p; _renderMsgTable(); }

function openMsgDetail(idx) {
  var m = _msgList[idx];
  if(!m) return;
  // 읽음 처리
  if(!m.read) {
    m.read = true;
    authFetch('/api/user/messages/' + m.id + '/read', { method: 'PATCH' }).catch(function(){});
    _renderMsgTable();
    _updateMsgBadge();
  }
  var modal = document.getElementById('msg-detail-modal');
  if(!modal) return;
  document.getElementById('msg-detail-title').textContent = m.title || '';
  document.getElementById('msg-detail-date').textContent = m.createdAt ? m.createdAt.replace('T',' ').substring(0,16) : '';
  document.getElementById('msg-detail-body').innerHTML = (m.content || '').replace(/\n/g, '<br>');
  modal.style.display = 'flex';
}

function closeMsgDetail() {
  var modal = document.getElementById('msg-detail-modal');
  if(modal) modal.style.display = 'none';
}

async function deleteMsg(id) {
  if(!(await customConfirm('이 쪽지를 삭제하시겠습니까?'))) return;
  try {
    await authFetch('/api/user/messages/' + id, { method: 'DELETE' });
    _msgList = _msgList.filter(function(m){ return m.id !== id; });
    _renderMsgTable();
    _updateMsgBadge();
  } catch(e) {}
}

async function readAllMsg() {
  if(!_session) return;
  await authFetch('/api/user/messages/read-all', {
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId: _session.username })
  });
  _msgList.forEach(function(m){ m.read = true; });
  _renderMsgTable();
  _updateMsgBadge();
  showToast('모든 쪽지를 읽음 처리했습니다.');
}

async function deleteAllMsg() {
  if(!_session) return;
  if(!(await customConfirm('모든 쪽지를 삭제하시겠습니까?'))) return;
  await authFetch('/api/user/messages/delete-all?userId=' + encodeURIComponent(_session.username), { method:'DELETE' });
  _msgList = [];
  _renderMsgTable();
  _updateMsgBadge();
  showToast('모든 쪽지가 삭제되었습니다.');
}

function _updateMsgBadge() {
  var badge = document.getElementById('msg-unread-badge');
  if(!badge) return;
  var unread = _msgList.filter(function(m){ return !m.read; }).length;
  if(unread > 0) {
    badge.textContent = unread;
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }
}

// 쪽지 폴링 (새 쪽지 감지 + 배지 업데이트)
var _prevMsgIds = null;
function _startMsgPolling() {
  if(!_session) return;
  // 초기 로드
  authFetch('/api/user/messages?userId=' + encodeURIComponent(_session.username))
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d.success) {
        _msgList = d.data || [];
        _prevMsgIds = {};
        _msgList.forEach(function(m){ _prevMsgIds[m.id] = true; });
        _updateMsgBadge();
      }
    }).catch(function(){});

  setInterval(function(){
    if(!_session || _prevMsgIds === null) return;
    authFetch('/api/user/messages?userId=' + encodeURIComponent(_session.username))
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(!d.success) return;
        _msgList = d.data || [];
        var hasNew = false;
        _msgList.forEach(function(m){
          if(!_prevMsgIds[m.id]) { hasNew = true; _prevMsgIds[m.id] = true; }
        });
        if(hasNew) {
          _updateMsgBadge();
          _showNewMsgAlert();
          // 쪽지 탭이 열려있으면 테이블 갱신
          var sec = document.getElementById('message-section');
          if(sec && sec.style.display !== 'none') _renderMsgTable();
        }
      }).catch(function(){});
  }, 5000);
}

function _showNewMsgAlert() {
  var existing = document.getElementById('new-msg-alert-modal');
  if(existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'new-msg-alert-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);opacity:0;transition:opacity 0.3s;';

  overlay.innerHTML = '<div style="background:linear-gradient(180deg,#0a1628 0%,#0d0d1a 100%);border:1px solid #d4af37;border-radius:16px;width:380px;max-width:90vw;box-shadow:0 20px 60px rgba(200,168,75,0.25);animation:iqPop 0.4s ease;overflow:hidden;">'
    + '<div style="text-align:center;padding:28px 24px 12px;">'
    + '<div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#d4af37,#e8d48b);margin-bottom:14px;">'
    + '<i class="fas fa-envelope-open-text" style="font-size:1.8rem;color:#1a1500;"></i>'
    + '</div>'
    + '<div style="font-size:1.2rem;font-weight:800;color:#d4af37;">새 쪽지가 도착했습니다</div>'
    + '<div style="font-size:0.85rem;color:#94a3b8;margin-top:8px;">쪽지함에서 확인해주세요.</div>'
    + '</div>'
    + '<div style="padding:8px 24px 24px;display:flex;gap:10px;">'
    + '<button id="new-msg-go" style="flex:1;padding:12px;border:none;border-radius:8px;background:linear-gradient(135deg,#d4af37,#b8943b);color:#1a1500;font-size:0.9rem;font-weight:700;cursor:pointer;">쪽지함 가기</button>'
    + '<button id="new-msg-close" style="flex:1;padding:12px;border:none;border-radius:8px;background:#1e293b;color:#94a3b8;font-size:0.9rem;font-weight:700;cursor:pointer;">닫기</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);
  requestAnimationFrame(function(){ overlay.style.opacity = '1'; });

  function closeModal() {
    overlay.style.opacity = '0';
    setTimeout(function(){ overlay.remove(); }, 300);
  }
  document.getElementById('new-msg-close').addEventListener('click', closeModal);
  document.getElementById('new-msg-go').addEventListener('click', function(){
    closeModal();
    switchTab('message', document.querySelector('.nav-link[data-tab="message"]'));
  });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });
}

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(_startMsgPolling, 2500);
});

// ── 공지사항 섹션 (테이블 형식) ──
var _noticeData = [];
var _noticePage = 1;
var _noticePerPage = 10;

async function loadNoticeSection() {
  try {
    var res = await authFetch('/api/user/notices');
    var data = await res.json();
    _noticeData = (data.success ? data.data || [] : []).filter(function(n){ return n.userShow; });
    _noticeData.sort(function(a,b){ return (a.rank||99) - (b.rank||99); });
  } catch(e) { _noticeData = []; }
  _noticePage = 1;
  _renderNoticeTable();
}

function _renderNoticeTable() {
  var tbody = document.getElementById('notice-tbody');
  if(!tbody) return;
  var total = _noticeData.length;
  if(total === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="padding:40px;text-align:center;color:#475569;">등록된 공지사항이 없습니다.</td></tr>';
    var pg = document.getElementById('notice-pagination');
    if(pg) pg.innerHTML = '';
    return;
  }
  var start = (_noticePage - 1) * _noticePerPage;
  var pageItems = _noticeData.slice(start, start + _noticePerPage);
  tbody.innerHTML = pageItems.map(function(n, i){
    var num = total - start - i;
    var dateStr = n.createdAt || '';
    var title = (n.title || '').replace(/</g, '&lt;');
    return '<tr style="border-bottom:1px solid #1e293b;cursor:pointer;" onclick="openNoticeDetail('+start+'+'+i+')" onmouseover="this.style.background=\'#1e293b\'" onmouseout="this.style.background=\'transparent\'">'
      + '<td style="padding:12px 16px;text-align:center;color:#64748b;">'+num+'</td>'
      + '<td style="padding:12px 16px;color:#e2e8f0;">'+title+'</td>'
      + '<td style="padding:12px 16px;text-align:center;color:#64748b;">'+dateStr+'</td>'
      + '</tr>';
  }).join('');

  // 페이지네이션
  var totalPages = Math.ceil(total / _noticePerPage);
  var pg = document.getElementById('notice-pagination');
  if(!pg || totalPages <= 1) { if(pg) pg.innerHTML = ''; return; }
  var html = '';
  if(_noticePage > 1) html += '<button onclick="_noticeGoPage('+(_noticePage-1)+')" style="background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:0.8rem;">이전</button>';
  for(var p=1;p<=totalPages;p++){
    var active = p === _noticePage;
    html += '<button onclick="_noticeGoPage('+p+')" style="background:'+(active?'#d4af37':'#1e293b')+';border:1px solid '+(active?'#d4af37':'#334155')+';color:'+(active?'#000':'#94a3b8')+';border-radius:4px;padding:6px 12px;cursor:pointer;font-size:0.8rem;font-weight:'+(active?'700':'400')+';">'+p+'</button>';
  }
  if(_noticePage < totalPages) html += '<button onclick="_noticeGoPage('+(_noticePage+1)+')" style="background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:0.8rem;">다음</button>';
  pg.innerHTML = html;
}

function _noticeGoPage(p) {
  _noticePage = p;
  _renderNoticeTable();
}

function openNoticeDetail(idx) {
  var n = _noticeData[idx];
  if(!n) return;
  var modal = document.getElementById('notice-detail-modal');
  if(!modal) return;
  document.getElementById('notice-detail-title').textContent = n.title || '';
  var html = '';
  if(n.image) {
    html += '<div style="margin-bottom:16px;text-align:center;"><img src="'+n.image+'" style="max-width:100%;display:block;margin:0 auto;border-radius:8px;"></div>';
  }
  html += (n.content || '').replace(/\n/g, '<br>');
  document.getElementById('notice-detail-body').innerHTML = html;
  modal.style.display = 'flex';
}

function closeNoticeDetail() {
  var modal = document.getElementById('notice-detail-modal');
  if(modal) modal.style.display = 'none';
}

async function loadSupportSection() {
  if(!_session) {
    var tbody = document.getElementById('cs-inquiry-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:#475569;">로그인 후 확인하실 수 있습니다.</td></tr>';
    return;
  }
  try {
    var res = await authFetch('/api/user/inquiries?userId=' + encodeURIComponent(_session.username));
    var data = await res.json();
    if(data.success) _csData = data.data || [];
  } catch(e) { _csData = []; }
  _csPage = 1;
  _renderCsTable();
}

function _renderCsTable() {
  var tbody = document.getElementById('cs-inquiry-tbody');
  var pagEl = document.getElementById('cs-pagination');
  if(!tbody) return;

  var total = _csData.length;
  var totalPages = Math.max(1, Math.ceil(total / _csPerPage));
  if(_csPage > totalPages) _csPage = totalPages;
  var start = (_csPage - 1) * _csPerPage;
  var page = _csData.slice(start, start + _csPerPage);

  if(total === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:#ef4444;">현재 등록된 게시물이 없습니다.</td></tr>';
  } else {
    tbody.innerHTML = page.map(function(item, i) {
      var statusBadge = item.status === 'done'
        ? '<span style="color:#4ade80;font-size:0.8rem;font-weight:600;">완료</span>'
        : '<span style="color:#fbbf24;font-size:0.8rem;font-weight:600;">대기</span>';
      var readBadge = item.status === 'done'
        ? '<span style="color:#60a5fa;font-size:0.8rem;">열람</span>'
        : '<span style="color:#64748b;font-size:0.8rem;">미열람</span>';
      return '<tr style="border-bottom:1px solid #1e293b;cursor:pointer;" onclick="openMyInquiryDetail(\'' + item.id + '\')">'
        + '<td style="padding:12px 16px;color:#94a3b8;font-size:0.82rem;">' + (item.datetime || '') + '</td>'
        + '<td style="padding:12px 16px;color:#e2e8f0;font-size:0.85rem;">' + (item.title || '(제목없음)') + '</td>'
        + '<td style="padding:12px 16px;text-align:center;">' + statusBadge + '</td>'
        + '<td style="padding:12px 16px;text-align:center;">' + readBadge + '</td>'
        + '<td style="padding:12px 16px;text-align:center;"><button onclick="event.stopPropagation();deleteInquiry(\'' + item.id + '\')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8rem;">삭제</button></td>'
        + '</tr>';
    }).join('');
  }

  // 페이지네이션
  if(pagEl) {
    var btnStyle = 'background:none;border:1px solid #1e293b;color:#94a3b8;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:0.82rem;';
    var activeStyle = 'background:#1e40af;border:1px solid #3b82f6;color:#fff;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:0.82rem;font-weight:700;';
    var html = '<button onclick="_csGoPage(1)" style="' + btnStyle + '">&laquo;</button>';
    html += '<button onclick="_csGoPage(' + Math.max(1, _csPage-1) + ')" style="' + btnStyle + '">&lsaquo;</button>';
    for(var p = 1; p <= totalPages; p++) {
      html += '<button onclick="_csGoPage(' + p + ')" style="' + (p === _csPage ? activeStyle : btnStyle) + '">' + p + '</button>';
    }
    html += '<button onclick="_csGoPage(' + Math.min(totalPages, _csPage+1) + ')" style="' + btnStyle + '">&rsaquo;</button>';
    html += '<button onclick="_csGoPage(' + totalPages + ')" style="' + btnStyle + '">&raquo;</button>';
    pagEl.innerHTML = html;
  }
}

function _csGoPage(p) { _csPage = p; _renderCsTable(); }

function openInquiryModal() {
  if(!_session) { showToast('로그인이 필요합니다.'); return; }
  document.getElementById('inquiry-modal').style.display = 'flex';
}
function closeInquiryModal() {
  document.getElementById('inquiry-modal').style.display = 'none';
}

async function deleteAllInquiry() {
  if(!_session) return;
  if(!(await customConfirm('모든 문의를 삭제하시겠습니까?'))) return;
  await authFetch('/api/user/inquiries/delete-all?userId=' + encodeURIComponent(_session.username), { method:'DELETE' });
  _csData = [];
  _renderCsTable();
  showToast('모든 문의가 삭제되었습니다.');
}

async function deleteInquiry(id) {
  if(!(await customConfirm('해당 문의를 삭제하시겠습니까?'))) return;
  try {
    await authFetch('/api/user/inquiries/' + id, { method: 'DELETE' });
  } catch(e) {}
  _csData = _csData.filter(function(x){ return x.id !== id; });
  _renderCsTable();
  showToast('문의가 삭제되었습니다.');
}

async function openMyInquiryDetail(id) {
  var item = _csData.find(function(x){ return x.id === id; }) || null;
  if(!item) return;
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = '<div style="background:#111827;border:1px solid #1e293b;border-radius:12px;width:100%;max-width:550px;max-height:80vh;overflow-y:auto;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #1e293b;">'
    + '<span style="color:#e2e8f0;font-weight:700;">' + (item.title || '') + '</span>'
    + '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:none;border:none;color:#64748b;font-size:1.2rem;cursor:pointer;">✕</button>'
    + '</div>'
    + '<div style="padding:20px;">'
    + '<div style="color:#64748b;font-size:0.75rem;margin-bottom:12px;">' + (item.datetime || '') + '</div>'
    + '<div style="color:#e2e8f0;font-size:0.85rem;line-height:1.7;white-space:pre-wrap;margin-bottom:20px;padding:14px;background:#0f172a;border-radius:8px;border:1px solid #1e293b;">' + (item.content || '') + '</div>'
    + (item.answer
      ? '<div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:14px;">'
        + '<div style="color:#60a5fa;font-size:0.78rem;font-weight:700;margin-bottom:8px;"><i class="fas fa-reply" style="margin-right:6px;"></i>관리자 답변 · ' + (item.answeredAt || '') + '</div>'
        + '<div style="color:#e2e8f0;font-size:0.83rem;line-height:1.7;white-space:pre-wrap;">' + (item.answer || '') + '</div>'
        + '</div>'
      : '<div style="color:#475569;font-size:0.82rem;text-align:center;padding:12px;background:#0f172a;border-radius:8px;">아직 답변이 등록되지 않았습니다.</div>')
    + '</div></div>';
  ov.addEventListener('click', function(e){ if(e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

// ── 공지/이벤트/출석 통합 탭 모달 ──
function openInfoModal(activeTab) {
  var existing = document.getElementById('info-tab-modal');
  if(existing) existing.remove();

  var ov = document.createElement('div');
  ov.id = 'info-tab-modal';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

  ov.innerHTML = ''
    + '<div style="width:100%;max-width:860px;height:80vh;background:#0d0d1a;border:1px solid rgba(100,120,200,0.3);border-radius:8px;display:flex;flex-direction:column;overflow:hidden;position:relative;">'
    + '<button onclick="document.getElementById(\'info-tab-modal\').remove()" style="position:absolute;top:0;right:0;width:52px;height:52px;background:#c0392b;border:none;color:#fff;font-size:1.1rem;cursor:pointer;z-index:2;">✕</button>'
    + '<div id="itm-tabs" style="display:flex;border-bottom:1px solid rgba(100,120,200,0.2);background:#0a0a18;">'
    +   _itmTabBtn('event',  '🎁', '이벤트',   'EVENT',      activeTab)
    +   _itmTabBtn('notice', '📢', '공지/규정', 'NOTICE',     activeTab)
    +   _itmTabBtn('attend', '📅', '출석현황',  'ATTENDANCE', activeTab)
    + '</div>'
    + '<div id="itm-body" style="flex:1;overflow-y:auto;padding:24px;scrollbar-width:none;"></div>'
    + '</div>';

  document.body.appendChild(ov);

  ov.querySelectorAll('.itm-tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      ov.querySelectorAll('.itm-tab-btn').forEach(function(b){ b.classList.remove('itm-active'); });
      this.classList.add('itm-active');
      _itmRenderTab(this.dataset.tab);
    });
  });

  _itmRenderTab(activeTab || 'notice');
}

function _itmTabBtn(tab, icon, kr, en, active) {
  var isActive = tab === active;
  return '<button class="itm-tab-btn'+(isActive?' itm-active':'')+'" data-tab="'+tab+'" style="'
    + 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;'
    + 'padding:14px 8px;border:none;background:transparent;cursor:pointer;'
    + 'color:'+(isActive?'#d4af37':'#666')+';'
    + 'border-bottom:2px solid '+(isActive?'#d4af37':'transparent')+';'
    + 'transition:color 0.2s;">'
    + '<span style="font-size:1.1rem;">'+icon+'</span>'
    + '<span style="font-size:0.82rem;font-weight:700;">'+kr+'</span>'
    + '<span style="font-size:0.65rem;letter-spacing:0.05em;opacity:0.6;">'+en+'</span>'
    + '</button>';
}

async function _itmRenderTab(tab) {
  var body = document.getElementById('itm-body');
  if(!body) return;

  document.querySelectorAll('.itm-tab-btn').forEach(function(b){
    var on = b.dataset.tab === tab;
    b.style.color = on ? '#d4af37' : '#666';
    b.style.borderBottom = '2px solid ' + (on ? '#d4af37' : 'transparent');
  });

  if(tab === 'event') {
    var events = [];
    try {
      var res = await authFetch('/api/user/events');
      var data = await res.json();
      if(data.success) events = data.data;
    } catch(e) {}
    var list = events.filter(function(ev){ return ev.userShow; });
    if(list.length === 0) {
      body.innerHTML = '<div style="color:#555;text-align:center;padding:60px;font-size:0.9rem;">진행 중인 이벤트가 없습니다.</div>';
      return;
    }
    body.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">'
      + list.map(function(ev){
          return '<div style="background:#111128;border:1px solid rgba(100,120,200,0.2);border-radius:8px;overflow:hidden;cursor:pointer;" onclick="_itmOpenDetail(\''+encodeURIComponent(ev.title||'')+'\',\''+encodeURIComponent(ev.content||'')+'\',\''+encodeURIComponent(ev.image||'')+'\')">'
            + (ev.image ? '<img src="'+ev.image+'" style="width:100%;height:140px;object-fit:cover;display:block;">' : '<div style="width:100%;height:80px;background:rgba(100,120,200,0.06);display:flex;align-items:center;justify-content:center;font-size:1.8rem;">🎁</div>')
            + '<div style="padding:12px;">'
            + '<div style="color:#c8a8ff;font-weight:700;font-size:0.88rem;margin-bottom:4px;">'+(ev.title||'')+'</div>'
            + '<div style="color:#555;font-size:0.72rem;">'+(ev.startDate||'')+' ~ '+(ev.endDate||'')+'</div>'
            + '</div></div>';
        }).join('')
      + '</div>';

  } else if(tab === 'notice') {
    var notices = [];
    try {
      var res2 = await authFetch('/api/user/notices');
      var data2 = await res2.json();
      if(data2.success) notices = data2.data;
    } catch(e) {}
    var list2 = notices.filter(function(n){ return n.userShow; });
    if(list2.length === 0) {
      body.innerHTML = '<div style="color:#555;text-align:center;padding:60px;font-size:0.9rem;">등록된 공지사항이 없습니다.</div>';
      return;
    }
    body.innerHTML = list2.map(function(n, i){
      return '<div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;" onclick="_itmOpenDetail(\''+encodeURIComponent(n.title||'')+'\',\''+encodeURIComponent(n.content||'')+'\')">'
        + '<div style="width:28px;height:28px;background:rgba(100,120,200,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.72rem;color:#888;flex-shrink:0;">'+(i+1)+'</div>'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="color:#ccc;font-size:0.87rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(n.title||'')+'</div>'
        + '<div style="color:#555;font-size:0.72rem;margin-top:3px;">'+(n.createdAt||'')+'</div>'
        + '</div>'
        + '<span style="color:#555;font-size:0.9rem;">›</span>'
        + '</div>';
    }).join('');

  } else if(tab === 'attend') {
    var today = new Date().toISOString().slice(0,10);
    var key = 'attend_' + (_session ? _session.username : 'guest');
    var record = {};
    try { record = JSON.parse(localStorage.getItem(key)||'{}'); } catch(e){}
    var checkedToday = record[today];
    var days = Object.keys(record).sort();
    var streak = 0;
    var dc = new Date();
    while(record[dc.toISOString().slice(0,10)]){ streak++; dc.setDate(dc.getDate()-1); }
    body.innerHTML = '<div style="text-align:center;padding:32px 0 24px;">'
      + '<div style="font-size:2.5rem;margin-bottom:8px;">📅</div>'
      + '<div style="color:#aaa;font-size:0.85rem;margin-bottom:20px;">연속 출석: <b style="color:#d4af37;">'+streak+'일</b> &nbsp;|&nbsp; 총 출석: <b style="color:#d4af37;">'+days.length+'일</b></div>'
      + (!_session
        ? '<div style="color:#666;font-size:0.85rem;">로그인 후 이용해주세요.</div>'
        : checkedToday
          ? '<div style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:8px;padding:16px 32px;color:#4ade80;font-size:0.9rem;display:inline-block;">✅ 오늘 출석 완료!</div>'
          : '<button onclick="_itmAttendCheck()" style="background:linear-gradient(135deg,#c8a84b,#d4af37);color:#000;border:none;border-radius:8px;padding:14px 40px;font-weight:700;font-size:0.95rem;cursor:pointer;">출석 체크하기</button>'
      )
      + '</div>'
      + (days.length > 0
        ? '<div style="color:#555;font-size:0.78rem;text-align:center;margin-bottom:12px;">최근 출석 기록</div>'
          + '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">'
          + days.slice(-30).reverse().map(function(ds){
              var isToday2 = ds === today;
              return '<div style="background:'+(isToday2?'rgba(212,175,55,0.2)':'rgba(255,255,255,0.04)')+';border:1px solid '+(isToday2?'#d4af37':'rgba(255,255,255,0.08)')+';border-radius:4px;padding:4px 8px;font-size:0.72rem;color:'+(isToday2?'#d4af37':'#666')+'">'+(ds.slice(5))+'</div>';
            }).join('')
          + '</div>'
        : ''
      );
  }
}

function _itmAttendCheck() {
  if(!_session) return;
  var today = new Date().toISOString().slice(0,10);
  var key = 'attend_' + _session.username;
  var record = {};
  try { record = JSON.parse(localStorage.getItem(key)||'{}'); } catch(e){}
  if(record[today]) return;
  record[today] = true;
  localStorage.setItem(key, JSON.stringify(record));
  showToast('✅ 출석 체크 완료!');
  _itmRenderTab('attend');
}

function _itmOpenDetail(titleEnc, contentEnc, imageEnc) {
  var title   = decodeURIComponent(titleEnc||'');
  var content = decodeURIComponent(contentEnc||'');
  var image   = imageEnc ? decodeURIComponent(imageEnc) : '';
  var ov2 = document.createElement('div');
  ov2.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
  ov2.innerHTML = '<div style="background:#0d0d1a;border:1px solid rgba(100,120,200,0.3);border-radius:8px;width:100%;max-width:600px;max-height:80vh;overflow-y:auto;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(100,120,200,0.15);position:sticky;top:0;background:#0d0d1a;z-index:1;">'
    + '<span style="color:#c8a8ff;font-weight:700;font-size:0.92rem;">'+title+'</span>'
    + '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:#c0392b;border:none;color:#fff;width:32px;height:32px;border-radius:4px;cursor:pointer;">✕</button>'
    + '</div>'
    + (image ? '<img src="'+image+'" style="width:100%;display:block;">' : '')
    + '<div style="padding:20px;color:#bbb;font-size:0.85rem;line-height:1.8;white-space:pre-wrap;">'+content+'</div>'
    + '</div>';
  ov2.addEventListener('click', function(e){ if(e.target===ov2) ov2.remove(); });
  document.body.appendChild(ov2);
}

// ══════════════════════════════════════
//  포인트 내역
// ══════════════════════════════════════
function togglePointHistory() {
  var sub = document.getElementById('point-history-sub');
  var arrow = document.getElementById('point-history-arrow');
  if (sub.style.display === 'none') {
    sub.style.display = 'block';
    arrow.style.transform = 'rotate(180deg)';
  } else {
    sub.style.display = 'none';
    arrow.style.transform = '';
  }
}

function openPointHistoryTab(tab) {
  if (!_session) return;
  var existing = document.getElementById('point-history-modal');
  if (existing) existing.remove();

  var titles = { 'rolling': '롤링내역', 'convert': '롤링전환내역', 'point-give': '포인트 지급/회수' };
  var ov = document.createElement('div');
  ov.id = 'point-history-modal';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
  ov.innerHTML = ''
    + '<div style="width:100%;max-width:700px;max-height:80vh;background:#0d0d1a;border:1px solid rgba(124,58,237,0.3);border-radius:8px;display:flex;flex-direction:column;overflow:hidden;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(124,58,237,0.2);flex-shrink:0;">'
    + '<span style="color:#a78bfa;font-weight:700;font-size:0.95rem;">' + (titles[tab] || '') + '</span>'
    + '<button onclick="document.getElementById(\'point-history-modal\').remove()" style="background:#c0392b;border:none;color:#fff;width:32px;height:32px;border-radius:4px;cursor:pointer;font-size:0.9rem;">✕</button>'
    + '</div>'
    + '<div id="ph-tab-btns" style="display:flex;border-bottom:1px solid rgba(124,58,237,0.15);flex-shrink:0;">'
    + _phTabBtn('rolling', '롤링내역', tab)
    + _phTabBtn('convert', '롤링전환내역', tab)
    + _phTabBtn('point-give', '포인트 지급/회수', tab)
    + '</div>'
    + '<div id="ph-body" style="flex:1;overflow-y:auto;padding:16px;scrollbar-width:none;"></div>'
    + '</div>';
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);

  ov.querySelectorAll('.ph-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      ov.querySelectorAll('.ph-tab').forEach(function(b) {
        b.style.color = '#666';
        b.style.borderBottom = '2px solid transparent';
      });
      this.style.color = '#a78bfa';
      this.style.borderBottom = '2px solid #a78bfa';
      _phRenderTab(this.dataset.tab);
    });
  });

  _phRenderTab(tab);
}

function _phTabBtn(tab, label, active) {
  var on = tab === active;
  return '<button class="ph-tab" data-tab="' + tab + '" style="flex:1;padding:10px 4px;border:none;background:transparent;cursor:pointer;font-size:0.8rem;font-weight:600;color:' + (on ? '#a78bfa' : '#666') + ';border-bottom:2px solid ' + (on ? '#a78bfa' : 'transparent') + ';transition:all 0.2s;">' + label + '</button>';
}

async function _phRenderTab(tab) {
  var body = document.getElementById('ph-body');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">불러오는 중...</div>';
  var un = _session.username;

  if (tab === 'rolling') {
    try {
      var res = await authFetch('/api/user/my-rolling-logs?username=' + encodeURIComponent(un));
      var data = await res.json();
      var logs = data.data || [];
      if (logs.length === 0) {
        body.innerHTML = '<div style="text-align:center;padding:40px;color:#555;">롤링 내역이 없습니다.</div>';
        return;
      }
      body.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        + '<thead><tr style="color:#888;border-bottom:1px solid #222;">'
        + '<th style="padding:8px 4px;text-align:left;">일시</th>'
        + '<th style="padding:8px 4px;text-align:left;">게임</th>'
        + '<th style="padding:8px 4px;text-align:right;">배팅금</th>'
        + '<th style="padding:8px 4px;text-align:right;">롤링포인트</th>'
        + '</tr></thead><tbody>'
        + logs.slice(0, 100).map(function(l) {
          return '<tr style="border-bottom:1px solid #1a1a2e;">'
            + '<td style="padding:7px 4px;color:#aaa;">' + (l.datetime || '') + '</td>'
            + '<td style="padding:7px 4px;color:#ccc;">' + (l.gameType || l.vendor || '-') + '</td>'
            + '<td style="padding:7px 4px;text-align:right;color:#ccc;">' + Number(l.betAmount || 0).toLocaleString() + '</td>'
            + '<td style="padding:7px 4px;text-align:right;color:#a78bfa;font-weight:600;">+' + Number(l.rollingPoint || 0).toLocaleString() + '</td>'
            + '</tr>';
        }).join('')
        + '</tbody></table>';
    } catch(e) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">조회 실패</div>';
    }

  } else if (tab === 'convert') {
    try {
      var res2 = await authFetch('/api/user/my-convert-logs?username=' + encodeURIComponent(un));
      var data2 = await res2.json();
      var logs2 = data2.data || [];
      if (logs2.length === 0) {
        body.innerHTML = '<div style="text-align:center;padding:40px;color:#555;">전환 내역이 없습니다.</div>';
        return;
      }
      body.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        + '<thead><tr style="color:#888;border-bottom:1px solid #222;">'
        + '<th style="padding:8px 4px;text-align:left;">일시</th>'
        + '<th style="padding:8px 4px;text-align:right;">전환 포인트</th>'
        + '<th style="padding:8px 4px;text-align:right;">전환전 포인트</th>'
        + '<th style="padding:8px 4px;text-align:right;">전환후 머니</th>'
        + '</tr></thead><tbody>'
        + logs2.slice(0, 100).map(function(l) {
          return '<tr style="border-bottom:1px solid #1a1a2e;">'
            + '<td style="padding:7px 4px;color:#aaa;">' + (l.datetime || '') + '</td>'
            + '<td style="padding:7px 4px;text-align:right;color:#f59e0b;font-weight:600;">' + Number(l.amount || 0).toLocaleString() + 'P</td>'
            + '<td style="padding:7px 4px;text-align:right;color:#ccc;">' + Number(l.beforeRolling || 0).toLocaleString() + 'P</td>'
            + '<td style="padding:7px 4px;text-align:right;color:#4ade80;">' + Number(l.afterMoney || 0).toLocaleString() + '원</td>'
            + '</tr>';
        }).join('')
        + '</tbody></table>';
    } catch(e) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">조회 실패</div>';
    }

  } else if (tab === 'point-give') {
    try {
      var res3 = await authFetch('/api/user/my-point-logs?username=' + encodeURIComponent(un));
      var data3 = await res3.json();
      var logs3 = data3.data || [];
      if (logs3.length === 0) {
        body.innerHTML = '<div style="text-align:center;padding:40px;color:#555;">포인트 지급/회수 내역이 없습니다.</div>';
        return;
      }
      body.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        + '<thead><tr style="color:#888;border-bottom:1px solid #222;">'
        + '<th style="padding:8px 4px;text-align:left;">일시</th>'
        + '<th style="padding:8px 4px;text-align:center;">구분</th>'
        + '<th style="padding:8px 4px;text-align:right;">금액</th>'
        + '<th style="padding:8px 4px;text-align:right;">변동 전</th>'
        + '<th style="padding:8px 4px;text-align:right;">변동 후</th>'
        + '<th style="padding:8px 4px;text-align:left;">메모</th>'
        + '</tr></thead><tbody>'
        + logs3.slice(0, 100).map(function(l) {
          var isGive = l.type === 'give';
          return '<tr style="border-bottom:1px solid #1a1a2e;">'
            + '<td style="padding:7px 4px;color:#aaa;">' + (l.datetime || '') + '</td>'
            + '<td style="padding:7px 4px;text-align:center;color:' + (isGive ? '#4ade80' : '#f87171') + ';font-weight:600;">' + (isGive ? '지급' : '회수') + '</td>'
            + '<td style="padding:7px 4px;text-align:right;color:' + (isGive ? '#4ade80' : '#f87171') + ';font-weight:600;">' + (isGive ? '+' : '-') + Number(l.amount || 0).toLocaleString() + '</td>'
            + '<td style="padding:7px 4px;text-align:right;color:#ccc;">' + Number(l.before || 0).toLocaleString() + '</td>'
            + '<td style="padding:7px 4px;text-align:right;color:#ccc;">' + Number(l.after || 0).toLocaleString() + '</td>'
            + '<td style="padding:7px 4px;color:#888;font-size:0.74rem;">' + (l.memo || '-') + '</td>'
            + '</tr>';
        }).join('')
        + '</tbody></table>';
    } catch(e) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">조회 실패</div>';
    }
  }
}

// ══════════════════════════════════════
//  포인트 전환 (포인트 → 머니)
// ══════════════════════════════════════

function _findUserNode(tree, username) {
  if(!tree) return null;
  if(tree.id === username) return tree;
  if(tree.children) {
    for(var i=0; i<tree.children.length; i++) {
      var found = _findUserNode(tree.children[i], username);
      if(found) return found;
    }
  }
  return null;
}

function _getUserPoint() {
  if(!_session) return 0;
  return (Number(_session.point||0) + Number(_session.rollingPoint||0));
}

function openPointConvert() {
  if(!_session) { openModal('login'); return; }
  var point = _getUserPoint();
  var money = Number(_session.balance || 0);
  document.getElementById('pc-current-point').textContent = point.toLocaleString() + 'P';
  document.getElementById('pc-current-money').textContent = money.toLocaleString() + '원';
  document.getElementById('pc-amount').value = '';
  document.getElementById('point-convert-modal').style.display = 'flex';
}

function addPcAmount(v) {
  var el = document.getElementById('pc-amount');
  el.value = (parseInt(el.value) || 0) + v;
}

function setPcAll() {
  document.getElementById('pc-amount').value = _getUserPoint();
}

function submitPointConvert() {
  if(!_session) return;
  var val = parseInt(document.getElementById('pc-amount').value);
  if(!val || val <= 0) { alert('전환할 포인트를 입력해주세요.'); return; }

  var point = _getUserPoint();
  if(val > point) { alert('보유 포인트가 부족합니다. (보유: ' + point.toLocaleString() + 'P)'); return; }

  var beforePoint = point;
  var beforeMoney = Number(_session.balance || _session.money || 0);

  authFetch('/api/user/point-convert', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username: _session.username, amount: val })
  }).then(function(r){ return r.json(); }).then(function(res) {
    if(!res.success) { alert(res.error || '전환 실패'); return; }

    var afterPoint = (res.point||0) + (res.rollingPoint||0);
    var afterMoney = res.money || 0;

    // 세션 업데이트
    _session.point = res.point || 0;
    _session.rollingPoint = res.rollingPoint || 0;
    _session.balance = afterMoney;
    _session.money = afterMoney;
    var s = JSON.stringify(_session);
    sessionStorage.setItem('casino_user', s);
    if(localStorage.getItem('casino_user')) localStorage.setItem('casino_user', s);

    // 롤링전환 로그 저장
    var now = new Date();
    var pad = function(n){ return String(n).padStart(2,'0'); };
    var nowStr = now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+' '+pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
    authFetch('/api/user/rolling-convert-log', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        datetime: nowStr, type: 'rolling-convert',
        target: _session.username, username: _session.username,
        nick: _session.nickname || _session.username,
        amount: val,
        beforeRolling: beforePoint, afterRolling: afterPoint,
        beforeMoney: beforeMoney, afterMoney: afterMoney
      })
    }).catch(function(){});

    // UI 업데이트
    document.getElementById('point-convert-modal').style.display = 'none';
    renderHeader();
    var myBal = document.getElementById('my-balance');
    if(myBal) myBal.textContent = afterMoney.toLocaleString() + ' 원';
    var myPt = document.getElementById('my-point');
    if(myPt) myPt.textContent = afterPoint.toLocaleString() + 'P';

    showToast('✅ ' + val.toLocaleString() + 'P → ' + val.toLocaleString() + '원 전환 완료!');
  }).catch(function(e) {
    alert('전환 중 오류가 발생했습니다.');
  });
}
