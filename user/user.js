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
    fetch('/api/auth/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: _session.id })
    }).then(function(r){ return r.json(); })
    .then(function(res) {
      if (res.kicked) {
        clearSession();
        renderHeader();
        alert('관리자에 의해 강제종료 되었습니다.');
        location.hash = '';
        location.reload();
      }
    }).catch(function(){});
  }
  function refreshBalance() {
    if (!_session || !_session.id) return;
    if (Date.now() - _lastActivity > IDLE_TIMEOUT) return;
    fetch('/api/auth/balance?userId=' + encodeURIComponent(_session.id))
      .then(function(r){ return r.json(); })
      .then(function(res) {
        if (res.success && res.balance !== undefined) {
          _session.balance = res.balance;
          _session.money = res.balance;
          var s = JSON.stringify(_session);
          sessionStorage.setItem('casino_user', s);
          if (localStorage.getItem('casino_user')) localStorage.setItem('casino_user', s);
          renderHeader();
          var myBal = document.getElementById('my-balance');
          if (myBal) myBal.textContent = Number(res.balance).toLocaleString() + ' 원';
        }
      }).catch(function(){});
  }
  sendPing();
  refreshBalance();
  setInterval(sendPing, 60000);
  setInterval(refreshBalance, 10000);
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
    var res = await fetch('/api/admin/notices');
    var data = await res.json();
    var all = data.success ? (data.data || []) : [];
    all.sort(function(a,b){ return (a.rank||99)-(b.rank||99); });
    // 이벤트
    var evRes = await fetch('/api/admin/events');
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
    fetch('/api/auth/ping', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:data.data.id}) }).catch(function(){});
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
    document.getElementById('reg-username').addEventListener('input', function() {
      const v = this.value.trim();
      if (!v) return _clearField('username');
      if (v.length < 4) _setField('username', false, '4자 이상 입력해주세요.');
      else _setField('username', true, '사용 가능한 아이디입니다.');
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

// 헤더 초기 렌더
document.addEventListener('DOMContentLoaded', renderHeader);

function openModal(t) {
  if(t === 'deposit') {
    if(!_session) { openModal('login'); return; }
    document.getElementById('deposit-modal').style.display = 'flex';
    return;
  }
  if(t === 'withdraw') {
    if(!_session) { openModal('login'); return; }
    var bal = Number(_session.balance||0);
    document.getElementById('wit-balance-info').textContent = '보유 잔액: ' + bal.toLocaleString() + '원';
    document.getElementById('withdraw-modal').style.display = 'flex';
    return;
  }
  document.getElementById('modal-'+t).classList.add('active');
  document.body.style.overflow='hidden';
}
function closeModal(t) {
  if(t === 'deposit') { document.getElementById('deposit-modal').style.display = 'none'; return; }
  if(t === 'withdraw') { document.getElementById('withdraw-modal').style.display = 'none'; return; }
  if(t){ document.getElementById('modal-'+t).classList.remove('active'); }
  else { document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('active')); }
  document.body.style.overflow='';
}
function switchModal(a,b){closeModal(a);setTimeout(()=>openModal(b),150);}
function toggleMobile(){const h=document.getElementById('ham');h.classList.toggle('open');}
document.querySelectorAll('.modal-overlay').forEach(el=>{
  el.addEventListener('click',e=>{if(e.target===el){el.classList.remove('active');document.body.style.overflow='';}});
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
  if(side === 'left'){
    if(liveSection) liveSection.style.display = '';
    if(slotSection) slotSection.style.display = 'none';
    // nav-link 동기화
    document.querySelectorAll('.nav-link[data-tab]').forEach(n=>n.classList.remove('active'));
    const casinoNav = document.querySelector('.nav-link[data-tab="casino"]');
    if(casinoNav) casinoNav.classList.add('active');
  } else {
    if(liveSection) liveSection.style.display = 'none';
    if(slotSection) slotSection.style.display = '';
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
  const gameTabs       = document.querySelector('.game-tabs');
  const eventSection   = document.getElementById('event-section');
  const supportSection = document.getElementById('support-section');

  // 이벤트 탭
  if(tab === 'event') {
    if(gameWrapper)    gameWrapper.style.display    = 'none';
    if(eventSection)   eventSection.style.display   = 'block';
    if(supportSection) supportSection.style.display = 'none';
    loadEventSection();
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }

  // 고객센터 탭
  if(tab === 'support') {
    if(gameWrapper)    gameWrapper.style.display    = 'none';
    if(eventSection)   eventSection.style.display   = 'none';
    if(supportSection) supportSection.style.display = 'block';
    loadSupportSection();
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }

  // 게임 탭 (casino / slot 등) — 이벤트/고객센터 숨기기
  if(gameWrapper)    gameWrapper.style.display    = '';
  if(eventSection)   eventSection.style.display   = 'none';
  if(supportSection) supportSection.style.display = 'none';
  if(gameTabs)       gameTabs.style.display       = '';

  // 섹션 전환
  if(tab === 'casino'){
    if(liveSection) liveSection.style.display = '';
    if(slotSection) slotSection.style.display = 'none';
    // game-tab 버튼 동기화
    document.querySelectorAll('.g-tab').forEach(t=>t.classList.remove('active'));
    const leftTab = document.querySelector('.g-tab[data-side="left"]');
    if(leftTab) leftTab.classList.add('active');
    const gem = document.getElementById('gem-deco');
    if(gem){ gem.classList.remove('tilt-left','tilt-right'); gem.classList.add('tilt-left'); }
  } else {
    if(liveSection) liveSection.style.display = 'none';
    if(slotSection) slotSection.style.display = '';
    // game-tab 버튼 동기화
    document.querySelectorAll('.g-tab').forEach(t=>t.classList.remove('active'));
    const rightTab = document.querySelector('.g-tab[data-side="right"]');
    if(rightTab) rightTab.classList.add('active');
    const gem = document.getElementById('gem-deco');
    if(gem){ gem.classList.remove('tilt-left','tilt-right'); gem.classList.add('tilt-right'); }
  }
  // 네비바가 보이는 위치로 스크롤
  const navbar = document.querySelector('.navbar');
  if(navbar){
    const offset = navbar.getBoundingClientRect().top + window.scrollY - 10;
    window.scrollTo({top: offset, behavior: 'smooth'});
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
    +     '<div style="font-size:0.92rem;color:#fcd34d;font-weight:600;line-height:1.6;">10분간 활동이 없어<br>자동 로그아웃 되었습니다.</div>'
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
async function launchGame(code, subcode) {
  if (!_session) { openModal('login'); return; }
  try {
    var isMobile = /Mobi|Android/i.test(navigator.userAgent);
    var r = await fetch('/api/game/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        subcode: subcode || code,
        userid: _session.username,
        username: _session.nickname || _session.username,
        platform: isMobile ? 'mobile' : 'pc',
        lobby: '0'
      })
    });
    var data = await r.json();
    if (data.result === 1 && data.link) {
      window.open(data.link, '_blank');
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
  // 점검 게임 체크 (클라이언트)
  var hg = (window._hlHiddenGames && window._hlHiddenGames[vendor]) || [];
  if (hg.indexOf(String(gameId)) >= 0) {
    _showGameErrorModal('해당 게임은 현재 점검중 입니다.');
    return;
  }
  try {
    // 1) 로컬 잔액을 게임사로 동기화 (Transfer Wallet)
    var balRes = await fetch('/api/auth/balance?userId=' + encodeURIComponent(_session.id)).then(function(r){ return r.json(); });
    var localBal = (balRes.success && balRes.local !== undefined) ? Number(balRes.local) : 0;
    if (localBal > 0) {
      await fetch('/api/hl/user/add-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: _session.username, amount: localBal })
      });
      // 로컬 잔액을 0으로 차감 (게임사로 이동했으므로) — 게임사 API 호출 안함
      await fetch('/api/admin/users/money-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: _session.username, amount: -localBal })
      });
    }

    // 2) 게임 실행
    var r = await fetch('/api/hl/launch', {
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
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML =
    '<div class="pt-modal" style="width:900px;max-width:96vw;max-height:80vh;display:flex;flex-direction:column;">'
    + '<div class="pt-modal-header"><span>' + providerName + ' 게임 목록</span>'
    + '<button onclick="document.getElementById(\'slot-game-modal-overlay\').remove()" style="background:none;border:none;color:#ccc;font-size:1.2rem;cursor:pointer;">✕</button></div>'
    + '<div style="padding:12px;overflow-y:auto;flex:1;">'
    + '<div id="slot-game-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">'
    + '<div style="grid-column:1/-1;text-align:center;color:#888;padding:24px;">게임 목록 불러오는 중...</div>'
    + '</div></div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  try {
    var r = await fetch('/api/game/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: '2', gameid: providerGameid, code: providerCode, gametype: 'slot' })
    });
    var data = await r.json();
    var games = data.data || [];
    var grid = document.getElementById('slot-game-grid');
    if (!grid) return;
    if (!games.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:24px;">게임 목록이 없습니다.</div>';
      return;
    }
    grid.innerHTML = games.map(function(g) {
      var name    = g.name_kor || g.name_eng || '';
      var subcode = g.subcode || '';
      var img     = g.img || '';
      return '<div style="cursor:pointer;border-radius:8px;overflow:hidden;background:#1a2030;border:1px solid #2a3040;" onclick="launchGame(\'' + providerCode + '\',\'' + subcode + '\')">'
        + (img ? '<img src="'+img+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;">' : '<div style="width:100%;aspect-ratio:4/3;background:#2a3040;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#666;padding:4px;text-align:center;">'+name+'</div>')
        + '<div style="padding:5px 6px;font-size:0.72rem;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>'
        + '</div>';
    }).join('');
  } catch(e) {
    var grid2 = document.getElementById('slot-game-grid');
    if (grid2) grid2.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#f87;padding:24px;">게임 목록을 불러오지 못했습니다.</div>';
  }
}

// ── HonorLink 슬롯 게임 목록 모달 ────────────────────────
async function openHLGameModal(vendor, vendorName) {
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
    var r = await fetch('/api/hl/games?vendor=' + encodeURIComponent(vendor));
    var games = await r.json();
    if (games.error || games._status) { games = []; }
    // 어드민에서 차단된 게임만 목록에서 제거 (점검 게임은 보이되 접속 차단)
    var bg = (window._hlBlockedGames && window._hlBlockedGames[vendor]) || [];
    if (bg.length) {
      games = games.filter(function(g) {
        return bg.indexOf(String(g.id)) < 0;
      });
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
    grid.innerHTML = games.map(function(g) {
      var name = (g.langs && g.langs.ko) || g.title || '';
      var img  = (g.thumbnails && g.thumbnails['300x300']) || g.thumbnail || '';
      var safeVendor = vendor.replace(/'/g, '');
      var safeId     = String(g.id).replace(/'/g, '');
      var safeName2  = name.replace(/'/g, '');
      return '<div style="cursor:pointer;border-radius:8px;overflow:hidden;background:#1a2030;border:1px solid #2a3040;" onclick="launchHL(\'' + safeVendor + '\',\'' + safeId + '\',\'' + safeName2 + '\')">'
        + (img ? '<img src="'+img+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;" loading="lazy">' : '<div style="width:100%;aspect-ratio:4/3;background:#2a3040;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#666;padding:4px;text-align:center;">'+name+'</div>')
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
    '1X2 Gaming':'/static/logos/logo_1x2gaming.png',
    'Asia Gaming':'/static/logos/logo_ag.png',
    'Asia Gaming Slot':'/static/logos/logo_ag.png',
    'bbin':'/static/logos/logo_bbin.png',
    'Booongo':'/static/logos/logo_booongo.png',
    'CQ9':'/static/logos/logo_cq9.png',
    'dragoonsoft':'/static/logos/logo_dragoonsoft.png',
    'DreamGame':'/static/logos/logo_dreamgaming.png',
    'evoplay':'/static/logos/logo_evoplay.png',
    'Fantasma':'/static/logos/logo_fantasma.png',
    'GameArt':'/static/logos/logo_gameart.png',
    'Hacksaw':'/static/logos/logo_hacksaw.png',
    'MicroGaming':'/static/logos/logo_microgaming.png',
    'MicroGaming Plus':'/static/logos/logo_microgaming.png',
    'MicroGaming Plus Slo':'/static/logos/logo_microgaming.png',
    'MicroGamingSlot':'/static/logos/logo_microgaming.png',
    'Nolimit City':'/static/logos/logo_nolimit.png',
    'playngo':'/static/logos/logo_playngo.png',
    'PragmaticPlay':'/static/logos/logo_pragmatic.png',
    'PragmaticPlay Live':'/static/logos/logo_pragmatic.png',
    'Relax Gaming':'/static/logos/logo_relax.png',
    'Skywind Live':'/static/logos/logo_skywind.png',
    'Skywind Slot':'/static/logos/logo_skywind.png',
    'spribe':'/static/logos/logo_spribe.png',
    'WM Live':'/static/logos/logo_vmcasino.png',
    'ELK':'/static/logos/logo_elk.png',
    'mobilots':'/static/logos/logo_mobilots.png'
  };

  // ── 공통 카드 생성 함수 ──
  function makeCard(name, img, onclick) {
    var cardImg = nextCardImg();
    var logo = logoMap[name] || '';
    var logoHtml = logo
      ? '<img src="'+logo+'" alt="'+name+'" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);height:32px;max-width:80%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.8));pointer-events:none;">'
      : '<span style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:0.8rem;font-weight:bold;text-shadow:0 2px 6px rgba(0,0,0,0.9);white-space:nowrap;pointer-events:none;">'+name+'</span>';
    return '<div class="live-card" onclick="' + onclick + '">'
      + '<div class="shine"></div>'
      + '<div class="enter-overlay"><span class="enter-label"><i class="fas fa-play"></i>게임입장</span></div>'
      + '<div class="live-thumb" style="position:relative;">'
      + '<img src="'+cardImg+'" alt="'+name+'" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;" loading="lazy">'
      + logoHtml
      + '</div>'
      + '<div class="live-footer"><span class="live-name">'+name+'</span></div>'
      + '</div>';
  }

  // ── 슬롯 전용 카드 (게임사 이미지 배경 + 로고) ──
  function makeSlotCard(name, img, onclick) {
    var logo = logoMap[name] || '';
    var logoHtml = logo
      ? '<img src="'+logo+'" alt="'+name+'" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);height:32px;max-width:80%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.8));pointer-events:none;">'
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
  var liveNames = ['evolution','PragmaticPlay Live','Asia Gaming','DreamGame','WM Live','ezugi','bota','sexybcrt','SuperSpade','Skywind Live','vivo','AllBet','saGaming','Live88','XProGaming'];

  // 로그인된 유저의 gameGroup을 서버에서 최신값으로 갱신
  var sessionRefresh = (_session && _session.username)
    ? fetch('/api/auth/game-group?username=' + encodeURIComponent(_session.username))
        .then(function(r){ return r.json(); })
        .then(function(res){ _session.gameGroup = res.gameGroup || ''; })
        .catch(function(){})
    : Promise.resolve();

  sessionRefresh.then(function(){
  Promise.all([
    fetch('/api/hl/vendors').then(function(r){ return r.json(); }),
    fetch('/api/hl/lobbies').then(function(r){ return r.json(); }),
    fetch('/api/hl/settings').then(function(r){ return r.json(); }).catch(function(){ return {}; })
  ])
    .then(function(results){
      var vendors = results[0];
      var lobbies = results[1];
      var gameSettings = results[2] || {};
      var hiddenVendors = gameSettings.hiddenVendors || [];
      var hiddenGames = gameSettings.hiddenGames || {};
      var vendorOrder = gameSettings.vendorOrder || { live: [], slot: [] };
      var blockedGames = gameSettings.blockedGames || {};

      // 유저에 그룹 설정이 있으면 그룹 설정으로 덮어씌우기
      if (_session && _session.gameGroup && gameSettings.groups) {
        var userGroup = gameSettings.groups.find(function(g) { return g.name === _session.gameGroup; });
        if (userGroup) {
          hiddenVendors = userGroup.hiddenVendors || [];
          hiddenGames = userGroup.hiddenGames || {};
          blockedGames = userGroup.blockedGames || {};
        }
      }

      // 글로벌에 저장 (게임 목록 모달에서 사용)
      window._hlHiddenGames = hiddenGames;
      window._hlBlockedGames = blockedGames;

      if (vendors.error || vendors._status) return;
      if (!Array.isArray(lobbies)) lobbies = [];

      // 로비 맵 (vendor → {thumbnail, id})
      var lobbyMap = {};
      lobbies.forEach(function(lb){
        if (!lobbyMap[lb.vendor]) {
          lobbyMap[lb.vendor] = {
            img: (lb.thumbnails && lb.thumbnails['300x300']) || lb.thumbnail || '',
            id: lb.id,
            vendor: lb.vendor
          };
        }
      });

      var liveVendors = [];
      var slotVendors = [];
      Object.keys(vendors).forEach(function(key){
        var v = vendors[key];
        if (!v.enabled) return;
        // 어드민에서 숨긴 벤더 제외
        if (hiddenVendors.indexOf(v.name) >= 0) return;
        if (liveNames.indexOf(v.name) >= 0) liveVendors.push(v);
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

      // ── 라이브 카지노: 클릭 시 바로 로비 접속 ──
      {
        var row1 = document.getElementById('live-grid-row1');
        if (row1) {
          row1.innerHTML = liveVendors.map(function(v){
            var safeName = v.name.replace(/'/g, '');
            var lobby = lobbyMap[v.name];
            var img = lobby ? lobby.img : '';
            var lobbyId = lobby ? lobby.id : '';
            var click = lobbyId
              ? 'launchHL(\'' + safeName + '\',\'' + lobbyId + '\',\'' + safeName + '\')'
              : 'openHLGameModal(\'' + safeName + '\',\'' + safeName + '\')';
            return makeCard(v.name, img, click);
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
          return makeSlotCard(v.name, img, 'openHLGameModal(\'' + safeName + '\',\'' + safeName + '\')');
        }).join('');

        // 썸네일 없는 벤더만 첫 게임 이미지 비동기 로드
        slotVendors.forEach(function(v, idx){
          if (lobbyMap[v.name] && lobbyMap[v.name].img) return;
          fetch('/api/hl/games?vendor=' + encodeURIComponent(v.name))
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
      var res = await fetch('/api/admin/notices');
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
          openInfoModal('notice');
        });
      });
    }

    // 팝업: userPopup ON인 것 (userShow 여부 무관) + 오늘 숨김 아닌 것
    var popupList = all.filter(function(n){ return n.userPopup && !isHiddenToday(n.title); });
    // 이벤트 userPopup도 합침
    try {
      var evRes = await fetch('/api/admin/events');
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
      var res = await fetch('/api/admin/events');
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

// ── 충전/환전 금액 추가 헬퍼 ──
function addDepAmount(n) {
  var el = document.getElementById('dep-amount');
  el.value = (parseInt(el.value)||0) + n;
}
function addWitAmount(n) {
  var el = document.getElementById('wit-amount');
  el.value = (parseInt(el.value)||0) + n;
}

// ── 충전 신청 제출 ──
async function submitDeposit() {
  if(!_session) return;
  var amount  = parseInt(document.getElementById('dep-amount').value) || 0;
  var bank    = document.getElementById('dep-bank').value.trim();
  var holder  = document.getElementById('dep-holder').value.trim();
  var account = document.getElementById('dep-account').value.trim();
  var errEl   = document.getElementById('dep-err');
  errEl.style.display = 'none';
  if(amount <= 0) { errEl.textContent='금액을 입력해주세요.'; errEl.style.display='block'; return; }
  if(!bank)    { errEl.textContent='은행명을 입력해주세요.'; errEl.style.display='block'; return; }
  if(!holder)  { errEl.textContent='예금주를 입력해주세요.'; errEl.style.display='block'; return; }
  if(!account) { errEl.textContent='계좌번호를 입력해주세요.'; errEl.style.display='block'; return; }

  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var dt = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());

  try {
    var res = await fetch('/api/admin/transfers', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        type: 'deposit',
        userId: _session.username, nick: _session.nickname||_session.username,
        amount: amount, bank: bank, holder: holder, account: account,
        datetime: dt, status: 'pending', memo: ''
      })
    });
    var data = await res.json();
    if(!data.success) { errEl.textContent='신청 오류: '+(data.error||''); errEl.style.display='block'; return; }
    document.getElementById('deposit-modal').style.display = 'none';
    document.getElementById('dep-amount').value='';
    showToast('충전 신청이 완료되었습니다.');
  } catch(e) {
    errEl.textContent='서버 연결 오류가 발생했습니다.'; errEl.style.display='block';
  }
}

// ── 환전 신청 제출 ──
async function submitWithdraw() {
  if(!_session) return;
  var amount  = parseInt(document.getElementById('wit-amount').value) || 0;
  var bank    = document.getElementById('wit-bank').value.trim();
  var holder  = document.getElementById('wit-holder').value.trim();
  var account = document.getElementById('wit-account').value.trim();
  var errEl   = document.getElementById('wit-err');
  errEl.style.display = 'none';
  if(amount <= 0) { errEl.textContent='금액을 입력해주세요.'; errEl.style.display='block'; return; }
  if(!bank)    { errEl.textContent='은행명을 입력해주세요.'; errEl.style.display='block'; return; }
  if(!holder)  { errEl.textContent='예금주를 입력해주세요.'; errEl.style.display='block'; return; }
  if(!account) { errEl.textContent='계좌번호를 입력해주세요.'; errEl.style.display='block'; return; }

  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var dt = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());

  try {
    var res = await fetch('/api/admin/transfers', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        type: 'withdraw',
        userId: _session.username, nick: _session.nickname||_session.username,
        amount: amount, bank: bank, holder: holder, account: account,
        datetime: dt, status: 'pending', memo: ''
      })
    });
    var data = await res.json();
    if(!data.success) { errEl.textContent='신청 오류: '+(data.error||''); errEl.style.display='block'; return; }
    document.getElementById('withdraw-modal').style.display = 'none';
    document.getElementById('wit-amount').value='';
    showToast('환전 신청이 완료되었습니다.');
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
    var res = await fetch('/api/admin/inquiries', {
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
    var res = await fetch('/api/admin/events');
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
async function loadSupportSection() {
  var loginWarn = document.getElementById('support-login-warn');
  var form      = document.getElementById('support-form');
  var listEl    = document.getElementById('my-inquiry-list');
  if(!listEl) return;

  if(!_session) {
    if(loginWarn) loginWarn.style.display='block';
    if(form) form.style.display='none';
    listEl.innerHTML='<div style="color:#666;font-size:0.82rem;text-align:center;padding:20px;">로그인 후 확인하실 수 있습니다.</div>';
    return;
  }
  if(loginWarn) loginWarn.style.display='none';
  if(form) form.style.display='block';

  var mine = [];
  try {
    var res = await fetch('/api/admin/inquiries?userId=' + encodeURIComponent(_session.username));
    var data = await res.json();
    if(data.success) mine = data.data;
  } catch(e) {}
  if(mine.length === 0) {
    listEl.innerHTML='<div style="color:#666;font-size:0.82rem;text-align:center;padding:20px;">문의 내역이 없습니다.</div>';
    return;
  }
  listEl.innerHTML = mine.map(function(item){
    var statusBadge = item.status==='done'
      ? '<span style="color:#4ade80;font-size:0.72rem;">답변완료</span>'
      : '<span style="color:#fbbf24;font-size:0.72rem;">대기중</span>';
    return '<div style="border-bottom:1px solid rgba(255,255,255,0.06);padding:10px 0;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;">'
      + '<span style="font-size:0.83rem;color:#ddd;cursor:pointer;" onclick="openMyInquiryDetail(\''+item.id+'\')">'+(item.title||'')+'</span>'
      + statusBadge
      + '</div>'
      + '<div style="font-size:0.7rem;color:#555;margin-top:3px;">'+(item.datetime||'')+'</div>'
      + '</div>';
  }).join('');
}

async function openMyInquiryDetail(id) {
  var item = null;
  try {
    var res = await fetch('/api/admin/inquiries');
    var data = await res.json();
    if(data.success) item = (data.data||[]).find(function(x){ return x.id===id; }) || null;
  } catch(e) {}
  if(!item) return;
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = '<div style="background:#111118;border:1px solid rgba(200,168,75,0.3);border-radius:10px;width:100%;max-width:500px;max-height:80vh;overflow-y:auto;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(200,168,75,0.15);">'
    + '<span style="color:#d4af37;font-weight:700;">'+(item.title||'')+'</span>'
    + '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:none;border:none;color:#aaa;font-size:1.2rem;cursor:pointer;">✕</button>'
    + '</div>'
    + '<div style="padding:20px;">'
    + '<div style="color:#aaa;font-size:0.75rem;margin-bottom:10px;">'+(item.datetime||'')+'</div>'
    + '<div style="color:#ddd;font-size:0.85rem;line-height:1.7;white-space:pre-wrap;margin-bottom:16px;">'+(item.content||'')+'</div>'
    + (item.answer ? '<div style="background:rgba(200,168,75,0.06);border:1px solid rgba(200,168,75,0.15);border-radius:6px;padding:14px;">'
      + '<div style="color:#d4af37;font-size:0.78rem;font-weight:700;margin-bottom:8px;">관리자 답변 · '+(item.answeredAt||'')+'</div>'
      + '<div style="color:#ddd;font-size:0.83rem;line-height:1.7;white-space:pre-wrap;">'+(item.answer||'')+'</div>'
      + '</div>' : '<div style="color:#666;font-size:0.82rem;">아직 답변이 등록되지 않았습니다.</div>')
    + '</div></div>';
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
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
      var res = await fetch('/api/admin/events');
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
      var res2 = await fetch('/api/admin/notices');
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
  try {
    var tree = JSON.parse(localStorage.getItem('partnerTree') || 'null');
    var node = _findUserNode(tree, _session.username);
    return node ? ((node.point||0)+(node.rollingPoint||0)) : 0;
  } catch(e) { return 0; }
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

  // partnerTree에서 노드 업데이트
  try {
    var tree = JSON.parse(localStorage.getItem('partnerTree') || 'null');
    var node = _findUserNode(tree, _session.username);
    if(!node) { alert('유저 정보를 찾을 수 없습니다.'); return; }

    var beforePoint = (node.point||0) + (node.rollingPoint||0);
    var afterPoint = beforePoint - val;
    node.point = (node.point||0) - val;
    var beforeMoney = node.money || 0;
    var afterMoney = beforeMoney + val;
    node.money = afterMoney;
    localStorage.setItem('partnerTree', JSON.stringify(tree));

    // 포인트 로그 기록
    var now = new Date();
    var pad = function(n){ return String(n).padStart(2,'0'); };
    var nowStr = now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+' '+pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());

    var pointLogs = [];
    try { pointLogs = JSON.parse(localStorage.getItem('partnerPointLog') || '[]'); } catch(e){}
    pointLogs.unshift({
      datetime: nowStr, type: 'take', processor: _session.username,
      targetId: _session.username, targetNick: _session.nickname || _session.username,
      amount: val, before: beforePoint, after: afterPoint, memo: '포인트 전환 (→ 머니)'
    });
    if(pointLogs.length > 2000) pointLogs = pointLogs.slice(0, 2000);
    localStorage.setItem('partnerPointLog', JSON.stringify(pointLogs));

    // 머니 로그 기록
    var moneyLogs = [];
    try { moneyLogs = JSON.parse(localStorage.getItem('partnerMoneyLog') || '[]'); } catch(e){}
    moneyLogs.unshift({
      datetime: nowStr, type: 'give', processor: _session.username,
      targetId: _session.username, targetNick: _session.nickname || _session.username,
      amount: val, before: beforeMoney, after: afterMoney, memo: '포인트 전환'
    });
    if(moneyLogs.length > 2000) moneyLogs = moneyLogs.slice(0, 2000);
    localStorage.setItem('partnerMoneyLog', JSON.stringify(moneyLogs));

    // 세션 잔액 업데이트
    _session.balance = afterMoney;
    _session.money = afterMoney;
    var s = JSON.stringify(_session);
    sessionStorage.setItem('casino_user', s);
    if(localStorage.getItem('casino_user')) localStorage.setItem('casino_user', s);

    // UI 업데이트
    document.getElementById('point-convert-modal').style.display = 'none';
    renderHeader();
    var myBal = document.getElementById('my-balance');
    if(myBal) myBal.textContent = afterMoney.toLocaleString() + ' 원';
    var myPt = document.getElementById('my-point');
    if(myPt) myPt.textContent = afterPoint.toLocaleString() + 'P';

    showToast('✅ ' + val.toLocaleString() + 'P → ' + val.toLocaleString() + '원 전환 완료!');
  } catch(e) {
    alert('전환 중 오류가 발생했습니다.');
  }
}
