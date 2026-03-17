// ══════════════════════════════════════
//  설정 및 조회 페이지들
// ══════════════════════════════════════

// ── 공통 스타일 ──
var _stCard = 'background:var(--bg2,#111827);border:1px solid var(--border,#1e293b);border-radius:8px;padding:24px;';
var _stLabel = 'display:block;font-size:0.78rem;color:var(--text2);margin-bottom:6px;font-weight:600;';
var _stInput = 'width:100%;box-sizing:border-box;padding:10px 14px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text1);font-size:0.85rem;';
var _stBtn = 'padding:10px 28px;border:none;border-radius:6px;font-size:0.85rem;font-weight:700;cursor:pointer;';

// ════════════════════════════════════
//  1. 최대당첨금 알람 설정
// ════════════════════════════════════
async function renderSettingsMaxwin() {
  var s = {};
  try { var r = await fetch('/api/admin/settings'); var d = await r.json(); if(d.success) s = d.data; } catch(e){}
  var logs = [];
  try { var r2 = await fetch('/api/admin/maxwin-logs'); var d2 = await r2.json(); if(d2.success) logs = d2.data||[]; } catch(e){}

  var logRows = logs.length === 0
    ? '<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--text3);">당첨금 알람 내역이 없습니다.</td></tr>'
    : logs.slice(0,50).map(function(l,i){
        var amt = Number(l.amount||0).toLocaleString();
        var typeColor = l.type==='slot' ? '#fbbf24' : '#60a5fa';
        var typeLabel = l.type==='slot' ? '슬롯' : '카지노';
        var dt = l.datetime ? l.datetime.replace('T',' ').substring(0,19) : '';
        return '<tr style="border-bottom:1px solid var(--border);">' +
          '<td style="padding:10px 14px;color:var(--text3);text-align:center;">'+(i+1)+'</td>' +
          '<td style="padding:10px 14px;text-align:center;"><span style="background:'+typeColor+';color:#000;padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:700;">'+typeLabel+'</span></td>' +
          '<td style="padding:10px 14px;color:var(--text1);">'+(l.username||'-')+'</td>' +
          '<td style="padding:10px 14px;color:var(--text1);">'+(l.gameName||'-')+'</td>' +
          '<td style="padding:10px 14px;color:#4ade80;font-weight:700;text-align:right;">'+amt+' 원</td>' +
          '<td style="padding:10px 14px;color:var(--text3);text-align:center;">'+dt+'</td>' +
          '</tr>';
      }).join('');

  document.getElementById('content').innerHTML =
    // 상단 설정 영역 (가로 정렬)
    '<div style="'+_stCard+'margin-bottom:20px;">' +
    '<div style="font-size:1rem;font-weight:700;color:var(--text1);margin-bottom:16px;"><i class="fas fa-bell" style="color:#fbbf24;margin-right:8px;"></i>최대당첨금 알람 설정</div>' +
    '<div style="display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap;">' +
    '  <div style="flex:1;min-width:160px;">' +
    '    <label style="'+_stLabel+'">슬롯 최대당첨금 (원)</label>' +
    '    <input type="text" id="st-maxwin-slot" value="'+(s.maxwinSlot||5000000)+'" style="'+_stInput+'">' +
    '  </div>' +
    '  <div style="flex:1;min-width:160px;">' +
    '    <label style="'+_stLabel+'">카지노 최대당첨금 (원)</label>' +
    '    <input type="text" id="st-maxwin-casino" value="'+(s.maxwinCasino||10000000)+'" style="'+_stInput+'">' +
    '  </div>' +
    '  <div style="display:flex;gap:12px;align-items:center;padding-bottom:2px;">' +
    '    <label style="color:var(--text1);font-size:0.82rem;cursor:pointer;white-space:nowrap;"><input type="checkbox" id="st-maxwin-sound" '+(s.maxwinSound!==false?'checked':'')+' style="margin-right:4px;accent-color:#fbbf24;">소리</label>' +
    '    <label style="color:var(--text1);font-size:0.82rem;cursor:pointer;white-space:nowrap;"><input type="checkbox" id="st-maxwin-popup" '+(s.maxwinPopup!==false?'checked':'')+' style="margin-right:4px;accent-color:#fbbf24;">팝업</label>' +
    '  </div>' +
    '  <div>' +
    '    <button id="st-maxwin-save" style="'+_stBtn+'background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;white-space:nowrap;">저장</button>' +
    '  </div>' +
    '</div>' +
    '<span id="st-maxwin-result" style="font-size:0.82rem;color:#4ade80;display:none;margin-top:8px;">저장되었습니다.</span>' +
    '</div>' +
    // 하단 내역 테이블
    '<div style="'+_stCard+'">' +
    '<div style="font-size:0.95rem;font-weight:700;color:var(--text1);margin-bottom:16px;"><i class="fas fa-list" style="color:#60a5fa;margin-right:8px;"></i>당첨금 알람 내역</div>' +
    '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">' +
    '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">' +
    '<thead><tr style="background:var(--bg);border-bottom:1px solid var(--border);">' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text2);width:50px;">#</th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text2);width:80px;">구분</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">회원</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">게임</th>' +
    '<th style="padding:10px 14px;text-align:right;color:var(--text2);">당첨금</th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text2);width:160px;">일시</th>' +
    '</tr></thead><tbody>' + logRows + '</tbody></table></div></div>';

  document.getElementById('st-maxwin-save').addEventListener('click', async function(){
    await fetch('/api/admin/settings', {
      method: 'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        maxwinSlot: parseInt(document.getElementById('st-maxwin-slot').value.replace(/,/g,'')) || 0,
        maxwinCasino: parseInt(document.getElementById('st-maxwin-casino').value.replace(/,/g,'')) || 0,
        maxwinSound: document.getElementById('st-maxwin-sound').checked,
        maxwinPopup: document.getElementById('st-maxwin-popup').checked
      })
    });
    var el = document.getElementById('st-maxwin-result');
    el.style.display = 'inline'; setTimeout(function(){ el.style.display = 'none'; }, 2000);
  });
}

