// ══════════════════════════════════════
//  상담문의 관리 페이지  (서버 API 연동)
// ══════════════════════════════════════

async function apiInquiries(params) {
  var qs = Object.keys(params||{}).map(function(k){ return k+'='+encodeURIComponent(params[k]); }).join('&');
  var res = await fetch('/api/admin/inquiries' + (qs ? '?'+qs : ''));
  return (await res.json()).data || [];
}

function inqNowStr() {
  var d = new Date(), p = function(n){ return String(n).padStart(2,'0'); };
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
}

function inqPreview(text, len) {
  if(!text) return '<span style="color:#666;">-</span>';
  return text.length > len ? text.slice(0, len) + '...' : text;
}

// ══════════════════════════════════════
//  접수된 문의 (open)
// ══════════════════════════════════════
function renderInquiryOpen() {
  var today = _dfLocalDate(new Date());

  document.getElementById('content').innerHTML =
    '<div class="pt-wrap">' +
    '  <div class="date-filter-bar">' +
    '    <div class="df-search-box" style="flex:0 0 180px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="iqo-search" placeholder="회원ID 검색"></div>' +
    '    <button class="df-preset active iqo-preset" data-preset="today">오늘</button>' +
    '    <button class="df-preset iqo-preset" data-preset="yesterday">어제</button>' +
    '    <button class="df-preset iqo-preset" data-preset="week">이번주</button>' +
    '    <button class="df-preset iqo-preset" data-preset="month">이번달</button>' +
    '    <button class="df-preset iqo-preset" data-preset="all">전체</button>' +
    '    <div class="df-date-range">' +
    '      <input type="date" id="iqo-from" value="' + today + '">' +
    '      <span style="color:#64748b;font-size:0.72rem;">~</span>' +
    '      <input type="date" id="iqo-to" value="' + today + '">' +
    '      <button class="df-query-btn" id="iqo-search-btn">조회</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="db-section" style="margin-bottom:0;overflow-x:auto;">' +
    '    <table class="db-table" style="font-size:0.8rem;">' +
    '      <thead><tr>' +
    '        <th>#</th><th>신청일시</th><th>회원ID</th><th>닉네임</th>' +
    '        <th>제목</th><th style="text-align:center;">상태</th><th style="text-align:center;">답변</th>' +
    '      </tr></thead>' +
    '      <tbody id="iqo-tbody"></tbody>' +
    '    </table>' +
    '  </div>' +
    '  <div style="margin-top:10px;font-size:0.78rem;color:var(--text2);">총 <b style="color:var(--text);" id="iqo-count">0</b> 건</div>' +
    '</div>';

  async function refresh() {
    var keyword = document.getElementById('iqo-search').value.trim().toLowerCase();
    var from    = document.getElementById('iqo-from').value;
    var to      = document.getElementById('iqo-to').value;
    var list    = await apiInquiries({ status: 'open' });
    list = list.filter(function(r) {
      if(keyword && !(r.userId||'').toLowerCase().includes(keyword) && !(r.nick||'').toLowerCase().includes(keyword)) return false;
      if(from && r.datetime < from) return false;
      if(to   && r.datetime > to + ' 99') return false;
      return true;
    });
    document.getElementById('iqo-count').textContent = list.length;
    if(!list.length) {
      document.getElementById('iqo-tbody').innerHTML = '<tr><td colspan="7" style="color:#888;padding:24px;text-align:center;">접수된 문의가 없습니다.</td></tr>';
      return;
    }
    document.getElementById('iqo-tbody').innerHTML = list.map(function(r, i) {
      return '<tr>'
        + '<td style="color:#888;">'+(i+1)+'</td>'
        + '<td style="font-size:0.75rem;white-space:nowrap;">'+(r.datetime||'-')+'</td>'
        + '<td style="color:#f59e0b;font-weight:600;">'+(r.userId||'-')+'</td>'
        + '<td style="color:#aaa;">'+(r.nick||'-')+'</td>'
        + '<td style="text-align:left;padding-left:12px;">'
        +   '<a class="iqo-title-link" data-id="'+r.id+'" style="color:#60a5fa;cursor:pointer;text-decoration:underline;">'+(r.title||'(제목 없음)')+'</a>'
        + '</td>'
        + '<td style="text-align:center;"><span style="color:#fbbf24;font-weight:700;">대기</span></td>'
        + '<td style="text-align:center;"><button class="pt-action-btn pt-btn-green iqo-reply-btn" data-id="'+r.id+'" style="padding:3px 12px;font-size:0.75rem;">답변하기</button></td>'
        + '</tr>';
    }).join('');

    // 제목 클릭 → 내용 보기
    document.querySelectorAll('.iqo-title-link').forEach(function(a) {
      a.addEventListener('click', async function() {
        var all = await apiInquiries();
        var item = all.find(function(r){ return r.id === this.dataset.id; }.bind(this));
        if(item) openInquiryViewModal(item);
      });
    });

    // 답변하기 버튼
    document.querySelectorAll('.iqo-reply-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var all = await apiInquiries();
        var item = all.find(function(r){ return r.id === this.dataset.id; }.bind(this));
        if(item) openInquiryReplyModal(item, function() { refresh(); });
      });
    });
  }

  document.getElementById('iqo-search-btn').addEventListener('click', refresh);
  bindDatePresets('iqo-preset', 'iqo-from', 'iqo-to', refresh);
  refresh();
}

