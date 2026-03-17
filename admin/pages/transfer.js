// ══════════════════════════════════════
//  충환전 관리 페이지  (서버 API 연동)
// ══════════════════════════════════════

// ── API 헬퍼 ──
async function apiTransfers(params) {
  showLoading('transferRefresh');
  var qs = Object.keys(params||{}).map(function(k){ return k+'='+encodeURIComponent(params[k]); }).join('&');
  var res = await fetch('/api/admin/transfers' + (qs ? '?'+qs : ''));
  var data = (await res.json()).data || [];
  hideLoading();
  return data;
}
async function apiTransferAction(id, action) {
  var res = await fetch('/api/admin/transfers/'+id+'/'+action, { method:'PATCH' });
  return await res.json();
}

// ── 현재 시각 문자열 ──
function trNowStr() {
  var d = new Date(), p = function(n){ return String(n).padStart(2,'0'); };
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
}

// ── 상태 뱃지 HTML ──
function trStatusBadge(status) {
  if(status === 'approved') return '<span style="color:#4ade80;font-weight:700;">승인</span>';
  if(status === 'rejected') return '<span style="color:#f87171;font-weight:700;">거절</span>';
  return '<span style="color:#fbbf24;font-weight:700;">대기</span>';
}

// ══════════════════════════════════════
//  충전 신청 (pending)
// ══════════════════════════════════════
function renderTransferDepositReq() {
  var today = _dfLocalDate(new Date());

  document.getElementById('content').innerHTML =
    '<div class="pt-wrap">' +
    '  <div class="date-filter-bar">' +
    '    <div class="df-search-box" style="flex:0 0 180px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="tdr-search" placeholder="회원ID 검색"></div>' +
    '    <button class="df-preset active tdr-preset" data-preset="today">오늘</button>' +
    '    <button class="df-preset tdr-preset" data-preset="yesterday">어제</button>' +
    '    <button class="df-preset tdr-preset" data-preset="week">이번주</button>' +
    '    <button class="df-preset tdr-preset" data-preset="month">이번달</button>' +
    '    <button class="df-preset tdr-preset" data-preset="all">전체</button>' +
    '    <div class="df-date-range">' +
    '      <input type="date" id="tdr-from" value="' + today + '">' +
    '      <span style="color:var(--text3);font-size:0.72rem;">~</span>' +
    '      <input type="date" id="tdr-to" value="' + today + '">' +
    '      <button class="df-query-btn" id="tdr-search-btn">조회</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="db-section" style="margin-bottom:0;overflow-x:auto;">' +
    '    <table class="db-table" style="font-size:0.8rem;">' +
    '      <thead><tr>' +
    '        <th>#</th><th>신청일시</th><th>회원ID</th><th>닉네임</th>' +
    '        <th>은행</th><th>예금주</th><th>계좌번호</th>' +
    '        <th style="text-align:right;">금액</th><th>메모</th>' +
    '        <th style="text-align:center;">승인</th><th style="text-align:center;">거절</th>' +
    '      </tr></thead>' +
    '      <tbody id="tdr-tbody"></tbody>' +
    '    </table>' +
    '  </div>' +
    '  <div style="margin-top:10px;font-size:0.78rem;color:var(--text2);">총 <b style="color:var(--text);" id="tdr-count">0</b> 건</div>' +
    '</div>';

  async function refresh() {
    var keyword = document.getElementById('tdr-search').value.trim().toLowerCase();
    var from    = document.getElementById('tdr-from').value;
    var to      = document.getElementById('tdr-to').value;
    var list    = await apiTransfers({ type: 'deposit', status: 'pending' });
    list = list.filter(function(r) {
      if(keyword && !(r.userId||'').toLowerCase().includes(keyword) && !(r.nick||'').toLowerCase().includes(keyword)) return false;
      if(from && r.datetime < from) return false;
      if(to   && r.datetime > to + ' 99') return false;
      return true;
    });
    document.getElementById('tdr-count').textContent = list.length;
    if(!list.length) {
      document.getElementById('tdr-tbody').innerHTML = '<tr><td colspan="11" style="color:#888;padding:24px;text-align:center;">대기중인 충전 신청이 없습니다.</td></tr>';
      return;
    }
    document.getElementById('tdr-tbody').innerHTML = list.map(function(r, i) {
      return '<tr>'
        + '<td style="color:#888;">'+(i+1)+'</td>'
        + '<td style="font-size:0.75rem;white-space:nowrap;">'+(r.datetime||'-')+'</td>'
        + '<td style="color:#f59e0b;font-weight:600;">'+(r.userId||'-')+'</td>'
        + '<td style="color:#aaa;">'+(r.nick||'-')+'</td>'
        + '<td>'+(r.bank||'-')+'</td>'
        + '<td>'+(r.holder||'-')+'</td>'
        + '<td style="font-size:0.75rem;color:#aaa;">'+(r.account||'-')+'</td>'
        + '<td style="text-align:right;color:#4ade80;font-weight:700;">'+(r.amount||0).toLocaleString()+'</td>'
        + '<td style="color:#888;font-size:0.75rem;">'+(r.memo||'')+'</td>'
        + '<td style="text-align:center;"><button class="pt-action-btn pt-btn-green tdr-approve-btn" data-id="'+r.id+'" style="padding:3px 12px;font-size:0.75rem;">승인</button></td>'
        + '<td style="text-align:center;"><button class="pt-action-btn pt-btn-red tdr-reject-btn" data-id="'+r.id+'" style="padding:3px 12px;font-size:0.75rem;">거절</button></td>'
        + '</tr>';
    }).join('');

    document.querySelectorAll('.tdr-approve-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var ok = await customConfirm('충전 신청을 승인하시겠습니까?', {icon:'fa-check-circle', confirmText:'승인'});
        if(!ok) return;
        var r = await apiTransferAction(this.dataset.id, 'approve');
        if(!r.success) { alert(r.error||'처리 실패'); return; }
        refresh();
        if(typeof resetAlarmState==='function') resetAlarmState();
        if(typeof updateTopbarCountsWithAlarm==='function') updateTopbarCountsWithAlarm();
      });
    });
    document.querySelectorAll('.tdr-reject-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var ok = await customConfirm('충전 신청을 거절하시겠습니까?', {icon:'fa-times-circle', type:'danger', confirmText:'거절'});
        if(!ok) return;
        await apiTransferAction(this.dataset.id, 'reject');
        refresh();
        if(typeof resetAlarmState==='function') resetAlarmState();
        if(typeof updateTopbarCountsWithAlarm==='function') updateTopbarCountsWithAlarm();
      });
    });
  }

  document.getElementById('tdr-search-btn').addEventListener('click', refresh);
  bindDatePresets('tdr-preset', 'tdr-from', 'tdr-to', refresh);
  refresh();
}