// ════════════════════════════════════
//  2. 파트너 권한 설정
// ════════════════════════════════════
async function renderSettingsPartnerPerm() {
  var s = {};
  try { var r = await fetch('/api/admin/settings'); var d = await r.json(); if(d.success) s = d.data; } catch(e){}
  var pp = s.partnerPerm || {};

  var levels = [
    { key: 'head', label: '본사' },
    { key: 'subhead', label: '부본사' },
    { key: 'distributor', label: '총판' },
    { key: 'store', label: '매장' }
  ];

  var cols = [
    { key: 'createPartner', label: '파트너생성' },
    { key: 'createMember', label: '회원생성' },
    { key: 'partnerMoneyGive', label: '지급', group: '파트너 머니이동' },
    { key: 'partnerMoneyTake', label: '회수', group: '파트너 머니이동' },
    { key: 'memberMoneyGive', label: '지급', group: '회원 머니이동' },
    { key: 'memberMoneyTake', label: '회수', group: '회원 머니이동' },
    { key: 'subRate', label: '하부 요율 지급' }
  ];

  // 토글 스위치 CSS
  var toggleCss = '<style>' +
    '.pp-toggle{position:relative;width:44px;height:22px;display:inline-block;}' +
    '.pp-toggle input{opacity:0;width:0;height:0;}' +
    '.pp-slider{position:absolute;cursor:pointer;inset:0;background:var(--input-border);border-radius:22px;transition:0.25s;}' +
    '.pp-slider:before{content:"";position:absolute;height:16px;width:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:0.25s;}' +
    '.pp-toggle input:checked + .pp-slider{background:#22c55e;}' +
    '.pp-toggle input:checked + .pp-slider:before{transform:translateX(22px);}' +
    '</style>';

  function makeToggle(level, col) {
    var k = level + '_' + col;
    var checked = pp[k] !== false ? ' checked' : '';
    return '<label class="pp-toggle"><input type="checkbox" class="pp-chk" data-key="'+k+'"'+checked+'><span class="pp-slider"></span></label>';
  }

  // 그룹 헤더 계산
  var groupHeader = '<tr style="border-bottom:1px solid var(--border);">' +
    '<th style="padding:10px 14px;" rowspan="2"></th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text1);font-size:0.82rem;" rowspan="2">파트너생성</th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text1);font-size:0.82rem;" rowspan="2">회원생성</th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text1);font-size:0.82rem;border-bottom:1px solid var(--input-border);" colspan="2">파트너 머니이동</th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text1);font-size:0.82rem;border-bottom:1px solid var(--input-border);" colspan="2">회원 머니이동</th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text1);font-size:0.82rem;" rowspan="2">하부 요율 지급</th>' +
    '</tr>' +
    '<tr style="border-bottom:1px solid var(--border);">' +
    '<th style="padding:6px 14px;text-align:center;color:#60a5fa;font-size:0.78rem;">지급</th>' +
    '<th style="padding:6px 14px;text-align:center;color:#f87171;font-size:0.78rem;">회수</th>' +
    '<th style="padding:6px 14px;text-align:center;color:#60a5fa;font-size:0.78rem;">지급</th>' +
    '<th style="padding:6px 14px;text-align:center;color:#f87171;font-size:0.78rem;">회수</th>' +
    '</tr>';

  var rows = levels.map(function(lv){
    return '<tr style="border-bottom:1px solid var(--border);">' +
      '<td style="padding:14px 20px;color:var(--text1);font-weight:600;font-size:0.88rem;white-space:nowrap;">'+lv.label+'</td>' +
      cols.map(function(c){
        return '<td style="padding:14px 20px;text-align:center;">'+makeToggle(lv.key, c.key)+'</td>';
      }).join('') +
      '</tr>';
  }).join('');

  document.getElementById('content').innerHTML = toggleCss +
    '<div style="'+_stCard+'">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
    '<div>' +
    '<div style="font-size:1.1rem;font-weight:700;color:var(--text1);"><i class="fas fa-user-shield" style="color:#818cf8;margin-right:8px;"></i>파트너 권한 설정</div>' +
    '<p style="color:var(--text2);font-size:0.82rem;margin-top:4px;">등급별 파트너 권한을 관리합니다.</p>' +
    '</div>' +
    '<button id="st-pp-save" style="'+_stBtn+'background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;"><i class="fas fa-save" style="margin-right:6px;"></i>변경사항 저장</button>' +
    '</div>' +
    '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;overflow-x:auto;">' +
    '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;min-width:800px;">' +
    '<thead style="background:var(--bg);">' + groupHeader + '</thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table></div>' +
    '<span id="st-pp-result" style="display:block;margin-top:12px;font-size:0.82rem;color:#4ade80;display:none;">저장되었습니다.</span>' +
    '</div>';

  document.getElementById('st-pp-save').addEventListener('click', async function(){
    var obj = {};
    document.querySelectorAll('.pp-chk').forEach(function(c){ obj[c.dataset.key] = c.checked; });
    await fetch('/api/admin/settings', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ partnerPerm: obj })
    });
    var el = document.getElementById('st-pp-result');
    el.style.display = 'block'; el.style.display = 'block';
    setTimeout(function(){ el.style.display = 'none'; }, 2000);
  });
}