// ══════════════════════════════════════
//  완료된 문의 (done)
// ══════════════════════════════════════
function renderInquiryDone() {
  var today = _dfLocalDate(new Date());

  document.getElementById('content').innerHTML =
    '<div class="pt-wrap">' +
    '  <div class="date-filter-bar">' +
    '    <div class="df-search-box" style="flex:0 0 180px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="iqd-search" placeholder="회원ID 검색"></div>' +
    '    <button class="df-preset active iqd-preset" data-preset="today">오늘</button>' +
    '    <button class="df-preset iqd-preset" data-preset="yesterday">어제</button>' +
    '    <button class="df-preset iqd-preset" data-preset="week">이번주</button>' +
    '    <button class="df-preset iqd-preset" data-preset="month">이번달</button>' +
    '    <button class="df-preset iqd-preset" data-preset="all">전체</button>' +
    '    <div class="df-date-range">' +
    '      <input type="date" id="iqd-from" value="' + today + '">' +
    '      <span style="color:#64748b;font-size:0.72rem;">~</span>' +
    '      <input type="date" id="iqd-to" value="' + today + '">' +
    '      <button class="df-query-btn" id="iqd-search-btn">조회</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="db-section" style="margin-bottom:0;overflow-x:auto;">' +
    '    <table class="db-table" style="font-size:0.8rem;">' +
    '      <thead><tr>' +
    '        <th>#</th><th>신청일시</th><th>회원ID</th><th>닉네임</th>' +
    '        <th>제목</th><th style="text-align:center;">상태</th><th>답변 미리보기</th><th>답변일시</th>' +
    '      </tr></thead>' +
    '      <tbody id="iqd-tbody"></tbody>' +
    '    </table>' +
    '  </div>' +
    '  <div style="margin-top:10px;font-size:0.78rem;color:var(--text2);">총 <b style="color:var(--text);" id="iqd-count">0</b> 건</div>' +
    '</div>';

  async function refresh() {
    var keyword = document.getElementById('iqd-search').value.trim().toLowerCase();
    var from    = document.getElementById('iqd-from').value;
    var to      = document.getElementById('iqd-to').value;
    var list    = await apiInquiries({ status: 'done' });
    list = list.filter(function(r) {
      if(keyword && !(r.userId||'').toLowerCase().includes(keyword) && !(r.nick||'').toLowerCase().includes(keyword)) return false;
      if(from && r.datetime < from) return false;
      if(to   && r.datetime > to + ' 99') return false;
      return true;
    });
    document.getElementById('iqd-count').textContent = list.length;
    if(!list.length) {
      document.getElementById('iqd-tbody').innerHTML = '<tr><td colspan="8" style="color:#888;padding:24px;text-align:center;">완료된 문의가 없습니다.</td></tr>';
      return;
    }
    document.getElementById('iqd-tbody').innerHTML = list.map(function(r, i) {
      return '<tr>'
        + '<td style="color:#888;">'+(i+1)+'</td>'
        + '<td style="font-size:0.75rem;white-space:nowrap;">'+(r.datetime||'-')+'</td>'
        + '<td style="color:#f59e0b;font-weight:600;">'+(r.userId||'-')+'</td>'
        + '<td style="color:#aaa;">'+(r.nick||'-')+'</td>'
        + '<td style="text-align:left;padding-left:12px;">'
        +   '<a class="iqd-title-link" data-id="'+r.id+'" style="color:#60a5fa;cursor:pointer;text-decoration:underline;">'+(r.title||'(제목 없음)')+'</a>'
        + '</td>'
        + '<td style="text-align:center;"><span style="color:#4ade80;font-weight:700;">완료</span></td>'
        + '<td style="color:#aaa;font-size:0.75rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+inqPreview(r.answer, 40)+'</td>'
        + '<td style="font-size:0.75rem;color:var(--text2);white-space:nowrap;">'+(r.answeredAt||'-')+'</td>'
        + '</tr>';
    }).join('');

    document.querySelectorAll('.iqd-title-link').forEach(function(a) {
      a.addEventListener('click', async function() {
        var all = await apiInquiries();
        var item = all.find(function(r){ return r.id === this.dataset.id; }.bind(this));
        if(item) openInquiryViewModal(item);
      });
    });
  }

  document.getElementById('iqd-search-btn').addEventListener('click', refresh);
  bindDatePresets('iqd-preset', 'iqd-from', 'iqd-to', refresh);
  refresh();
}

