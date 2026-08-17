/**
 * OSIS Election - Google Apps Script Backend
 * 
 * Deployment Instructions:
 * 1. Create a new Google Sheet.
 * 2. Create sheets: "Votes", "Config", "Kandidat". (Votes: Timestamp | Nama | Kelas | Paslon | Session ID)
 * 3. In "Config" sheet, add these rows (Key in col A, Value in col B):
 *    - StatusForm | BUKA
 *    - AdminPassword | [Your Password]
 *    - AdminToken | [Random Secret String]
 * 4. In "Kandidat" sheet, add columns: Nomor | Ketua | Wakil | VisiMisi
 * 5. Open Extensions > Apps Script.
 * 6. Paste this code into Code.gs.
 * 7. Deploy as Web App, execute as "Me", access "Anyone".
 * 8. Copy the Web App URL and paste it into public/script.js and public/admin.js.
 */

const SHEET_VOTES = 'Votes';
const SHEET_CONFIG = 'Config';
const SHEET_KANDIDAT = 'Kandidat';

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'status') {
    return handleGetStatus();
  } else if (action === 'results') {
    const token = e.parameter.token;
    return handleGetResults(token);
  }
  
  return jsonResponse({status: 'error', message: 'Invalid action'});
}

function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch(err) {
    return jsonResponse({status: 'error', message: 'Invalid JSON payload'});
  }
  
  const action = payload.action;
  
  if (action === 'vote') {
    return handleVote(payload);
  } else if (action === 'login') {
    return handleLogin(payload.password);
  } else if (action === 'toggle_status') {
    return handleToggleStatus(payload.token, payload.isOpen);
  }
  
  return jsonResponse({status: 'error', message: 'Invalid action'});
}

// ==========================================
// Handlers
// ==========================================

function handleGetStatus() {
  const isOpen = getConfigValue('StatusForm') === 'BUKA';
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KANDIDAT);
  let kandidat = [];
  
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    // Skip header
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        kandidat.push({
          id: parseInt(data[i][0]),
          ketua: data[i][1],
          wakil: data[i][2],
          visi: data[i][3],
          misi: data[i][4] || "",
          foto: data[i][5] || "" // Kolom ke-6 untuk link foto
        });
      }
    }
  }
  
  // Default fallback if sheet empty
  if (kandidat.length === 0) {
    kandidat = [
      { id: 1, ketua: "Kandidat 1", wakil: "Wakil 1", visi: "Visi 1", misi: "Misi 1" },
      { id: 2, ketua: "Kandidat 2", wakil: "Wakil 2", visi: "Visi 2", misi: "Misi 2" }
    ];
  }
  
  return jsonResponse({
    status: 'success',
    isOpen: isOpen,
    kandidat: kandidat
  });
}

function handleGetResults(token) {
  if (token !== getConfigValue('AdminToken')) {
    return jsonResponse({status: 'error', message: 'Invalid Token'});
  }
  
  const isOpen = getConfigValue('StatusForm') === 'BUKA';
  const votesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VOTES);
  
  let totalVotes = 0;
  let voteCounts = {};
  
  if (votesSheet) {
    const data = votesSheet.getDataRange().getValues();
    totalVotes = data.length > 1 ? data.length - 1 : 0; // exclude header
    
    for (let i = 1; i < data.length; i++) {
      const paslonId = data[i][3]; // Kolom D (index 3) adalah ID Paslon
      voteCounts[paslonId] = (voteCounts[paslonId] || 0) + 1;
    }
  }
  
  // Build chart data
  const kandidatData = handleGetStatus().getContent();
  const parsedStatus = JSON.parse(kandidatData);
  const candidatesList = parsedStatus.kandidat;
  
  let labels = [];
  let counts = [];
  
  candidatesList.forEach(c => {
    labels.push(`Paslon 0${c.id}`);
    counts.push(voteCounts[c.id] || 0);
  });
  
  return jsonResponse({
    status: 'success',
    totalVotes: totalVotes,
    isOpen: isOpen,
    candidates: labels,
    votes: counts
  });
}

function handleVote(payload) {
  const { nama, kelas, paslonId, sessionId } = payload;
  
  if (getConfigValue('StatusForm') !== 'BUKA') {
    return jsonResponse({status: 'error', message: 'Voting sedang ditutup'});
  }
  
  // Concurrency Lock
  const lock = LockService.getScriptLock();
  try {
    // Wait for up to 5 seconds for other processes to finish.
    lock.waitLock(5000);
  } catch (e) {
    return jsonResponse({status: 'error', message: 'Sistem sedang sibuk. Silakan coba lagi.'});
  }
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VOTES);
    
    // Check if Nama and Kelas already voted
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim().toLowerCase() === String(nama).trim().toLowerCase() && String(data[i][2]).trim() === String(kelas).trim()) {
        return jsonResponse({status: 'error', message: 'Siswa dengan Nama dan Kelas ini sudah memberikan suara.'});
      }
    }
    
    // Insert new vote
    const timestamp = new Date();
    sheet.appendRow([timestamp, nama, kelas, paslonId, sessionId]);
    
    return jsonResponse({status: 'success'});
    
  } catch (err) {
    return jsonResponse({status: 'error', message: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

function handleLogin(password) {
  if (password === getConfigValue('AdminPassword')) {
    const token = getConfigValue('AdminToken');
    return jsonResponse({status: 'success', token: token});
  }
  return jsonResponse({status: 'error', message: 'Password salah'});
}

function handleToggleStatus(token, isOpen) {
  if (token !== getConfigValue('AdminToken')) {
    return jsonResponse({status: 'error', message: 'Invalid Token'});
  }
  
  const newValue = isOpen ? 'BUKA' : 'TUTUP';
  setConfigValue('StatusForm', newValue);
  
  return jsonResponse({status: 'success'});
}

// ==========================================
// Helpers
// ==========================================

function getConfigValue(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  return null;
}

function setConfigValue(key, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  // If not found, append
  sheet.appendRow([key, value]);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
