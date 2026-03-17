// ══════════════════════════════════════
//  회원 관리 페이지
// ══════════════════════════════════════

// ── 은행 목록 ──
var _bankList = ['KB국민은행','신한은행','우리은행','하나은행','NH농협은행','IBK기업은행','SC제일은행','씨티은행','경남은행','광주은행','대구은행','부산은행','전북은행','제주은행','산업은행','수협은행','새마을금고','신협','우체국','케이뱅크','카카오뱅크','토스뱅크'];
function _bankOptions(selected) {
  return '<option value="">은행 선택</option>' + _bankList.map(function(b){ return '<option value="'+b+'"'+(b===selected?' selected':'')+'>'+b+'</option>'; }).join('');
}
function _bankSelectStyle() { return 'width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;cursor:pointer;'; }

// ── 커스텀 토스트 알림 ──
function _showToast(message, type) {
  type = type || 'info';
  var colors = {
    success: { bg: 'linear-gradient(135deg,#059669,#10b981)', icon: '&#10003;', border: '#10b981' },
    error:   { bg: 'linear-gradient(135deg,#dc2626,#ef4444)', icon: '&#10007;', border: '#ef4444' },
    info:    { bg: 'linear-gradient(135deg,#2563eb,#3b82f6)', icon: '&#8505;',  border: '#3b82f6' }
  };
  var c = colors[type] || colors.info;
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-20px);z-index:99999;'
    + 'background:var(--bg);border:1px solid ' + c.border + ';border-radius:12px;padding:14px 24px;'
    + 'display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px var(--shadow);'
    + 'opacity:0;transition:all 0.3s ease;min-width:300px;max-width:500px;';
  toast.innerHTML = '<div style="width:32px;height:32px;border-radius:50%;background:' + c.bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
    + '<span style="color:#fff;font-size:1rem;font-weight:700;">' + c.icon + '</span></div>'
    + '<span style="color:var(--text1);font-size:0.85rem;font-weight:500;">' + message + '</span>';
  document.body.appendChild(toast);
  requestAnimationFrame(function() {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

// ── 강제종료 확인 모달 ──
function _showKickConfirm(username, btn) {
  var existing = document.getElementById('mb-kick-modal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'mb-kick-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--shadow);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  overlay.innerHTML =
    '<div style="background:var(--bg);border:1px solid var(--input-border);border-radius:16px;padding:0;width:420px;box-shadow:0 20px 60px var(--shadow);overflow:hidden;animation:kickModalIn 0.2s ease-out;">'
    // 상단 빨간 바
    + '<div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:20px 24px;display:flex;align-items:center;gap:14px;">'
    +   '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">'
    +     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    +   '</div>'
    +   '<div>'
    +     '<div style="font-size:1rem;font-weight:700;color:#fff;">강제종료</div>'
    +     '<div style="font-size:0.75rem;color:rgba(255,255,255,0.7);margin-top:2px;">동기화해제 + 로그아웃</div>'
    +   '</div>'
    + '</div>'
    // 본문
    + '<div style="padding:24px;">'
    +   '<div style="background:var(--bg3);border:1px solid var(--input-border);border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px;margin-bottom:20px;">'
    +     '<div style="width:36px;height:36px;border-radius:50%;background:var(--input-border);display:flex;align-items:center;justify-content:center;color:var(--text2);font-weight:700;font-size:0.85rem;">' + username.charAt(0).toUpperCase() + '</div>'
    +     '<div>'
    +       '<div style="font-size:0.9rem;font-weight:700;color:var(--text1);">' + username + '</div>'
    +       '<div style="font-size:0.72rem;color:var(--text3);">해당 유저를 강제종료 하시겠습니까?</div>'
    +     '</div>'
    +   '</div>'
    +   '<div style="display:flex;gap:10px;justify-content:flex-end;">'
    +     '<button id="kick-cancel-btn" style="background:var(--bg3);border:1px solid var(--input-border);color:var(--text2);padding:9px 24px;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600;transition:all 0.15s;">취소</button>'
    +     '<button id="kick-confirm-btn" style="background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;color:#fff;padding:9px 24px;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600;transition:all 0.15s;">강제종료</button>'
    +   '</div>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);

  // 애니메이션 스타일 주입
  if (!document.getElementById('kick-modal-style')) {
    var s = document.createElement('style');
    s.id = 'kick-modal-style';
    s.textContent = '@keyframes kickModalIn{from{opacity:0;transform:scale(0.9);}to{opacity:1;transform:scale(1);}}';
    document.head.appendChild(s);
  }

  // 취소
  document.getElementById('kick-cancel-btn').addEventListener('click', function() { overlay.remove(); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  // 확인
  document.getElementById('kick-confirm-btn').addEventListener('click', function() {
    overlay.remove();
    btn.disabled = true;
    btn.textContent = '처리중...';
    fetch('/api/admin/user-kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username })
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.success) {
        // 킥 후 서버에서 최신 유저 데이터 가져와서 partnerTree 반영
        fetch('/api/admin/users').then(function(r){return r.json();}).then(function(uRes) {
          var u = (uRes.data||[]).find(function(x){return x.username===username;});
          if (u) _updateTreeNode(username, { money: u.money||0 });
          if(typeof savePartnerTree === 'function') savePartnerTree();
        }).catch(function(){});
        _showToast(username + ' 강제종료가 완료되었습니다.', 'success');
        fetchMemberData().then(function() {
          var tbody = document.getElementById('mb-tbody');
          if (tbody) { tbody.innerHTML = buildMemberRows(memberData); bindMemberRowEvents(); }
        });
      } else {
        _showToast('강제종료 실패: ' + (res.error || ''), 'error');
        btn.textContent = '강제종료';
        btn.disabled = false;
      }
    })
    .catch(function() {
      _showToast('강제종료 실패', 'error');
      btn.textContent = '강제종료';
      btn.disabled = false;
    });
  });
}

// ── 회원 생성 통합 모달 (탭: 회원 생성 / 대량 생성) ──
function _showCreateMemberModal(initTab, presetPartnerId) {
  var existing = document.getElementById('mb-create-modal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'mb-create-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--shadow);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  // 파트너 옵션 빌드
  var partnerOpts = '<option value="">선택안함</option>';
  function _collectPartners(nodes) {
    if (!nodes) return;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.level !== 'member') {
        var lbl = { admin:'관리자', head:'본사', subhead:'부본사', distributor:'총판', store:'매장' }[n.level] || n.level;
        partnerOpts += '<option value="' + n.id + '">[' + lbl + '] ' + n.id + '</option>';
      }
      if (n.children) _collectPartners(n.children);
    }
  }
  if (typeof partnerTree !== 'undefined') _collectPartners(partnerTree);

  // ── 개별 생성 탭 내용 ──
  var singleBody =
      '<div style="padding:24px;display:grid;grid-template-columns:1fr 1fr;gap:20px;">'
    +   '<div>'
    +     '<div style="font-size:0.82rem;font-weight:700;color:var(--text1);margin-bottom:12px;display:flex;align-items:center;gap:6px;">'
    +       '<span style="color:#2dd4bf;">●</span> 계정 정보'
    +     '</div>'
    +     '<div style="display:flex;flex-direction:column;gap:10px;">'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">아이디 <span style="color:#ef4444;">*</span></label>'
    +         '<div style="position:relative;"><input type="text" id="create-username" placeholder="영문, 숫자 4자 이상" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;">'
    +         '<span id="create-username-status" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:0.7rem;"></span></div>'
    +         '<div id="create-username-msg" style="font-size:0.68rem;margin-top:3px;min-height:14px;"></div></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">비밀번호 <span style="color:#ef4444;">*</span></label>'
    +         '<input type="text" id="create-password" placeholder="비밀번호 입력" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">닉네임</label>'
    +         '<input type="text" id="create-nickname" placeholder="닉네임 입력" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">연락처</label>'
    +         '<input type="text" id="create-phone" placeholder="010-0000-0000" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +     '</div>'
    +   '</div>'
    +   '<div>'
    +     '<div style="font-size:0.82rem;font-weight:700;color:var(--text1);margin-bottom:12px;display:flex;align-items:center;gap:6px;">'
    +       '<span style="color:#60a5fa;">●</span> 회원 설정'
    +     '</div>'
    +     '<div style="display:flex;flex-direction:column;gap:10px;">'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">파트너</label>'
    +         '<select id="create-partner" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;cursor:pointer;">' + partnerOpts + '</select></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">회원등급</label>'
    +         '<select id="create-grade" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;cursor:pointer;">'
    +           '<option value="normal">일반회원</option><option value="vip">VIP</option><option value="vvip">VVIP</option></select></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">은행명</label>'
    +         '<select id="create-bank" style="'+_bankSelectStyle()+'">'+_bankOptions('')+'</select></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">계좌번호</label>'
    +         '<input type="text" id="create-account" placeholder="계좌번호" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">예금주</label>'
    +         '<input type="text" id="create-holder" placeholder="예금주" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">관리자 메모</label>'
    +         '<textarea id="create-memo" placeholder="관리자용 메모 입력" rows="2" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;resize:vertical;font-family:inherit;"></textarea></div>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div style="padding:0 24px 24px;display:flex;gap:10px;justify-content:flex-end;">'
    +   '<button id="create-cancel-btn" style="background:var(--bg3);border:1px solid var(--input-border);color:var(--text2);padding:10px 24px;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600;">취소</button>'
    +   '<button id="create-submit-btn" style="background:linear-gradient(135deg,#0d9488,#0f766e);border:none;color:#fff;padding:10px 24px;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600;">회원 추가</button>'
    + '</div>';

  // ── 대량 생성 탭 내용 ──
  var bulkBody =
      '<div style="padding:24px;">'
    +   '<div style="margin-bottom:20px;">'
    +     '<div style="font-size:0.82rem;font-weight:700;color:var(--text1);margin-bottom:12px;display:flex;align-items:center;gap:6px;"><span style="color:#a78bfa;">●</span> 필수 정보</div>'
    +     '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">프리픽스</label>'
    +         '<input type="text" id="bulk-prefix" placeholder="user" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">시작번호</label>'
    +         '<input type="text" id="bulk-start" placeholder="01" value="01" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">종료번호</label>'
    +         '<input type="text" id="bulk-end" placeholder="10" value="10" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +     '</div>'
    +     '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">비밀번호</label>'
    +       '<input type="text" id="bulk-password" placeholder="공통 비밀번호 입력" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +   '</div>'
    +   '<div style="margin-bottom:20px;">'
    +     '<div style="font-size:0.82rem;font-weight:700;color:var(--text1);margin-bottom:12px;display:flex;align-items:center;gap:6px;"><span style="color:#60a5fa;">●</span> 추가 설정</div>'
    +     '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">파트너 (추천인)</label>'
    +         '<select id="bulk-partner" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;cursor:pointer;">' + partnerOpts + '</select></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">회원등급</label>'
    +         '<select id="bulk-grade" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;cursor:pointer;">'
    +           '<option value="normal">일반회원</option><option value="vip">VIP</option><option value="vvip">VVIP</option></select></div>'
    +     '</div>'
    +     '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">연락처</label>'
    +         '<input type="text" id="bulk-phone" placeholder="010-0000-0000" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">은행명</label>'
    +         '<select id="bulk-bank" style="'+_bankSelectStyle()+'">'+_bankOptions('')+'</select></div>'
    +       '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">계좌번호</label>'
    +         '<input type="text" id="bulk-account" placeholder="계좌번호" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +     '</div>'
    +     '<div><label style="display:block;font-size:0.72rem;color:var(--text2);margin-bottom:4px;">예금주</label>'
    +       '<input type="text" id="bulk-holder" placeholder="예금주" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--input-border);color:var(--text1);padding:8px 10px;border-radius:8px;font-size:0.8rem;outline:none;"></div>'
    +   '</div>'
    +   '<div style="margin-bottom:20px;">'
    +     '<div id="bulk-detail-toggle" style="font-size:0.78rem;color:var(--text3);cursor:pointer;display:flex;align-items:center;gap:6px;padding:8px 0;border-top:1px solid var(--bg3);">'
    +       '<svg id="bulk-detail-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" style="transition:transform 0.2s;"><polyline points="9 18 15 12 9 6"/></svg> 상세옵션</div>'
    +     '<div id="bulk-detail-body" style="display:none;margin-top:10px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +       '<label style="display:flex;align-items:center;gap:8px;font-size:0.78rem;color:var(--text2);cursor:pointer;"><input type="checkbox" id="bulk-opt-casino" checked style="accent-color:#7c3aed;"> 카지노 활성화</label>'
    +       '<label style="display:flex;align-items:center;gap:8px;font-size:0.78rem;color:var(--text2);cursor:pointer;"><input type="checkbox" id="bulk-opt-slot" checked style="accent-color:#7c3aed;"> 슬롯 활성화</label>'
    +     '</div></div>'
    +   '</div>'
    +   '<div style="background:var(--bg3);border-radius:8px;padding:12px 14px;margin-bottom:12px;">'
    +     '<div style="font-size:0.72rem;color:var(--text3);line-height:1.6;">'
    +       '• 생성 형식: <span style="color:#a78bfa;">[프리픽스][번호]</span> (예: user01, user02...)<br>'
    +       '• 중복된 아이디는 자동으로 건너뜁니다<br>'
    +       '• 생성된 회원은 <span style="color:#10b981;">활성</span> 상태로 등록됩니다</div>'
    +   '</div>'
    +   '<div id="bulk-preview-box" style="background:var(--bg3);border-radius:8px;padding:12px 14px;margin-bottom:20px;display:none;">'
    +     '<div style="font-size:0.72rem;color:var(--text2);margin-bottom:8px;font-weight:600;">생성될 아이디 미리보기</div>'
    +     '<div id="bulk-preview-list" style="display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow-y:auto;"></div>'
    +   '</div>'
    +   '<div style="display:flex;gap:10px;justify-content:flex-end;">'
    +     '<button id="bulk-cancel-btn" style="background:var(--bg3);border:1px solid var(--input-border);color:var(--text2);padding:10px 24px;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600;">취소</button>'
    +     '<button id="bulk-submit-btn" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;color:#fff;padding:10px 24px;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600;"><span id="bulk-count-label">10</span>명 생성</button>'
    +   '</div>'
    + '</div>';

  var activeTab = initTab || 'single';

  overlay.innerHTML =
    '<div style="background:var(--bg);border:1px solid var(--input-border);border-radius:16px;width:620px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px var(--shadow);animation:kickModalIn 0.2s ease-out;">'
    // 헤더
    + '<div id="cm-header" style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:20px 24px;display:flex;align-items:center;gap:14px;border-radius:16px 16px 0 0;">'
    +   '<div id="cm-header-icon" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">'
    +     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>'
    +   '</div>'
    +   '<div>'
    +     '<div id="cm-header-title" style="font-size:1rem;font-weight:700;color:#fff;">회원 생성</div>'
    +     '<div id="cm-header-sub" style="font-size:0.75rem;color:rgba(255,255,255,0.7);margin-top:2px;">새로운 회원을 등록합니다</div>'
    +   '</div>'
    +   '<div style="margin-left:auto;cursor:pointer;" id="cm-close-x">'
    +     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    +   '</div>'
    + '</div>'
    // 탭
    + '<div style="display:flex;border-bottom:1px solid var(--input-border);">'
    +   '<button id="cm-tab-single" style="flex:1;padding:12px 0;font-size:0.82rem;font-weight:600;border:none;cursor:pointer;transition:all 0.2s;background:transparent;color:var(--text2);border-bottom:2px solid transparent;">회원 생성</button>'
    +   '<button id="cm-tab-bulk" style="flex:1;padding:12px 0;font-size:0.82rem;font-weight:600;border:none;cursor:pointer;transition:all 0.2s;background:transparent;color:var(--text2);border-bottom:2px solid transparent;">대량 생성</button>'
    + '</div>'
    // 본문 컨테이너
    + '<div id="cm-body"></div>'
    + '</div>';

  document.body.appendChild(overlay);

  function _switchTab(tab) {
    activeTab = tab;
    var body = document.getElementById('cm-body');
    var tabSingle = document.getElementById('cm-tab-single');
    var tabBulk = document.getElementById('cm-tab-bulk');
    var header = document.getElementById('cm-header');
    var title = document.getElementById('cm-header-title');
    var sub = document.getElementById('cm-header-sub');
    var icon = document.getElementById('cm-header-icon');

    if (tab === 'single') {
      tabSingle.style.color = 'var(--text1)';
      tabSingle.style.borderBottom = '2px solid #0d9488';
      tabBulk.style.color = 'var(--text2)';
      tabBulk.style.borderBottom = '2px solid transparent';
      header.style.background = 'linear-gradient(135deg,#0d9488,#0f766e)';
      title.textContent = '회원 생성';
      sub.textContent = '새로운 회원을 등록합니다';
      icon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
      body.innerHTML = singleBody;
      if (presetPartnerId) {
        var sel = document.getElementById('create-partner');
        if (sel) sel.value = presetPartnerId;
      }
      _bindSingleEvents();
    } else {
      tabBulk.style.color = 'var(--text1)';
      tabBulk.style.borderBottom = '2px solid #7c3aed';
      tabSingle.style.color = 'var(--text2)';
      tabSingle.style.borderBottom = '2px solid transparent';
      header.style.background = 'linear-gradient(135deg,#7c3aed,#6d28d9)';
      title.textContent = '대량 생성';
      sub.textContent = '여러 회원을 한번에 생성합니다';
      icon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
      body.innerHTML = bulkBody;
      _bindBulkEvents();
    }
  }

  // ── 개별 생성 이벤트 ──
  function _bindSingleEvents() {
    document.getElementById('create-cancel-btn').addEventListener('click', function() { overlay.remove(); });

    // 실시간 아이디 중복 체크
    var _dupTimer = null;
    document.getElementById('create-username').addEventListener('input', function() {
      var val = this.value.trim();
      var statusEl = document.getElementById('create-username-status');
      var msgEl = document.getElementById('create-username-msg');
      if (_dupTimer) clearTimeout(_dupTimer);
      if (!val) { statusEl.innerHTML = ''; msgEl.innerHTML = ''; return; }
      if (val.length < 4) { statusEl.innerHTML = ''; msgEl.innerHTML = '<span style="color:#f59e0b;">4자 이상 입력하세요</span>'; return; }
      statusEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:var(--text2);"></i>';
      msgEl.innerHTML = '';
      _dupTimer = setTimeout(function() {
        // users.json에서 중복 체크
        fetch('/api/admin/users')
          .then(function(r) { return r.json(); })
          .then(function(res) {
            var users = res.data || res || [];
            var exists = users.some(function(u) { return u.username === val; });
            // 파트너 트리에서도 체크
            if (!exists && typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
              exists = !!findNode(partnerTree, val);
            }
            if (exists) {
              statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i>';
              msgEl.innerHTML = '<span style="color:#ef4444;">이미 사용중인 아이디입니다</span>';
            } else {
              statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i>';
              msgEl.innerHTML = '<span style="color:#10b981;">사용 가능한 아이디입니다</span>';
            }
          })
          .catch(function() { statusEl.innerHTML = ''; msgEl.innerHTML = ''; });
      }, 300);
    });
    document.getElementById('create-submit-btn').addEventListener('click', function() {
      var username = (document.getElementById('create-username').value || '').trim();
      var password = (document.getElementById('create-password').value || '').trim();
      var nickname = (document.getElementById('create-nickname').value || '').trim();
      var phone = (document.getElementById('create-phone').value || '').trim();
      var partner = document.getElementById('create-partner').value;
      var grade = document.getElementById('create-grade').value;
      var bank = (document.getElementById('create-bank').value || '').trim();
      var account = (document.getElementById('create-account').value || '').trim();
      var holder = (document.getElementById('create-holder').value || '').trim();
      var memo = (document.getElementById('create-memo').value || '').trim();

      if (!username) { _showToast('아이디를 입력해주세요.', 'error'); return; }
      if (username.length < 4) { _showToast('아이디는 4자 이상이어야 합니다.', 'error'); return; }
      if (!password) { _showToast('비밀번호를 입력해주세요.', 'error'); return; }
      if (password.length < 3) { _showToast('비밀번호는 3자 이상이어야 합니다.', 'error'); return; }

      var btn = document.getElementById('create-submit-btn');
      btn.disabled = true; btn.textContent = '생성 중...';

      fetch('/api/admin/partner/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, nickname: nickname || username, password: password })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.success && res.user) {
          fetch('/api/admin/users/' + res.user.id + '/update', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, bank: bank, account: account, holder: holder, memo: memo, grade: grade })
          }).catch(function(){});
          if (partner && typeof partnerTree !== 'undefined' && typeof findNode === 'function') {
            var parentNode = findNode(partnerTree, partner);
            if (parentNode) {
              if (!parentNode.children) parentNode.children = [];
              if (!parentNode.children.some(function(c) { return c.id === username; })) {
                parentNode.children.push({ id: username, label: nickname || username, level: 'member', money: 0, point: 0, children: [] });
              }
              if (typeof savePartnerTree === 'function') savePartnerTree();
            }
          }
          overlay.remove();
          _showToast(username + ' 회원이 생성되었습니다.', 'success');
          renderMemberPage();
        } else {
          _showToast(res.error || '회원 생성 실패', 'error');
          btn.disabled = false; btn.textContent = '회원 추가';
        }
      })
      .catch(function() { _showToast('회원 생성 실패', 'error'); btn.disabled = false; btn.textContent = '회원 추가'; });
    });
  }

  // ── 대량 생성 이벤트 ──
  var _allUsernames = null; // 기존 유저 목록 캐시
  function _bindBulkEvents() {
    function _updateBulkCount() {
      var s = parseInt(document.getElementById('bulk-start').value) || 0;
      var e = parseInt(document.getElementById('bulk-end').value) || 0;
      var label = document.getElementById('bulk-count-label');
      if (label) label.textContent = Math.max(0, e - s + 1);
    }
    function _updateBulkPreview() {
      _updateBulkCount();
      var prefix = (document.getElementById('bulk-prefix').value || '').trim();
      var startRaw = (document.getElementById('bulk-start').value || '').trim();
      var endRaw = (document.getElementById('bulk-end').value || '').trim();
      var startN = parseInt(startRaw) || 0;
      var endN = parseInt(endRaw) || 0;
      var pLen = Math.max(startRaw.length, endRaw.length);
      var box = document.getElementById('bulk-preview-box');
      var list = document.getElementById('bulk-preview-list');
      if (!prefix || !startN || !endN || endN < startN) {
        box.style.display = 'none';
        return;
      }
      var count = endN - startN + 1;
      if (count > 200) { box.style.display = 'none'; return; }
      var html = '';
      for (var i = startN; i <= endN; i++) {
        var numStr = String(i);
        while (numStr.length < pLen) numStr = '0' + numStr;
        var uname = prefix + numStr;
        var isDup = _allUsernames && _allUsernames.indexOf(uname) !== -1;
        if (isDup) {
          html += '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:0.7rem;font-weight:600;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);">' + uname + ' (중복)</span>';
        } else {
          html += '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:0.7rem;font-weight:600;background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.3);">' + uname + '</span>';
        }
      }
      list.innerHTML = html;
      box.style.display = 'block';
    }
    // 기존 유저 목록 가져오기
    fetch('/api/admin/users').then(function(r) { return r.json(); }).then(function(d) {
      _allUsernames = (d.data || []).map(function(u) { return u.username || u.id; });
      _updateBulkPreview();
    }).catch(function() {});
    document.getElementById('bulk-prefix').addEventListener('input', _updateBulkPreview);
    document.getElementById('bulk-start').addEventListener('input', _updateBulkPreview);
    document.getElementById('bulk-end').addEventListener('input', _updateBulkPreview);

    document.getElementById('bulk-detail-toggle').addEventListener('click', function() {
      var body = document.getElementById('bulk-detail-body');
      var arrow = document.getElementById('bulk-detail-arrow');
      if (body.style.display === 'none') { body.style.display = 'block'; arrow.style.transform = 'rotate(90deg)'; }
      else { body.style.display = 'none'; arrow.style.transform = 'rotate(0deg)'; }
    });

    document.getElementById('bulk-cancel-btn').addEventListener('click', function() { overlay.remove(); });
    document.getElementById('bulk-submit-btn').addEventListener('click', function() {
      var prefix = (document.getElementById('bulk-prefix').value || '').trim();
      var startRaw = (document.getElementById('bulk-start').value || '').trim();
      var endRaw = (document.getElementById('bulk-end').value || '').trim();
      var startN = parseInt(startRaw) || 0;
      var endN = parseInt(endRaw) || 0;
      var padLen = Math.max(startRaw.length, endRaw.length);
      var pw = (document.getElementById('bulk-password').value || '').trim();
      var partner = document.getElementById('bulk-partner').value;
      var grade = document.getElementById('bulk-grade').value;
      var phone = (document.getElementById('bulk-phone').value || '').trim();
      var bank = (document.getElementById('bulk-bank').value || '').trim();
      var account = (document.getElementById('bulk-account').value || '').trim();
      var holder = (document.getElementById('bulk-holder').value || '').trim();
      var casinoOn = document.getElementById('bulk-opt-casino').checked;
      var slotOn = document.getElementById('bulk-opt-slot').checked;

      if (!prefix) { _showToast('프리픽스를 입력해주세요.', 'error'); return; }
      if (!pw) { _showToast('비밀번호를 입력해주세요.', 'error'); return; }
      if (pw.length < 3) { _showToast('비밀번호는 3자 이상이어야 합니다.', 'error'); return; }
      if (endN < startN) { _showToast('종료번호가 시작번호보다 작습니다.', 'error'); return; }

      // 전부 중복이면 생성 차단
      if (_allUsernames) {
        var dupCount = 0;
        var totalCount = endN - startN + 1;
        for (var ci = startN; ci <= endN; ci++) {
          var cNum = String(ci);
          while (cNum.length < padLen) cNum = '0' + cNum;
          if (_allUsernames.indexOf(prefix + cNum) !== -1) dupCount++;
        }
        if (dupCount === totalCount) { _showToast('모든 아이디가 중복입니다. 번호를 변경해주세요.', 'error'); return; }
        if (dupCount > 0 && !confirm(dupCount + '개의 중복 아이디는 건너뛰고 ' + (totalCount - dupCount) + '명만 생성합니다. 계속하시겠습니까?')) return;
      }

      var btn = document.getElementById('bulk-submit-btn');
      btn.disabled = true; btn.textContent = '생성 중...';
      var created = 0, skipped = 0, idx = startN;

      function _createNext() {
        if (idx > endN) {
          overlay.remove();
          _showToast(created + '명 생성 완료' + (skipped > 0 ? ' (' + skipped + '명 중복 건너뜀)' : ''), 'success');
          renderMemberPage();
          return;
        }
        var numStr = String(idx);
        while (numStr.length < padLen) numStr = '0' + numStr;
        var username = prefix + numStr;

        fetch('/api/admin/partner/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, nickname: username, password: pw })
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if (res.success && res.user) {
            fetch('/api/admin/users/' + res.user.id + '/update', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: phone, bank: bank, account: account, holder: holder, grade: grade, casino: casinoOn ? 'ON' : 'OFF', slot: slotOn ? 'ON' : 'OFF' })
            }).catch(function(){});
            if (partner && typeof partnerTree !== 'undefined' && typeof findNode === 'function') {
              var parentNode = findNode(partnerTree, partner);
              if (parentNode) {
                if (!parentNode.children) parentNode.children = [];
                if (!parentNode.children.some(function(c) { return c.id === username; })) {
                  parentNode.children.push({ id: username, label: username, level: 'member', money: 0, point: 0, children: [] });
                }
              }
            }
            created++;
          } else { skipped++; }
          idx++; _createNext();
        })
        .catch(function() { skipped++; idx++; _createNext(); });
      }
      _createNext();
    });
  }

  // 탭 클릭
  document.getElementById('cm-tab-single').addEventListener('click', function() { _switchTab('single'); });
  document.getElementById('cm-tab-bulk').addEventListener('click', function() { _switchTab('bulk'); });

  // 닫기
  document.getElementById('cm-close-x').addEventListener('click', function() { overlay.remove(); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  // 초기 탭 렌더
  _switchTab(activeTab);
}

var memberBlacklist = (function() {
  try { return JSON.parse(localStorage.getItem('memberBlacklist') || '[]'); }
  catch(e) { return []; }
})();

function saveBlacklist() {
  try { localStorage.setItem('memberBlacklist', JSON.stringify(memberBlacklist)); }
  catch(e) {}
}

var memberData = [];
var _memberDateStart = '';
var _memberDateEnd = '';

function _todayKST() {
  var now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

// 회원 수정사항 로컬 저장/로드
function getMemberOverrides() {
  try { return JSON.parse(localStorage.getItem('memberOverrides') || '{}'); } catch(e){ return {}; }
}
function saveMemberOverride(id, fields) {
  var ov = getMemberOverrides();
  if(!ov[id]) ov[id] = {};
  Object.assign(ov[id], fields);
  try { localStorage.setItem('memberOverrides', JSON.stringify(ov)); } catch(e){}
}
function applyMemberOverrides(members) {
  var ov = getMemberOverrides();
  members.forEach(function(m) {
    if(ov[m.id]) {
      var copy = Object.assign({}, ov[m.id]);
      delete copy.casino;
      delete copy.slot;
      Object.assign(m, copy);
    }
  });
}

function getMemberById(id) {
  return memberData.find(function(m){ return m.id === id; });
}

// 회원 데이터를 파트너 노드 형태로 변환하여 openPartnerModal 호출
function _openMemberAsPartnerModal(tr) {
  var id = tr.dataset.id || tr.querySelector('td:nth-child(2) div').textContent.trim();
  var m = getMemberById(id) || {};

  // 실제 잔액(로컬+게임사) 조회 후 모달 열기
  fetch('/api/admin/users/balance?username=' + encodeURIComponent(id))
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var realMoney = res.success ? (res.balance || 0) : (m.money || 0);
      _doOpenMemberModal(id, m, realMoney);
    })
    .catch(function() {
      _doOpenMemberModal(id, m, m.money || 0);
    });
}

