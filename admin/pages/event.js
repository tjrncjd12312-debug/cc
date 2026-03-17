// ══════════════════════════════════════
//  이벤트 관리 페이지  (서버 API 연동)
// ══════════════════════════════════════

async function apiLoadEvents() {
  var res = await fetch('/api/admin/events');
  return (await res.json()).data || [];
}

function nowStrEv() {
  var d = new Date(), p = function(n){ return String(n).padStart(2,'0'); };
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
}

// 현재 렌더된 이벤트 목록 (인덱스 기반 접근용)
var _evList = [];

async function renderEventPage() {
  _evList = await apiLoadEvents();
  _drawEventPage(_evList);
}

function _drawEventPage(list) {
  document.getElementById('content').innerHTML =
    '<div class="pt-wrap">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">'
    +   '<input type="text" class="pt-search-input" id="ev-keyword" placeholder="제목 검색" style="width:220px;">'
    +   '<button class="pt-action-btn pt-btn-purple" id="ev-search-btn">검색</button>'
    +   '<button class="pt-action-btn pt-btn-green" id="ev-write-btn" style="margin-left:auto;">+ 신규 이벤트 작성</button>'
    + '</div>'
    + '<div class="db-section" style="margin-bottom:0;overflow-x:auto;">'
    +   '<table class="db-table" style="font-size:0.8rem;">'
    +     '<thead><tr>'
    +       '<th style="width:40px;">#</th><th>제목</th>'
    +       '<th style="width:200px;text-align:center;">기간</th>'
    +       '<th style="width:160px;">등록일시</th>'
    +       '<th style="width:80px;text-align:center;">파트너팝업</th>'
    +       '<th style="width:80px;text-align:center;">유저팝업</th>'
    +       '<th style="width:80px;text-align:center;">로그인팝업</th>'
    +       '<th style="width:80px;text-align:center;">파트너보이기</th>'
    +       '<th style="width:80px;text-align:center;">유저보이기</th>'
    +       '<th style="width:60px;text-align:center;">수정</th>'
    +       '<th style="width:60px;text-align:center;">삭제</th>'
    +     '</tr></thead>'
    +     '<tbody id="ev-tbody">'+buildEventRows(list)+'</tbody>'
    +   '</table>'
    + '</div>'
    + '<div style="margin-top:10px;font-size:0.78rem;color:var(--text2);">총 <b style="color:var(--text);" id="ev-count">'+list.length+'</b> 건</div>'
    + '</div>';

  document.getElementById('ev-write-btn').addEventListener('click', function() {
    openEventWriteModal(null);
  });

  document.getElementById('ev-search-btn').addEventListener('click', function() {
    var keyword  = document.getElementById('ev-keyword').value.trim().toLowerCase();
    var filtered = _evList.filter(function(ev) {
      return !keyword || (ev.title||'').toLowerCase().includes(keyword);
    });
    document.getElementById('ev-tbody').innerHTML = buildEventRows(filtered);
    document.getElementById('ev-count').textContent = filtered.length;
    bindEventRowEvents(filtered);
  });

  document.getElementById('ev-keyword').addEventListener('keydown', function(e) {
    if(e.key === 'Enter') document.getElementById('ev-search-btn').click();
  });

  bindEventRowEvents(list);
}

function evToggleHtml(name, id, checked) {
  return '<label class="pt-toggle-switch" style="transform:scale(0.85);">'
    + '<input type="checkbox" class="ev-toggle" data-name="'+name+'" data-id="'+id+'"'+(checked?' checked':'')+'>'
    + '<span class="pt-toggle-slider"></span>'
    + '</label>';
}

function buildEventRows(list) {
  if(!list || list.length === 0) {
    return '<tr><td colspan="11" style="color:#888;padding:24px;text-align:center;">등록된 이벤트가 없습니다.</td></tr>';
  }
  return list.map(function(ev, i) {
    var period = (ev.startDate||'-') + ' ~ ' + (ev.endDate||'-');
    return '<tr data-id="'+ev.id+'">'
      + '<td style="color:#888;">'+(i+1)+'</td>'
      + '<td style="text-align:left;padding-left:12px;">'+(ev.title||'')+'</td>'
      + '<td style="text-align:center;font-size:0.75rem;color:var(--text2);">'+period+'</td>'
      + '<td style="font-size:0.75rem;color:var(--text2);">'+(ev.createdAt||'-')+'</td>'
      + '<td style="text-align:center;">'+evToggleHtml('partnerPopup', ev.id, ev.partnerPopup)+'</td>'
      + '<td style="text-align:center;">'+evToggleHtml('userPopup', ev.id, ev.userPopup)+'</td>'
      + '<td style="text-align:center;">'+evToggleHtml('loginPopup', ev.id, ev.loginPopup)+'</td>'
      + '<td style="text-align:center;">'+evToggleHtml('partnerShow', ev.id, ev.partnerShow)+'</td>'
      + '<td style="text-align:center;">'+evToggleHtml('userShow', ev.id, ev.userShow)+'</td>'
      + '<td style="text-align:center;"><button class="pt-action-btn pt-btn-purple ev-edit-btn" data-id="'+ev.id+'" style="padding:3px 12px;font-size:0.75rem;">수정</button></td>'
      + '<td style="text-align:center;"><button class="pt-action-btn pt-btn-red ev-del-btn" data-id="'+ev.id+'" style="padding:3px 12px;font-size:0.75rem;">삭제</button></td>'
      + '</tr>';
  }).join('');
}