// ══════════════════════════════════════
//  환전 신청 (pending)
// ══════════════════════════════════════
function renderTransferWithdrawReq() {
  var today = _dfLocalDate(new Date());

  document.getElementById('content').innerHTML =
    '<div class="pt-wrap">' +
    '  <div class="date-filter-bar">' +
    '    <div class="df-search-box" style="flex:0 0 180px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="twr-search" placeholder="회원ID 검색"></div>' +
    '    <button class="df-preset active twr-preset" data-preset="today">오늘</button>' +
    '    <button class="df-preset twr-preset" data-preset="yesterday">어제</button>' +
    '    <button class="df-preset twr-preset" data-preset="week">이번주</button>' +
    '    <button class="df-preset twr-preset" data-preset="month">이번달</button>' +
    '    <button class="df-preset twr-preset" data-preset="all">전체</button>' +
    '    <div class="df-date-range">' +
    '      <input type="date" id="twr-from" value="' + today + '">' +
    '      <span style="color:var(--text3);font-size:0.72rem;">~</span>' +
    '      <input type="date" id="twr-to" value="' + today + '">' +
    '      <button class="df-query-btn" id="twr-search-btn">조회</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="db-section" style="margin-bottom:0;overflow-x:auto;">' +
    '    <table class="db-table" style="font-size:0.8rem;">' +
    '      <thead><tr>' +
    '        <th>#</th><th>신청일시</th><th>회원ID</th><th>닉네임</th>' +
    '        <th>은행</th><th>예금주</th><th>계좌번호</th>' +
    '        <th style="text-align:right;">금액</th><th>메모</th>' +
    '        <th style="text-align:center;">승인</th><th style="text-align:center;">거절</th>' +
    '      </tr></thead>' +
    '      <tbody id="twr-tbody"></tbody>' +
    '    </table>' +
    '  </div>' +
    '  <div style="margin-top:10px;font-size:0.78rem;color:var(--text2);">총 <b style="color:var(--text);" id="twr-count">0</b> 건</div>' +
    '</div>';

  async function refresh() {
    var keyword = document.getElementById('twr-search').value.trim().toLowerCase();
    var from    = document.getElementById('twr-from').value;
    var to      = document.getElementById('twr-to').value;
    var list    = await apiTransfers({ type: 'withdraw', status: 'pending' });
    list = list.filter(function(r) {
      if(keyword && !(r.userId||'').toLowerCase().includes(keyword) && !(r.nick||'').toLowerCase().includes(keyword)) return false;
      if(from && r.datetime < from) return false;
      if(to   && r.datetime > to + ' 99') return false;
      return true;
    });
    document.getElementById('twr-count').textContent = list.length;
    if(!list.length) {
      document.getElementById('twr-tbody').innerHTML = '<tr><td colspan="11" style="color:#888;padding:24px;text-align:center;">대기중인 환전 신청이 없습니다.</td></tr>';
      return;
    }
    document.getElementById('twr-tbody').innerHTML = list.map(function(r, i) {
      return '<tr>'
        + '<td style="color:#888;">'+(i+1)+'</td>'
        + '<td style="font-size:0.75rem;white-space:nowrap;">'+(r.datetime||'-')+'</td>'
        + '<td style="color:#f59e0b;font-weight:600;">'+(r.userId||'-')+'</td>'
        + '<td style="color:#aaa;">'+(r.nick||'-')+'</td>'
        + '<td>'+(r.bank||'-')+'</td>'
        + '<td>'+(r.holder||'-')+'</td>'
        + '<td style="font-size:0.75rem;color:#aaa;">'+(r.account||'-')+'</td>'
        + '<td style="text-align:right;color:#f87171;font-weight:700;">'+(r.amount||0).toLocaleString()+'</td>'
        + '<td style="color:#888;font-size:0.75rem;">'+(r.memo||'')+'</td>'
        + '<td style="text-align:center;"><button class="pt-action-btn pt-btn-green twr-approve-btn" data-id="'+r.id+'" style="padding:3px 12px;font-size:0.75rem;">승인</button></td>'
        + '<td style="text-align:center;"><button class="pt-action-btn pt-btn-red twr-reject-btn" data-id="'+r.id+'" style="padding:3px 12px;font-size:0.75rem;">거절</button></td>'
        + '</tr>';
    }).join('');

    document.querySelectorAll('.twr-approve-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var ok = await customConfirm('환전 신청을 승인하시겠습니까?', {icon:'fa-check-circle', confirmText:'승인'});
        if(!ok) return;
        var r = await apiTransferAction(this.dataset.id, 'approve');
        if(!r.success) { alert(r.error||'처리 실패'); return; }
        refresh();
        if(typeof resetAlarmState==='function') resetAlarmState();
        if(typeof updateTopbarCountsWithAlarm==='function') updateTopbarCountsWithAlarm();
      });
    });
    document.querySelectorAll('.twr-reject-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var ok = await customConfirm('환전 신청을 거절하시겠습니까?', {icon:'fa-times-circle', type:'danger', confirmText:'거절'});
        if(!ok) return;
        await apiTransferAction(this.dataset.id, 'reject');
        refresh();
        if(typeof resetAlarmState==='function') resetAlarmState();
        if(typeof updateTopbarCountsWithAlarm==='function') updateTopbarCountsWithAlarm();
      });
    });
  }

  document.getElementById('twr-search-btn').addEventListener('click', refresh);
  bindDatePresets('twr-preset', 'twr-from', 'twr-to', refresh);
  refresh();
}

