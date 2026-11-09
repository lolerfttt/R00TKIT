/**
 * R00TKIT player tracking — Google Apps Script.
 *
 * 1. Открой https://script.google.com → New project.
 * 2. Удали код и вставь этот файл целиком.
 * 3. Deploy → New deployment → Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 4. Скопируй Web app URL и вставь его в r00tkit_files/js/telemetry.js
 *    в строку const ENDPOINT = '';
 * 5. Открой URL в браузере — должно быть "R00TKIT tracker online".
 *
 * При первой записи скрипт сам создаст таблицу "R00TKIT players"
 * на Google Диске владельца. Таблица приватная, читает её только владелец.
 */

const HEADERS = [
  'playerId', 'nick', 'firstSeen', 'lastSeen', 'totalMin', 'lastSessionMin',
  'visits', 'chapter', 'status', 'case', 'progress', 'n3x', 'sp', 'virus',
  'level', 'money', 'completed', 'userAgent'
];

function doGet() {
  return ContentService.createTextOutput('R00TKIT tracker online');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!data.playerId) return ContentService.createTextOutput('no id');

    const sh = sheet_();
    const last = sh.getLastRow();
    let row = 0;
    let firstSeen = new Date();

    if (last > 1) {
      const ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(data.playerId)) {
          row = i + 2;
          firstSeen = sh.getRange(row, 3).getValue() || firstSeen;
          break;
        }
      }
    }
    if (!row) row = Math.max(last + 1, 2);

    const values = [[
      data.playerId,
      data.nick || '',
      firstSeen,
      new Date(),
      Number(data.totalMin) || 0,
      Number(data.lastSessionMin) || 0,
      Number(data.visits) || 0,
      Number(data.chapter) || 0,
      data.status || '',
      data.caseTitle || '',
      data.progress || '',
      Number(data.n3x) || 0,
      Number(data.sp) || 0,
      Number(data.virus) || 0,
      Number(data.level) || 0,
      Number(data.money) || 0,
      Number(data.completed) || 0,
      String(data.ua || '').slice(0, 180)
    ]];

    sh.getRange(row, 1, 1, HEADERS.length).setValues(values);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('err');
  } finally {
    lock.releaseLock();
  }
}

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('sheetId');
  let ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.create('R00TKIT players');
    props.setProperty('sheetId', ss.getId());
  }
  const sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}