function bindEventRowEvents(list) {
  // 5개 토글 (partnerPopup, userPopup, loginPopup, partnerShow, userShow)
  document.querySelectorAll('.ev-toggle').forEach(function(cb) {
    cb.addEventListener('change', async function() {
      var id = this.dataset.id;
      var field = this.dataset.name;
      var ev = (list||_evList).find(function(e){ return e.id === id; });
      if(!ev) return;
      ev[field] = this.checked;
      await fetch('/api/admin/events/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ev)
      });
    });
  });

  // 수정 버튼
  document.querySelectorAll('.ev-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.dataset.id;
      var ev = (list||_evList).find(function(e){ return e.id === id; });
      if(ev) openEventWriteModal(ev);
    });
  });

  // 삭제 버튼
  document.querySelectorAll('.ev-del-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      if(!(await customConfirm('이벤트를 삭제하시겠습니까?'))) return;
      var id = this.dataset.id;
      await fetch('/api/admin/events/' + id, { method: 'DELETE' });
      renderEventPage();
    });
  });
}

// ── 이벤트 작성/수정 모달 ──
function openEventWriteModal(evObj) {
  var existing = document.getElementById('ev-write-overlay');
  if(existing) existing.remove();

  var ev     = evObj || {};
  var isEdit = !!evObj;
  var modalTitle = isEdit ? '이벤트 수정' : '신규 이벤트 작성';

  var overlay = document.createElement('div');
  overlay.id = 'ev-write-overlay';
  overlay.className = 'pt-modal-overlay';

  overlay.innerHTML =
    '<div class="pt-modal" style="width:680px;max-width:95vw;">'
    +   '<div class="pt-modal-header">'
    +     '<span>'+modalTitle+'</span>'
    +     '<button class="pt-modal-close" id="evm-close">✕</button>'
    +   '</div>'
    +   '<div class="pt-modal-body"><div class="pt-modal-section">'

    +     '<div class="pt-modal-field">'
    +       '<label>제목</label>'
    +       '<input type="text" class="pt-modal-input" id="evm-title" placeholder="이벤트 제목을 입력하세요" value="'+(ev.title||'')+'">'
    +     '</div>'

    +     '<div class="pt-modal-field" style="margin-top:10px;">'
    +       '<label>이미지 <span style="color:#666;font-size:0.72rem;">(선택, JPEG 압축 저장)</span></label>'
    +       '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
    +         '<label style="cursor:pointer;background:#2d3748;border:1px dashed #555;border-radius:6px;padding:7px 16px;font-size:0.8rem;color:#aaa;">'
    +           '파일 선택<input type="file" id="evm-img-file" accept="image/*" style="display:none;">'
    +         '</label>'
    +         '<span id="evm-img-name" style="font-size:0.75rem;color:#888;">'+(ev.image ? '이미지 등록됨' : '선택된 파일 없음')+'</span>'
    +         '<button id="evm-img-clear" style="background:#4b5563;border:none;color:#ccc;border-radius:4px;padding:4px 10px;font-size:0.75rem;cursor:pointer;">초기화</button>'
    +       '</div>'
    +       '<div id="evm-img-preview" style="margin-top:8px;">'
    +         (ev.image ? '<img src="'+ev.image+'" style="max-height:160px;border-radius:6px;border:1px solid #444;">' : '')
    +       '</div>'
    +     '</div>'

    +     '<div class="pt-modal-field" style="margin-top:10px;">'
    +       '<label>내용</label>'
    +       '<textarea id="evm-content" class="pt-modal-input" rows="5" style="resize:vertical;width:100%;font-family:inherit;">'+(ev.content||'')+'</textarea>'
    +     '</div>'

    +     '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">'
    +       '<div class="pt-modal-field"><label>시작일</label><input type="date" class="pt-modal-input" id="evm-start-date" value="'+(ev.startDate||'')+'"></div>'
    +       '<div class="pt-modal-field"><label>종료일</label><input type="date" class="pt-modal-input" id="evm-end-date"   value="'+(ev.endDate||'')+'"></div>'
    +     '</div>'

    +     '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">'
    +       '<div class="pt-modal-field"><label>파트너 팝업</label><label class="pt-toggle-switch"><input type="checkbox" id="evm-partner-popup"'+(ev.partnerPopup?' checked':'')+'><span class="pt-toggle-slider"></span></label></div>'
    +       '<div class="pt-modal-field"><label>유저 팝업</label><label class="pt-toggle-switch"><input type="checkbox" id="evm-user-popup"'+(ev.userPopup?' checked':'')+'><span class="pt-toggle-slider"></span></label></div>'
    +       '<div class="pt-modal-field"><label>로그인 팝업</label><label class="pt-toggle-switch"><input type="checkbox" id="evm-login-popup"'+(ev.loginPopup?' checked':'')+'><span class="pt-toggle-slider"></span></label></div>'
    +       '<div class="pt-modal-field"><label>파트너 보이기</label><label class="pt-toggle-switch"><input type="checkbox" id="evm-partner-show"'+(ev.partnerShow?' checked':'')+'><span class="pt-toggle-slider"></span></label></div>'
    +       '<div class="pt-modal-field"><label>유저 보이기</label><label class="pt-toggle-switch"><input type="checkbox" id="evm-user-show"'+(ev.userShow?' checked':'')+'><span class="pt-toggle-slider"></span></label></div>'
    +     '</div>'

    +     '<div class="pt-modal-actions" style="margin-top:16px;">'
    +       '<button class="pt-action-btn pt-btn-green" id="evm-save" style="padding:7px 32px;">저장</button>'
    +       '<button class="pt-action-btn" id="evm-cancel" style="padding:7px 20px;background:#4b5563;">취소</button>'
    +     '</div>'
    +   '</div></div>'
    + '</div>';

  document.body.appendChild(overlay);

  document.getElementById('evm-close').addEventListener('click',  function(){ overlay.remove(); });
  document.getElementById('evm-cancel').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });

  // 이미지 압축
  var _imageBase64 = ev.image || '';

  document.getElementById('evm-img-file').addEventListener('change', function() {
    var file = this.files[0];
    if(!file) return;
    document.getElementById('evm-img-name').textContent = file.name + ' (압축중...)';
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var MAX_W = 800, MAX_H = 600;
        var w = img.width, h = img.height;
        if(w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
        if(h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        _imageBase64 = canvas.toDataURL('image/jpeg', 0.82);
        var kb = Math.round(_imageBase64.length * 0.75 / 1024);
        document.getElementById('evm-img-name').textContent = file.name + ' (' + kb + 'KB)';
        document.getElementById('evm-img-preview').innerHTML =
          '<img src="'+_imageBase64+'" style="max-height:160px;border-radius:6px;border:1px solid #444;">';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('evm-img-clear').addEventListener('click', function() {
    _imageBase64 = '';
    document.getElementById('evm-img-name').textContent = '선택된 파일 없음';
    document.getElementById('evm-img-preview').innerHTML = '';
    document.getElementById('evm-img-file').value = '';
  });

  // 저장
  document.getElementById('evm-save').addEventListener('click', async function() {
    var titleVal = document.getElementById('evm-title').value.trim();
    if(!titleVal) { alert('제목을 입력하세요.'); return; }

    var startDate = document.getElementById('evm-start-date').value;
    var endDate   = document.getElementById('evm-end-date').value;
    if(startDate && endDate && startDate > endDate) {
      alert('종료일이 시작일보다 앞설 수 없습니다.'); return;
    }

    var entry = {
      id:           isEdit ? ev.id : nowStrEv(),
      title:        titleVal,
      content:      document.getElementById('evm-content').value,
      image:        _imageBase64,
      startDate:    startDate,
      endDate:      endDate,
      partnerPopup: document.getElementById('evm-partner-popup').checked,
      userPopup:    document.getElementById('evm-user-popup').checked,
      loginPopup:   document.getElementById('evm-login-popup').checked,
      partnerShow:  document.getElementById('evm-partner-show').checked,
      userShow:     document.getElementById('evm-user-show').checked,
      createdAt:    isEdit ? (ev.createdAt || nowStrEv()) : nowStrEv()
    };

    var method = isEdit ? 'PUT' : 'POST';
    var url    = isEdit ? '/api/admin/events/' + ev.id : '/api/admin/events';
    var res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    var data = await res.json();
    if(!data.success) { alert('저장 실패: ' + (data.error||'')); return; }
    overlay.remove();
    renderEventPage();
  });
}