// ══════════════════════════════════════
//  충전 내역 (전체)
// ══════════════════════════════════════
function renderTransferDepositHist() {
  var today = _dfLocalDate(new Date());

  document.getElementById('content').innerHTML =
    '<div class="pt-wrap">' +
    '  <div class="date-filter-bar">' +
    '    <div class="df-search-box" style="flex:0 0 180px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="tdh-search" placeholder="회원ID 검색"></div>' +
    '    <select class="pt-create-select" id="tdh-status" style="width:110px;background:var(--bg);border:1px solid var(--input-border);color:var(--text1);border-radius:6px;padding:5px 8px;font-size:0.72rem;">' +
    '      <option value="">전체</option><option value="approved">승인</option>' +
    '      <option value="rejected">거절</option><option value="pending">대기</option>' +
    '    </select>' +
    '    <button class="df-preset active tdh-preset" data-preset="today">오늘</button>' +
    '    <button class="df-preset tdh-preset" data-preset="yesterday">어제</button>' +
    '    <button class="df-preset tdh-preset" data-preset="week">이번주</button>' +
    '    <button class="df-preset tdh-preset" data-preset="month">이번달</button>' +
    '    <button class="df-preset tdh-preset" data-preset="all">전체</button>' +
    '    <div class="df-date-range">' +
    '      <input type="date" id="tdh-from" value="' + today + '">' +
    '      <span style="color:var(--text3);font-size:0.72rem;">~</span>' +
    '      <input type="date" id="tdh-to" value="' + today + '">' +
    '      <button class="df-query-btn" id="tdh-search-btn">조회</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="db-section" style="margin-bottom:0;overflow-x:auto;">' +
    '    <table class="db-table" style="font-size:0.8rem;">' +
    '      <thead><tr>' +
    '        <th>처리일시</th><th>회원ID</th><th>닉네임</th>' +
    '        <th style="text-align:right;">금액</th><th style="text-align:center;">상태</th><th>메모</th>' +
    '      </tr></thead>' +
    '      <tbody id="tdh-tbody"></tbody>' +
    '    </table>' +
    '  </div>' +
    '  <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;">' +
    '    <span style="font-size:0.78rem;color:var(--text2);">총 <b style="color:var(--text);" id="tdh-count">0</b> 건</span>' +
    '    <div id="tdh-pagination" style="display:flex;gap:4px;"></div>' +
    '  </div>' +
    '</div>';

  var _tdhPage = 1, _tdhPerPage = 50;

  async function refresh() {
    var keyword = document.getElementById('tdh-search').value.trim().toLowerCase();
    var status  = document.getElementById('tdh-status').value;
    var from    = document.getElementById('tdh-from').value;
    var to      = document.getElementById('tdh-to').value;
    var params  = { type: 'deposit' };
    if(status) params.status = status;
    var list = await apiTransfers(params);
    list = list.filter(function(r) {
      if(keyword && !(r.userId||'').toLowerCase().includes(keyword) && !(r.nick||'').toLowerCase().includes(keyword)) return false;
      if(from && r.datetime < from) return false;
      if(to   && r.datetime > to + ' 99') return false;
      return true;
    });
    document.getElementById('tdh-count').textContent = list.length;
    var totalPages = Math.max(1, Math.ceil(list.length / _tdhPerPage));
    if(_tdhPage > totalPages) _tdhPage = totalPages;
    var pageItems = list.slice((_tdhPage - 1) * _tdhPerPage, _tdhPage * _tdhPerPage);

    if(!pageItems.length) {
      document.getElementById('tdh-tbody').innerHTML = '<tr><td colspan="6" style="color:#888;padding:24px;text-align:center;">충전 내역이 없습니다.</td></tr>';
      document.getElementById('tdh-pagination').innerHTML = '';
      return;
    }
    document.getElementById('tdh-tbody').innerHTML = pageItems.map(function(r) {
      return '<tr>'
        + '<td style="font-size:0.75rem;white-space:nowrap;">'+(r.datetime||'-')+'</td>'
        + '<td style="color:#f59e0b;font-weight:600;">'+(r.userId||'-')+'</td>'
        + '<td style="color:#aaa;">'+(r.nick||'-')+'</td>'
        + '<td style="text-align:right;color:#4ade80;font-weight:700;">'+(r.amount||0).toLocaleString()+'</td>'
        + '<td style="text-align:center;">'+trStatusBadge(r.status)+'</td>'
        + '<td style="color:#888;font-size:0.75rem;">'+(r.memo||'')+'</td>'
        + '</tr>';
    }).join('');
    // 페이지네이션
    if(totalPages > 1) {
      var pgStyle = 'padding:4px 10px;border-radius:4px;border:1px solid var(--border,#334155);font-size:0.72rem;cursor:pointer;';
      var html = '';
      if(_tdhPage > 1) html += '<button class="tdh-pg" data-p="'+(_tdhPage-1)+'" style="'+pgStyle+'background:var(--bg3,#1e293b);color:var(--text,#e2e8f0);">이전</button>';
      for(var p=1;p<=totalPages;p++) {
        html += '<button class="tdh-pg" data-p="'+p+'" style="'+pgStyle+'background:'+(p===_tdhPage?'#6366f1':'var(--bg3,#1e293b)')+';color:'+(p===_tdhPage?'#fff':'var(--text,#e2e8f0)')+';font-weight:'+(p===_tdhPage?'700':'400')+';">'+p+'</button>';
      }
      if(_tdhPage < totalPages) html += '<button class="tdh-pg" data-p="'+(_tdhPage+1)+'" style="'+pgStyle+'background:var(--bg3,#1e293b);color:var(--text,#e2e8f0);">다음</button>';
      document.getElementById('tdh-pagination').innerHTML = html;
      document.querySelectorAll('.tdh-pg').forEach(function(btn){ btn.addEventListener('click', function(){ _tdhPage = parseInt(btn.dataset.p); refresh(); }); });
    } else {
      document.getElementById('tdh-pagination').innerHTML = '';
    }
  }

  document.getElementById('tdh-search-btn').addEventListener('click', function(){ _tdhPage = 1; refresh(); });
  bindDatePresets('tdh-preset', 'tdh-from', 'tdh-to', function(){ _tdhPage = 1; refresh(); });
  refresh();
}