function _doOpenMemberModal(id, m, realMoney) {
  // partnerTree에서 해당 유저 노드 찾기
  if(typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
    var existing = findNode(partnerTree, id);
    if(existing) {
      if(m.nick) existing.label = m.nick;
      if(m.phone) existing.phone = m.phone;
      if(m.bank) existing.bank = m.bank;
      if(m.account) existing.account = m.account;
      if(m.holder) existing.holder = m.holder;
      if(m.registeredAt) existing.registeredAt = m.registeredAt;
      if(m.lastLoginAt) existing.lastLoginAt = m.lastLoginAt;
      if(m.lastLoginIp) existing.lastLoginIp = m.lastLoginIp;
      if(m.memo) existing.memo = m.memo;
      if(m.password) existing.password = m.password;
      if(m.point !== undefined) existing.point = m.point;
      if(m.rollingPoint !== undefined) existing.rollingPoint = m.rollingPoint;
      if(m.gameGroup !== undefined) existing.gameGroup = m.gameGroup;
      existing.username = id;
      existing.status = m.status || existing.status;
      existing.money = realMoney;
      openPartnerModal(existing); return;
    }
  }

  var node = {
    id: m.id || id,
    label: m.nick || m.nickname || id,
    level: m.level || '회원',
    money: realMoney,
    point: m.point || 0,
    rollingPoint: m.rollingPoint || 0,
    status: m.status || '정상',
    registeredAt: m.registeredAt || null,
    lastLoginAt: m.lastLoginAt || null,
    lastLoginIp: m.lastLoginIp || null,
    phone: m.phone || '',
    bank: m.bank || '',
    account: m.account || '',
    holder: m.holder || '',
    casino: m.casino || 'ON',
    slot: m.slot || 'ON',
    memo: m.memo || '',
    password: m.password || '',
    rollCasino: m.rollCasino || 0,
    rollSlot: m.rollSlot || 0,
    rollMini: m.rollMini || 0,
    losingSlot: m.losingSlot || 0,
    gameGroup: m.gameGroup || '',
    children: [],
    username: m.username || id
  };
  openPartnerModal(node);
}

function updateMember(id, fields) {
  var m = getMemberById(id);
  if(!m) return;
  Object.assign(m, fields);
  saveMemberOverride(id, fields);
  // 파트너 트리 노드에도 반영
  if(typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
    var treeNode = findNode(partnerTree, id);
    if(treeNode) {
      Object.assign(treeNode, fields);
      savePartnerTree();
    }
  }
  // 서버에도 반영
  fetch('/api/admin/users/' + m.odid + '/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  }).catch(function(e){ console.error('회원정보 업데이트 실패:', e); });
}

function _collectMembers(nodes, parentId, result) {
  (nodes || []).forEach(function(n) {
    if (n.level === 'member') {
      result.push({ node: n, belongId: parentId || '-' });
    }
    if (n.children && n.children.length) {
      _collectMembers(n.children, n.id, result);
    }
  });
}

function fetchMemberData() {
  return Promise.all([
    fetch('/api/admin/users').then(function(r){ return r.json(); }),
    fetch('/api/admin/users/stats?start=' + encodeURIComponent(_memberDateStart) + '&end=' + encodeURIComponent(_memberDateEnd)).then(function(r){ return r.json(); }).catch(function(){ return { data: {} }; })
  ])
    .then(function(results) {
      var usersRes = results[0];
      var statsRes = results[1];
      var betStats = statsRes.data || {};

      // users.json 데이터를 맵으로 변환 (보충용)
      var userMap = {};
      ((usersRes.data || [])).forEach(function(u) {
        userMap[u.username] = u;
      });

      // 지급/회수 집계 (localStorage 머니로그, 날짜 필터 적용)
      var moneyLogs = [];
      try { moneyLogs = moneyLogs.concat(JSON.parse(localStorage.getItem('adminMoneyLog') || '[]')); } catch(e){}
      try { moneyLogs = moneyLogs.concat(JSON.parse(localStorage.getItem('partnerMoneyLog') || '[]')); } catch(e){}
      if (_memberDateStart) {
        moneyLogs = moneyLogs.filter(function(l) {
          var dt = (l.datetime || l.date || l.time || '').slice(0, 10);
          return dt >= _memberDateStart;
        });
      }
      if (_memberDateEnd) {
        moneyLogs = moneyLogs.filter(function(l) {
          var dt = (l.datetime || l.date || l.time || '').slice(0, 10);
          return dt <= _memberDateEnd;
        });
      }
      var giveTakeMap = {};
      moneyLogs.forEach(function(log) {
        var tid = log.targetId;
        if (!tid) return;
        if (!giveTakeMap[tid]) giveTakeMap[tid] = { give: 0, take: 0 };
        var amt = Math.abs(log.amount || 0);
        if (log.type === 'give') giveTakeMap[tid].give += amt;
        else if (log.type === 'take') giveTakeMap[tid].take += amt;
      });

      // ★ partnerTree에서 회원(member) 노드 추출 — 파트너 페이지와 동일 소스
      var treeMembers = [];
      if (typeof partnerTree !== 'undefined' && partnerTree.length) {
        _collectMembers(partnerTree, null, treeMembers);
      }

      memberData = treeMembers.map(function(entry) {
        var n = entry.node;
        var u = userMap[n.id] || {};  // users.json 보충 데이터
        var gt = giveTakeMap[n.id] || { give: 0, take: 0 };
        var bs = betStats[n.id] || { bet: 0, win: 0 };
        return {
          id: n.id,
          odid: u.id || n.id,
          nick: u.nickname || n.label || n.id,
          name: u.holder || '',
          phone: u.phone || '',
          bank: u.bank || '',
          account: u.account || '',
          holder: u.holder || '',
          group: '-',
          money: n.money || u.money || 0,
          point: n.point || u.point || 0,
          rollingPoint: n.rollingPoint || u.rollingPoint || 0,
          belong: '회',
          belongId: entry.belongId,
          casino: u.casino || 'ON',
          slot: u.slot || 'ON',
          status: u.status === 'active' ? '정상' : (u.status || '정상'),
          memo: u.memo || '',
          password: u.password || '',
          gameGroup: n.gameGroup || u.gameGroup || '',
          api: u.api || [],
          registeredAt: u.registeredAt || '',
          lastLoginAt: u.lastLoginAt || '',
          lastLoginIp: u.lastLoginIp || '',
          rollCasino: n.rollCasino || 0,
          rollSlot: n.rollSlot || 0,
          rollMini: n.rollMini || 0,
          losingSlot: n.losingSlot || 0,
          totalGive: gt.give,
          totalTake: gt.take,
          totalBet: bs.bet,
          totalWin: bs.win
        };
      });

      applyMemberOverrides(memberData);
      return memberData;
    })
    .catch(function(e) { console.error('회원 데이터 로드 실패:', e); return []; });
}

var memberBelongColor = { '관':'#8b5cf6','본':'#3b82f6','부':'#06b6d4','총':'#f59e0b','매':'#10b981','회':'#6b7280' };

function renderMemberPage(subPage) {
  if(subPage === 'member-blacklist') { renderBlacklistPage(); return; }
  if(subPage === 'member-pending')   { renderPendingPage();   return; }
  if(subPage === 'member-online')    { renderOnlinePage();    return; }
  if(subPage === 'member-emptybet')  { renderEmptyBetListPage(); return; }

  // 기본 날짜: 오늘
  if (!_memberDateStart) _memberDateStart = _todayKST();
  if (!_memberDateEnd) _memberDateEnd = _todayKST();

  // 로딩 표시
  document.getElementById('content').innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3);"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><p style="margin-top:12px;">회원 목록 로드중...</p></div>';

  fetchMemberData().then(function(data) {
    // 페이지 이동했으면 렌더링 중단
    var title = document.getElementById('page-title');
    if (title && title.textContent.indexOf('회원') === -1) return;

    // 서버 포인트를 파트너 트리에 동기화 (서버 값 = 진실)
    var _userPointMap = {};
    data.forEach(function(m){ _userPointMap[m.id] = m; });
    (function _syncPt(nodes) {
      (nodes||[]).forEach(function(n) {
        if(_userPointMap[n.id]) {
          n.point = _userPointMap[n.id].point || 0;
          n.rollingPoint = _userPointMap[n.id].rollingPoint || 0;
        }
        if(n.children) _syncPt(n.children);
      });
    })(partnerTree);

    // (partnerTree가 기본 소스이므로 syncMembersToTree 불필요)

    // 통계
    var totalCount = data.length;
    var activeCount = data.filter(function(m){ return m.status === '정상'; }).length;
    var totalMoney = data.reduce(function(s,m){ return s + (m.money || 0); }, 0);

    document.getElementById('content').innerHTML =
      '<div class="pt-wrap">'

      // ── 헤더 ──
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;">'
      +   '<div>'
      +     '<h2 style="margin:0;font-size:1.3rem;font-weight:700;color:var(--text1);">👤 회원 관리</h2>'
      +     '<p style="margin:4px 0 0;font-size:0.78rem;color:var(--text3);">전체 회원 목록 및 관리</p>'
      +   '</div>'
      +   '<div style="display:flex;gap:8px;">'
      +     '<button class="pt-action-btn pt-btn-purple" id="mb-add-user-btn" style="padding:6px 14px;font-size:0.78rem;">회원 생성</button>'
      +     '<button class="pt-action-btn pt-btn-gray" id="mb-refresh-btn" style="padding:6px 10px;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button>'
      +   '</div>'
      + '</div>'

      // ── 상단 카드 3개 ──
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">'
      // 전체회원
      +   '<div style="background:var(--card);border:1px solid var(--input-border);border-radius:12px;padding:18px 22px;display:flex;align-items:center;gap:14px;">'
      +     '<div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>'
      +     '<div><div style="font-size:1.5rem;font-weight:800;color:var(--text1);">' + totalCount + '</div><div style="font-size:0.75rem;color:var(--text3);">전체회원</div></div>'
      +   '</div>'
      // 정상
      +   '<div style="background:var(--card);border:1px solid var(--input-border);border-radius:12px;padding:18px 22px;display:flex;align-items:center;gap:14px;">'
      +     '<div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>'
      +     '<div><div style="font-size:1.5rem;font-weight:800;color:var(--text1);">' + activeCount + '</div><div style="font-size:0.75rem;color:var(--text3);">정상</div></div>'
      +   '</div>'
      // 총 보유금
      +   '<div style="background:var(--card);border:1px solid var(--input-border);border-radius:12px;padding:18px 22px;display:flex;align-items:center;gap:14px;">'
      +     '<div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#a855f7,#7c3aed);display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>'
      +     '<div><div style="font-size:1.5rem;font-weight:800;color:var(--text1);">₩' + totalMoney.toLocaleString() + '</div><div style="font-size:0.75rem;color:var(--text3);">총 보유금</div></div>'
      +   '</div>'
      + '</div>'

      // ── 본문: 왼쪽 트리 + 오른쪽 테이블 ──
      + '<div class="pt-body">'

      // 왼쪽: 트리 패널
      + '<div class="pt-left">'
      +   '<div class="pt-left-top">'
      +     '<input class="pt-search-input" type="text" placeholder="검색어" id="mb-tree-search">'
      +   '</div>'
      +   '<div class="pt-left-actions">'
      +     '<button class="pt-action-btn pt-btn-green" id="mb-expand-all">모두 펼치기</button>'
      +     '<button class="pt-action-btn pt-btn-gray" id="mb-collapse-all">모두 접기</button>'
      +   '</div>'
      +   '<div class="pt-tree" id="mb-tree"></div>'
      + '</div>'

      // 오른쪽: 검색 + 테이블
      + '<div class="pt-right" style="min-width:0;">'

      // 검색 바 + 날짜 필터
      +   '<div class="date-filter-bar" style="margin-bottom:8px;">'
      +     '<div class="df-search-box" style="flex:0 0 240px;">'
      +       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
      +       '<input type="text" id="mb-search-input" placeholder="아이디, 닉네임, 예금주, 연락처">'
      +     '</div>'
      +     '<button class="df-preset mb-date-preset" data-preset="today" style="background:#6366f1;color:#fff;border:none;">오늘</button>'
      +     '<button class="df-preset mb-date-preset" data-preset="yesterday">어제</button>'
      +     '<button class="df-preset mb-date-preset" data-preset="week">이번주</button>'
      +     '<button class="df-preset mb-date-preset" data-preset="month">이번달</button>'
      +     '<button class="df-preset mb-date-preset" data-preset="all">전체</button>'
      +     '<div class="df-date-range">'
      +       '<input type="date" id="mb-date-start" value="' + _todayKST() + '">'
      +       '<span style="color:var(--text3);font-size:0.72rem;">~</span>'
      +       '<input type="date" id="mb-date-end" value="' + _todayKST() + '">'
      +       '<button class="df-query-btn" id="mb-date-apply">조회</button>'
      +     '</div>'
      +   '</div>'
      // 일괄 버튼 + 정렬
      +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">'
      +     '<button id="mb-bulk-give" style="padding:5px 12px;border-radius:6px;font-size:0.73rem;font-weight:700;cursor:pointer;border:none;background:#f59e0b;color:#fff;">일괄지급</button>'
      +     '<button id="mb-bulk-take" style="padding:5px 12px;border-radius:6px;font-size:0.73rem;font-weight:700;cursor:pointer;border:none;background:#4ade80;color:#fff;">일괄회수</button>'
      +     '<button id="mb-bulk-casino-on" style="padding:5px 12px;border-radius:6px;font-size:0.73rem;font-weight:700;cursor:pointer;border:none;background:#38bdf8;color:#fff;">전체카지노 ON</button>'
      +     '<button id="mb-bulk-casino-off" style="padding:5px 12px;border-radius:6px;font-size:0.73rem;font-weight:700;cursor:pointer;border:1px solid #38bdf8;background:transparent;color:#38bdf8;">전체카지노 OFF</button>'
      +     '<button id="mb-bulk-pw" style="padding:5px 12px;border-radius:6px;font-size:0.73rem;font-weight:700;cursor:pointer;border:1px solid var(--border);background:var(--card);color:var(--text1);">하부전체 비번변경</button>'
      +     '<button id="mb-bulk-block" style="padding:5px 12px;border-radius:6px;font-size:0.73rem;font-weight:700;cursor:pointer;border:1px solid #f59e0b;background:transparent;color:#f59e0b;">하부전체 차단</button>'
      +     '<button id="mb-bulk-delete" style="padding:5px 12px;border-radius:6px;font-size:0.73rem;font-weight:700;cursor:pointer;border:none;background:#ef4444;color:#fff;">하부전체 삭제</button>'
      +     '<div style="margin-left:auto;display:flex;align-items:center;gap:8px;">'
      +       '<span style="font-size:0.78rem;color:var(--text3);">총 <b style="color:#60a5fa;">' + totalCount + '</b>명</span>'
      +       '<select id="mb-sort-select" style="background:var(--bg);border:1px solid var(--input-border);color:var(--text1);padding:5px 10px;border-radius:6px;font-size:0.78rem;cursor:pointer;">'
      +         '<option value="name">이름순 정렬</option>'
      +         '<option value="recent">최신가입순</option>'
      +         '<option value="money">보유머니순</option>'
      +         '<option value="login">최신활동순</option>'
      +       '</select>'
      +     '</div>'
      +   '</div>'

      // 테이블
      +   '<style>.mb-table th,.mb-table td{border-right:1px solid var(--bg3);}.mb-table th:last-child,.mb-table td:last-child{border-right:none;}.mb-table{table-layout:fixed;}</style>'
      +   '<div class="db-section" style="margin-bottom:0;overflow-x:auto;border-radius:12px;">'
      +     '<table class="db-table mb-table" style="font-size:0.8rem;">'
      +       '<colgroup>'
      +         '<col style="width:30px;">'
      +         '<col style="width:80px;">'
      +         '<col style="width:80px;">'
      +         '<col style="width:80px;">'
      +         '<col style="width:70px;">'
      +         '<col style="width:110px;">'
      +         '<col style="width:85px;">'
      +         '<col style="width:100px;">'
      +         '<col style="width:130px;">'
      +         '<col style="width:130px;">'
      +       '</colgroup>'
      +       '<thead><tr>'
      +         '<th><input type="checkbox" id="mb-check-all"></th>'
      +         '<th>회원정보</th>'
      +         '<th>동기화</th>'
      +         '<th>그룹</th>'
      +         '<th>파트너</th>'
      +         '<th>보유금</th>'
      +         '<th>포인트</th>'
      +         '<th>베팅권한</th>'
      +         '<th>지급/회수</th>'
      +         '<th>베팅/당첨</th>'
      +       '</tr></thead>'
      +       '<tbody id="mb-tbody">' + buildMemberRows(data) + '</tbody>'
      +     '</table>'
      +   '</div>'

      + '</div>' // pt-right
      + '</div>' // pt-body
      + '</div>'; // pt-wrap

    renderMemberTree();
    bindMemberEvents();
  });
}

function buildMemberRows(data) {
  if(!data.length) return '<tr><td colspan="10" style="color:var(--text3);padding:20px;">회원이 없습니다.</td></tr>';
  return data.map(function(m, idx) {
    // API 연동 배지
    var syncBadge = '';
    if (m.api && m.api.length) {
      var badges = [];
      if (m.api.indexOf('honorlink') !== -1) badges.push('아너링크');
      if (m.api.indexOf('csapi') !== -1) badges.push('오닉스');
      syncBadge = '<span style="display:inline-block;background:#1e40af;color:#93c5fd;padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:600;">' + badges.join('/') + '</span>';
    } else {
      syncBadge = '<span style="color:var(--text3);font-size:0.72rem;">미지정</span>';
    }

    // 파트너 정보
    var belongHtml = m.belongId && m.belongId !== '-'
      ? '<div style="display:flex;align-items:center;gap:6px;cursor:pointer;justify-content:center;" class="mb-belong-cell" data-belong-id="'+m.belongId+'">'
        + '<span style="width:22px;height:22px;border-radius:50%;background:var(--input-border);display:inline-flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--text2);">👤</span>'
        + '<div><div style="font-size:0.78rem;color:var(--text1);font-weight:600;">'+m.belongId+'</div><div style="font-size:0.65rem;color:var(--text3);">'+m.belongId+'</div></div>'
        + '</div>'
      : '<span style="color:var(--text3);font-size:0.72rem;">-</span>';

    return '<tr data-id="'+m.id+'">'
      + '<td><input type="checkbox" class="mb-row-check"></td>'
      // 회원정보
      + '<td class="mb-id-cell" style="cursor:pointer;text-align:center;white-space:nowrap;">'
      +   '<div style="font-size:0.8rem;font-weight:700;color:var(--text1);">'+m.id+'</div>'
      +   '<div style="font-size:0.65rem;color:var(--text3);">'+m.nick+'</div>'
      + '</td>'
      // 동기화
      + '<td>'
      +   '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">'
      +     syncBadge
      +     '<button class="mb-kick-btn" data-username="'+m.id+'" style="background:#dc2626;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:0.65rem;cursor:pointer;font-weight:600;white-space:nowrap;">강제종료</button>'
      +   '</div>'
      + '</td>'
      // 그룹
      + (function() {
          var grp = m.gameGroup || '';
          var displayLabel = grp || '그룹없음';
          return '<td style="text-align:center;">'
            + '<button class="mb-group-btn" data-id="'+m.id+'" data-username="'+m.id+'" data-group="'+grp+'" '
            + 'style="position:relative;padding:4px 12px;border-radius:6px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid '+(grp?'#8b5cf6':'var(--input-border)')+';background:'+(grp?'rgba(139,92,246,0.15)':'rgba(55,65,81,0.3)')+';color:'+(grp?'#c4b5fd':'var(--text2)')+';white-space:nowrap;">'
            + displayLabel
            + '</button></td>';
        })()
      // 파트너
      + '<td>' + belongHtml + '</td>'
      // 보유금 + 지급/회수 버튼
      + '<td class="mb-money-cell" data-username="'+m.id+'" data-local="'+(m.money||0)+'" style="text-align:center;">'
      +   '<div style="color:#f59e0b;font-weight:700;font-size:0.85rem;">₩' + (m.money || 0).toLocaleString() + '</div>'
      +   '<button class="mb-give-take-btn" data-idx="'+idx+'" style="margin-top:4px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:0.68rem;cursor:pointer;font-weight:600;white-space:nowrap;">지급/회수</button>'
      + '</td>'
      // 포인트 + 롤링%
      + '<td style="text-align:center;">'
      +   '<div style="color:#10b981;font-weight:600;font-size:0.82rem;">' + ((m.point||0)+(m.rollingPoint||0)).toLocaleString() + 'P</div>'
      +   '<div style="margin-top:3px;font-size:0.65rem;color:var(--text3);">카 '+(m.rollCasino||0)+'% / 슬 '+(m.rollSlot||0)+'%</div>'
      + '</td>'
      // 머니관리 → 카지노/슬롯 ON/OFF
      + '<td style="text-align:center;">'
      +   '<div style="display:flex;flex-direction:column;gap:3px;align-items:center;">'
      +     '<span style="display:inline-block;width:72px;text-align:center;padding:3px 0;border-radius:4px;font-size:0.68rem;font-weight:600;'+((m.casino||'ON')==='ON'?'background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.3);':'background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3);')+'">카지노 '+((m.casino||'ON')==='ON'?'ON':'OFF')+'</span>'
      +     '<span style="display:inline-block;width:72px;text-align:center;padding:3px 0;border-radius:4px;font-size:0.68rem;font-weight:600;'+((m.slot||'ON')==='ON'?'background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.3);':'background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3);')+'">슬롯 '+((m.slot||'ON')==='ON'?'ON':'OFF')+'</span>'
      +   '</div>'
      + '</td>'
      // 지급/회수
      + '<td class="mb-stat-give" style="font-size:0.72rem;line-height:1.7;">'
      +   '<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text3);">지급</span><span style="color:#10b981;font-weight:600;">₩'+(m.totalGive||0).toLocaleString()+'</span></div>'
      +   '<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text3);">회수</span><span style="color:#ef4444;font-weight:600;">₩'+(m.totalTake||0).toLocaleString()+'</span></div>'
      +   '<div style="display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--input-border);margin-top:3px;padding-top:3px;"><span style="color:var(--text2);font-weight:600;">합계</span><span style="color:'+(((m.totalGive||0)-(m.totalTake||0))>=0?'#10b981':'#ef4444')+';font-weight:700;">₩'+((m.totalGive||0)-(m.totalTake||0)).toLocaleString()+'</span></div>'
      + '</td>'
      // 베팅/당첨
      + '<td class="mb-stat-bet" style="font-size:0.72rem;line-height:1.7;">'
      +   '<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text3);">베팅</span><span style="color:#f59e0b;font-weight:600;">₩'+(m.totalBet||0).toLocaleString()+'</span></div>'
      +   '<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text3);">당첨</span><span style="color:#3b82f6;font-weight:600;">₩'+(m.totalWin||0).toLocaleString()+'</span></div>'
      +   '<div style="display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--input-border);margin-top:3px;padding-top:3px;"><span style="color:var(--text2);font-weight:600;">합계</span><span style="color:'+(((m.totalWin||0)-(m.totalBet||0))>=0?'#10b981':'#ef4444')+';font-weight:700;">₩'+((m.totalWin||0)-(m.totalBet||0)).toLocaleString()+'</span></div>'
      + '</td>'
      + '</tr>';
  }).join('');
}

