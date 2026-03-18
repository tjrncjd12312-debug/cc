/**
 * JSON → MySQL 마이그레이션 스크립트
 * 사용법: node scripts/migrate.js
 *
 * 1) 테이블 생성 (DROP IF EXISTS)
 * 2) JSON 파일에서 데이터 이관
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSON(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
  } catch(e) {
    console.log(`  [SKIP] ${filename}: ${e.message}`);
    return null;
  }
}

// ── DDL ──
const DDL = [

// 1. 파트너 (adjacency list)
`CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR(100) PRIMARY KEY,
  label VARCHAR(200),
  level ENUM('admin','head','subhead','distributor','store','member') NOT NULL,
  parent_id VARCHAR(100) DEFAULT NULL,
  password VARCHAR(255),
  phone VARCHAR(50) DEFAULT '',
  bank VARCHAR(100) DEFAULT '',
  account VARCHAR(200) DEFAULT '',
  holder VARCHAR(100) DEFAULT '',
  memo TEXT,
  status VARCHAR(50) DEFAULT '정상',
  money BIGINT DEFAULT 0,
  point BIGINT DEFAULT 0,
  rolling_point BIGINT DEFAULT 0,
  roll_casino DECIMAL(5,2) DEFAULT 0,
  roll_slot DECIMAL(5,2) DEFAULT 0,
  roll_mini DECIMAL(5,2) DEFAULT 0,
  losing_slot DECIMAL(5,2) DEFAULT 0,
  total_deposit BIGINT DEFAULT 0,
  total_withdraw BIGINT DEFAULT 0,
  perm_casino TINYINT(1) DEFAULT 1,
  perm_slot TINYINT(1) DEFAULT 1,
  perm_minigame TINYINT(1) DEFAULT 1,
  empty_bet_casino INT DEFAULT 0,
  empty_bet_slot INT DEFAULT 0,
  empty_bet_minigame INT DEFAULT 0,
  display_color VARCHAR(20) DEFAULT '#ffffff',
  withdraw_pw VARCHAR(255) DEFAULT '',
  v_bank VARCHAR(100) DEFAULT '',
  v_account VARCHAR(200) DEFAULT '',
  v_holder VARCHAR(100) DEFAULT '',
  game_group VARCHAR(100) DEFAULT '',
  casino VARCHAR(10) DEFAULT 'ON',
  last_login_at DATETIME DEFAULT NULL,
  last_login_ip VARCHAR(50) DEFAULT NULL,
  registered_at DATETIME DEFAULT NULL,
  expanded TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 0,
  INDEX idx_parent (parent_id),
  INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 2. 유저
`CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  nickname VARCHAR(100),
  password VARCHAR(255),
  phone VARCHAR(50) DEFAULT '',
  bank VARCHAR(100) DEFAULT '',
  account VARCHAR(200) DEFAULT '',
  holder VARCHAR(100) DEFAULT '',
  money BIGINT DEFAULT 0,
  point BIGINT DEFAULT 0,
  status VARCHAR(50) DEFAULT '정상',
  casino VARCHAR(10) DEFAULT 'ON',
  slot VARCHAR(10) DEFAULT 'ON',
  memo TEXT,
  rolling_point BIGINT DEFAULT 0,
  game_group VARCHAR(100) DEFAULT '',
  belong_to VARCHAR(100) DEFAULT NULL,
  referred_by VARCHAR(100) DEFAULT NULL,
  referral_code VARCHAR(100) DEFAULT NULL,
  api JSON DEFAULT NULL,
  registered_at DATETIME DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  last_login_at DATETIME DEFAULT NULL,
  last_login_ip VARCHAR(50) DEFAULT NULL,
  INDEX idx_username (username),
  INDEX idx_belong (belong_to),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 3. 트랜잭션 (API 게임 내역)
`CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(100) PRIMARY KEY,
  type VARCHAR(50),
  amount DECIMAL(18,2) DEFAULT 0,
  \`before\` DECIMAL(18,2) DEFAULT 0,
  status VARCHAR(50),
  details JSON,
  processed_at DATETIME DEFAULT NULL,
  referer_id VARCHAR(100),
  created_at DATETIME DEFAULT NULL,
  user VARCHAR(100),
  external JSON,
  INDEX idx_user (user),
  INDEX idx_created (created_at),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 4. CS 트랜잭션
`CREATE TABLE IF NOT EXISTS cs_transactions (
  id VARCHAR(100) PRIMARY KEY,
  type VARCHAR(50),
  amount DECIMAL(18,2) DEFAULT 0,
  \`before\` DECIMAL(18,2) DEFAULT 0,
  status VARCHAR(50),
  details JSON,
  processed_at DATETIME DEFAULT NULL,
  referer_id VARCHAR(100),
  created_at DATETIME DEFAULT NULL,
  user VARCHAR(100),
  external JSON,
  INDEX idx_user (user),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 5. 충환전
`CREATE TABLE IF NOT EXISTS transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50),
  username VARCHAR(100),
  nickname VARCHAR(100),
  amount BIGINT DEFAULT 0,
  bank VARCHAR(100),
  account VARCHAR(200),
  holder VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  memo TEXT,
  processed_by VARCHAR(100),
  created_at DATETIME DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  INDEX idx_username (username),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 6. 입금 내역
`CREATE TABLE IF NOT EXISTS deposits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100),
  amount BIGINT DEFAULT 0,
  bank VARCHAR(100),
  account VARCHAR(200),
  holder VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 7. 머니 로그 (admin/partner/user/point 통합)
`CREATE TABLE IF NOT EXISTS money_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_type ENUM('admin','partner','user','point') NOT NULL,
  datetime DATETIME,
  type VARCHAR(50),
  processor VARCHAR(100),
  processor_level VARCHAR(50),
  target_id VARCHAR(100),
  target_nick VARCHAR(100),
  target_level VARCHAR(50),
  amount BIGINT DEFAULT 0,
  \`before\` BIGINT DEFAULT 0,
  \`after\` BIGINT DEFAULT 0,
  memo TEXT,
  INDEX idx_log_type (log_type),
  INDEX idx_target (target_id),
  INDEX idx_datetime (datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 8. 롤링 로그
`CREATE TABLE IF NOT EXISTS rolling_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tx_id VARCHAR(100),
  username VARCHAR(100),
  bet_by VARCHAR(50),
  bet_amount DECIMAL(18,2) DEFAULT 0,
  rate DECIMAL(5,2) DEFAULT 0,
  rolling_point DECIMAL(18,2) DEFAULT 0,
  vendor VARCHAR(100),
  game_type VARCHAR(50),
  datetime DATETIME,
  INDEX idx_username (username),
  INDEX idx_datetime (datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 9. 로그인 로그
`CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100),
  nickname VARCHAR(100),
  ip VARCHAR(50),
  device VARCHAR(200),
  datetime DATETIME,
  INDEX idx_username (username),
  INDEX idx_datetime (datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 10. 공지사항
`CREATE TABLE IF NOT EXISTS notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500),
  content TEXT,
  image VARCHAR(500),
  partner_popup TINYINT(1) DEFAULT 0,
  user_popup TINYINT(1) DEFAULT 0,
  login_popup TINYINT(1) DEFAULT 0,
  partner_show TINYINT(1) DEFAULT 0,
  user_show TINYINT(1) DEFAULT 0,
  \`rank\` INT DEFAULT 0,
  domain VARCHAR(200),
  created_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 11. 이벤트
`CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500),
  content TEXT,
  image VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 12. 문의
`CREATE TABLE IF NOT EXISTS inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100),
  title VARCHAR(500),
  content TEXT,
  reply TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT NULL,
  replied_at DATETIME DEFAULT NULL,
  INDEX idx_username (username),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 13. 쪽지
`CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender VARCHAR(100),
  receiver VARCHAR(100),
  title VARCHAR(500),
  content TEXT,
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT NULL,
  INDEX idx_receiver (receiver)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 14. 추천인
`CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100),
  code VARCHAR(100),
  used_count INT DEFAULT 0,
  used_by JSON,
  created_at DATETIME DEFAULT NULL,
  INDEX idx_user (user_id),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 15. 빈배팅 로그
`CREATE TABLE IF NOT EXISTS emptybet_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100),
  vendor VARCHAR(100),
  game_type VARCHAR(50),
  bet_amount DECIMAL(18,2) DEFAULT 0,
  datetime DATETIME,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 16. 맥스윈 로그
`CREATE TABLE IF NOT EXISTS maxwin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100),
  vendor VARCHAR(100),
  game_name VARCHAR(200),
  bet_amount DECIMAL(18,2) DEFAULT 0,
  win_amount DECIMAL(18,2) DEFAULT 0,
  multiplier DECIMAL(10,2) DEFAULT 0,
  datetime DATETIME,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 17. 빈배팅 카운터
`CREATE TABLE IF NOT EXISTS emptybet_counters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  counter_key VARCHAR(200) UNIQUE,
  count INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 18. 관리자 계정
`CREATE TABLE IF NOT EXISTS admin_account (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 19. 관리자 설정 (key-value + JSON)
`CREATE TABLE IF NOT EXISTS admin_settings (
  setting_key VARCHAR(200) PRIMARY KEY,
  setting_value JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 20. 게임 설정
`CREATE TABLE IF NOT EXISTS games_config (
  config_key VARCHAR(200) PRIMARY KEY,
  config_value JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 21. 빠른 답변
`CREATE TABLE IF NOT EXISTS quick_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500),
  content TEXT,
  created_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 22. 계좌 변경 내역
`CREATE TABLE IF NOT EXISTS account_changes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100),
  field_name VARCHAR(100),
  old_value VARCHAR(500),
  new_value VARCHAR(500),
  changed_at DATETIME DEFAULT NULL,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 23. IP 화이트리스트
`CREATE TABLE IF NOT EXISTS ip_whitelist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(50) NOT NULL,
  memo VARCHAR(200),
  created_at DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 24. IP 블랙리스트 (관리자)
`CREATE TABLE IF NOT EXISTS ip_blacklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(50) NOT NULL,
  memo VARCHAR(200),
  created_at DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 25. 유저 IP 차단
`CREATE TABLE IF NOT EXISTS user_ip_blacklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(50) NOT NULL,
  memo VARCHAR(200),
  created_at DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

// 26. 수집된 도메인
`CREATE TABLE IF NOT EXISTS collected_domains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  domain VARCHAR(500),
  collected_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`

];

// ── 파트너 트리 평탄화 (adjacency list) ──
function flattenTree(nodes, parentId, result, sortStart) {
  if (!Array.isArray(nodes)) return sortStart;
  let sort = sortStart;
  for (const node of nodes) {
    result.push({
      id: node.id,
      label: node.label || node.id,
      level: node.level,
      parent_id: parentId,
      password: node.password || '',
      phone: node.phone || '',
      bank: node.bank || '',
      account: node.account || '',
      holder: node.holder || '',
      memo: node.memo || '',
      status: node.status || '정상',
      money: node.money || 0,
      point: node.point || 0,
      rolling_point: node.rollingPoint || 0,
      roll_casino: parseFloat(node.rollCasino) || 0,
      roll_slot: parseFloat(node.rollSlot) || 0,
      roll_mini: parseFloat(node.rollMini) || 0,
      losing_slot: parseFloat(node.losingSlot) || 0,
      total_deposit: node.totalDeposit || 0,
      total_withdraw: node.totalWithdraw || 0,
      perm_casino: node['perm카지노'] !== undefined ? (node['perm카지노'] ? 1 : 0) : 1,
      perm_slot: node['perm슬롯'] !== undefined ? (node['perm슬롯'] ? 1 : 0) : 1,
      perm_minigame: node['perm미니게임'] !== undefined ? (node['perm미니게임'] ? 1 : 0) : 1,
      empty_bet_casino: node['emptyBet카지노'] || 0,
      empty_bet_slot: node['emptyBet슬롯'] || 0,
      empty_bet_minigame: node['emptyBet미니게임'] || 0,
      display_color: node.displayColor || '#ffffff',
      withdraw_pw: node.withdrawPw || '',
      v_bank: node.vBank || '',
      v_account: node.vAccount || '',
      v_holder: node.vHolder || '',
      game_group: node.gameGroup || '',
      casino: node.casino || 'ON',
      last_login_at: node.lastLoginAt || null,
      last_login_ip: node.lastLoginIp || null,
      registered_at: node.registeredAt || null,
      expanded: node.expanded ? 1 : 0,
      sort_order: sort++
    });
    if (node.children && node.children.length > 0) {
      sort = flattenTree(node.children, node.id, result, sort);
    }
  }
  return sort;
}

// ── 날짜 파싱 ──
function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// ── 메인 ──
async function main() {
  console.log('=== MySQL Migration Start ===\n');

  // DB 연결 (database 없이 먼저 연결해서 CREATE DATABASE)
  const connNoDB = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'casino',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4'
  });

  const dbName = process.env.DB_NAME || 'casino';
  await connNoDB.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`Database "${dbName}" ready.\n`);
  await connNoDB.end();

  // DB에 연결
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'casino',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    charset: 'utf8mb4'
  });

  // 테이블 생성
  console.log('[1/2] Creating tables...');
  for (const ddl of DDL) {
    const tableName = ddl.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || '?';
    try {
      await conn.query(ddl);
      console.log(`  ✓ ${tableName}`);
    } catch(e) {
      console.error(`  ✗ ${tableName}: ${e.message}`);
    }
  }

  // 데이터 이관
  console.log('\n[2/2] Importing data...\n');

  // ── partners ──
  const tree = readJSON('partnerTree.json');
  if (tree) {
    const flat = [];
    flattenTree(tree, null, flat, 0);
    console.log(`  partners: ${flat.length} rows`);
    for (const p of flat) {
      await conn.query(
        `INSERT INTO partners (id, label, level, parent_id, password, phone, bank, account, holder, memo, status,
          money, point, rolling_point, roll_casino, roll_slot, roll_mini, losing_slot, total_deposit, total_withdraw,
          perm_casino, perm_slot, perm_minigame, empty_bet_casino, empty_bet_slot, empty_bet_minigame,
          display_color, withdraw_pw, v_bank, v_account, v_holder, game_group, casino,
          last_login_at, last_login_ip, registered_at, expanded, sort_order)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE label=VALUES(label)`,
        [p.id, p.label, p.level, p.parent_id, p.password, p.phone, p.bank, p.account,
         p.holder, p.memo, p.status, p.money, p.point, p.rolling_point,
         p.roll_casino, p.roll_slot, p.roll_mini, p.losing_slot, p.total_deposit, p.total_withdraw,
         p.perm_casino, p.perm_slot, p.perm_minigame, p.empty_bet_casino, p.empty_bet_slot, p.empty_bet_minigame,
         p.display_color, p.withdraw_pw, p.v_bank, p.v_account, p.v_holder, p.game_group, p.casino,
         parseDate(p.last_login_at), p.last_login_ip, parseDate(p.registered_at), p.expanded, p.sort_order]
      );
    }
  }

  // ── users ──
  const users = readJSON('users.json');
  if (users && Array.isArray(users)) {
    console.log(`  users: ${users.length} rows`);
    for (const u of users) {
      await conn.query(
        `INSERT INTO users (id, username, nickname, password, phone, bank, account, holder,
          money, point, status, casino, slot, memo, rolling_point, game_group, belong_to,
          referred_by, referral_code, api, registered_at, approved_at, last_login_at, last_login_ip)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE username=VALUES(username)`,
        [u.id, u.username, u.nickname, u.password, u.phone || '', u.bank || '', u.account || '',
         u.holder || '', u.money || 0, u.point || 0, u.status || '정상',
         u.casino || 'ON', u.slot || 'ON', u.memo || '', u.rollingPoint || 0,
         u.gameGroup || '', u.belongTo || null, u.referredBy || null, u.referralCode || null,
         JSON.stringify(u.api || []), parseDate(u.registeredAt), parseDate(u.approvedAt),
         parseDate(u.lastLoginAt), u.lastLoginIp || null]
      );
    }
  }

  // ── transactions ──
  const txs = readJSON('transactions.json');
  if (txs && Array.isArray(txs)) {
    console.log(`  transactions: ${txs.length} rows`);
    for (const t of txs) {
      await conn.query(
        `INSERT INTO transactions (id, type, amount, \`before\`, status, details, processed_at, referer_id, created_at, user, external)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE id=VALUES(id)`,
        [t.id, t.type, t.amount || 0, t.before || 0, t.status,
         JSON.stringify(t.details || {}), parseDate(t.processed_at),
         t.referer_id || null, parseDate(t.created_at), t.user || null,
         JSON.stringify(t.external || {})]
      );
    }
  }

  // ── cs_transactions ──
  const csTxs = readJSON('cs_transactions.json');
  if (csTxs && Array.isArray(csTxs)) {
    console.log(`  cs_transactions: ${csTxs.length} rows`);
    for (const t of csTxs) {
      await conn.query(
        `INSERT INTO cs_transactions (id, type, amount, \`before\`, status, details, processed_at, referer_id, created_at, user, external)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE id=VALUES(id)`,
        [t.id, t.type, t.amount || 0, t.before || 0, t.status,
         JSON.stringify(t.details || {}), parseDate(t.processed_at),
         t.referer_id || null, parseDate(t.created_at), t.user || null,
         JSON.stringify(t.external || {})]
      );
    }
  }

  // ── transfers ──
  const transfers = readJSON('transfers.json');
  if (transfers && Array.isArray(transfers) && transfers.length > 0) {
    console.log(`  transfers: ${transfers.length} rows`);
    for (const t of transfers) {
      await conn.query(
        `INSERT INTO transfers (type, username, nickname, amount, bank, account, holder, status, memo, processed_by, created_at, processed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [t.type, t.username, t.nickname, t.amount || 0, t.bank || '', t.account || '',
         t.holder || '', t.status || 'pending', t.memo || '', t.processedBy || null,
         parseDate(t.createdAt), parseDate(t.processedAt)]
      );
    }
  }

  // ── money_logs (4종 통합) ──
  const logTypes = [
    { file: 'money_log_admin.json', type: 'admin' },
    { file: 'money_log_partner.json', type: 'partner' },
    { file: 'money_log_user.json', type: 'user' },
    { file: 'money_log_point.json', type: 'point' }
  ];
  for (const lt of logTypes) {
    const logs = readJSON(lt.file);
    if (logs && Array.isArray(logs) && logs.length > 0) {
      console.log(`  money_logs (${lt.type}): ${logs.length} rows`);
      for (const l of logs) {
        await conn.query(
          `INSERT INTO money_logs (log_type, datetime, type, processor, processor_level, target_id, target_nick, target_level, amount, \`before\`, \`after\`, memo)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [lt.type, parseDate(l.datetime), l.type, l.processor || '', l.processorLevel || '',
           l.targetId || '', l.targetNick || '', l.targetLevel || '', l.amount || 0,
           l.before || 0, l.after || 0, l.memo || '']
        );
      }
    }
  }

  // ── rolling_logs ──
  const rlogs = readJSON('rolling_log.json');
  if (rlogs && Array.isArray(rlogs) && rlogs.length > 0) {
    console.log(`  rolling_logs: ${rlogs.length} rows`);
    for (const r of rlogs) {
      await conn.query(
        `INSERT INTO rolling_logs (tx_id, username, bet_by, bet_amount, rate, rolling_point, vendor, game_type, datetime)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [r.txId, r.username, r.betBy, r.betAmount || 0, r.rate || 0, r.rollingPoint || 0,
         r.vendor || '', r.gameType || '', parseDate(r.datetime)]
      );
    }
  }

  // ── login_logs ──
  const llogs = readJSON('login_logs.json');
  if (llogs && Array.isArray(llogs) && llogs.length > 0) {
    console.log(`  login_logs: ${llogs.length} rows`);
    for (const l of llogs) {
      await conn.query(
        `INSERT INTO login_logs (username, nickname, ip, device, datetime)
        VALUES (?,?,?,?,?)`,
        [l.username, l.nickname, l.ip, l.device || '', parseDate(l.datetime)]
      );
    }
  }

  // ── notices ──
  const notices = readJSON('notices.json');
  if (notices && Array.isArray(notices) && notices.length > 0) {
    console.log(`  notices: ${notices.length} rows`);
    for (const n of notices) {
      await conn.query(
        `INSERT INTO notices (title, content, image, partner_popup, user_popup, login_popup, partner_show, user_show, \`rank\`, domain, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [n.title, n.content, n.image || '', n.partnerPopup ? 1 : 0, n.userPopup ? 1 : 0,
         n.loginPopup ? 1 : 0, n.partnerShow ? 1 : 0, n.userShow ? 1 : 0,
         n.rank || 0, n.domain || '', parseDate(n.createdAt)]
      );
    }
  }

  // ── events ──
  const events = readJSON('events.json');
  if (events && Array.isArray(events) && events.length > 0) {
    console.log(`  events: ${events.length} rows`);
    for (const e of events) {
      await conn.query(
        `INSERT INTO events (title, content, image, status, created_at)
        VALUES (?,?,?,?,?)`,
        [e.title, e.content, e.image || '', e.status || 'active', parseDate(e.createdAt)]
      );
    }
  }

  // ── inquiries ──
  const inqs = readJSON('inquiries.json');
  if (inqs && Array.isArray(inqs) && inqs.length > 0) {
    console.log(`  inquiries: ${inqs.length} rows`);
    for (const q of inqs) {
      await conn.query(
        `INSERT INTO inquiries (username, title, content, reply, status, created_at, replied_at)
        VALUES (?,?,?,?,?,?,?)`,
        [q.username, q.title, q.content, q.reply || null, q.status || 'pending',
         parseDate(q.createdAt), parseDate(q.repliedAt)]
      );
    }
  }

  // ── messages ──
  const msgs = readJSON('messages.json');
  if (msgs && Array.isArray(msgs) && msgs.length > 0) {
    console.log(`  messages: ${msgs.length} rows`);
    for (const m of msgs) {
      await conn.query(
        `INSERT INTO messages (sender, receiver, title, content, is_read, created_at)
        VALUES (?,?,?,?,?,?)`,
        [m.sender, m.receiver, m.title, m.content, m.isRead ? 1 : 0, parseDate(m.createdAt)]
      );
    }
  }

  // ── referrals ──
  const refs = readJSON('referrals.json');
  if (refs && Array.isArray(refs) && refs.length > 0) {
    console.log(`  referrals: ${refs.length} rows`);
    for (const r of refs) {
      await conn.query(
        `INSERT INTO referrals (id, user_id, code, used_count, used_by, created_at)
        VALUES (?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE id=VALUES(id)`,
        [r.id, r.userId, r.code, r.usedCount || 0, JSON.stringify(r.usedBy || []), parseDate(r.createdAt)]
      );
    }
  }

  // ── emptybet_logs ──
  const eblogs = readJSON('emptybet_log.json');
  if (eblogs && Array.isArray(eblogs) && eblogs.length > 0) {
    console.log(`  emptybet_logs: ${eblogs.length} rows`);
    for (const e of eblogs) {
      await conn.query(
        `INSERT INTO emptybet_logs (username, vendor, game_type, bet_amount, datetime)
        VALUES (?,?,?,?,?)`,
        [e.username, e.vendor || '', e.gameType || '', e.betAmount || 0, parseDate(e.datetime)]
      );
    }
  }

  // ── maxwin_logs ──
  const mwlogs = readJSON('maxwin_logs.json');
  if (mwlogs && Array.isArray(mwlogs) && mwlogs.length > 0) {
    console.log(`  maxwin_logs: ${mwlogs.length} rows`);
    for (const m of mwlogs) {
      await conn.query(
        `INSERT INTO maxwin_logs (username, vendor, game_name, bet_amount, win_amount, multiplier, datetime)
        VALUES (?,?,?,?,?,?,?)`,
        [m.username, m.vendor || '', m.gameName || '', m.betAmount || 0, m.winAmount || 0,
         m.multiplier || 0, parseDate(m.datetime)]
      );
    }
  }

  // ── emptybet_counters ──
  const ebCounter = readJSON('emptybet_counter.json');
  if (ebCounter && typeof ebCounter === 'object') {
    const entries = Object.entries(ebCounter);
    console.log(`  emptybet_counters: ${entries.length} rows`);
    for (const [key, val] of entries) {
      await conn.query(
        `INSERT INTO emptybet_counters (counter_key, count) VALUES (?,?)
        ON DUPLICATE KEY UPDATE count=VALUES(count)`,
        [key, val]
      );
    }
  }

  // ── admin_account ──
  const adminAcc = readJSON('admin_account.json');
  if (adminAcc) {
    console.log(`  admin_account: 1 row`);
    await conn.query(
      `INSERT INTO admin_account (username, password) VALUES (?,?)
      ON DUPLICATE KEY UPDATE password=VALUES(password)`,
      [adminAcc.username, adminAcc.password]
    );
  }

  // ── admin_settings ──
  const settings = readJSON('admin_settings.json');
  if (settings) {
    const entries = Object.entries(settings);
    console.log(`  admin_settings: ${entries.length} keys`);
    for (const [key, val] of entries) {
      await conn.query(
        `INSERT INTO admin_settings (setting_key, setting_value) VALUES (?,?)
        ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`,
        [key, JSON.stringify(val)]
      );
    }
    // IP 관련 설정 이관
    if (settings.security) {
      // whitelistIps, blockedIps, blockedUserIps
      if (settings.whitelistIps) {
        for (const w of settings.whitelistIps) {
          await conn.query(`INSERT INTO ip_whitelist (ip, memo) VALUES (?,?)`, [w.ip, w.memo || '']);
        }
      }
      if (settings.blockedIps) {
        for (const b of settings.blockedIps) {
          await conn.query(`INSERT INTO ip_blacklist (ip, memo) VALUES (?,?)`, [b.ip, b.memo || '']);
        }
      }
      if (settings.blockedUserIps) {
        for (const b of settings.blockedUserIps) {
          await conn.query(`INSERT INTO user_ip_blacklist (ip, memo) VALUES (?,?)`, [b.ip, b.memo || '']);
        }
      }
    }
  }

  // ── games_config ──
  const games = readJSON('games.json');
  if (games) {
    const entries = Object.entries(games);
    console.log(`  games_config: ${entries.length} keys`);
    for (const [key, val] of entries) {
      await conn.query(
        `INSERT INTO games_config (config_key, config_value) VALUES (?,?)
        ON DUPLICATE KEY UPDATE config_value=VALUES(config_value)`,
        [key, JSON.stringify(val)]
      );
    }
  }

  // ── quick_replies ──
  const qr = readJSON('quickreplies.json');
  if (qr && Array.isArray(qr) && qr.length > 0) {
    console.log(`  quick_replies: ${qr.length} rows`);
    for (const q of qr) {
      await conn.query(
        `INSERT INTO quick_replies (title, content, created_at) VALUES (?,?,?)`,
        [q.title, q.content, parseDate(q.createdAt)]
      );
    }
  }

  // ── account_changes ──
  const ac = readJSON('account_changes.json');
  if (ac && Array.isArray(ac) && ac.length > 0) {
    console.log(`  account_changes: ${ac.length} rows`);
    for (const a of ac) {
      await conn.query(
        `INSERT INTO account_changes (username, field_name, old_value, new_value, changed_at)
        VALUES (?,?,?,?,?)`,
        [a.username, a.fieldName || '', a.oldValue || '', a.newValue || '', parseDate(a.changedAt)]
      );
    }
  }

  await conn.end();
  console.log('\n=== Migration Complete ===');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