// ════════════════════════════════════
//  4. 보안설정
// ════════════════════════════════════
async function renderSettingsSecurity() {
  var s = {};
  try { var r = await fetch('/api/admin/settings'); var d = await r.json(); if(d.success) s = d.data; } catch(e){}
  var sec = s.security || {};

  // 토글 CSS
  var toggleCss = '<style>' +
    '.sec-toggle{position:relative;width:48px;height:24px;display:inline-block;flex-shrink:0;}' +
    '.sec-toggle input{opacity:0;width:0;height:0;}' +
    '.sec-slider{position:absolute;cursor:pointer;inset:0;background:var(--input-border);border-radius:24px;transition:0.25s;}' +
    '.sec-slider:before{content:"";position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:0.25s;}' +
    '.sec-toggle input:checked + .sec-slider{background:#22c55e;}' +
    '.sec-toggle input:checked + .sec-slider:before{transform:translateX(24px);}' +
    '</style>';

  var rowStyle = 'display:flex;align-items:center;justify-content:space-between;padding:20px 24px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;';

  function makeRow(id, title, desc, checked) {
    return '<div style="'+rowStyle+'">' +
      '<div>' +
      '<div style="font-size:0.92rem;font-weight:700;color:var(--text1);">'+title+'</div>' +
      '<div style="font-size:0.78rem;color:var(--text3);margin-top:3px;">'+desc+'</div>' +
      '</div>' +
      '<label class="sec-toggle"><input type="checkbox" id="'+id+'" '+(checked?'checked':'')+'><span class="sec-slider"></span></label>' +
      '</div>';
  }

  document.getElementById('content').innerHTML = toggleCss +
    '<div style="width:100%;">' +
    '<div style="font-size:1.1rem;font-weight:700;color:var(--text1);margin-bottom:20px;"><i class="fas fa-shield-alt" style="color:#f59e0b;margin-right:8px;"></i>보안 설정</div>' +

    // 중복 로그인 허용
    makeRow('st-sec-duplogin', '관리자/파트너 중복 로그인 허용', '관리자/파트너의 여러 기기 동시 로그인 허용 (유저는 항상 단일 세션)', sec.dupLogin !== false) +

    // IP 화이트리스트
    '<div style="'+rowStyle+'flex-direction:column;align-items:stretch;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;">' +
    '<div>' +
    '<div style="font-size:0.92rem;font-weight:700;color:var(--text1);">IP 화이트리스트</div>' +
    '<div style="font-size:0.78rem;color:var(--text3);margin-top:3px;">등록된 IP에서만 관리자 접속 허용</div>' +
    '</div>' +
    '<label class="sec-toggle"><input type="checkbox" id="st-sec-whitelist" '+(sec.ipWhitelist?'checked':'')+'><span class="sec-slider"></span></label>' +
    '</div>' +
    '<div id="st-wl-area" style="margin-top:14px;'+(sec.ipWhitelist?'':'display:none;')+'">' +
    '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
    '<input type="text" id="st-wl-input" placeholder="IP 주소 (예: 192.168.0.1)" style="'+_stInput+'flex:1;">' +
    '<input type="text" id="st-wl-memo" placeholder="메모" style="'+_stInput+'width:180px;">' +
    '<button id="st-wl-add" style="'+_stBtn+'background:#22c55e;color:#fff;white-space:nowrap;padding:8px 16px;">추가</button>' +
    '</div>' +
    '<div id="st-wl-list">' + (function(){
      var wl = s.whitelistIps || [];
      if(!wl.length) return '<div style="color:var(--text3);font-size:0.78rem;padding:8px 0;">등록된 IP가 없습니다.</div>';
      return wl.map(function(w,i){
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:0.8rem;">' +
          '<div><span style="color:#4ade80;font-weight:600;">'+w.ip+'</span><span style="color:var(--text3);margin-left:10px;">'+( w.memo||'')+'</span></div>' +
          '<button class="st-wl-del" data-ip="'+w.ip+'" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:0.75rem;"><i class="fas fa-times"></i></button>' +
          '</div>';
      }).join('');
    })() + '</div>' +
    '</div>' +
    '</div>' +

    // IP 블랙리스트
    '<div style="'+rowStyle+'flex-direction:column;align-items:stretch;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;">' +
    '<div>' +
    '<div style="font-size:0.92rem;font-weight:700;color:var(--text1);">IP 블랙리스트</div>' +
    '<div style="font-size:0.78rem;color:var(--text3);margin-top:3px;">특정 IP의 관리자 접속 차단</div>' +
    '</div>' +
    '<label class="sec-toggle"><input type="checkbox" id="st-sec-blacklist" '+(sec.ipBlacklist?'checked':'')+'><span class="sec-slider"></span></label>' +
    '</div>' +
    '<div id="st-bl-area" style="margin-top:14px;'+(sec.ipBlacklist?'':'display:none;')+'">' +
    '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
    '<input type="text" id="st-bl-input" placeholder="IP 주소 (예: 192.168.0.1)" style="'+_stInput+'flex:1;">' +
    '<input type="text" id="st-bl-reason" placeholder="사유" style="'+_stInput+'width:180px;">' +
    '<button id="st-bl-add" style="'+_stBtn+'background:#ef4444;color:#fff;white-space:nowrap;padding:8px 16px;">차단</button>' +
    '</div>' +
    '<div id="st-bl-list">' + (function(){
      var bl = s.blockedIps || [];
      if(!bl.length) return '<div style="color:var(--text3);font-size:0.78rem;padding:8px 0;">차단된 IP가 없습니다.</div>';
      return bl.map(function(b){
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:0.8rem;">' +
          '<div><span style="color:#f87171;font-weight:600;">'+b.ip+'</span><span style="color:var(--text3);margin-left:10px;">'+(b.reason||'')+'</span></div>' +
          '<button class="st-bl-del" data-ip="'+b.ip+'" style="background:none;border:none;color:#4ade80;cursor:pointer;font-size:0.75rem;"><i class="fas fa-unlock" style="margin-right:2px;"></i>해제</button>' +
          '</div>';
      }).join('');
    })() + '</div>' +
    '</div>' +
    '</div>' +

    // 로그인 실패 제한
    '<div style="'+rowStyle+'flex-wrap:wrap;gap:12px;">' +
    '<div style="flex:1;min-width:200px;">' +
    '<div style="font-size:0.92rem;font-weight:700;color:var(--text1);">로그인 실패 제한</div>' +
    '<div style="font-size:0.78rem;color:var(--text3);margin-top:3px;">로그인 실패 시 계정 잠금</div>' +
    '</div>' +
    '<label class="sec-toggle"><input type="checkbox" id="st-sec-loginlimit" '+(sec.loginLimit!==false?'checked':'')+'><span class="sec-slider"></span></label>' +
    '<div style="width:100%;display:flex;gap:16px;margin-top:4px;">' +
    '<div style="flex:1;">' +
    '<label style="'+_stLabel+'">최대 시도 횟수</label>' +
    '<input type="number" id="st-sec-maxattempt" value="'+(sec.maxAttempt||10)+'" style="'+_stInput+'">' +
    '</div>' +
    '<div style="flex:1;">' +
    '<label style="'+_stLabel+'">차단 시간 (분)</label>' +
    '<input type="number" id="st-sec-locktime" value="'+(sec.lockTime||30)+'" style="'+_stInput+'">' +
    '</div>' +
    '</div>' +
    '<div id="st-locked-area" style="width:100%;margin-top:12px;"></div>' +
    '</div>' +

    // 자동 로그아웃
    '<div style="'+rowStyle+'gap:16px;">' +
    '<div>' +
    '<div style="font-size:0.92rem;font-weight:700;color:var(--text1);">자동 로그아웃</div>' +
    '<div style="font-size:0.78rem;color:var(--text3);margin-top:3px;">비활동 시 자동 로그아웃 시간 (분)</div>' +
    '</div>' +
    '<input type="number" id="st-sec-timeout" value="'+(s.autoLogout||60)+'" style="'+_stInput+'width:120px;text-align:center;">' +
    '</div>' +

    '</div>';

  // 보안설정 자동 저장
  var _secSaveTimer = null;
  function autoSaveSecurity() {
    clearTimeout(_secSaveTimer);
    _secSaveTimer = setTimeout(async function(){
      // 스피너 오버레이
      var sp = document.createElement('div');
      sp.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
      sp.innerHTML = '<div style="text-align:center;"><style>@keyframes secSpin{to{transform:rotate(360deg)}}</style>'
        + '<div style="width:48px;height:48px;border:4px solid var(--input-border);border-top-color:#818cf8;border-radius:50%;animation:secSpin 0.7s linear infinite;margin:0 auto 14px;"></div>'
        + '<div style="color:var(--text1);font-size:0.85rem;">저장 중...</div></div>';
      document.body.appendChild(sp);
      await fetch('/api/admin/settings', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          autoLogout: parseInt(document.getElementById('st-sec-timeout').value) || 60,
          security: {
            dupLogin: document.getElementById('st-sec-duplogin').checked,
            ipWhitelist: document.getElementById('st-sec-whitelist').checked,
            ipBlacklist: document.getElementById('st-sec-blacklist').checked,
            loginLimit: document.getElementById('st-sec-loginlimit').checked,
            maxAttempt: parseInt(document.getElementById('st-sec-maxattempt').value) || 10,
            lockTime: parseInt(document.getElementById('st-sec-locktime').value) || 30
          }
        })
      });
      sp.remove();
      customAlert('보안설정이 저장되었습니다.', { icon: 'fa-shield-alt' });
    }, 500);
  }
  ['st-sec-duplogin','st-sec-whitelist','st-sec-blacklist','st-sec-loginlimit'].forEach(function(id){
    document.getElementById(id).addEventListener('change', autoSaveSecurity);
  });
  ['st-sec-timeout','st-sec-maxattempt','st-sec-locktime'].forEach(function(id){
    document.getElementById(id).addEventListener('input', autoSaveSecurity);
  });

  // 잠긴 계정 목록 로드
  (async function loadLockedAccounts() {
    try {
      var r = await fetch('/api/admin/locked-accounts');
      var d = await r.json();
      var list = d.success ? d.data || [] : [];
      var area = document.getElementById('st-locked-area');
      if (list.length === 0) { area.innerHTML = ''; return; }
      function fmtD(iso) { var dt=new Date(iso); return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0'); }
      var rows = list.map(function(a,i){
        var remain = Math.max(0, Math.ceil((new Date(a.lockedUntil) - Date.now()) / 60000));
        return '<tr style="border-bottom:1px solid var(--border);">' +
          '<td style="padding:8px 12px;color:var(--text3);">'+(i+1)+'</td>' +
          '<td style="padding:8px 12px;color:var(--text1);font-weight:600;">'+a.username+'</td>' +
          '<td style="padding:8px 12px;color:#f87171;">'+a.count+'회</td>' +
          '<td style="padding:8px 12px;color:var(--text2);font-size:0.78rem;">'+fmtD(a.lockedAt)+'</td>' +
          '<td style="padding:8px 12px;color:#fbbf24;font-size:0.78rem;">'+remain+'분 남음</td>' +
          '<td style="padding:8px 12px;text-align:center;"><button class="st-unlock-btn" data-username="'+a.username+'" style="background:#6366f1;border:none;color:#fff;padding:4px 12px;border-radius:6px;font-size:0.72rem;cursor:pointer;">해제</button></td>' +
          '</tr>';
      }).join('');
      area.innerHTML = '<div style="font-size:0.82rem;font-weight:700;color:#f87171;margin-bottom:8px;"><i class="fas fa-lock" style="margin-right:6px;"></i>잠긴 계정 ('+list.length+')</div>' +
        '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:0.8rem;">' +
        '<thead><tr style="background:var(--bg);border-bottom:1px solid var(--border);">' +
        '<th style="padding:8px 12px;text-align:left;color:var(--text2);width:40px;">#</th>' +
        '<th style="padding:8px 12px;text-align:left;color:var(--text2);">아이디</th>' +
        '<th style="padding:8px 12px;text-align:left;color:var(--text2);">실패</th>' +
        '<th style="padding:8px 12px;text-align:left;color:var(--text2);">잠금 시각</th>' +
        '<th style="padding:8px 12px;text-align:left;color:var(--text2);">남은 시간</th>' +
        '<th style="padding:8px 12px;text-align:center;color:var(--text2);width:60px;">해제</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
      document.querySelectorAll('.st-unlock-btn').forEach(function(btn){
        btn.addEventListener('click', async function(){
          await fetch('/api/admin/locked-accounts/'+encodeURIComponent(btn.dataset.username), { method:'DELETE' });
          renderSettingsSecurity();
        });
      });
    } catch(e){}
  })();

  // 화이트리스트 토글 → 영역 표시/숨김
  document.getElementById('st-sec-whitelist').addEventListener('change', function(){
    document.getElementById('st-wl-area').style.display = this.checked ? '' : 'none';
  });

  // 화이트리스트 IP 추가
  document.getElementById('st-wl-add').addEventListener('click', async function(){
    var ip = document.getElementById('st-wl-input').value.trim();
    var memo = document.getElementById('st-wl-memo').value.trim();
    if(!ip) return;
    var r = await fetch('/api/admin/whitelist-ips', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ip:ip, memo:memo })
    });
    var d = await r.json();
    if(!d.success) { alert(d.error); return; }
    renderSettingsSecurity();
  });

  // 화이트리스트 IP 삭제
  document.querySelectorAll('.st-wl-del').forEach(function(btn){
    btn.addEventListener('click', async function(){
      await fetch('/api/admin/whitelist-ips/'+encodeURIComponent(btn.dataset.ip), { method:'DELETE' });
      renderSettingsSecurity();
    });
  });

  // 블랙리스트 토글 → 영역 표시/숨김
  document.getElementById('st-sec-blacklist').addEventListener('change', function(){
    document.getElementById('st-bl-area').style.display = this.checked ? '' : 'none';
  });

  // 블랙리스트 IP 추가
  document.getElementById('st-bl-add').addEventListener('click', async function(){
    var ip = document.getElementById('st-bl-input').value.trim();
    var reason = document.getElementById('st-bl-reason').value.trim();
    if(!ip) return;
    var r = await fetch('/api/admin/blocked-ips', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ip:ip, reason:reason })
    });
    var d = await r.json();
    if(!d.success) { alert(d.error); return; }
    renderSettingsSecurity();
  });

  // 블랙리스트 IP 삭제
  document.querySelectorAll('.st-bl-del').forEach(function(btn){
    btn.addEventListener('click', async function(){
      await fetch('/api/admin/blocked-ips/'+encodeURIComponent(btn.dataset.ip), { method:'DELETE' });
      renderSettingsSecurity();
    });
  });
}

