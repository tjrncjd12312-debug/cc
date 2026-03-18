// ══════════════════════════════════════
//  기존 평문 비밀번호 → bcrypt 해시 마이그레이션
//  실행: node scripts/hash-passwords.js
//  ※ 1회만 실행 — 이미 해시된 비밀번호는 건너뜀
// ══════════════════════════════════════
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../lib/db');

const SALT_ROUNDS = 10;

// bcrypt 해시는 $2b$ 또는 $2a$로 시작
function isHashed(pw) {
  return pw && (pw.startsWith('$2b$') || pw.startsWith('$2a$'));
}

async function run() {
  console.log('=== 비밀번호 해싱 마이그레이션 시작 ===\n');

  // 1. users 테이블
  const [users] = await db.query('SELECT id, username, password FROM users');
  let userCount = 0;
  for (const u of users) {
    if (!u.password || isHashed(u.password)) continue;
    const hashed = await bcrypt.hash(u.password, SALT_ROUNDS);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, u.id]);
    userCount++;
  }
  console.log('[users] ' + userCount + '/' + users.length + '명 해싱 완료');

  // 2. admin_account 테이블
  const [admins] = await db.query('SELECT id, username, password FROM admin_account');
  let adminCount = 0;
  for (const a of admins) {
    if (!a.password || isHashed(a.password)) continue;
    const hashed = await bcrypt.hash(a.password, SALT_ROUNDS);
    await db.run('UPDATE admin_account SET password = ? WHERE id = ?', [hashed, a.id]);
    adminCount++;
  }
  console.log('[admin_account] ' + adminCount + '/' + admins.length + '명 해싱 완료');

  // 3. partners 테이블 (파트너 트리의 비밀번호)
  const [partners] = await db.query('SELECT id, node_id, password FROM partners WHERE password IS NOT NULL AND password != \'\'');
  let partnerCount = 0;
  for (const p of partners) {
    if (!p.password || isHashed(p.password)) continue;
    const hashed = await bcrypt.hash(p.password, SALT_ROUNDS);
    await db.run('UPDATE partners SET password = ? WHERE id = ?', [hashed, p.id]);
    partnerCount++;
  }
  console.log('[partners] ' + partnerCount + '/' + partners.length + '명 해싱 완료');

  console.log('\n=== 마이그레이션 완료 ===');
  process.exit(0);
}

run().catch(err => {
  console.error('마이그레이션 오류:', err);
  process.exit(1);
});
