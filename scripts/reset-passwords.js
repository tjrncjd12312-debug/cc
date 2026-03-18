// ══════════════════════════════════════
//  bcrypt 해시 → 평문 비밀번호 리셋
//  해시된 비밀번호는 복구 불가능하므로 기본값으로 리셋
//  실행: node scripts/reset-passwords.js
// ══════════════════════════════════════
require('dotenv').config();
const db = require('../lib/db');

const DEFAULT_PASSWORD = '1234';

function isHashed(pw) {
  return pw && (pw.startsWith('$2b$') || pw.startsWith('$2a$'));
}

async function run() {
  console.log('=== 비밀번호 평문 리셋 (기본값: ' + DEFAULT_PASSWORD + ') ===\n');

  // 1. users
  const [users] = await db.query('SELECT id, username, password FROM users');
  let userCount = 0;
  for (const u of users) {
    if (isHashed(u.password)) {
      await db.run('UPDATE users SET password = ? WHERE id = ?', [DEFAULT_PASSWORD, u.id]);
      userCount++;
      console.log('  [user] ' + u.username + ' → ' + DEFAULT_PASSWORD);
    }
  }
  console.log('[users] ' + userCount + '/' + users.length + '명 리셋\n');

  // 2. admin_account
  const [admins] = await db.query('SELECT id, username, password FROM admin_account');
  let adminCount = 0;
  for (const a of admins) {
    if (isHashed(a.password)) {
      await db.run('UPDATE admin_account SET password = ? WHERE id = ?', [DEFAULT_PASSWORD, a.id]);
      adminCount++;
      console.log('  [admin] ' + a.username + ' → ' + DEFAULT_PASSWORD);
    }
  }
  console.log('[admin_account] ' + adminCount + '/' + admins.length + '명 리셋\n');

  // 3. partners
  const [partners] = await db.query('SELECT id, password FROM partners WHERE password IS NOT NULL AND password != \'\'');
  let partnerCount = 0;
  for (const p of partners) {
    if (isHashed(p.password)) {
      await db.run('UPDATE partners SET password = ? WHERE id = ?', [DEFAULT_PASSWORD, p.id]);
      partnerCount++;
      console.log('  [partner] ' + p.id + ' → ' + DEFAULT_PASSWORD);
    }
  }
  console.log('[partners] ' + partnerCount + '/' + partners.length + '명 리셋\n');

  console.log('=== 리셋 완료 — 모든 비밀번호: ' + DEFAULT_PASSWORD + ' ===');
  process.exit(0);
}

run().catch(err => {
  console.error('리셋 오류:', err);
  process.exit(1);
});