// ══════════════════════════════════════
//  문의 내용 보기 모달
// ══════════════════════════════════════
function openInquiryViewModal(item) {
  var existing = document.getElementById('inq-view-overlay');
  if(existing) existing.remove();

  var answerSection = '';
  if(item.status === 'done' && item.answer) {
    answerSection =
      '<div style="margin-top:20px;border-top:1px solid #333;padding-top:16px;">' +
      '  <div style="font-size:0.78rem;color:#888;margin-bottom:6px;">답변 · ' + (item.answeredAt||'-') + '</div>' +
      '  <div style="white-space:pre-wrap;line-height:1.7;color:#4ade80;background:#0d1f14;border:1px solid #1f4530;border-radius:6px;padding:12px 14px;font-size:0.82rem;">'
      +   item.answer.replace(/</g,'&lt;').replace(/>/g,'&gt;')
      + '</div></div>';
  }

  var overlay = document.createElement('div');
  overlay.id = 'inq-view-overlay';
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML =
    '<div class="pt-modal" style="width:620px;max-width:95vw;">' +
    '  <div class="pt-modal-header"><span>'+(item.title||'(제목 없음)')+'</span><button class="pt-modal-close" id="inqv-close">✕</button></div>' +
    '  <div class="pt-modal-body"><div class="pt-modal-section">' +
    '    <div style="display:flex;gap:16px;font-size:0.75rem;color:#888;margin-bottom:12px;">' +
    '      <span>작성자: <b style="color:#f59e0b;">'+(item.userId||'-')+'</b></span>' +
    '      <span>닉네임: '+(item.nick||'-')+'</span>' +
    '      <span>신청일시: '+(item.datetime||'-')+'</span>' +
    '    </div>' +
    '    <div style="white-space:pre-wrap;line-height:1.7;color:var(--text1);background:#111;border:1px solid #2a2a2a;border-radius:6px;padding:14px;font-size:0.83rem;min-height:80px;">'
    +     (item.content||'내용이 없습니다.').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    +   '</div>'
    +   answerSection
    + '</div></div></div>';
  document.body.appendChild(overlay);

  document.getElementById('inqv-close').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
}