// ════════════════════════════════════
//  5. 충환전 제한설정
// ════════════════════════════════════
async function renderSettingsTransferLimit() {
  var s = {};
  try { var r = await fetch('/api/admin/settings'); var d = await r.json(); if(d.success) s = d.data; } catch(e){}
  var tl = s.transferLimit || {};

  document.getElementById('content').innerHTML =
    '<div style="'+_stCard+'width:100%;">' +
    '<div style="font-size:1rem;font-weight:700;color:var(--text1);margin-bottom:20px;"><i class="fas fa-sliders-h" style="color:#60a5fa;margin-right:8px;"></i>충환전 제한설정</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
    // 충전
    '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:20px;">' +
    '<div style="font-size:0.9rem;font-weight:700;color:#4ade80;margin-bottom:16px;">충전 설정</div>' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">최소 충전금액 (원)</label><input type="text" id="st-tl-depmin" value="'+Number(tl.depositMin||10000).toLocaleString()+'" style="'+_stInput+'" class="st-tl-comma"></div>' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">최대 충전금액 (원)</label><input type="text" id="st-tl-depmax" value="'+Number(tl.depositMax||50000000).toLocaleString()+'" style="'+_stInput+'" class="st-tl-comma"></div>' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">1일 충전 한도 (원)</label><input type="text" id="st-tl-deplimit" value="'+Number(tl.depositDailyLimit||100000000).toLocaleString()+'" style="'+_stInput+'" class="st-tl-comma"></div>' +
    '<div style="border-top:1px solid var(--border);margin:12px 0;padding-top:12px;">' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">충전 시간</label><input type="text" id="st-tl-depopen" value="'+(tl.depositOpen||'00:00')+'" placeholder="00:00" maxlength="5" style="'+_stInput+'" class="st-tl-time"></div>' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">충전 마감</label><input type="text" id="st-tl-depclose" value="'+(tl.depositClose||'23:59')+'" placeholder="23:59" maxlength="5" style="'+_stInput+'" class="st-tl-time"></div>' +
    '<div style="margin-bottom:0;"><label style="'+_stLabel+'">충전텀</label><div style="display:flex;align-items:center;gap:8px;"><input type="number" id="st-tl-depterm" value="'+(tl.depositTerm||1)+'" style="'+_stInput+'flex:1;" min="0"><span style="color:var(--text2);font-size:0.8rem;white-space:nowrap;">분 후 가능</span></div></div>' +
    '</div>' +
    '</div>' +
    // 환전
    '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:20px;">' +
    '<div style="font-size:0.9rem;font-weight:700;color:#f87171;margin-bottom:16px;">환전 설정</div>' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">최소 환전금액 (원)</label><input type="text" id="st-tl-witmin" value="'+Number(tl.withdrawMin||10000).toLocaleString()+'" style="'+_stInput+'" class="st-tl-comma"></div>' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">최대 환전금액 (원)</label><input type="text" id="st-tl-witmax" value="'+Number(tl.withdrawMax||50000000).toLocaleString()+'" style="'+_stInput+'" class="st-tl-comma"></div>' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">1일 환전 한도 (원)</label><input type="text" id="st-tl-witlimit" value="'+Number(tl.withdrawDailyLimit||100000000).toLocaleString()+'" style="'+_stInput+'" class="st-tl-comma"></div>' +
    '<div style="border-top:1px solid var(--border);margin:12px 0;padding-top:12px;">' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">환전 시간</label><input type="text" id="st-tl-witopen" value="'+(tl.withdrawOpen||'00:00')+'" placeholder="00:00" maxlength="5" style="'+_stInput+'" class="st-tl-time"></div>' +
    '<div style="margin-bottom:12px;"><label style="'+_stLabel+'">환전 마감</label><input type="text" id="st-tl-witclose" value="'+(tl.withdrawClose||'23:59')+'" placeholder="23:59" maxlength="5" style="'+_stInput+'" class="st-tl-time"></div>' +
    '<div style="margin-bottom:0;"><label style="'+_stLabel+'">환전텀</label><div style="display:flex;align-items:center;gap:8px;"><input type="number" id="st-tl-witterm" value="'+(tl.withdrawTerm||1)+'" style="'+_stInput+'flex:1;" min="0"><span style="color:var(--text2);font-size:0.8rem;white-space:nowrap;">분 후 가능</span></div></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<button id="st-tl-save" style="'+_stBtn+'background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;margin-top:20px;">저장</button>' +
    '<span id="st-tl-result" style="margin-left:12px;font-size:0.82rem;color:#4ade80;display:none;">저장되었습니다.</span>' +
    '</div>';

  // 시간 자동 포맷 (HH:MM 24시간제)
  document.querySelectorAll('.st-tl-time').forEach(function(el){
    el.addEventListener('input', function(){
      var v = this.value.replace(/[^0-9]/g, '');
      if (v.length >= 3) v = v.slice(0,2) + ':' + v.slice(2,4);
      this.value = v;
    });
    el.addEventListener('blur', function(){
      var parts = this.value.split(':');
      var h = Math.min(23, Math.max(0, parseInt(parts[0])||0));
      var m = Math.min(59, Math.max(0, parseInt(parts[1])||0));
      this.value = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
    });
  });

  // 콤마 자동 포맷
  document.querySelectorAll('.st-tl-comma').forEach(function(el){
    el.addEventListener('input', function(){
      var v = this.value.replace(/[^0-9]/g, '');
      this.value = v ? Number(v).toLocaleString() : '';
    });
  });
  function tlVal(id){ return parseInt(document.getElementById(id).value.replace(/,/g,''))||0; }

  document.getElementById('st-tl-save').addEventListener('click', async function(){
    var sp = document.createElement('div');
    sp.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
    sp.innerHTML = '<div style="text-align:center;"><style>@keyframes tlSpin{to{transform:rotate(360deg)}}</style>'
      + '<div style="width:48px;height:48px;border:4px solid var(--input-border);border-top-color:#818cf8;border-radius:50%;animation:tlSpin 0.7s linear infinite;margin:0 auto 14px;"></div>'
      + '<div style="color:var(--text1);font-size:0.85rem;">저장 중...</div></div>';
    document.body.appendChild(sp);
    await fetch('/api/admin/settings', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ transferLimit: {
        depositMin: tlVal('st-tl-depmin'),
        depositMax: tlVal('st-tl-depmax'),
        depositDailyLimit: tlVal('st-tl-deplimit'),
        depositOpen: document.getElementById('st-tl-depopen').value || '00:00',
        depositClose: document.getElementById('st-tl-depclose').value || '23:59',
        depositTerm: parseInt(document.getElementById('st-tl-depterm').value) || 0,
        withdrawMin: tlVal('st-tl-witmin'),
        withdrawMax: tlVal('st-tl-witmax'),
        withdrawDailyLimit: tlVal('st-tl-witlimit'),
        withdrawOpen: document.getElementById('st-tl-witopen').value || '00:00',
        withdrawClose: document.getElementById('st-tl-witclose').value || '23:59',
        withdrawTerm: parseInt(document.getElementById('st-tl-witterm').value) || 0
      }})
    });
    sp.remove();
    customAlert('충환전 제한설정이 저장되었습니다.', { icon: 'fa-sliders-h' });
  });
}

