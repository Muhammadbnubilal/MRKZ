const { readStore, writeStore, nextId } = require('../lib/store');

function asText(value, maxLength = 0) {
    if (value === undefined || value === null) return '';
    const text = String(value).trim();
    return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function pickField(body, keys) {
    for (const key of keys) {
        const value = body?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
}

function isLoggedInAdmin(req) {
    return Boolean(req.session?.admin);
}

function publicPage(req, res) {
    const store = readStore();

    res.render('index', {
        initialData: {
            settings: store.settings,
            programs: store.programs,
            progressOptions: store.progressOptions,
            notices: store.notices,
            events: store.events,
            admissions: store.admissions,
            acceptedRoster: store.acceptedRoster,
            messages: store.messages,
            adminUsername: store.admin.username
        },
        isAdmin: isLoggedInAdmin(req),
        csrfToken: req.csrfToken()
    });
}

function publicData(req, res) {
    const store = readStore();

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
        isAdmin: isLoggedInAdmin(req),
        adminUsername: store.admin.username
    });
}

function submitContact(req, res) {
    const name = pickField(req.body, ['name', 'msgName', 'fullName']);
    const email = pickField(req.body, ['email', 'msgEmail']);
    const phone = pickField(req.body, ['phone', 'msgPhone', 'phoneNumber']);
    const body = pickField(req.body, ['body', 'msgBody', 'message']);

    if (!name || !email || !phone || !body) {
        return res.status(400).json({ ok: false, message: 'All message fields are required.' });
    }

    const store = readStore();
    store.messages.unshift({
        id: nextId(store.messages),
        name: asText(name, 120),
        email: asText(email, 160),
        phone: asText(phone, 40),
        body: asText(body, 2000)
    });

    writeStore(store);
    res.json({ ok: true });
}

function submitAdmission(req, res) {
    const name = pickField(req.body, ['name', 'appStudentName', 'studentName', 'fullName']);
    const dob = pickField(req.body, ['dob', 'appStudentDob', 'dateOfBirth']);
    const guardian = pickField(req.body, ['guardian', 'appGuardianName', 'guardianName', 'parentName']);
    const phone = pickField(req.body, ['phone', 'appPhoneNumber', 'phoneNumber']);
    const address = pickField(req.body, ['address', 'appAddress', 'residentialAddress']);
    const program = pickField(req.body, ['program', 'appProgram', 'studyProgram']);
    const progress = pickField(req.body, ['progress', 'appProgress', 'currentProgress', 'status']);

    if (!name || !dob || !guardian || !phone || !address || !program || !progress) {
        return res.status(400).json({
            ok: false,
            message: 'All application fields are required.'
        });
    }

    const store = readStore();
    store.admissions.unshift({
        id: nextId(store.admissions),
        name: asText(name, 120),
        dob: asText(dob, 20),
        guardian: asText(guardian, 120),
        phone: asText(phone, 40),
        address: asText(address, 500),
        program: asText(program, 160),
        progress: asText(progress, 160),
        status: 'pending'
    });

    writeStore(store);
    res.json({ ok: true });
}

module.exports = {
    publicPage,
    publicData,
    submitContact,
    submitAdmission
};