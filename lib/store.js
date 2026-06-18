const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_PATH = path.join(__dirname, '..', 'data', 'site-data.json');
const SETTINGS_HISTORY_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function defaultData() {
    return {
        admin: { username: 'admin', salt: null, hash: null, iterations: 150000 },
        settings: {
            address: 'Karikkankulam, Karaparamba, Kozhikode, Kerala, India',
            phone: '+91 495 237 0000',
            email: 'office@markazhanbal.org',
            studentsCount: '500',
            teachersCount: '25',
            heroTitle: "Learn the Holy Qur'an & Islamic Studies",
            heroSubtitle: 'Welcome to Markaz Imam Ahmad bin Hanbal',
            heroDesc: 'A peaceful environment dedicated to studying sacred knowledge, correct recitation, and beautiful character.',
            admissionMode: 'active'
        },
        settingsHistory: [],
        programs: [
            "Qur'an & Tajweed Course",
            'Hifz Academy (Memorization)',
            'Islamic Studies Core',
            'Arabic Language Basics'
        ],
        progressOptions: [
            'Beginner (learning letters)',
            'Reading smoothly from book',
            'Partially Memorized (Some Juz)'
        ],
        admissions: [],
        acceptedRoster: [],
        messages: [],
        notices: [],
        events: []
    };
}

function ensureStore() {
    if (!fs.existsSync(DATA_PATH)) {
        const bootstrap = defaultData();
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify(bootstrap, null, 2));
        bootstrapAdminPassword(bootstrap, 'admin123');
        fs.writeFileSync(DATA_PATH, JSON.stringify(bootstrap, null, 2));
        return;
    }

    const store = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

    let changed = false;

    if (!store.admin) {
        store.admin = { username: 'admin', salt: null, hash: null, iterations: 150000 };
        changed = true;
    } else {
        if (typeof store.admin.username !== 'string') {
            store.admin.username = 'admin';
            changed = true;
        }
        if (!store.admin.iterations) {
            store.admin.iterations = 150000;
            changed = true;
        }
    }

    if (!store.settings) {
        store.settings = defaultData().settings;
        changed = true;
    } else {
        const fallback = defaultData().settings;
        for (const key of Object.keys(fallback)) {
            if (store.settings[key] === undefined) {
                store.settings[key] = fallback[key];
                changed = true;
            }
        }
    }

    if (!Array.isArray(store.settingsHistory)) {
        store.settingsHistory = [];
        changed = true;
    }

    if (!Array.isArray(store.programs)) {
        store.programs = defaultData().programs;
        changed = true;
    }

    if (!Array.isArray(store.progressOptions)) {
        store.progressOptions = defaultData().progressOptions;
        changed = true;
    }

    if (!Array.isArray(store.admissions)) {
        store.admissions = [];
        changed = true;
    }

    if (!Array.isArray(store.acceptedRoster)) {
        store.acceptedRoster = [];
        changed = true;
    }

    if (!Array.isArray(store.messages)) {
        store.messages = [];
        changed = true;
    }

    if (!Array.isArray(store.notices)) {
        store.notices = [];
        changed = true;
    }

    if (!Array.isArray(store.events)) {
        store.events = [];
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
    }
}

function readStore() {
    ensureStore();
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function writeStore(store) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
}

function pbkdf2Hash(password, salt, iterations = 150000) {
    return crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
}

function bootstrapAdminPassword(store, password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = pbkdf2Hash(password, salt, store.admin.iterations || 150000);
    store.admin.salt = salt;
    store.admin.hash = hash;
}

function verifyAdminPassword(store, password) {
    if (!store?.admin?.salt || !store?.admin?.hash) return false;

    const hash = pbkdf2Hash(password, store.admin.salt, store.admin.iterations || 150000);

    try {
        return crypto.timingSafeEqual(
            Buffer.from(hash, 'hex'),
            Buffer.from(store.admin.hash, 'hex')
        );
    } catch {
        return false;
    }
}

function setAdminCredentials(store, username, password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = pbkdf2Hash(password, salt, store.admin.iterations || 150000);
    store.admin.username = username;
    store.admin.salt = salt;
    store.admin.hash = hash;
}

function nextId(items) {
    return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function pruneSettingsHistory(history) {
    const now = Date.now();
    return (Array.isArray(history) ? history : []).filter(entry =>
        entry &&
        typeof entry.timestamp === 'number' &&
        now - entry.timestamp <= SETTINGS_HISTORY_MAX_AGE_MS &&
        entry.settings &&
        typeof entry.settings === 'object'
    );
}

module.exports = {
    readStore,
    writeStore,
    bootstrapAdminPassword,
    verifyAdminPassword,
    setAdminCredentials,
    nextId,
    pruneSettingsHistory,
    SETTINGS_HISTORY_MAX_AGE_MS
};