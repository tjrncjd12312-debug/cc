// ══════════════════════════════════════
//  게임사 기본설정 페이지
// ══════════════════════════════════════

var _gdVendors = [];
var _gdSettings = { hiddenVendors: [], hiddenGames: {}, blockedGames: {}, vendorOrder: { live: [], slot: [] }, groups: [] };
var _gdLiveNames = ['evolution','PragmaticPlay Live','Asia Gaming','DreamGame','WM Live','ezugi','bota','sexybcrt','SuperSpade','Skywind Live','vivo','AllBet','saGaming','Live88','XProGaming'];

function loadGameSettings() {
  return fetch('/api/admin/games')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var d = res.data || {};
      _gdSettings = {
        hiddenVendors: d.hiddenVendors || [],
        hiddenGames: d.hiddenGames || {},
        blockedGames: d.blockedGames || {},
        vendorOrder: d.vendorOrder || { live: [], slot: [] },
        groups: d.groups || []
      };
    })
    .catch(function() {});
}

function saveGameSettings() {
  return fetch('/api/admin/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(_gdSettings)
  }).catch(function() {});
}

function isVendorHidden(name) {
  return _gdSettings.hiddenVendors.indexOf(name) >= 0;
}

function isGameHidden(vendor, gameId) {
  var list = _gdSettings.hiddenGames[vendor];
  if (!list) return false;
  return list.indexOf(String(gameId)) >= 0;
}

function toggleVendor(name) {
  var idx = _gdSettings.hiddenVendors.indexOf(name);
  if (idx >= 0) {
    _gdSettings.hiddenVendors.splice(idx, 1);
  } else {
    _gdSettings.hiddenVendors.push(name);
  }
  saveGameSettings().then(function() { filterVendors(); });
}

function toggleGame(vendor, gameId) {
  gameId = String(gameId);
  if (!_gdSettings.hiddenGames[vendor]) _gdSettings.hiddenGames[vendor] = [];
  var list = _gdSettings.hiddenGames[vendor];
  var idx = list.indexOf(gameId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(gameId);
  }
  saveGameSettings();
}

function toggleAllGamesInVendor(vendor, games, hide) {
  if (!_gdSettings.hiddenGames[vendor]) _gdSettings.hiddenGames[vendor] = [];
  if (hide) {
    _gdSettings.hiddenGames[vendor] = games.map(function(g) { return String(g.id); });
  } else {
    _gdSettings.hiddenGames[vendor] = [];
  }
  saveGameSettings();
}

