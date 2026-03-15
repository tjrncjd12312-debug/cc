// ══════════════════════════════════════
//  베팅 내역 페이지 (전체 / 슬롯 / 카지노)
// ══════════════════════════════════════

function _betClassifyVendor(tx) {
  var v = '';
  try { v = ((tx.details && tx.details.game && (tx.details.game.vendor || tx.details.game.type)) || tx.vendor || tx.game_provider || '').toLowerCase(); } catch(e) {}
  if (!v) return 'casino';
  if (v.indexOf('pragmatic') !== -1 && v.indexOf('pragmatic_live') === -1 && v.indexOf('pragmaticlive') === -1) return 'slot';
  if (v.indexOf('slot') !== -1 || v.indexOf('habanero') !== -1 || v.indexOf('cq9') !== -1 || v.indexOf('jili') !== -1 || v === 'pg' || v.indexOf('pgsoft') !== -1 || v.indexOf('booongo') !== -1 || v.indexOf('netent') !== -1 || v.indexOf('relax') !== -1 || v.indexOf('nolimit') !== -1 || v.indexOf('hacksaw') !== -1) return 'slot';
  return 'casino';
}

var _bettingState = {
  page: 1,
  perPage: 500,
  filter: 'all', // 'all', 'slot', 'casino'
  loading: false
};

function renderBettingPage(filter) {
  _bettingState.filter = filter || 'all';
  _bettingState.page = 1;
  var el = document.getElementById('content');
  el.innerHTML = _buildBettingHTML();
  _bindBettingEvents();
  _fetchBettingData();
}

function _buildBettingHTML() {
  var filterLabel = _bettingState.filter === 'slot' ? '슬롯' : _bettingState.filter === 'casino' ? '카지노' : '전체';
  return '<div class="pt-wrap">'
    + '<div class="db-section" style="padding:16px 20px;">'
    // 필터 바
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">'
    +   '<div style="display:flex;align-items:center;gap:8px;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:6px 12px;flex:0 0 200px;">'
    +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    +     '<input type="text" id="bet-user-filter" placeholder="아이디 검색" style="background:none;border:none;color:var(--text,#e2e8f0);font-size:0.8rem;outline:none;width:100%;">'
    +   '</div>'
    +   '<div style="display:flex;align-items:center;gap:8px;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:6px 12px;flex:0 0 200px;">'
    +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    +     '<input type="text" id="bet-vendor-filter" placeholder="게임사 검색" style="background:none;border:none;color:var(--text,#e2e8f0);font-size:0.8rem;outline:none;width:100%;">'
    +   '</div>'
    +   '<button class="bet-date-preset" data-preset="today" style="background:#6366f1;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">오늘</button>'
    +   '<button class="bet-date-preset" data-preset="yesterday" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">어제</button>'
    +   '<button class="bet-date-preset" data-preset="week" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">이번주</button>'
    +   '<button class="bet-date-preset" data-preset="month" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">이번달</button>'
    +   '<button class="bet-date-preset" data-preset="lastmonth" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">저번달</button>'
    +   '<div style="margin-left:auto;display:flex;align-items:center;gap:6px;">'
    +     '<input type="date" id="bet-date-start" style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:4px 8px;border-radius:6px;font-size:0.72rem;outline:none;">'
    +     '<span style="color:#64748b;font-size:0.72rem;">~</span>'
    +     '<input type="date" id="bet-date-end" style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:4px 8px;border-radius:6px;font-size:0.72rem;outline:none;">'
    +     '<button id="bet-search-btn" style="background:#6366f1;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:0.72rem;cursor:pointer;font-weight:600;">조회</button>'
    +   '</div>'
    + '</div>'
    // 요약 정보
    + '<div id="bet-summary" style="display:flex;gap:20px;margin-bottom:12px;flex-wrap:wrap;"></div>'
    // 테이블
    + '<div style="overflow-x:auto;">'
    + '<table class="db-table mb-table" style="min-width:1200px;font-size:0.82rem;">'
    + '<thead><tr>'
    + '<th style="width:30px;">#</th>'
    + '<th>시간</th>'
    + '<th>유저</th>'
    + '<th>게임타입</th>'
    + '<th>프로바이더</th>'
    + '<th>게임사</th>'
    + '<th>게임명</th>'
    + '<th>베팅위치</th>'
    + '<th>라운드</th>'
    + '<th>베팅금</th>'
    + '<th>당첨금</th>'
    + '<th>손익</th>'
    + '<th>잔액(전)</th>'
    + '<th>잔액(후)</th>'
    + '<th>상태</th>'
    + '<th>공베팅</th>'
    + '</tr></thead>'
    + '<tbody id="bet-tbody"><tr><td colspan="16" style="color:#888;padding:24px;text-align:center;">데이터를 불러오는 중...</td></tr></tbody>'
    + '</table></div>'
    // 페이지네이션
    + '<div id="bet-pagination" style="display:flex;justify-content:center;gap:6px;margin-top:14px;"></div>'
    + '</div></div>';
}

