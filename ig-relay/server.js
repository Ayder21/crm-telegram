require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { IgApiClient } = require('instagram-private-api');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.RELAY_API_KEY || 'sellio-secret-relay-key-2026';

function authenticate(req, res, next) {
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

// ── LOGIN (Generates a fresh VPS-bound session) ────────────────────────────────
// Call this once per user from the CRM settings page.
// The returned sessionData must be stored in Supabase and sent on every subsequent call.
app.post('/api/ig/login', authenticate, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

        const ig = new IgApiClient();
        ig.state.generateDevice(username);

        await ig.simulate.preLoginFlow();
        const loggedInUser = await ig.account.login(username, password);
        await ig.simulate.postLoginFlow();

        const serialized = await ig.state.serialize();
        delete serialized.constants;

        console.log(`[login] OK for ${username} (pk=${loggedInUser.pk})`);
        res.json({ success: true, sessionData: serialized, pk: loggedInUser.pk });
    } catch (e) {
        console.error('[login] Error:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── CHECK MESSAGES ─────────────────────────────────────────────────────────────
app.post('/api/ig/check_messages', authenticate, async (req, res) => {
    try {
        const { username, sessionData } = req.body;
        if (!sessionData) return res.status(400).json({ error: 'Missing sessionData. Call /api/ig/login first.' });

        const ig = new IgApiClient();
        ig.state.generateDevice(username || 'device');
        await ig.state.deserialize(sessionData);

        const myUserId = ig.state.cookieUserId;

        const inboxFeed = ig.feed.directInbox();
        const threads = await inboxFeed.items();

        const updated = await ig.state.serialize();
        delete updated.constants;

        console.log(`[check_messages] OK for ${username}, ${threads.length} threads`);
        res.json({ success: true, threads, myUserId, updatedSessionData: updated });
    } catch (e) {
        console.error('[check_messages] Error:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── SEND MESSAGE ───────────────────────────────────────────────────────────────
app.post('/api/ig/send_message', authenticate, async (req, res) => {
    try {
        const { username, sessionData, threadId, text } = req.body;
        if (!sessionData) return res.status(400).json({ error: 'Missing sessionData. Call /api/ig/login first.' });
        if (!threadId || !text) return res.status(400).json({ error: 'Missing threadId or text' });

        const ig = new IgApiClient();
        ig.state.generateDevice(username || 'device');
        await ig.state.deserialize(sessionData);

        await ig.entity.directThread(threadId).broadcastText(text);

        const updated = await ig.state.serialize();
        delete updated.constants;

        console.log(`[send_message] OK to thread ${threadId}`);
        res.json({ success: true, updatedSessionData: updated });
    } catch (e) {
        console.error('[send_message] Error:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── HEALTH ─────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`ig-relay running on port ${PORT}`));