// ── 순서 관리 ──
function getOrderedVendors(vendors, type) {
  var order = _gdSettings.vendorOrder[type] || [];
  var sorted = vendors.slice();
  sorted.sort(function(a, b) {
    var ai = order.indexOf(a.name);
    var bi = order.indexOf(b.name);
    if (ai < 0) ai = 99999;
    if (bi < 0) bi = 99999;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
  return sorted;
}

function ensureVendorOrder(vendors, type) {
  var order = _gdSettings.vendorOrder[type] || [];
  var names = vendors.map(function(v) { return v.name; });
  // 기존 순서에 없는 벤더 추가
  names.forEach(function(n) {
    if (order.indexOf(n) < 0) order.push(n);
  });
  // 없는 벤더 제거
  order = order.filter(function(n) { return names.indexOf(n) >= 0; });
  _gdSettings.vendorOrder[type] = order;
}

function moveVendor(name, type, direction) {
  var order = _gdSettings.vendorOrder[type];
  if (!order) return;
  var idx = order.indexOf(name);
  if (idx < 0) return;
  var newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= order.length) return;
  var tmp = order[newIdx];
  order[newIdx] = order[idx];
  order[idx] = tmp;
  saveGameSettings().then(function() { filterVendors(); });
}

function setVendorOrder(name, type, newPos) {
  var order = _gdSettings.vendorOrder[type];
  if (!order) return;
  var oldIdx = order.indexOf(name);
  if (oldIdx < 0) return;
  newPos = Math.max(1, Math.min(order.length, newPos)) - 1; // 1-based → 0-based
  if (oldIdx === newPos) return;
  // 제거 후 삽입
  order.splice(oldIdx, 1);
  order.splice(newPos, 0, name);
  saveGameSettings().then(function() { filterVendors(); });
}

// ── 메인 렌더 ──
function renderGameDefault() {
  var content = document.getElementById('content');
  content.innerHTML =
    '<div class="pt-wrap">' +
      '<div style="margin-bottom:12px;font-size:0.78rem;color:#aaa;line-height:1.8;">' +
        '※ 최초 기본설정은 직속상위 그룹에 따라 세팅됩니다. ※ 적용예시:그룹없음 설정으로 되어있을 시 적용, 로그인 하지 않은 상태의 유저페이지에 노출되는 게임사설정.' +
      '</div>' +
      '<div style="font-size:0.95rem;font-weight:bold;color:#a78bfa;margin-bottom:16px;">게임사 기본설정(그룹없음)</div>' +
      '<div id="gd-vendor-list">' +
        '<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>' +
      '</div>' +
    '</div>';

  loadGameSettings().then(function() { loadVendors(); });
}

function loadVendors() {
  var container = document.getElementById('gd-vendor-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임사 목록 불러오는 중...</div>';

  fetch('/api/hl/vendors')
    .then(function(r) { return r.json(); })
    .then(function(vendors) {
      if (vendors.error || vendors._status) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">게임사 목록을 불러오지 못했습니다.</div>';
        return;
      }
      _gdVendors = [];
      Object.keys(vendors).forEach(function(key) {
        var v = vendors[key];
        v._type = _gdLiveNames.indexOf(v.name) >= 0 ? 'live' : 'slot';
        _gdVendors.push(v);
      });

      // 라이브/슬롯 각각 순서 초기화
      var liveList = _gdVendors.filter(function(v) { return v._type === 'live'; });
      var slotList = _gdVendors.filter(function(v) { return v._type === 'slot'; });
      ensureVendorOrder(liveList, 'live');
      ensureVendorOrder(slotList, 'slot');
      saveGameSettings();

      filterVendors();
    })
    .catch(function() {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">서버에 연결할 수 없습니다.</div>';
    });
}

function filterVendors() {
  var container = document.getElementById('gd-vendor-list');
  if (!container) return;

  var liveAll = _gdVendors.filter(function(v) { return v._type === 'live'; });
  var slotAll = _gdVendors.filter(function(v) { return v._type === 'slot'; });
  var liveSorted = getOrderedVendors(liveAll, 'live');
  var slotSorted = getOrderedVendors(slotAll, 'slot');

  var html = '';
  html += renderVendorSection('카지노', liveSorted, 'live');
  html += renderVendorSection('슬롯', slotSorted, 'slot');
  container.innerHTML = html;
}

function renderVendorSection(title, vendors, type) {
  var html =
    '<div class="db-section" style="margin-bottom:20px;overflow-x:auto;">' +
      '<div style="padding:12px 14px;font-size:1rem;font-weight:bold;color:#fff;">' + title + '</div>' +
      '<table class="db-table" style="font-size:0.82rem;">' +
        '<thead>' +
          '<tr>' +
            '<th style="width:70px;text-align:center;">배열</th>' +
            '<th style="text-align:center;">게임사</th>' +
            '<th colspan="2" style="text-align:center;">사용</th>' +
          '</tr>' +
          '<tr>' +
            '<th></th><th></th>' +
            '<th style="width:180px;text-align:center;">아너링크</th>' +
            '<th style="width:180px;text-align:center;">노출안함</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

  if (vendors.length === 0) {
    html += '<tr><td colspan="4" style="color:#888;padding:16px;text-align:center;">게임사가 없습니다.</td></tr>';
  } else {
    vendors.forEach(function(v, i) {
      var safeName = v.name.replace(/'/g, "\\'");
      var hidden = isVendorHidden(v.name);
      var activeStyle = 'padding:6px 16px;font-size:0.78rem;border-radius:6px;cursor:pointer;font-weight:600;border:none;';
      var hlBtn, noBtn;
      if (!hidden) {
        hlBtn = '<button style="' + activeStyle + 'background:#16a34a;color:#fff;" onclick="gdSetVendorApi(\'' + safeName + '\',\'honorlink\')">아너링크</button>';
        noBtn = '<button style="' + activeStyle + 'background:transparent;border:1px solid #444;color:#888;" onclick="gdSetVendorApi(\'' + safeName + '\',\'none\')">노출안함</button>';
      } else {
        hlBtn = '<button style="' + activeStyle + 'background:transparent;border:1px solid #444;color:#888;" onclick="gdSetVendorApi(\'' + safeName + '\',\'honorlink\')">아너링크</button>';
        noBtn = '<button style="' + activeStyle + 'background:#16a34a;color:#fff;" onclick="gdSetVendorApi(\'' + safeName + '\',\'none\')">노출안함</button>';
      }

      var orderInput = '<input type="number" value="' + (i + 1) + '" min="1" max="' + vendors.length + '" ' +
        'style="width:44px;text-align:center;background:#1a2030;border:1px solid #444;color:#fff;border-radius:4px;padding:3px;font-size:0.78rem;" ' +
        'onchange="setVendorOrder(\'' + safeName + '\',\'' + type + '\',parseInt(this.value))" ' +
        'onkeydown="if(event.key===\'Enter\'){this.blur();}">';

      html +=
        '<tr style="' + (hidden ? 'opacity:0.5;' : '') + '">' +
          '<td style="text-align:center;">' + orderInput + '</td>' +
          '<td style="text-align:center;font-weight:500;">' + v.name + '</td>' +
          '<td style="text-align:center;">' + hlBtn + '</td>' +
          '<td style="text-align:center;">' + noBtn + '</td>' +
        '</tr>';
    });
  }

  html += '</tbody></table></div>';
  return html;
}

function gdSetVendorApi(name, api) {
  if (api === 'none') {
    if (!isVendorHidden(name)) toggleVendor(name);
  } else {
    if (isVendorHidden(name)) toggleVendor(name);
  }
}

// ── 게임 목록 모달 ──
function openGameListModal(vendor) {
  var existing = document.getElementById('gd-modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'gd-modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';
  overlay.innerHTML =
    '<div style="width:1000px;max-width:96vw;max-height:85vh;display:flex;flex-direction:column;background:#141824;border-radius:12px;border:1px solid #2a3040;overflow:hidden;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #2a3040;">' +
        '<span style="font-size:1.05rem;font-weight:bold;color:#fff;">' + vendor + ' 게임 목록</span>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
          '<button id="gd-show-all-btn" class="pt-action-btn" style="padding:3px 10px;font-size:0.72rem;background:#16a34a;border-color:#16a34a;color:#fff;"><i class="fas fa-eye"></i> 전체 노출</button>' +
          '<button id="gd-hide-all-btn" class="pt-action-btn" style="padding:3px 10px;font-size:0.72rem;background:#dc2626;border-color:#dc2626;color:#fff;"><i class="fas fa-eye-slash"></i> 전체 숨김</button>' +
          '<button onclick="document.getElementById(\'gd-modal-overlay\').remove()" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer;margin-left:8px;">✕</button>' +
        '</div>' +
      '</div>' +
      '<div style="padding:12px;overflow-y:auto;flex:1;">' +
        '<div id="gd-modal-games" style="text-align:center;padding:24px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임 목록 로딩 중...</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  fetch('/api/hl/games?vendor=' + encodeURIComponent(vendor))
    .then(function(r) { return r.json(); })
    .then(function(games) {
      var container = document.getElementById('gd-modal-games');
      if (!container) return;

      if (!Array.isArray(games) || games.length === 0) {
        container.innerHTML = '<div style="color:#888;padding:20px;">게임 목록이 없습니다.</div>';
        return;
      }

      games.sort(function(a, b) {
        var ra = a.rank !== null && a.rank !== undefined ? a.rank : 99999;
        var rb = b.rank !== null && b.rank !== undefined ? b.rank : 99999;
        return ra - rb;
      });

      document.getElementById('gd-show-all-btn').onclick = function() {
        toggleAllGamesInVendor(vendor, games, false);
        renderGameTable(container, vendor, games);
      };
      document.getElementById('gd-hide-all-btn').onclick = function() {
        toggleAllGamesInVendor(vendor, games, true);
        renderGameTable(container, vendor, games);
      };

      renderGameTable(container, vendor, games);
    })
    .catch(function() {
      var container = document.getElementById('gd-modal-games');
      if (container) container.innerHTML = '<div style="color:#f87171;padding:20px;">게임 목록을 불러오지 못했습니다.</div>';
    });
}

function renderGameTable(container, vendor, games) {
  var visibleCnt = 0;
  var hiddenCnt = 0;
  games.forEach(function(g) {
    if (isGameHidden(vendor, g.id)) hiddenCnt++;
    else visibleCnt++;
  });

  var html =
    '<div style="margin-bottom:8px;font-size:0.78rem;color:#aaa;">' +
      '총 <b style="color:#fff;">' + games.length + '</b>개 | ' +
      '노출 <b style="color:#4ade80;">' + visibleCnt + '</b>개 | ' +
      '숨김 <b style="color:#f87171;">' + hiddenCnt + '</b>개' +
    '</div>' +
    '<table class="db-table" style="font-size:0.78rem;">' +
      '<thead>' +
        '<tr>' +
          '<th style="width:40px;">#</th>' +
          '<th style="width:70px;">이미지</th>' +
          '<th style="text-align:left;padding-left:8px;">게임명</th>' +
          '<th style="width:100px;">게임 ID</th>' +
          '<th style="width:60px;">순위</th>' +
          '<th style="width:70px;">타입</th>' +
          '<th style="width:90px;text-align:center;">노출설정</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  games.forEach(function(g, i) {
    var name = (g.langs && g.langs.ko) || g.title || g.name || '';
    var img = (g.thumbnails && (g.thumbnails['300x300'] || g.thumbnails['200x200'])) || g.thumbnail || '';
    var imgHtml = img
      ? '<img src="' + img + '" style="width:50px;height:38px;object-fit:cover;border-radius:4px;display:block;margin:0 auto;" loading="lazy">'
      : '<div style="width:50px;height:38px;background:#2a3040;border-radius:4px;margin:0 auto;"></div>';
    var rank = g.rank !== null && g.rank !== undefined ? g.rank : '-';
    var type = g.type || '-';
    var hidden = isGameHidden(vendor, g.id);
    var safeVendor = vendor.replace(/'/g, "\\'");
    var toggleBtn = hidden
      ? '<button class="pt-action-btn" style="padding:2px 8px;font-size:0.7rem;background:#dc2626;border-color:#dc2626;color:#fff;" onclick="toggleGameAndRefresh(\'' + safeVendor + '\',\'' + g.id + '\')"><i class="fas fa-eye-slash"></i> 숨김</button>'
      : '<button class="pt-action-btn" style="padding:2px 8px;font-size:0.7rem;background:#16a34a;border-color:#16a34a;color:#fff;" onclick="toggleGameAndRefresh(\'' + safeVendor + '\',\'' + g.id + '\')"><i class="fas fa-eye"></i> 노출</button>';

    html +=
      '<tr style="' + (hidden ? 'opacity:0.4;' : '') + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + imgHtml + '</td>' +
        '<td style="text-align:left;padding-left:8px;">' + name + '</td>' +
        '<td style="font-size:0.72rem;color:#888;">' + g.id + '</td>' +
        '<td>' + rank + '</td>' +
        '<td><span style="font-size:0.7rem;color:#aaa;">' + type + '</span></td>' +
        '<td style="text-align:center;">' + toggleBtn + '</td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ── 게임 제한 상태 헬퍼 ──
// 상태: 'allow' (허용), 'hidden' (점검), 'blocked' (차단)
function getGameStatus(vendor, gameId) {
  gameId = String(gameId);
  var blocked = _gdSettings.blockedGames[vendor] || [];
  if (blocked.indexOf(gameId) >= 0) return 'blocked';
  var hidden = _gdSettings.hiddenGames[vendor] || [];
  if (hidden.indexOf(gameId) >= 0) return 'hidden';
  return 'allow';
}

function setGameStatus(vendor, gameId, status) {
  gameId = String(gameId);
  // hiddenGames에서 제거
  if (!_gdSettings.hiddenGames[vendor]) _gdSettings.hiddenGames[vendor] = [];
  var hIdx = _gdSettings.hiddenGames[vendor].indexOf(gameId);
  if (hIdx >= 0) _gdSettings.hiddenGames[vendor].splice(hIdx, 1);
  // blockedGames에서 제거
  if (!_gdSettings.blockedGames[vendor]) _gdSettings.blockedGames[vendor] = [];
  var bIdx = _gdSettings.blockedGames[vendor].indexOf(gameId);
  if (bIdx >= 0) _gdSettings.blockedGames[vendor].splice(bIdx, 1);
  // 새 상태 설정
  if (status === 'hidden') _gdSettings.hiddenGames[vendor].push(gameId);
  else if (status === 'blocked') _gdSettings.blockedGames[vendor].push(gameId);
  saveGameSettings();
}

function setBulkGameStatus(vendor, games, status) {
  if (!_gdSettings.hiddenGames[vendor]) _gdSettings.hiddenGames[vendor] = [];
  if (!_gdSettings.blockedGames[vendor]) _gdSettings.blockedGames[vendor] = [];
  games.forEach(function(g) {
    var gid = String(g.id);
    var hIdx = _gdSettings.hiddenGames[vendor].indexOf(gid);
    if (hIdx >= 0) _gdSettings.hiddenGames[vendor].splice(hIdx, 1);
    var bIdx = _gdSettings.blockedGames[vendor].indexOf(gid);
    if (bIdx >= 0) _gdSettings.blockedGames[vendor].splice(bIdx, 1);
    if (status === 'hidden') _gdSettings.hiddenGames[vendor].push(gid);
    else if (status === 'blocked') _gdSettings.blockedGames[vendor].push(gid);
  });
  saveGameSettings();
}

// ══════════════════════════════════════
//  게임사 제한관리 페이지
// ══════════════════════════════════════
var _grVendors = [];

function renderGameRestrict() {
  var content = document.getElementById('content');
  content.innerHTML =
    '<div class="pt-wrap">' +
      '<div style="margin-bottom:16px;">' +
        '<div style="margin-bottom:8px;">' +
          '<span style="font-size:0.8rem;color:#aaa;margin-right:8px;">그룹:</span>' +
          '<select class="pt-create-select" id="gr-type-filter" style="width:200px;">' +
            '<option value="all">게임사스위치(전체)</option>' +
            '<option value="live">라이브 카지노</option>' +
            '<option value="slot">슬롯</option>' +
          '</select>' +
        '</div>' +
        '<div>' +
          '<span style="font-size:0.8rem;color:#aaa;margin-right:8px;">벤더:</span>' +
          '<select class="pt-create-select" id="gr-vendor-filter" style="width:200px;">' +
            '<option value="honorlink" selected>아너링크</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div id="gr-vendor-list">' +
        '<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>' +
      '</div>' +
    '</div>';

  document.getElementById('gr-type-filter').addEventListener('change', function() { filterRestrictVendors(); });

  loadGameSettings().then(function() { loadRestrictVendors(); });
}

function loadRestrictVendors() {
  var container = document.getElementById('gr-vendor-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임사 목록 불러오는 중...</div>';

  fetch('/api/hl/vendors')
    .then(function(r) { return r.json(); })
    .then(function(vendors) {
      if (vendors.error || vendors._status) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">게임사 목록을 불러오지 못했습니다.</div>';
        return;
      }
      _grVendors = [];
      Object.keys(vendors).forEach(function(key) {
        var v = vendors[key];
        if (!v.enabled) return;
        v._type = _gdLiveNames.indexOf(v.name) >= 0 ? 'live' : 'slot';
        _grVendors.push(v);
      });
      filterRestrictVendors();
    })
    .catch(function() {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">서버에 연결할 수 없습니다.</div>';
    });
}

function filterRestrictVendors() {
  var type = (document.getElementById('gr-type-filter') || {}).value || 'all';

  var container = document.getElementById('gr-vendor-list');
  if (!container) return;

  var filtered = _grVendors.filter(function(v) {
    if (type !== 'all' && v._type !== type) return false;
    return true;
  });

  var html =
    '<div class="db-section" style="overflow-x:auto;">' +
      '<table class="db-table" style="font-size:0.82rem;">' +
        '<thead>' +
          '<tr>' +
            '<th style="width:120px;text-align:center;">게임종류</th>' +
            '<th style="text-align:center;">게임명</th>' +
            '<th style="width:160px;text-align:center;">게임사 사용유무</th>' +
            '<th style="width:150px;text-align:center;">게임개별 권한</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

  if (filtered.length === 0) {
    html += '<tr><td colspan="4" style="color:#888;padding:16px;text-align:center;">게임사가 없습니다.</td></tr>';
  } else {
    filtered.forEach(function(v) {
      var safeName = v.name.replace(/'/g, "\\'");
      var typeLabel = v._type === 'live' ? '라이브' : '슬롯';
      var hidden = isVendorHidden(v.name);
      var toggleId = 'gr-toggle-' + v.name.replace(/[^a-zA-Z0-9]/g, '_');

      html +=
        '<tr>' +
          '<td style="text-align:center;color:#aaa;">' + typeLabel + '</td>' +
          '<td style="text-align:center;font-weight:500;">' + v.name + '</td>' +
          '<td style="text-align:center;">' +
            '<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;" id="' + toggleId + '">' +
              '<input type="checkbox" ' + (hidden ? '' : 'checked') + ' style="display:none;" onchange="grToggleVendor(\'' + safeName + '\')">' +
              '<span style="position:absolute;top:0;left:0;right:0;bottom:0;background:' + (hidden ? '#444' : '#3b82f6') + ';border-radius:24px;transition:0.3s;"></span>' +
              '<span style="position:absolute;top:2px;' + (hidden ? 'left:2px' : 'left:22px') + ';width:20px;height:20px;background:#fff;border-radius:50%;transition:0.3s;"></span>' +
            '</label>' +
          '</td>' +
          '<td style="text-align:center;">' +
            '<button class="pt-action-btn" style="padding:4px 14px;font-size:0.75rem;background:#3b82f6;border-color:#3b82f6;color:#fff;font-weight:600;" onclick="openRestrictModal(\'' + safeName + '\')">게임제한</button>' +
          '</td>' +
        '</tr>';
    });
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function grToggleVendor(name) {
  toggleVendor(name);
  filterRestrictVendors();
}

// ── 제한관리 모달 ──
function openRestrictModal(vendor) {
  var existing = document.getElementById('gr-modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'gr-modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';
  overlay.innerHTML =
    '<div style="width:1000px;max-width:96vw;height:85vh;display:flex;flex-direction:column;background:#141824;border-radius:12px;border:1px solid #2a3040;overflow:hidden;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #2a3040;">' +
        '<span style="font-size:1.05rem;font-weight:bold;color:#fff;">' + vendor + ' 제한 관리</span>' +
        '<div style="display:flex;gap:4px;align-items:center;">' +
          '<input type="text" class="pt-search-input" id="gr-modal-search" placeholder="게임명 검색" style="width:140px;font-size:0.72rem;">' +
          '<select class="pt-create-select" id="gr-modal-status" style="width:100px;font-size:0.72rem;">' +
            '<option value="all">전체 상태</option>' +
            '<option value="allow">허용</option>' +
            '<option value="hidden">점검</option>' +
            '<option value="blocked">차단</option>' +
          '</select>' +
          '<button class="pt-action-btn" style="padding:3px 8px;font-size:0.7rem;background:#16a34a;border-color:#16a34a;color:#fff;" onclick="grBulkSet(\'' + vendor.replace(/'/g, "\\'") + '\',\'allow\')"><i class="fas fa-check"></i> 전체 허용</button>' +
          '<button class="pt-action-btn" style="padding:3px 8px;font-size:0.7rem;background:#d97706;border-color:#d97706;color:#fff;" onclick="grBulkSet(\'' + vendor.replace(/'/g, "\\'") + '\',\'hidden\')"><i class="fas fa-wrench"></i> 전체 점검</button>' +
          '<button class="pt-action-btn" style="padding:3px 8px;font-size:0.7rem;background:#dc2626;border-color:#dc2626;color:#fff;" onclick="grBulkSet(\'' + vendor.replace(/'/g, "\\'") + '\',\'blocked\')"><i class="fas fa-ban"></i> 전체 차단</button>' +
          '<button onclick="document.getElementById(\'gr-modal-overlay\').remove()" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer;margin-left:8px;">✕</button>' +
        '</div>' +
      '</div>' +
      '<div style="padding:12px;overflow-y:auto;flex:1;">' +
        '<div id="gr-modal-games" style="text-align:center;padding:24px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임 목록 로딩 중...</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  var statusSel = document.getElementById('gr-modal-status');
  var searchInput = document.getElementById('gr-modal-search');
  statusSel.addEventListener('change', function() { grLoadModalGames(vendor); });
  searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') grLoadModalGames(vendor); });
  searchInput.addEventListener('input', function() { grLoadModalGames(vendor); });

  grLoadModalGames(vendor);
}

function grLoadModalGames(vendor) {
  var container = document.getElementById('gr-modal-games');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:24px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임 목록 로딩 중...</div>';

  fetch('/api/hl/games?vendor=' + encodeURIComponent(vendor))
    .then(function(r) { return r.json(); })
    .then(function(games) {
      if (!Array.isArray(games) || games.length === 0) {
        container.innerHTML = '<div style="color:#888;padding:20px;">게임 목록이 없습니다.</div>';
        return;
      }
      games.sort(function(a, b) {
        var ra = a.rank !== null && a.rank !== undefined ? a.rank : 99999;
        var rb = b.rank !== null && b.rank !== undefined ? b.rank : 99999;
        return ra - rb;
      });
      renderRestrictTable(container, vendor, games);
    })
    .catch(function() {
      container.innerHTML = '<div style="color:#f87171;padding:20px;">게임 목록을 불러오지 못했습니다.</div>';
    });
}

function renderRestrictTable(container, vendor, games) {
  var statusFilter = (document.getElementById('gr-modal-status') || {}).value || 'all';
  var keyword = ((document.getElementById('gr-modal-search') || {}).value || '').trim().toLowerCase();

  // 상태별 카운트
  var counts = { allow: 0, hidden: 0, blocked: 0 };
  games.forEach(function(g) { counts[getGameStatus(vendor, g.id)]++; });

  // 필터 적용
  var filtered = games;
  if (statusFilter !== 'all') {
    filtered = filtered.filter(function(g) { return getGameStatus(vendor, g.id) === statusFilter; });
  }
  if (keyword) {
    filtered = filtered.filter(function(g) {
      var name = ((g.langs && g.langs.ko) || g.title || g.name || '').toLowerCase();
      var gid = String(g.id).toLowerCase();
      return name.indexOf(keyword) >= 0 || gid.indexOf(keyword) >= 0;
    });
  }

  var html =
    '<div style="margin-bottom:6px;font-size:0.72rem;color:#aaa;padding:0 4px;">' +
      '총 <b style="color:#fff;">' + games.length + '</b>개 | ' +
      '허용 <b style="color:#4ade80;">' + counts.allow + '</b> | ' +
      '점검 <b style="color:#d97706;">' + counts.hidden + '</b> | ' +
      '차단 <b style="color:#f87171;">' + counts.blocked + '</b>' +
    '</div>';

  if (filtered.length === 0) {
    html += '<div style="color:#888;padding:12px;font-size:0.78rem;">해당 상태의 게임이 없습니다.</div>';
    container.innerHTML = html;
    return;
  }

  html +=
    '<table class="db-table" style="font-size:0.78rem;">' +
      '<thead>' +
        '<tr>' +
          '<th style="width:40px;">#</th>' +
          '<th style="width:60px;">이미지</th>' +
          '<th style="text-align:left;padding-left:8px;">게임명</th>' +
          '<th style="width:90px;">게임 ID</th>' +
          '<th style="width:60px;">타입</th>' +
          '<th style="width:180px;text-align:center;">제한 설정</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  filtered.forEach(function(g, i) {
    var name = (g.langs && g.langs.ko) || g.title || g.name || '';
    var img = (g.thumbnails && (g.thumbnails['300x300'] || g.thumbnails['200x200'])) || g.thumbnail || '';
    var imgHtml = img
      ? '<img src="' + img + '" style="width:46px;height:34px;object-fit:cover;border-radius:4px;display:block;margin:0 auto;" loading="lazy">'
      : '<div style="width:46px;height:34px;background:#2a3040;border-radius:4px;margin:0 auto;"></div>';
    var type = g.type || '-';
    var st = getGameStatus(vendor, g.id);
    var safeV = vendor.replace(/'/g, "\\'");
    var gid = String(g.id);

    var btnAllow = '<button class="pt-action-btn" style="padding:2px 8px;font-size:0.68rem;' +
      (st === 'allow' ? 'background:#16a34a;border-color:#16a34a;color:#fff;' : 'background:transparent;border-color:#444;color:#888;') +
      '" onclick="grSetGame(\'' + safeV + '\',\'' + gid + '\',\'allow\')">허용</button>';
    var btnHidden = '<button class="pt-action-btn" style="padding:2px 8px;font-size:0.68rem;' +
      (st === 'hidden' ? 'background:#d97706;border-color:#d97706;color:#fff;' : 'background:transparent;border-color:#444;color:#888;') +
      '" onclick="grSetGame(\'' + safeV + '\',\'' + gid + '\',\'hidden\')">점검</button>';
    var btnBlocked = '<button class="pt-action-btn" style="padding:2px 8px;font-size:0.68rem;' +
      (st === 'blocked' ? 'background:#dc2626;border-color:#dc2626;color:#fff;' : 'background:transparent;border-color:#444;color:#888;') +
      '" onclick="grSetGame(\'' + safeV + '\',\'' + gid + '\',\'blocked\')">차단</button>';

    var rowOpacity = st === 'allow' ? '' : (st === 'hidden' ? 'opacity:0.6;' : 'opacity:0.4;');

    html +=
      '<tr style="' + rowOpacity + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + imgHtml + '</td>' +
        '<td style="text-align:left;padding-left:8px;">' + name + '</td>' +
        '<td style="font-size:0.72rem;color:#888;">' + gid + '</td>' +
        '<td><span style="font-size:0.7rem;color:#aaa;">' + type + '</span></td>' +
        '<td style="text-align:center;">' +
          '<div style="display:flex;gap:3px;justify-content:center;">' + btnAllow + btnHidden + btnBlocked + '</div>' +
        '</td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function grSetGame(vendor, gameId, status) {
  setGameStatus(vendor, gameId, status);
  grLoadModalGames(vendor);
  // 메인 페이지 현황도 업데이트
  grUpdateVendorCount(vendor);
}

function grBulkSet(vendor, status) {
  fetch('/api/hl/games?vendor=' + encodeURIComponent(vendor))
    .then(function(r) { return r.json(); })
    .then(function(games) {
      if (!Array.isArray(games)) return;
      setBulkGameStatus(vendor, games, status);
      grLoadModalGames(vendor);
      grUpdateVendorCount(vendor);
    });
}

function grUpdateVendorCount(vendor) {
  var el = document.getElementById('gr-cnt-' + vendor.replace(/[^a-zA-Z0-9]/g, '_'));
  if (!el) return;
  fetch('/api/hl/games?vendor=' + encodeURIComponent(vendor))
    .then(function(r) { return r.json(); })
    .then(function(games) {
      if (!Array.isArray(games)) return;
      var counts = { allow: 0, hidden: 0, blocked: 0 };
      games.forEach(function(g) { counts[getGameStatus(vendor, g.id)]++; });
      el.innerHTML =
        '<span style="color:#4ade80;">' + counts.allow + '</span> / ' +
        '<span style="color:#d97706;">' + counts.hidden + '</span> / ' +
        '<span style="color:#f87171;">' + counts.blocked + '</span>';
    });
}

function toggleGameAndRefresh(vendor, gameId) {
  toggleGame(vendor, gameId);
  var container = document.getElementById('gd-modal-games');
  if (!container) return;
  fetch('/api/hl/games?vendor=' + encodeURIComponent(vendor))
    .then(function(r) { return r.json(); })
    .then(function(games) {
      if (!Array.isArray(games)) return;
      games.sort(function(a, b) {
        var ra = a.rank !== null && a.rank !== undefined ? a.rank : 99999;
        var rb = b.rank !== null && b.rank !== undefined ? b.rank : 99999;
        return ra - rb;
      });
      renderGameTable(container, vendor, games);
      var showBtn = document.getElementById('gd-show-all-btn');
      var hideBtn = document.getElementById('gd-hide-all-btn');
      if (showBtn) showBtn.onclick = function() { toggleAllGamesInVendor(vendor, games, false); renderGameTable(container, vendor, games); };
      if (hideBtn) hideBtn.onclick = function() { toggleAllGamesInVendor(vendor, games, true); renderGameTable(container, vendor, games); };
    })
    .catch(function() {});
}

// ══════════════════════════════════════
//  게임사 그룹설정 페이지
// ══════════════════════════════════════

function renderGameGroup() {
  var content = document.getElementById('content');
  content.innerHTML =
    '<div class="pt-wrap">' +
      '<div style="margin-bottom:12px;font-size:0.78rem;color:#aaa;line-height:1.8;">' +
        '※ 회원 최초설정은 그룹없음(게임사스위치/전체)로 적용됩니다.<br>' +
        '※ 회원인 경우 직속상위 파트너의 그룹설정으로 통합 적용 가능합니다.<br>' +
        '※ 회원 개별 설정인 경우 상위 그룹보다 우선 시 적용 됩니다.' +
      '</div>' +
      '<div style="font-size:0.95rem;font-weight:bold;color:#a78bfa;margin-bottom:12px;">게임사스위치(그룹별)</div>' +
      '<div class="db-section" style="overflow-x:auto;">' +
        '<table class="db-table" style="font-size:0.82rem;">' +
          '<thead>' +
            '<tr>' +
              '<th style="text-align:center;">그룹명</th>' +
              '<th style="width:160px;text-align:center;">노출/비노출 설정</th>' +
              '<th style="width:120px;text-align:center;">그룹명 수정</th>' +
              '<th style="width:120px;text-align:center;">그룹삭제</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="gg-group-body"></tbody>' +
        '</table>' +
      '</div>' +
      '<div class="db-section" style="margin-top:12px;overflow-x:auto;">' +
        '<table class="db-table" style="font-size:0.82rem;">' +
          '<thead>' +
            '<tr>' +
              '<th style="text-align:center;">그룹명추가</th>' +
              '<th style="width:120px;text-align:center;">등록</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            '<tr>' +
              '<td style="text-align:center;padding:8px;">' +
                '<input type="text" id="gg-new-name" class="pt-search-input" placeholder="그룹명 입력" style="width:100%;max-width:500px;">' +
              '</td>' +
              '<td style="text-align:center;padding:8px;">' +
                '<button class="pt-action-btn" style="padding:4px 16px;font-size:0.78rem;background:#16a34a;border-color:#16a34a;color:#fff;font-weight:600;" onclick="ggAddGroup()">등록</button>' +
              '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';

  loadGameSettings().then(function() { ggRenderList(); });
}

function ggRenderList() {
  var tbody = document.getElementById('gg-group-body');
  if (!tbody) return;
  var groups = _gdSettings.groups || [];

  if (groups.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#888;padding:16px;text-align:center;">등록된 그룹이 없습니다.</td></tr>';
    return;
  }

  var html = '';
  groups.forEach(function(g, i) {
    var safeName = (g.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    html +=
      '<tr>' +
        '<td style="text-align:center;padding:8px;">' +
          '<input type="text" class="pt-search-input" value="' + (g.name || '').replace(/"/g, '&quot;') + '" id="gg-name-' + i + '" style="width:100%;max-width:500px;">' +
        '</td>' +
        '<td style="text-align:center;padding:8px;">' +
          '<button class="pt-action-btn" style="padding:4px 14px;font-size:0.75rem;background:#3b82f6;border-color:#3b82f6;color:#fff;font-weight:600;" onclick="ggOpenGameSetting(' + i + ')">게임 설정</button>' +
        '</td>' +
        '<td style="text-align:center;padding:8px;">' +
          '<button class="pt-action-btn" style="padding:4px 14px;font-size:0.75rem;background:transparent;border-color:#888;color:#ccc;" onclick="ggEditGroup(' + i + ')">수정</button>' +
        '</td>' +
        '<td style="text-align:center;padding:8px;">' +
          '<button class="pt-action-btn" style="padding:4px 14px;font-size:0.75rem;background:transparent;border-color:#dc2626;color:#f87171;" onclick="ggDeleteGroup(' + i + ')">삭제</button>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

function ggAddGroup() {
  var input = document.getElementById('gg-new-name');
  if (!input) return;
  var name = input.value.trim();
  if (!name) return alert('그룹명을 입력해주세요.');
  if (!_gdSettings.groups) _gdSettings.groups = [];
  var exists = _gdSettings.groups.some(function(g) { return g.name === name; });
  if (exists) return alert('이미 존재하는 그룹명입니다.');
  _gdSettings.groups.push({ name: name, hiddenGames: {}, blockedGames: {} });
  saveGameSettings().then(function() { ggRenderList(); });
  input.value = '';
}

function ggEditGroup(idx) {
  var groups = _gdSettings.groups || [];
  if (!groups[idx]) return;
  var input = document.getElementById('gg-name-' + idx);
  if (!input) return;
  var newName = input.value.trim();
  if (!newName) return alert('그룹명을 입력해주세요.');
  var dup = groups.some(function(g, i) { return i !== idx && g.name === newName; });
  if (dup) return alert('이미 존재하는 그룹명입니다.');
  groups[idx].name = newName;
  saveGameSettings().then(function() { alert('그룹명이 수정되었습니다.'); });
}

function ggDeleteGroup(idx) {
  var groups = _gdSettings.groups || [];
  if (!groups[idx]) return;
  if (!confirm('"' + groups[idx].name + '" 그룹을 삭제하시겠습니까?')) return;
  groups.splice(idx, 1);
  saveGameSettings().then(function() { ggRenderList(); });
}

function ggOpenGameSetting(idx) {
  var groups = _gdSettings.groups || [];
  var group = groups[idx];
  if (!group) return;

  var existing = document.getElementById('gg-modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'gg-modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';
  overlay.innerHTML =
    '<div style="width:900px;max-width:96vw;height:85vh;display:flex;flex-direction:column;background:#141824;border-radius:12px;border:1px solid #2a3040;overflow:hidden;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #2a3040;">' +
        '<span style="font-size:1.05rem;font-weight:bold;color:#fff;">[' + group.name + '] 게임 설정</span>' +
        '<button onclick="document.getElementById(\'gg-modal-overlay\').remove()" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer;">✕</button>' +
      '</div>' +
      '<div style="padding:0 12px 4px;border-bottom:1px solid #2a3040;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px;">' +
        '<input id="gg-modal-search" type="text" placeholder="게임사 검색..." style="flex:1;min-width:120px;padding:7px 12px;border-radius:6px;border:1px solid #374151;background:#1a1f2e;color:#fff;font-size:0.82rem;outline:none;" />' +
        '<button onclick="ggBulkVendor(' + idx + ',\'allow\')" style="padding:7px 16px;border-radius:6px;border:none;background:#16a34a;color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer;">전체허용</button>' +
        '<button onclick="ggBulkVendor(' + idx + ',\'hide\')" style="padding:7px 16px;border-radius:6px;border:none;background:#6b7280;color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer;">전체숨김</button>' +
      '</div>' +
      '<div style="padding:12px;overflow-y:auto;flex:1;">' +
        '<div id="gg-modal-games" style="text-align:center;padding:24px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임사 목록 로딩 중...</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  // 벤더 목록 로드 후 기본설정과 같은 테이블 렌더
  fetch('/api/hl/vendors')
    .then(function(r) { return r.json(); })
    .then(function(vendors) {
      var container = document.getElementById('gg-modal-games');
      if (!container) return;
      var liveList = [], slotList = [];
      Object.keys(vendors).forEach(function(key) {
        var v = vendors[key];
        if (!v.enabled) return;
        v._type = _gdLiveNames.indexOf(v.name) >= 0 ? 'live' : 'slot';
        if (v._type === 'live') liveList.push(v);
        else slotList.push(v);
      });

      // 그룹용 hiddenVendors 초기화
      if (!group.hiddenVendors) group.hiddenVendors = [];

      // 벤더 데이터 캐시 (검색용)
      window._ggModalVendors = { live: liveList, slot: slotList };
      window._ggModalIdx = idx;

      var html = '';
      html += ggRenderVendorSection('카지노', liveList, idx);
      html += ggRenderVendorSection('슬롯', slotList, idx);
      container.innerHTML = html;

      // 실시간 검색 바인딩
      var searchInput = document.getElementById('gg-modal-search');
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          ggFilterVendors(this.value.trim().toLowerCase());
        });
      }
    })
    .catch(function() {
      var container = document.getElementById('gg-modal-games');
      if (container) container.innerHTML = '<div style="color:#f87171;padding:20px;text-align:center;">게임사 목록을 불러오지 못했습니다.</div>';
    });
}

function ggRenderVendorSection(title, vendors, idx) {
  var group = _gdSettings.groups[idx];
  if (!group) return '';
  if (!group.hiddenVendors) group.hiddenVendors = [];

  var html =
    '<div style="margin-bottom:20px;">' +
      '<div style="font-size:1rem;font-weight:bold;color:#fff;margin-bottom:8px;">' + title + '</div>' +
      '<table class="db-table" style="font-size:0.82rem;">' +
        '<thead>' +
          '<tr>' +
            '<th style="text-align:center;">게임사</th>' +
            '<th colspan="2" style="text-align:center;">사용</th>' +
          '</tr>' +
          '<tr>' +
            '<th></th>' +
            '<th style="width:180px;text-align:center;">아너링크</th>' +
            '<th style="width:180px;text-align:center;">노출안함</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

  if (vendors.length === 0) {
    html += '<tr><td colspan="3" style="color:#888;padding:16px;text-align:center;">게임사가 없습니다.</td></tr>';
  } else {
    vendors.forEach(function(v) {
      var safeName = v.name.replace(/'/g, "\\'");
      var hidden = group.hiddenVendors.indexOf(v.name) >= 0;
      var activeStyle = 'padding:6px 16px;font-size:0.78rem;border-radius:6px;cursor:pointer;font-weight:600;border:none;';
      var hlBtn, noBtn;
      if (!hidden) {
        hlBtn = '<button style="' + activeStyle + 'background:#16a34a;color:#fff;" onclick="ggSetVendorApi(' + idx + ',\'' + safeName + '\',\'honorlink\')">아너링크</button>';
        noBtn = '<button style="' + activeStyle + 'background:transparent;border:1px solid #444;color:#888;" onclick="ggSetVendorApi(' + idx + ',\'' + safeName + '\',\'none\')">노출안함</button>';
      } else {
        hlBtn = '<button style="' + activeStyle + 'background:transparent;border:1px solid #444;color:#888;" onclick="ggSetVendorApi(' + idx + ',\'' + safeName + '\',\'honorlink\')">아너링크</button>';
        noBtn = '<button style="' + activeStyle + 'background:#16a34a;color:#fff;" onclick="ggSetVendorApi(' + idx + ',\'' + safeName + '\',\'none\')">노출안함</button>';
      }

      html +=
        '<tr style="' + (hidden ? 'opacity:0.5;' : '') + '">' +
          '<td style="text-align:center;font-weight:500;">' + v.name + '</td>' +
          '<td style="text-align:center;">' + hlBtn + '</td>' +
          '<td style="text-align:center;">' + noBtn + '</td>' +
        '</tr>';
    });
  }

  html += '</tbody></table></div>';
  return html;
}

function ggFilterVendors(keyword) {
  var container = document.getElementById('gg-modal-games');
  if (!container || !window._ggModalVendors) return;
  var idx = window._ggModalIdx;
  var liveList = window._ggModalVendors.live;
  var slotList = window._ggModalVendors.slot;
  if (keyword) {
    liveList = liveList.filter(function(v) { return v.name.toLowerCase().indexOf(keyword) >= 0; });
    slotList = slotList.filter(function(v) { return v.name.toLowerCase().indexOf(keyword) >= 0; });
  }
  var html = '';
  html += ggRenderVendorSection('카지노', liveList, idx);
  html += ggRenderVendorSection('슬롯', slotList, idx);
  container.innerHTML = html;
}

function ggBulkVendor(idx, action) {
  var group = _gdSettings.groups[idx];
  if (!group) return;
  if (!group.hiddenVendors) group.hiddenVendors = [];
  if (!window._ggModalVendors) return;
  var allVendors = window._ggModalVendors.live.concat(window._ggModalVendors.slot);
  if (action === 'allow') {
    // 전체허용: hiddenVendors 비우기
    allVendors.forEach(function(v) {
      var vi = group.hiddenVendors.indexOf(v.name);
      if (vi >= 0) group.hiddenVendors.splice(vi, 1);
    });
  } else {
    // 전체숨김: 모든 벤더 추가
    allVendors.forEach(function(v) {
      if (group.hiddenVendors.indexOf(v.name) < 0) group.hiddenVendors.push(v.name);
    });
  }
  saveGameSettings().then(function() {
    var searchVal = '';
    var searchInput = document.getElementById('gg-modal-search');
    if (searchInput) searchVal = searchInput.value.trim().toLowerCase();
    ggFilterVendors(searchVal);
  });
}

function ggSetVendorApi(idx, vendorName, api) {
  var group = _gdSettings.groups[idx];
  if (!group) return;
  if (!group.hiddenVendors) group.hiddenVendors = [];
  var vIdx = group.hiddenVendors.indexOf(vendorName);
  if (api === 'none') {
    if (vIdx < 0) group.hiddenVendors.push(vendorName);
  } else {
    if (vIdx >= 0) group.hiddenVendors.splice(vIdx, 1);
  }
  saveGameSettings().then(function() { ggOpenGameSetting(idx); });
}
