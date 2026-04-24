const { google } = require('googleapis');

const DISCO_CALENDAR_ID = 'h681qa6cer5nh1k98prs7f73s0@group.calendar.google.com';

exports.handler = async (event) => {
  const refreshToken = event.queryStringParameters?.refresh_token;
  if (!refreshToken) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No refresh token' }) };
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://eh-dash.netlify.app/auth/callback'
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const now = new Date();
    const twoWeeksOut = new Date(); twoWeeksOut.setDate(now.getDate() + 14);
    const sixtyDaysOut = new Date(); sixtyDaysOut.setDate(now.getDate() + 60);

    const [primary, disco, deadlines] = await Promise.all([
      calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(), timeMax: twoWeeksOut.toISOString(),
        singleEvents: true, orderBy: 'startTime', timeZone: 'America/Chicago',
      }),
      calendar.events.list({
        calendarId: DISCO_CALENDAR_ID,
        timeMin: now.toISOString(), timeMax: twoWeeksOut.toISOString(),
        singleEvents: true, orderBy: 'startTime', timeZone: 'America/Chicago',
      }),
      calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(), timeMax: sixtyDaysOut.toISOString(),
        singleEvents: true, orderBy: 'startTime', timeZone: 'America/Chicago',
        q: '#dashboard',
      }),
    ]);

    const dashboardDeadlines = (deadlines.data.items || [])
      .filter(e => (e.description || '').toLowerCase().includes('#dashboard'))
      .slice(0, 6)
      .map(e => ({
        summary: e.summary,
        date: (e.start.date || e.start.dateTime || '').slice(0, 10),
      }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://eh-dash.netlify.app',
      },
      body: JSON.stringify({
        primary: primary.data.items,
        whiteLies: disco.data.items,
        deadlines: dashboardDeadlines,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