// ── 머니 셀 실시간 잔액 업데이트 (로컬+게임사 합산) ──
function updateMoneyCells() {
  var cells = document.querySelectorAll('.mb-money-cell');
  cells.forEach(function(cell) {
    var username = cell.getAttribute('data-username');
    if (!username) return;
    fetch('/api/admin/users/balance?username=' + encodeURIComponent(username))
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.success) {
          var total = res.balance || 0;
          var div = cell.querySelector('div');
          if (div) div.textContent = '₩' + total.toLocaleString();
          cell.setAttribute('data-local', res.localMoney || 0);
          cell.setAttribute('data-total', total);
        }
      }).catch(function(){});
  });
}

// 회원 데이터를 파트너 트리에 동기화
// partnerTree에서 회원 노드 제거 헬퍼
function _removeFromTree(nodeId) {
  if (typeof partnerTree === 'undefined') return;
  (function walk(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].children) {
        var before = nodes[i].children.length;
        nodes[i].children = nodes[i].children.filter(function(c) { return c.id !== nodeId; });
        if (nodes[i].children.length < before) return true;
        if (walk(nodes[i].children)) return true;
      }
    }
    return false;
  })(partnerTree);
}

// partnerTree 노드 필드 업데이트 헬퍼
function _updateTreeNode(nodeId, fields) {
  if (typeof findNode !== 'function' || typeof partnerTree === 'undefined') return;
  var node = findNode(partnerTree, nodeId);
  if (node) Object.assign(node, fields);
}

var _mbSelectedTreeId = null;

function renderMemberTree() {
  var el = document.getElementById('mb-tree');
  if(!el) return;
  el.innerHTML = buildMemberTreeHtml(partnerTree, 0);
  bindMemberTreeEvents();
}

function bindMemberTreeEvents() {
  // 토글 클릭
  document.querySelectorAll('#mb-tree .pt-toggle').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleNode(partnerTree, this.dataset.id);
      renderMemberTree();
    });
  });
  // 노드 선택
  document.querySelectorAll('#mb-tree .pt-node').forEach(function(el) {
    el.addEventListener('click', function() {
      var clickedId = this.dataset.id;
      // 같은 노드 다시 클릭하면 선택 해제
      _mbSelectedTreeId = (_mbSelectedTreeId === clickedId) ? null : clickedId;
      renderMemberTree();
      _filterAndRenderMembers();
    });
  });
}

function buildMemberTreeHtml(nodes, depth) {
  return nodes.map(function(node) {
    var hasChildren = node.children && node.children.length > 0;
    var color = levelColor[node.level] || '#888';
    var lbl   = levelLabel[node.level] || node.level;
    var isSelected = node.id === _mbSelectedTreeId;

    var toggle = hasChildren
      ? '<span class="pt-toggle" data-id="'+node.id+'">'+( node.expanded?'▾':'▸')+'</span>'
      : '<span class="pt-toggle-empty"></span>';
    var badge = '<span class="pt-badge" style="background:'+color+'">'+lbl.charAt(0)+'</span>';
    var row = '<div class="pt-node'+(isSelected?' selected':'')+'" data-id="'+node.id+'" style="padding-left:'+(depth*16+8)+'px">'
      + toggle + badge
      + '<span class="pt-node-label" style="color:var(--text,#000)">'+node.label+'</span>'
      + '</div>';
    var children = (hasChildren && node.expanded)
      ? '<div class="pt-children">'+buildMemberTreeHtml(node.children, depth+1)+'</div>'
      : '';
    return row + children;
  }).join('');
}

// toggleMemberNode / selectMemberNode는 bindMemberTreeEvents()로 대체됨

// ── 체크된 회원 행 반환 ──
function getCheckedRows() {
  var rows = [];
  document.querySelectorAll('#mb-tbody tr').forEach(function(tr) {
    var cb = tr.querySelector('.mb-row-check');
    if(cb && cb.checked) rows.push(tr);
  });
  return rows;
}

function getCheckedIds() {
  return getCheckedRows().map(function(tr) {
    return tr.querySelector('td:nth-child(2)').textContent.trim();
  });
}