// ══════════════════════════════════════
//  답변 입력 모달 (고정답변 선택 포함)
// ══════════════════════════════════════
function openInquiryReplyModal(item, onSaved) {
  var existing = document.getElementById('inq-reply-overlay');
  if(existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'inq-reply-overlay';
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML =
    '<div class="pt-modal" style="width:640px;max-width:95vw;">' +
    '  <div class="pt-modal-header"><span>답변하기</span><button class="pt-modal-close" id="inqr-close">✕</button></div>' +
    '  <div class="pt-modal-body"><div class="pt-modal-section">' +
    '    <div style="font-size:0.8rem;color:#888;margin-bottom:4px;">문의자: <b style="color:#f59e0b;">'+(item.userId||'-')+'</b> ('+(item.nick||'-')+')  ·  '+(item.datetime||'-')+'</div>' +
    '    <div style="font-size:0.9rem;font-weight:700;color:var(--text1);margin-bottom:10px;">'+(item.title||'(제목 없음)')+'</div>' +
    '    <div style="white-space:pre-wrap;line-height:1.6;color:#ccc;background:#111;border:1px solid #2a2a2a;border-radius:6px;padding:12px;font-size:0.82rem;margin-bottom:18px;max-height:160px;overflow-y:auto;">'
    +     (item.content||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    +   '</div>' +
    '    <div class="pt-modal-field">' +
    '      <label style="display:block;margin-bottom:6px;font-size:0.8rem;color:#aaa;">고정답변 선택</label>' +
    '      <select id="inqr-quick" style="width:100%;padding:8px 10px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:0.82rem;margin-bottom:12px;cursor:pointer;">' +
    '        <option value="">-- 고정답변을 선택하세요 --</option>' +
    '      </select>' +
    '    </div>' +
    '    <div class="pt-modal-field">' +
    '      <label style="display:block;margin-bottom:6px;font-size:0.8rem;color:#aaa;">답변 내용</label>' +
    '      <textarea id="inqr-answer" class="pt-modal-input" rows="6" placeholder="답변 내용을 입력하세요." style="resize:vertical;width:100%;font-family:inherit;font-size:0.83rem;"></textarea>' +
    '    </div>' +
    '    <div class="pt-modal-actions" style="margin-top:16px;display:flex;gap:8px;">' +
    '      <button class="pt-action-btn pt-btn-green" id="inqr-save" style="padding:7px 32px;">저장</button>' +
    '      <button class="pt-action-btn pt-btn-gray" id="inqr-cancel" style="padding:7px 20px;background:#4b5563;">취소</button>' +
    '    </div>' +
    '  </div></div></div>';
  document.body.appendChild(overlay);

  // 고정답변 목록 로드
  fetch('/api/admin/quickreplies').then(function(r){ return r.json(); }).then(function(data) {
    var list = (data.data || []);
    var sel = document.getElementById('inqr-quick');
    list.forEach(function(qr) {
      var opt = document.createElement('option');
      opt.value = qr.content;
      opt.textContent = qr.title;
      sel.appendChild(opt);
    });
  });

  // 고정답변 선택 시 내용 삽입
  document.getElementById('inqr-quick').addEventListener('change', function() {
    if(this.value) document.getElementById('inqr-answer').value = this.value;
  });

  document.getElementById('inqr-close').addEventListener('click',  function(){ overlay.remove(); });
  document.getElementById('inqr-cancel').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });

  document.getElementById('inqr-save').addEventListener('click', async function() {
    var answer = document.getElementById('inqr-answer').value.trim();
    if(!answer) { alert('답변 내용을 입력하세요.'); return; }
    var res = await fetch('/api/admin/inquiries/' + item.id + '/reply', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: answer, answeredAt: inqNowStr() })
    });
    var data = await res.json();
    if(!data.success) { alert('저장 실패: ' + (data.error||'')); return; }
    overlay.remove();
    if(typeof onSaved === 'function') onSaved();
  });
}

// ══════════════════════════════════════
//  고정답변 관리 페이지
// ══════════════════════════════════════
function renderQuickReplyPage() {
  document.getElementById('content').innerHTML =
    '<div class="pt-wrap">' +
    '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
    '    <div style="font-size:0.85rem;color:var(--text2);">등록된 고정답변: <b style="color:var(--text);" id="qr-count">0</b>건</div>' +
    '    <button class="pt-action-btn pt-btn-green" id="qr-add-btn" style="padding:6px 18px;font-size:0.8rem;"><i class="fas fa-plus" style="margin-right:5px;"></i>고정답변 추가</button>' +
    '  </div>' +
    '  <div class="db-section" style="margin-bottom:0;overflow-x:auto;">' +
    '    <table class="db-table" style="font-size:0.8rem;">' +
    '      <thead><tr>' +
    '        <th style="width:50px;">#</th>' +
    '        <th style="width:200px;">제목</th>' +
    '        <th>답변 내용</th>' +
    '        <th style="width:160px;">등록일</th>' +
    '        <th style="width:120px;text-align:center;">관리</th>' +
    '      </tr></thead>' +
    '      <tbody id="qr-tbody"></tbody>' +
    '    </table>' +
    '  </div>' +
    '</div>';

  function refresh() {
    fetch('/api/admin/quickreplies').then(function(r){ return r.json(); }).then(function(data) {
      var list = data.data || [];
      document.getElementById('qr-count').textContent = list.length;
      if(!list.length) {
        document.getElementById('qr-tbody').innerHTML = '<tr><td colspan="5" style="color:#888;padding:24px;text-align:center;">등록된 고정답변이 없습니다.</td></tr>';
        return;
      }
      document.getElementById('qr-tbody').innerHTML = list.map(function(r, i) {
        var date = r.createdAt ? r.createdAt.slice(0,10) + ' ' + r.createdAt.slice(11,16) : '-';
        var preview = (r.content||'').length > 60 ? r.content.slice(0,60) + '...' : (r.content||'-');
        return '<tr>' +
          '<td style="color:#888;">'+(i+1)+'</td>' +
          '<td style="color:#60a5fa;font-weight:600;">'+(r.title||'-').replace(/</g,'&lt;')+'</td>' +
          '<td style="color:#aaa;font-size:0.78rem;">'+preview.replace(/</g,'&lt;')+'</td>' +
          '<td style="color:var(--text2);font-size:0.75rem;">'+date+'</td>' +
          '<td style="text-align:center;">' +
          '  <button class="pt-action-btn pt-btn-blue qr-edit-btn" data-id="'+r.id+'" style="padding:3px 10px;font-size:0.72rem;margin-right:4px;">수정</button>' +
          '  <button class="pt-action-btn pt-btn-red qr-del-btn" data-id="'+r.id+'" style="padding:3px 10px;font-size:0.72rem;">삭제</button>' +
          '</td></tr>';
      }).join('');

      // 수정 버튼
      document.querySelectorAll('.qr-edit-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var item = list.find(function(r){ return r.id === btn.dataset.id; });
          if(item) openQuickReplyModal(item, refresh);
        });
      });

      // 삭제 버튼
      document.querySelectorAll('.qr-del-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          if(!confirm('이 고정답변을 삭제하시겠습니까?')) return;
          await fetch('/api/admin/quickreplies/' + btn.dataset.id, { method: 'DELETE' });
          refresh();
        });
      });
    });
  }

  // 추가 버튼
  document.getElementById('qr-add-btn').addEventListener('click', function() {
    openQuickReplyModal(null, refresh);
  });

  refresh();
}