// ══════════════════════════════════════
//  환전 내역 (전체)
// ══════════════════════════════════════
function renderTransferWithdrawHist() {
  var today = _dfLocalDate(new Date());

  document.getElementById('content').innerHTML =
    '<div class="pt-wrap">' +
    '  <div class="date-filter-bar">' +
    '    <div class="df-search-box" style="flex:0 0 180px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="twh-search" placeholder="회원ID 검색"></div>' +
    '    <select class="pt-create-select" id="twh-status" style="width:110px;background:var(--bg);border:1px solid var(--input-border);color:var(--text1);border-radius:6px;padding:5px 8px;font-size:0.72rem;">' +
    '      <option value="">전체</option><option value="approved">승인</option>' +
    '      <option value="rejected">거절</option><option value="pending">대기</option>' +
    '    </select>' +
    '    <button class="df-preset active twh-preset" data-preset="today">오늘</button>' +
    '    <button class="df-preset twh-preset" data-preset="yesterday">어제</button>' +
    '    <button class="df-preset twh-preset" data-preset="week">이번주</button>' +
    '    <button class="df-preset twh-preset" data-preset="month">이번달</button>' +
    '    <button class="df-preset twh-preset" data-preset="all">전체</button>' +
    '    <div class="df-date-range">' +
    '      <input type="date" id="twh-from" value="' + today + '">' +
    '      <span style="color:var(--text3);font-size:0.72rem;">~</span>' +
    '      <input type="date" id="twh-to" value="' + today + '">' +
    '      <button class="df-query-btn" id="twh-search-btn">조회</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="db-section" style="margin-bottom:0;overflow-x:auto;">' +
    '    <table class="db-table" style="font-size:0.8rem;">' +
    '      <thead><tr>' +
    '        <th>처리일시</th><th>회원ID</th><th>닉네임</th>' +
    '        <th style="text-align:right;">금액</th><th style="text-align:center;">상태</th><th>메모</th>' +
    '      </tr></thead>' +
    '      <tbody id="twh-tbody"></tbody>' +
    '    </table>' +
    '  </div>' +
    '  <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;">' +
    '    <span style="font-size:0.78rem;color:var(--text2);">총 <b style="color:var(--text);" id="twh-count">0</b> 건</span>' +
    '    <div id="twh-pagination" style="display:flex;gap:4px;"></div>' +
    '  </div>' +
    '</div>';

  var _twhPage = 1, _twhPerPage = 50;

  async function refresh() {
    var keyword = document.getElementById('twh-search').value.trim().toLowerCase();
    var status  = document.getElementById('twh-status').value;
    var from    = document.getElementById('twh-from').value;
    var to      = document.getElementById('twh-to').value;
    var params  = { type: 'withdraw' };
    if(status) params.status = status;
    var list = await apiTransfers(params);
    list = list.filter(function(r) {
      if(keyword && !(r.userId||'').toLowerCase().includes(keyword) && !(r.nick||'').toLowerCase().includes(keyword)) return false;
      if(from && r.datetime < from) return false;
      if(to   && r.datetime > to + ' 99') return false;
      return true;
    });
    document.getElementById('twh-count').textContent = list.length;
    var totalPages = Math.max(1, Math.ceil(list.length / _twhPerPage));
    if(_twhPage > totalPages) _twhPage = totalPages;
    var pageItems = list.slice((_twhPage - 1) * _twhPerPage, _twhPage * _twhPerPage);

    if(!pageItems.length) {
      document.getElementById('twh-tbody').innerHTML = '<tr><td colspan="6" style="color:#888;padding:24px;text-align:center;">환전 내역이 없습니다.</td></tr>';
      document.getElementById('twh-pagination').innerHTML = '';
      return;
    }
    document.getElementById('twh-tbody').innerHTML = pageItems.map(function(r) {
      return '<tr>'
        + '<td style="font-size:0.75rem;white-space:nowrap;">'+(r.datetime||'-')+'</td>'
        + '<td style="color:#f59e0b;font-weight:600;">'+(r.userId||'-')+'</td>'
        + '<td style="color:#aaa;">'+(r.nick||'-')+'</td>'
        + '<td style="text-align:right;color:#f87171;font-weight:700;">'+(r.amount||0).toLocaleString()+'</td>'
        + '<td style="text-align:center;">'+trStatusBadge(r.status)+'</td>'
        + '<td style="color:#888;font-size:0.75rem;">'+(r.memo||'')+'</td>'
        + '</tr>';
    }).join('');
    // 페이지네이션
    if(totalPages > 1) {
      var pgStyle = 'padding:4px 10px;border-radius:4px;border:1px solid var(--border,#334155);font-size:0.72rem;cursor:pointer;';
      var html = '';
      if(_twhPage > 1) html += '<button class="twh-pg" data-p="'+(_twhPage-1)+'" style="'+pgStyle+'background:var(--bg3,#1e293b);color:var(--text,#e2e8f0);">이전</button>';
      for(var p=1;p<=totalPages;p++) {
        html += '<button class="twh-pg" data-p="'+p+'" style="'+pgStyle+'background:'+(p===_twhPage?'#6366f1':'var(--bg3,#1e293b)')+';color:'+(p===_twhPage?'#fff':'var(--text,#e2e8f0)')+';font-weight:'+(p===_twhPage?'700':'400')+';">'+p+'</button>';
      }
      if(_twhPage < totalPages) html += '<button class="twh-pg" data-p="'+(_twhPage+1)+'" style="'+pgStyle+'background:var(--bg3,#1e293b);color:var(--text,#e2e8f0);">다음</button>';
      document.getElementById('twh-pagination').innerHTML = html;
      document.querySelectorAll('.twh-pg').forEach(function(btn){ btn.addEventListener('click', function(){ _twhPage = parseInt(btn.dataset.p); refresh(); }); });
    } else {
      document.getElementById('twh-pagination').innerHTML = '';
    }
  }

  document.getElementById('twh-search-btn').addEventListener('click', function(){ _twhPage = 1; refresh(); });
  bindDatePresets('twh-preset', 'twh-from', 'twh-to', function(){ _twhPage = 1; refresh(); });
  refresh();
}