// ── 회원 액션 모달 ──
function openMemberActionModal(title, bodyHtml, onConfirm) {
  var existing = document.getElementById('mb-action-modal');
  if(existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'mb-action-modal';
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML = `
    <div class="pt-modal" style="width:400px;">
      <div class="pt-modal-header">
        <span>${title}</span>
        <button class="pt-modal-close" id="mb-modal-close">✕</button>
      </div>
      <div class="pt-modal-body">
        <div class="pt-modal-section">${bodyHtml}</div>
        <div class="pt-modal-section" style="border-top:1px solid #e5e7eb;">
          <div class="pt-modal-actions" style="gap:8px;">
            <button class="pt-action-btn pt-btn-gray" id="mb-modal-cancel" style="padding:7px 20px;">취소</button>
            <button class="pt-action-btn pt-btn-purple" id="mb-modal-confirm" style="padding:7px 20px;">확인</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('mb-modal-close').addEventListener('click', function(){ overlay.remove(); });
  document.getElementById('mb-modal-cancel').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
  document.getElementById('mb-modal-confirm').addEventListener('click', function(){
    onConfirm(overlay);
    overlay.remove();
  });
}

// ── 머니 공통 (전역 스코프) ──
function getMoneyCell(tr) { return tr.querySelector('.mb-money-cell'); }

function applyMoney(tr, amount, memo) {
  var cell = getMoneyCell(tr);
  if(!cell) return;
  var before = parseInt(cell.textContent.replace(/,/g,''), 10) || 0;
  var after  = Math.max(0, before + amount);
  cell.textContent = after.toLocaleString();
  var id   = tr.querySelector('td:nth-child(2)') ? tr.querySelector('td:nth-child(2)').textContent.trim() : '';
  var nick = tr.querySelector('td:nth-child(3)') ? tr.querySelector('td:nth-child(3)').textContent.trim() : '';
  var logEntry = {
    datetime:   nowStr(),
    type:       amount >= 0 ? 'give' : 'take',
    targetId:   id,
    targetNick: nick,
    amount:     Math.abs(amount),
    before:     before,
    after:      after,
    memo:       memo || '',
    processor:  '관리자'
  };
  if(typeof addAdminMoneyLog === 'function') {
    addAdminMoneyLog(logEntry);
  }
  if(typeof addUserMoneyLog === 'function') {
    addUserMoneyLog(logEntry);
  }
  fetch('/api/admin/users/money', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: id, amount: amount })
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.success) {
      // partnerTree 머니 반영
      _updateTreeNode(id, { money: res.after || after });
      if(typeof savePartnerTree === 'function') savePartnerTree();
      // API 연동된 유저면 게임사 잔액 조회해서 표시
      fetch('/api/hl/balance?username=' + encodeURIComponent(id))
        .then(function(r2){ return r2.json(); })
        .then(function(d) {
          var hlBal = d.balance || 0;
          var md = cell.querySelector('div');
          if (md) md.textContent = '₩' + (hlBal || res.after || 0).toLocaleString();
        })
        .catch(function() {
          var md = cell.querySelector('div');
          if (md) md.textContent = '₩' + (res.after || after).toLocaleString();
        });
    }
  })
  .catch(function(e) { console.error('머니 API 호출 실패:', e); });
}

function removeMbMoneyModal() {
  var m = document.getElementById('mb-money-modal');
  if(m) m.remove();
}

function openGiveModal(tr) {
  var id   = tr.querySelector('td:nth-child(2)').textContent.trim();
  var nick = tr.querySelector('td:nth-child(3)').textContent.trim();
  var bal  = parseInt((getMoneyCell(tr)||{}).textContent.replace(/,/g,''), 10) || 0;
  removeMbMoneyModal();
  var overlay = document.createElement('div');
  overlay.id = 'mb-money-modal';
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML = `
    <div class="pt-modal" style="width:480px;">
      <div class="pt-modal-header">
        <span>알지급 (회원 충전)</span>
        <button class="pt-modal-close" id="mbm-close">✕</button>
      </div>
      <div class="pt-modal-body">
        <div class="pt-modal-section">
          <div class="pt-modal-field"><label>회원ID</label><input class="pt-modal-input" value="${id}" readonly></div>
          <div class="pt-modal-field" style="margin-top:8px;"><label>닉네임</label><input class="pt-modal-input" value="${nick}" readonly></div>
          <div class="pt-modal-field" style="margin-top:8px;"><label>충전 가능 금액</label><input class="pt-modal-input" id="mbm-bal" value="${bal.toLocaleString()}" readonly></div>
          <div class="pt-modal-field" style="margin-top:8px;"><label>충전 금액</label><input class="pt-modal-input" id="mbm-amount" type="number" min="0" placeholder=""></div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:10px;">
            ${[['1000만원',10000000],['100만원',1000000],['50만원',500000],['10만원',100000],['5만원',50000],['1만원',10000]].map(function(a){
              return '<button class="mb-quick-btn" data-add="'+a[1]+'">'+a[0]+'</button>';
            }).join('')}
            <button class="mb-quick-btn mb-quick-reset">정정</button>
          </div>
        </div>
        <div class="pt-modal-section" style="border-top:1px solid #e5e7eb;">
          <div class="pt-modal-actions">
            <button class="pt-action-btn pt-btn-purple" id="mbm-confirm" style="padding:7px 28px;">충전하기</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#mbm-close').addEventListener('click', removeMbMoneyModal);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) removeMbMoneyModal(); });
  overlay.querySelectorAll('.mb-quick-btn[data-add]').forEach(function(b){
    b.addEventListener('click', function(){
      var inp = document.getElementById('mbm-amount');
      inp.value = (parseInt(inp.value,10)||0) + parseInt(this.dataset.add,10);
    });
  });
  overlay.querySelector('.mb-quick-reset').addEventListener('click', function(){
    document.getElementById('mbm-amount').value = '';
  });
  overlay.querySelector('#mbm-confirm').addEventListener('click', function(){
    var val = parseInt(document.getElementById('mbm-amount').value, 10);
    if(!val || val <= 0){ alert('올바른 금액을 입력하세요.'); return; }
    applyMoney(tr, val, '');
    removeMbMoneyModal();
  });
}

function openTakeModal(tr) {
  var id   = tr.querySelector('td:nth-child(2)').textContent.trim();
  var nick = tr.querySelector('td:nth-child(3)').textContent.trim();
  var bal  = parseInt((getMoneyCell(tr)||{}).textContent.replace(/,/g,''), 10) || 0;
  removeMbMoneyModal();
  var overlay = document.createElement('div');
  overlay.id = 'mb-money-modal';
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML = `
    <div class="pt-modal" style="width:480px;">
      <div class="pt-modal-header">
        <span>알회수 (회원 환전)</span>
        <button class="pt-modal-close" id="mbm-close">✕</button>
      </div>
      <div class="pt-modal-body">
        <div class="pt-modal-section">
          <div class="pt-modal-field"><label>회원ID</label><input class="pt-modal-input" value="${id}" readonly style="text-align:right;"></div>
          <div class="pt-modal-field" style="margin-top:8px;"><label>닉네임</label><input class="pt-modal-input" value="${nick}" readonly style="text-align:right;"></div>
          <div class="pt-modal-field" style="margin-top:8px;"><label>출금 가능 금액</label><input class="pt-modal-input" id="mbm-bal" value="${bal.toLocaleString()}" readonly style="text-align:right;"></div>
          <div class="pt-modal-field" style="margin-top:8px;"><label>환전 금액</label><input class="pt-modal-input" id="mbm-amount" type="number" min="0" placeholder=""></div>
          <div class="pt-modal-field" style="margin-top:8px;"><label>메모</label><input class="pt-modal-input" id="mbm-memo" placeholder=""></div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:10px;">
            ${[['100만원',1000000],['50만원',500000],['10만원',100000],['5만원',50000],['1만원',10000]].map(function(a){
              return '<button class="mb-quick-btn" data-add="'+a[1]+'">'+a[0]+'</button>';
            }).join('')}
            <button class="mb-quick-btn mb-quick-reset">정정</button>
            <button class="mb-quick-btn mb-quick-all">전체</button>
          </div>
        </div>
        <div class="pt-modal-section" style="border-top:1px solid #e5e7eb;">
          <div class="pt-modal-actions">
            <button class="pt-action-btn pt-btn-purple" id="mbm-confirm" style="padding:7px 28px;">환전하기</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#mbm-close').addEventListener('click', removeMbMoneyModal);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) removeMbMoneyModal(); });
  overlay.querySelectorAll('.mb-quick-btn[data-add]').forEach(function(b){
    b.addEventListener('click', function(){
      var inp = document.getElementById('mbm-amount');
      inp.value = (parseInt(inp.value,10)||0) + parseInt(this.dataset.add,10);
    });
  });
  overlay.querySelector('.mb-quick-reset').addEventListener('click', function(){
    document.getElementById('mbm-amount').value = '';
  });
  overlay.querySelector('.mb-quick-all').addEventListener('click', function(){
    document.getElementById('mbm-amount').value = bal;
  });
  overlay.querySelector('#mbm-confirm').addEventListener('click', function(){
    var val  = parseInt(document.getElementById('mbm-amount').value, 10);
    var memo = (document.getElementById('mbm-memo') || {}).value || '';
    if(!val || val <= 0){ alert('올바른 금액을 입력하세요.'); return; }
    applyMoney(tr, -val, memo);
    removeMbMoneyModal();
  });
}

function bindMemberEvents() {
  // 트리 펼치기/접기
  var expandBtn = document.getElementById('mb-expand-all');
  var collapseBtn = document.getElementById('mb-collapse-all');
  if(expandBtn)   expandBtn.addEventListener('click', function(){ setAllExpanded(partnerTree, true);  renderMemberTree(); });
  if(collapseBtn) collapseBtn.addEventListener('click', function(){ setAllExpanded(partnerTree, false); renderMemberTree(); });

  var checkAll = document.getElementById('mb-check-all');
  if(checkAll) checkAll.addEventListener('change', function(){
    document.querySelectorAll('.mb-row-check').forEach(function(c){ c.checked = checkAll.checked; });
  });

  // 검색 기능
  var searchInput = document.getElementById('mb-search-input');
  if (searchInput) {
    var searchTimer = null;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() { _filterAndRenderMembers(); }, 300);
    });
  }

  // 정렬
  var sortSelect = document.getElementById('mb-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() { _filterAndRenderMembers(); });
  }

  // 회원 생성 버튼
  var addBtn = document.getElementById('mb-add-user-btn');
  if (addBtn) addBtn.addEventListener('click', function() { _showCreateMemberModal('single'); });
  // 새로고침 버튼 (스피너 표시)
  var refreshBtn = document.getElementById('mb-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', function() {
    if (!showLoading('memberRefresh')) return;
    setTimeout(function() { renderMemberPage(); hideLoading(); }, 300);
  });

  // 날짜 필터 프리셋 버튼
  document.querySelectorAll('.mb-date-preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var preset = this.getAttribute('data-preset');
      var today = _todayKST();
      var now = new Date();
      var start = today, end = today;

      if (preset === 'today') {
        start = today; end = today;
      } else if (preset === 'yesterday') {
        var yd = new Date(now); yd.setDate(yd.getDate() - 1);
        start = end = _dfLocalDate(yd);
      } else if (preset === 'week') {
        var day = now.getDay() || 7;
        var mon = new Date(now); mon.setDate(mon.getDate() - day + 1);
        start = _dfLocalDate(mon); end = today;
      } else if (preset === 'month') {
        start = today.slice(0, 7) + '-01'; end = today;
      } else if (preset === 'all') {
        start = ''; end = '';
      }

      _memberDateStart = start;
      _memberDateEnd = end;

      // 프리셋 버튼 스타일 갱신
      document.querySelectorAll('.mb-date-preset').forEach(function(b) {
        if (b.getAttribute('data-preset') === preset) {
          b.style.background = '#6366f1'; b.style.color = '#fff'; b.style.border = 'none';
        } else {
          b.style.background = 'var(--bg3)'; b.style.color = 'var(--text2)'; b.style.border = '1px solid var(--input-border)';
        }
      });

      var startInput = document.getElementById('mb-date-start');
      var endInput = document.getElementById('mb-date-end');
      if (startInput) startInput.value = start;
      if (endInput) endInput.value = end;

      // 통계만 다시 가져와서 해당 셀만 업데이트
      _refreshStatsOnly();
    });
  });

  // 날짜 직접 선택 후 조회
  var dateApplyBtn = document.getElementById('mb-date-apply');
  if (dateApplyBtn) dateApplyBtn.addEventListener('click', function() {
    _memberDateStart = document.getElementById('mb-date-start').value || '';
    _memberDateEnd = document.getElementById('mb-date-end').value || '';
    // 프리셋 버튼 해제
    document.querySelectorAll('.mb-date-preset').forEach(function(b) {
      b.style.background = 'var(--bg3)'; b.style.color = 'var(--text2)'; b.style.border = '1px solid var(--input-border)';
    });
    _refreshStatsOnly();
  });

  bindMemberRowEvents();

  // ── 일괄 작업 버튼 ──
  function _getCheckedMembers() {
    var ids = [];
    document.querySelectorAll('.mb-row-check:checked').forEach(function(cb) {
      var tr = cb.closest('tr');
      if (tr) ids.push(tr.dataset.id);
    });
    return ids.filter(Boolean);
  }

  // 일괄지급
  document.getElementById('mb-bulk-give').addEventListener('click', function() {
    var ids = _getCheckedMembers();
    if (!ids.length) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'선택된 회원이 없습니다.' }); return; }
    var dim = document.createElement('div');
    dim.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--shadow);z-index:99999;display:flex;align-items:center;justify-content:center;animation:cfd-in 0.2s ease;';
    dim.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px 28px 24px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px var(--shadow);animation:cfm-pop 0.25s ease;">'
      + '<div style="width:56px;height:56px;border-radius:50%;background:rgba(74,222,128,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;"><i class="fas fa-coins" style="font-size:1.4rem;color:#4ade80;"></i></div>'
      + '<div style="font-size:1rem;font-weight:700;color:var(--text1);margin-bottom:8px;">일괄 지급</div>'
      + '<div style="font-size:0.85rem;color:var(--text2);margin-bottom:16px;">선택한 <strong style="color:#60a5fa;">'+ids.length+'명</strong>에게 지급할 금액</div>'
      + '<div style="display:flex;gap:6px;margin-bottom:12px;justify-content:center;">'
      + '<button class="bulk-amt-btn" data-amt="1000000" style="padding:6px 12px;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid rgba(74,222,128,0.3);background:rgba(74,222,128,0.1);color:#4ade80;transition:all 0.15s;">100만</button>'
      + '<button class="bulk-amt-btn" data-amt="500000" style="padding:6px 12px;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid rgba(74,222,128,0.3);background:rgba(74,222,128,0.1);color:#4ade80;transition:all 0.15s;">50만</button>'
      + '<button class="bulk-amt-btn" data-amt="100000" style="padding:6px 12px;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid rgba(74,222,128,0.3);background:rgba(74,222,128,0.1);color:#4ade80;transition:all 0.15s;">10만</button>'
      + '<button class="bulk-amt-btn" data-amt="50000" style="padding:6px 12px;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid rgba(74,222,128,0.3);background:rgba(74,222,128,0.1);color:#4ade80;transition:all 0.15s;">5만</button>'
      + '<button class="bulk-amt-btn" data-amt="10000" style="padding:6px 12px;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid rgba(74,222,128,0.3);background:rgba(74,222,128,0.1);color:#4ade80;transition:all 0.15s;">1만</button>'
      + '</div>'
      + '<input type="number" id="bulk-give-amount" placeholder="금액 입력" style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text1);font-size:0.9rem;margin-bottom:16px;text-align:center;">'
      + '<div style="display:flex;gap:10px;">'
      + '<button id="bulk-give-cancel" style="flex:1;padding:10px 0;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);">취소</button>'
      + '<button id="bulk-give-ok" style="flex:1;padding:10px 0;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;border:none;background:#4ade80;color:#fff;">지급</button>'
      + '</div></div>';
    document.body.appendChild(dim);
    dim.addEventListener('click', function(e){ if(e.target===dim) dim.remove(); });
    dim.querySelectorAll('.bulk-amt-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var inp = dim.querySelector('#bulk-give-amount');
        inp.value = parseInt(inp.value || 0) + parseInt(this.dataset.amt);
      });
    });
    dim.querySelector('#bulk-give-cancel').addEventListener('click', function(){ dim.remove(); });
    dim.querySelector('#bulk-give-ok').addEventListener('click', function() {
      var amount = parseInt(dim.querySelector('#bulk-give-amount').value);
      if (!amount || amount <= 0) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'올바른 금액을 입력하세요.' }); return; }
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
      this.style.opacity = '0.7'; this.style.pointerEvents = 'none';
      Promise.all(ids.map(function(username) {
        return fetch('/api/admin/users/' + username + '/give', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({amount:amount}) }).then(function(r){return r.json();}).then(function(res) {
          if (res.success) _updateTreeNode(username, { money: res.after || 0 });
        });
      })).then(function() { if(typeof savePartnerTree === 'function') savePartnerTree(); dim.remove(); renderMemberPage(); });
    });
  });

  // 일괄회수
  document.getElementById('mb-bulk-take').addEventListener('click', function() {
    var ids = _getCheckedMembers();
    if (!ids.length) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'선택된 회원이 없습니다.' }); return; }
    var dim = document.createElement('div');
    dim.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--shadow);z-index:99999;display:flex;align-items:center;justify-content:center;animation:cfd-in 0.2s ease;';
    dim.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px 28px 24px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px var(--shadow);animation:cfm-pop 0.25s ease;">'
      + '<div style="width:56px;height:56px;border-radius:50%;background:rgba(248,113,113,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;"><i class="fas fa-hand-holding-usd" style="font-size:1.4rem;color:#f87171;"></i></div>'
      + '<div style="font-size:1rem;font-weight:700;color:var(--text1);margin-bottom:8px;">일괄 회수</div>'
      + '<div style="font-size:0.85rem;color:var(--text2);margin-bottom:16px;">선택한 <strong style="color:#60a5fa;">'+ids.length+'명</strong>에게서 회수할 금액</div>'
      + '<div style="display:flex;gap:6px;margin-bottom:12px;justify-content:center;">'
      + '<button id="bulk-take-all" style="padding:8px 24px;border-radius:6px;font-size:0.8rem;font-weight:700;cursor:pointer;border:1px solid rgba(248,113,113,0.3);background:rgba(248,113,113,0.1);color:#f87171;transition:all 0.15s;width:100%;">전체 회수</button>'
      + '</div>'
      + '<input type="number" id="bulk-take-amount" placeholder="금액 입력 (전체 회수 시 비워두세요)" style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text1);font-size:0.9rem;margin-bottom:16px;text-align:center;">'
      + '<div style="display:flex;gap:10px;">'
      + '<button id="bulk-take-cancel" style="flex:1;padding:10px 0;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);">취소</button>'
      + '<button id="bulk-take-ok" style="flex:1;padding:10px 0;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;border:none;background:#f87171;color:#fff;">회수</button>'
      + '</div></div>';
    document.body.appendChild(dim);
    dim.addEventListener('click', function(e){ if(e.target===dim) dim.remove(); });
    var _takeAll = false;
    dim.querySelector('#bulk-take-all').addEventListener('click', function() {
      _takeAll = !_takeAll;
      var inp = dim.querySelector('#bulk-take-amount');
      if (_takeAll) {
        this.style.background = '#f87171'; this.style.color = '#fff';
        inp.value = ''; inp.disabled = true; inp.placeholder = '전체 회수 선택됨';
      } else {
        this.style.background = 'rgba(248,113,113,0.1)'; this.style.color = '#f87171';
        inp.disabled = false; inp.placeholder = '금액 입력';
      }
    });
    dim.querySelector('#bulk-take-cancel').addEventListener('click', function(){ dim.remove(); });
    dim.querySelector('#bulk-take-ok').addEventListener('click', function() {
      var amount = _takeAll ? 0 : parseInt(dim.querySelector('#bulk-take-amount').value);
      if (!_takeAll && (!amount || amount <= 0)) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'금액을 입력하거나 전체 회수를 선택하세요.' }); return; }
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
      this.style.opacity = '0.7'; this.style.pointerEvents = 'none';
      Promise.all(ids.map(function(username) {
        var body = _takeAll ? {all:true} : {amount:amount};
        return fetch('/api/admin/users/' + username + '/take', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(function(r){return r.json();}).then(function(res) {
          if (res.success) _updateTreeNode(username, { money: res.after || 0 });
        });
      })).then(function() { if(typeof savePartnerTree === 'function') savePartnerTree(); dim.remove(); renderMemberPage(); });
    });
  });

  // 전체카지노 ON
  document.getElementById('mb-bulk-casino-on').addEventListener('click', function() {
    var ids = _getCheckedMembers();
    if (!ids.length) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'선택된 회원이 없습니다.' }); return; }
    showConfirmModal({
      icon:'fas fa-toggle-on', iconColor:'#4ade80', iconBg:'rgba(74,222,128,0.15)',
      title:'전체 카지노 ON', message:'선택한 <strong style="color:#60a5fa;">'+ids.length+'명</strong>의 카지노를 ON으로 변경하시겠습니까?',
      confirmText:'변경', confirmColor:'#4ade80',
      onConfirm: function(close) {
        Promise.all(ids.map(function(username) {
          return fetch('/api/admin/users/' + username + '/update', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({casino:'ON'}) }).then(function(r){return r.json();}).then(function() {
            _updateTreeNode(username, { casino: 'ON' });
          });
        })).then(function() { if(typeof savePartnerTree === 'function') savePartnerTree(); close(); renderMemberPage(); });
      }
    });
  });

  // 전체카지노 OFF
  document.getElementById('mb-bulk-casino-off').addEventListener('click', function() {
    var ids = _getCheckedMembers();
    if (!ids.length) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'선택된 회원이 없습니다.' }); return; }
    showConfirmModal({
      icon:'fas fa-toggle-off', iconColor:'#38bdf8', iconBg:'rgba(56,189,248,0.15)',
      title:'전체 카지노 OFF', message:'선택한 <strong style="color:#60a5fa;">'+ids.length+'명</strong>의 카지노를 OFF로 변경하시겠습니까?',
      confirmText:'변경', confirmColor:'#38bdf8',
      onConfirm: function(close) {
        Promise.all(ids.map(function(username) {
          return fetch('/api/admin/users/' + username + '/update', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({casino:'OFF'}) }).then(function(r){return r.json();}).then(function() {
            _updateTreeNode(username, { casino: 'OFF' });
          });
        })).then(function() { if(typeof savePartnerTree === 'function') savePartnerTree(); close(); renderMemberPage(); });
      }
    });
  });

  // 하부전체 비번변경
  document.getElementById('mb-bulk-pw').addEventListener('click', function() {
    var ids = _getCheckedMembers();
    if (!ids.length) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'선택된 회원이 없습니다.' }); return; }
    var dim = document.createElement('div');
    dim.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--shadow);z-index:99999;display:flex;align-items:center;justify-content:center;animation:cfd-in 0.2s ease;';
    dim.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px 28px 24px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px var(--shadow);animation:cfm-pop 0.25s ease;">'
      + '<div style="width:56px;height:56px;border-radius:50%;background:rgba(96,165,250,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;"><i class="fas fa-key" style="font-size:1.4rem;color:#60a5fa;"></i></div>'
      + '<div style="font-size:1rem;font-weight:700;color:var(--text1);margin-bottom:8px;">하부전체 비밀번호 변경</div>'
      + '<div style="font-size:0.85rem;color:var(--text2);margin-bottom:16px;">선택한 <strong style="color:#60a5fa;">'+ids.length+'명</strong>의 비밀번호를 변경합니다</div>'
      + '<input type="text" id="bulk-pw-val" placeholder="새 비밀번호 입력" style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text1);font-size:0.9rem;margin-bottom:16px;text-align:center;">'
      + '<div style="display:flex;gap:10px;">'
      + '<button id="bulk-pw-cancel" style="flex:1;padding:10px 0;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);">취소</button>'
      + '<button id="bulk-pw-ok" style="flex:1;padding:10px 0;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;border:none;background:#60a5fa;color:#fff;">변경</button>'
      + '</div></div>';
    document.body.appendChild(dim);
    dim.addEventListener('click', function(e){ if(e.target===dim) dim.remove(); });
    dim.querySelector('#bulk-pw-cancel').addEventListener('click', function(){ dim.remove(); });
    dim.querySelector('#bulk-pw-ok').addEventListener('click', function() {
      var pw = dim.querySelector('#bulk-pw-val').value.trim();
      if (!pw) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'비밀번호를 입력하세요.' }); return; }
      if (pw.length < 3) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'비밀번호는 3자 이상이어야 합니다.' }); return; }
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
      this.style.opacity = '0.7'; this.style.pointerEvents = 'none';
      Promise.all(ids.map(function(username) {
        return fetch('/api/admin/users/' + username + '/update', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:pw}) }).then(function(r){return r.json();});
      })).then(function() { dim.remove(); showAlertModal({ icon:'fas fa-check-circle', iconColor:'#4ade80', iconBg:'rgba(74,222,128,0.15)', title:'완료', message:ids.length+'명의 비밀번호가 변경되었습니다.' }); });
    });
  });

  // 하부전체 차단
  document.getElementById('mb-bulk-block').addEventListener('click', function() {
    var ids = _getCheckedMembers();
    if (!ids.length) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'선택된 회원이 없습니다.' }); return; }
    showConfirmModal({
      icon:'fas fa-ban', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)',
      title:'하부전체 차단', message:'선택한 <strong style="color:#60a5fa;">'+ids.length+'명</strong>을 전부 차단하시겠습니까?',
      confirmText:'차단', confirmColor:'#f59e0b',
      onConfirm: function(close) {
        Promise.all(ids.map(function(username) {
          return fetch('/api/admin/users/' + username + '/block', { method:'POST' }).then(function(r){return r.json();}).then(function() {
            _updateTreeNode(username, { status: 'blocked' });
          });
        })).then(function() { if(typeof savePartnerTree === 'function') savePartnerTree(); close(); renderMemberPage(); });
      }
    });
  });

  // 하부전체 삭제
  document.getElementById('mb-bulk-delete').addEventListener('click', function() {
    var ids = _getCheckedMembers();
    if (!ids.length) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'선택된 회원이 없습니다.' }); return; }
    showConfirmModal({
      icon:'fas fa-trash-alt', iconColor:'#ef4444', iconBg:'rgba(239,68,68,0.15)',
      title:'하부전체 삭제', message:'선택한 <strong style="color:#60a5fa;">'+ids.length+'명</strong>을 전부 삭제하시겠습니까?<br><span style="font-size:0.78rem;color:#f87171;">이 작업은 되돌릴 수 없습니다.</span>',
      confirmText:'삭제', confirmColor:'#dc2626',
      onConfirm: function(close) {
        Promise.all(ids.map(function(username) {
          return fetch('/api/admin/users/' + username + '/delete', { method:'POST' }).then(function(r){return r.json();}).then(function() {
            _removeFromTree(username);
          });
        })).then(function() { if(typeof savePartnerTree === 'function') savePartnerTree(); close(); renderMemberPage(); });
      }
    });
  });
}

// 날짜 필터 변경 시 통계만 다시 가져와서 tbody 갱신
function _refreshStatsOnly() {
  fetch('/api/admin/users/stats?start=' + encodeURIComponent(_memberDateStart) + '&end=' + encodeURIComponent(_memberDateEnd))
    .then(function(r) { return r.json(); })
    .then(function(statsRes) {
      var betStats = statsRes.data || {};

      // 지급/회수 로컬 머니로그 집계
      var moneyLogs = [];
      try { moneyLogs = moneyLogs.concat(JSON.parse(localStorage.getItem('adminMoneyLog') || '[]')); } catch(e){}
      try { moneyLogs = moneyLogs.concat(JSON.parse(localStorage.getItem('partnerMoneyLog') || '[]')); } catch(e){}
      if (_memberDateStart) {
        moneyLogs = moneyLogs.filter(function(l) {
          var dt = (l.datetime || l.date || l.time || '').slice(0, 10);
          return dt >= _memberDateStart;
        });
      }
      if (_memberDateEnd) {
        moneyLogs = moneyLogs.filter(function(l) {
          var dt = (l.datetime || l.date || l.time || '').slice(0, 10);
          return dt <= _memberDateEnd;
        });
      }
      var giveTakeMap = {};
      moneyLogs.forEach(function(log) {
        var tid = log.targetId;
        if (!tid) return;
        if (!giveTakeMap[tid]) giveTakeMap[tid] = { give: 0, take: 0 };
        var amt = Math.abs(log.amount || 0);
        if (log.type === 'give') giveTakeMap[tid].give += amt;
        else if (log.type === 'take') giveTakeMap[tid].take += amt;
      });

      // memberData 통계만 업데이트
      memberData.forEach(function(m) {
        var gt = giveTakeMap[m.id] || { give: 0, take: 0 };
        var bs = betStats[m.id] || { bet: 0, win: 0 };
        m.totalGive = gt.give;
        m.totalTake = gt.take;
        m.totalBet = bs.bet;
        m.totalWin = bs.win;
      });

      // tbody만 다시 그리기
      var tbody = document.getElementById('mb-tbody');
      if (tbody) {
        tbody.innerHTML = buildMemberRows(memberData);
        bindMemberRowEvents();
      }
    })
    .catch(function(e) { console.error('stats refresh error:', e); });
}

function _filterAndRenderMembers() {
  var q = (document.getElementById('mb-search-input') || {}).value || '';
  q = q.trim().toLowerCase();

  var sortVal = (document.getElementById('mb-sort-select') || {}).value || 'name';

  var filtered = memberData.slice();

  // 트리에서 파트너 선택 시 해당 파트너 + 하부 회원 필터
  if (_mbSelectedTreeId) {
    var selNode = (typeof findNode === 'function') ? findNode(partnerTree, _mbSelectedTreeId) : null;
    if (selNode) {
      // 하부 회원 ID 수집
      var subMemberIds = {};
      (function collectMembers(n) {
        if (n.level === 'member') subMemberIds[n.id] = true;
        (n.children || []).forEach(collectMembers);
      })(selNode);
      // 선택된 파트너 자체도 포함 (파트너인 경우)
      var partnerRow = null;
      if (selNode.level !== 'admin' && selNode.level !== 'member') {
        partnerRow = {
          id: selNode.id,
          odid: selNode.id,
          nick: selNode.label || selNode.id,
          name: selNode.holder || '',
          phone: selNode.phone || '',
          bank: selNode.bank || '',
          account: selNode.account || '',
          holder: selNode.holder || '',
          group: selNode.gameGroup || '-',
          money: selNode.money || 0,
          point: selNode.point || 0,
          rollingPoint: selNode.rollingPoint || 0,
          belong: (levelLabel[selNode.level] || selNode.level).charAt(0),
          belongId: '-',
          casino: selNode['perm카지노'] !== false ? 'ON' : 'OFF',
          slot: selNode['perm슬롯'] !== false ? 'ON' : 'OFF',
          status: selNode.status === 'active' || selNode.status === '정상' ? '정상' : selNode.status,
          memo: selNode.memo || '',
          password: selNode.password || '',
          gameGroup: selNode.gameGroup || '',
          api: [],
          registeredAt: selNode.registeredAt || '',
          lastLoginAt: selNode.lastLoginAt || '',
          lastLoginIp: selNode.lastLoginIp || '',
          totalGive: 0, totalTake: 0, totalBet: 0, totalWin: 0,
          _isPartner: true
        };
      }
      filtered = filtered.filter(function(m) { return subMemberIds[m.id]; });
      if (partnerRow) filtered.unshift(partnerRow);
    }
  }

  // 파트너 필터 (파트너 페이지에서 회원수 클릭 시)
  if (window._memberFilterPartner) {
    var pid = window._memberFilterPartner;
    // 해당 파트너 + 하위 파트너 ID 수집
    var subIds = {};
    subIds[pid] = true;
    if (typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
      var pNode = findNode(partnerTree, pid);
      if (pNode) {
        (function collectIds(n) {
          subIds[n.id] = true;
          (n.children || []).forEach(collectIds);
        })(pNode);
      }
    }
    filtered = filtered.filter(function(m) {
      return subIds[m.belongId];
    });
    // 검색창에 표시
    var searchEl = document.getElementById('mb-search-input');
    if (searchEl && !searchEl.value) searchEl.placeholder = '파트너 [' + pid + '] 하부 회원';
    window._memberFilterPartner = null;
  }

  // 검색 필터
  if (q) {
    filtered = filtered.filter(function(m) {
      return m.id.toLowerCase().indexOf(q) !== -1
        || m.nick.toLowerCase().indexOf(q) !== -1
        || (m.holder && m.holder.toLowerCase().indexOf(q) !== -1)
        || (m.account && m.account.toLowerCase().indexOf(q) !== -1)
        || (m.phone && m.phone.toLowerCase().indexOf(q) !== -1);
    });
  }

  // 정렬
  if (sortVal === 'name') filtered.sort(function(a,b){ return a.id.localeCompare(b.id); });
  else if (sortVal === 'recent') filtered.sort(function(a,b){ return (b.registeredAt||'').localeCompare(a.registeredAt||''); });
  else if (sortVal === 'money') filtered.sort(function(a,b){ return (b.money||0) - (a.money||0); });
  else if (sortVal === 'login') filtered.sort(function(a,b){ return (b.lastLoginAt||'').localeCompare(a.lastLoginAt||''); });

  document.getElementById('mb-tbody').innerHTML = buildMemberRows(filtered);
  bindMemberRowEvents();
}

// 행별 이벤트 바인딩 (검색/정렬 후 다시 바인딩 필요)
function bindMemberRowEvents() {
  // 알지급 (기존 호환)
  document.querySelectorAll('.mb-give-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { openGiveModal(this.closest('tr')); });
  });
  // 알회수 (기존 호환)
  document.querySelectorAll('.mb-take-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { openTakeModal(this.closest('tr')); });
  });
  // 지급/회수 통합 버튼 → openInfoPopup 사용
  document.querySelectorAll('.mb-give-take-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tr = this.closest('tr');
      var id = tr.getAttribute('data-id');
      var m = getMemberById(id);
      if (!m) return;
      // DOM 머니셀에서 실제 표시된 금액 읽기 (HL 연동 시 API 잔액으로 갱신됨)
      var moneyCell = tr.querySelector('.mb-money-cell div');
      var realMoney = m.money || 0;
      if (moneyCell) {
        var parsed = parseInt(moneyCell.textContent.replace(/[₩,\s]/g, ''), 10);
        if (!isNaN(parsed)) realMoney = parsed;
      }
      var node = {
        id: m.id,
        label: m.nick || m.id,
        level: 'member',
        money: realMoney,
        point: m.point || 0,
        children: [],
        username: m.id
      };
      if (typeof openInfoPopup === 'function') {
        openInfoPopup('머니 지급', 'give', 'money', node);
      } else {
        openGiveModal(tr);
      }
    });
  });
  // 상세 (회원정보 클릭)
  document.querySelectorAll('.mb-id-cell').forEach(function(cell) {
    cell.addEventListener('click', function() { _openMemberAsPartnerModal(this.closest('tr')); });
  });
  // 새창으로
  document.querySelectorAll('.mb-newwin-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { _openMemberAsPartnerModal(this.closest('tr')); });
  });
  // 소속 클릭 → 상위 계보 드롭다운 표시
  document.querySelectorAll('.mb-belong-cell').forEach(function(cell) {
    cell.addEventListener('click', function(e) {
      e.stopPropagation();
      var belongId = this.getAttribute('data-belong-id');
      if(!belongId || belongId === '-') return;

      // 기존 드롭다운 제거
      var old = document.getElementById('mb-belong-dropdown');
      if(old) { old.remove(); return; }

      // 상위 계보 추적
      var chain = [];
      var curId = belongId;
      while(curId) {
        var node = (typeof findNode === 'function') ? findNode(partnerTree, curId) : null;
        if(!node) break;
        chain.unshift(node);
        var parent = (typeof findParentNode === 'function') ? findParentNode(partnerTree, curId, null) : null;
        curId = parent ? parent.id : null;
      }

      // 드롭다운 HTML
      var listHtml = chain.map(function(n) {
        var c = levelColor[n.level] || '#888';
        var l = (levelLabel[n.level] || n.level).charAt(0);
        return '<div class="mb-belong-item" data-id="'+n.id+'" style="display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:0.8rem;">'
          + '<span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:4px;background:'+c+';color:#fff;font-size:0.68rem;font-weight:700;">'+l+'</span>'
          + '<span style="color:var(--text);">'+n.id+'</span>'
          + '</div>';
      }).join('');

      var dd = document.createElement('div');
      dd.id = 'mb-belong-dropdown';
      dd.style.cssText = 'position:absolute;z-index:999;background:var(--card);border:1px solid var(--border2);border-radius:8px;box-shadow:0 8px 24px var(--shadow);min-width:160px;overflow:hidden;';
      dd.innerHTML = listHtml;

      // 위치 설정
      var rect = this.getBoundingClientRect();
      dd.style.left = rect.left + 'px';
      dd.style.top = (rect.bottom + 4) + 'px';
      dd.style.position = 'fixed';
      document.body.appendChild(dd);

      // 항목 클릭 → 파트너 목록 이동
      dd.querySelectorAll('.mb-belong-item').forEach(function(item) {
        item.addEventListener('mouseenter', function(){ this.style.background='var(--sidebar)'; });
        item.addEventListener('mouseleave', function(){ this.style.background='transparent'; });
        item.addEventListener('click', function() {
          selectedPartnerId = this.getAttribute('data-id');
          dd.remove();
          navigateToPage('partner-list');
        });
      });

      // 바깥 클릭 시 닫기
      setTimeout(function() {
        document.addEventListener('click', function closeDd() {
          var d = document.getElementById('mb-belong-dropdown');
          if(d) d.remove();
          document.removeEventListener('click', closeDd);
        });
      }, 10);
    });
  });
  // API 연동 해제
  document.querySelectorAll('.mb-api-disconnect-btn').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var odid = btn.getAttribute('data-odid');
      var provider = btn.getAttribute('data-provider');
      var providerName = provider === 'honorlink' ? 'HonorLink' : 'CSAPI';
      if (!(await customConfirm(providerName + ' 연동을 해제하시겠습니까?'))) return;
      fetch('/api/admin/users/' + odid + '/api-disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.success) {
          alert(providerName + ' 연동이 해제되었습니다.');
          fetchMemberData().then(function() {
            var tbody = document.getElementById('mb-tbody');
            if (tbody) { tbody.innerHTML = buildMemberRows(memberData); bindMemberRowEvents(); }
          });
        } else {
          alert('해제 실패: ' + (res.error || ''));
        }
      });
    });
  });
  // 강제종료
  document.querySelectorAll('.mb-kick-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var username = btn.getAttribute('data-username');
      _showKickConfirm(username, btn);
    });
  });

  // 모든 유저 실시간 잔액 업데이트 (로컬 + 게임사 합산)
  updateMoneyCells();

  // 그룹 변경 버튼
  document.querySelectorAll('.mb-group-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var username = this.getAttribute('data-username');
      var currentGroup = this.getAttribute('data-group') || '';
      _openGroupSelectModal(username, currentGroup, function(newGroup) {
        var treeNode = typeof findNode === 'function' ? findNode(partnerTree, username) : null;
        if (treeNode) treeNode.gameGroup = newGroup;
        fetch('/api/admin/users/' + encodeURIComponent(username) + '/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameGroup: newGroup })
        }).then(function() {
          var m = getMemberById(username);
          if (m) m.gameGroup = newGroup;
          if (typeof savePartnerTree === 'function') savePartnerTree();
          // 테이블 다시 그리기
          _filterAndRenderMembers();
        });
      });
    });
  });
}

// ══════════════════════════════════════
//  (기존 회원 상세 모달 제거 — openPartnerModal로 통합)
// ══════════════════════════════════════
function __removed_openMemberDetailModal(tr) {
  var id   = tr.querySelector('td:nth-child(2)').textContent.trim();
  var m    = getMemberById(id) || {};
  var nick  = m.nick  || tr.querySelector('td:nth-child(3)').textContent.trim();
  var moneyVal = m.money !== undefined ? m.money : parseInt((tr.querySelector('.mb-money-cell')||{}).textContent||'0');
  var belong = m.belong || (tr.querySelector('.mb-belong-badge')||{}).textContent || '-';
  // 트리에서 실제 상위 파트너 찾기
  var belongNode = null;
  if(typeof findParentNode === 'function' && typeof partnerTree !== 'undefined') {
    belongNode = findParentNode(partnerTree, id, null);
  }
  if(!belongNode && typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
    belongNode = findNode(partnerTree, belong);
  }
  var pMaxRC = belongNode ? parseFloat(belongNode.rollCasino!=null?belongNode.rollCasino:5) : 5;
  var pMaxRS = belongNode ? parseFloat(belongNode.rollSlot!=null?belongNode.rollSlot:5) : 5;
  var pMaxRM = belongNode ? parseFloat(belongNode.rollMini!=null?belongNode.rollMini:5) : 5;
  var pMaxLS = belongNode ? parseInt(belongNode.losingSlot!=null?belongNode.losingSlot:100) : 100;
  var statusColor = (m.status||'정상')==='정상' ? 'var(--green)' : 'var(--red)';
  var statusText = m.status || '정상';
  var regDate = m.registeredAt ? new Date(m.registeredAt).toLocaleString('ko-KR') : '-';

  // 머니 변동내역
  var moneyLogs = [];
  try {
    var allLogs = JSON.parse(localStorage.getItem('userMoneyLog') || '[]');
    moneyLogs = allLogs.filter(function(l){ return l.targetId === id; });
  } catch(e){}
  var moneyLogRows = '';
  if(moneyLogs.length) {
    moneyLogs.slice(0, 50).forEach(function(log, idx) {
      moneyLogRows += '<tr>'
        + '<td>'+(idx+1)+'</td>'
        + '<td>'+log.datetime+'</td>'
        + '<td>'+(log.type==='give'?'<span style="color:var(--green);">지급</span>':'<span style="color:var(--red);">회수</span>')+'</td>'
        + '<td>'+log.processor+'</td>'
        + '<td style="text-align:right;">'+(log.amount||0).toLocaleString()+'</td>'
        + '<td style="text-align:right;font-size:0.78rem;white-space:nowrap;">'
        +   '<span style="color:var(--blue);">'+(log.before||0).toLocaleString()+'</span>'
        +   '<span style="color:var(--text3);margin:0 4px;">→</span>'
        +   '<span style="color:var(--yellow);">'+(log.after||0).toLocaleString()+'</span>'
        + '</td>'
        + '<td>'+(log.memo||'-')+'</td>'
        + '</tr>';
    });
  } else {
    moneyLogRows = '<tr><td colspan="7" style="color:var(--text3);padding:24px;text-align:center;">변동 내역이 없습니다.</td></tr>';
  }

  var existing = document.getElementById('mb-detail-modal');
  if(existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'mb-detail-modal';
  overlay.className = 'pt-modal-overlay';
  overlay.style.background = 'rgba(0,0,0,0.95)';
  overlay.innerHTML = `
    <div class="mbd-modal">

      <!-- 헤더: 아이콘 + 이름 + 등급뱃지 + 상태뱃지 -->
      <div style="display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.05rem;font-weight:700;color:var(--text1,#000);">${id}</span>
            <span style="background:#6b7280;color:#fff;padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">회원</span>
            <span style="background:${statusColor};color:#000;padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">${statusText}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text2,#666);margin-top:2px;">${nick} · Lv.1</div>
        </div>
        <button class="pt-modal-close" id="mbd-close" style="font-size:1.2rem;">✕</button>
      </div>

      <!-- 탭 -->
      <div class="mbd-tabs">
        <button class="mbd-tab active" data-tab="info">🏠 기본</button>
        <button class="mbd-tab" data-tab="betlist">🎰 베팅</button>
        <button class="mbd-tab" data-tab="moneyhist">💰 머니</button>
        <button class="mbd-tab" data-tab="deposit">📥 입출금</button>
        <button class="mbd-tab" data-tab="memo">✉ 쪽지</button>
      </div>

      <!-- 탭 콘텐츠 -->
      <div class="mbd-body">

        <!-- ===== 기본 탭 ===== -->
        <div class="mbd-pane active" data-pane="info">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">

            <!-- ▼ 좌측 칼럼 -->
            <div>
              <!-- 보유머니 / 포인트 -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-size:0.75rem;color:var(--text2);">보유머니</span>
                    <div style="display:flex;gap:4px;">
                      <button class="mbd-money-plus" style="width:22px;height:22px;border-radius:50%;border:none;background:var(--green);color:#000;font-weight:700;cursor:pointer;font-size:0.85rem;line-height:1;">+</button>
                      <button class="mbd-money-minus" style="width:22px;height:22px;border-radius:50%;border:none;background:var(--red);color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;line-height:1;">−</button>
                    </div>
                  </div>
                  <div style="font-size:1.3rem;font-weight:700;color:var(--blue);">${(moneyVal||0).toLocaleString()}</div>
                </div>
                <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:14px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-size:0.75rem;color:var(--text2);">포인트</span>
                    <div style="display:flex;gap:4px;">
                      <button class="mbd-point-plus" style="width:22px;height:22px;border-radius:50%;border:none;background:var(--green);color:#000;font-weight:700;cursor:pointer;font-size:0.85rem;line-height:1;">+</button>
                      <button class="mbd-point-minus" style="width:22px;height:22px;border-radius:50%;border:none;background:var(--red);color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;line-height:1;">−</button>
                    </div>
                  </div>
                  <div style="font-size:1.3rem;font-weight:700;color:var(--purple);">${((m.point||0)+(m.rollingPoint||0)).toLocaleString()}</div>
                </div>
              </div>

              <!-- 총 입금 / 총 출금 -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">
                <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:12px;">
                  <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 입금</div>
                  <div style="font-size:1.05rem;font-weight:700;color:var(--green);">${(m.totalDeposit||0).toLocaleString()}원</div>
                </div>
                <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:12px;">
                  <div style="font-size:0.72rem;color:var(--text2);margin-bottom:4px;">총 출금</div>
                  <div style="font-size:1.05rem;font-weight:700;color:var(--red);">${(m.totalWithdraw||0).toLocaleString()}원</div>
                </div>
              </div>

              <!-- 롤링율(%) / 루징율 -->
              <div style="margin-bottom:18px;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:10px;">롤링율(%) / 루징율</div>
                <div class="md-view-rolling" style="display:grid;grid-template-columns:repeat(4,1fr);text-align:center;font-size:0.78rem;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
                  <div style="padding:10px 0;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;">카지노</div><div style="font-weight:600;">${m.rollCasino||0}%</div></div>
                  <div style="padding:10px 0;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;">슬롯</div><div style="font-weight:600;">${m.rollSlot||0}%</div></div>
                  <div style="padding:10px 0;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;">미니게임</div><div style="font-weight:600;">${m.rollMini||0}%</div></div>
                  <div style="padding:10px 0;background:rgba(124,58,237,0.13);"><div style="color:var(--purple);margin-bottom:3px;">루징</div><div style="font-weight:600;">${m.losingSlot||0}%</div></div>
                </div>
                <div class="md-edit-rolling" style="display:none;grid-template-columns:repeat(4,1fr);text-align:center;font-size:0.78rem;border:1px solid var(--primary);border-radius:8px;overflow:hidden;">
                  <div style="padding:8px 4px;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;font-size:0.72rem;">카지노 <span style="color:var(--text3);font-size:0.65rem;">(max ${pMaxRC}%)</span></div><select class="md-edit-input" data-key="rollCasino" style="width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text1);padding:4px;border-radius:4px;font-size:0.78rem;text-align:center;">${Array.from({length:Math.round(pMaxRC*10)+1},function(_,i){var v=String(i/10);return '<option value="'+v+'"'+(String(m.rollCasino||0)===v?' selected':'')+'>'+v+'%</option>';}).join('')}</select></div>
                  <div style="padding:8px 4px;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;font-size:0.72rem;">슬롯 <span style="color:var(--text3);font-size:0.65rem;">(max ${pMaxRS}%)</span></div><select class="md-edit-input" data-key="rollSlot" style="width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text1);padding:4px;border-radius:4px;font-size:0.78rem;text-align:center;">${Array.from({length:Math.round(pMaxRS*10)+1},function(_,i){var v=String(i/10);return '<option value="'+v+'"'+(String(m.rollSlot||0)===v?' selected':'')+'>'+v+'%</option>';}).join('')}</select></div>
                  <div style="padding:8px 4px;border-right:1px solid var(--border);"><div style="color:var(--text2);margin-bottom:3px;font-size:0.72rem;">미니게임 <span style="color:var(--text3);font-size:0.65rem;">(max ${pMaxRM}%)</span></div><select class="md-edit-input" data-key="rollMini" style="width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text1);padding:4px;border-radius:4px;font-size:0.78rem;text-align:center;">${Array.from({length:Math.round(pMaxRM*10)+1},function(_,i){var v=String(i/10);return '<option value="'+v+'"'+(String(m.rollMini||0)===v?' selected':'')+'>'+v+'%</option>';}).join('')}</select></div>
                  <div style="padding:8px 4px;background:rgba(124,58,237,0.13);"><div style="color:var(--purple);margin-bottom:3px;font-size:0.72rem;">루징 <span style="color:var(--text3);font-size:0.65rem;">(max ${pMaxLS}%)</span></div><select class="md-edit-input" data-key="losingSlot" style="width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text1);padding:4px;border-radius:4px;font-size:0.78rem;text-align:center;">${Array.from({length:pMaxLS+1},function(_,i){var v=String(i);return '<option value="'+v+'"'+(String(m.losingSlot||0)===v?' selected':'')+'>'+v+'%</option>';}).join('')}</select></div>
                </div>
              </div>

              <!-- 베팅 권한 -->
              <div style="margin-bottom:18px;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:10px;">베팅 권한</div>
                <div class="md-view-perm" style="display:flex;flex-wrap:wrap;gap:8px;font-size:0.78rem;">
                  ${['카지노','슬롯','미니게임'].map(function(g){
                    var on = (g==='카지노'?(m.casino||'ON')==='ON' : g==='슬롯'?(m.slot||'ON')==='ON' : true);
                    return '<span style="color:var(--text1);">'+g+'</span><span style="background:'+(on?'var(--green)':'var(--red)')+';color:#000;padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:600;">'+(on?'허용':'차단')+'</span>';
                  }).join('')}
                </div>
                <div class="md-edit-perm" style="display:none;flex-wrap:wrap;gap:8px;font-size:0.78rem;">
                  ${['카지노','슬롯','미니게임'].map(function(g){
                    var permKey = g==='카지노'?'casino':g==='슬롯'?'slot':'mini';
                    var on = (g==='카지노'?(m.casino||'ON')==='ON' : g==='슬롯'?(m.slot||'ON')==='ON' : (m.mini||'ON')==='ON');
                    return '<span style="color:var(--text1);">'+g+'</span><button class="md-perm-toggle" data-key="'+permKey+'" data-on="'+(on?'true':'false')+'" style="background:'+(on?'var(--green)':'var(--red)')+';color:#000;padding:2px 12px;border-radius:4px;font-size:0.68rem;font-weight:600;border:none;cursor:pointer;">'+(on?'허용':'차단')+'</button>';
                  }).join('')}
                </div>
              </div>

              <!-- 누락(공베팅) 설정 -->
              ${(function(){
                var parentHasEB = belongNode && ((belongNode['emptyBet카지노']||0) > 0 || (belongNode['emptyBet슬롯']||0) > 0 || (belongNode['emptyBet미니게임']||0) > 0);
                var borderStyle = parentHasEB ? 'border:2px dashed var(--border);' : 'border:2px dashed var(--yellow);';
                var html = '<div style="'+borderStyle+'border-radius:10px;padding:14px;">';
                html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
                html += '<span style="color:var(--yellow);font-weight:700;font-size:0.85rem;">⚠ 누락(공베팅) 설정</span>';
                if(parentHasEB) {
                  html += '<span style="background:rgba(239,68,68,0.2);color:#ef4444;padding:2px 8px;border-radius:4px;font-size:0.65rem;">상위('+belongNode.id+')에서 설정됨 — 수정 불가</span>';
                }
                html += '</div>';
                if(parentHasEB) {
                  html += '<div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">상위 파트너에 공베팅이 설정되어 있으면 하위에서 별도 설정할 수 없습니다.</div>';
                  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;font-size:0.75rem;">';
                  ['카지노','슬롯','미니게임'].forEach(function(g){
                    var val = belongNode['emptyBet'+g] || 0;
                    html += '<div><div style="color:var(--text3);margin-bottom:3px;">'+g+'</div><div style="font-weight:600;color:var(--text3);">'+(val?val+'회 (상속)':'미적용')+'</div></div>';
                  });
                  html += '</div>';
                } else {
                  html += '<div style="font-size:0.72rem;color:var(--text2);margin-bottom:10px;">N회 베팅마다 1회 누락됩니다. 0=미적용.</div>';
                  html += '<div class="md-view-emptybet" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;font-size:0.75rem;">';
                  ['카지노','슬롯','미니게임'].forEach(function(g){
                    var key = 'emptyBet' + g;
                    var val = m[key] || 0;
                    html += '<div><div style="color:var(--text2);margin-bottom:3px;">'+g+'</div><div style="font-weight:600;">'+(val?val+'회':'미적용')+'</div></div>';
                  });
                  html += '</div>';
                  html += '<div class="md-edit-emptybet" style="display:none;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;font-size:0.75rem;">';
                  ['카지노','슬롯','미니게임'].forEach(function(g){
                    var key = 'emptyBet' + g;
                    var val = m[key] || 0;
                    html += '<div><div style="color:var(--text2);margin-bottom:3px;">'+g+'</div><input type="number" class="md-edit-input md-emptybet-input" data-key="'+key+'" value="'+val+'" min="0" max="100" style="width:60px;background:var(--bg3);border:1px solid var(--border2);color:var(--text1);padding:4px;border-radius:4px;font-size:0.78rem;text-align:center;"></div>';
                  });
                  html += '</div>';
                }
                html += '</div>';
                return html;
              })()}
            </div>

            <!-- ▼ 우측 칼럼 -->
            <div>
              <!-- 기본 정보 -->
              <div style="margin-bottom:24px;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:12px;">기본 정보</div>
                <div style="display:flex;flex-direction:column;gap:0;">
                  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">가입일</span><span style="color:var(--text1);font-weight:500;">${regDate}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">최근접속</span><span style="color:var(--text1);">${m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('ko-KR') : '-'}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">닉네임</span>
                    <span class="md-view-val" style="color:var(--text1);font-weight:500;">${nick}</span>
                    <input class="md-edit-input" data-key="nick" type="text" value="${nick}" style="display:none;background:var(--bg3);border:1px solid var(--primary);color:var(--text1);padding:4px 8px;border-radius:4px;font-size:0.82rem;width:55%;text-align:right;">
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">연락처</span>
                    <span class="md-view-val" style="color:var(--text1);">${m.phone||'-'}</span>
                    <input class="md-edit-input" data-key="phone" type="text" value="${m.phone||''}" style="display:none;background:var(--bg3);border:1px solid var(--primary);color:var(--text1);padding:4px 8px;border-radius:4px;font-size:0.82rem;width:55%;text-align:right;">
                  </div>
                  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">현재 비밀번호</span><span style="color:#f59e0b;font-weight:500;font-family:monospace;letter-spacing:0.5px;">${m.password||'-'}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">소속</span><span style="color:var(--text1);">${belong}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">색상</span><span style="color:var(--text1);">자동</span>
                  </div>
                </div>
              </div>

              <!-- 출금 계좌 -->
              <div style="margin-bottom:24px;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:12px;">출금 계좌</div>
                <div style="display:flex;flex-direction:column;gap:0;">
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">은행</span>
                    <span class="md-view-val" style="color:var(--text1);">${m.bank||'-'}</span>
                    <select class="md-edit-input" data-key="bank" style="display:none;background:var(--bg3);border:1px solid var(--primary);color:var(--text1);padding:4px 8px;border-radius:4px;font-size:0.82rem;width:55%;text-align:right;cursor:pointer;">${_bankOptions(m.bank||'')}</select>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">계좌번호</span>
                    <span class="md-view-val" style="color:var(--text1);">${m.account||'-'}</span>
                    <input class="md-edit-input" data-key="account" type="text" value="${m.account||''}" style="display:none;background:var(--bg3);border:1px solid var(--primary);color:var(--text1);padding:4px 8px;border-radius:4px;font-size:0.82rem;width:55%;text-align:right;">
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">예금주</span>
                    <span class="md-view-val" style="color:var(--text1);">${m.holder||'-'}</span>
                    <input class="md-edit-input" data-key="holder" type="text" value="${m.holder||''}" style="display:none;background:var(--bg3);border:1px solid var(--primary);color:var(--text1);padding:4px 8px;border-radius:4px;font-size:0.82rem;width:55%;text-align:right;">
                  </div>
                  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                    <span style="color:var(--text2);">환전 비밀번호</span><span style="color:var(--text1);">-</span>
                  </div>
                </div>
              </div>

              <!-- 가상계좌 정보 -->
              <div style="background:var(--bg3);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:16px;margin-bottom:24px;">
                <div style="font-weight:700;font-size:0.85rem;color:var(--yellow);margin-bottom:12px;">가상계좌 정보</div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                  <span style="color:var(--text2);">은행</span><span style="color:var(--text1);">-</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                  <span style="color:var(--text2);">계좌번호</span><span style="color:var(--text1);">-</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.82rem;">
                  <span style="color:var(--text2);">예금주</span><span style="color:var(--text1);">-</span>
                </div>
              </div>

              <!-- 메모 -->
              <div style="margin-bottom:24px;">
                <div style="font-weight:700;font-size:0.88rem;margin-bottom:8px;">메모</div>
                <div class="md-view-val" style="font-size:0.82rem;color:var(--text2);">${m.memo||'메모 없음'}</div>
                <textarea class="md-edit-input" data-key="memo" style="display:none;width:100%;min-height:60px;background:var(--bg3);border:1px solid var(--primary);color:var(--text1);padding:8px;border-radius:4px;font-size:0.82rem;resize:vertical;">${m.memo||''}</textarea>
              </div>

              <!-- 하단 버튼들 -->
              <div style="display:flex;gap:10px;justify-content:flex-end;margin-bottom:20px;">
                <button class="pt-action-btn mbd-edit-btn" id="md-edit-btn" style="padding:7px 18px;font-size:0.8rem;background:var(--sidebar);border:1px solid var(--border);color:var(--text1);">✏ 수정</button>
                <button class="pt-action-btn" id="md-save-btn" style="display:none;padding:7px 18px;font-size:0.8rem;background:var(--primary);border:none;color:#fff;border-radius:6px;cursor:pointer;">💾 저장</button>
                <button class="pt-action-btn" id="md-cancel-btn" style="display:none;padding:7px 18px;font-size:0.8rem;background:var(--sidebar);border:1px solid var(--border);color:var(--text1);border-radius:6px;cursor:pointer;">✕ 취소</button>
                <button class="pt-action-btn mbd-pw-reset" style="padding:7px 18px;font-size:0.8rem;background:var(--sidebar);border:1px solid var(--border);color:var(--text1);">🔒 비밀번호 초기화</button>
                <button class="pt-action-btn mbd-pw-set" style="padding:7px 18px;font-size:0.8rem;background:var(--sidebar);border:1px solid var(--border);color:var(--text1);">🔑 비밀번호 지정</button>
              </div>

              <div style="display:flex;gap:10px;">
                <button class="pt-action-btn mbd-block-btn" style="padding:7px 18px;font-size:0.8rem;background:transparent;border:1px solid var(--red);color:var(--red);border-radius:6px;">⊘ 정지</button>
                <button class="pt-action-btn mbd-delete-btn" style="padding:7px 18px;font-size:0.8rem;background:var(--red);border:none;color:#fff;border-radius:6px;">🗑 삭제</button>
              </div>
            </div>

          </div>
        </div>

        <!-- ===== 베팅 탭 ===== -->
        <div class="mbd-pane" data-pane="betlist">
          <!-- 필터 -->
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;">
            <div style="display:flex;gap:4px;">
              <button class="mbd-bet-cat active" data-cat="casino" style="padding:4px 12px;border-radius:6px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid #f59e0b;background:rgba(245,158,11,0.15);color:#f59e0b;">카지노</button>
              <button class="mbd-bet-cat" data-cat="slot" style="padding:4px 12px;border-radius:6px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);">슬롯</button>
              <button class="mbd-bet-cat" data-cat="mini" style="padding:4px 12px;border-radius:6px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);">미니게임</button>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="mbd-bet-period active" data-period="today" style="padding:4px 10px;border-radius:6px;font-size:0.7rem;cursor:pointer;border:1px solid #3b82f6;background:rgba(59,130,246,0.15);color:#3b82f6;font-weight:600;">오늘</button>
              <button class="mbd-bet-period" data-period="yesterday" style="padding:4px 10px;border-radius:6px;font-size:0.7rem;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);font-weight:600;">어제</button>
              <button class="mbd-bet-period" data-period="7d" style="padding:4px 10px;border-radius:6px;font-size:0.7rem;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);font-weight:600;">7일</button>
              <button class="mbd-bet-period" data-period="30d" style="padding:4px 10px;border-radius:6px;font-size:0.7rem;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);font-weight:600;">30일</button>
            </div>
          </div>
          <!-- 통계 카드 -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;">
            <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;">
              <div style="font-size:0.7rem;color:var(--text2);">총 베팅</div>
              <div id="mbd-bet-total" style="font-size:0.95rem;font-weight:700;color:#ef4444;">0</div>
            </div>
            <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;">
              <div style="font-size:0.7rem;color:var(--text2);">총 당첨</div>
              <div id="mbd-bet-win" style="font-size:0.95rem;font-weight:700;color:#4ade80;">0</div>
            </div>
            <div style="background:var(--sidebar);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;">
              <div style="font-size:0.7rem;color:var(--text2);">손익</div>
              <div id="mbd-bet-profit" style="font-size:0.95rem;font-weight:700;color:var(--text1);">0</div>
            </div>
          </div>
          <!-- 내역 테이블 -->
          <div id="mbd-bet-list" style="color:var(--text3);text-align:center;padding:24px;font-size:0.82rem;">베팅 내역을 로드중...</div>
        </div>

        <!-- ===== 머니 탭 ===== -->
        <div class="mbd-pane" data-pane="moneyhist">
          <table class="db-table" style="font-size:0.78rem;">
            <thead><tr><th>#</th><th>일시</th><th>구분</th><th>처리자</th><th>변동금액</th><th>잔액</th><th>메모</th></tr></thead>
            <tbody>${moneyLogRows}</tbody>
          </table>
        </div>

        <!-- ===== 입출금 탭 ===== -->
        <div class="mbd-pane" data-pane="deposit">
          <div style="margin-bottom:16px;">
            <div style="font-weight:700;font-size:0.85rem;margin-bottom:10px;">충전 내역</div>
            <table class="db-table" style="font-size:0.78rem;">
              <thead><tr><th>일시</th><th>금액</th><th>보너스</th><th>처리전잔액</th><th>처리후잔액</th><th>상태</th></tr></thead>
              <tbody><tr><td colspan="6" style="color:var(--text3);padding:24px;text-align:center;">충전 내역이 없습니다.</td></tr></tbody>
            </table>
          </div>
          <div>
            <div style="font-weight:700;font-size:0.85rem;margin-bottom:10px;">환전 내역</div>
            <table class="db-table" style="font-size:0.78rem;">
              <thead><tr><th>일시</th><th>금액</th><th>처리전잔액</th><th>처리후잔액</th><th>상태</th></tr></thead>
              <tbody><tr><td colspan="5" style="color:var(--text3);padding:24px;text-align:center;">환전 내역이 없습니다.</td></tr></tbody>
            </table>
          </div>
        </div>

        <!-- ===== 쪽지 탭 ===== -->
        <div class="mbd-pane" data-pane="memo">
          <table class="db-table" style="font-size:0.78rem;">
            <thead><tr><th>일시</th><th>구분</th><th>제목</th><th>내용</th><th>읽음</th></tr></thead>
            <tbody><tr><td colspan="5" style="color:var(--text3);padding:24px;text-align:center;">쪽지 내역이 없습니다.</td></tr></tbody>
          </table>
        </div>

      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // 닫기
  overlay.querySelector('#mbd-close').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });

  // ── 베팅 내역 로드 함수 ──
  var _mbdBetLoaded = false;
  function _loadMemberBetting() {
    var listEl = overlay.querySelector('#mbd-bet-list');
    if(!listEl) return;
    listEl.innerHTML = '<div style="color:#888;text-align:center;padding:24px;"><i class="fas fa-circle-notch fa-spin"></i> 로딩중...</div>';

    var activeCat = overlay.querySelector('.mbd-bet-cat.active');
    var cat = activeCat ? activeCat.dataset.cat : 'casino';

    var activePeriod = overlay.querySelector('.mbd-bet-period.active');
    var period = activePeriod ? activePeriod.dataset.period : 'today';
    var kstNow = new Date(new Date().getTime() + 9*60*60*1000);
    var today = kstNow.toISOString().split('T')[0];
    var startDate, endDate;

    if(period === 'today') { startDate = endDate = today; }
    else if(period === 'yesterday') { var y = new Date(kstNow.getTime() - 86400000); startDate = endDate = y.toISOString().split('T')[0]; }
    else if(period === '7d') { var d7 = new Date(kstNow.getTime() - 7*86400000); startDate = d7.toISOString().split('T')[0]; endDate = today; }
    else if(period === '30d') { var d30 = new Date(kstNow.getTime() - 30*86400000); startDate = d30.toISOString().split('T')[0]; endDate = today; }
    else { startDate = endDate = today; }

    var url = '/api/hl/transactions/local?perPage=5000&order=desc&types=bet,win'
      + '&start=' + encodeURIComponent(startDate + ' 00:00:00')
      + '&end=' + encodeURIComponent(endDate + ' 23:59:59')
      + '&usernames=' + encodeURIComponent(id);

    fetch(url).then(function(r){return r.json();}).then(function(res) {
      var allData = (res.data || []).filter(function(t){ return t.details && t.details.game; });
      var catFiltered = allData.filter(function(t) {
        var gt = (t.details.game.type || '').toLowerCase();
        if(cat === 'casino') return gt !== 'slot' && gt !== 'slots' && gt !== 'mini';
        if(cat === 'slot') return gt === 'slot' || gt === 'slots';
        if(cat === 'mini') return gt === 'mini';
        return true;
      });

      var totalBet = 0, totalWin = 0;
      catFiltered.forEach(function(t) {
        var amt = Math.abs(t.amount || 0);
        if(t.type === 'bet') totalBet += amt; else totalWin += amt;
      });
      var profit = totalWin - totalBet;

      var te = overlay.querySelector('#mbd-bet-total');
      var we = overlay.querySelector('#mbd-bet-win');
      var pe = overlay.querySelector('#mbd-bet-profit');
      if(te) te.textContent = totalBet.toLocaleString();
      if(we) we.textContent = totalWin.toLocaleString();
      if(pe) { pe.textContent = (profit >= 0 ? '+' : '') + profit.toLocaleString(); pe.style.color = profit >= 0 ? '#4ade80' : '#ef4444'; }

      // 라운드별 묶기
      var roundMap = {}, roundOrder = [];
      catFiltered.forEach(function(t) {
        var key = (t.details.game.id||'') + '|' + (t.details.game.round||'') + '|' + ((t.user&&t.user.username)||'');
        if(!roundMap[key]) { roundMap[key] = { bets:[], wins:[], game:t.details.game, user:t.user }; roundOrder.push(key); }
        if(t.type === 'bet') roundMap[key].bets.push(t); else roundMap[key].wins.push(t);
      });

      if(roundOrder.length === 0) {
        listEl.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">베팅 내역이 없습니다</div>';
        return;
      }

      var rows = roundOrder.map(function(key) {
        var r = roundMap[key];
        var betAmt = 0, winAmt = 0;
        r.bets.forEach(function(t){ betAmt += Math.abs(t.amount||0); });
        r.wins.forEach(function(t){ winAmt += Math.abs(t.amount||0); });
        var pnl = winAmt - betAmt;
        var firstTx = r.bets[0] || r.wins[0];
        var date = firstTx.processed_at || firstTx.created_at || '-';
        if(date !== '-') date = new Date(date).toLocaleString('ko-KR');
        var gameName = r.game.title || r.game.identifier || '-';
        var vendor = r.game.vendor || '-';
        var resultLabel = r.wins.length > 0 && winAmt > 0
          ? '<span style="color:#4ade80;font-weight:600;">승</span>'
          : r.wins.length > 0
            ? '<span style="color:#ef4444;font-weight:600;">패</span>'
            : '<span style="color:#888;">대기</span>';
        return '<tr>'
          + '<td style="font-size:0.72rem;">' + date + '</td>'
          + '<td>' + vendor + '</td>'
          + '<td>' + gameName + '</td>'
          + '<td style="color:#ef4444;font-weight:600;">' + betAmt.toLocaleString() + '</td>'
          + '<td style="color:#4ade80;font-weight:600;">' + winAmt.toLocaleString() + '</td>'
          + '<td style="color:' + (pnl>=0?'#4ade80':'#ef4444') + ';font-weight:600;">' + (pnl>=0?'+':'') + pnl.toLocaleString() + '</td>'
          + '<td>' + resultLabel + '</td>'
          + '</tr>';
      }).join('');

      listEl.innerHTML = '<table class="db-table" style="font-size:0.78rem;">'
        + '<thead><tr><th>일시</th><th>게임사</th><th>게임명</th><th>베팅금</th><th>당첨금</th><th>손익</th><th>결과</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';
    }).catch(function() {
      listEl.innerHTML = '<div style="color:#f87171;text-align:center;padding:24px;">데이터 로드 실패</div>';
    });
  }

  // 베팅 탭 필터 이벤트
  overlay.querySelectorAll('.mbd-bet-cat').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.mbd-bet-cat').forEach(function(b){ b.classList.remove('active'); b.style.borderColor='var(--border)'; b.style.background='transparent'; b.style.color='var(--text2)'; });
      this.classList.add('active'); this.style.borderColor='#f59e0b'; this.style.background='rgba(245,158,11,0.15)'; this.style.color='#f59e0b';
      _loadMemberBetting();
    });
  });
  overlay.querySelectorAll('.mbd-bet-period').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.mbd-bet-period').forEach(function(b){ b.classList.remove('active'); b.style.borderColor='var(--border)'; b.style.background='transparent'; b.style.color='var(--text2)'; });
      this.classList.add('active'); this.style.borderColor='#3b82f6'; this.style.background='rgba(59,130,246,0.15)'; this.style.color='#3b82f6';
      _loadMemberBetting();
    });
  });

  // 탭 전환
  overlay.querySelectorAll('.mbd-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      overlay.querySelectorAll('.mbd-tab').forEach(function(t){ t.classList.remove('active'); });
      overlay.querySelectorAll('.mbd-pane').forEach(function(p){ p.classList.remove('active'); });
      this.classList.add('active');
      overlay.querySelector('.mbd-pane[data-pane="'+this.dataset.tab+'"]').classList.add('active');
      // 베팅 탭 진입 시 자동 로드
      if(this.dataset.tab === 'betlist' && !_mbdBetLoaded) {
        _mbdBetLoaded = true;
        _loadMemberBetting();
      }
    });
  });

  // 머니/포인트 팝업
  function openMemberMoneyPopup(type, mode) {
    var isPoint = type === 'point';
    var isGive = mode === 'give';
    var label = isPoint ? '포인트' : '머니';
    var title = label + (isGive ? ' 지급' : ' 회수');
    var currentVal = isPoint ? ((m.point||0)+(m.rollingPoint||0)) : moneyVal;

    var pop = document.createElement('div');
    pop.className = 'money-popup-overlay';
    pop.innerHTML = '<div class="money-popup">'
      + '<div class="money-popup-header"><h3>' + (isGive ? '💰 ' : '📤 ') + nick + ' — ' + title + '</h3><button class="money-popup-close">✕</button></div>'
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
        var totalBefore = (m.point||0) + (m.rollingPoint||0);
        if(isGive) { m.point = (m.point||0) + val; }
        else { var tkAmt = Math.min(val, totalBefore); m.point = (m.point||0) - tkAmt; }
        updateMember(id, { point: m.point });
      } else {
        var amount = isGive ? val : -val;
        if(typeof applyMoney === 'function') applyMoney(tr, amount, memo);
      }

      pop.remove();
      alert(nick + (isGive ? ' 에게 ' : ' 에서 ') + val.toLocaleString() + '원 ' + (isGive ? '지급' : '회수') + ' 완료');
      overlay.remove();
      _openMemberAsPartnerModal(tr);
    });
  }

  overlay.querySelector('.mbd-money-plus').addEventListener('click', function(){ openMemberMoneyPopup('money','give'); });
  overlay.querySelector('.mbd-money-minus').addEventListener('click', function(){ openMemberMoneyPopup('money','take'); });
  overlay.querySelector('.mbd-point-plus').addEventListener('click', function(){ openMemberMoneyPopup('point','give'); });
  overlay.querySelector('.mbd-point-minus').addEventListener('click', function(){ openMemberMoneyPopup('point','take'); });

  // 인라인 수정 모드
  var editBtn = overlay.querySelector('#md-edit-btn');
  var saveBtn = overlay.querySelector('#md-save-btn');
  var cancelBtn = overlay.querySelector('#md-cancel-btn');
  var viewVals = overlay.querySelectorAll('.md-view-val');
  var editInputs = overlay.querySelectorAll('.md-edit-input');

  var viewRolling = overlay.querySelector('.md-view-rolling');
  var editRolling = overlay.querySelector('.md-edit-rolling');
  var viewPerm = overlay.querySelector('.md-view-perm');
  var editPerm = overlay.querySelector('.md-edit-perm');
  var viewEmptyBet = overlay.querySelector('.md-view-emptybet');
  var editEmptyBet = overlay.querySelector('.md-edit-emptybet');

  function enterEditMode() {
    viewVals.forEach(function(el){ el.style.display = 'none'; });
    editInputs.forEach(function(el){ el.style.display = ''; });
    if(viewRolling) viewRolling.style.display = 'none';
    if(editRolling) editRolling.style.display = 'grid';
    if(viewPerm) viewPerm.style.display = 'none';
    if(editPerm) editPerm.style.display = 'flex';
    if(viewEmptyBet) viewEmptyBet.style.display = 'none';
    if(editEmptyBet) editEmptyBet.style.display = 'grid';
    editBtn.style.display = 'none';
    saveBtn.style.display = '';
    cancelBtn.style.display = '';
  }
  function exitEditMode() {
    viewVals.forEach(function(el){ el.style.display = ''; });
    editInputs.forEach(function(el){ el.style.display = 'none'; });
    if(viewRolling) viewRolling.style.display = 'grid';
    if(editRolling) editRolling.style.display = 'none';
    if(viewPerm) viewPerm.style.display = 'flex';
    if(editPerm) editPerm.style.display = 'none';
    if(viewEmptyBet) viewEmptyBet.style.display = 'grid';
    if(editEmptyBet) editEmptyBet.style.display = 'none';
    editBtn.style.display = '';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  }

  // 베팅권한 토글 클릭
  overlay.querySelectorAll('.md-perm-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var on = this.dataset.on === 'true';
      var newOn = !on;
      this.dataset.on = String(newOn);
      this.textContent = newOn ? '허용' : '차단';
      this.style.background = newOn ? 'var(--green)' : 'var(--red)';
    });
  });

  editBtn.addEventListener('click', enterEditMode);
  cancelBtn.addEventListener('click', exitEditMode);
  saveBtn.addEventListener('click', function() {
    var updated = {};
    editInputs.forEach(function(inp) {
      var key = inp.dataset.key;
      if(!key) return;
      // 공베팅 필드는 정수로 저장
      if(inp.classList.contains('md-emptybet-input')) {
        updated[key] = parseInt(inp.value) || 0;
      } else {
        updated[key] = inp.value.trim();
      }
    });
    if(updated.nick) updated.nickname = updated.nick;
    overlay.querySelectorAll('.md-perm-toggle').forEach(function(btn) {
      updated[btn.dataset.key] = btn.dataset.on === 'true' ? 'ON' : 'OFF';
    });
    updateMember(id, updated);

    // 테이블 행 갱신
    var rowTr = document.querySelector('#mb-tbody tr[data-id="'+id+'"]');
    if(rowTr) {
      if(updated.nick) {
        var nickCell = rowTr.querySelector('.mb-nick-cell');
        if(nickCell) nickCell.textContent = updated.nick;
      }
      // 목록 전체 리렌더링
      var tbody = document.getElementById('mb-tbody');
      if(tbody) tbody.innerHTML = buildMemberRows(memberData);
      bindMemberEvents();
    }

    alert('저장되었습니다.');
    overlay.remove();
  });

  // 비밀번호 초기화
  overlay.querySelector('.mbd-pw-reset').addEventListener('click', async function() {
    if(!(await customConfirm(nick + ' 비밀번호를 초기화하시겠습니까?\n(기본 비밀번호: 1234로 설정)'))) return;
    updateMember(id, { password: '1234' });
    alert('비밀번호가 1234로 초기화되었습니다.');
  });

  // 비밀번호 지정
  overlay.querySelector('.mbd-pw-set').addEventListener('click', function() {
    var pw = prompt('새 비밀번호를 입력하세요:');
    if(!pw || !pw.trim()) return;
    updateMember(id, { password: pw.trim() });
    alert('비밀번호가 변경되었습니다.');
  });

  // 정지
  overlay.querySelector('.mbd-block-btn').addEventListener('click', async function() {
    var uid = m.id || id;
    var isBlocked = m.status === 'blocked';
    if(!(await customConfirm(nick + ' 을(를) ' + (isBlocked?'정지 해제':'정지') + '하시겠습니까?'))) return;
    if (isBlocked) {
      fetch('/api/admin/users/' + uid + '/unblock', { method: 'POST' }).then(function(){
        _updateTreeNode(uid, { status: '정상' });
        if(typeof savePartnerTree === 'function') savePartnerTree();
        location.reload();
      });
    } else {
      fetch('/api/admin/users/' + uid + '/block', { method: 'POST' }).then(function(){
        _updateTreeNode(uid, { status: 'blocked' });
        if(typeof savePartnerTree === 'function') savePartnerTree();
        location.reload();
      });
    }
  });

  // 삭제
  overlay.querySelector('.mbd-delete-btn').addEventListener('click', async function() {
    if(!(await customConfirm(nick + ' 을(를) 정말 삭제하시겠습니까?'))) return;
    var uid = m.id || id;
    fetch('/api/admin/users/' + uid + '/delete', { method: 'POST' }).then(function() {
      _removeFromTree(uid);
      if(typeof savePartnerTree === 'function') savePartnerTree();
      location.reload();
    });
    overlay.remove();
  });
}