// ══════════════════════════════════════
//  고정답변 추가/수정 모달
// ══════════════════════════════════════
function openQuickReplyModal(item, onSaved) {
  var existing = document.getElementById('qr-modal-overlay');
  if(existing) existing.remove();

  var isEdit = !!item;
  var overlay = document.createElement('div');
  overlay.id = 'qr-modal-overlay';
  overlay.className = 'pt-modal-overlay';
  overlay.innerHTML =
    '<div class="pt-modal" style="width:560px;max-width:95vw;">' +
    '  <div class="pt-modal-header"><span>'+(isEdit ? '고정답변 수정' : '고정답변 추가')+'</span><button class="pt-modal-close" id="qrm-close">✕</button></div>' +
    '  <div class="pt-modal-body"><div class="pt-modal-section">' +
    '    <div class="pt-modal-field">' +
    '      <label style="display:block;margin-bottom:6px;font-size:0.8rem;color:#aaa;">제목 (관리용)</label>' +
    '      <input type="text" id="qrm-title" class="pt-modal-input" placeholder="예: 입금 안내, 점검 안내" value="'+(isEdit ? (item.title||'').replace(/"/g,'&quot;') : '')+'" style="width:100%;font-size:0.85rem;">' +
    '    </div>' +
    '    <div class="pt-modal-field" style="margin-top:14px;">' +
    '      <label style="display:block;margin-bottom:6px;font-size:0.8rem;color:#aaa;">답변 내용</label>' +
    '      <textarea id="qrm-content" class="pt-modal-input" rows="8" placeholder="고정답변 내용을 입력하세요." style="resize:vertical;width:100%;font-family:inherit;font-size:0.83rem;">'+(isEdit ? (item.content||'').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '')+'</textarea>' +
    '    </div>' +
    '    <div class="pt-modal-actions" style="margin-top:16px;display:flex;gap:8px;">' +
    '      <button class="pt-action-btn pt-btn-green" id="qrm-save" style="padding:7px 32px;">'+(isEdit ? '수정' : '추가')+'</button>' +
    '      <button class="pt-action-btn pt-btn-gray" id="qrm-cancel" style="padding:7px 20px;background:#4b5563;">취소</button>' +
    '    </div>' +
    '  </div></div></div>';
  document.body.appendChild(overlay);

  document.getElementById('qrm-close').addEventListener('click', function(){ overlay.remove(); });
  document.getElementById('qrm-cancel').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });

  document.getElementById('qrm-save').addEventListener('click', async function() {
    var title   = document.getElementById('qrm-title').value.trim();
    var content = document.getElementById('qrm-content').value.trim();
    if(!title)   { alert('제목을 입력하세요.'); return; }
    if(!content) { alert('답변 내용을 입력하세요.'); return; }

    if(isEdit) {
      await fetch('/api/admin/quickreplies/' + item.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, content: content })
      });
    } else {
      await fetch('/api/admin/quickreplies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, content: content })
      });
    }
    overlay.remove();
    if(typeof onSaved === 'function') onSaved();
  });
}

// ══════════════════════════════════════
//  쪽지보내기 페이지
// ══════════════════════════════════════
var _msgTree = [];
var _msgUsers = [];
var _msgSelected = new Set();

function renderMessagePage() {
  Promise.all([
    fetch('/api/admin/partner-tree').then(function(r){ return r.json(); }),
    fetch('/api/admin/users').then(function(r){ return r.json(); })
  ]).then(function(results) {
    _msgTree = results[0].data || results[0] || [];
    _msgUsers = (results[1].data || results[1] || []);
    _msgSelected = new Set();
    _renderMessageInner();
  });
}

