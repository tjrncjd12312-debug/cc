// ══════════════════════════════════════
//  게임사 기본설정 페이지
// ══════════════════════════════════════

var _gdVendors = [];
var _gdSettings = { hiddenVendors: [], hiddenGames: {}, blockedGames: {}, vendorOrder: { live: [], slot: [], hotel: [], sports: [] }, vendorApi: {}, groups: [] };
var _gdLiveNames = ['evolution','PragmaticPlay Live','Asia Gaming','DreamGame','WM Live','ezugi','bota','sexybcrt','SuperSpade','Skywind Live','vivo','AllBet','saGaming','Live88','XProGaming','MicroGaming','oriental','7-mojos','absolute','ezugiZ','PlayTech','rocketman','tvbet'];
var _gdHotelNames = [];
var _gdSportsNames = ['bti','xj'];

function loadGameSettings() {
  return fetch('/api/admin/games')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var d = res.data || {};
      _gdSettings = {
        hiddenVendors: d.hiddenVendors || [],
        hiddenGames: d.hiddenGames || {},
        blockedGames: d.blockedGames || {},
        vendorOrder: d.vendorOrder || { live: [], slot: [], hotel: [], sports: [] },
        vendorApi: d.vendorApi || {},
        groups: d.groups || [],
        pinnedGames: d.pinnedGames || {}
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
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
        '<span style="font-size:0.95rem;font-weight:bold;color:#a78bfa;">게임사 기본설정(그룹없음)</span>' +
        '<button id="gd-refresh-btn" style="margin-left:auto;padding:7px 14px;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;background:#6366f1;color:#fff;border:none;"><i class="fas fa-sync-alt" style="margin-right:4px;"></i>게임사 갱신</button>' +
      '</div>' +
      '<div id="gd-vendor-list">' +
        '<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>' +
      '</div>' +
    '</div>';

  loadGameSettings().then(function() { loadVendors(); });

  // 게임사 갱신 버튼
  var refreshBtn = document.getElementById('gd-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', function() {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="margin-right:4px;"></i>갱신 중...';
    Promise.all([
      fetch('/api/hl/vendors/refresh').then(function(r){ return r.json(); }),
      fetch('/api/hl/games/refresh').then(function(r){ return r.json(); }),
      fetch('/api/game/providers/refresh', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) }).then(function(r){ return r.json(); })
    ]).then(function(results) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt" style="margin-right:4px;"></i>게임사 갱신';
      var hlV = (results[0] && results[0].count) || 0;
      var hlG = (results[1] && results[1].refreshed) || 0;
      var csV = (results[2] && results[2].count) || 0;
      if (typeof _showToast === 'function') _showToast('갱신 완료 (아너링크 ' + hlV + '개, 게임 ' + hlG + '개, 오닉스 ' + csV + '개)', 'success');
      loadVendors();
    }).catch(function() {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt" style="margin-right:4px;"></i>게임사 갱신';
      if (typeof _showToast === 'function') _showToast('갱신 실패', 'error');
    });
  });
}

var _csLiveNames = ['evolution','casino-sa','ag','wm','dream-gaming','sexybcrt','ezugi','allbet','bigGaming','skywind-live','pragmaticplay-live'];
var _hlVendorMap = {}; // HonorLink 게임사 이름 맵
var _csVendorMap = {}; // CS API 게임사 이름 맵

// 어드민에서도 합쳐서 보여줄 게임사 (메인 ← 서브들)
// 벤더 표시이름 매핑
var _hlDisplayNames = {};
var _csDisplayNames = { 'oriental': 'oriental casino hotel' };

var _gdMergeVendors = { 'MicroGamingSlot': ['MicroGaming Plus Slo'], 'MicroGaming': ['MicroGaming Plus'] };
var _gdMergedSubs = [];
(function() {
  Object.keys(_gdMergeVendors).forEach(function(k) {
    _gdMergeVendors[k].forEach(function(s) { _gdMergedSubs.push(s); });
  });
})();