// ════════════════════════════════════
//  8. 도메인목록 조회
// ════════════════════════════════════
async function renderSettingsDomain() {
  var domains = [];
  try { var r = await fetch('/api/admin/domains'); var d = await r.json(); if(d.success) domains = d.data||[]; } catch(e){}

  var rows = domains.length === 0
    ? '<tr><td colspan="4" style="padding:40px;text-align:center;color:var(--text3);">등록된 도메인이 없습니다.</td></tr>'
    : domains.map(function(d,i){
        return '<tr style="border-bottom:1px solid var(--border);">' +
          '<td style="padding:10px 14px;color:var(--text3);">'+(i+1)+'</td>' +
          '<td style="padding:10px 14px;"><a href="http://'+d.domain+'" target="_blank" style="color:#818cf8;font-weight:600;text-decoration:none;cursor:pointer;" onmouseover="this.style.textDecoration=\'underline\'" onmouseout="this.style.textDecoration=\'none\'">'+d.domain+'</a></td>' +
          '<td style="padding:10px 14px;color:var(--text2);font-size:0.78rem;">'+(d.memo||'-')+'</td>' +
          '<td style="padding:10px 14px;text-align:center;">' +
            '<button class="st-dom-del" data-domain="'+d.domain+'" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:0.85rem;" title="삭제"><i class="fas fa-trash"></i></button>' +
          '</td>' +
          '</tr>';
      }).join('');

  document.getElementById('content').innerHTML =
    '<div style="'+_stCard+'">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
    '<div style="font-size:1rem;font-weight:700;color:var(--text1);"><i class="fas fa-globe" style="color:#818cf8;margin-right:8px;"></i>연동 도메인 목록</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px;">' +
    '<input type="text" id="st-dom-new" placeholder="도메인 입력 (예: example.com)" style="'+_stInput+'flex:1;padding:8px 12px;font-size:0.85rem;">' +
    '<input type="text" id="st-dom-memo-new" placeholder="메모 (선택)" style="'+_stInput+'flex:1;padding:8px 12px;font-size:0.85rem;">' +
    '<button id="st-dom-add-btn" style="background:#6366f1;color:#fff;border:none;border-radius:6px;padding:8px 18px;font-size:0.82rem;cursor:pointer;white-space:nowrap;">추가</button>' +
    '</div>' +
    '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">' +
    '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">' +
    '<thead><tr style="background:var(--bg);border-bottom:1px solid var(--border);">' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);width:50px;">#</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">도메인</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">메모</th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text2);width:60px;">삭제</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';

  // 도메인 추가
  document.getElementById('st-dom-add-btn').addEventListener('click', async function(){
    var input = document.getElementById('st-dom-new');
    var domain = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    var memo = document.getElementById('st-dom-memo-new').value.trim();
    if(!domain) return customAlert('도메인을 입력해주세요.', {type:'warning'});
    var res = await fetch('/api/admin/domains', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ domain: domain, memo: memo })
    });
    var data = await res.json();
    if(data.success) { customAlert('도메인이 등록되었습니다.'); renderSettingsDomain(); }
    else customAlert(data.message || '등록 실패', {type:'error'});
  });

  document.querySelectorAll('.st-dom-del').forEach(function(btn){
    btn.addEventListener('click', async function(){
      if(!(await customConfirm('이 도메인을 목록에서 삭제하시겠습니까?'))) return;
      await fetch('/api/admin/domains/'+encodeURIComponent(btn.dataset.domain), { method:'DELETE' });
      renderSettingsDomain();
    });
  });
}

