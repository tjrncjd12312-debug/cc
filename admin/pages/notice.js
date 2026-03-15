// ══════════════════════════════════════
//  공지사항 페이지
// ══════════════════════════════════════

function loadNotices() {
  try { return JSON.parse(localStorage.getItem('noticeList') || '[]'); } catch(e) { return []; }
}
function saveNotices(list) {
  try { localStorage.setItem('noticeList', JSON.stringify(list)); } catch(e) {}
  // 서버 동기화
  fetch('/api/admin/notices', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(list) }).catch(function(){});
}

function renderNoticePage() {
  // 서버 동기화: 서버에 데이터 있으면 가져오고, 없으면 localStorage → 서버로 올림
  var localList = loadNotices();
  fetch('/api/admin/notices').then(function(r){ return r.json(); }).then(function(res) {
    if(res.success && Array.isArray(res.data) && res.data.length > 0) {
      try { localStorage.setItem('noticeList', JSON.stringify(res.data)); } catch(e) {}
      var tbody = document.getElementById('nc-tbody');
      if(tbody) { tbody.innerHTML = buildNoticeRows(res.data); bindNoticeRowEvents(); }
      var cnt = document.getElementById('nc-count');
      if(cnt) cnt.textContent = res.data.length;
    } else if(localList.length > 0) {
      fetch('/api/admin/notices', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(localList) }).catch(function(){});
    }
  }).catch(function(){});
  var list = loadNotices();

  document.getElementById('content').innerHTML = `
    <div class="pt-wrap">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <select class="pt-create-select" id="nc-domain" style="width:120px;">
          <option value="">전체도메인</option>
        </select>
        <input type="text" class="pt-search-input" id="nc-keyword" placeholder="제목 검색" style="width:200px;">
        <button class="pt-action-btn pt-btn-purple" id="nc-search-btn">검색</button>
        <button class="pt-action-btn pt-btn-green"  id="nc-write-btn" style="margin-left:auto;">+ 신규공지 작성</button>
      </div>

      <div class="db-section" style="margin-bottom:0;overflow-x:auto;">
        <table class="db-table" style="font-size:0.8rem;">
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th style="width:100px;">도메인</th>
              <th>제목</th>
              <th style="width:160px;">등록일시</th>
              <th style="width:80px;text-align:center;">파트너팝업</th>
              <th style="width:80px;text-align:center;">유저팝업</th>
              <th style="width:80px;text-align:center;">로그인팝업</th>
              <th style="width:80px;text-align:center;">파트너보이기</th>
              <th style="width:80px;text-align:center;">유저보이기</th>
              <th style="width:90px;text-align:center;">순위</th>
              <th style="width:60px;text-align:center;">수정</th>
              <th style="width:60px;text-align:center;">삭제</th>
            </tr>
          </thead>
          <tbody id="nc-tbody">
            ${buildNoticeRows(list)}
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:0.78rem;color:var(--text2);">
        총 <b style="color:var(--text);" id="nc-count">${list.length}</b> 건
      </div>
    </div>
  `;

  document.getElementById('nc-write-btn').addEventListener('click', function() {
    openNoticeWriteModal(null);
  });

  document.getElementById('nc-search-btn').addEventListener('click', function() {
    var keyword  = document.getElementById('nc-keyword').value.trim().toLowerCase();
    var filtered = loadNotices().filter(function(n) {
      if(keyword && !(n.title||'').toLowerCase().includes(keyword)) return false;
      return true;
    });
    document.getElementById('nc-tbody').innerHTML = buildNoticeRows(filtered);
    document.getElementById('nc-count').textContent = filtered.length;
    bindNoticeRowEvents();
  });

  bindNoticeRowEvents();
}