// openMemberEditModal 제거됨 — 인라인 수정으로 대체

// ══════════════════════════════════════
//  접속자 목록 페이지 (실시간 모니터링 대시보드)
// ══════════════════════════════════════
var _onlineTimer = null;
var _onlineFilter = '전체';
var _onlineStartTime = null;

function renderOnlinePage() {
  if (_onlineTimer) { clearInterval(_onlineTimer); _onlineTimer = null; }
  _onlineStartTime = Date.now();
  var el = document.getElementById('content');
  el.innerHTML = '<div class="pt-wrap"><div class="db-section" style="padding:20px;color:var(--text3);text-align:center;">불러오는 중...</div></div>';

  _loadOnlineData(el, true);
  _onlineTimer = setInterval(function() {
    if (!_isOnlinePage()) {
      clearInterval(_onlineTimer); _onlineTimer = null; return;
    }
    _loadOnlineData(el, false);
  }, 15000);
}

function _isOnlinePage() {
  var pt = document.getElementById('page-title');
  return pt && pt.textContent.indexOf('접속자 목록') >= 0;
}

function _getOnlineSessionDuration(loginAt) {
  if (!loginAt) return '-';
  var diff = Date.now() - new Date(loginAt).getTime();
  if (diff < 0) return '0분';
  var h = Math.floor(diff / 3600000);
  var m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return h + '시간 ' + m + '분';
  return m + '분';
}