function _betLocalDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function _bindBettingEvents() {
  // 기본 날짜 설정 (로컬 시간 기준)
  var todayStr = _betLocalDate(new Date());
  document.getElementById('bet-date-start').value = todayStr;
  document.getElementById('bet-date-end').value = todayStr;

  document.getElementById('bet-search-btn').addEventListener('click', function() {
    _bettingState.page = 1;
    _fetchBettingData();
  });

  // 검색 입력란 실시간 검색 (debounce 300ms)
  var _betSearchTimer = null;
  ['bet-user-filter', 'bet-vendor-filter'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', function() {
      clearTimeout(_betSearchTimer);
      _betSearchTimer = setTimeout(function() { _bettingState.page = 1; _fetchBettingData(); }, 300);
    });
  });

  // 프리셋 버튼 (오늘, 어제, 이번주, 이번달, 전체)
  document.querySelectorAll('.bet-date-preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var preset = btn.dataset.preset;
      var now = new Date();
      var startD = new Date();
      var endD = new Date();

      if (preset === 'today') {
        // 오늘
      } else if (preset === 'yesterday') {
        startD.setDate(startD.getDate() - 1);
        endD.setDate(endD.getDate() - 1);
      } else if (preset === 'week') {
        var day = startD.getDay();
        var diff = day === 0 ? 6 : day - 1;
        startD.setDate(startD.getDate() - diff);
      } else if (preset === 'month') {
        startD.setDate(1);
      } else if (preset === 'lastmonth') {
        startD = new Date(startD.getFullYear(), startD.getMonth() - 1, 1);
        endD = new Date(endD.getFullYear(), endD.getMonth(), 0);
      }

      document.getElementById('bet-date-start').value = _betLocalDate(startD);
      document.getElementById('bet-date-end').value = _betLocalDate(endD);

      // 활성 버튼 스타일
      document.querySelectorAll('.bet-date-preset').forEach(function(b) {
        b.style.background = '#1e293b'; b.style.color = '#94a3b8'; b.style.border = '1px solid #334155';
      });
      btn.style.background = '#6366f1'; btn.style.color = '#fff'; btn.style.border = 'none';

      _bettingState.page = 1;
      _fetchBettingData();
    });
  });
}

function _fetchBettingData() {
  if (_bettingState.loading) return;
  _bettingState.loading = true;

  var startDate = document.getElementById('bet-date-start').value;
  var endDate = document.getElementById('bet-date-end').value;
  var userFilter = (document.getElementById('bet-user-filter').value || '').trim().toLowerCase();
  var vendorFilter = (document.getElementById('bet-vendor-filter').value || '').trim().toLowerCase();

  // 날짜가 비어있으면 오늘로 설정
  if (!startDate) {
    startDate = _betLocalDate(new Date());
    document.getElementById('bet-date-start').value = startDate;
  }
  if (!endDate) {
    endDate = _betLocalDate(new Date());
    document.getElementById('bet-date-end').value = endDate;
  }

  var start = startDate + ' 00:00:00';
  var end = endDate + ' 23:59:59';

  var url = '/api/hl/transactions/local?page=' + _bettingState.page
    + '&perPage=' + _bettingState.perPage
    + '&order=desc'
    + '&types=bet,win'
    + '&start=' + encodeURIComponent(start)
    + '&end=' + encodeURIComponent(end);

  Promise.all([
    fetch(url).then(function(r) { return r.json(); }),
    fetch('/api/admin/emptybet/log').then(function(r) { return r.json(); }).catch(function() { return { data: [] }; })
  ]).then(function(results) {
      var res = results[0];
      var ebLog = results[1].data || [];
      var _ebTxIds = {};
      ebLog.forEach(function(eb) { if (eb.betTxId) _ebTxIds[eb.betTxId] = eb; });
      // roundId 기준으로도 매핑 (win 매칭용)
      var _ebRounds = {};
      ebLog.forEach(function(eb) { if (eb.roundId && eb.username) _ebRounds[eb.username + ':' + eb.roundId] = eb; });

      _bettingState.loading = false;

      var allData = res.data || [];

      // bet/win 타입만 필터 (에이전트 머니 이동 등 제외)
      var filtered = allData.filter(function(t) {
        return (t.type === 'bet' || t.type === 'win') && t.details && t.details.game;
      });

      // 게임 타입 필터 (slot / live)
      if (_bettingState.filter === 'slot') {
        filtered = filtered.filter(function(t) {
          return t.details.game.type === 'slot';
        });
      } else if (_bettingState.filter === 'casino') {
        filtered = filtered.filter(function(t) {
          return t.details.game.type !== 'slot';
        });
      }

      // 유저 필터
      if (userFilter) {
        filtered = filtered.filter(function(t) {
          return t.user && t.user.username && t.user.username.toLowerCase().indexOf(userFilter) >= 0;
        });
      }

      // 게임사 필터
      if (vendorFilter) {
        filtered = filtered.filter(function(t) {
          var v = (t.details && t.details.game && t.details.game.vendor) || '';
          return v.toLowerCase().indexOf(vendorFilter) >= 0;
        });
      }

      // 라운드별로 bet/win 매칭 → 한 줄로 합치기
      var roundMap = {};
      var roundOrder = [];
      filtered.forEach(function(t) {
        var round = (t.details && t.details.game && t.details.game.round) || t.id;
        if (!roundMap[round]) {
          roundMap[round] = { bet: 0, win: 0, tx: t, bets: [], wins: [] };
          roundOrder.push(round);
        }
        if (t.type === 'bet') {
          roundMap[round].bet += Math.abs(t.amount || 0);
          roundMap[round].bets.push(t);
          // 가장 이른 bet 트랜잭션 기준으로 정보 유지
          if (!roundMap[round].tx || t.type === 'bet') roundMap[round].tx = t;
        } else if (t.type === 'win') {
          roundMap[round].win += (t.amount || 0);
          roundMap[round].wins.push(t);
        }
      });

      // 공베팅 여부 표시
      roundOrder.forEach(function(round) {
        var r = roundMap[round];
        var isEmpty = false;
        // bet 트랜잭션 ID로 매칭
        r.bets.forEach(function(bt) {
          if (_ebTxIds[bt.id]) isEmpty = true;
        });
        // roundId + username으로 매칭
        if (!isEmpty && r.tx) {
          var uname = (r.tx.user && r.tx.user.username) || r.tx.username || '';
          if (uname && _ebRounds[uname + ':' + round]) isEmpty = true;
        }
        r.isEmpty = isEmpty;
      });

      // merged 배열 생성
      var merged = roundOrder.map(function(round) { return roundMap[round]; });

      // 요약 계산
      var totalBet = 0, totalWin = 0, betCount = 0;
      merged.forEach(function(r) {
        totalBet += r.bet;
        totalWin += r.win;
        betCount++;
      });

      // 롤링 계산 (본사 기준 통합 롤링%, 공베팅 포함)
      var _tree = [];
      try { _tree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(ex) {}
      // 본사(head) 노드의 롤링% 찾기
      var _headRoll = { slot: 0, casino: 0 };
      function _findHead(nodes) {
        if (!nodes) return;
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          if (n.level === 'head') {
            _headRoll = { slot: parseFloat(n.rollSlot || 0), casino: parseFloat(n.rollCasino || 0) };
            return;
          }
          if (n.children) _findHead(n.children);
        }
      }
      _findHead(_tree);
      var totalRolling = 0;
      var rollingByType = { slot: 0, casino: 0 };
      merged.forEach(function(r) {
        var gType = _betClassifyVendor(r.tx);
        rollingByType[gType] = (rollingByType[gType] || 0) + r.bet;
      });
      totalRolling = Math.floor(rollingByType.slot * _headRoll.slot / 100)
                   + Math.floor(rollingByType.casino * _headRoll.casino / 100);

      _renderBettingSummary(betCount, totalBet, totalWin, totalRolling);
      _renderBettingTable(merged);
      _renderBettingPagination(res.total || 0, res.page || 1, res.perPage || _bettingState.perPage);
    })
    .catch(function(e) {
      _bettingState.loading = false;
      console.error('[BETTING] Error:', e);
      document.getElementById('bet-tbody').innerHTML = '<tr><td colspan="16" style="color:#f87171;padding:24px;text-align:center;">데이터를 불러오지 못했습니다: ' + (e.message||e) + '</td></tr>';
    });
}