function buildNoticeRows(list) {
  if(!list || list.length === 0) {
    return '<tr><td colspan="12" style="color:#888;padding:24px;text-align:center;">등록된 공지사항이 없습니다.</td></tr>';
  }
  return list.map(function(n, i) {
    return '<tr data-idx="'+i+'">'
      + '<td style="color:#888;">'+(i+1)+'</td>'
      + '<td style="color:var(--text2);font-size:0.75rem;">'+(n.domain||'-')+'</td>'
      + '<td style="text-align:left;padding-left:12px;">'
      +   '<a class="nc-title-link" data-idx="'+i+'" style="color:#60a5fa;cursor:pointer;text-decoration:underline;">'+(n.title||'')+'</a>'
      + '</td>'
      + '<td style="font-size:0.75rem;color:var(--text2);">'+(n.createdAt||'-')+'</td>'
      + '<td style="text-align:center;">'+toggleHtml('nc-partner-popup', i, n.partnerPopup)+'</td>'
      + '<td style="text-align:center;">'+toggleHtml('nc-user-popup',    i, n.userPopup)+'</td>'
      + '<td style="text-align:center;">'+toggleHtml('nc-login-popup',   i, n.loginPopup)+'</td>'
      + '<td style="text-align:center;">'+toggleHtml('nc-partner-show',  i, n.partnerShow)+'</td>'
      + '<td style="text-align:center;">'+toggleHtml('nc-user-show',     i, n.userShow)+'</td>'
      + '<td style="text-align:center;">'
      +   '<div style="display:flex;gap:4px;align-items:center;justify-content:center;">'
      +     '<input type="number" class="pt-create-input nc-rank-input" data-idx="'+i+'" value="'+(n.rank||1)+'" style="width:50px;text-align:center;padding:3px 4px;">'
      +     '<button class="pt-action-btn pt-btn-blue nc-rank-save" data-idx="'+i+'" style="padding:3px 8px;font-size:0.72rem;">저장</button>'
      +   '</div>'
      + '</td>'
      + '<td style="text-align:center;"><button class="pt-action-btn pt-btn-purple nc-edit-btn" data-idx="'+i+'" style="padding:3px 12px;font-size:0.75rem;">수정</button></td>'
      + '<td style="text-align:center;"><button class="pt-action-btn pt-btn-red nc-del-btn" data-idx="'+i+'" style="padding:3px 12px;font-size:0.75rem;">삭제</button></td>'
      + '</tr>';
  }).join('');
}

function toggleHtml(name, idx, checked) {
  return '<label class="pt-toggle-switch" style="transform:scale(0.85);">'
    + '<input type="checkbox" class="nc-toggle" data-name="'+name+'" data-idx="'+idx+'"'+(checked?' checked':'')+'>'
    + '<span class="pt-toggle-slider"></span>'
    + '</label>';
}

function bindNoticeRowEvents() {
  // 제목 클릭 → 미리보기
  document.querySelectorAll('.nc-title-link').forEach(function(a) {
    a.addEventListener('click', function() {
      var list = loadNotices();
      var n = list[parseInt(this.dataset.idx)];
      if(!n) return;
      openNoticeViewModal(n);
    });
  });

  // 토글 변경 → 즉시 저장
  document.querySelectorAll('.nc-toggle').forEach(function(cb) {
    cb.addEventListener('change', function() {
      var list = loadNotices();
      var idx  = parseInt(this.dataset.idx);
      var name = this.dataset.name;
      var fieldMap = {
        'nc-partner-popup': 'partnerPopup',
        'nc-user-popup':    'userPopup',
        'nc-login-popup':   'loginPopup',
        'nc-partner-show':  'partnerShow',
        'nc-user-show':     'userShow',
      };
      var field = fieldMap[name];
      if(field && list[idx]) {
        list[idx][field] = this.checked;
        saveNotices(list);
      }
    });
  });

  // 순위 저장
  document.querySelectorAll('.nc-rank-save').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var list = loadNotices();
      var idx  = parseInt(this.dataset.idx);
      var inp  = document.querySelector('.nc-rank-input[data-idx="'+idx+'"]');
      if(!inp || !list[idx]) return;
      list[idx].rank = parseInt(inp.value) || 1;
      saveNotices(list);
      alert('순위가 저장되었습니다.');
    });
  });

  // 수정 버튼
  document.querySelectorAll('.nc-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var list = loadNotices();
      var idx  = parseInt(this.dataset.idx);
      openNoticeWriteModal(idx);
    });
  });

  // 삭제 버튼
  document.querySelectorAll('.nc-del-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if(!confirm('공지사항을 삭제하시겠습니까?')) return;
      var list = loadNotices();
      var idx  = parseInt(this.dataset.idx);
      list.splice(idx, 1);
      saveNotices(list);
      renderNoticePage();
    });
  });
}

