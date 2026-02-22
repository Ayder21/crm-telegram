require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.RELAY_API_KEY || 'sellio-secret-relay-key-2026';

function authenticate(req, res, next) {
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

/**
 * Build a cookie string from either:
 *  - cookiesJson: array of { name, value } objects (from EditThisCookie or similar)
 *  - sessionid: raw sessionid string
 */
function buildCookieString(sessionid, cookiesJson) {
    if (cookiesJson && Array.isArray(cookiesJson) && cookiesJson.length > 0) {
        return cookiesJson.map(c => `${c.name}=${c.value}`).join('; ');
    }
    if (sessionid) {
        return `sessionid=${sessionid}`;
    }
    return null;
}

function getCsrfToken(sessionid, cookiesJson) {
    if (cookiesJson && Array.isArray(cookiesJson)) {
        const csrf = cookiesJson.find(c => c.name === 'csrftoken');
        if (csrf) return csrf.value;
    }
    // Try to extract from sessionid (it won't work but avoids undefined)
    return 'missing';
}

function webHeaders(cookieStr, csrfToken, referer) {
    return {
        'cookie': cookieStr,
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'x-ig-app-id': '936619743392459',
        'x-csrftoken': csrfToken,
        'x-requested-with': 'XMLHttpRequest',
        'origin': 'https://www.instagram.com',
        'referer': referer || 'https://www.instagram.com/direct/inbox/',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
    };
}

// ── GET INBOX ─────────────────────────────────────────────────────────────────
app.post('/api/ig/check_messages', authenticate, async (req, res) => {
    try {
        const { sessionid, cookiesJson } = req.body;
        const cookieStr = buildCookieString(sessionid, cookiesJson);
        if (!cookieStr) return res.status(400).json({ error: 'Missing auth' });

        const csrfToken = getCsrfToken(sessionid, cookiesJson);

        const igRes = await fetch(
            'https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true&folder=&limit=20&thread_message_limit=10',
            { headers: webHeaders(cookieStr, csrfToken, null) }
        );

        const body = await igRes.text();
        if (!igRes.ok) {
            console.error('[check_messages] IG status:', igRes.status, body.substring(0, 200));
            return res.status(500).json({ success: false, error: `IG ${igRes.status}: ${body.substring(0, 200)}` });
        }

        const data = JSON.parse(body);

        // Extract own user id from cookies
        let myUserId = null;
        if (cookiesJson && Array.isArray(cookiesJson)) {
            const dsUser = cookiesJson.find(c => c.name === 'ds_user_id');
            if (dsUser) myUserId = dsUser.value;
        }
        if (!myUserId && sessionid) {
            const decoded = sessionid.includes('%3A') ? decodeURIComponent(sessionid) : sessionid;
            myUserId = decoded.split(':')[0];
        }

        console.log(`[check_messages] OK — ${data.inbox?.threads?.length ?? 0} threads, myUserId=${myUserId}`);
        res.json({ success: true, threads: data.inbox?.threads || [], myUserId });
    } catch (e) {
        console.error('[check_messages]', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── SEND MESSAGE ───────────────────────────────────────────────────────────────
app.post('/api/ig/send_message', authenticate, async (req, res) => {
    try {
        const { sessionid, cookiesJson, threadId, text } = req.body;
        if (!threadId || !text) return res.status(400).json({ error: 'Missing threadId or text' });

        const cookieStr = buildCookieString(sessionid, cookiesJson);
        if (!cookieStr) return res.status(400).json({ error: 'Missing auth' });

        const csrfToken = getCsrfToken(sessionid, cookiesJson);
        const clientContext = Date.now().toString() + Math.floor(Math.random() * 1e6).toString();

        const body = new URLSearchParams({
            client_context: clientContext,
            mutation_token: clientContext,
            offline_threading_id: clientContext,
            text,
            action: 'send_item',
        });

        // Instagram thread-specific broadcast endpoint (correct for web)
        const igRes = await fetch(
            `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/broadcast/text/`,
            {
                method: 'POST',
                headers: {
                    ...webHeaders(cookieStr, csrfToken, `https://www.instagram.com/direct/t/${threadId}/`),
                    'content-type': 'application/x-www-form-urlencoded',
                    'x-instagram-ajax': '1',
                    'x-ig-www-claim': '0',
                },
                body: body.toString(),
                redirect: 'manual',
            }
        );

        const responseText = await igRes.text();
        console.log('[send_message] IG status:', igRes.status, responseText.substring(0, 200));

        if (igRes.status === 302 || igRes.status === 301) {
            return res.status(500).json({ success: false, error: `Redirect — session may be invalid or expired. Status: ${igRes.status}` });
        }
        if (!igRes.ok) {
            return res.status(500).json({ success: false, error: `IG ${igRes.status}: ${responseText.substring(0, 200)}` });
        }

        res.json({ success: true });
    } catch (e) {
        console.error('[send_message]', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── HEALTH ─────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`ig-relay running on port ${PORT}`));