function _renderBettingSummary(betCount, totalBet, totalWin, totalRolling) {
  var profit = totalBet - totalWin;
  totalRolling = totalRolling || 0;
  var el = document.getElementById('bet-summary');
  if (!el) return;
  el.innerHTML =
    '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
    + '<div style="font-size:0.7rem;color:#888;">총 베팅건수</div>'
    + '<div style="font-size:1rem;color:#f59e0b;font-weight:700;">' + betCount.toLocaleString() + '건</div>'
    + '</div>'
    + '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
    + '<div style="font-size:0.7rem;color:#888;">총 베팅금액</div>'
    + '<div style="font-size:1rem;color:#ef4444;font-weight:700;">' + totalBet.toLocaleString() + '원</div>'
    + '</div>'
    + '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
    + '<div style="font-size:0.7rem;color:#888;">총 당첨금액</div>'
    + '<div style="font-size:1rem;color:#10b981;font-weight:700;">' + totalWin.toLocaleString() + '원</div>'
    + '</div>'
    + '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
    + '<div style="font-size:0.7rem;color:#888;">손익</div>'
    + '<div style="font-size:1rem;color:' + (profit >= 0 ? '#3b82f6' : '#ef4444') + ';font-weight:700;">' + (profit >= 0 ? '+' : '') + profit.toLocaleString() + '원</div>'
    + '</div>'
    + '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
    + '<div style="font-size:0.7rem;color:#888;">총 롤링</div>'
    + '<div style="font-size:1rem;color:#a855f7;font-weight:700;">' + totalRolling.toLocaleString() + '원</div>'
    + '</div>';
}

function _renderBettingTable(data) {
  var tbody = document.getElementById('bet-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="16" style="color:#888;padding:24px;text-align:center;">베팅 내역이 없습니다.</td></tr>';
    return;
  }

  var rows = data.map(function(r, i) {
    var t = r.tx; // 대표 트랜잭션 (bet 기준)
    var game = (t.details && t.details.game) || {};
    var betAmt = r.bet;
    var winAmt = r.win;
    var profit = winAmt - betAmt;

    var gameType = game.type === 'slot' ? '<span style="color:#a78bfa;">슬롯</span>' : '<span style="color:#f59e0b;">카지노</span>';

    var profitColor = profit > 0 ? '#10b981' : profit < 0 ? '#ef4444' : '#888';
    var profitSign = profit > 0 ? '+' : '';
    var profitLabel = '<span style="color:' + profitColor + ';">' + profitSign + profit.toLocaleString() + '</span>';

    // 상태: 당첨/낙첨/진행중
    var statusLabel = r.wins.length > 0
      ? (profit > 0
        ? '<span style="background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.3);padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">당첨</span>'
        : '<span style="background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3);padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">낙첨</span>')
      : '<span style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">진행중</span>';
    // 공베팅 표시
    var emptyLabel = r.isEmpty
      ? '<span style="background:rgba(245,158,11,0.2);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:700;">공</span>'
      : '';

    var time = t.processed_at || t.created_at || '';
    if (time) {
      var d = new Date(time);
      time = String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
        + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
    }

    var rowNum = ((_bettingState.page - 1) * _bettingState.perPage) + i + 1;

    // 베팅 위치 추출
    var betPositions = _extractBetPositions(r);

    // 상세정보 빌드
    var detailHtml = _buildDetailHtml(r);
    var hasDetail = detailHtml ? ' style="cursor:pointer;" data-detail-idx="' + i + '"' : '';

    return '<tr class="bet-row"' + hasDetail + '>'
      + '<td style="color:var(--text,#000);">' + rowNum + '</td>'
      + '<td style="color:var(--text,#000);font-size:0.76rem;white-space:nowrap;">' + time + '</td>'
      + '<td style="color:#f59e0b;font-weight:600;">' + (t.user ? t.user.username : '-') + '</td>'
      + '<td>' + gameType + '</td>'
      + '<td style="font-size:0.78rem;color:var(--text,#000);">아너링크</td>'
      + '<td style="font-size:0.78rem;color:var(--text,#000);">' + (game.vendor || '-') + '</td>'
      + '<td style="color:var(--text,#000);font-size:0.78rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (game.title || '') + '">' + (game.title || '-') + '</td>'
      + '<td style="font-size:0.72rem;">' + betPositions + '</td>'
      + '<td style="color:var(--text2,#555);font-size:0.72rem;">' + (game.round || '-') + '</td>'
      + '<td style="font-weight:600;"><span style="color:#ef4444;">' + betAmt.toLocaleString() + '</span></td>'
      + '<td style="font-weight:600;"><span style="color:#10b981;">' + winAmt.toLocaleString() + '</span></td>'
      + '<td style="font-weight:600;">' + profitLabel + '</td>'
      + '<td style="color:var(--text,#000);font-size:0.78rem;">' + (t.before || 0).toLocaleString() + '</td>'
      + '<td style="color:var(--text,#000);font-size:0.78rem;">' + ((t.before || 0) - betAmt + winAmt).toLocaleString() + '</td>'
      + '<td>' + statusLabel + (detailHtml ? ' <span style="color:#60a5fa;font-size:0.65rem;">▼</span>' : '') + '</td>'
      + '<td style="text-align:center;">' + emptyLabel + '</td>'
      + '</tr>'
      + (detailHtml ? '<tr class="bet-detail-row" id="bet-detail-' + i + '" style="display:none;"><td colspan="16" style="padding:0;">' + detailHtml + '</td></tr>' : '');
  }).join('');

  tbody.innerHTML = rows;

  // 행 클릭 시 상세정보 토글
  document.querySelectorAll('.bet-row[data-detail-idx]').forEach(function(row) {
    row.addEventListener('click', function() {
      var idx = this.dataset.detailIdx;
      var detailRow = document.getElementById('bet-detail-' + idx);
      if (detailRow) {
        detailRow.style.display = detailRow.style.display === 'none' ? '' : 'none';
      }
    });
  });
}