// ── 공지 작성/수정 모달 ──
function openNoticeWriteModal(editIdx) {
  var existing = document.getElementById('nc-write-overlay');
  if(existing) existing.remove();

  var list = loadNotices();
  var n = (editIdx !== null && list[editIdx]) ? list[editIdx] : {};
  var isEdit = editIdx !== null && list[editIdx];
  var title  = isEdit ? '공지사항 수정' : '신규공지 작성';

  var overlay = document.createElement('div');
  overlay.id = 'nc-write-overlay';
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML = `
    <div class="pt-modal" style="width:720px;max-width:95vw;">
      <div class="pt-modal-header">
        <span>${title}</span>
        <button class="pt-modal-close" id="ncm-close">✕</button>
      </div>
      <div class="pt-modal-body">
        <div class="pt-modal-section">

          <div class="pt-modal-field">
            <label>제목</label>
            <input type="text" class="pt-modal-input" id="ncm-title" placeholder="제목을 입력하세요" value="${n.title||''}">
          </div>

          <!-- 팝업 이미지 -->
          <div class="pt-modal-field" style="margin-top:10px;">
            <label>팝업 이미지 <span style="color:#666;font-size:0.72rem;">(선택, 이미지가 있으면 내용 텍스트 대신 표시)</span></label>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <label style="cursor:pointer;background:#2d3748;border:1px dashed #555;border-radius:6px;padding:7px 16px;font-size:0.8rem;color:#aaa;">
                파일 선택
                <input type="file" id="ncm-img-file" accept="image/*" style="display:none;">
              </label>
              <span id="ncm-img-name" style="font-size:0.75rem;color:#888;">${n.image ? '이미지 등록됨' : '선택된 파일 없음'}</span>
              <button id="ncm-img-clear" style="background:#4b5563;border:none;color:#ccc;border-radius:4px;padding:4px 10px;font-size:0.75rem;cursor:pointer;">초기화</button>
            </div>
            <div id="ncm-img-preview" style="margin-top:8px;">
              ${n.image ? '<img src="'+n.image+'" style="max-height:160px;border-radius:6px;border:1px solid #444;">' : ''}
            </div>
          </div>

          <div class="pt-modal-field" style="margin-top:10px;">
            <label>내용 <span style="color:#666;font-size:0.72rem;">(이미지 없을 때 표시)</span></label>
            <textarea id="ncm-content" class="pt-modal-input" rows="5" style="resize:vertical;width:100%;font-family:inherit;">${n.content||''}</textarea>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
            <div class="pt-modal-field">
              <label>파트너 팝업</label>
              <label class="pt-toggle-switch"><input type="checkbox" id="ncm-partner-popup"${n.partnerPopup?' checked':''}><span class="pt-toggle-slider"></span></label>
            </div>
            <div class="pt-modal-field">
              <label>유저 팝업</label>
              <label class="pt-toggle-switch"><input type="checkbox" id="ncm-user-popup"${n.userPopup?' checked':''}><span class="pt-toggle-slider"></span></label>
            </div>
            <div class="pt-modal-field">
              <label>로그인 팝업</label>
              <label class="pt-toggle-switch"><input type="checkbox" id="ncm-login-popup"${n.loginPopup?' checked':''}><span class="pt-toggle-slider"></span></label>
            </div>
            <div class="pt-modal-field">
              <label>파트너 보이기</label>
              <label class="pt-toggle-switch"><input type="checkbox" id="ncm-partner-show"${n.partnerShow?' checked':''}><span class="pt-toggle-slider"></span></label>
            </div>
            <div class="pt-modal-field">
              <label>유저 보이기</label>
              <label class="pt-toggle-switch"><input type="checkbox" id="ncm-user-show"${n.userShow?' checked':''}><span class="pt-toggle-slider"></span></label>
            </div>
          </div>

          <div class="pt-modal-field" style="margin-top:10px;">
            <label>순위</label>
            <input type="number" class="pt-modal-input" id="ncm-rank" value="${n.rank||1}" style="width:80px;">
          </div>

          <div class="pt-modal-actions" style="margin-top:16px;">
            <button class="pt-action-btn pt-btn-purple" id="ncm-save" style="padding:7px 32px;">저장</button>
            <button class="pt-action-btn pt-btn-gray"   id="ncm-cancel" style="padding:7px 20px;background:#4b5563;">취소</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('ncm-close').addEventListener('click',  function(){ overlay.remove(); });
  document.getElementById('ncm-cancel').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });

  // 이미지 파일 선택 → canvas 압축 후 base64
  var _imageBase64 = n.image || '';
  document.getElementById('ncm-img-file').addEventListener('change', function() {
    var file = this.files[0];
    if(!file) return;
    document.getElementById('ncm-img-name').textContent = file.name + ' (압축중...)';
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var MAX_W = 375, MAX_H = 600;
        var w = img.width, h = img.height;
        if(w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
        if(h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        _imageBase64 = canvas.toDataURL('image/jpeg', 0.82);
        var kb = Math.round(_imageBase64.length * 0.75 / 1024);
        document.getElementById('ncm-img-name').textContent = file.name + ' (' + kb + 'KB)';
        document.getElementById('ncm-img-preview').innerHTML =
          '<img src="'+_imageBase64+'" style="max-height:160px;border-radius:6px;border:1px solid #444;">';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('ncm-img-clear').addEventListener('click', function() {
    _imageBase64 = '';
    document.getElementById('ncm-img-name').textContent = '선택된 파일 없음';
    document.getElementById('ncm-img-preview').innerHTML = '';
    document.getElementById('ncm-img-file').value = '';
  });

  document.getElementById('ncm-save').addEventListener('click', function() {
    var titleVal = document.getElementById('ncm-title').value.trim();
    if(!titleVal) { alert('제목을 입력하세요.'); return; }

    var entry = {
      title:        titleVal,
      content:      document.getElementById('ncm-content').value,
      image:        _imageBase64,
      partnerPopup: document.getElementById('ncm-partner-popup').checked,
      userPopup:    document.getElementById('ncm-user-popup').checked,
      loginPopup:   document.getElementById('ncm-login-popup').checked,
      partnerShow:  document.getElementById('ncm-partner-show').checked,
      userShow:     document.getElementById('ncm-user-show').checked,
      rank:         parseInt(document.getElementById('ncm-rank').value) || 1,
      domain:       '',
      createdAt:    isEdit ? (n.createdAt || nowStr()) : nowStr(),
    };

    var list = loadNotices();
    if(isEdit) {
      list[editIdx] = entry;
    } else {
      list.unshift(entry);
    }
    saveNotices(list);
    overlay.remove();
    renderNoticePage();
  });
}

// ── 공지 미리보기 모달 ──
function openNoticeViewModal(n) {
  var existing = document.getElementById('nc-view-overlay');
  if(existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'nc-view-overlay';
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML = `
    <div class="pt-modal" style="width:600px;max-width:95vw;">
      <div class="pt-modal-header">
        <span>[${n.category||'공지'}] ${n.title||''}</span>
        <button class="pt-modal-close" id="ncv-close">✕</button>
      </div>
      <div class="pt-modal-body">
        <div class="pt-modal-section">
          <div style="font-size:0.75rem;color:#888;margin-bottom:12px;">등록일시: ${n.createdAt||'-'}</div>
          <div style="white-space:pre-wrap;line-height:1.7;color:var(--text);min-height:100px;">${(n.content||'내용이 없습니다.').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('ncv-close').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
}