// ════════════════════════════════════
//  9. 차단된 IP 조회
// ════════════════════════════════════
async function renderSettingsBlockedIp() {
  var ips = [];
  try { var r = await fetch('/api/admin/blocked-user-ips'); var d = await r.json(); if(d.success) ips = d.data||[]; } catch(e){}

  var rows = ips.length === 0
    ? '<tr><td colspan="4" style="padding:40px;text-align:center;color:var(--text3);">차단된 IP가 없습니다.</td></tr>'
    : ips.map(function(b,i){
        return '<tr style="border-bottom:1px solid var(--border);">' +
          '<td style="padding:10px 14px;color:var(--text3);">'+(i+1)+'</td>' +
          '<td style="padding:10px 14px;color:#f87171;font-weight:600;">'+b.ip+'</td>' +
          '<td style="padding:10px 14px;color:var(--text2);">'+b.reason+'</td>' +
          '<td style="padding:10px 14px;text-align:center;"><button class="st-ip-del" data-ip="'+b.ip+'" style="background:none;border:none;color:#4ade80;cursor:pointer;font-size:0.78rem;"><i class="fas fa-unlock" style="margin-right:4px;"></i>해제</button></td>' +
          '</tr>';
      }).join('');

  document.getElementById('content').innerHTML =
    '<div style="'+_stCard+'">' +
    '<div style="font-size:1rem;font-weight:700;color:var(--text1);margin-bottom:20px;"><i class="fas fa-ban" style="color:#f87171;margin-right:8px;"></i>유저 차단 IP 관리</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px;">' +
    '<input type="text" id="st-ip-input" placeholder="IP 주소 (예: 123.456.789.0)" style="'+_stInput+'flex:1;">' +
    '<input type="text" id="st-ip-reason" placeholder="차단 사유" style="'+_stInput+'width:250px;">' +
    '<button id="st-ip-add" style="'+_stBtn+'background:#ef4444;color:#fff;white-space:nowrap;">차단 추가</button>' +
    '</div>' +
    '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">' +
    '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">' +
    '<thead><tr style="background:var(--bg);border-bottom:1px solid var(--border);">' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);width:50px;">#</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">IP 주소</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">사유</th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text2);width:80px;">해제</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';

  document.getElementById('st-ip-add').addEventListener('click', async function(){
    var ip = document.getElementById('st-ip-input').value.trim();
    var reason = document.getElementById('st-ip-reason').value.trim();
    if(!ip) return;
    var res = await fetch('/api/admin/blocked-user-ips', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ip:ip, reason:reason })
    });
    var data = await res.json();
    if(!data.success) { alert(data.error); return; }
    renderSettingsBlockedIp();
  });

  document.querySelectorAll('.st-ip-del').forEach(function(btn){
    btn.addEventListener('click', async function(){
      if(!(await customConfirm(btn.dataset.ip + ' 차단을 해제하시겠습니까?'))) return;
      await fetch('/api/admin/blocked-user-ips/'+encodeURIComponent(btn.dataset.ip), { method:'DELETE' });
      renderSettingsBlockedIp();
    });
  });
}

// ════════════════════════════════════
//  10. 로그인기록 조회
// ════════════════════════════════════
async function renderSettingsLoginLog() {
  var logs = [];
  try { var r = await fetch('/api/admin/login-logs'); var d = await r.json(); if(d.success) logs = d.data||[]; } catch(e){}

  document.getElementById('content').innerHTML =
    '<div style="'+_stCard+'">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
    '<div style="font-size:1rem;font-weight:700;color:var(--text1);"><i class="fas fa-history" style="color:#60a5fa;margin-right:8px;"></i>로그인기록 조회</div>' +
    '<div style="display:flex;gap:8px;align-items:center;">' +
    '<input type="text" id="st-log-search" placeholder="아이디 검색..." style="padding:6px 12px;background:var(--bg);border:1px solid var(--input-border);border-radius:4px;color:var(--text1);font-size:0.8rem;">' +
    '</div>' +
    '</div>' +
    '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">' +
    '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">' +
    '<thead><tr style="background:var(--bg);border-bottom:1px solid var(--border);">' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);width:50px;">#</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">아이디</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">닉네임</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">IP</th>' +
    '<th style="padding:10px 14px;text-align:left;color:var(--text2);">접속일시</th>' +
    '<th style="padding:10px 14px;text-align:center;color:var(--text2);width:80px;">IP차단</th>' +
    '</tr></thead><tbody id="st-log-tbody"></tbody></table></div></div>';

  function renderRows(filter) {
    var filtered = filter ? logs.filter(function(l){ return (l.username||'').indexOf(filter) >= 0; }) : logs;
    var tbody = document.getElementById('st-log-tbody');
    if(filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--text3);">로그인 기록이 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.slice(0,100).map(function(l,i){
      var dt = l.datetime ? l.datetime.replace('T',' ').substring(0,19) : '';
      return '<tr style="border-bottom:1px solid var(--border);">' +
        '<td style="padding:10px 14px;color:var(--text3);">'+(i+1)+'</td>' +
        '<td style="padding:10px 14px;color:var(--text1);">'+l.username+'</td>' +
        '<td style="padding:10px 14px;color:var(--text2);">'+(l.nickname||'')+'</td>' +
        '<td style="padding:10px 14px;color:#fbbf24;">'+(l.ip||'')+'</td>' +
        '<td style="padding:10px 14px;color:var(--text3);">'+dt+'</td>' +
        '<td style="padding:10px 14px;text-align:center;"><button class="st-log-block" data-ip="'+(l.ip||'')+'" style="background:#ef4444;border:none;color:#fff;border-radius:4px;padding:3px 10px;font-size:0.72rem;cursor:pointer;">차단</button></td>' +
        '</tr>';
    }).join('');
  }

  function bindBlockBtns() {
    document.querySelectorAll('.st-log-block').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var ip = btn.dataset.ip;
        if(!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') { customAlert('이 IP는 차단할 수 없습니다.', {type:'warning'}); return; }
        if(!(await customConfirm(ip + ' 을(를) 차단하시겠습니까?'))) return;
        var res = await fetch('/api/admin/blocked-user-ips', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ ip: ip, reason: '로그인기록에서 차단' })
        });
        var data = await res.json();
        if(data.success) customAlert(ip + ' 차단 완료');
        else customAlert(data.error || '차단 실패', {type:'error'});
      });
    });
  }

  renderRows('');
  bindBlockBtns();
  document.getElementById('st-log-search').addEventListener('input', function(){
    renderRows(this.value.trim());
    bindBlockBtns();
  });
}