// ── 베팅 상세정보 HTML 빌드 ──
function _buildDetailHtml(r) {
  var ext = null;
  var allTx = (r.bets || []).concat(r.wins || []);
  for (var i = 0; i < allTx.length; i++) {
    if (allTx[i].external && allTx[i].external.detail) {
      ext = allTx[i].external.detail;
      break;
    }
  }
  if (!ext || !ext.data) return '';

  var d = ext.data;
  var res = d.result || {};
  var outcomeMap = { 'Banker': '뱅커 승', 'Player': '플레이어 승', 'Tie': '타이', 'Dragon': '드래곤 승', 'Tiger': '타이거 승' };
  var outcomeKr = outcomeMap[res.outcome] || res.outcome || '-';
  var outcomeColor = res.outcome === 'Banker' || res.outcome === 'Dragon' ? '#ef4444' : res.outcome === 'Player' || res.outcome === 'Tiger' ? '#3b82f6' : '#f59e0b';

  var html = '<div style="background:linear-gradient(135deg,#0c0c1d 0%,#141428 100%);padding:20px 24px;border-top:2px solid ' + outcomeColor + ';animation:betDetailIn 0.2s ease-out;">';

  // 상단: 결과 + 딜러 + 시간
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
  html += '<div style="display:flex;align-items:center;gap:14px;">';
  // 결과 뱃지
  html += '<div style="background:' + outcomeColor + '20;border:1.5px solid ' + outcomeColor + ';border-radius:8px;padding:6px 16px;text-align:center;">'
    + '<div style="font-size:0.65rem;color:#888;letter-spacing:0.5px;text-transform:uppercase;">RESULT</div>'
    + '<div style="font-size:1.05rem;font-weight:800;color:' + outcomeColor + ';margin-top:2px;">' + outcomeKr + '</div>'
    + '</div>';
  // 딜러
  if (d.dealer) {
    html += '<div style="display:flex;align-items:center;gap:8px;">'
      + '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#fff;">' + (d.dealer.name || '?').charAt(0) + '</div>'
      + '<div><div style="font-size:0.65rem;color:#666;">딜러</div><div style="font-size:0.85rem;font-weight:600;color:var(--text,#e2e8f0);">' + (d.dealer.name || '-') + '</div></div>'
      + '</div>';
  }
  html += '</div>';
  // 시간
  if (d.startedAt) {
    var st = new Date(d.startedAt);
    var timeStr = st.toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
    html += '<div style="font-size:0.7rem;color:#555;">' + timeStr + '</div>';
  }
  html += '</div>';

  // ── 좌우 레이아웃: 카드(왼쪽) + 베팅상세(오른쪽) ──
  html += '<div style="display:flex;gap:16px;align-items:flex-start;">';

  // 왼쪽: 카드 영역
  html += '<div style="flex:1;min-width:0;">';
  if (res.banker && res.player) {
    // 바카라
    var bWin = res.outcome === 'Banker';
    var pWin = res.outcome === 'Player';
    html += '<div style="display:flex;gap:12px;align-items:stretch;margin-bottom:10px;">';
    html += _buildCardBox('BANKER', res.banker.cards, res.banker.score, '#ef4444', bWin);
    html += '<div style="display:flex;align-items:center;padding:0 6px;"><span style="font-size:1.1rem;font-weight:800;color:#444;">VS</span></div>';
    html += _buildCardBox('PLAYER', res.player.cards, res.player.score, '#3b82f6', pWin);
    html += '</div>';
  } else if (res.dragon && res.tiger) {
    // 드래곤타이거
    var dWin = res.outcome === 'Dragon';
    var tWin = res.outcome === 'Tiger';
    html += '<div style="display:flex;gap:12px;align-items:stretch;margin-bottom:10px;">';
    html += _buildCardBox('DRAGON', [res.dragon.card], res.dragon.score, '#ef4444', dWin);
    html += '<div style="display:flex;align-items:center;padding:0 6px;"><span style="font-size:1.1rem;font-weight:800;color:#444;">VS</span></div>';
    html += _buildCardBox('TIGER', [res.tiger.card], res.tiger.score, '#3b82f6', tWin);
    html += '</div>';
  }
  html += '</div>'; // end 왼쪽

  // 오른쪽: 베팅 상세 테이블
  html += '<div style="flex:1;min-width:0;">';
  if (d.participants && d.participants[0] && d.participants[0].bets) {
    var bets = d.participants[0].bets;
    html += '<div style="background:#0a0a1a;border:1px solid #1e1e3a;border-radius:8px;overflow:hidden;">';
    html += '<div style="padding:8px 14px;background:#12122a;border-bottom:1px solid #1e1e3a;display:flex;align-items:center;gap:6px;">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 8h20"/></svg>'
      + '<span style="font-size:0.72rem;font-weight:600;color:#60a5fa;">베팅 상세</span>'
      + '</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:0.75rem;">';
    html += '<thead><tr style="background:#0e0e22;">'
      + '<th style="padding:6px 12px;text-align:left;color:#666;font-weight:500;font-size:0.68rem;">베팅 종류</th>'
      + '<th style="padding:6px 12px;text-align:right;color:#666;font-weight:500;font-size:0.68rem;">베팅금</th>'
      + '<th style="padding:6px 12px;text-align:right;color:#666;font-weight:500;font-size:0.68rem;">당첨금</th>'
      + '<th style="padding:6px 12px;text-align:right;color:#666;font-weight:500;font-size:0.68rem;">수익</th>'
      + '</tr></thead><tbody>';
    bets.forEach(function(b) {
      var profit = (b.payout || 0) - (b.stake || 0);
      var profitColor = profit > 0 ? '#10b981' : profit < 0 ? '#ef4444' : '#666';
      var betName = _formatBetCode(b.code);
      html += '<tr style="border-top:1px solid #1a1a30;">'
        + '<td style="padding:7px 12px;color:var(--text,#e2e8f0);font-weight:500;">' + betName + '</td>'
        + '<td style="padding:7px 12px;text-align:right;color:#ef4444;font-weight:600;">' + (b.stake || 0).toLocaleString() + '</td>'
        + '<td style="padding:7px 12px;text-align:right;color:#10b981;font-weight:600;">' + (b.payout || 0).toLocaleString() + '</td>'
        + '<td style="padding:7px 12px;text-align:right;color:' + profitColor + ';font-weight:700;">' + (profit >= 0 ? '+' : '') + profit.toLocaleString() + '</td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';
    // 사이드벳 결과 (베팅 상세 테이블 아래)
    var sides = [];
    if (res.sideBetBankerPair) sides.push({ name: '뱅커 페어', result: res.sideBetBankerPair });
    if (res.sideBetPlayerPair) sides.push({ name: '플레이어 페어', result: res.sideBetPlayerPair });
    if (sides.length > 0) {
      html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">';
      sides.forEach(function(s) {
        var sColor = s.result === 'Win' ? '#10b981' : '#666';
        html += '<span style="font-size:0.68rem;padding:2px 8px;border-radius:10px;background:' + sColor + '18;border:1px solid ' + sColor + '40;color:' + sColor + ';">' + s.name + ': ' + s.result + '</span>';
      });
      html += '</div>';
    }
  }
  html += '</div>'; // end 오른쪽

  html += '</div>'; // end 좌우 레이아웃
  html += '</div>';
  return html;
}

// ── 카드 박스 빌드 ──
function _buildCardBox(label, cards, score, color, isWinner) {
  var border = isWinner ? '2px solid ' + color : '1px solid #1e1e3a';
  var glow = isWinner ? 'box-shadow:0 0 12px ' + color + '30;' : '';
  var html = '<div style="flex:1;background:#0e0e24;border:' + border + ';border-radius:10px;padding:12px 16px;text-align:center;position:relative;' + glow + '">';
  if (isWinner) {
    html += '<div style="position:absolute;top:-8px;right:-8px;background:' + color + ';color:#fff;font-size:0.55rem;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:0.5px;">WIN</div>';
  }
  html += '<div style="font-size:0.6rem;font-weight:600;color:' + color + ';letter-spacing:1.5px;margin-bottom:8px;">' + label + '</div>';
  html += '<div style="display:flex;gap:6px;justify-content:center;margin-bottom:8px;">';
  (cards || []).forEach(function(c) {
    if (!c) return;
    var suit = c.charAt(c.length - 1);
    var val = c.substring(0, c.length - 1);
    var suits = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    var isRed = suit === 'H' || suit === 'D';
    html += '<div style="background:#fff;border-radius:6px;width:38px;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);">'
      + '<div style="font-size:1rem;font-weight:800;color:' + (isRed ? '#dc2626' : '#1a1a2e') + ';line-height:1;">' + val + '</div>'
      + '<div style="font-size:0.85rem;color:' + (isRed ? '#dc2626' : '#1a1a2e') + ';line-height:1;margin-top:1px;">' + (suits[suit] || suit) + '</div>'
      + '</div>';
  });
  html += '</div>';
  html += '<div style="font-size:0.68rem;color:#888;">점수</div>';
  html += '<div style="font-size:1.4rem;font-weight:800;color:' + (isWinner ? color : '#aaa') + ';">' + (score !== undefined ? score : '-') + '</div>';
  html += '</div>';
  return html;
}

// ── 베팅 위치 추출 ──
function _extractBetPositions(r) {
  var allTx = (r.bets || []).concat(r.wins || []);
  for (var i = 0; i < allTx.length; i++) {
    var ext = allTx[i].external;
    if (ext && ext.detail && ext.detail.data && ext.detail.data.participants) {
      var bets = ext.detail.data.participants[0] && ext.detail.data.participants[0].bets;
      if (bets && bets.length > 0) {
        return bets.map(function(b) {
          var name = _formatBetCode(b.code);
          var colorMap = {
            '뱅커': '#ef4444', '플레이어': '#3b82f6', '타이': '#f59e0b',
            '드래곤': '#ef4444', '타이거': '#3b82f6',
            '뱅커 페어': '#a855f7', '플레이어 페어': '#a855f7',
            '뱅커 라이트닝': '#f97316', '플레이어 라이트닝': '#f97316'
          };
          var c = colorMap[name] || '#60a5fa';
          return '<span style="display:inline-block;background:' + c + '18;color:' + c + ';border:1px solid ' + c + '40;border-radius:3px;padding:1px 6px;font-size:0.68rem;font-weight:600;margin:1px 2px;">' + name + '</span>';
        }).join('');
      }
    }
  }
  return '<span style="color:#555;">-</span>';
}

// ── 베팅 코드 한글 변환 ──
function _formatBetCode(code) {
  var map = {
    'BAC_Banker': '뱅커', 'BAC_Player': '플레이어', 'BAC_Tie': '타이',
    'BAC_BankerPair': '뱅커 페어', 'BAC_PlayerPair': '플레이어 페어',
    'BAC_Banker_Lightning': '뱅커 라이트닝', 'BAC_Player_Lightning': '플레이어 라이트닝',
    'DT_Dragon': '드래곤', 'DT_Tiger': '타이거', 'DT_Tie': '타이'
  };
  return map[code] || code || '-';
}

// ── 카드 포맷 (텍스트용) ──
function _formatCards(cards) {
  if (!cards || !cards.length) return '-';
  var suits = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
  var colors = { 'H': '#ef4444', 'D': '#ef4444', 'C': '#fff', 'S': '#fff' };
  return cards.map(function(c) {
    if (!c) return '?';
    var suit = c.charAt(c.length - 1);
    var val = c.substring(0, c.length - 1);
    return '<span style="color:' + (colors[suit] || '#fff') + ';">' + val + (suits[suit] || suit) + '</span>';
  }).join(' ');
}

function _renderBettingPagination(total, currentPage, perPage) {
  var el = document.getElementById('bet-pagination');
  if (!el) return;

  var lastPage = Math.ceil(total / perPage) || 1;

  if (lastPage <= 1 && !total) {
    el.innerHTML = '';
    return;
  }

  var html = '';

  // 이전 버튼
  if (currentPage > 1) {
    html += '<button class="bet-page-btn" data-page="' + (currentPage-1) + '" style="background:#333;color:#ccc;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.78rem;">&laquo; 이전</button>';
  }

  // 페이지 번호
  var startPage = Math.max(1, currentPage - 2);
  var endPage = Math.min(lastPage, currentPage + 2);
  for (var p = startPage; p <= endPage; p++) {
    var active = p === currentPage;
    html += '<button class="bet-page-btn" data-page="' + p + '" style="background:' + (active ? '#3b82f6' : '#333') + ';color:' + (active ? '#fff' : '#888') + ';border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.78rem;">' + p + '</button>';
  }

  // 다음 버튼
  if (currentPage < lastPage) {
    html += '<button class="bet-page-btn" data-page="' + (currentPage+1) + '" style="background:#333;color:#ccc;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.78rem;">다음 &raquo;</button>';
  }

  if (total) {
    html += '<span style="color:#666;font-size:0.75rem;margin-left:10px;">총 ' + total.toLocaleString() + '건</span>';
  }

  el.innerHTML = html;

  // 페이지 버튼 이벤트
  document.querySelectorAll('.bet-page-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _bettingState.page = parseInt(this.dataset.page, 10);
      _fetchBettingData();
    });
  });
}