function _getDeviceIcon(ua) {
  if (!ua) return '<span style="color:var(--text3);">-</span>';
  var lower = (ua || '').toLowerCase();
  if (lower.indexOf('mobile') >= 0 || lower.indexOf('android') >= 0 || lower.indexOf('iphone') >= 0) {
    return '<span style="color:#60a5fa;" title="모바일">&#128241;</span>';
  }
  return '<span style="color:#a78bfa;" title="PC">&#128187;</span>';
}

function _getUserTypeLabel(u) {
  // 파트너트리에서 찾아서 레벨 확인
  if (typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
    var node = findNode(partnerTree, u.username);
    if (node) {
      var levelMap = { head: '본사', subhead: '부본사', distributor: '총판', store: '매장', member: '회원', admin: '관리자' };
      return levelMap[node.level] || '유저';
    }
  }
  return '유저';
}

function _getUserTypeFilter(u) {
  if (typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
    var node = findNode(partnerTree, u.username);
    if (node) {
      if (node.level === 'admin') return '관리자';
      if (node.level === 'member') return '유저';
      return '파트너';
    }
  }
  return '유저';
}

function _getLevelBadgeColor(type) {
  var map = {
    '관리자': { bg: '#7c3aed22', color: '#a78bfa', border: '#7c3aed55' },
    '본사': { bg: '#dc262622', color: '#f87171', border: '#dc262655' },
    '부본사': { bg: '#ea580c22', color: '#fb923c', border: '#ea580c55' },
    '총판': { bg: '#d9770622', color: '#fbbf24', border: '#d9770655' },
    '매장': { bg: '#16a34a22', color: '#4ade80', border: '#16a34a55' },
    '회원': { bg: '#2563eb22', color: '#60a5fa', border: '#2563eb55' },
    '유저': { bg: '#2563eb22', color: '#60a5fa', border: '#2563eb55' }
  };
  return map[type] || map['유저'];
}

function _loadOnlineData(el, isFirst) {
  fetch('/api/auth/online')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      if (!_isOnlinePage()) return Promise.reject('page_changed');
      return res.data || [];
    })
    .then(function(users) {
      if (!_isOnlinePage()) return;

      // 현재 입력값 보존
      var savedInputs = {};
      if (!isFirst) {
        document.querySelectorAll('.ol-money-input').forEach(function(inp) {
          var tr = inp.closest('tr');
          if (tr && tr.dataset.username) savedInputs[tr.dataset.username] = inp.value;
        });
      }

      var now = new Date();
      var ampm = now.getHours() >= 12 ? '오후' : '오전';
      var h12 = now.getHours() % 12 || 12;
      var timeStr = ampm + ' ' + h12 + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');

      // 통계 계산
      var totalOnline = users.length;
      var inGame = users.filter(function(u){ return u.inGame; }).length;
      var totalBet = 0;
      users.forEach(function(u) {
        totalBet += (u.todayBet || 0);
      });
      var avgSession = 0;
      var sessionCount = 0;
      users.forEach(function(u) {
        if (u.lastLoginAt) {
          var diff = Date.now() - new Date(u.lastLoginAt).getTime();
          if (diff > 0) { avgSession += diff; sessionCount++; }
        }
      });
      if (sessionCount > 0) avgSession = Math.floor(avgSession / sessionCount / 60000);

      var filtered = users;

      // 게임 분포 계산 (카지노/슬롯)
      var casinoCount = 0, slotCount = 0;
      users.forEach(function(u) {
        if (u.inGame) {
          if (u.gameType === 'casino') casinoCount++;
          else slotCount++;
        }
      });

      // 디바이스 분포 (접속 UA 기반 - 실제 데이터 없으면 임의)
      var mobileCount = 0, pcCount = 0;
      users.forEach(function(u) {
        var ua = (u.userAgent || '').toLowerCase();
        if (ua.indexOf('mobile') >= 0 || ua.indexOf('android') >= 0 || ua.indexOf('iphone') >= 0) mobileCount++;
        else pcCount++;
      });
      var totalDevices = mobileCount + pcCount;
      var mobilePct = totalDevices > 0 ? Math.round(mobileCount / totalDevices * 100) : 0;
      var pcPct = totalDevices > 0 ? 100 - mobilePct : 0;

      // 행 생성
      var rows = filtered.length
        ? filtered.map(function(u, i) {
            var totalMoney = u.money || 0;
            var typeLabel = _getUserTypeLabel(u);
            var badge = _getLevelBadgeColor(typeLabel);
            var sessionStr = _getOnlineSessionDuration(u.lastLoginAt);
            var todayBet = u.todayBet || 0;
            var todayWin = u.todayWin || 0;
            var profit = todayBet - todayWin;
            var profitColor = profit >= 0 ? '#10b981' : '#ef4444';

            return '<tr data-username="' + u.username + '" data-uid="' + u.id + '">'
              // 회원정보
              + '<td>'
              +   '<div style="display:flex;align-items:center;gap:8px;">'
              +     '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.75rem;">' + (u.username||'?').charAt(0).toUpperCase() + '</div>'
              +     '<div>'
              +       '<div style="font-weight:600;color:var(--text1);font-size:0.85rem;">' + u.username + '</div>'
              +       '<div style="display:flex;align-items:center;gap:4px;margin-top:2px;">'
              +         '<span style="font-size:0.68rem;padding:1px 6px;border-radius:3px;background:' + badge.bg + ';color:' + badge.color + ';border:1px solid ' + badge.border + ';">' + typeLabel + '</span>'
              +         '<span style="color:var(--text3);font-size:0.7rem;">' + (u.nickname || '') + '</span>'
              +       '</div>'
              +     '</div>'
              +   '</div>'
              + '</td>'
              // 보유머니
              + '<td style="text-align:center;">'
              +   '<div style="display:inline-flex;align-items:center;gap:6px;">'
              +     '<span class="ol-money" style="color:#f59e0b;font-weight:700;font-size:0.85rem;">' + totalMoney.toLocaleString() + '원</span>'
              +     '<button class="ol-refresh-btn" title="새로고침" style="background:none;border:1px solid var(--input-border);color:var(--text3);border-radius:4px;cursor:pointer;font-size:0.65rem;padding:2px 5px;">&#x21bb;</button>'
              +   '</div>'
              + '</td>'
              // 머니관리
              + '<td style="text-align:center;">'
              +   '<button class="ol-money-modal-btn" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:0.75rem;cursor:pointer;white-space:nowrap;font-weight:600;">머니관리</button>'
              + '</td>'
              // 동기화
              + '<td style="text-align:center;">'
              +   (u.gameMoney > 0
                    ? '<span style="display:inline-block;background:#1e40af;color:#93c5fd;padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:600;">HL</span>'
                    : '<span style="color:var(--text3);font-size:0.72rem;">미연동</span>')
              + '</td>'
              // 현재게임
              + '<td style="text-align:center;">'
              +   (u.inGame
                    ? '<div style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;">'
                      + '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:#10b98122;color:#10b981;font-size:0.75rem;border:1px solid #10b98144;"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block;"></span>' + (u.currentGame || '게임중') + '</span>'
                      + (u.gameTitle ? '<span style="color:var(--text2);font-size:0.68rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + u.gameTitle + '">' + u.gameTitle + '</span>' : '')
                      + '</div>'
                    : '<span style="color:var(--text3);font-size:0.78rem;">대기중</span>')
              + '</td>'
              // 오늘베팅
              + '<td style="text-align:center;font-size:0.8rem;color:#60a5fa;font-weight:600;">' + todayBet.toLocaleString() + '<span style="color:var(--text3);font-weight:400;">원</span></td>'
              // 오늘당첨
              + '<td style="text-align:center;font-size:0.8rem;color:#a78bfa;font-weight:600;">' + todayWin.toLocaleString() + '<span style="color:var(--text3);font-weight:400;">원</span></td>'
              // 순익
              + '<td style="text-align:center;font-size:0.8rem;color:' + profitColor + ';font-weight:600;">' + (profit >= 0 ? '+' : '') + profit.toLocaleString() + '<span style="color:var(--text3);font-weight:400;">원</span></td>'
              // 접속시간
              + '<td style="text-align:center;font-size:0.78rem;color:var(--text2);">' + sessionStr + '</td>'
              // 관리
              + '<td style="text-align:center;">'
              +   '<div style="display:inline-flex;gap:4px;">'
              +     '<button class="ol-detail-btn" style="background:var(--bg3);color:var(--text2);border:1px solid var(--input-border);border-radius:6px;padding:4px 10px;font-size:0.72rem;cursor:pointer;white-space:nowrap;">상세정보</button>'
              +     '<button class="ol-kick-btn" style="background:var(--bg3);color:#ef4444;border:1px solid var(--input-border);border-radius:6px;padding:4px 10px;font-size:0.72rem;cursor:pointer;white-space:nowrap;">강제종료</button>'
              +   '</div>'
              + '</td>'
              + '</tr>';
          }).join('')
        : '<tr><td colspan="10" style="color:var(--text3);padding:40px;text-align:center;font-size:0.9rem;">접속 중인 회원이 없습니다.</td></tr>';

      // 게임 분포 HTML (카지노/슬롯)
      var gameDistHtml = '<div style="display:flex;justify-content:space-around;text-align:center;height:100%;align-items:flex-end;padding-bottom:2px;">'
        + '<div>'
        +   '<div style="font-size:1.1rem;font-weight:800;color:#f59e0b;">' + casinoCount + '</div>'
        +   '<div style="font-size:0.68rem;color:var(--text3);">카지노</div>'
        + '</div>'
        + '<div style="width:1px;background:var(--bg3);align-self:stretch;"></div>'
        + '<div>'
        +   '<div style="font-size:1.1rem;font-weight:800;color:#8b5cf6;">' + slotCount + '</div>'
        +   '<div style="font-size:0.68rem;color:var(--text3);">슬롯</div>'
        + '</div>'
        + '</div>';

      el.innerHTML =
        '<div style="padding:0;">'
        // 헤더
        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--bg3);">'
        +   '<div style="display:flex;align-items:center;gap:12px;">'
        +     '<span style="font-size:1.2rem;">&#128200;</span>'
        +     '<span style="font-size:1.1rem;font-weight:800;color:var(--text1);">실시간 접속</span>'
        +     '<span class="ol-pulse-dot" style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;"></span>'
        +   '</div>'
        +   '<div style="display:flex;align-items:center;gap:12px;">'
        +     '<div style="color:var(--text3);font-size:0.75rem;line-height:1.4;">'
        +       '<div>실시간 모니터링 ·</div>'
        +       '<div>최근 업데이트: ' + timeStr + '</div>'
        +     '</div>'
        +     '<button class="ol-realtime-btn" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:0.78rem;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:6px;">'
        +       '&#x21bb; 새로고침'
        +     '</button>'
        +   '</div>'
        + '</div>'

        // 통계 카드 4개: 접속중, 게임중, 게임분포, 디바이스분포
        + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 20px;">'
        +   '<div style="background:linear-gradient(135deg,var(--bg),var(--bg3));border:1px solid var(--bg3);border-radius:12px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">'
        +     '<div style="color:var(--text3);font-size:0.75rem;">접속중</div>'
        +     '<div style="font-size:1.6rem;font-weight:800;color:#3b82f6;text-align:right;margin-top:auto;">' + totalOnline + '<span style="font-size:0.8rem;color:var(--text3);margin-left:4px;">명</span></div>'
        +   '</div>'
        +   '<div style="background:linear-gradient(135deg,var(--bg),var(--bg3));border:1px solid var(--bg3);border-radius:12px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">'
        +     '<div style="color:var(--text3);font-size:0.75rem;">게임중</div>'
        +     '<div style="font-size:1.6rem;font-weight:800;color:#10b981;text-align:right;margin-top:auto;">' + inGame + '<span style="font-size:0.8rem;color:var(--text3);margin-left:4px;">명</span></div>'
        +   '</div>'
        +   '<div style="background:linear-gradient(135deg,var(--bg),var(--bg3));border:1px solid var(--bg3);border-radius:12px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">'
        +     '<div style="color:var(--text3);font-size:0.75rem;">게임 분포</div>'
        +     '<div style="margin-top:auto;">' + gameDistHtml + '</div>'
        +   '</div>'
        +   '<div style="background:linear-gradient(135deg,var(--bg),var(--bg3));border:1px solid var(--bg3);border-radius:12px;padding:16px;">'
        +     '<div style="color:var(--text3);font-size:0.75rem;margin-bottom:8px;">디바이스 분포</div>'
        +     '<div style="display:flex;justify-content:space-around;text-align:center;margin-top:4px;">'
        +       '<div>'
        +         '<div style="font-size:1.3rem;">&#128187;</div>'
        +         '<div style="font-size:1.1rem;font-weight:800;color:#a78bfa;">' + pcPct + '%</div>'
        +         '<div style="font-size:0.68rem;color:var(--text3);">데스크톱</div>'
        +       '</div>'
        +       '<div>'
        +         '<div style="font-size:1.3rem;">&#128241;</div>'
        +         '<div style="font-size:1.1rem;font-weight:800;color:#3b82f6;">' + mobilePct + '%</div>'
        +         '<div style="font-size:0.68rem;color:var(--text3);">모바일</div>'
        +       '</div>'
        +     '</div>'
        +   '</div>'
        + '</div>'

        // 메인 콘텐츠: 테이블 (전체 너비)
        + '<div style="padding:0 20px 20px;">'
        +   '<div style="background:var(--bg);border:1px solid var(--bg3);border-radius:12px;overflow:hidden;">'
        +     '<div style="padding:12px 16px;border-bottom:1px solid var(--bg3);display:flex;align-items:center;justify-content:space-between;">'
        +       '<span style="color:var(--text1);font-weight:700;font-size:0.9rem;">활성 세션</span>'
        +       '<span style="color:var(--text3);font-size:0.75rem;">' + filtered.length + '개 세션</span>'
        +     '</div>'
        +     '<div style="overflow-x:auto;">'
        +       '<table style="width:100%;border-collapse:collapse;font-size:0.8rem;" class="ol-session-table">'
        +         '<thead><tr style="background:var(--border);">'
        +           '<th class="ol-th">회원정보</th>'
        +           '<th class="ol-th">보유머니</th>'
        +           '<th class="ol-th">머니관리</th>'
        +           '<th class="ol-th">동기화</th>'
        +           '<th class="ol-th">현재게임</th>'
        +           '<th class="ol-th">오늘베팅</th>'
        +           '<th class="ol-th">오늘당첨</th>'
        +           '<th class="ol-th">순익</th>'
        +           '<th class="ol-th">접속시간</th>'
        +           '<th class="ol-th" style="border-right:none;">관리</th>'
        +         '</tr></thead>'
        +         '<tbody>' + rows + '</tbody>'
        +       '</table>'
        +     '</div>'
        +   '</div>'
        + '</div>'
        + '</div>';

      // 테이블 행 호버 스타일
      var styleEl = document.getElementById('ol-dash-style');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'ol-dash-style';
        styleEl.textContent = ''
          + 'table tbody tr { transition: background 0.15s; }'
          + 'table tbody tr:hover { background: var(--border) !important; }'
          + 'table tbody tr td { padding: 10px 12px; border-bottom: 1px solid var(--border); }'
          + '.ol-th { padding:10px 12px;text-align:center;color:var(--text3);font-weight:600;font-size:0.72rem; }'
          + '.ol-th:first-child { text-align:left;width:100px; }'
          + '@keyframes ol-pulse { 0%,100% { opacity:1; box-shadow:0 0 8px #10b98166; } 50% { opacity:0.4; box-shadow:0 0 2px #10b98133; } }'
          + '.ol-pulse-dot { animation: ol-pulse 2s ease-in-out infinite; }';
        document.head.appendChild(styleEl);
      }

      _bindOnlineEvents();
    })
    .catch(function(e) {
      if (e === 'page_changed') return;
      if (isFirst && _isOnlinePage()) {
        el.innerHTML = '<div class="pt-wrap"><div style="padding:20px;color:#f87171;">데이터를 불러오지 못했습니다.</div></div>';
      }
    });
}