function _renderMessageInner() {
  document.getElementById('content').innerHTML =
    '<div class="pt-wrap" style="display:flex;gap:20px;min-height:500px;">' +
    '  <div style="flex:0 0 300px;background:var(--bg2,#111827);border:1px solid var(--border,#1e293b);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;">' +
    '    <div style="padding:12px 14px;border-bottom:1px solid var(--border,#1e293b);font-size:0.85rem;font-weight:700;color:var(--primary,#818cf8);">' +
    '      <i class="fas fa-sitemap" style="margin-right:6px;"></i>수신자 선택' +
    '    </div>' +
    '    <div style="padding:8px 10px;border-bottom:1px solid var(--border,#1e293b);display:flex;gap:6px;flex-wrap:wrap;">' +
    '      <button class="pt-action-btn msg-group-btn" data-group="all" style="padding:3px 10px;font-size:0.72rem;background:#6366f1;color:#fff;border:none;border-radius:4px;cursor:pointer;">전체</button>' +
    '      <button class="pt-action-btn msg-group-btn" data-group="partner" style="padding:3px 10px;font-size:0.72rem;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:4px;cursor:pointer;">파트너전체</button>' +
    '      <button class="pt-action-btn msg-group-btn" data-group="member" style="padding:3px 10px;font-size:0.72rem;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:4px;cursor:pointer;">회원전체</button>' +
    '      <button class="pt-action-btn msg-group-btn" data-group="clear" style="padding:3px 10px;font-size:0.72rem;background:#1e293b;color:#f87171;border:1px solid #334155;border-radius:4px;cursor:pointer;">초기화</button>' +
    '    </div>' +
    '    <div id="msg-tree" style="flex:1;overflow-y:auto;padding:6px 0;font-size:0.8rem;max-height:400px;"></div>' +
    '    <div style="padding:8px 14px;border-top:1px solid var(--border,#1e293b);font-size:0.75rem;color:#888;">선택됨: <b style="color:#60a5fa;" id="msg-sel-count">0</b>명</div>' +
    '  </div>' +
    '  <div style="flex:1;display:flex;flex-direction:column;gap:14px;">' +
    '    <div style="background:var(--bg2,#111827);border:1px solid var(--border,#1e293b);border-radius:8px;padding:20px;">' +
    '      <div style="font-size:0.85rem;font-weight:700;color:var(--primary,#818cf8);margin-bottom:16px;"><i class="fas fa-envelope" style="margin-right:6px;"></i>쪽지 작성</div>' +
    '      <div style="margin-bottom:12px;">' +
    '        <label style="display:block;font-size:0.78rem;color:#aaa;margin-bottom:6px;">선택된 수신자</label>' +
    '        <div id="msg-recipients" style="min-height:36px;padding:8px 12px;background:#0f172a;border:1px solid #334155;border-radius:6px;font-size:0.78rem;color:#94a3b8;line-height:1.8;">수신자를 선택하세요</div>' +
    '      </div>' +
    '      <div style="margin-bottom:12px;">' +
    '        <label style="display:block;font-size:0.78rem;color:#aaa;margin-bottom:6px;">제목</label>' +
    '        <input type="text" id="msg-title" placeholder="쪽지 제목을 입력하세요" style="width:100%;box-sizing:border-box;padding:10px 14px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:0.85rem;">' +
    '      </div>' +
    '      <div style="margin-bottom:16px;">' +
    '        <label style="display:block;font-size:0.78rem;color:#aaa;margin-bottom:6px;">내용</label>' +
    '        <textarea id="msg-content" rows="8" placeholder="쪽지 내용을 입력하세요" style="width:100%;box-sizing:border-box;padding:10px 14px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:0.85rem;resize:vertical;font-family:inherit;"></textarea>' +
    '      </div>' +
    '      <div style="display:flex;gap:10px;">' +
    '        <button class="pt-action-btn pt-btn-green" id="msg-send-btn" style="padding:8px 32px;font-size:0.85rem;"><i class="fas fa-paper-plane" style="margin-right:6px;"></i>발송</button>' +
    '      </div>' +
    '      <div id="msg-result" style="display:none;margin-top:12px;padding:10px 14px;border-radius:6px;font-size:0.8rem;"></div>' +
    '    </div>' +
    '    <div style="background:var(--bg2,#111827);border:1px solid var(--border,#1e293b);border-radius:8px;padding:16px;">' +
    '      <div style="font-size:0.85rem;font-weight:700;color:var(--primary,#818cf8);margin-bottom:12px;"><i class="fas fa-history" style="margin-right:6px;"></i>최근 발송 내역</div>' +
    '      <div id="msg-history" style="font-size:0.8rem;color:#888;">로딩중...</div>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  _renderMsgTree();
  _loadMsgHistory();

  // 그룹 선택 버튼
  document.querySelectorAll('.msg-group-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var group = btn.dataset.group;
      if(group === 'clear') {
        _msgSelected.clear();
      } else if(group === 'all') {
        _getAllPartnerIds(_msgTree).forEach(function(id){ if(id !== 'admin') _msgSelected.add(id); });
        _msgUsers.forEach(function(u){ _msgSelected.add(u.username); });
      } else if(group === 'partner') {
        _getAllPartnerIds(_msgTree).forEach(function(id){ if(id !== 'admin') _msgSelected.add(id); });
      } else if(group === 'member') {
        _msgUsers.forEach(function(u){ _msgSelected.add(u.username); });
      }
      _renderMsgTree();
      _updateMsgRecipients();
    });
  });

  // 발송 버튼
  document.getElementById('msg-send-btn').addEventListener('click', _sendMessage);
}

