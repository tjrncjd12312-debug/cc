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
//  답변 입력 모달
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
    '      <label style="display:block;margin-bottom:6px;font-size:0.8rem;color:#aaa;">답변 내용</label>' +
    '      <textarea id="inqr-answer" class="pt-modal-input" rows="6" placeholder="답변 내용을 입력하세요." style="resize:vertical;width:100%;font-family:inherit;font-size:0.83rem;"></textarea>' +
    '    </div>' +
    '    <div class="pt-modal-actions" style="margin-top:16px;display:flex;gap:8px;">' +
    '      <button class="pt-action-btn pt-btn-green" id="inqr-save" style="padding:7px 32px;">저장</button>' +
    '      <button class="pt-action-btn pt-btn-gray" id="inqr-cancel" style="padding:7px 20px;background:#4b5563;">취소</button>' +
    '    </div>' +
    '  </div></div></div>';
  document.body.appendChild(overlay);

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
