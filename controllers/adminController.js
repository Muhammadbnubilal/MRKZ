const {
    readStore,
    writeStore,
    nextId,
    verifyAdminPassword,
    setAdminCredentials
} = require('../lib/store');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SETTINGS_HISTORY = 20;

function asText(value, maxLength = 0) {
    const text = String(value ?? '').trim();
    return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function pruneSettingsHistory(history) {
    const now = Date.now();
    return Array.isArray(history)
        ? history.filter(entry =>
            entry &&
            typeof entry.timestamp === 'number' &&
            now - entry.timestamp <= ONE_DAY_MS &&
            entry.settings &&
            typeof entry.settings === 'object'
        )
        : [];
}

function pushSettingsSnapshot(store) {
    store.settingsHistory = pruneSettingsHistory(store.settingsHistory);
    store.settingsHistory.push({
        timestamp: Date.now(),
        settings: clone(store.settings)
    });

    if (store.settingsHistory.length > MAX_SETTINGS_HISTORY) {
        store.settingsHistory.splice(0, store.settingsHistory.length - MAX_SETTINGS_HISTORY);
    }
}

function findApplicationLocation(store, id) {
    const admissionsIndex = store.admissions.findIndex(a => Number(a.id) === id);
    if (admissionsIndex !== -1) {
        return { list: 'admissions', index: admissionsIndex, item: store.admissions[admissionsIndex] };
    }

    const acceptedIndex = store.acceptedRoster.findIndex(a => Number(a.id) === id);
    if (acceptedIndex !== -1) {
        return { list: 'acceptedRoster', index: acceptedIndex, item: store.acceptedRoster[acceptedIndex] };
    }

    return null;
}

function adminState(req, res) {
    const store = readStore();
    const history = pruneSettingsHistory(store.settingsHistory);

    res.json({
        ok: true,
        settings: store.settings,
        programs: store.programs,
        progressOptions: store.progressOptions,
        notices: store.notices,
        events: store.events,
        admissions: store.admissions,
        acceptedRoster: store.acceptedRoster,
        messages: store.messages,
        adminUsername: store.admin.username,
        canUndoSettings: history.length > 0,
        lastSettingsChangeAt: history.length ? history[history.length - 1].timestamp : null
    });
}

function login(req, res) {
    const username = asText(req.body?.username);
    const password = asText(req.body?.password);

    if (!username || !password) {
        return res.status(400).json({ ok: false, message: 'Username and password are required.' });
    }

    const store = readStore();
    const ok = username === store.admin.username && verifyAdminPassword(store, password);

    if (!ok) {
        return res.status(401).json({ ok: false, message: 'Invalid credentials.' });
    }

    req.session.regenerate((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ ok: false, message: 'Could not start session.' });
        }

        req.session.admin = { username: store.admin.username };
        res.json({ ok: true });
    });
}

function logout(req, res) {
    if (!req.session) {
        return res.json({ ok: true });
    }

    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ ok: true });
    });
}

function updateCredentials(req, res) {
    const currentPassword = asText(req.body?.currentPassword);
    const newUsername = asText(req.body?.newUsername);
    const newPassword = asText(req.body?.newPassword);
    const confirmPassword = asText(req.body?.confirmPassword);

    if (!currentPassword || !newUsername) {
        return res.status(400).json({
            ok: false,
            message: 'Current password and new username are required.'
        });
    }

    const store = readStore();

    if (!verifyAdminPassword(store, currentPassword)) {
        return res.status(403).json({ ok: false, message: 'Current password is incorrect.' });
    }

    if (newPassword.length > 0) {
        if (newPassword.length < 8) {
            return res.status(400).json({ ok: false, message: 'New password must be at least 8 characters.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ ok: false, message: 'Password confirmation does not match.' });
        }
        setAdminCredentials(store, newUsername, newPassword);
    } else {
        store.admin.username = newUsername;
    }

    writeStore(store);

    if (req.session) {
        req.session.admin = { username: store.admin.username };
    }

    res.json({
        ok: true,
        adminUsername: store.admin.username
    });
}

function saveSettings(req, res) {
    const address = asText(req.body?.address, 250);
    const phone = asText(req.body?.phone, 50);
    const email = asText(req.body?.email, 120);
    const heroTitle = asText(req.body?.heroTitle, 180);
    const heroSubtitle = asText(req.body?.heroSubtitle, 180);
    const heroDesc = asText(req.body?.heroDesc, 300);
    const admissionMode = asText(req.body?.admissionMode);

    const store = readStore();

    pushSettingsSnapshot(store);

    if (address) store.settings.address = address;
    if (phone) store.settings.phone = phone;
    if (email) store.settings.email = email;
    if (heroTitle) store.settings.heroTitle = heroTitle;
    if (heroSubtitle) store.settings.heroSubtitle = heroSubtitle;
    if (heroDesc) store.settings.heroDesc = heroDesc;
    if (['active', 'disabled', 'hidden'].includes(admissionMode)) {
        store.settings.admissionMode = admissionMode;
    }

    store.settingsHistory = pruneSettingsHistory(store.settingsHistory);
    writeStore(store);

    res.json({
        ok: true,
        canUndoSettings: store.settingsHistory.length > 0
    });
}

function undoSettings(req, res) {
    const store = readStore();
    store.settingsHistory = pruneSettingsHistory(store.settingsHistory);

    if (!store.settingsHistory.length) {
        return res.status(404).json({ ok: false, message: 'No saved changes available to undo.' });
    }

    const lastSnapshot = store.settingsHistory.pop();
    store.settings = lastSnapshot.settings;
    writeStore(store);

    res.json({
        ok: true,
        settings: store.settings,
        canUndoSettings: store.settingsHistory.length > 0
    });
}

function saveFormOptions(req, res) {
    const programs = Array.isArray(req.body?.programs) ? req.body.programs : [];
    const progressOptions = Array.isArray(req.body?.progressOptions) ? req.body.progressOptions : [];

    const store = readStore();
    store.programs = programs.map(item => asText(item, 160)).filter(Boolean);
    store.progressOptions = progressOptions.map(item => asText(item, 160)).filter(Boolean);

    writeStore(store);
    res.json({ ok: true });
}

function addNotice(req, res) {
    const text = asText(req.body?.text, 500);
    if (!text) {
        return res.status(400).json({ ok: false, message: 'Notice text is required.' });
    }

    const store = readStore();
    store.notices.unshift({
        id: nextId(store.notices),
        date: new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: '2-digit',
            year: 'numeric'
        }),
        text
    });

    writeStore(store);
    res.json({ ok: true });
}