function _getAllPartnerIds(nodes) {
  var ids = [];
  (nodes || []).forEach(function(n) {
    ids.push(n.id);
    if(n.children) ids = ids.concat(_getAllPartnerIds(n.children));
  });
  return ids;
}

function _renderMsgTree() {
  var levelLabel = { admin:'관리자', head:'본사', subhead:'부본사', distributor:'총판', store:'매장' };
  var levelColor = { admin:'#8b5cf6', head:'#3b82f6', subhead:'#06b6d4', distributor:'#f59e0b', store:'#10b981' };
  var memberColor = '#6b7280';

  function buildNode(nodes, depth) {
    return (nodes || []).map(function(node) {
      if(node.id === 'admin') {
        return node.children ? buildNode(node.children, depth) : '';
      }
      var color = levelColor[node.level] || '#888';
      var lbl = levelLabel[node.level] || node.level;
      var checked = _msgSelected.has(node.id) ? ' checked' : '';
      var hasChildren = node.children && node.children.length > 0;

      var row = '<div style="display:flex;align-items:center;padding:3px 8px 3px '+(depth*16+8)+'px;cursor:pointer;" class="msg-tree-node" data-id="'+node.id+'">' +
        '<input type="checkbox" class="msg-chk" data-id="'+node.id+'"'+checked+' style="accent-color:'+color+';margin-right:6px;cursor:pointer;">' +
        '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:'+color+';color:#fff;font-size:0.6rem;text-align:center;line-height:16px;margin-right:6px;">'+lbl.charAt(0)+'</span>' +
        '<span style="color:var(--text,#e2e8f0);font-size:0.8rem;">'+node.label+'</span>' +
        '</div>';

      var children = hasChildren ? buildNode(node.children, depth + 1) : '';
      return row + children;
    }).join('');
  }

  var html = '<div style="padding:4px 8px;font-size:0.7rem;color:#64748b;font-weight:600;margin-top:4px;">파트너</div>';
  html += buildNode(_msgTree, 0);

  if(_msgUsers.length) {
    html += '<div style="padding:4px 8px;font-size:0.7rem;color:#64748b;font-weight:600;margin-top:8px;border-top:1px solid #1e293b;padding-top:8px;">회원</div>';
    _msgUsers.forEach(function(u) {
      var checked = _msgSelected.has(u.username) ? ' checked' : '';
      html += '<div style="display:flex;align-items:center;padding:3px 8px 3px 24px;cursor:pointer;" class="msg-tree-node" data-id="'+u.username+'">' +
        '<input type="checkbox" class="msg-chk" data-id="'+u.username+'"'+checked+' style="accent-color:'+memberColor+';margin-right:6px;cursor:pointer;">' +
        '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:'+memberColor+';color:#fff;font-size:0.6rem;text-align:center;line-height:16px;margin-right:6px;">회</span>' +
        '<span style="color:var(--text,#e2e8f0);font-size:0.8rem;">'+u.username+'</span>' +
        '<span style="color:#555;font-size:0.7rem;margin-left:6px;">('+u.nickname+')</span>' +
        '</div>';
    });
  }

  document.getElementById('msg-tree').innerHTML = html;

  document.querySelectorAll('.msg-chk').forEach(function(chk) {
    chk.addEventListener('change', function() {
      if(chk.checked) _msgSelected.add(chk.dataset.id); else _msgSelected.delete(chk.dataset.id);
      _updateMsgRecipients();
    });
  });

  document.querySelectorAll('.msg-tree-node').forEach(function(row) {
    row.addEventListener('click', function(e) {
      if(e.target.tagName === 'INPUT') return;
      var chk = row.querySelector('.msg-chk');
      chk.checked = !chk.checked;
      if(chk.checked) _msgSelected.add(chk.dataset.id); else _msgSelected.delete(chk.dataset.id);
      _updateMsgRecipients();
    });
  });

  _updateMsgRecipients();
}