function loadVendors() {
  var container = document.getElementById('gd-vendor-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임사 목록 불러오는 중...</div>';

  // HonorLink + CS API 둘 다 불러오기
  Promise.all([
    fetch('/api/hl/vendors').then(function(r) { return r.json(); }).catch(function() { return {}; }),
    fetch('/api/game/providers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'1', gametype:'' }) }).then(function(r) { return r.json(); }).catch(function() { return { data: [] }; })
  ]).then(function(results) {
    var hlVendors = results[0];
    var csRes = results[1];
    _gdVendors = [];
    _hlVendorMap = {};
    _csVendorMap = {};

    // CS code → HL name 수동 매핑 (이름이 완전히 다른 경우)
    var _csToHlMap = {
      'casino-pragmatic': 'PragmaticPlay Live',
      'casino-sa': 'saGaming',
      'casino-dream': 'DreamGame',
      'casino-ezugi': 'ezugi',
      'casino-micro': 'MicroGaming',
      'pragmaticplay': 'PragmaticPlay',
      'cq9': 'CQ9',
      'hbn': 'Habanero',
      'bng': 'Booongo',
      'nolimitcity': 'Nolimit City',
      'pg': 'PG Soft',
      'casino-playace': 'Asia Gaming'
    };
    // 정규화: 공백, 하이픈, 언더스코어 제거 후 소문자
    function _normName(n) { return (n || '').toLowerCase().replace(/[\s\-_]/g, ''); }
    // 정규화된 이름으로 HL 벤더 찾기
    var _hlNormMap = {};

    // HonorLink 게임사 추가
    if (hlVendors && !hlVendors.error && !hlVendors._status) {
      Object.keys(hlVendors).forEach(function(key) {
        var v = hlVendors[key];
        v._type = _gdSportsNames.indexOf(v.name.toLowerCase()) >= 0 ? 'sports' : _gdLiveNames.indexOf(v.name) >= 0 ? 'live' : _gdHotelNames.indexOf(v.name.toLowerCase()) >= 0 ? 'hotel' : 'slot';
        v._source = 'honorlink';
        if (_hlDisplayNames[v.name]) v.displayName = _hlDisplayNames[v.name];
        _hlVendorMap[v.name.toLowerCase()] = v;
        _hlNormMap[_normName(v.name)] = v;
        _gdVendors.push(v);
      });
    }

    // CS API 게임사 추가 (HonorLink에 없는 것만 — 정규화 비교)
    var cpList = csRes && (csRes.data || csRes.list || []);
    if (Array.isArray(cpList)) {
      cpList.forEach(function(cp) {
        var csName = cp.code || '';
        var csNorm = _normName(csName);
        // 호텔카지노(SxHotel): _hotel 키로만 등록
        if (cp.gameid === 'SxHotel') {
          _csVendorMap[(csName + '_hotel').toLowerCase()] = cp;
          _gdVendors.push({
            name: csName + '_hotel',
            displayName: _csDisplayNames[csName.toLowerCase()] || cp.name || csName,
            enabled: true,
            _type: 'hotel',
            _source: 'csapi',
            _csapi: true,
            _gameid: cp.gameid || '',
            _code: cp.code || ''
          });
          return;
        }
        _csVendorMap[csName.toLowerCase()] = cp;
        // 수동 매핑 → 정규화 → 소문자 순으로 HL 매칭
        var hlMappedName = _csToHlMap[csName.toLowerCase()];
        var matchedHL = (hlMappedName && _hlVendorMap[hlMappedName.toLowerCase()]) || _hlVendorMap[csName.toLowerCase()] || _hlNormMap[csNorm];
        if (matchedHL) {
          // HL에 이미 있으면 CS 맵에 HL 이름으로도 등록 (양쪽 버튼 활성화용)
          _csVendorMap[matchedHL.name.toLowerCase()] = cp;
        } else {
          _gdVendors.push({
            name: csName,
            displayName: cp.name || csName,
            enabled: true,
            _type: cp.gameid === 'SxHotel' ? 'hotel' : (cp.type === 'live' || _csLiveNames.indexOf(csName.toLowerCase()) >= 0) ? 'live' : 'slot',
            _source: 'csapi',
            _gameid: cp.gameid || '',
            _code: cp.code || ''
          });
        }
      });
    }

    // 합쳐진 서브 게임사 제거 (MicroGaming Plus Slo → MicroGamingSlot에 합침)
    _gdVendors = _gdVendors.filter(function(v) { return _gdMergedSubs.indexOf(v.name) < 0; });

    // 라이브+슬롯 혼합 벤더: 양쪽에 표시
    var _mixedVendors = ['Betgames.tv','onetouch'];
    _mixedVendors.forEach(function(mName) {
      var orig = _gdVendors.find(function(v) { return v.name === mName; });
      if (orig) {
        orig._type = 'live';
        var clone = Object.assign({}, orig, { name: mName + '_slot', _type: 'slot', _mixedSlot: true, _hlVendor: mName, displayName: mName + '_slot' });
        _gdVendors.push(clone);
      }
    });

    var liveList = _gdVendors.filter(function(v) { return v._type === 'live'; });
    var slotList = _gdVendors.filter(function(v) { return v._type === 'slot'; });
    var hotelList = _gdVendors.filter(function(v) { return v._type === 'hotel'; });
    var sportsList = _gdVendors.filter(function(v) { return v._type === 'sports'; });
    ensureVendorOrder(liveList, 'live');
    ensureVendorOrder(slotList, 'slot');
    ensureVendorOrder(hotelList, 'hotel');
    ensureVendorOrder(sportsList, 'sports');
    saveGameSettings();
    filterVendors();
  }).catch(function() {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">서버에 연결할 수 없습니다.</div>';
  });
}

function _loadHlVendors(container) {
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
        v._source = 'honorlink';
        _gdVendors.push(v);
      });

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

function _loadCsVendors(container) {
  fetch('/api/game/providers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'1', gametype:'' }) })
    .then(function(r) { return r.json(); })
    .then(function(csProviders) {
      console.log('[CS API providers response]', JSON.stringify(csProviders));
      var cpList = csProviders && (csProviders.data || csProviders.list || csProviders.providers || []);
      if (!csProviders || (!Array.isArray(cpList) || cpList.length === 0)) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">오닉스 게임사 목록을 불러오지 못했습니다. (응답: ' + JSON.stringify(csProviders).substring(0,200) + ')</div>';
        return;
      }
      _gdVendors = [];
      cpList.forEach(function(cp) {
        _gdVendors.push({
          name: cp.code || cp.vendor_code || cp.id || '',
          displayName: cp.name || cp.vendor_name || cp.code || '',
          enabled: true,
          _type: _csLiveNames.indexOf((cp.code || '').toLowerCase()) >= 0 ? 'live' : 'slot',
          _source: 'csapi',
          _gameid: cp.gameid || cp.game_id || '',
          _code: cp.code || cp.vendor_code || ''
        });
      });
      filterVendors();
    })
    .catch(function() {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">서버에 연결할 수 없습니다.</div>';
    });
}

function filterVendors() {
  var container = document.getElementById('gd-vendor-list');
  if (!container) return;

  var filtered = _gdVendors.filter(function(v) { return _gdMergedSubs.indexOf(v.name) < 0; });
  var liveAll = filtered.filter(function(v) { return v._type === 'live'; });
  var slotAll = filtered.filter(function(v) { return v._type === 'slot'; });
  var hotelAll = filtered.filter(function(v) { return v._type === 'hotel'; });
  var sportsAll = filtered.filter(function(v) { return v._type === 'sports'; });
  var liveSorted = getOrderedVendors(liveAll, 'live');
  var slotSorted = getOrderedVendors(slotAll, 'slot');
  var hotelSorted = getOrderedVendors(hotelAll, 'hotel');
  var sportsSorted = getOrderedVendors(sportsAll, 'sports');

  var html = '';
  html += renderVendorSection('카지노', liveSorted, 'live');
  html += renderVendorSection('슬롯', slotSorted, 'slot');
  html += renderVendorSection('스포츠', sportsSorted, 'sports');
  html += renderVendorSection('호텔카지노', hotelSorted, 'hotel');
  container.innerHTML = html;
}

function renderVendorSection(title, vendors, type) {
  var html =
    '<div class="db-section" style="margin-bottom:20px;overflow-x:auto;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;">' +
        '<span style="font-size:1rem;font-weight:bold;color:#fff;">' + title + '</span>' +
        '<div style="display:flex;gap:8px;">' +
          '<button onclick="gdHideAll(\'' + type + '\')" style="padding:5px 14px;font-size:0.78rem;background:#ef4444;border:1px solid #ef4444;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;">전체 노출안함</button>' +
        '</div>' +
      '</div>' +
      '<table class="db-table" style="font-size:0.82rem;">' +
        '<thead>' +
          '<tr>' +
            '<th style="width:70px;text-align:center;">배열</th>' +
            '<th style="text-align:center;">게임사</th>' +
            '<th colspan="3" style="text-align:center;">사용</th>' +
          '</tr>' +
          '<tr>' +
            '<th></th><th></th>' +
            '<th style="width:150px;text-align:center;">아너링크</th>' +
            '<th style="width:150px;text-align:center;">오닉스</th>' +
            '<th style="width:150px;text-align:center;">노출안함</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

  if (vendors.length === 0) {
    html += '<tr><td colspan="5" style="color:#888;padding:16px;text-align:center;">게임사가 없습니다.</td></tr>';
  } else {
    vendors.forEach(function(v, i) {
      var safeName = v.name.replace(/'/g, "\\'");
      var _lookupName = v._hlVendor || v.name; // 혼합 벤더는 원본 이름으로 조회
      var currentApi = _gdSettings.vendorApi[v.name] || _gdSettings.vendorApi[_lookupName] || 'honorlink';
      if (isVendorHidden(v.name)) currentApi = 'none';
      var activeStyle = 'padding:6px 16px;font-size:0.78rem;border-radius:6px;cursor:pointer;font-weight:600;border:none;';
      var onStyle = activeStyle + 'background:#16a34a;color:#fff;';
      var offStyle = activeStyle + 'background:transparent;border:1px solid #444;color:#888;';

      // HonorLink에 있는지, CS API에 있는지 체크 (호텔은 자기 소스만)
      var isHotel = v.name.indexOf('_hotel') >= 0;
      var hasHL = (isHotel && v._source === 'csapi') ? false : !!_hlVendorMap[_lookupName.toLowerCase()];
      var hasCS = (isHotel && v._source === 'honorlink') ? false : !!_csVendorMap[_lookupName.toLowerCase()];

      var hlBtn, csBtn, noBtn;
      if (hasHL) {
        hlBtn = '<button style="' + (currentApi === 'honorlink' ? onStyle : offStyle) + '" onclick="gdSetVendorApi(\'' + safeName + '\',\'honorlink\')">아너링크</button>';
      } else {
        hlBtn = '<span style="color:#555;font-size:0.72rem;">-</span>';
      }
      if (hasCS) {
        csBtn = '<button style="' + (currentApi === 'csapi' ? onStyle : offStyle) + '" onclick="gdSetVendorApi(\'' + safeName + '\',\'csapi\')">오닉스</button>';
      } else {
        csBtn = '<span style="color:#555;font-size:0.72rem;">-</span>';
      }
      noBtn = '<button style="' + (currentApi === 'none' ? onStyle : offStyle) + '" onclick="gdSetVendorApi(\'' + safeName + '\',\'none\')">노출안함</button>';

      var orderInput = '<input type="number" value="' + (i + 1) + '" min="1" max="' + vendors.length + '" ' +
        'style="width:44px;text-align:center;background:var(--input-bg,#1a2030);border:1px solid var(--input-border,#444);color:var(--text1,#fff);border-radius:4px;padding:3px;font-size:0.78rem;" ' +
        'onchange="setVendorOrder(\'' + safeName + '\',\'' + type + '\',parseInt(this.value))" ' +
        'onkeydown="if(event.key===\'Enter\'){this.blur();}">';

      html +=
        '<tr style="' + (currentApi === 'none' ? 'opacity:0.5;' : '') + '">' +
          '<td style="text-align:center;">' + orderInput + '</td>' +
          '<td style="text-align:center;font-weight:500;">' + (v._type === 'slot' ? '<a href="#" onclick="event.preventDefault();openGameListModal(\'' + safeName + '\')" style="color:#60a5fa;text-decoration:underline;cursor:pointer;">' + (v.displayName || v.name) + '</a>' : (v.displayName || v.name)) + '</td>' +
          '<td style="text-align:center;">' + hlBtn + '</td>' +
          '<td style="text-align:center;">' + csBtn + '</td>' +
          '<td style="text-align:center;">' + noBtn + '</td>' +
        '</tr>';
    });
  }

  html += '</tbody></table></div>';
  return html;
}

function gdSetVendorApi(name, api) {
  if (api === 'none') {
    // 노출안함
    if (!isVendorHidden(name)) {
      _gdSettings.hiddenVendors.push(name);
    }
    _gdSettings.vendorApi[name] = 'none';
  } else {
    // 아너링크 또는 CS API 선택
    var idx = _gdSettings.hiddenVendors.indexOf(name);
    if (idx >= 0) _gdSettings.hiddenVendors.splice(idx, 1);
    _gdSettings.vendorApi[name] = api;
  }
  saveGameSettings().then(function() { filterVendors(); });
}

function gdShowAll(type) {
  var vendors = _gdVendors.filter(function(v) { return v._type === type; });
  vendors.forEach(function(v) {
    var idx = _gdSettings.hiddenVendors.indexOf(v.name);
    if (idx >= 0) _gdSettings.hiddenVendors.splice(idx, 1);
    // 노출안함이었으면 기본 API로 복원
    if (_gdSettings.vendorApi[v.name] === 'none') {
      delete _gdSettings.vendorApi[v.name];
    }
  });
  saveGameSettings().then(function() { filterVendors(); });
}

function gdHideAll(type) {
  var vendors = _gdVendors.filter(function(v) { return v._type === type; });
  vendors.forEach(function(v) {
    if (_gdSettings.hiddenVendors.indexOf(v.name) < 0) {
      _gdSettings.hiddenVendors.push(v.name);
    }
    _gdSettings.vendorApi[v.name] = 'none';
  });
  saveGameSettings().then(function() { filterVendors(); });
}

// ── 게임 목록 모달 ──
function openGameListModal(vendor) {
  // 혼합 벤더(_slot 접미사)면 실제 벤더명 추출
  var _realVendor = vendor;
  var _mixedFilter = '';
  var _mv = _gdVendors.find(function(v) { return v.name === vendor && v._mixedSlot; });
  if (_mv && _mv._hlVendor) { _realVendor = _mv._hlVendor; _mixedFilter = 'slot'; }

  // 양쪽 API 존재 여부 체크
  var _lookupName = _mv && _mv._hlVendor ? _mv._hlVendor : vendor;
  var hasHL = !!_hlVendorMap[_lookupName.toLowerCase()];
  var hasCS = !!(_csVendorMap[_realVendor.toLowerCase()] || _csVendorMap[vendor.toLowerCase()]);
  var hasBoth = hasHL && hasCS;

  var existing = document.getElementById('gd-modal-overlay');
  if (existing) existing.remove();

  // 현재 vendorApi 설정에 따라 기본 탭 결정
  var vendorApi = _gdSettings.vendorApi[_realVendor] || _gdSettings.vendorApi[vendor] || 'honorlink';
  var defaultTab = (vendorApi === 'csapi' && hasCS) ? 'csapi' : (hasHL ? 'honorlink' : 'csapi');

  var tabHtml = '';
  if (hasBoth) {
    var hlTabStyle = 'padding:6px 16px;font-size:0.82rem;border:none;border-radius:6px 6px 0 0;cursor:pointer;font-weight:600;';
    var csTabStyle = hlTabStyle;
    tabHtml =
      '<div id="gd-modal-tabs" style="display:flex;gap:2px;padding:0 18px;background:#0d1117;border-bottom:1px solid #2a3040;">' +
        '<button id="gd-tab-hl" style="' + hlTabStyle + '" onclick="_gdSwitchTab(\'honorlink\')">아너링크</button>' +
        '<button id="gd-tab-cs" style="' + csTabStyle + '" onclick="_gdSwitchTab(\'csapi\')">오닉스</button>' +
      '</div>';
  }

  var overlay = document.createElement('div');
  overlay.id = 'gd-modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';
  overlay.innerHTML =
    '<div style="width:1000px;max-width:96vw;max-height:85vh;display:flex;flex-direction:column;background:#141824;border-radius:12px;border:1px solid #2a3040;overflow:hidden;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:' + (hasBoth ? 'none' : '1px solid #2a3040') + ';">' +
        '<span style="font-size:1.05rem;font-weight:bold;color:#fff;">' + vendor + ' 게임 목록</span>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
          '<button id="gd-show-all-btn" class="pt-action-btn" style="padding:3px 10px;font-size:0.72rem;background:#16a34a;border-color:#16a34a;color:#fff;"><i class="fas fa-eye"></i> 전체 노출</button>' +
          '<button id="gd-hide-all-btn" class="pt-action-btn" style="padding:3px 10px;font-size:0.72rem;background:#dc2626;border-color:#dc2626;color:#fff;"><i class="fas fa-eye-slash"></i> 전체 숨김</button>' +
          '<button onclick="document.getElementById(\'gd-modal-overlay\').remove()" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer;margin-left:8px;">✕</button>' +
        '</div>' +
      '</div>' +
      tabHtml +
      '<div style="padding:12px;overflow-y:auto;flex:1;">' +
        '<div id="gd-modal-games" style="text-align:center;padding:24px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임 목록 로딩 중...</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  // 탭 전환용 상태 저장
  window._gdModalVendor = vendor;
  window._gdModalRealVendor = _realVendor;
  window._gdModalMixedFilter = _mixedFilter;
  window._gdModalHasHL = hasHL;
  window._gdModalHasCS = hasCS;

  // 게임 로드
  _gdLoadTabGames(defaultTab);
}

// 탭 스타일 업데이트
function _gdUpdateTabStyle(activeTab) {
  var hlTab = document.getElementById('gd-tab-hl');
  var csTab = document.getElementById('gd-tab-cs');
  if (!hlTab || !csTab) return;
  var activeStyle = 'padding:6px 16px;font-size:0.82rem;border:none;border-radius:6px 6px 0 0;cursor:pointer;font-weight:600;background:#141824;color:#fff;';
  var inactiveStyle = 'padding:6px 16px;font-size:0.82rem;border:none;border-radius:6px 6px 0 0;cursor:pointer;font-weight:600;background:transparent;color:#888;';
  hlTab.style.cssText = activeTab === 'honorlink' ? activeStyle : inactiveStyle;
  csTab.style.cssText = activeTab === 'csapi' ? activeStyle : inactiveStyle;
}

// 탭 전환
function _gdSwitchTab(tab) {
  _gdUpdateTabStyle(tab);
  _gdLoadTabGames(tab);
}

// 탭별 게임 로드
function _gdLoadTabGames(tab) {
  var vendor = window._gdModalVendor;
  var realVendor = window._gdModalRealVendor;
  var mixedFilter = window._gdModalMixedFilter;

  _gdUpdateTabStyle(tab);
  window._gdModalCurrentTab = tab;

  var container = document.getElementById('gd-modal-games');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:24px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임 목록 로딩 중...</div>';

  var csInfo = _csVendorMap[realVendor.toLowerCase()] || _csVendorMap[vendor.toLowerCase()];
  var fetchPromise;

  if (tab === 'csapi' && csInfo) {
    fetchPromise = fetch('/api/game/games/sorted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor: realVendor, gameid: csInfo.gameid, code: csInfo.code, gametype: 'slot' })
    }).then(function(r) { return r.json(); }).then(function(res) {
      var csGames = (res && res.data) || [];
      return csGames.map(function(g, i) {
        return {
          id: g.subcode || '',
          title: g.name_eng || g.name || '',
          name: g.name_eng || g.name || '',
          type: g.type || 'slot',
          rank: i + 1,
          thumbnail: g.img || '',
          thumbnails: g.img ? { '300x300': g.img } : {},
          langs: { ko: g.name_kor || g.name_eng || '' },
          _source: 'csapi'
        };
      });
    });
  } else {
    fetchPromise = fetch('/api/hl/games?vendor=' + encodeURIComponent(realVendor))
      .then(function(r) { return r.json(); });
  }

  fetchPromise.then(function(games) {
      if (mixedFilter === 'slot' && Array.isArray(games)) {
        games = games.filter(function(g) { return g.type === 'slot'; });
      }
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

      // 저장 키: 오닉스 탭이면 CS코드 + _cs (유저 페이지와 동일한 키)
      var csInfo2 = _csVendorMap[realVendor.toLowerCase()] || _csVendorMap[vendor.toLowerCase()];
      var sKey = (window._gdModalCurrentTab === 'csapi' && csInfo2) ? csInfo2.code + '_cs' : vendor;

      document.getElementById('gd-show-all-btn').onclick = function() {
        toggleAllGamesInVendor(sKey, games, false);
        renderGameTable(container, sKey, games);
      };
      document.getElementById('gd-hide-all-btn').onclick = function() {
        toggleAllGamesInVendor(sKey, games, true);
        renderGameTable(container, sKey, games);
      };

      container._games = games;
      container._vendor = vendor;
      container._storageKey = sKey;
      renderGameTable(container, sKey, games);
    })
    .catch(function() {
      if (container) container.innerHTML = '<div style="color:#f87171;padding:20px;">게임 목록을 불러오지 못했습니다.</div>';
    });
}

function renderGameTable(container, vendor, games) {
  var visibleCnt = 0;
  var hiddenCnt = 0;
  var blockedCnt = 0;
  var pinned = _gdSettings.pinnedGames[vendor] || [];
  var pinnedCnt = pinned.length;
  games.forEach(function(g) {
    var st = getGameStatus(vendor, g.id);
    if (st === 'hidden') hiddenCnt++;
    else if (st === 'blocked') blockedCnt++;
    else visibleCnt++;
  });

  // 인기게임 상단 정렬: pinned 목록 순서대로 위에, 나머지는 원래 순서
  var sortedGames = games.slice();
  sortedGames.sort(function(a, b) {
    var ai = pinned.indexOf(String(a.id));
    var bi = pinned.indexOf(String(b.id));
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return 0;
  });

  var html =
    '<div style="margin-bottom:8px;font-size:0.78rem;color:#aaa;">' +
      '총 <b style="color:#fff;">' + games.length + '</b>개 | ' +
      '노출 <b style="color:#4ade80;">' + visibleCnt + '</b>개 | ' +
      '숨김 <b style="color:#f87171;">' + hiddenCnt + '</b>개 | ' +
      '점검 <b style="color:#f59e0b;">' + blockedCnt + '</b>개 | ' +
      '인기 <b style="color:#fbbf24;">' + pinnedCnt + '</b>개' +
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
          '<th style="width:80px;text-align:center;">인기</th>' +
          '<th style="width:180px;text-align:center;">상태</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  sortedGames.forEach(function(g, i) {
    var name = (g.langs && g.langs.ko) || g.title || g.name || '';
    var img = (g.thumbnails && (g.thumbnails['300x300'] || g.thumbnails['200x200'])) || g.thumbnail || '';
    var imgHtml = img
      ? '<img src="' + img + '" style="width:50px;height:38px;object-fit:cover;border-radius:4px;display:block;margin:0 auto;" loading="lazy">'
      : '<div style="width:50px;height:38px;background:#2a3040;border-radius:4px;margin:0 auto;"></div>';
    var rank = g.rank !== null && g.rank !== undefined ? g.rank : '-';
    var type = g.type || '-';
    var status = getGameStatus(vendor, g.id);
    var safeVendor = vendor.replace(/'/g, "\\'");
    var safeId = String(g.id).replace(/'/g, "\\'");
    var isPinned = pinned.indexOf(String(g.id)) >= 0;
    var pinIdx = pinned.indexOf(String(g.id));

    var btnStyle = 'padding:2px 8px;font-size:0.7rem;border-radius:6px;cursor:pointer;font-weight:600;border:none;';
    var onStyle = btnStyle;
    var offStyle = btnStyle + 'background:transparent;border:1px solid #444;color:#888;';
    var statusBtns =
      '<div style="display:flex;gap:3px;justify-content:center;">' +
        '<button style="' + (status === 'allow' ? onStyle + 'background:#16a34a;color:#fff;' : offStyle) + '" onclick="setGameStatusAndRefresh(\'' + safeVendor + '\',\'' + safeId + '\',\'allow\')"><i class="fas fa-eye"></i> 노출</button>' +
        '<button style="' + (status === 'hidden' ? onStyle + 'background:#dc2626;color:#fff;' : offStyle) + '" onclick="setGameStatusAndRefresh(\'' + safeVendor + '\',\'' + safeId + '\',\'hidden\')"><i class="fas fa-eye-slash"></i> 숨김</button>' +
        '<button style="' + (status === 'blocked' ? onStyle + 'background:#f59e0b;color:#000;' : offStyle) + '" onclick="setGameStatusAndRefresh(\'' + safeVendor + '\',\'' + safeId + '\',\'blocked\')"><i class="fas fa-wrench"></i> 점검</button>' +
      '</div>';

    // 인기게임 버튼: 고정/해제 + 순서 이동
    var pinBtnHtml = '';
    if (isPinned) {
      pinBtnHtml =
        '<div style="display:flex;align-items:center;justify-content:center;gap:2px;">' +
          (pinIdx > 0 ? '<button class="pt-action-btn" style="padding:1px 4px;font-size:0.65rem;background:#334155;border-color:#475569;color:#fff;" onclick="movePinnedGame(\'' + safeVendor + '\',\'' + safeId + '\',-1)"><i class="fas fa-arrow-up"></i></button>' : '') +
          '<button class="pt-action-btn" style="padding:2px 6px;font-size:0.65rem;background:#f59e0b;border-color:#f59e0b;color:#000;font-weight:bold;" onclick="togglePinnedGame(\'' + safeVendor + '\',\'' + safeId + '\')"><i class="fas fa-star"></i> ' + (pinIdx + 1) + '</button>' +
          (pinIdx < pinned.length - 1 ? '<button class="pt-action-btn" style="padding:1px 4px;font-size:0.65rem;background:#334155;border-color:#475569;color:#fff;" onclick="movePinnedGame(\'' + safeVendor + '\',\'' + safeId + '\',1)"><i class="fas fa-arrow-down"></i></button>' : '') +
        '</div>';
    } else {
      pinBtnHtml = '<button class="pt-action-btn" style="padding:2px 6px;font-size:0.65rem;background:#334155;border-color:#475569;color:#aaa;" onclick="togglePinnedGame(\'' + safeVendor + '\',\'' + safeId + '\')"><i class="far fa-star"></i></button>';
    }

    var rowOpacity = status === 'hidden' ? 'opacity:0.4;' : (status === 'blocked' ? 'opacity:0.6;' : '');
    html +=
      '<tr style="' + rowOpacity + (isPinned ? 'background:rgba(245,158,11,0.08);' : '') + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + imgHtml + '</td>' +
        '<td style="text-align:left;padding-left:8px;">' + name + '</td>' +
        '<td style="font-size:0.72rem;color:#888;">' + g.id + '</td>' +
        '<td>' + rank + '</td>' +
        '<td><span style="font-size:0.7rem;color:#aaa;">' + type + '</span></td>' +
        '<td style="text-align:center;">' + pinBtnHtml + '</td>' +
        '<td style="text-align:center;">' + statusBtns + '</td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ── 인기게임 고정/해제 ──
function togglePinnedGame(vendor, gameId) {
  if (!_gdSettings.pinnedGames) _gdSettings.pinnedGames = {};
  if (!_gdSettings.pinnedGames[vendor]) _gdSettings.pinnedGames[vendor] = [];
  var list = _gdSettings.pinnedGames[vendor];
  var idx = list.indexOf(String(gameId));
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(String(gameId));
  }
  saveGameSettings().then(function() {
    // 모달 내 테이블 갱신
    var container = document.getElementById('gd-modal-games');
    if (container && container._games && container._vendor) {
      renderGameTable(container, container._vendor, container._games);
    }
  });
}

// ── 인기게임 순서 이동 ──
function movePinnedGame(vendor, gameId, direction) {
  if (!_gdSettings.pinnedGames || !_gdSettings.pinnedGames[vendor]) return;
  var list = _gdSettings.pinnedGames[vendor];
  var idx = list.indexOf(String(gameId));
  if (idx < 0) return;
  var newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= list.length) return;
  var tmp = list[idx];
  list[idx] = list[newIdx];
  list[newIdx] = tmp;
  saveGameSettings().then(function() {
    var container = document.getElementById('gd-modal-games');
    if (container && container._games && container._vendor) {
      renderGameTable(container, container._vendor, container._games);
    }
  });
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

// ── 그룹용 게임 목록 모달 ──
function ggOpenGameListModal(idx, vendor) {
  var group = _gdSettings.groups[idx];
  if (!group) return;
  if (!group.hiddenGames) group.hiddenGames = {};
  if (!group.blockedGames) group.blockedGames = {};

  // 그룹설정 벤더는 _ggModalVendors에서 찾기
  var _ggVendorObj = null;
  if (window._ggModalVendors) {
    ['slot','live','sports','hotel'].forEach(function(t) {
      (window._ggModalVendors[t] || []).forEach(function(v) {
        if (v.name === vendor) _ggVendorObj = v;
      });
    });
  }
  var _realVendor = vendor;
  var hasHL = _ggVendorObj ? (_ggVendorObj._hasHL !== false) : !!_hlVendorMap[vendor.toLowerCase()];
  var hasCS = _ggVendorObj ? !!_ggVendorObj._hasCS : !!(_csVendorMap[vendor.toLowerCase()]);
  var hasBoth = hasHL && hasCS;

  var vendorApi = (group.vendorApi && group.vendorApi[vendor]) || _gdSettings.vendorApi[_realVendor] || _gdSettings.vendorApi[vendor] || 'honorlink';
  var defaultTab = (vendorApi === 'csapi' && hasCS) ? 'csapi' : (hasHL ? 'honorlink' : 'csapi');

  var tabHtml = '';
  if (hasBoth) {
    tabHtml =
      '<div id="gg-gl-tabs" style="display:flex;gap:2px;padding:0 18px;background:#0d1117;border-bottom:1px solid #2a3040;">' +
        '<button id="gg-gl-tab-hl" onclick="_ggGlSwitchTab(\'honorlink\')">아너링크</button>' +
        '<button id="gg-gl-tab-cs" onclick="_ggGlSwitchTab(\'csapi\')">오닉스</button>' +
      '</div>';
  }

  var existing = document.getElementById('gg-gl-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'gg-gl-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10001;';
  overlay.innerHTML =
    '<div style="width:1000px;max-width:96vw;max-height:85vh;display:flex;flex-direction:column;background:#141824;border-radius:12px;border:1px solid #2a3040;overflow:hidden;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:' + (hasBoth ? 'none' : '1px solid #2a3040') + ';">' +
        '<span style="font-size:1.05rem;font-weight:bold;color:#fff;">' + vendor + ' 게임 목록 (그룹: ' + group.name + ')</span>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
          '<button id="gg-gl-show-all" class="pt-action-btn" style="padding:3px 10px;font-size:0.72rem;background:#16a34a;border-color:#16a34a;color:#fff;"><i class="fas fa-eye"></i> 전체 노출</button>' +
          '<button id="gg-gl-hide-all" class="pt-action-btn" style="padding:3px 10px;font-size:0.72rem;background:#dc2626;border-color:#dc2626;color:#fff;"><i class="fas fa-eye-slash"></i> 전체 숨김</button>' +
          '<button onclick="document.getElementById(\'gg-gl-overlay\').remove()" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer;margin-left:8px;">✕</button>' +
        '</div>' +
      '</div>' +
      tabHtml +
      '<div style="padding:12px;overflow-y:auto;flex:1;">' +
        '<div id="gg-gl-games" style="text-align:center;padding:24px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임 목록 로딩 중...</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  window._ggGlIdx = idx;
  window._ggGlVendor = vendor;
  window._ggGlRealVendor = _realVendor;
  window._ggGlCurrentTab = null;

  _ggGlLoadTab(defaultTab);
}

function _ggGlUpdateTabStyle(tab) {
  var hlTab = document.getElementById('gg-gl-tab-hl');
  var csTab = document.getElementById('gg-gl-tab-cs');
  if (!hlTab || !csTab) return;
  var activeStyle = 'padding:6px 16px;font-size:0.82rem;border:none;border-radius:6px 6px 0 0;cursor:pointer;font-weight:600;background:#141824;color:#fff;';
  var inactiveStyle = 'padding:6px 16px;font-size:0.82rem;border:none;border-radius:6px 6px 0 0;cursor:pointer;font-weight:600;background:transparent;color:#888;';
  hlTab.style.cssText = tab === 'honorlink' ? activeStyle : inactiveStyle;
  csTab.style.cssText = tab === 'csapi' ? activeStyle : inactiveStyle;
}

function _ggGlSwitchTab(tab) {
  _ggGlUpdateTabStyle(tab);
  _ggGlLoadTab(tab);
}

function _ggGlLoadTab(tab) {
  var vendor = window._ggGlVendor;
  var realVendor = window._ggGlRealVendor;
  window._ggGlCurrentTab = tab;
  _ggGlUpdateTabStyle(tab);

  var container = document.getElementById('gg-gl-games');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:24px;color:#888;"><i class="fas fa-spinner fa-spin"></i> 게임 목록 로딩 중...</div>';

  var _ggCsMap = window._ggCsVendorMap || {};
  var csInfo = _ggCsMap[realVendor.toLowerCase()] || _ggCsMap[vendor.toLowerCase()] || _csVendorMap[realVendor.toLowerCase()] || _csVendorMap[vendor.toLowerCase()];
  var fetchPromise;

  if (tab === 'csapi' && csInfo) {
    fetchPromise = fetch('/api/game/games/sorted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor: realVendor, gameid: csInfo.gameid, code: csInfo.code, gametype: 'slot' })
    }).then(function(r) { return r.json(); }).then(function(res) {
      return (res && res.data || []).map(function(g, i) {
        return { id: g.subcode || '', title: g.name_eng || g.name || '', name: g.name_eng || g.name || '', type: g.type || 'slot', rank: i + 1, thumbnail: g.img || '', thumbnails: g.img ? { '300x300': g.img } : {}, langs: { ko: g.name_kor || g.name_eng || '' }, _source: 'csapi' };
      });
    });
  } else {
    fetchPromise = fetch('/api/hl/games?vendor=' + encodeURIComponent(realVendor))
      .then(function(r) { return r.json(); });
  }

  fetchPromise.then(function(games) {
    if (!Array.isArray(games) || games.length === 0) {
      container.innerHTML = '<div style="color:#888;padding:20px;">게임 목록이 없습니다.</div>';
      return;
    }
    games.sort(function(a, b) {
      var ra = a.rank != null ? a.rank : 99999;
      var rb = b.rank != null ? b.rank : 99999;
      return ra - rb;
    });

    // 저장 키: 오닉스면 CS코드 + _cs
    var sKey = (tab === 'csapi' && csInfo) ? csInfo.code + '_cs' : vendor;

    container._games = games;
    container._vendor = vendor;
    container._storageKey = sKey;

    document.getElementById('gg-gl-show-all').onclick = function() {
      _ggGlBulkStatus(sKey, games, 'allow');
      _ggGlRenderTable(container, sKey, games);
    };
    document.getElementById('gg-gl-hide-all').onclick = function() {
      _ggGlBulkStatus(sKey, games, 'hidden');
      _ggGlRenderTable(container, sKey, games);
    };

    _ggGlRenderTable(container, sKey, games);
  }).catch(function() {
    if (container) container.innerHTML = '<div style="color:#f87171;padding:20px;">게임 목록을 불러오지 못했습니다.</div>';
  });
}

function _ggGlGetStatus(sKey, gameId) {
  var group = _gdSettings.groups[window._ggGlIdx];
  if (!group) return 'allow';
  gameId = String(gameId);
  var blocked = (group.blockedGames && group.blockedGames[sKey]) || [];
  if (blocked.indexOf(gameId) >= 0) return 'blocked';
  var hidden = (group.hiddenGames && group.hiddenGames[sKey]) || [];
  if (hidden.indexOf(gameId) >= 0) return 'hidden';
  return 'allow';
}

function _ggGlSetStatus(sKey, gameId, status) {
  var group = _gdSettings.groups[window._ggGlIdx];
  if (!group) return;
  gameId = String(gameId);
  if (!group.hiddenGames) group.hiddenGames = {};
  if (!group.blockedGames) group.blockedGames = {};
  if (!group.hiddenGames[sKey]) group.hiddenGames[sKey] = [];
  if (!group.blockedGames[sKey]) group.blockedGames[sKey] = [];
  // 기존 상태 제거
  var hIdx = group.hiddenGames[sKey].indexOf(gameId);
  if (hIdx >= 0) group.hiddenGames[sKey].splice(hIdx, 1);
  var bIdx = group.blockedGames[sKey].indexOf(gameId);
  if (bIdx >= 0) group.blockedGames[sKey].splice(bIdx, 1);
  // 새 상태 설정
  if (status === 'hidden') group.hiddenGames[sKey].push(gameId);
  else if (status === 'blocked') group.blockedGames[sKey].push(gameId);
  saveGameSettings();
}

function _ggGlBulkStatus(sKey, games, status) {
  var group = _gdSettings.groups[window._ggGlIdx];
  if (!group) return;
  if (!group.hiddenGames) group.hiddenGames = {};
  if (!group.blockedGames) group.blockedGames = {};
  group.hiddenGames[sKey] = [];
  group.blockedGames[sKey] = [];
  if (status === 'hidden') {
    group.hiddenGames[sKey] = games.map(function(g) { return String(g.id); });
  } else if (status === 'blocked') {
    group.blockedGames[sKey] = games.map(function(g) { return String(g.id); });
  }
  saveGameSettings();
}

function _ggGlSetAndRefresh(sKey, gameId, status) {
  _ggGlSetStatus(sKey, gameId, status);
  var container = document.getElementById('gg-gl-games');
  if (container && container._games) _ggGlRenderTable(container, sKey, container._games);
}

function _ggGlRenderTable(container, sKey, games) {
  var visibleCnt = 0, hiddenCnt = 0, blockedCnt = 0;
  games.forEach(function(g) {
    var st = _ggGlGetStatus(sKey, g.id);
    if (st === 'hidden') hiddenCnt++;
    else if (st === 'blocked') blockedCnt++;
    else visibleCnt++;
  });

  var html =
    '<div style="margin-bottom:8px;font-size:0.78rem;color:#aaa;">' +
      '총 <b style="color:#fff;">' + games.length + '</b>개 | ' +
      '노출 <b style="color:#4ade80;">' + visibleCnt + '</b>개 | ' +
      '숨김 <b style="color:#f87171;">' + hiddenCnt + '</b>개 | ' +
      '점검 <b style="color:#f59e0b;">' + blockedCnt + '</b>개' +
    '</div>' +
    '<table class="db-table" style="font-size:0.78rem;">' +
      '<thead><tr>' +
        '<th style="width:40px;">#</th>' +
        '<th style="width:70px;">이미지</th>' +
        '<th style="text-align:left;padding-left:8px;">게임명</th>' +
        '<th style="width:100px;">게임 ID</th>' +
        '<th style="width:60px;">순위</th>' +
        '<th style="width:70px;">타입</th>' +
        '<th style="width:180px;text-align:center;">상태</th>' +
      '</tr></thead><tbody>';

  var safeSKey = sKey.replace(/'/g, "\\'");

  games.forEach(function(g, i) {
    var name = (g.langs && g.langs.ko) || g.title || g.name || '';
    var img = (g.thumbnails && (g.thumbnails['300x300'] || g.thumbnails['200x200'])) || g.thumbnail || '';
    var imgHtml = img
      ? '<img src="' + img + '" style="width:50px;height:38px;object-fit:cover;border-radius:4px;display:block;margin:0 auto;" loading="lazy">'
      : '<div style="width:50px;height:38px;background:#2a3040;border-radius:4px;margin:0 auto;"></div>';
    var rank = g.rank != null ? g.rank : '-';
    var type = g.type || '-';
    var status = _ggGlGetStatus(sKey, g.id);
    var safeId = String(g.id).replace(/'/g, "\\'");

    var btnStyle = 'padding:2px 8px;font-size:0.7rem;border-radius:6px;cursor:pointer;font-weight:600;border:none;';
    var offStyle = btnStyle + 'background:transparent;border:1px solid #444;color:#888;';
    var statusBtns =
      '<div style="display:flex;gap:3px;justify-content:center;">' +
        '<button style="' + (status === 'allow' ? btnStyle + 'background:#16a34a;color:#fff;' : offStyle) + '" onclick="_ggGlSetAndRefresh(\'' + safeSKey + '\',\'' + safeId + '\',\'allow\')"><i class="fas fa-eye"></i> 노출</button>' +
        '<button style="' + (status === 'hidden' ? btnStyle + 'background:#dc2626;color:#fff;' : offStyle) + '" onclick="_ggGlSetAndRefresh(\'' + safeSKey + '\',\'' + safeId + '\',\'hidden\')"><i class="fas fa-eye-slash"></i> 숨김</button>' +
        '<button style="' + (status === 'blocked' ? btnStyle + 'background:#f59e0b;color:#000;' : offStyle) + '" onclick="_ggGlSetAndRefresh(\'' + safeSKey + '\',\'' + safeId + '\',\'blocked\')"><i class="fas fa-wrench"></i> 점검</button>' +
      '</div>';

    var rowOpacity = status === 'hidden' ? 'opacity:0.4;' : (status === 'blocked' ? 'opacity:0.6;' : '');
    html +=
      '<tr style="' + rowOpacity + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + imgHtml + '</td>' +
        '<td style="text-align:left;padding-left:8px;">' + name + '</td>' +
        '<td style="font-size:0.72rem;color:#888;">' + g.id + '</td>' +
        '<td>' + rank + '</td>' +
        '<td><span style="font-size:0.7rem;color:#aaa;">' + type + '</span></td>' +
        '<td style="text-align:center;">' + statusBtns + '</td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function toggleGameAndRefresh(vendor, gameId) {
  var container = document.getElementById('gd-modal-games');
  var sKey = (container && container._storageKey) || vendor;
  toggleGame(sKey, gameId);
  if (!container || !container._games) return;
  renderGameTable(container, sKey, container._games);
}

function setGameStatusAndRefresh(vendor, gameId, status) {
  var container = document.getElementById('gd-modal-games');
  var sKey = (container && container._storageKey) || vendor;
  setGameStatus(sKey, gameId, status);
  if (!container || !container._games) return;
  renderGameTable(container, sKey, container._games);
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

async function ggDeleteGroup(idx) {
  var groups = _gdSettings.groups || [];
  if (!groups[idx]) return;
  if (!(await customConfirm('"' + groups[idx].name + '" 그룹을 삭제하시겠습니까?'))) return;
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
        '<input id="gg-modal-search" type="text" placeholder="게임사 검색..." style="flex:1;min-width:120px;padding:7px 12px;border-radius:6px;border:1px solid var(--input-border);background:#1a1f2e;color:#fff;font-size:0.82rem;outline:none;" />' +
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
  Promise.all([
    fetch('/api/hl/vendors').then(function(r) { return r.json(); }).catch(function() { return {}; }),
    fetch('/api/game/providers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'1', gametype:'' }) }).then(function(r) { return r.json(); }).catch(function() { return { result:0, data:[] }; })
  ])
    .then(function(results) {
      var vendors = results[0];
      var csProviders = results[1];
      var container = document.getElementById('gg-modal-games');
      if (!container) return;
      var liveList = [], slotList = [], sportsList = [], hotelList = [];
      var hlNames = {};
      var csNames = {};
      // CS code → HL name 매핑
      var _ggCsToHl = {
        'casino-pragmatic': 'PragmaticPlay Live',
        'casino-sa': 'saGaming',
        'casino-dream': 'DreamGame',
        'casino-ezugi': 'ezugi',
        'casino-micro': 'MicroGaming',
        'pragmaticplay': 'PragmaticPlay',
        'cq9': 'CQ9',
        'hbn': 'Habanero',
        'bng': 'Booongo',
        'nolimitcity': 'Nolimit City',
        'pg': 'PG Soft',
        'casino-playace': 'Asia Gaming',
        'hacksaw': 'Hacksaw',
        'jili': 'jili'
      };
      // CS API 벤더 맵 캐시 (게임 목록 모달에서 사용)
      window._ggCsVendorMap = {};
      // CS API 벤더 이름 수집
      if (csProviders && csProviders.result === 1 && Array.isArray(csProviders.data)) {
        csProviders.data.forEach(function(cp) {
          var code = (cp.code || '').toLowerCase();
          window._ggCsVendorMap[code] = cp;
          // HL 이름으로도 등록 (게임 목록 모달에서 HL이름으로 CS 정보 조회용)
          if (_ggCsToHl[code]) {
            window._ggCsVendorMap[_ggCsToHl[code].toLowerCase()] = cp;
          }
          csNames[code] = true;
          // 매핑된 HL 이름도 등록
          if (_ggCsToHl[code]) csNames[_ggCsToHl[code].toLowerCase()] = true;
        });
      }
      if (!vendors.error && !vendors._status) {
        Object.keys(vendors).forEach(function(key) {
          var v = vendors[key];
          if (!v.enabled) return;
          v._type = _gdSportsNames.indexOf(v.name.toLowerCase()) >= 0 ? 'sports' : _gdLiveNames.indexOf(v.name) >= 0 ? 'live' : _gdHotelNames.indexOf(v.name.toLowerCase()) >= 0 ? 'hotel' : 'slot';
          v._source = 'honorlink';
          v._hasHL = true;
          v._hasCS = !!csNames[v.name.toLowerCase()];
          if (v._type === 'live') liveList.push(v);
          else if (v._type === 'sports') sportsList.push(v);
          else if (v._type === 'hotel') hotelList.push(v);
          else slotList.push(v);
          hlNames[v.name.toLowerCase()] = true;
        });
      }
      if (csProviders && csProviders.result === 1 && Array.isArray(csProviders.data)) {
        csProviders.data.forEach(function(cp) {
          var hlMapped = _ggCsToHl[(cp.code||'').toLowerCase()];
          if (hlMapped && hlNames[hlMapped.toLowerCase()]) return;
          if (hlNames[(cp.code||'').toLowerCase()] || hlNames[(cp.name||'').toLowerCase()]) return;
          var fv = { name: cp.code, displayName: cp.name, enabled: true, _source: 'csapi',
            _type: cp.gameid === 'SxHotel' ? 'hotel' : _csLiveNames.indexOf(cp.code) >= 0 ? 'live' : 'slot',
            _hasHL: false, _hasCS: true };
          if (fv._type === 'live') liveList.push(fv);
          else if (fv._type === 'hotel') hotelList.push(fv);
          else slotList.push(fv);
        });
      }

      // 그룹용 hiddenVendors 초기화
      if (!group.hiddenVendors) group.hiddenVendors = [];

      // 벤더 데이터 캐시 (검색용)
      window._ggModalVendors = { live: liveList, slot: slotList, sports: sportsList, hotel: hotelList };
      window._ggModalIdx = idx;

      var html = '';
      html += ggRenderVendorSection('카지노', liveList, idx);
      html += ggRenderVendorSection('슬롯', slotList, idx);
      html += ggRenderVendorSection('스포츠', sportsList, idx);
      html += ggRenderVendorSection('호텔카지노', hotelList, idx);
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
  if (!group.vendorOrder) group.vendorOrder = {};

  // 타입 결정 (섹션 이름 → vendorOrder 키)
  var typeMap = { '카지노': 'live', '슬롯': 'slot', '스포츠': 'sports', '호텔카지노': 'hotel' };
  var type = typeMap[title] || 'slot';

  // 그룹 순서가 있으면 적용, 없으면 기본설정 순서 사용
  var order = (group.vendorOrder[type] && group.vendorOrder[type].length) ? group.vendorOrder[type] : (_gdSettings.vendorOrder[type] || []);
  var sorted = vendors.slice().sort(function(a, b) {
    var ai = order.indexOf(a.name); if (ai < 0) ai = 99999;
    var bi = order.indexOf(b.name); if (bi < 0) bi = 99999;
    return ai - bi;
  });

  var safeType = type.replace(/'/g, "\\'");
  var html =
    '<div style="margin-bottom:20px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<span style="font-size:1rem;font-weight:bold;color:#fff;">' + title + '</span>' +
        '<button onclick="ggHideAllSection(' + idx + ',\'' + safeType + '\')" style="padding:4px 12px;font-size:0.72rem;background:#ef4444;border:1px solid #ef4444;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;">전체 노출안함</button>' +
      '</div>' +
      '<table class="db-table" style="font-size:0.82rem;">' +
        '<thead>' +
          '<tr>' +
            '<th style="width:70px;text-align:center;">배열</th>' +
            '<th style="text-align:center;">게임사</th>' +
            '<th colspan="3" style="text-align:center;">사용</th>' +
          '</tr>' +
          '<tr>' +
            '<th></th><th></th>' +
            '<th style="width:150px;text-align:center;">아너링크</th>' +
            '<th style="width:150px;text-align:center;">오닉스</th>' +
            '<th style="width:150px;text-align:center;">노출안함</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

  if (sorted.length === 0) {
    html += '<tr><td colspan="5" style="color:#888;padding:16px;text-align:center;">게임사가 없습니다.</td></tr>';
  } else {
    sorted.forEach(function(v, i) {
      var safeName = v.name.replace(/'/g, "\\'");
      var hidden = group.hiddenVendors.indexOf(v.name) >= 0;
      var grApi = (group.vendorApi && group.vendorApi[v.name]) || '';
      var currentApi = hidden ? 'none' : (grApi || _gdSettings.vendorApi[v.name] || 'honorlink');
      var activeStyle = 'padding:6px 16px;font-size:0.78rem;border-radius:6px;cursor:pointer;font-weight:600;border:none;';
      var onStyle = activeStyle + 'background:#16a34a;color:#fff;';
      var offStyle = activeStyle + 'background:transparent;border:1px solid #444;color:#888;';

      var orderInput = '<input type="number" value="' + (i + 1) + '" min="1" max="' + sorted.length + '" ' +
        'style="width:44px;text-align:center;background:var(--input-bg,#1a2030);border:1px solid var(--input-border,#444);color:var(--text1,#fff);border-radius:4px;padding:3px;font-size:0.78rem;" ' +
        'onchange="ggSetVendorOrder(' + idx + ',\'' + safeName + '\',\'' + type + '\',parseInt(this.value))" ' +
        'onkeydown="if(event.key===\'Enter\'){this.blur();}">';

      var hlBtn, csBtn, noBtn;
      if (v._hasHL !== false) {
        hlBtn = '<button style="' + (currentApi === 'honorlink' ? onStyle : offStyle) + '" onclick="ggSetVendorApi(' + idx + ',\'' + safeName + '\',\'honorlink\')">아너링크</button>';
      } else {
        hlBtn = '<span style="color:#555;font-size:0.72rem;">-</span>';
      }
      if (v._hasCS) {
        csBtn = '<button style="' + (currentApi === 'csapi' ? onStyle : offStyle) + '" onclick="ggSetVendorApi(' + idx + ',\'' + safeName + '\',\'csapi\')">오닉스</button>';
      } else {
        csBtn = '<span style="color:#555;font-size:0.72rem;">-</span>';
      }
      noBtn = '<button style="' + (currentApi === 'none' ? onStyle : offStyle) + '" onclick="ggSetVendorApi(' + idx + ',\'' + safeName + '\',\'none\')">노출안함</button>';

      html +=
        '<tr style="' + (hidden ? 'opacity:0.5;' : '') + '">' +
          '<td style="text-align:center;">' + orderInput + '</td>' +
          '<td style="text-align:center;font-weight:500;">' + (v._type === 'slot' ? '<a href="#" onclick="event.preventDefault();ggOpenGameListModal(' + idx + ',\'' + safeName + '\')" style="color:#60a5fa;text-decoration:underline;cursor:pointer;">' + v.name + '</a>' : v.name) + '</td>' +
          '<td style="text-align:center;">' + hlBtn + '</td>' +
          '<td style="text-align:center;">' + csBtn + '</td>' +
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
  var sportsList = window._ggModalVendors.sports;
  var hotelList = window._ggModalVendors.hotel;
  if (keyword) {
    liveList = liveList.filter(function(v) { return v.name.toLowerCase().indexOf(keyword) >= 0; });
    slotList = slotList.filter(function(v) { return v.name.toLowerCase().indexOf(keyword) >= 0; });
    sportsList = sportsList.filter(function(v) { return v.name.toLowerCase().indexOf(keyword) >= 0; });
    hotelList = hotelList.filter(function(v) { return v.name.toLowerCase().indexOf(keyword) >= 0; });
  }
  var html = '';
  html += ggRenderVendorSection('카지노', liveList, idx);
  html += ggRenderVendorSection('슬롯', slotList, idx);
  html += ggRenderVendorSection('스포츠', sportsList, idx);
  html += ggRenderVendorSection('호텔카지노', hotelList, idx);
  container.innerHTML = html;
}

function ggSetVendorOrder(idx, name, type, newPos) {
  var group = _gdSettings.groups[idx];
  if (!group) return;
  if (!group.vendorOrder) group.vendorOrder = {};
  // 현재 순서 가져오기 (그룹 자체 or 기본설정 복사)
  var order = group.vendorOrder[type];
  if (!order || !order.length) {
    order = (_gdSettings.vendorOrder[type] || []).slice();
  }
  var oldIdx = order.indexOf(name);
  if (oldIdx < 0) { order.push(name); oldIdx = order.length - 1; }
  newPos = Math.max(1, Math.min(newPos, order.length)) - 1;
  order.splice(oldIdx, 1);
  order.splice(newPos, 0, name);
  group.vendorOrder[type] = order;

  var scrollEl = document.querySelector('#gg-modal-overlay > div > div:last-child');
  var scrollTop = scrollEl ? scrollEl.scrollTop : 0;
  var searchVal = '';
  var searchInput = document.getElementById('gg-modal-search');
  if (searchInput) searchVal = searchInput.value.trim().toLowerCase();
  saveGameSettings().then(function() {
    if (searchVal) ggFilterVendors(searchVal);
    else ggFilterVendors('');
    var scrollEl2 = document.querySelector('#gg-modal-overlay > div > div:last-child');
    if (scrollEl2) scrollEl2.scrollTop = scrollTop;
  });
}

function ggBulkVendor(idx, action) {
  var group = _gdSettings.groups[idx];
  if (!group) return;
  if (!group.hiddenVendors) group.hiddenVendors = [];
  if (!window._ggModalVendors) return;
  var allVendors = window._ggModalVendors.live.concat(window._ggModalVendors.slot).concat(window._ggModalVendors.sports).concat(window._ggModalVendors.hotel);
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

function ggHideAllSection(idx, type) {
  var group = _gdSettings.groups[idx];
  if (!group) return;
  if (!group.hiddenVendors) group.hiddenVendors = [];
  if (!window._ggModalVendors) return;
  var vendors = window._ggModalVendors[type] || [];
  vendors.forEach(function(v) {
    if (group.hiddenVendors.indexOf(v.name) < 0) group.hiddenVendors.push(v.name);
    if (group.vendorApi) delete group.vendorApi[v.name];
  });
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
  if (!group.vendorApi) group.vendorApi = {};
  var vIdx = group.hiddenVendors.indexOf(vendorName);
  if (api === 'none') {
    if (vIdx < 0) group.hiddenVendors.push(vendorName);
    delete group.vendorApi[vendorName];
  } else {
    if (vIdx >= 0) group.hiddenVendors.splice(vIdx, 1);
    group.vendorApi[vendorName] = api;
  }
  // 스크롤 위치 저장 후 복원
  var scrollEl = document.querySelector('#gg-modal-overlay > div > div:last-child');
  var scrollTop = scrollEl ? scrollEl.scrollTop : 0;
  var searchVal = '';
  var searchInput = document.getElementById('gg-modal-search');
  if (searchInput) searchVal = searchInput.value.trim().toLowerCase();
  saveGameSettings().then(function() {
    var container = document.getElementById('gg-modal-games');
    if (container && window._ggModalVendors) {
      var liveList = window._ggModalVendors.live;
      var slotList = window._ggModalVendors.slot;
      var sportsList = window._ggModalVendors.sports || [];
      var hotelList = window._ggModalVendors.hotel || [];
      if (searchVal) {
        liveList = liveList.filter(function(v) { return v.name.toLowerCase().indexOf(searchVal) >= 0; });
        slotList = slotList.filter(function(v) { return v.name.toLowerCase().indexOf(searchVal) >= 0; });
        sportsList = sportsList.filter(function(v) { return v.name.toLowerCase().indexOf(searchVal) >= 0; });
        hotelList = hotelList.filter(function(v) { return v.name.toLowerCase().indexOf(searchVal) >= 0; });
      }
      container.innerHTML = ggRenderVendorSection('카지노', liveList, idx) + ggRenderVendorSection('슬롯', slotList, idx) + ggRenderVendorSection('스포츠', sportsList, idx) + ggRenderVendorSection('호텔카지노', hotelList, idx);
      var scrollEl2 = document.querySelector('#gg-modal-overlay > div > div:last-child');
      if (scrollEl2) scrollEl2.scrollTop = scrollTop;
    }
  });
}