// ══════════════════════════════════════
//  공베팅 내역 페이지
// ══════════════════════════════════════
function renderEmptyBettingPage() {
  var el = document.getElementById('content');
  el.innerHTML = '<div class="pt-wrap"><div class="db-section" style="padding:16px 20px;">'
    // 상단 필터 바 (베팅 내역과 동일)
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">'
    +   '<div style="display:flex;align-items:center;gap:8px;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:6px 12px;flex:0 0 200px;">'
    +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    +     '<input type="text" id="eb-user-filter" placeholder="아이디 검색" style="background:none;border:none;color:var(--text,#e2e8f0);font-size:0.8rem;outline:none;width:100%;">'
    +   '</div>'
    +   '<div style="display:flex;align-items:center;gap:8px;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:6px 12px;flex:0 0 200px;">'
    +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    +     '<input type="text" id="eb-vendor-filter" placeholder="게임사 검색" style="background:none;border:none;color:var(--text,#e2e8f0);font-size:0.8rem;outline:none;width:100%;">'
    +   '</div>'
    +   '<button class="eb-date-preset" data-preset="today" style="background:#6366f1;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">오늘</button>'
    +   '<button class="eb-date-preset" data-preset="yesterday" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">어제</button>'
    +   '<button class="eb-date-preset" data-preset="week" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">이번주</button>'
    +   '<button class="eb-date-preset" data-preset="month" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">이번달</button>'
    +   '<button class="eb-date-preset" data-preset="lastmonth" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">저번달</button>'
    +   '<div style="display:flex;gap:4px;margin-left:12px;">'
    +     '<button class="eb-game-filter active" data-game="all" style="background:#6366f1;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">전체</button>'
    +     '<button class="eb-game-filter" data-game="casino" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">카지노</button>'
    +     '<button class="eb-game-filter" data-game="slot" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;font-weight:600;">슬롯</button>'
    +   '</div>'
    +   '<div style="margin-left:auto;display:flex;align-items:center;gap:6px;">'
    +     '<input type="date" id="eb-date-start" style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:4px 8px;border-radius:6px;font-size:0.72rem;outline:none;">'
    +     '<span style="color:#64748b;font-size:0.72rem;">~</span>'
    +     '<input type="date" id="eb-date-end" style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:4px 8px;border-radius:6px;font-size:0.72rem;outline:none;">'
    +     '<button id="eb-search-btn" style="background:#6366f1;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:0.72rem;cursor:pointer;font-weight:600;">조회</button>'
    +   '</div>'
    + '</div>'
    // 요약
    + '<div id="eb-summary" style="display:flex;gap:20px;margin-bottom:12px;flex-wrap:wrap;"></div>'
    // 테이블
    + '<div style="overflow-x:auto;">'
    + '<table class="db-table mb-table" style="min-width:1200px;font-size:0.82rem;">'
    + '<thead><tr>'
    + '<th style="width:30px;">#</th>'
    + '<th>시간</th>'
    + '<th>유저</th>'
    + '<th>게임타입</th>'
    + '<th>게임사</th>'
    + '<th>라운드</th>'
    + '<th>베팅금</th>'
    + '<th>당첨금</th>'
    + '<th>손익</th>'
    + '<th>누락 롤링</th>'
    + '<th>상태</th>'
    + '</tr></thead>'
    + '<tbody id="eb-tbody"><tr><td colspan="11" style="color:#888;padding:24px;text-align:center;">데이터를 불러오는 중...</td></tr></tbody>'
    + '</table></div>'
    + '<div id="eb-pagination" style="display:flex;justify-content:center;gap:6px;margin-top:14px;"></div>'
    + '</div></div>';

  _bindEmptyBetEvents();
  _fetchEmptyBetData();
}