function _bindOnlineEvents() {
  // 실시간 버튼 (수동 새로고침)
  var rtBtn = document.querySelector('.ol-realtime-btn');
  if (rtBtn) {
    rtBtn.addEventListener('click', function() {
      if (!showLoading('onlineRefresh')) return;
      var el = document.getElementById('content');
      _loadOnlineData(el, false);
      setTimeout(hideLoading, 500);
    });
  }



  // 새로고침 버튼 (로컬+게임사 합산 잔액)
  document.querySelectorAll('.ol-refresh-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tr = this.closest('tr');
      var username = tr.dataset.username;
      var moneySpan = tr.querySelector('.ol-money');
      btn.disabled = true;
      btn.textContent = '...';
      fetch('/api/admin/users/balance?username=' + encodeURIComponent(username))
        .then(function(r){ return r.json(); })
        .then(function(data) {
          if (data.success && data.balance !== undefined) {
            moneySpan.textContent = Number(data.balance).toLocaleString() + '원';
          }
          btn.innerHTML = '&#x21bb;';
          btn.disabled = false;
        })
        .catch(function() {
          btn.innerHTML = '&#x21bb;';
          btn.disabled = false;
        });
    });
  });

  // 머니관리 모달 버튼 → 파트너 페이지의 openInfoPopup 재사용
  document.querySelectorAll('.ol-money-modal-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tr = this.closest('tr');
      var username = tr.dataset.username;
      if (typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
        var node = findNode(partnerTree, username);
        if (node && typeof openInfoPopup === 'function') {
          openInfoPopup('머니 지급', 'give', 'money', node);
          return;
        }
      }
      alert(username + ' 파트너 정보를 찾을 수 없습니다.');
    });
  });

  // 강제종료 버튼
  document.querySelectorAll('.ol-kick-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var tr = this.closest('tr');
      var username = tr.dataset.username;
      if (!(await customConfirm(username + ' 유저를 강제종료 하시겠습니까?'))) return;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      fetch('/api/admin/user-kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
      })
      .then(function(r){ return r.json(); })
      .then(function(res) {
        if (res.success) {
          // 킥 후 partnerTree 머니 반영
          fetch('/api/admin/users').then(function(r2){return r2.json();}).then(function(uRes) {
            var u = (uRes.data||[]).find(function(x){return x.username===username;});
            if (u) _updateTreeNode(username, { money: u.money||0 });
            if(typeof savePartnerTree === 'function') savePartnerTree();
          }).catch(function(){});
          customAlert(username + ' 강제종료 완료', { icon: 'fa-check-circle' });
          tr.style.opacity = '0.3';
          setTimeout(function() { tr.remove(); }, 500);
        } else {
          customAlert('강제종료 실패: ' + (res.error || ''), { type: 'error', icon: 'fa-exclamation-circle' });
          btn.style.opacity = '1';
          btn.disabled = false;
        }
      })
      .catch(function() {
        customAlert('강제종료 실패', { type: 'error', icon: 'fa-exclamation-circle' });
        btn.style.opacity = '1';
        btn.disabled = false;
      });
    });
  });

  // 상세정보 버튼 (회원 모달 열기)
  document.querySelectorAll('.ol-detail-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tr = this.closest('tr');
      var username = tr.dataset.username;
      if (typeof findNode === 'function' && typeof partnerTree !== 'undefined') {
        var node = findNode(partnerTree, username);
        if (node && typeof openPartnerModal === 'function') {
          openPartnerModal(node);
          return;
        }
      }
      alert(username + ' 상세정보를 찾을 수 없습니다.');
    });
  });
}

// ══════════════════════════════════════
//  승인 대기 페이지
// ══════════════════════════════════════
function renderPendingPage() {
  var el = document.getElementById('content');
  el.innerHTML = '<div class="pt-wrap"><div class="db-section" style="padding:20px;color:var(--text3);text-align:center;">불러오는 중...</div></div>';

  // 전체 유저 + 대기 유저 동시 fetch
  Promise.all([
    fetch('/api/admin/users').then(function(r){ return r.json(); }),
    fetch('/api/admin/users/pending').then(function(r){ return r.json(); })
  ]).then(function(results) {
    var allUsers = results[0].data || [];
    var pendingList = results[1].data || [];
    var hasPending = pendingList.length > 0;

    // 통계 계산
    var now = new Date();
    var yyyy = now.getFullYear();
    var mm = String(now.getMonth()+1).padStart(2,'0');
    var dd = String(now.getDate()).padStart(2,'0');
    var todayStr = yyyy+'-'+mm+'-'+dd;
    var monthStr = yyyy+'-'+mm;
    var pendingCount = pendingList.length;
    var todayApproved = 0, monthJoined = 0;

    // allUsers에 pending 포함되어 있으므로 한 번만 카운트
    var countedIds = {};
    allUsers.forEach(function(u) {
      var ad = u.approvedAt ? new Date(u.approvedAt) : null;
      var approvedDate = ad ? ad.getFullYear()+'-'+String(ad.getMonth()+1).padStart(2,'0')+'-'+String(ad.getDate()).padStart(2,'0') : '';
      var rd = u.registeredAt ? new Date(u.registeredAt) : null;
      var regMonth = rd ? rd.getFullYear()+'-'+String(rd.getMonth()+1).padStart(2,'0') : '';
      if (u.status === 'active' && approvedDate === todayStr) todayApproved++;
      if (regMonth === monthStr) { monthJoined++; countedIds[u.username] = true; }
    });
    // allUsers에 포함되지 않은 pending 유저만 추가 카운트
    pendingList.forEach(function(u) {
      if (countedIds[u.username]) return;
      var rd2 = u.registeredAt ? new Date(u.registeredAt) : null;
      var regMonth = rd2 ? rd2.getFullYear()+'-'+String(rd2.getMonth()+1).padStart(2,'0') : '';
      if (regMonth === monthStr) monthJoined++;
    });

    // 테이블 rows
    var rows = hasPending
      ? pendingList.map(function(u, i) {
          var dt = u.registeredAt ? new Date(u.registeredAt).toLocaleString('ko-KR') : '-';
          return '<tr data-uid="' + u.id + '">'
            + '<td class="pend-detail-btn" data-idx="'+i+'" style="color:#f59e0b;font-weight:600;cursor:pointer;">' + u.username + '</td>'
            + '<td style="color:#60a5fa;">' + u.nickname + '</td>'
            + '<td style="font-size:0.78rem;color:var(--text2);">' + (u.phone||'-') + '</td>'
            + '<td style="font-size:0.78rem;color:var(--text2);">' + (u.bank||'-') + '</td>'
            + '<td style="font-size:0.78rem;color:var(--text2);">' + (u.account||'-') + '</td>'
            + '<td style="font-size:0.78rem;color:var(--text2);">' + (u.holder||'-') + '</td>'
            + '<td style="font-size:0.78rem;color:var(--text2);">' + dt + '</td>'
            + '<td style="text-align:center;"><div style="display:flex;gap:5px;justify-content:center;">'
            +   '<button class="mb-mini-btn mb-mini-green pend-approve" data-id="'+u.id+'">승인</button>'
            +   '<button class="mb-mini-btn mb-mini-red   pend-reject"  data-id="'+u.id+'">거절</button>'
            + '</div></td>'
            + '</tr>';
        }).join('')
      : '';

    var emptyHtml = !hasPending
      ? '<div style="padding:50px 20px;text-align:center;color:var(--text3);">'
        + '<i class="fas fa-user-friends" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:0.3;"></i>'
        + '가입대기 회원이 없습니다.'
        + '</div>'
      : '';

    el.innerHTML =
      '<div class="pt-wrap">'
      // ── 헤더 ──
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">'
      +   '<div>'
      +     '<div style="font-size:1.05rem;font-weight:700;color:var(--text1);display:flex;align-items:center;gap:8px;">'
      +       '<i class="fas fa-user-clock" style="color:#f59e0b;"></i> 가입대기'
      +     '</div>'
      +     '<div style="font-size:0.78rem;color:var(--text3);margin-top:3px;">승인 대기 중인 회원을 관리합니다.</div>'
      +   '</div>'
      +   '<div style="display:flex;gap:8px;align-items:center;">'
      +     '<button id="pend-bulk-approve" class="mb-mini-btn mb-mini-green" style="padding:6px 14px;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="fas fa-check-circle"></i> 일괄승인</button>'
      +     '<button id="pend-bulk-reject" class="mb-mini-btn mb-mini-red" style="padding:6px 14px;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="fas fa-times-circle"></i> 일괄거절</button>'
      +     '<button id="pend-refresh" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;color:var(--text2);cursor:pointer;font-size:0.85rem;" title="새로고침"><i class="fas fa-sync-alt"></i></button>'
      +   '</div>'
      + '</div>'
      // ── 통계 카드 ──
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;">'
      +   _pendStatCard('#f59e0b', 'rgba(245,158,11,0.12)', 'fas fa-clock', pendingCount, '대기 중')
      +   _pendStatCard('#4ade80', 'rgba(74,222,128,0.12)', 'fas fa-user-check', todayApproved, '오늘 승인')
      +   _pendStatCard('#60a5fa', 'rgba(96,165,250,0.12)', 'fas fa-calendar-alt', monthJoined, '이번달 가입')
      + '</div>'
      // ── 검색 + 날짜 필터 ──
      + '<div class="date-filter-bar" style="margin-bottom:14px;">'
      +   '<div class="df-search-box" style="flex:0 0 240px;">'
      +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
      +     '<input type="text" id="pend-search" placeholder="아이디, 닉네임 검색...">'
      +   '</div>'
      +   '<button class="df-preset pend-date-btn" data-range="all" style="background:#6366f1;color:#fff;border:none;">전체</button>'
      +   '<button class="df-preset pend-date-btn" data-range="today">오늘</button>'
      +   '<button class="df-preset pend-date-btn" data-range="yesterday">어제</button>'
      +   '<button class="df-preset pend-date-btn" data-range="week">이번주</button>'
      +   '<button class="df-preset pend-date-btn" data-range="month">이번달</button>'
      +   '<div class="df-date-range">'
      +     '<input type="date" id="pend-date-start">'
      +     '<span style="color:var(--text3);font-size:0.72rem;">~</span>'
      +     '<input type="date" id="pend-date-end">'
      +   '</div>'
      + '</div>'
      // ── 테이블 ──
      + '<div class="db-section" style="overflow-x:auto;border-radius:8px;">'
      + (hasPending
        ? '<table class="db-table mb-table">'
          + '<thead>'
          + '<tr><th>아이디</th><th>닉네임</th><th>연락처</th><th>은행</th><th>계좌번호</th><th>예금주</th><th>가입일시</th><th style="text-align:center;">처리</th></tr>'
          + '</thead>'
          + '<tbody id="pend-tbody">' + rows + '</tbody>'
          + '</table>'
        : emptyHtml)
      + '</div>'
      + '</div>';

    // ── 이벤트 바인딩 ──

    // 새로고침
    document.getElementById('pend-refresh').addEventListener('click', function() {
      var icon = this.querySelector('i');
      icon.style.transition = 'transform 0.6s';
      icon.style.transform = 'rotate(360deg)';
      setTimeout(function() { renderPendingPage(); }, 500);
    });

    // 검색 + 날짜 필터 통합
    function _pendFilter() {
      var q = (document.getElementById('pend-search').value || '').trim().toLowerCase();
      var startVal = document.getElementById('pend-date-start').value;
      var endVal = document.getElementById('pend-date-end').value;
      var tbody = document.getElementById('pend-tbody');
      if (!tbody) return;
      tbody.querySelectorAll('tr').forEach(function(tr) {
        var text = tr.textContent.toLowerCase();
        var matchText = !q || text.includes(q);
        var uid = tr.dataset.uid;
        var u = pendingList.find(function(x){ return x.id === uid; });
        var regDate = u ? (u.registeredAt || '').slice(0,10) : '';
        var matchDate = true;
        if (startVal && regDate < startVal) matchDate = false;
        if (endVal && regDate > endVal) matchDate = false;
        tr.style.display = (matchText && matchDate) ? '' : 'none';
      });
    }

    document.getElementById('pend-search').addEventListener('input', _pendFilter);
    document.getElementById('pend-date-start').addEventListener('change', function() {
      document.querySelectorAll('.pend-date-btn').forEach(function(b) {
        b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.style.border='1px solid var(--input-border)';
      });
      _pendFilter();
    });
    document.getElementById('pend-date-end').addEventListener('change', function() {
      document.querySelectorAll('.pend-date-btn').forEach(function(b) {
        b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.style.border='1px solid var(--input-border)';
      });
      _pendFilter();
    });

    // 프리셋 버튼
    bindDatePresets('pend-date-btn', 'pend-date-start', 'pend-date-end', _pendFilter);

    // 개별 승인
    document.querySelectorAll('.pend-approve').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        fetch('/api/admin/users/' + id + '/approve', { method:'POST' })
          .then(function(r){ return r.json(); })
          .then(function() { renderPendingPage(); });
      });
    });
    // 개별 거절
    document.querySelectorAll('.pend-reject').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if(!(await customConfirm('거절하면 해당 가입 신청이 삭제됩니다. 계속하시겠습니까?'))) return;
        var id = this.dataset.id;
        fetch('/api/admin/users/' + id + '/reject', { method:'POST' })
          .then(function(r){ return r.json(); })
          .then(function() { renderPendingPage(); });
      });
    });

    // 일괄승인 (모든 대기 회원)
    document.getElementById('pend-bulk-approve').addEventListener('click', function() {
      var ids = pendingList.map(function(u) { return u.id; });
      if (!ids.length) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'대기 중인 회원이 없습니다.' }); return; }
      showConfirmModal({
        icon:'fas fa-check-circle', iconColor:'#4ade80', iconBg:'rgba(74,222,128,0.15)',
        title:'일괄 승인', message:'대기 중인 <strong style="color:#60a5fa;">' + ids.length + '명</strong>을 일괄 승인하시겠습니까?',
        confirmText:'승인', confirmColor:'#4ade80',
        onConfirm: function(close) {
          Promise.all(ids.map(function(id) {
            return fetch('/api/admin/users/' + id + '/approve', { method:'POST' }).then(function(r){ return r.json(); });
          })).then(function() { close(); renderPendingPage(); });
        }
      });
    });

    // 일괄거절 (모든 대기 회원)
    document.getElementById('pend-bulk-reject').addEventListener('click', function() {
      var ids = pendingList.map(function(u) { return u.id; });
      if (!ids.length) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'대기 중인 회원이 없습니다.' }); return; }
      showConfirmModal({
        icon:'fas fa-times-circle', iconColor:'#f87171', iconBg:'rgba(248,113,113,0.15)',
        title:'일괄 거절', message:'대기 중인 <strong style="color:#60a5fa;">' + ids.length + '명</strong>을 일괄 거절하시겠습니까?<br><span style="font-size:0.78rem;color:#f87171;">거절된 신청은 삭제됩니다.</span>',
        confirmText:'거절', confirmColor:'#dc2626',
        onConfirm: function(close) {
          Promise.all(ids.map(function(id) {
            return fetch('/api/admin/users/' + id + '/reject', { method:'POST' }).then(function(r){ return r.json(); });
          })).then(function() { close(); renderPendingPage(); });
        }
      });
    });

    // 아이디 클릭 → 상세 모달
    var pendingUsers = pendingList;
    document.querySelectorAll('.pend-detail-btn').forEach(function(td) {
      td.addEventListener('click', function() {
        var idx = parseInt(this.dataset.idx);
        var u = pendingUsers[idx];
        if (u) _showPendingDetailModal(u);
      });
    });
  })
  .catch(function() {
    el.innerHTML = '<div class="pt-wrap"><div style="padding:20px;color:#f87171;">데이터를 불러오지 못했습니다.</div></div>';
  });
}

