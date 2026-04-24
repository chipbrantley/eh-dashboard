const { google } = require('googleapis');

const DOC_ID = '1_3tObS8DiSYF4-nJR0D82guWLhF0wNgGYgV1P5CzRkc';

const HABIT_NAMES = {
  morning:'Morning ritual', meditate:'Meditate', read:'Read',
  freewrite:'Free write', exercise:'Exercise', ynab:'YNAB',
  laundry:'Laundry', 'w-monks':'Monks', 'w-dom':'Death of Metaphor',
  'w-burst':'Creative Bursts',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }
  const { refresh_token, date, notes, habits } = body;
  if (!refresh_token) return { statusCode: 401, body: JSON.stringify({ error: 'No refresh token' }) };
  const hasNotes = notes && notes.trim();
  const hasHabits = habits && Object.keys(habits).length > 0;
  if (!hasNotes && !hasHabits) return { statusCode: 200, body: JSON.stringify({ success: true, skipped: true }) };

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET,
    'https://eh-dash.netlify.app/auth/callback'
  );
  oauth2Client.setCredentials({ refresh_token });
  try {
    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    let entry = `\n${date}\n`;
    if (hasHabits) {
      const habitLine = Object.entries(HABIT_NAMES).map(([id, name]) => `${habits[id] ? '✓' : '✗'} ${name}`).join('   ');
      entry += `Habits: ${habitLine}\n`;
    }
    if (hasNotes) entry += `\n${notes.trim()}\n`;
    entry += `\n─────────────────────────────────────────\n`;
    const docRes = await docs.documents.get({ documentId: DOC_ID });
    const content = docRes.data.body.content;
    let insertIndex = 1;
    if (content && content.length > 1) insertIndex = content[1].startIndex || 1;
    await docs.documents.batchUpdate({
      documentId: DOC_ID,
      requestBody: { requests: [{ insertText: { location: { index: insertIndex }, text: entry } }] },
    });
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': 'https://eh-dash.netlify.app' }, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