var _ebState = { page: 1, perPage: 50 };
var _ebCurrentMode = 'rolling';

function _bindEmptyBetEvents() {
  var todayStr = _betLocalDate(new Date());
  document.getElementById('eb-date-start').value = todayStr;
  document.getElementById('eb-date-end').value = todayStr;

  document.getElementById('eb-search-btn').addEventListener('click', function() {
    _ebState.page = 1;
    _fetchEmptyBetData();
  });

  // 검색 입력란 실시간 검색 (debounce 300ms)
  var _ebSearchTimer = null;
  ['eb-user-filter', 'eb-vendor-filter'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function() {
      clearTimeout(_ebSearchTimer);
      _ebSearchTimer = setTimeout(function() { _ebState.page = 1; _fetchEmptyBetData(); }, 300);
    });
  });

  // 날짜 프리셋
  document.querySelectorAll('.eb-date-preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.eb-date-preset').forEach(function(b) {
        b.style.background = '#1e293b'; b.style.color = '#94a3b8'; b.style.border = '1px solid #334155';
      });
      this.style.background = '#6366f1'; this.style.color = '#fff'; this.style.border = 'none';
      var preset = this.dataset.preset;
      var now = new Date();
      var startD = new Date(), endD = new Date();
      if (preset === 'today') { /* default */ }
      else if (preset === 'yesterday') { startD.setDate(now.getDate()-1); endD.setDate(now.getDate()-1); }
      else if (preset === 'week') { var day = startD.getDay(); var diff = day === 0 ? 6 : day - 1; startD.setDate(startD.getDate() - diff); }
      else if (preset === 'month') { startD.setDate(1); }
      else if (preset === 'lastmonth') { startD = new Date(startD.getFullYear(), startD.getMonth() - 1, 1); endD = new Date(endD.getFullYear(), endD.getMonth(), 0); }
      document.getElementById('eb-date-start').value = _betLocalDate(startD);
      document.getElementById('eb-date-end').value = _betLocalDate(endD);
      _ebState.page = 1;
      _fetchEmptyBetData();
    });
  });

  // 게임타입 필터
  document.querySelectorAll('.eb-game-filter').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.eb-game-filter').forEach(function(b) {
        b.style.background = '#1e293b'; b.style.color = '#94a3b8'; b.style.border = '1px solid #334155';
        b.classList.remove('active');
      });
      this.style.background = '#6366f1'; this.style.color = '#fff'; this.style.border = 'none';
      this.classList.add('active');
      _ebState.page = 1;
      _fetchEmptyBetData();
    });
  });
}