function _updateMsgRecipients() {
  var count = _msgSelected.size;
  var el = document.getElementById('msg-sel-count');
  if(el) el.textContent = count;

  var recEl = document.getElementById('msg-recipients');
  if(!recEl) return;

  if(count === 0) {
    recEl.innerHTML = '<span style="color:#64748b;">수신자를 선택하세요</span>';
    return;
  }

  var arr = Array.from(_msgSelected);
  if(arr.length > 10) {
    recEl.innerHTML = arr.slice(0, 10).map(function(id) {
      return '<span style="display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:4px;padding:2px 8px;margin:2px;font-size:0.72rem;color:#60a5fa;">'+id+'</span>';
    }).join('') + '<span style="color:#888;font-size:0.72rem;margin-left:4px;">외 '+(arr.length-10)+'명</span>';
  } else {
    recEl.innerHTML = arr.map(function(id) {
      return '<span style="display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:4px;padding:2px 8px;margin:2px;font-size:0.72rem;color:#60a5fa;">'+id+'</span>';
    }).join('');
  }
}

async function _sendMessage() {
  var title   = document.getElementById('msg-title').value.trim();
  var content = document.getElementById('msg-content').value.trim();
  var resultEl = document.getElementById('msg-result');

  if(_msgSelected.size === 0) { alert('수신자를 선택하세요.'); return; }
  if(!title) { alert('제목을 입력하세요.'); return; }
  if(!content) { alert('내용을 입력하세요.'); return; }

  if(!confirm(_msgSelected.size + '명에게 쪽지를 발송하시겠습니까?')) return;

  var targets = Array.from(_msgSelected);
  var success = 0, fail = 0;

  for(var i = 0; i < targets.length; i++) {
    try {
      var res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targets[i], title: title, content: content })
      });
      var data = await res.json();
      if(data.success) success++; else fail++;
    } catch(e) { fail++; }
  }

  resultEl.style.display = 'block';
  if(fail === 0) {
    resultEl.style.background = 'rgba(74,222,128,0.1)';
    resultEl.style.border = '1px solid rgba(74,222,128,0.3)';
    resultEl.style.color = '#4ade80';
    resultEl.textContent = success + '명에게 쪽지를 발송했습니다.';
  } else {
    resultEl.style.background = 'rgba(251,191,36,0.1)';
    resultEl.style.border = '1px solid rgba(251,191,36,0.3)';
    resultEl.style.color = '#fbbf24';
    resultEl.textContent = '성공: ' + success + '건, 실패: ' + fail + '건';
  }

  document.getElementById('msg-title').value = '';
  document.getElementById('msg-content').value = '';
  _msgSelected.clear();
  _renderMsgTree();
  _loadMsgHistory();
}

function _loadMsgHistory() {
  fetch('/api/admin/messages').then(function(r){ return r.json(); }).then(function(data) {
    var list = (data.data || []).slice(0, 20);
    var el = document.getElementById('msg-history');
    if(!el) return;
    if(!list.length) {
      el.innerHTML = '<div style="color:#555;text-align:center;padding:12px;">발송 내역이 없습니다.</div>';
      return;
    }
    el.innerHTML = '<table class="db-table" style="font-size:0.78rem;"><thead><tr>' +
      '<th>#</th><th>수신자</th><th>제목</th><th>발송일시</th><th style="text-align:center;">삭제</th>' +
      '</tr></thead><tbody>' +
      list.map(function(m, i) {
        var date = m.createdAt ? m.createdAt.slice(0,10)+' '+m.createdAt.slice(11,16) : '-';
        return '<tr>' +
          '<td style="color:#888;">'+(i+1)+'</td>' +
          '<td style="color:#60a5fa;">'+m.userId+'</td>' +
          '<td style="color:#aaa;">'+(m.title||'-')+'</td>' +
          '<td style="color:var(--text2);font-size:0.72rem;">'+date+'</td>' +
          '<td style="text-align:center;"><button class="pt-action-btn pt-btn-red msg-del-btn" data-id="'+m.id+'" style="padding:2px 8px;font-size:0.68rem;">삭제</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

    document.querySelectorAll('.msg-del-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if(!confirm('이 쪽지를 삭제하시겠습니까?')) return;
        await fetch('/api/admin/messages/' + btn.dataset.id, { method: 'DELETE' });
        _loadMsgHistory();
      });
    });
  });
}
