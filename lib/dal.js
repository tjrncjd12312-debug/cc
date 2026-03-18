/**
 * Data Access Layer (DAL)
 * JSON readData/writeData → MySQL 쿼리 전환
 */
const db = require('./db');

// ════════════════════════════════════════
//  파트너 (partners)
// ════════════════════════════════════════
const partners = {
  // 전체 목록 (flat)
  async getAll() {
    return db.getAll('SELECT * FROM partners ORDER BY sort_order');
  },

  async getById(id) {
    return db.getOne('SELECT * FROM partners WHERE id = ?', [id]);
  },

  // 트리 구조로 재조립 (기존 partnerTree.json 형식)
  async getTree() {
    const rows = await db.getAll('SELECT * FROM partners ORDER BY sort_order');
    return buildTree(rows);
  },

  // 트리 저장 (flat으로 풀어서 업데이트)
  async saveTree(tree) {
    const flat = [];
    flattenForSave(tree, null, flat, 0);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      // 기존 데이터 삭제 후 재삽입 (간단한 방식)
      await conn.query('DELETE FROM partners');
      for (const p of flat) {
        await conn.query(
          `INSERT INTO partners (id, label, level, parent_id, password, phone, bank, account, holder, memo, status,
            money, point, rolling_point, roll_casino, roll_slot, roll_mini, losing_slot, total_deposit, total_withdraw,
            perm_casino, perm_slot, perm_minigame, empty_bet_casino, empty_bet_slot, empty_bet_minigame,
            display_color, withdraw_pw, v_bank, v_account, v_holder, game_group, casino,
            last_login_at, last_login_ip, registered_at, expanded, sort_order)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [p.id, p.label, p.level, p.parent_id, p.password, p.phone, p.bank, p.account,
           p.holder, p.memo, p.status, p.money, p.point, p.rolling_point,
           p.roll_casino, p.roll_slot, p.roll_mini, p.losing_slot, p.total_deposit, p.total_withdraw,
           p.perm_casino, p.perm_slot, p.perm_minigame, p.empty_bet_casino, p.empty_bet_slot, p.empty_bet_minigame,
           p.display_color, p.withdraw_pw, p.v_bank, p.v_account, p.v_holder, p.game_group, p.casino,
           p.last_login_at, p.last_login_ip, p.registered_at, p.expanded, p.sort_order]
        );
      }
      await conn.commit();
    } catch(e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  // 단일 파트너 필드 업데이트
  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const vals = keys.map(k => fields[k]);
    vals.push(id);
    return db.run(`UPDATE partners SET ${sets} WHERE id = ?`, vals);
  },

  // 하위 파트너 ID 수집 (재귀)
  async getDescendantIds(partnerId) {
    const all = await db.getAll('SELECT id, parent_id FROM partners');
    const map = {};
    all.forEach(r => { if (!map[r.parent_id]) map[r.parent_id] = []; map[r.parent_id].push(r.id); });
    const result = [];
    function collect(pid) {
      const children = map[pid] || [];
      for (const cid of children) { result.push(cid); collect(cid); }
    }
    collect(partnerId);
    return result;
  },

  // 하위 회원 ID 수집
  async getMemberIds(partnerId) {
    const descendants = await this.getDescendantIds(partnerId);
    descendants.push(partnerId);
    const all = await db.getAll('SELECT id, level FROM partners WHERE parent_id IN (?) OR id IN (?)', [descendants, descendants]);
    return all.filter(r => r.level === 'member').map(r => r.id);
  }
};

// 트리 빌더
function buildTree(rows) {
  const map = {};
  rows.forEach(r => {
    map[r.id] = rowToTreeNode(r);
    map[r.id].children = [];
  });
  const roots = [];
  rows.forEach(r => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children.push(map[r.id]);
    } else if (!r.parent_id) {
      roots.push(map[r.id]);
    }
  });
  return roots;
}

// DB row → 기존 트리 노드 형식
function rowToTreeNode(r) {
  const node = {
    id: r.id, label: r.label, level: r.level, expanded: !!r.expanded,
    money: Number(r.money), point: Number(r.point),
    status: r.status, password: r.password,
    phone: r.phone || '', bank: r.bank || '', account: r.account || '', holder: r.holder || '',
    memo: r.memo || '', rollingPoint: Number(r.rolling_point),
    gameGroup: r.game_group || ''
  };
  if (r.level !== 'admin' && r.level !== 'member') {
    node.rollCasino = String(r.roll_casino); node.rollSlot = String(r.roll_slot);
    node.rollMini = String(r.roll_mini); node.losingSlot = String(r.losing_slot);
    node.totalDeposit = Number(r.total_deposit); node.totalWithdraw = Number(r.total_withdraw);
    node.registeredAt = r.registered_at;
    node['perm카지노'] = !!r.perm_casino; node['perm슬롯'] = !!r.perm_slot; node['perm미니게임'] = !!r.perm_minigame;
    node['emptyBet카지노'] = r.empty_bet_casino; node['emptyBet슬롯'] = r.empty_bet_slot; node['emptyBet미니게임'] = r.empty_bet_minigame;
    node.displayColor = r.display_color; node.withdrawPw = r.withdraw_pw;
    node.vBank = r.v_bank; node.vAccount = r.v_account; node.vHolder = r.v_holder;
  }
  if (r.level === 'member') {
    node.username = r.id; node.casino = r.casino;
    node['perm카지노'] = !!r.perm_casino; node['perm슬롯'] = !!r.perm_slot;
    node.lastLoginAt = r.last_login_at; node.lastLoginIp = r.last_login_ip;
    node.registeredAt = r.registered_at;
  }
  if (r.last_login_at) { node.lastLoginAt = r.last_login_at; node.lastLoginIp = r.last_login_ip; }
  return node;
}

// 트리 → flat 변환 (저장용)
function flattenForSave(nodes, parentId, result, sortStart) {
  if (!Array.isArray(nodes)) return sortStart;
  let sort = sortStart;
  for (const n of nodes) {
    result.push({
      id: n.id, label: n.label || n.id, level: n.level, parent_id: parentId,
      password: n.password || '', phone: n.phone || '', bank: n.bank || '',
      account: n.account || '', holder: n.holder || '', memo: n.memo || '',
      status: n.status || '정상',
      money: n.money || 0, point: n.point || 0, rolling_point: n.rollingPoint || 0,
      roll_casino: parseFloat(n.rollCasino) || 0, roll_slot: parseFloat(n.rollSlot) || 0,
      roll_mini: parseFloat(n.rollMini) || 0, losing_slot: parseFloat(n.losingSlot) || 0,
      total_deposit: n.totalDeposit || 0, total_withdraw: n.totalWithdraw || 0,
      perm_casino: n['perm카지노'] !== undefined ? (n['perm카지노'] ? 1 : 0) : 1,
      perm_slot: n['perm슬롯'] !== undefined ? (n['perm슬롯'] ? 1 : 0) : 1,
      perm_minigame: n['perm미니게임'] !== undefined ? (n['perm미니게임'] ? 1 : 0) : 1,
      empty_bet_casino: n['emptyBet카지노'] || 0, empty_bet_slot: n['emptyBet슬롯'] || 0,
      empty_bet_minigame: n['emptyBet미니게임'] || 0,
      display_color: n.displayColor || '#ffffff', withdraw_pw: n.withdrawPw || '',
      v_bank: n.vBank || '', v_account: n.vAccount || '', v_holder: n.vHolder || '',
      game_group: n.gameGroup || '', casino: n.casino || 'ON',
      last_login_at: n.lastLoginAt || null, last_login_ip: n.lastLoginIp || null,
      registered_at: n.registeredAt || null, expanded: n.expanded ? 1 : 0, sort_order: sort++
    });
    if (n.children && n.children.length > 0) {
      sort = flattenForSave(n.children, n.id, result, sort);
    }
  }
  return sort;
}

// ════════════════════════════════════════
//  유저 (users)
// ════════════════════════════════════════
const users = {
  async getAll() {
    return db.getAll('SELECT * FROM users ORDER BY registered_at DESC');
  },
  async getById(id) {
    return db.getOne('SELECT * FROM users WHERE id = ?', [id]);
  },
  async getByUsername(username) {
    return db.getOne('SELECT * FROM users WHERE username = ?', [username]);
  },
  async getByIds(ids) {
    if (!ids || ids.length === 0) return [];
    return db.getAll('SELECT * FROM users WHERE id IN (?)', [ids]);
  },
  async getByUsernames(usernames) {
    if (!usernames || usernames.length === 0) return [];
    return db.getAll('SELECT * FROM users WHERE username IN (?)', [usernames]);
  },
  async create(user) {
    return db.run(
      `INSERT INTO users (id, username, nickname, password, phone, bank, account, holder,
        money, point, status, casino, slot, memo, rolling_point, game_group, belong_to,
        referred_by, referral_code, api, registered_at, approved_at, last_login_at, last_login_ip)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [user.id, user.username, user.nickname, user.password,
       user.phone || '', user.bank || '', user.account || '', user.holder || '',
       user.money || 0, user.point || 0, user.status || '정상',
       user.casino || 'ON', user.slot || 'ON', user.memo || '',
       user.rollingPoint || 0, user.gameGroup || '', user.belongTo || null,
       user.referredBy || null, user.referralCode || null,
       JSON.stringify(user.api || []),
       user.registeredAt || null, user.approvedAt || null,
       user.lastLoginAt || null, user.lastLoginIp || null]
    );
  },
  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const vals = keys.map(k => fields[k]);
    vals.push(id);
    return db.run(`UPDATE users SET ${sets} WHERE id = ?`, vals);
  },
  async updateByUsername(username, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const vals = keys.map(k => fields[k]);
    vals.push(username);
    return db.run(`UPDATE users SET ${sets} WHERE username = ?`, vals);
  },
  async delete(id) {
    return db.run('DELETE FROM users WHERE id = ?', [id]);
  },
  // 호환: 전체 배열 반환 (기존 readData('users.json') 대체)
  async readAll() {
    const rows = await this.getAll();
    return rows.map(rowToUserObj);
  },
  // 호환: 전체 배열 저장 (기존 writeData('users.json', arr) 대체)
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM users');
      for (const u of arr) {
        await conn.query(
          `INSERT INTO users (id, username, nickname, password, phone, bank, account, holder,
            money, point, status, casino, slot, memo, rolling_point, game_group, belong_to,
            referred_by, referral_code, api, registered_at, approved_at, last_login_at, last_login_ip)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [u.id, u.username, u.nickname, u.password,
           u.phone || '', u.bank || '', u.account || '', u.holder || '',
           u.money || 0, u.point || 0, u.status || '정상',
           u.casino || 'ON', u.slot || 'ON', u.memo || '',
           u.rollingPoint || 0, u.gameGroup || '', u.belongTo || null,
           u.referredBy || null, u.referralCode || null,
           JSON.stringify(u.api || []),
           u.registeredAt || null, u.approvedAt || null,
           u.lastLoginAt || null, u.lastLoginIp || null]
        );
      }
      await conn.commit();
    } catch(e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
};

function rowToUserObj(r) {
  return {
    id: r.id, username: r.username, nickname: r.nickname, password: r.password,
    phone: r.phone, bank: r.bank, account: r.account, holder: r.holder,
    money: Number(r.money), point: Number(r.point), status: r.status,
    casino: r.casino, slot: r.slot, memo: r.memo,
    rollingPoint: Number(r.rolling_point), gameGroup: r.game_group,
    belongTo: r.belong_to, referredBy: r.referred_by, referralCode: r.referral_code,
    api: typeof r.api === 'string' ? JSON.parse(r.api) : (r.api || []),
    registeredAt: r.registered_at, approvedAt: r.approved_at,
    lastLoginAt: r.last_login_at, lastLoginIp: r.last_login_ip
  };
}

// ════════════════════════════════════════
//  트랜잭션 (transactions / cs_transactions)
// ════════════════════════════════════════
function txHelpers(tableName) {
  return {
    async getAll() {
      return db.getAll(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
    },
    async getById(id) {
      return db.getOne(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    },
    async getByUser(username, limit) {
      const lim = limit ? `LIMIT ${parseInt(limit)}` : '';
      return db.getAll(`SELECT * FROM ${tableName} WHERE user = ? ORDER BY created_at DESC ${lim}`, [username]);
    },
    async create(tx) {
      return db.run(
        `INSERT INTO ${tableName} (id, type, amount, \`before\`, status, details, processed_at, referer_id, created_at, user, external)
        VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status), processed_at=VALUES(processed_at)`,
        [tx.id, tx.type, tx.amount || 0, tx.before || 0, tx.status,
         JSON.stringify(tx.details || {}), tx.processed_at || null,
         tx.referer_id || null, tx.created_at || null, tx.user || null,
         JSON.stringify(tx.external || {})]
      );
    },
    async update(id, fields) {
      const keys = Object.keys(fields);
      if (keys.length === 0) return;
      const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
      const vals = keys.map(k => typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : fields[k]);
      vals.push(id);
      return db.run(`UPDATE ${tableName} SET ${sets} WHERE id = ?`, vals);
    },
    // 호환: 전체 배열
    async readAll() {
      const rows = await this.getAll();
      return rows.map(r => ({
        ...r,
        details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
        external: typeof r.external === 'string' ? JSON.parse(r.external) : r.external
      }));
    },
    async writeAll(arr) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(`DELETE FROM ${tableName}`);
        for (const t of arr) {
          await conn.query(
            `INSERT INTO ${tableName} (id, type, amount, \`before\`, status, details, processed_at, referer_id, created_at, user, external)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [t.id, t.type, t.amount || 0, t.before || 0, t.status,
             JSON.stringify(t.details || {}), t.processed_at || null,
             t.referer_id || null, t.created_at || null, t.user || null,
             JSON.stringify(t.external || {})]
          );
        }
        await conn.commit();
      } catch(e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }
  };
}

const transactions = txHelpers('transactions');
const csTransactions = txHelpers('cs_transactions');

// ════════════════════════════════════════
//  충환전 (transfers)
// ════════════════════════════════════════
const transfers = {
  async getAll() {
    return db.getAll('SELECT * FROM transfers ORDER BY created_at DESC');
  },
  async getByUsername(username) {
    return db.getAll('SELECT * FROM transfers WHERE username = ? ORDER BY created_at DESC', [username]);
  },
  async getByStatus(status) {
    return db.getAll('SELECT * FROM transfers WHERE status = ? ORDER BY created_at DESC', [status]);
  },
  async create(t) {
    return db.run(
      `INSERT INTO transfers (type, username, nickname, amount, bank, account, holder, status, memo, processed_by, created_at, processed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [t.type, t.username, t.nickname, t.amount || 0, t.bank || '', t.account || '',
       t.holder || '', t.status || 'pending', t.memo || '', t.processedBy || null,
       t.createdAt || new Date(), t.processedAt || null]
    );
  },
  async updateStatus(id, status, processedBy) {
    return db.run('UPDATE transfers SET status = ?, processed_by = ?, processed_at = NOW() WHERE id = ?',
      [status, processedBy || null, id]);
  },
  async readAll() { return this.getAll(); },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM transfers');
      for (const t of arr) {
        await conn.query(
          `INSERT INTO transfers (type, username, nickname, amount, bank, account, holder, status, memo, processed_by, created_at, processed_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [t.type, t.username, t.nickname, t.amount || 0, t.bank || '', t.account || '',
           t.holder || '', t.status || 'pending', t.memo || '', t.processedBy || null,
           t.createdAt || null, t.processedAt || null]
        );
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  머니 로그 (money_logs - admin/partner/user/point 통합)
// ════════════════════════════════════════
function moneyLogHelper(logType) {
  return {
    async getAll() {
      return db.getAll('SELECT * FROM money_logs WHERE log_type = ? ORDER BY datetime DESC', [logType]);
    },
    async getByTarget(targetId) {
      return db.getAll('SELECT * FROM money_logs WHERE log_type = ? AND target_id = ? ORDER BY datetime DESC', [logType, targetId]);
    },
    async add(log) {
      return db.run(
        `INSERT INTO money_logs (log_type, datetime, type, processor, processor_level, target_id, target_nick, target_level, amount, \`before\`, \`after\`, memo)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [logType, log.datetime || new Date(), log.type, log.processor || '', log.processorLevel || '',
         log.targetId || '', log.targetNick || '', log.targetLevel || '',
         log.amount || 0, log.before || 0, log.after || 0, log.memo || '']
      );
    },
    async readAll() { return this.getAll(); },
    async writeAll(arr) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM money_logs WHERE log_type = ?', [logType]);
        for (const l of arr) {
          await conn.query(
            `INSERT INTO money_logs (log_type, datetime, type, processor, processor_level, target_id, target_nick, target_level, amount, \`before\`, \`after\`, memo)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [logType, l.datetime, l.type, l.processor || '', l.processorLevel || '',
             l.targetId || '', l.targetNick || '', l.targetLevel || '',
             l.amount || 0, l.before || 0, l.after || 0, l.memo || '']
          );
        }
        await conn.commit();
      } catch(e) { await conn.rollback(); throw e; }
      finally { conn.release(); }
    }
  };
}

const moneyLogAdmin = moneyLogHelper('admin');
const moneyLogPartner = moneyLogHelper('partner');
const moneyLogUser = moneyLogHelper('user');
const moneyLogPoint = moneyLogHelper('point');

// ════════════════════════════════════════
//  롤링 로그
// ════════════════════════════════════════
const rollingLogs = {
  async getAll() {
    return db.getAll('SELECT * FROM rolling_logs ORDER BY datetime DESC');
  },
  async getByUsername(username) {
    return db.getAll('SELECT * FROM rolling_logs WHERE username = ? ORDER BY datetime DESC', [username]);
  },
  async add(log) {
    return db.run(
      `INSERT INTO rolling_logs (tx_id, username, bet_by, bet_amount, rate, rolling_point, vendor, game_type, datetime)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [log.txId, log.username, log.betBy, log.betAmount || 0, log.rate || 0,
       log.rollingPoint || 0, log.vendor || '', log.gameType || '', log.datetime || new Date()]
    );
  },
  async readAll() { return this.getAll(); },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM rolling_logs');
      for (const r of arr) {
        await conn.query(
          `INSERT INTO rolling_logs (tx_id, username, bet_by, bet_amount, rate, rolling_point, vendor, game_type, datetime)
          VALUES (?,?,?,?,?,?,?,?,?)`,
          [r.txId || r.tx_id, r.username, r.betBy || r.bet_by, r.betAmount || r.bet_amount || 0,
           r.rate || 0, r.rollingPoint || r.rolling_point || 0, r.vendor || '', r.gameType || r.game_type || '', r.datetime]
        );
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  로그인 로그
// ════════════════════════════════════════
const loginLogs = {
  async getAll() {
    return db.getAll('SELECT * FROM login_logs ORDER BY datetime DESC');
  },
  async add(log) {
    return db.run(
      `INSERT INTO login_logs (username, nickname, ip, device, datetime) VALUES (?,?,?,?,?)`,
      [log.username, log.nickname, log.ip, log.device || '', log.datetime || new Date()]
    );
  },
  async readAll() { return this.getAll(); },
  async getRecent(limit) {
    return db.getAll('SELECT * FROM login_logs ORDER BY datetime DESC LIMIT ?', [limit || 100]);
  }
};

// ════════════════════════════════════════
//  공지사항
// ════════════════════════════════════════
const notices = {
  async getAll() { return db.getAll('SELECT * FROM notices ORDER BY created_at DESC'); },
  async getById(id) { return db.getOne('SELECT * FROM notices WHERE id = ?', [id]); },
  async create(n) {
    return db.run(
      `INSERT INTO notices (title, content, image, partner_popup, user_popup, login_popup, partner_show, user_show, \`rank\`, domain, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [n.title, n.content, n.image || '', n.partnerPopup ? 1 : 0, n.userPopup ? 1 : 0,
       n.loginPopup ? 1 : 0, n.partnerShow ? 1 : 0, n.userShow ? 1 : 0,
       n.rank || 0, n.domain || '', n.createdAt || new Date()]
    );
  },
  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const vals = keys.map(k => fields[k]);
    vals.push(id);
    return db.run(`UPDATE notices SET ${sets} WHERE id = ?`, vals);
  },
  async delete(id) { return db.run('DELETE FROM notices WHERE id = ?', [id]); },
  async readAll() { return this.getAll(); },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM notices');
      for (const n of arr) {
        await conn.query(
          `INSERT INTO notices (title, content, image, partner_popup, user_popup, login_popup, partner_show, user_show, \`rank\`, domain, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [n.title, n.content, n.image || '', n.partnerPopup || n.partner_popup ? 1 : 0,
           n.userPopup || n.user_popup ? 1 : 0, n.loginPopup || n.login_popup ? 1 : 0,
           n.partnerShow || n.partner_show ? 1 : 0, n.userShow || n.user_show ? 1 : 0,
           n.rank || 0, n.domain || '', n.createdAt || n.created_at || null]
        );
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  이벤트
// ════════════════════════════════════════
const events = {
  async getAll() { return db.getAll('SELECT * FROM events ORDER BY created_at DESC'); },
  async getById(id) { return db.getOne('SELECT * FROM events WHERE id = ?', [id]); },
  async create(e) {
    return db.run(`INSERT INTO events (title, content, image, status, created_at) VALUES (?,?,?,?,?)`,
      [e.title, e.content, e.image || '', e.status || 'active', e.createdAt || new Date()]);
  },
  async update(id, fields) {
    const keys = Object.keys(fields);
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const vals = keys.map(k => fields[k]); vals.push(id);
    return db.run(`UPDATE events SET ${sets} WHERE id = ?`, vals);
  },
  async delete(id) { return db.run('DELETE FROM events WHERE id = ?', [id]); },
  async readAll() { return this.getAll(); },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM events');
      for (const e of arr) {
        await conn.query(`INSERT INTO events (title, content, image, status, created_at) VALUES (?,?,?,?,?)`,
          [e.title, e.content, e.image || '', e.status || 'active', e.createdAt || e.created_at || null]);
      }
      await conn.commit();
    } catch(e2) { await conn.rollback(); throw e2; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  문의
// ════════════════════════════════════════
const inquiries = {
  async getAll() { return db.getAll('SELECT * FROM inquiries ORDER BY created_at DESC'); },
  async getById(id) { return db.getOne('SELECT * FROM inquiries WHERE id = ?', [id]); },
  async getByUsername(username) {
    return db.getAll('SELECT * FROM inquiries WHERE username = ? ORDER BY created_at DESC', [username]);
  },
  async create(q) {
    return db.run(`INSERT INTO inquiries (username, title, content, reply, status, created_at, replied_at) VALUES (?,?,?,?,?,?,?)`,
      [q.username, q.title, q.content, q.reply || null, q.status || 'pending', q.createdAt || new Date(), q.repliedAt || null]);
  },
  async update(id, fields) {
    const keys = Object.keys(fields);
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const vals = keys.map(k => fields[k]); vals.push(id);
    return db.run(`UPDATE inquiries SET ${sets} WHERE id = ?`, vals);
  },
  async delete(id) { return db.run('DELETE FROM inquiries WHERE id = ?', [id]); },
  async readAll() { return this.getAll(); },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM inquiries');
      for (const q of arr) {
        await conn.query(`INSERT INTO inquiries (username, title, content, reply, status, created_at, replied_at) VALUES (?,?,?,?,?,?,?)`,
          [q.username, q.title, q.content, q.reply || null, q.status || 'pending', q.createdAt || q.created_at || null, q.repliedAt || q.replied_at || null]);
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  쪽지
// ════════════════════════════════════════
const messages = {
  async getAll() { return db.getAll('SELECT * FROM messages ORDER BY created_at DESC'); },
  async getByReceiver(receiver) {
    return db.getAll('SELECT * FROM messages WHERE receiver = ? ORDER BY created_at DESC', [receiver]);
  },
  async create(m) {
    return db.run(`INSERT INTO messages (sender, receiver, title, content, is_read, created_at) VALUES (?,?,?,?,?,?)`,
      [m.sender, m.receiver, m.title, m.content, 0, m.createdAt || new Date()]);
  },
  async markRead(id) { return db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [id]); },
  async delete(id) { return db.run('DELETE FROM messages WHERE id = ?', [id]); },
  async readAll() { return this.getAll(); },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM messages');
      for (const m of arr) {
        await conn.query(`INSERT INTO messages (sender, receiver, title, content, is_read, created_at) VALUES (?,?,?,?,?,?)`,
          [m.sender, m.receiver, m.title, m.content, m.isRead || m.is_read ? 1 : 0, m.createdAt || m.created_at || null]);
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  추천인
// ════════════════════════════════════════
const referrals = {
  async getAll() { return db.getAll('SELECT * FROM referrals'); },
  async getByCode(code) { return db.getOne('SELECT * FROM referrals WHERE code = ?', [code]); },
  async getByUserId(userId) { return db.getOne('SELECT * FROM referrals WHERE user_id = ?', [userId]); },
  async create(r) {
    return db.run(`INSERT INTO referrals (id, user_id, code, used_count, used_by, created_at) VALUES (?,?,?,?,?,?)`,
      [r.id, r.userId, r.code, r.usedCount || 0, JSON.stringify(r.usedBy || []), r.createdAt || new Date()]);
  },
  async update(id, fields) {
    const keys = Object.keys(fields);
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const vals = keys.map(k => typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : fields[k]);
    vals.push(id);
    return db.run(`UPDATE referrals SET ${sets} WHERE id = ?`, vals);
  },
  async readAll() {
    const rows = await this.getAll();
    return rows.map(r => ({
      ...r,
      usedBy: typeof r.used_by === 'string' ? JSON.parse(r.used_by) : r.used_by
    }));
  },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM referrals');
      for (const r of arr) {
        await conn.query(`INSERT INTO referrals (id, user_id, code, used_count, used_by, created_at) VALUES (?,?,?,?,?,?)`,
          [r.id, r.userId || r.user_id, r.code, r.usedCount || r.used_count || 0, JSON.stringify(r.usedBy || r.used_by || []), r.createdAt || r.created_at || null]);
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  빠른답변
// ════════════════════════════════════════
const quickReplies = {
  async getAll() { return db.getAll('SELECT * FROM quick_replies ORDER BY id'); },
  async create(q) {
    return db.run(`INSERT INTO quick_replies (title, content, created_at) VALUES (?,?,?)`,
      [q.title, q.content, q.createdAt || new Date()]);
  },
  async update(id, fields) {
    const keys = Object.keys(fields);
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    const vals = keys.map(k => fields[k]); vals.push(id);
    return db.run(`UPDATE quick_replies SET ${sets} WHERE id = ?`, vals);
  },
  async delete(id) { return db.run('DELETE FROM quick_replies WHERE id = ?', [id]); },
  async readAll() { return this.getAll(); },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM quick_replies');
      for (const q of arr) {
        await conn.query(`INSERT INTO quick_replies (title, content, created_at) VALUES (?,?,?)`,
          [q.title, q.content, q.createdAt || q.created_at || null]);
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  관리자 계정
// ════════════════════════════════════════
const adminAccount = {
  async get() { return db.getOne('SELECT * FROM admin_account LIMIT 1'); },
  async updatePassword(username, password) {
    return db.run('UPDATE admin_account SET password = ? WHERE username = ?', [password, username]);
  }
};

// ════════════════════════════════════════
//  관리자 설정 (key-value)
// ════════════════════════════════════════
const adminSettings = {
  async get(key) {
    const row = await db.getOne('SELECT setting_value FROM admin_settings WHERE setting_key = ?', [key]);
    return row ? JSON.parse(row.setting_value) : null;
  },
  async set(key, value) {
    return db.run(
      `INSERT INTO admin_settings (setting_key, setting_value) VALUES (?,?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, JSON.stringify(value)]
    );
  },
  // 전체 설정 객체로 반환 (기존 readData('admin_settings.json') 호환)
  async readAll() {
    const rows = await db.getAll('SELECT * FROM admin_settings');
    const obj = {};
    rows.forEach(r => { obj[r.setting_key] = JSON.parse(r.setting_value); });
    return obj;
  },
  // 전체 설정 객체 저장 (기존 writeData('admin_settings.json', obj) 호환)
  async writeAll(obj) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM admin_settings');
      for (const [key, val] of Object.entries(obj)) {
        await conn.query(`INSERT INTO admin_settings (setting_key, setting_value) VALUES (?,?)`, [key, JSON.stringify(val)]);
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  게임 설정 (key-value)
// ════════════════════════════════════════
const gamesConfig = {
  async get(key) {
    const row = await db.getOne('SELECT config_value FROM games_config WHERE config_key = ?', [key]);
    return row ? JSON.parse(row.config_value) : null;
  },
  async set(key, value) {
    return db.run(
      `INSERT INTO games_config (config_key, config_value) VALUES (?,?)
      ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [key, JSON.stringify(value)]
    );
  },
  async readAll() {
    const rows = await db.getAll('SELECT * FROM games_config');
    const obj = {};
    rows.forEach(r => { obj[r.config_key] = JSON.parse(r.config_value); });
    return obj;
  },
  async writeAll(obj) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM games_config');
      for (const [key, val] of Object.entries(obj)) {
        await conn.query(`INSERT INTO games_config (config_key, config_value) VALUES (?,?)`, [key, JSON.stringify(val)]);
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  빈배팅 카운터/로그
// ════════════════════════════════════════
const emptybetCounters = {
  async get(key) {
    const row = await db.getOne('SELECT count FROM emptybet_counters WHERE counter_key = ?', [key]);
    return row ? row.count : 0;
  },
  async set(key, count) {
    return db.run(
      `INSERT INTO emptybet_counters (counter_key, count) VALUES (?,?)
      ON DUPLICATE KEY UPDATE count = VALUES(count)`,
      [key, count]
    );
  },
  async readAll() {
    const rows = await db.getAll('SELECT * FROM emptybet_counters');
    const obj = {};
    rows.forEach(r => { obj[r.counter_key] = r.count; });
    return obj;
  },
  async writeAll(obj) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM emptybet_counters');
      for (const [key, val] of Object.entries(obj)) {
        await conn.query(`INSERT INTO emptybet_counters (counter_key, count) VALUES (?,?)`, [key, val]);
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

const emptybetLogs = {
  async getAll() { return db.getAll('SELECT * FROM emptybet_logs ORDER BY datetime DESC'); },
  async add(log) {
    return db.run(`INSERT INTO emptybet_logs (username, vendor, game_type, bet_amount, datetime) VALUES (?,?,?,?,?)`,
      [log.username, log.vendor || '', log.gameType || '', log.betAmount || 0, log.datetime || new Date()]);
  },
  async readAll() { return this.getAll(); },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM emptybet_logs');
      for (const e of arr) {
        await conn.query(`INSERT INTO emptybet_logs (username, vendor, game_type, bet_amount, datetime) VALUES (?,?,?,?,?)`,
          [e.username, e.vendor || '', e.gameType || e.game_type || '', e.betAmount || e.bet_amount || 0, e.datetime]);
      }
      await conn.commit();
    } catch(e2) { await conn.rollback(); throw e2; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  맥스윈 로그
// ════════════════════════════════════════
const maxwinLogs = {
  async getAll() { return db.getAll('SELECT * FROM maxwin_logs ORDER BY datetime DESC'); },
  async add(log) {
    return db.run(`INSERT INTO maxwin_logs (username, vendor, game_name, bet_amount, win_amount, multiplier, datetime) VALUES (?,?,?,?,?,?,?)`,
      [log.username, log.vendor, log.gameName, log.betAmount || 0, log.winAmount || 0, log.multiplier || 0, log.datetime || new Date()]);
  },
  async readAll() { return this.getAll(); }
};

// ════════════════════════════════════════
//  계좌 변경
// ════════════════════════════════════════
const accountChanges = {
  async getAll() { return db.getAll('SELECT * FROM account_changes ORDER BY changed_at DESC'); },
  async add(c) {
    return db.run(`INSERT INTO account_changes (username, field_name, old_value, new_value, changed_at) VALUES (?,?,?,?,?)`,
      [c.username, c.fieldName, c.oldValue, c.newValue, c.changedAt || new Date()]);
  },
  async readAll() { return this.getAll(); },
  async writeAll(arr) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM account_changes');
      for (const a of arr) {
        await conn.query(`INSERT INTO account_changes (username, field_name, old_value, new_value, changed_at) VALUES (?,?,?,?,?)`,
          [a.username, a.fieldName || a.field_name, a.oldValue || a.old_value, a.newValue || a.new_value, a.changedAt || a.changed_at]);
      }
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
};

// ════════════════════════════════════════
//  IP 관리
// ════════════════════════════════════════
const ipWhitelist = {
  async getAll() { return db.getAll('SELECT * FROM ip_whitelist'); },
  async add(ip, memo) { return db.run('INSERT INTO ip_whitelist (ip, memo) VALUES (?,?)', [ip, memo || '']); },
  async remove(id) { return db.run('DELETE FROM ip_whitelist WHERE id = ?', [id]); },
  async check(ip) { const r = await db.getOne('SELECT id FROM ip_whitelist WHERE ip = ?', [ip]); return !!r; }
};

const ipBlacklist = {
  async getAll() { return db.getAll('SELECT * FROM ip_blacklist'); },
  async add(ip, memo) { return db.run('INSERT INTO ip_blacklist (ip, memo) VALUES (?,?)', [ip, memo || '']); },
  async remove(id) { return db.run('DELETE FROM ip_blacklist WHERE id = ?', [id]); },
  async check(ip) { const r = await db.getOne('SELECT id FROM ip_blacklist WHERE ip = ?', [ip]); return !!r; }
};

const userIpBlacklist = {
  async getAll() { return db.getAll('SELECT * FROM user_ip_blacklist'); },
  async add(ip, memo) { return db.run('INSERT INTO user_ip_blacklist (ip, memo) VALUES (?,?)', [ip, memo || '']); },
  async remove(id) { return db.run('DELETE FROM user_ip_blacklist WHERE id = ?', [id]); },
  async check(ip) { const r = await db.getOne('SELECT id FROM user_ip_blacklist WHERE ip = ?', [ip]); return !!r; }
};

// ════════════════════════════════════════
//  수집된 도메인
// ════════════════════════════════════════
const collectedDomains = {
  async getAll() { return db.getAll('SELECT * FROM collected_domains ORDER BY collected_at DESC'); },
  async add(domain) { return db.run('INSERT INTO collected_domains (domain, collected_at) VALUES (?,NOW())', [domain]); }
};

// ════════════════════════════════════════
//  호환 레이어: readData / writeData 대체
// ════════════════════════════════════════
const fileMap = {
  'users.json': users,
  'partnerTree.json': { readAll: () => partners.getTree(), writeAll: (d) => partners.saveTree(d) },
  'transactions.json': transactions,
  'cs_transactions.json': csTransactions,
  'transfers.json': transfers,
  'notices.json': notices,
  'events.json': events,
  'inquiries.json': inquiries,
  'messages.json': messages,
  'referrals.json': referrals,
  'rolling_log.json': rollingLogs,
  'login_logs.json': loginLogs,
  'money_log_admin.json': moneyLogAdmin,
  'money_log_partner.json': moneyLogPartner,
  'money_log_user.json': moneyLogUser,
  'money_log_point.json': moneyLogPoint,
  'emptybet_log.json': emptybetLogs,
  'maxwin_logs.json': maxwinLogs,
  'emptybet_counter.json': emptybetCounters,
  'admin_account.json': adminAccount,
  'admin_settings.json': adminSettings,
  'games.json': gamesConfig,
  'quickreplies.json': quickReplies,
  'account_changes.json': accountChanges,
};

// 기존 readData 대체
async function readData(filename) {
  const handler = fileMap[filename];
  if (!handler) throw new Error(`Unknown data file: ${filename}`);
  if (handler.readAll) return handler.readAll();
  if (handler.get) return handler.get();
  throw new Error(`No readAll for: ${filename}`);
}

// 기존 writeData 대체
async function writeData(filename, data) {
  const handler = fileMap[filename];
  if (!handler) throw new Error(`Unknown data file: ${filename}`);
  if (handler.writeAll) return handler.writeAll(data);
  throw new Error(`No writeAll for: ${filename}`);
}

module.exports = {
  // 엔티티별 접근
  partners, users, transactions, csTransactions,
  transfers, moneyLogAdmin, moneyLogPartner, moneyLogUser, moneyLogPoint,
  rollingLogs, loginLogs, notices, events, inquiries, messages,
  referrals, quickReplies, adminAccount, adminSettings, gamesConfig,
  emptybetCounters, emptybetLogs, maxwinLogs, accountChanges,
  ipWhitelist, ipBlacklist, userIpBlacklist, collectedDomains,
  // 호환 레이어
  readData, writeData
};