function _fetchEmptyBetData() {
  var startDate = document.getElementById('eb-date-start').value;
  var endDate = document.getElementById('eb-date-end').value;
  var userFilter = (document.getElementById('eb-user-filter').value || '').trim().toLowerCase();
  var vendorFilter = (document.getElementById('eb-vendor-filter').value || '').trim().toLowerCase();
  var activeGameBtn = document.querySelector('.eb-game-filter.active');
  var gameFilter = activeGameBtn ? activeGameBtn.dataset.game : 'all';

  // 공베팅 로그 + 트랜잭션(win 매칭용) 동시 조회
  var ebStart = (startDate || '2020-01-01') + ' 00:00:00';
  var ebEnd = (endDate || '2099-12-31') + ' 23:59:59';
  Promise.all([
    fetch('/api/admin/emptybet/log').then(function(r){ return r.json(); }),
    fetch('/api/hl/transactions/local?types=win&perPage=100000&start=' + encodeURIComponent(ebStart) + '&end=' + encodeURIComponent(ebEnd)).then(function(r){ return r.json(); }).catch(function(){ return {data:[]}; }),
    fetch('/api/admin/emptybet/mode').then(function(r){ return r.json(); }).catch(function(){ return {mode:'rolling'}; })
  ]).then(function(results) {
    var ebLog = results[0].data || [];
    var winTxs = results[1].data || [];
    _ebCurrentMode = (results[2] && results[2].mode) || 'rolling';

    // roundId+username → win 금액 매핑
    var winByRound = {};
    winTxs.forEach(function(tx) {
      var round = (tx.details && tx.details.game && tx.details.game.round) || '';
      var uname = '';
      if (tx.user && typeof tx.user === 'object') uname = tx.user.username || '';
      else uname = tx.username || tx.user || '';
      if (round && uname) {
        var key = uname + ':' + round;
        winByRound[key] = (winByRound[key] || 0) + Math.abs(tx.amount || 0);
      }
    });

    // 파트너 트리에서 회원→본사 롤링% 매핑
    var _ebTree = [];
    try { _ebTree = JSON.parse(localStorage.getItem('partnerTree') || '[]'); } catch(ex) {}
    var _ebMemberHeadMap = {};
    function _ebMapMembers(nodes, headNode) {
      if (!nodes) return;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var curHead = (n.level === 'head') ? n : headNode;
        if (n.level === 'member' && curHead) {
          _ebMemberHeadMap[n.id] = {
            rollSlot: parseFloat(curHead.rollSlot || 0),
            rollCasino: parseFloat(curHead.rollCasino || 0)
          };
        }
        if (n.children) _ebMapMembers(n.children, curHead);
      }
    }
    _ebMapMembers(_ebTree, null);

    // 공베팅 로그에 실제 당첨금 매칭 + 본사 기준 롤링 계산
    ebLog.forEach(function(l) {
      var key = (l.username || '') + ':' + (l.roundId || '');
      l.actualWin = winByRound[key] || 0;
      // 실제 누락된 롤링 금액 사용 (로그에 저장된 값)
      l.totalRolling = l.rollingAmount || 0;
    });

    // 날짜 필터 적용
    var filtered = ebLog.filter(function(l) {
      // UTC timestamp를 로컬 시간 기준 날짜로 변환
      var ts = '';
      if (l.timestamp) {
        var d = new Date(l.timestamp);
        ts = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      }
      if (startDate && ts < startDate) return false;
      if (endDate && ts > endDate) return false;
      if (userFilter && (l.username || '').toLowerCase().indexOf(userFilter) === -1) return false;
      if (vendorFilter && (l.vendor || '').toLowerCase().indexOf(vendorFilter) === -1) return false;
      if (gameFilter !== 'all' && (l.gameType || '') !== gameFilter) return false;
      return true;
    });

    // 최신순 정렬
    filtered.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });

    // 요약
    var totalBet = 0, totalWin = 0, droppedRolling = 0;
    filtered.forEach(function(l) {
      totalBet += l.betAmount || 0;
      totalWin += l.actualWin || 0;
      droppedRolling += l.totalRolling || 0;
    });
    var profit = totalWin - totalBet;
    document.getElementById('eb-summary').innerHTML =
      '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
      + '<div style="font-size:0.7rem;color:#888;">누락 건수</div>'
      + '<div style="font-size:1rem;color:#f59e0b;font-weight:700;">' + filtered.length + '건</div></div>'
      + '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
      + '<div style="font-size:0.7rem;color:#888;">누락 베팅금액</div>'
      + '<div style="font-size:1rem;color:#ef4444;font-weight:700;">' + totalBet.toLocaleString() + '원</div></div>'
      + '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
      + '<div style="font-size:0.7rem;color:#888;">누락 당첨금액</div>'
      + '<div style="font-size:1rem;color:#10b981;font-weight:700;">' + totalWin.toLocaleString() + '원</div></div>'
      + '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
      + '<div style="font-size:0.7rem;color:#888;">손익</div>'
      + '<div style="font-size:1rem;color:' + (profit >= 0 ? '#3b82f6' : '#ef4444') + ';font-weight:700;">' + (profit >= 0 ? '+' : '') + profit.toLocaleString() + '원</div></div>'
      + '<div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 16px;">'
      + '<div style="font-size:0.7rem;color:#888;">누락 롤링</div>'
      + '<div style="font-size:1rem;color:#f59e0b;font-weight:700;">' + droppedRolling.toLocaleString() + '원</div></div>';

    _renderEmptyBetLogTable(filtered);
  }).catch(function() {
    document.getElementById('eb-tbody').innerHTML = '<tr><td colspan="11" style="color:#ef4444;padding:24px;text-align:center;">데이터 로드 실패</td></tr>';
  });
}

