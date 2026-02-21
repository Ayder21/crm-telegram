require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { IgApiClient } = require('instagram-private-api');

const app = express();
app.use(cors());
app.use(express.json());

// A simple API Key check to ensure random internet access isn't allowed
const API_KEY = process.env.RELAY_API_KEY || 'sellio-secret-relay-key-2026';

function authenticate(req, res, next) {
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

async function getIgClient(username, sessionData, sessionid, cookiesJson) {
    const ig = new IgApiClient();
    ig.state.generateDevice(username || 'proxy_device');

    if (sessionData) {
        await ig.state.deserialize(sessionData);
    } else if (cookiesJson && Array.isArray(cookiesJson)) {
        for (const c of cookiesJson) {
            await ig.state.cookieJar.setCookie(`${c.name}=${c.value}; Domain=.instagram.com; Path=/; Secure; HttpOnly`, 'https://instagram.com');
        }
    } else if (sessionid) {
        let extractedPk = sessionid.split(':')[0];
        if (extractedPk && !isNaN(parseInt(extractedPk))) {
            const dsUserIdCookie = `ds_user_id=${extractedPk}; Domain=.instagram.com; Path=/; Secure; HttpOnly`;
            await ig.state.cookieJar.setCookie(dsUserIdCookie, 'https://instagram.com');
        }
        await ig.state.cookieJar.setCookie(`sessionid=${sessionid}; Domain=.instagram.com; Path=/; Secure; HttpOnly`, 'https://instagram.com');
        await ig.state.cookieJar.setCookie(`csrftoken=missing; Domain=.instagram.com; Path=/; Secure; HttpOnly`, 'https://instagram.com');
        await ig.state.cookieJar.setCookie(`ig_did=${ig.state.deviceString}; Domain=.instagram.com; Path=/; Secure; HttpOnly`, 'https://instagram.com');
        await ig.state.cookieJar.setCookie(`mid=xyz; Domain=.instagram.com; Path=/; Secure; HttpOnly`, 'https://instagram.com');
    }

    return ig;
}

app.post('/api/ig/login', authenticate, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

        const ig = new IgApiClient();
        ig.state.generateDevice(username);

        await ig.simulate.preLoginFlow();
        const loggedInUser = await ig.account.login(username, password);
        await ig.simulate.postLoginFlow();

        const serialized = await ig.state.serialize();
        delete serialized.constants;

        res.json({ success: true, sessionData: serialized, user: loggedInUser });
    } catch (e) {
        console.error("Login Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/ig/check_messages', authenticate, async (req, res) => {
    try {
        const { username, sessionData, sessionid, cookiesJson } = req.body;
        if (!sessionData && !cookiesJson && !sessionid) return res.status(400).json({ error: 'Missing sessionData or cookies' });

        const ig = await getIgClient(username, sessionData, sessionid, cookiesJson);

        const inboxFeed = ig.feed.directInbox();
        const threads = await inboxFeed.items();

        // Save potentially updated state
        const serialized = await ig.state.serialize();
        delete serialized.constants;

        res.json({ success: true, threads, updatedSessionData: serialized });
    } catch (e) {
        console.error("Inbox Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/ig/send_message', authenticate, async (req, res) => {
    try {
        const { username, sessionData, sessionid, cookiesJson, threadId, text } = req.body;
        if (!threadId || !text) {
            return res.status(400).json({ success: false, error: 'Missing threadId or text' });
        }
        if (!sessionData && !sessionid && !cookiesJson) {
            return res.status(400).json({ success: false, error: 'Missing auth data' });
        }

        const ig = await getIgClient(username, sessionData, sessionid, cookiesJson);

        await ig.entity.directThread(threadId).broadcastText(text);

        const serialized = await ig.state.serialize();
        delete serialized.constants;

        res.json({ success: true, updatedSessionData: serialized });
    } catch (e) {
        console.error("Send Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

const PORT = 3005;
app.listen(PORT, () => {
    console.log(`Instagram Private API Relay running on port ${PORT}`);
});
