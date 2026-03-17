// ══════════════════════════════════════
//  텔레그램 알림 발송 헬퍼 (멀티봇)
// ══════════════════════════════════════
const fs   = require('fs');
const path = require('path');
const https = require('https');

const SETTINGS_FILE = path.join(__dirname, '../data/admin_settings.json');

function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); }
  catch(e) { return {}; }
}

function sendToBot(tg, text) {
  const payload = JSON.stringify({
    chat_id: tg.chatId,
    text: text,
    parse_mode: 'HTML'
  });

  const url = new URL('https://api.telegram.org/bot' + tg.botToken + '/sendMessage');

  const req = https.request({
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    res.resume();
  });

  req.on('error', (e) => {
    console.error('[Telegram] Send error:', e.message);
  });

  req.write(payload);
  req.end();
}

/**
 * 텔레그램 메시지 발송 (3개 봇 모두 체크)
 * @param {string} type - 알림 타입: deposit, withdraw, signup, inquiry, adminLogin
 * @param {string} text - 발송할 메시지
 */
function send(type, text) {
  const s = readSettings();
  let bots = s.telegramBots || [];

  // 기존 단일 설정 호환
  if (bots.length === 0 && s.telegram && s.telegram.botToken) {
    bots = [s.telegram];
  }

  bots.forEach(tg => {
    if (!tg || !tg.botToken || !tg.chatId) return;

    const toggleMap = {
      deposit:    tg.notifyDeposit,
      withdraw:   tg.notifyWithdraw,
      signup:     tg.notifySignup,
      inquiry:    tg.notifyInquiry,
      adminLogin: tg.notifyAdminLogin
    };
    if (!toggleMap[type]) return;

    sendToBot(tg, text);
  });
}

module.exports = { send };