function _renderEmptyBetLogTable(logList) {
  var tbody = document.getElementById('eb-tbody');
  var start = (_ebState.page - 1) * _ebState.perPage;
  var page = logList.slice(start, start + _ebState.perPage);

  if (page.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="color:#888;padding:24px;text-align:center;">공베팅 내역이 없습니다.</td></tr>';
    document.getElementById('eb-pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = page.map(function(l, i) {
    var time = l.timestamp || '';
    if (time) {
      var d = new Date(time);
      time = String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
        + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
    }
    var betAmt = l.betAmount || 0;
    var winAmt = l.actualWin || 0;
    var rollingAmt = l.totalRolling || 0;
    var profit = winAmt - betAmt;
    var profitColor = profit > 0 ? '#10b981' : profit < 0 ? '#ef4444' : '#888';
    var profitSign = profit > 0 ? '+' : '';
    var gameType = l.gameType === 'slot' ? '슬롯' : l.gameType === 'casino' ? '카지노' : l.gameType === 'mini' ? '미니게임' : (l.gameType || '-');
    var vendor = l.vendor || '-';
    var roundId = l.roundId || '-';
    var username = l.username || '-';

    var statusLabel;
    if (_ebCurrentMode === 'all') {
      statusLabel = '<span style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">전체누락</span>';
    } else {
      statusLabel = '<span style="background:rgba(251,191,36,0.15);color:#f59e0b;border:1px solid rgba(251,191,36,0.3);padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;">롤링누락</span>';
    }

    return '<tr>'
      + '<td>' + (start + i + 1) + '</td>'
      + '<td style="font-size:0.78rem;white-space:nowrap;">' + time + '</td>'
      + '<td style="color:#60a5fa;font-weight:600;">' + username + '</td>'
      + '<td>' + gameType + '</td>'
      + '<td>' + vendor + '</td>'
      + '<td style="font-size:0.72rem;color:#64748b;">' + roundId + '</td>'
      + '<td style="color:#f59e0b;font-weight:600;">' + betAmt.toLocaleString() + '</td>'
      + '<td style="color:#10b981;">' + winAmt.toLocaleString() + '</td>'
      + '<td style="font-weight:600;color:' + profitColor + ';">' + profitSign + profit.toLocaleString() + '</td>'
      + '<td style="color:#a78bfa;">' + rollingAmt.toLocaleString() + '</td>'
      + '<td>' + statusLabel + '</td>'
      + '</tr>';
  }).join('');

  // 페이지네이션
  var totalPages = Math.ceil(logList.length / _ebState.perPage);
  if (totalPages > 1) {
    var pagHtml = '';
    for (var p = 1; p <= totalPages; p++) {
      pagHtml += '<button class="eb-page-btn" data-page="' + p + '" style="padding:4px 10px;border-radius:4px;border:1px solid #334155;background:' + (p === _ebState.page ? '#6366f1' : '#1e293b') + ';color:' + (p === _ebState.page ? '#fff' : '#94a3b8') + ';font-size:0.72rem;cursor:pointer;">' + p + '</button>';
    }
    document.getElementById('eb-pagination').innerHTML = pagHtml;
    document.querySelectorAll('.eb-page-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _ebState.page = parseInt(this.dataset.page, 10);
        _renderEmptyBetLogTable(logList);
      });
    });
  } else {
    document.getElementById('eb-pagination').innerHTML = '';
  }
}