// ════════════════════════════════════
//  11. 텔레그램 알림설정
// ════════════════════════════════════
async function renderSettingsTelegram() {
  var s = {};
  try { var r = await fetch('/api/admin/settings'); var d = await r.json(); if(d.success) s = d.data; } catch(e){}
  var bots = s.telegramBots || [];
  // 기존 단일 telegram 설정 마이그레이션
  if(bots.length === 0 && s.telegram && s.telegram.botToken) {
    bots = [s.telegram];
  }
  while(bots.length < 3) bots.push({});

  function botCard(idx, tg) {
    var n = idx + 1;
    return '<div style="'+_stCard+'flex:1;min-width:0;">' +
      '<div style="font-size:0.95rem;font-weight:700;color:var(--text1);margin-bottom:14px;"><i class="fab fa-telegram" style="color:#29b6f6;margin-right:6px;"></i>봇 ' + n + '</div>' +
      '<div style="margin-bottom:12px;">' +
      '  <label style="'+_stLabel+'font-size:0.78rem;">봇 토큰</label>' +
      '  <input type="text" id="st-tg-token-'+idx+'" value="'+(tg.botToken||'')+'" placeholder="123456:ABC-DEF..." style="'+_stInput+'font-size:0.78rem;">' +
      '</div>' +
      '<div style="margin-bottom:12px;">' +
      '  <label style="'+_stLabel+'font-size:0.78rem;">채팅 ID</label>' +
      '  <div style="display:flex;gap:6px;">' +
      '    <input type="text" id="st-tg-chatid-'+idx+'" value="'+(tg.chatId||'')+'" placeholder="-100123..." style="'+_stInput+'font-size:0.78rem;flex:1;margin-bottom:0;">' +
      '    <button class="st-tg-fetchid" data-idx="'+idx+'" style="'+_stBtn+'background:var(--bg);color:#29b6f6;border:1px solid #29b6f6;font-size:0.7rem;padding:6px 10px;white-space:nowrap;">ID 가져오기</button>' +
      '  </div>' +
      '</div>' +
      '<div style="margin-bottom:10px;font-size:0.8rem;color:var(--text1);">알림 항목</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">' +
      '<label style="color:var(--text1);font-size:0.78rem;cursor:pointer;"><input type="checkbox" id="st-tg-deposit-'+idx+'" '+(tg.notifyDeposit?'checked':'')+' style="margin-right:5px;accent-color:#29b6f6;">충전 신청</label>' +
      '<label style="color:var(--text1);font-size:0.78rem;cursor:pointer;"><input type="checkbox" id="st-tg-withdraw-'+idx+'" '+(tg.notifyWithdraw?'checked':'')+' style="margin-right:5px;accent-color:#29b6f6;">환전 신청</label>' +
      '<label style="color:var(--text1);font-size:0.78rem;cursor:pointer;"><input type="checkbox" id="st-tg-signup-'+idx+'" '+(tg.notifySignup?'checked':'')+' style="margin-right:5px;accent-color:#29b6f6;">회원가입</label>' +
      '<label style="color:var(--text1);font-size:0.78rem;cursor:pointer;"><input type="checkbox" id="st-tg-inquiry-'+idx+'" '+(tg.notifyInquiry?'checked':'')+' style="margin-right:5px;accent-color:#29b6f6;">고객문의</label>' +
      '<label style="color:var(--text1);font-size:0.78rem;cursor:pointer;"><input type="checkbox" id="st-tg-adminlogin-'+idx+'" '+(tg.notifyAdminLogin?'checked':'')+' style="margin-right:5px;accent-color:#29b6f6;">관리자로그인</label>' +
      '</div>' +
      '<div style="display:flex;gap:8px;">' +
      '<button class="st-tg-save" data-idx="'+idx+'" style="'+_stBtn+'background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;font-size:0.78rem;padding:6px 16px;">저장</button>' +
      '<button class="st-tg-test" data-idx="'+idx+'" style="'+_stBtn+'background:var(--bg3);color:var(--text2);border:1px solid var(--input-border);font-size:0.78rem;padding:6px 16px;">테스트</button>' +
      '<button class="st-tg-reset" data-idx="'+idx+'" style="'+_stBtn+'background:var(--bg3);color:#f87171;border:1px solid #f87171;font-size:0.78rem;padding:6px 16px;">초기화</button>' +
      '</div>' +
      '<span id="st-tg-result-'+idx+'" style="display:block;margin-top:8px;font-size:0.78rem;display:none;"></span>' +
      '</div>';
  }

  document.getElementById('content').innerHTML =
    '<div style="display:flex;gap:16px;">' +
    botCard(0, bots[0]) + botCard(1, bots[1]) + botCard(2, bots[2]) +
    '</div>' +
    // 텔레그램 설정 가이드
    '<div style="'+_stCard+'margin-top:20px;">' +
    '<div style="font-size:1rem;font-weight:700;color:var(--text1);margin-bottom:20px;"><i class="fas fa-book" style="color:#fbbf24;margin-right:8px;"></i>텔레그램 봇 설정 가이드</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">' +
    // Step 1
    '<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:16px;">' +
    '<div style="font-size:0.85rem;font-weight:700;color:#29b6f6;margin-bottom:12px;"><span style="display:inline-block;width:24px;height:24px;background:#29b6f6;color:#000;border-radius:50%;text-align:center;line-height:24px;font-size:0.75rem;margin-right:8px;">1</span>봇 생성 (BotFather)</div>' +
    '<img src="/admin/images/tg_guide_1.jpg" class="tg-guide-img" style="width:100%;border-radius:8px;border:1px solid var(--input-border);margin-bottom:10px;cursor:pointer;" alt="BotFather 봇 생성">' +
    '<div style="font-size:0.78rem;color:var(--text2);line-height:1.6;">' +
    '① 텔레그램에서 <b style="color:var(--text1);">BotFather</b> 검색<br>' +
    '② <b style="color:#4ade80;">/newbot</b> 명령어 입력<br>' +
    '③ 봇 이름 및 username 설정<br>' +
    '④ 발급된 <b style="color:#fbbf24;">Token</b> 복사' +
    '</div>' +
    '</div>' +
    // Step 2
    '<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:16px;">' +
    '<div style="font-size:0.85rem;font-weight:700;color:#29b6f6;margin-bottom:12px;"><span style="display:inline-block;width:24px;height:24px;background:#29b6f6;color:#000;border-radius:50%;text-align:center;line-height:24px;font-size:0.75rem;margin-right:8px;">2</span>토큰 입력 및 적용</div>' +
    '<img src="/admin/images/tg_guide_2.jpg" class="tg-guide-img" style="width:100%;border-radius:8px;border:1px solid var(--input-border);margin-bottom:10px;cursor:pointer;" alt="토큰 입력">' +
    '<div style="font-size:0.78rem;color:var(--text2);line-height:1.6;">' +
    '① 복사한 토큰을 <b style="color:var(--text1);">봇 토큰</b> 칸에 붙여넣기<br>' +
    '② 알림 받을 항목 체크<br>' +
    '③ <b style="color:#4ade80;">저장</b> 버튼 클릭' +
    '</div>' +
    '<div style="margin-top:10px;padding:10px;background:var(--bg2);border:1px solid #f87171;border-radius:6px;font-size:0.75rem;color:#f87171;line-height:1.6;">' +
    '<b style="color:#fbbf24;">! 에러 팝업이 뜨는 경우</b><br>' +
    '1번 이미지의 <b style="color:var(--text1);">5번 절차 링크</b>를 클릭하여<br>' +
    '채팅방으로 들어간 뒤 <b style="color:#4ade80;">remind</b> 메시지를 전송 후<br>' +
    '다시 적용해주세요.' +
    '</div>' +
    '</div>' +
    // Step 3
    '<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:16px;">' +
    '<div style="font-size:0.85rem;font-weight:700;color:#29b6f6;margin-bottom:12px;"><span style="display:inline-block;width:24px;height:24px;background:#29b6f6;color:#000;border-radius:50%;text-align:center;line-height:24px;font-size:0.75rem;margin-right:8px;">3</span>채팅 ID 확인</div>' +
    '<img src="/admin/images/tg_guide_3.jpg" class="tg-guide-img" style="width:100%;border-radius:8px;border:1px solid var(--input-border);margin-bottom:10px;cursor:pointer;" alt="채팅 ID 확인">' +
    '<div style="font-size:0.78rem;color:var(--text2);line-height:1.6;">' +
    '① 생성된 봇에게 아무 메시지 전송<br>' +
    '② <b style="color:var(--text1);">채팅 ID</b>를 확인하여 입력<br>' +
    '③ <b style="color:#4ade80;">테스트</b> 버튼으로 연결 확인' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';

  // 이미지 크게보기
  document.querySelectorAll('.tg-guide-img').forEach(function(img){
    img.addEventListener('click', function(){
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(4px);';
      overlay.innerHTML = '<img src="'+img.src+'" style="max-width:90%;max-height:90%;border-radius:12px;box-shadow:0 0 40px var(--shadow);">';
      overlay.addEventListener('click', function(){ overlay.remove(); });
      document.body.appendChild(overlay);
    });
  });

  // 채팅 ID 자동 가져오기
  document.querySelectorAll('.st-tg-fetchid').forEach(function(btn){
    btn.addEventListener('click', async function(){
      var idx = parseInt(btn.dataset.idx);
      var token = document.getElementById('st-tg-token-'+idx).value.trim();
      var el = document.getElementById('st-tg-result-'+idx);
      if(!token) { el.style.color='#f87171'; el.textContent='먼저 봇 토큰을 입력하세요.'; el.style.display='block'; setTimeout(function(){ el.style.display='none'; }, 3000); return; }
      btn.disabled = true;
      var origText = btn.textContent;
      btn.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(41,182,246,0.3);border-top-color:#29b6f6;border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle;"></span>';
      try {
        var r = await fetch('https://api.telegram.org/bot'+token+'/getUpdates?limit=5');
        var d = await r.json();
        if(d.ok && d.result && d.result.length > 0) {
          var chatId = null;
          for(var i=0;i<d.result.length;i++){
            var msg = d.result[i].message || d.result[i].channel_post;
            if(msg && msg.chat && msg.chat.id) { chatId = msg.chat.id; break; }
          }
          if(chatId) {
            document.getElementById('st-tg-chatid-'+idx).value = chatId;
            el.style.color='#4ade80'; el.textContent='채팅 ID를 가져왔습니다: '+chatId;
          } else {
            el.style.color='#f87171'; el.textContent='메시지를 찾을 수 없습니다. 봇에게 먼저 메시지를 보내주세요.';
          }
        } else if(d.ok && d.result && d.result.length === 0) {
          el.style.color='#f87171'; el.textContent='메시지가 없습니다. 봇에게 먼저 아무 메시지를 보내주세요.';
        } else {
          el.style.color='#f87171'; el.textContent='실패: '+(d.description||'토큰을 확인하세요.');
        }
      } catch(e) { el.style.color='#f87171'; el.textContent='네트워크 오류'; }
      btn.disabled = false;
      btn.textContent = origText;
      el.style.display='block'; setTimeout(function(){ el.style.display='none'; }, 5000);
    });
  });

  // 저장
  document.querySelectorAll('.st-tg-save').forEach(function(btn){
    btn.addEventListener('click', async function(){
      var idx = parseInt(btn.dataset.idx);
      var origText = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle;"></span> 저장 중...';
      var botData = {
        botToken: document.getElementById('st-tg-token-'+idx).value.trim(),
        chatId: document.getElementById('st-tg-chatid-'+idx).value.trim(),
        notifyDeposit: document.getElementById('st-tg-deposit-'+idx).checked,
        notifyWithdraw: document.getElementById('st-tg-withdraw-'+idx).checked,
        notifySignup: document.getElementById('st-tg-signup-'+idx).checked,
        notifyInquiry: document.getElementById('st-tg-inquiry-'+idx).checked,
        notifyAdminLogin: document.getElementById('st-tg-adminlogin-'+idx).checked
      };
      // 현재 3개 봇 데이터 수집
      var allBots = [];
      for(var i=0;i<3;i++){
        if(i===idx) { allBots.push(botData); continue; }
        allBots.push({
          botToken: document.getElementById('st-tg-token-'+i).value.trim(),
          chatId: document.getElementById('st-tg-chatid-'+i).value.trim(),
          notifyDeposit: document.getElementById('st-tg-deposit-'+i).checked,
          notifyWithdraw: document.getElementById('st-tg-withdraw-'+i).checked,
          notifySignup: document.getElementById('st-tg-signup-'+i).checked,
          notifyInquiry: document.getElementById('st-tg-inquiry-'+i).checked,
          notifyAdminLogin: document.getElementById('st-tg-adminlogin-'+i).checked
        });
      }
      await fetch('/api/admin/settings', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ telegramBots: allBots })
      });
      btn.disabled = false;
      btn.textContent = origText;
      var el = document.getElementById('st-tg-result-'+idx);
      el.style.color='#4ade80'; el.textContent='저장되었습니다.';
      el.style.display='block'; setTimeout(function(){ el.style.display='none'; }, 2000);
    });
  });

  // 테스트
  document.querySelectorAll('.st-tg-test').forEach(function(btn){
    btn.addEventListener('click', async function(){
      var idx = parseInt(btn.dataset.idx);
      var token = document.getElementById('st-tg-token-'+idx).value.trim();
      var chatId = document.getElementById('st-tg-chatid-'+idx).value.trim();
      var el = document.getElementById('st-tg-result-'+idx);
      if(!token||!chatId) { el.style.color='#f87171'; el.textContent='토큰과 채팅ID를 입력하세요.'; el.style.display='block'; return; }
      try {
        var r = await fetch('https://api.telegram.org/bot'+token+'/sendMessage', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: chatId, text: '[테스트] 봇 '+(idx+1)+' 알림이 정상 연결되었습니다.' })
        });
        var d = await r.json();
        if(d.ok) { el.style.color='#4ade80'; el.textContent='발송 성공'; }
        else { el.style.color='#f87171'; el.textContent='실패: '+(d.description||''); }
      } catch(e) { el.style.color='#f87171'; el.textContent='네트워크 오류'; }
      el.style.display='block'; setTimeout(function(){ el.style.display='none'; }, 4000);
    });
  });

  // 초기화
  document.querySelectorAll('.st-tg-reset').forEach(function(btn){
    btn.addEventListener('click', async function(){
      var idx = parseInt(btn.dataset.idx);
      if(!confirm('봇 '+(idx+1)+' 설정을 초기화하시겠습니까?\n토큰, 채팅 ID, 알림 설정이 모두 삭제됩니다.')) return;
      document.getElementById('st-tg-token-'+idx).value = '';
      document.getElementById('st-tg-chatid-'+idx).value = '';
      document.getElementById('st-tg-deposit-'+idx).checked = false;
      document.getElementById('st-tg-withdraw-'+idx).checked = false;
      document.getElementById('st-tg-signup-'+idx).checked = false;
      document.getElementById('st-tg-inquiry-'+idx).checked = false;
      document.getElementById('st-tg-adminlogin-'+idx).checked = false;
      // 서버에 빈 데이터 저장
      var allBots = [];
      for(var i=0;i<3;i++){
        if(i===idx) { allBots.push({}); continue; }
        allBots.push({
          botToken: document.getElementById('st-tg-token-'+i).value.trim(),
          chatId: document.getElementById('st-tg-chatid-'+i).value.trim(),
          notifyDeposit: document.getElementById('st-tg-deposit-'+i).checked,
          notifyWithdraw: document.getElementById('st-tg-withdraw-'+i).checked,
          notifySignup: document.getElementById('st-tg-signup-'+i).checked,
          notifyInquiry: document.getElementById('st-tg-inquiry-'+i).checked,
          notifyAdminLogin: document.getElementById('st-tg-adminlogin-'+i).checked
        });
      }
      await fetch('/api/admin/settings', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ telegramBots: allBots })
      });
      var el = document.getElementById('st-tg-result-'+idx);
      el.style.color='#fbbf24'; el.textContent='봇 '+(idx+1)+' 연결이 초기화되었습니다.';
      el.style.display='block'; setTimeout(function(){ el.style.display='none'; }, 3000);
    });
  });
}