function _pendStatCard(color, bg, icon, value, label) {
  return '<div style="background:linear-gradient(135deg,' + bg + ',' + 'rgba(0,0,0,0.3));border:1px solid ' + color + '33;border-radius:10px;padding:16px 18px;">'
    + '<div style="display:flex;align-items:center;gap:10px;">'
    +   '<i class="' + icon + '" style="font-size:1.1rem;color:' + color + ';opacity:0.8;"></i>'
    +   '<div>'
    +     '<div style="font-size:1.3rem;font-weight:700;color:' + color + ';">' + value + '</div>'
    +     '<div style="font-size:0.73rem;color:var(--text3);margin-top:1px;">' + label + '</div>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

// ── 승인대기 상세정보 모달 ──
function _showPendingDetailModal(u) {
  var existing = document.getElementById('pend-detail-modal');
  if (existing) existing.remove();

  var dt = u.registeredAt ? new Date(u.registeredAt).toLocaleString('ko-KR') : '-';

  var overlay = document.createElement('div');
  overlay.id = 'pend-detail-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--shadow);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  overlay.innerHTML =
    '<div style="background:var(--bg);border:1px solid var(--input-border);border-radius:16px;width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px var(--shadow);animation:kickModalIn 0.2s ease-out;">'
    // 헤더
    + '<div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:20px 24px;display:flex;align-items:center;gap:14px;border-radius:16px 16px 0 0;">'
    +   '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:#fff;">'
    +     u.username.charAt(0).toUpperCase()
    +   '</div>'
    +   '<div>'
    +     '<div style="font-size:1rem;font-weight:700;color:#fff;">' + u.username + '</div>'
    +     '<div style="font-size:0.75rem;color:rgba(255,255,255,0.7);margin-top:2px;">가입 승인 대기중</div>'
    +   '</div>'
    +   '<div style="margin-left:auto;cursor:pointer;" id="pend-detail-close">'
    +     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    +   '</div>'
    + '</div>'
    // 본문
    + '<div style="padding:24px;">'
    // 계정 정보
    +   '<div style="margin-bottom:20px;">'
    +     '<div style="font-size:0.82rem;font-weight:700;color:var(--text1);margin-bottom:12px;display:flex;align-items:center;gap:6px;"><span style="color:#f59e0b;">●</span> 계정 정보</div>'
    +     '<div style="background:var(--bg3);border:1px solid var(--input-border);border-radius:10px;overflow:hidden;">'
    +       _pendRow('아이디', u.username)
    +       _pendRow('닉네임', u.nickname || '-')
    +       _pendRow('비밀번호', u.password || '***')
    +       _pendRow('연락처', u.phone || '-')
    +       _pendRow('가입일시', dt, true)
    +     '</div>'
    +   '</div>'
    // 금융 정보
    +   '<div style="margin-bottom:20px;">'
    +     '<div style="font-size:0.82rem;font-weight:700;color:var(--text1);margin-bottom:12px;display:flex;align-items:center;gap:6px;"><span style="color:#3b82f6;">●</span> 금융 정보</div>'
    +     '<div style="background:var(--bg3);border:1px solid var(--input-border);border-radius:10px;overflow:hidden;">'
    +       _pendRow('은행명', u.bank || '-')
    +       _pendRow('계좌번호', u.account || '-')
    +       _pendRow('예금주', u.holder || '-', true)
    +     '</div>'
    +   '</div>'
    // 추가 정보
    +   '<div style="margin-bottom:24px;">'
    +     '<div style="font-size:0.82rem;font-weight:700;color:var(--text1);margin-bottom:12px;display:flex;align-items:center;gap:6px;"><span style="color:#a78bfa;">●</span> 추가 정보</div>'
    +     '<div style="background:var(--bg3);border:1px solid var(--input-border);border-radius:10px;overflow:hidden;">'
    +       _pendRow('추천코드', u.referralCode || '-')
    +       _pendRow('추천인', u.referredBy || '-', true)
    +     '</div>'
    +   '</div>'
    // 하단 버튼
    +   '<div style="display:flex;gap:10px;">'
    +     '<button id="pend-modal-reject" style="flex:1;background:var(--bg3);border:1px solid #ef4444;color:#ef4444;padding:11px;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600;">거절</button>'
    +     '<button id="pend-modal-approve" style="flex:1;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;padding:11px;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600;">승인</button>'
    +   '</div>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);

  // 닫기
  document.getElementById('pend-detail-close').addEventListener('click', function() { overlay.remove(); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  // 승인
  document.getElementById('pend-modal-approve').addEventListener('click', function() {
    this.disabled = true; this.textContent = '처리중...';
    fetch('/api/admin/users/' + u.id + '/approve', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function() {
        overlay.remove();
        _showToast(u.username + ' 회원이 승인되었습니다.', 'success');
        renderPendingPage();
      });
  });

  // 거절
  document.getElementById('pend-modal-reject').addEventListener('click', async function() {
    if (!(await customConfirm(u.username + ' 가입을 거절하시겠습니까?'))) return;
    this.disabled = true; this.textContent = '처리중...';
    fetch('/api/admin/users/' + u.id + '/reject', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function() {
        overlay.remove();
        _showToast(u.username + ' 가입이 거절되었습니다.', 'error');
        renderPendingPage();
      });
  });
}

function _pendRow(label, value, isLast) {
  return '<div style="display:flex;justify-content:space-between;padding:10px 14px;' + (isLast ? '' : 'border-bottom:1px solid var(--input-border);') + '">'
    + '<span style="font-size:0.78rem;color:var(--text2);">' + label + '</span>'
    + '<span style="font-size:0.78rem;color:var(--text1);font-weight:600;">' + value + '</span>'
    + '</div>';
}

// ══════════════════════════════════════
//  블랙리스트 페이지
// ══════════════════════════════════════
function renderBlacklistPage() {
  var el = document.getElementById('content');
  el.innerHTML = '<div class="pt-wrap"><div class="db-section" style="padding:20px;color:var(--text3);text-align:center;">불러오는 중...</div></div>';

  fetch('/api/admin/users/blacklist')
    .then(function(r){ return r.json(); })
    .then(function(res) {
      var list = res.data || [];
      var hasList = list.length > 0;

      // 통계
      var blockedCount = 0, deletedCount = 0;
      var now = new Date();
      var todayStr = now.toISOString().slice(0,10);
      var monthStr = now.toISOString().slice(0,7);
      var todayAdded = 0, monthAdded = 0;
      list.forEach(function(u) {
        if (u.status === 'blocked') blockedCount++;
        if (u.status === 'deleted') deletedCount++;
        var dt = (u.blockedAt || u.lastLoginAt || '').slice(0,10);
        if (dt === todayStr) todayAdded++;
        var dm = (u.blockedAt || u.lastLoginAt || '').slice(0,7);
        if (dm === monthStr) monthAdded++;
      });

      // 상위 파트너 찾기
      function _findParentLabel(uid) {
        if (typeof findParentNode !== 'function' || typeof partnerTree === 'undefined') return '-';
        var parent = findParentNode(partnerTree, uid, null);
        if (parent && parent.id !== partnerTree.id) return parent.label || parent.id;
        if (parent && parent.id === partnerTree.id) return parent.label || parent.id;
        return '-';
      }

      var rows = hasList
        ? list.map(function(u, i) {
            var color  = u.status === 'blocked' ? '#f59e0b' : '#ef4444';
            var label  = u.status === 'blocked' ? '차단' : '삭제';
            var dt     = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ko-KR') : '-';
            var parentLabel = _findParentLabel(u.username);
            return '<tr data-id="'+u.id+'" data-date="'+(u.blockedAt||u.registeredAt||'')+'">'
              + '<td><input type="checkbox" class="bl-row-check" data-id="'+u.id+'"></td>'
              + '<td style="color:#f59e0b;font-weight:600;">' + u.username + '</td>'
              + '<td style="color:#60a5fa;">' + u.nickname + '</td>'
              + '<td style="color:var(--text2);font-size:0.82rem;">' + parentLabel + '</td>'
              + '<td><span style="background:'+color+'22;color:'+color+';border:1px solid '+color+'44;padding:2px 10px;border-radius:4px;font-size:0.75rem;font-weight:600;">'+label+'</span></td>'
              + '<td style="font-size:0.78rem;color:var(--text2);">' + dt + '</td>'
              + '<td style="text-align:center;"><button class="mb-mini-btn mb-mini-green bl-restore-btn" data-id="'+u.id+'">해제</button></td>'
              + '</tr>';
          }).join('')
        : '';

      var emptyHtml = !hasList
        ? '<div style="padding:50px 20px;text-align:center;color:var(--text3);">'
          + '<i class="fas fa-ban" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:0.3;"></i>'
          + '블랙리스트가 없습니다.'
          + '</div>'
        : '';

      el.innerHTML =
        '<div class="pt-wrap">'
        // ── 헤더 ──
        + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">'
        +   '<div>'
        +     '<div style="font-size:1.05rem;font-weight:700;color:var(--text1);display:flex;align-items:center;gap:8px;">'
        +       '<i class="fas fa-ban" style="color:#ef4444;"></i> 블랙리스트'
        +     '</div>'
        +     '<div style="font-size:0.78rem;color:var(--text3);margin-top:3px;">차단 및 삭제된 회원을 관리합니다.</div>'
        +   '</div>'
        +   '<div style="display:flex;gap:8px;align-items:center;">'
        +     '<button id="bl-bulk-select" class="mb-mini-btn" style="padding:6px 14px;font-size:0.78rem;display:flex;align-items:center;gap:4px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:var(--text2);cursor:pointer;"><i class="fas fa-check-double"></i> 선택 해제</button>'
        +     '<button id="bl-bulk-restore" class="mb-mini-btn mb-mini-green" style="padding:6px 14px;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="fas fa-undo"></i> 일괄해제</button>'
        +     '<button id="bl-refresh" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;color:var(--text2);cursor:pointer;font-size:0.85rem;" title="새로고침"><i class="fas fa-sync-alt"></i></button>'
        +   '</div>'
        + '</div>'
        // ── 통계 카드 ──
        + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;">'
        +   _pendStatCard('#ef4444', 'rgba(239,68,68,0.12)', 'fas fa-ban', list.length, '전체')
        +   _pendStatCard('#f59e0b', 'rgba(245,158,11,0.12)', 'fas fa-lock', blockedCount, '차단')
        +   _pendStatCard('#f87171', 'rgba(248,113,113,0.12)', 'fas fa-trash-alt', deletedCount, '삭제')
        +   _pendStatCard('#60a5fa', 'rgba(96,165,250,0.12)', 'fas fa-calendar-alt', monthAdded, '이번달 추가')
        + '</div>'
        // ── 검색 + 날짜 필터 ──
        + '<div class="date-filter-bar" style="margin-bottom:14px;">'
        +   '<div class="df-search-box" style="flex:0 0 240px;">'
        +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
        +     '<input type="text" id="bl-search" placeholder="아이디, 닉네임 검색...">'
        +   '</div>'
        +   '<button class="df-preset bl-date-btn" data-range="all" style="background:#6366f1;color:#fff;border:none;">전체</button>'
        +   '<button class="df-preset bl-date-btn" data-range="today">오늘</button>'
        +   '<button class="df-preset bl-date-btn" data-range="yesterday">어제</button>'
        +   '<button class="df-preset bl-date-btn" data-range="week">이번주</button>'
        +   '<button class="df-preset bl-date-btn" data-range="month">이번달</button>'
        +   '<div class="df-date-range">'
        +     '<input type="date" id="bl-date-from">'
        +     '<span style="color:var(--text3);font-size:0.72rem;">~</span>'
        +     '<input type="date" id="bl-date-to">'
        +   '</div>'
        + '</div>'
        // ── 테이블 ──
        + '<div class="db-section" style="overflow-x:auto;border-radius:8px;">'
        + (hasList
          ? '<table class="db-table mb-table">'
            + '<thead>'
            + '<tr><th style="width:30px;"><input type="checkbox" id="bl-check-all"></th><th>아이디</th><th>닉네임</th><th>상위</th><th>구분</th><th>처리일시</th><th style="text-align:center;">해제</th></tr>'
            + '</thead>'
            + '<tbody id="bl-tbody">' + rows + '</tbody>'
            + '</table>'
          : emptyHtml)
        + '</div>'
        + '</div>';

      // 새로고침
      document.getElementById('bl-refresh').addEventListener('click', function() {
        var icon = this.querySelector('i');
        icon.style.transition = 'transform 0.6s';
        icon.style.transform = 'rotate(360deg)';
        setTimeout(function() { renderBlacklistPage(); }, 500);
      });

      // 검색
      var searchInp = document.getElementById('bl-search');
      if (searchInp) {
        searchInp.addEventListener('input', function() {
          var q = this.value.trim().toLowerCase();
          var tbody = document.getElementById('bl-tbody');
          if (!tbody) return;
          tbody.querySelectorAll('tr').forEach(function(tr) {
            tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        });
      }

      // 해제
      document.querySelectorAll('.bl-restore-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var id = this.dataset.id;
          if (typeof showConfirmModal === 'function') {
            showConfirmModal({
              icon:'fas fa-unlock', iconColor:'#4ade80', iconBg:'rgba(74,222,128,0.15)',
              title:'블랙리스트 해제', message:'해당 회원을 블랙리스트에서 해제하시겠습니까?',
              confirmText:'해제', confirmColor:'#4ade80',
              onConfirm: function(close) {
                fetch('/api/admin/users/' + id + '/unblock', { method:'POST' })
                  .then(function(r){ return r.json(); })
                  .then(function() { close(); renderBlacklistPage(); });
              }
            });
          } else {
            if (!(await customConfirm('해제하시겠습니까?'))) return;
            fetch('/api/admin/users/' + id + '/unblock', { method:'POST' })
              .then(function(r){ return r.json(); })
              .then(function() { renderBlacklistPage(); });
          }
        });
      });

      // 전체 선택 체크박스
      var checkAll = document.getElementById('bl-check-all');
      if (checkAll) {
        checkAll.addEventListener('change', function() {
          var checked = this.checked;
          document.querySelectorAll('.bl-row-check').forEach(function(cb) {
            var tr = cb.closest('tr');
            if (tr.style.display !== 'none') cb.checked = checked;
          });
        });
      }

      // 선택 해제 버튼
      document.getElementById('bl-bulk-select').addEventListener('click', function() {
        var checked = document.querySelectorAll('.bl-row-check:checked');
        if (checked.length === 0) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'선택된 회원이 없습니다.' }); return; }
        if (typeof showConfirmModal === 'function') {
          showConfirmModal({
            icon:'fas fa-unlock', iconColor:'#4ade80', iconBg:'rgba(74,222,128,0.15)',
            title:'선택 해제', message:'선택한 <strong style="color:#60a5fa;">' + checked.length + '명</strong>의 회원을 블랙리스트에서 해제하시겠습니까?',
            confirmText:'해제', confirmColor:'#4ade80',
            onConfirm: function(close) {
              var ids = []; checked.forEach(function(cb){ ids.push(cb.dataset.id); });
              Promise.all(ids.map(function(id){ return fetch('/api/admin/users/'+id+'/unblock',{method:'POST'}).then(function(r){return r.json();}); }))
                .then(function(){ close(); renderBlacklistPage(); });
            }
          });
        }
      });

      // 일괄해제 버튼
      document.getElementById('bl-bulk-restore').addEventListener('click', function() {
        if (list.length === 0) { showAlertModal({ icon:'fas fa-exclamation-circle', iconColor:'#f59e0b', iconBg:'rgba(245,158,11,0.15)', title:'알림', message:'해제할 회원이 없습니다.' }); return; }
        if (typeof showConfirmModal === 'function') {
          showConfirmModal({
            icon:'fas fa-undo', iconColor:'#4ade80', iconBg:'rgba(74,222,128,0.15)',
            title:'일괄 해제', message:'블랙리스트의 <strong style="color:#60a5fa;">모든 회원(' + list.length + '명)</strong>을 해제하시겠습니까?',
            confirmText:'전체 해제', confirmColor:'#4ade80',
            onConfirm: function(close) {
              Promise.all(list.map(function(u){ return fetch('/api/admin/users/'+u.id+'/unblock',{method:'POST'}).then(function(r){return r.json();}); }))
                .then(function(){ close(); renderBlacklistPage(); });
            }
          });
        }
      });

      // 날짜 필터 + 검색 통합 필터
      function _blFilter() {
        var q = (document.getElementById('bl-search').value || '').trim().toLowerCase();
        var fromVal = document.getElementById('bl-date-from').value;
        var toVal = document.getElementById('bl-date-to').value;
        var tbody = document.getElementById('bl-tbody');
        if (!tbody) return;
        tbody.querySelectorAll('tr').forEach(function(tr) {
          var text = tr.textContent.toLowerCase();
          var textMatch = !q || text.includes(q);
          var dateStr = (tr.dataset.date || '').slice(0,10);
          var dateMatch = true;
          if (fromVal && dateStr) dateMatch = dateStr >= fromVal;
          if (toVal && dateStr && dateMatch) dateMatch = dateStr <= toVal;
          tr.style.display = (textMatch && dateMatch) ? '' : 'none';
        });
      }

      // 날짜 프리셋 버튼
      bindDatePresets('bl-date-btn', 'bl-date-from', 'bl-date-to', _blFilter);

      // 커스텀 날짜 변경
      document.getElementById('bl-date-from').addEventListener('change', function() {
        document.querySelectorAll('.bl-date-btn').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.style.border='1px solid var(--input-border)'; });
        _blFilter();
      });
      document.getElementById('bl-date-to').addEventListener('change', function() {
        document.querySelectorAll('.bl-date-btn').forEach(function(b){ b.style.background='var(--bg3)'; b.style.color='var(--text2)'; b.style.border='1px solid var(--input-border)'; });
        _blFilter();
      });

      // 검색
      document.getElementById('bl-search').addEventListener('input', _blFilter);
    })
    .catch(function() {
      el.innerHTML = '<div class="pt-wrap"><div style="padding:20px;color:#f87171;">데이터를 불러오지 못했습니다.</div></div>';
    });
}

// ══════════════════════════════════════
//  공베팅 목록 (공베팅 설정된 파트너 목록)
// ══════════════════════════════════════
function renderEmptyBetListPage() {
  var el = document.getElementById('content');
  el.innerHTML = '<div class="pt-wrap"><div style="padding:40px;text-align:center;color:var(--text3);">로딩중...</div></div>';

  if (typeof partnerTree === 'undefined') {
    el.innerHTML = '<div class="pt-wrap"><div style="padding:40px;text-align:center;color:var(--text3);">파트너 트리 데이터가 없습니다.</div></div>';
    return;
  }


  // 하부 목록 수집 함수
  function getChildren(node) {
    var result = [];
    if (!node.children) return result;
    node.children.forEach(function(c) {
      result.push({ id: c.id, label: c.label || c.id, level: c.level || '-' });
      var sub = getChildren(c);
      sub.forEach(function(s) { result.push(s); });
    });
    return result;
  }

  var list = [];
  function walk(nodes, parentId) {
    var arr = Array.isArray(nodes) ? nodes : [nodes];
    arr.forEach(function(n) {
      var ec = n['emptyBet카지노'] || 0;
      var es = n['emptyBet슬롯'] || 0;
      var em = n['emptyBet미니게임'] || 0;
      if (ec > 0 || es > 0 || em > 0) {
        var subs = getChildren(n);
        list.push({ id: n.id, label: n.label || n.id, level: n.level || '-', parent: parentId || '-', ec: ec, es: es, em: em, children: subs });
      }
      if (n.children) walk(n.children, n.id);
    });
  }
  walk(partnerTree, '');

  // 유저→파트너 매핑 생성 (어떤 유저가 어떤 공베팅 파트너의 하위인지)
  var userToPartner = {};
  list.forEach(function(p) {
    // 파트너 본인도 포함
    userToPartner[p.id] = p.id;
    if (p.children) {
      p.children.forEach(function(c) {
        userToPartner[c.id] = p.id;
      });
    }
  });

  // 공베팅 로그 + 모드 가져오기
  Promise.all([
    fetch('/api/admin/emptybet/log').then(function(r){ return r.json(); }),
    fetch('/api/admin/emptybet/mode').then(function(r){ return r.json(); })
  ]).then(function(results) {
    var logs = (results[0] && results[0].data) || [];
    var currentMode = (results[1] && results[1].mode) || 'rolling';
    var stats = {};
    logs.forEach(function(l) {
      // 베팅 유저가 속한 파트너 ID로 합산
      var partnerId = userToPartner[l.username] || l.username;
      var key = partnerId + ':' + l.gameType;
      if (!stats[key]) stats[key] = { bet: 0, win: 0, rolling: 0, count: 0 };
      stats[key].rolling += (l.rollingAmount || 0);
      stats[key].count++;
      // 베팅/당첨은 '전체 누락' 모드 로그만 합산 (롤링만 누락에서는 베팅/당첨이 정상 처리됨)
      if (l.mode === 'all') {
        stats[key].bet += (l.betAmount || 0);
        stats[key].win += (l.winAmount || 0);
      }
    });
    _renderEbList(el, list, stats, currentMode);
  }).catch(function() {
    _renderEbList(el, list, {}, 'rolling');
  });
}

function _renderEbList(el, list, stats, currentMode) {
  function badge(val) {
    if (val > 0) return '<span style="background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3);padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:600;">' + val + '회마다</span>';
    return '<span style="color:var(--text3);font-size:0.68rem;">-</span>';
  }
  function getStat(id, type) {
    var s = stats[id + ':' + type];
    return { count: s ? s.count : 0, bet: s ? s.bet : 0, win: s ? s.win : 0, rolling: s ? s.rolling : 0 };
  }
  var sz = 'font-size:0.72rem;';
  function statCell(id, type) {
    var s = getStat(id, type);
    if (currentMode !== 'all') {
      return '<div style="'+sz+'text-align:center;color:var(--text3);padding:8px 0;">-</div>';
    }
    var profit = s.win - s.bet;
    return '<div style="'+sz+'display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:var(--text2);">베팅</span><span style="color:#60a5fa;font-weight:600;">₩' + s.bet.toLocaleString() + '</span></div>'
      + '<div style="'+sz+'display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:var(--text2);">당첨</span><span style="color:#4ade80;font-weight:600;">₩' + s.win.toLocaleString() + '</span></div>'
      + '<div style="'+sz+'display:flex;justify-content:space-between;"><span style="color:var(--text2);">합계</span><span style="color:' + (profit >= 0 ? '#4ade80' : '#f87171') + ';font-weight:600;">₩' + profit.toLocaleString() + '</span></div>';
  }

  var levelLabel = { admin:'관리자', head:'본사', subhead:'부본사', sub:'부본사', distributor:'총판', chong:'총판', store:'매장', mae:'매장', member:'회원' };
  var levelColor = { admin:'#ef4444', head:'#8b5cf6', subhead:'#3b82f6', sub:'#3b82f6', distributor:'#06b6d4', chong:'#06b6d4', store:'#f59e0b', mae:'#f59e0b', member:'#10b981' };

  var rows = list.length === 0
    ? '<tr><td colspan="8" style="color:var(--text3);padding:40px;text-align:center;">공베팅 설정이 적용된 파트너가 없습니다.</td></tr>'
    : list.map(function(p, idx) {
        var cs = getStat(p.id, 'casino');
        var ss = getStat(p.id, 'slot');
        var totalRolling = cs.rolling + ss.rolling;
        var hasSubs = p.children && p.children.length > 0;
        var row = '<tr>'
          + '<td class="eb-id-cell" data-id="' + p.id + '" style="cursor:pointer;"><div style="display:flex;align-items:center;justify-content:center;gap:8px;"><span style="font-size:0.65rem;padding:2px 6px;border-radius:4px;font-weight:600;background:' + (levelColor[p.level]||'#888') + ';color:#fff;">' + (levelLabel[p.level]||p.level) + '</span><div><div style="font-weight:600;color:#60a5fa;">' + p.id + '</div><div style="font-size:0.72rem;color:var(--text2);">' + p.label + '</div></div></div></td>'
          + '<td>' + (p.parent || '-') + '</td>'
          + '<td style="text-align:center;"><div style="margin-bottom:8px;">카 ' + badge(p.ec) + '</div><div>슬 ' + badge(p.es) + '</div></td>'
          + '<td style="min-width:130px;">' + statCell(p.id, 'casino') + '</td>'
          + '<td style="min-width:130px;">' + statCell(p.id, 'slot') + '</td>'
          + '<td><div style="'+sz+'display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:var(--text2);">카지노</span><span style="color:#f59e0b;font-weight:600;">' + cs.rolling.toLocaleString() + 'P</span></div><div style="'+sz+'display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:var(--text2);">슬롯</span><span style="color:#f59e0b;font-weight:600;">' + ss.rolling.toLocaleString() + 'P</span></div><div style="'+sz+'display:flex;justify-content:space-between;"><span style="color:var(--text2);">합계</span><span style="color:#f59e0b;font-weight:700;">' + totalRolling.toLocaleString() + 'P</span></div></td>'
          + '<td style="text-align:center;"><span style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">적용중</span></td>'
          + '<td style="width:40px;text-align:center;padding:0 4px;">' + (hasSubs ? '<button class="eb-toggle" data-idx="' + idx + '" style="cursor:pointer;background:var(--bg3);border:1px solid var(--input-border);border-radius:5px;padding:4px 8px;color:var(--text2);font-size:0.8rem;transition:all 0.2s;"><i class="fas fa-chevron-right" style="transition:transform 0.2s;"></i></button>' : '') + '</td>'
          + '</tr>';
        // 하부 행 (숨김)
        if (hasSubs) {
          p.children.forEach(function(c) {
            var lv = levelLabel[c.level] || c.level;
            var lc = levelColor[c.level] || '#888';
            row += '<tr class="eb-sub eb-sub-' + idx + '" style="display:none;background:var(--border);">'
              + '<td style="padding-left:16px;"><div style="font-size:0.78rem;color:var(--text2);">' + c.id + '</div><div style="font-size:0.68rem;color:var(--text3);">' + c.label + '</div></td>'
              + '<td><span style="font-size:0.68rem;padding:1px 6px;border-radius:3px;background:' + lc + '22;color:' + lc + ';border:1px solid ' + lc + '44;">' + lv + '</span></td>'
              + '<td colspan="6" style="font-size:0.72rem;color:var(--text3);">상속 적용</td>'
              + '</tr>';
          });
        }
        return row;
      }).join('');

  var isAll = currentMode === 'all';
  el.innerHTML = '<div class="pt-wrap"><div class="db-section" style="padding:16px 20px;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
    +   '<div style="display:flex;align-items:center;gap:12px;">'
    +     '<span style="font-size:1rem;font-weight:700;color:var(--text1);">공베팅 적용 파트너</span>'
    +     '<span style="background:var(--bg3);border:1px solid var(--input-border);padding:4px 12px;border-radius:6px;font-size:0.78rem;color:#f59e0b;font-weight:600;">' + list.length + '명</span>'
    +     '<input id="eb-search" type="text" placeholder="아이디, 닉네임 검색" style="margin-left:12px;padding:5px 12px;border-radius:5px;border:1px solid var(--input-border);background:var(--bg3);color:var(--text1);font-size:0.78rem;width:200px;outline:none;">'
    +   '</div>'
    +   '<div style="display:flex;gap:6px;">'
    +     '<button id="eb-mode-rolling" style="padding:6px 14px;border-radius:5px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid ' + (!isAll?'#f59e0b':'var(--input-border)') + ';background:' + (!isAll?'#f59e0b33':'transparent') + ';color:' + (!isAll?'#f59e0b':'var(--text3)') + ';">롤링만 누락</button>'
    +     '<button id="eb-mode-all" style="padding:6px 14px;border-radius:5px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid ' + (isAll?'#ef4444':'var(--input-border)') + ';background:' + (isAll?'#ef444433':'transparent') + ';color:' + (isAll?'#ef4444':'var(--text3)') + ';">전체 누락</button>'
    +   '</div>'
    + '</div>'
    + '<div style="overflow-x:auto;">'
    + '<table class="db-table mb-table" style="font-size:0.82rem;">'
    + '<thead><tr>'
    + '<th>아이디</th>'
    + '<th>상위</th>'
    + '<th style="text-align:center;width:100px;">설정</th>'
    + '<th style="text-align:center;width:20%;">카지노</th>'
    + '<th style="text-align:center;width:20%;">슬롯</th>'
    + '<th style="text-align:center;width:20%;">롤링</th>'
    + '<th style="text-align:center;">상태</th>'
    + '<th style="width:30px;"></th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '</div></div>';

  // 아이디 클릭 → 파트너 상세 모달
  el.querySelectorAll('.eb-id-cell').forEach(function(cell) {
    cell.addEventListener('click', function() {
      var pid = cell.getAttribute('data-id');
      var node = null;
      function find(arr) {
        arr.forEach(function(n) {
          if (n.id === pid) node = n;
          if (n.children) find(n.children);
        });
      }
      find(partnerTree);
      if (node && typeof openPartnerModal === 'function') openPartnerModal(node);
    });
  });

  // 하부 드롭다운 토글
  el.querySelectorAll('.eb-toggle').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var idx = btn.getAttribute('data-idx');
      var ico = btn.querySelector('i');
      var subs = el.querySelectorAll('.eb-sub-' + idx);
      var open = ico.style.transform === 'rotate(90deg)';
      ico.style.transform = open ? '' : 'rotate(90deg)';
      btn.style.background = open ? 'var(--bg3)' : 'var(--input-border)';
      btn.style.color = open ? 'var(--text2)' : 'var(--text1)';
      subs.forEach(function(row) { row.style.display = open ? 'none' : ''; });
    });
  });

  // 모드 변경 버튼
  function setMode(mode) {
    fetch('/api/admin/emptybet/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: mode })
    }).then(function(r){ return r.json(); }).then(function(res) {
      if (res.success) renderEmptyBetListPage();
    });
  }
  var btnRolling = el.querySelector('#eb-mode-rolling');
  var btnAll = el.querySelector('#eb-mode-all');
  if (btnRolling) btnRolling.addEventListener('click', function() {
    showConfirmModal({
      icon: 'fas fa-exchange-alt',
      iconColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.15)',
      title: '공베팅 모드 변경',
      message: '<strong style="color:#f59e0b;">롤링만 누락</strong> 모드로 변경하시겠습니까?<br><span style="font-size:0.82rem;color:var(--text2);">롤링 포인트만 누락되며, 베팅/당첨은 정상 집계됩니다.</span>',
      confirmText: '변경',
      confirmColor: '#f59e0b',
      onConfirm: function(close) { setMode('rolling'); close(); }
    });
  });
  if (btnAll) btnAll.addEventListener('click', function() {
    showConfirmModal({
      icon: 'fas fa-exclamation-triangle',
      iconColor: '#ef4444',
      iconBg: 'rgba(239,68,68,0.15)',
      title: '공베팅 모드 변경',
      message: '<strong style="color:#ef4444;">전체 누락</strong> 모드로 변경하시겠습니까?<br><span style="font-size:0.82rem;color:var(--text2);">베팅/당첨/롤링 모두 파트너 정산에서 제외됩니다.</span>',
      confirmText: '변경',
      confirmColor: '#ef4444',
      onConfirm: function(close) { setMode('all'); close(); }
    });
  });

  // 검색
  var searchInput = el.querySelector('#eb-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      var q = searchInput.value.trim().toLowerCase();
      el.querySelectorAll('.db-table tbody tr').forEach(function(row) {
        var idCell = row.querySelector('.eb-id-cell');
        if (!idCell) { row.style.display = ''; return; }
        var id = (idCell.getAttribute('data-id') || '').toLowerCase();
        var nick = (idCell.querySelector('div:last-child') || {}).textContent || '';
        row.style.display = (!q || id.indexOf(q) >= 0 || nick.toLowerCase().indexOf(q) >= 0) ? '' : 'none';
      });
    });
  }
}