function deleteNotice(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid notice id.' });
    }

    const store = readStore();
    const before = store.notices.length;
    store.notices = store.notices.filter(n => Number(n.id) !== id);

    if (store.notices.length === before) {
        return res.status(404).json({ ok: false, message: 'Notice not found.' });
    }

    writeStore(store);
    res.json({ ok: true });
}

function addEvent(req, res) {
    const title = asText(req.body?.title, 120);
    const desc = asText(req.body?.desc, 500);

    if (!title || !desc) {
        return res.status(400).json({ ok: false, message: 'Title and description are required.' });
    }

    const store = readStore();
    store.events.unshift({
        id: nextId(store.events),
        title,
        desc
    });

    writeStore(store);
    res.json({ ok: true });
}

function deleteEvent(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid event id.' });
    }

    const store = readStore();
    const before = store.events.length;
    store.events = store.events.filter(e => Number(e.id) !== id);

    if (store.events.length === before) {
        return res.status(404).json({ ok: false, message: 'Event not found.' });
    }

    writeStore(store);
    res.json({ ok: true });
}

function applicationAction(req, res) {
    const id = Number(req.params.id);
    const action = asText(req.body?.action);

    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid application id.' });
    }

    const store = readStore();
    const idx = store.admissions.findIndex(a => Number(a.id) === id);

    if (idx === -1) {
        return res.status(404).json({ ok: false, message: 'Application not found.' });
    }

    if (action === 'accept') {
        const app = store.admissions.splice(idx, 1)[0];
        app.status = 'accepted';
        store.acceptedRoster.unshift(app);
    } else if (action === 'reject') {
        store.admissions[idx].status = 'rejected';
    } else {
        return res.status(400).json({ ok: false, message: 'Invalid action.' });
    }

    writeStore(store);
    res.json({ ok: true });
}

function deleteApplication(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid application id.' });
    }

    const store = readStore();
    const found = findApplicationLocation(store, id);

    if (!found) {
        return res.status(404).json({ ok: false, message: 'Application not found.' });
    }



    if (found.list === 'admissions') {
        store.admissions.splice(found.index, 1);
    } else if (found.list === 'acceptedRoster') {
        store.acceptedRoster.splice(found.index, 1);
    }

    writeStore(store);
    res.json({ ok: true });
}

function deleteApplication(req, res) {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid application id.' });
    }

    const store = readStore();
    const found = findApplicationLocation(store, id);

    if (!found) {
        return res.status(404).json({ ok: false, message: 'Application not found.' });
    }

    if (found.list === 'admissions') {
        store.admissions.splice(found.index, 1);
    } else if (found.list === 'acceptedRoster') {
        store.acceptedRoster.splice(found.index, 1);
    }

    writeStore(store);
    res.json({ ok: true });
}

function deleteMessage(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid message id.' });
    }

    const store = readStore();
    const before = store.messages.length;
    store.messages = store.messages.filter(m => Number(m.id) !== id);

    if (store.messages.length === before) {
        return res.status(404).json({ ok: false, message: 'Message not found.' });
    }

    writeStore(store);
    res.json({ ok: true });
}

module.exports = {
    adminState,
    login,
    logout,
    updateCredentials,
    saveSettings,
    undoSettings,
    saveFormOptions,
    addNotice,
    deleteNotice,
    addEvent,
    deleteEvent,
    applicationAction,
    deleteApplication,
    deleteMessage
};