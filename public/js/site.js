(() => {
    const state = {
        settings: window.__INITIAL_DATA__?.settings || {},
        programs: window.__INITIAL_DATA__?.programs || [],
        progressOptions: window.__INITIAL_DATA__?.progressOptions || [],
        notices: window.__INITIAL_DATA__?.notices || [],
        events: window.__INITIAL_DATA__?.events || [],
        admissions: window.__INITIAL_DATA__?.admissions || [],
        acceptedRoster: window.__INITIAL_DATA__?.acceptedRoster || [],
        messages: window.__INITIAL_DATA__?.messages || [],
        adminUsername: window.__INITIAL_DATA__?.adminUsername || 'admin',
        isAdmin: Boolean(window.__IS_ADMIN__),
        canUndoSettings: Boolean(window.__INITIAL_DATA__?.canUndoSettings)
    };

    const localHeroImages = ["/building.jpg", "/masjid.jpg", "/classroom.jpg"];
    let activeHeroSlidePointer = 0;

    const escapeHTML = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    function csrfHeaders(extra = {}) {
        return {
            'Content-Type': 'application/json',
            'csrf-token': window.__CSRF_TOKEN__ || '',
            'x-csrf-token': window.__CSRF_TOKEN__ || '',
            'X-CSRF-Token': window.__CSRF_TOKEN__ || '',
            ...extra
        };
    }

    async function api(url, options = {}) {
        const { headers: extraHeaders = {}, ...rest } = options;
        const res = await fetch(url, {
            credentials: 'same-origin',
            ...rest,
            headers: csrfHeaders(extraHeaders)
        });

        let payload = null;
        try {
            payload = await res.json();
        } catch {
            payload = null;
        }

        if (!res.ok) {
            throw new Error(payload?.message || `Request failed (${res.status})`);
        }
        return payload;
    }

    function updateUndoButtonState() {
        const btn = document.getElementById("undoSettingsBtn");
        if (btn) btn.disabled = !state.canUndoSettings;
    }

    function syncInitialData(payload) {
        state.settings = payload.settings || state.settings;
        state.programs = payload.programs || state.programs;
        state.progressOptions = payload.progressOptions || state.progressOptions;
        state.notices = payload.notices || state.notices;
        state.events = payload.events || state.events;
        state.admissions = payload.admissions || state.admissions;
        state.acceptedRoster = payload.acceptedRoster || state.acceptedRoster;
        state.messages = payload.messages || state.messages;
        state.adminUsername = payload.adminUsername || state.adminUsername;
        state.isAdmin = Boolean(payload.isAdmin ?? state.isAdmin);
        state.canUndoSettings = Boolean(payload.canUndoSettings ?? state.canUndoSettings);
    }

    function renderSelectOptions() {
        const appProgramSelect = document.getElementById("appProgram");
        const appProgressSelect = document.getElementById("appProgress");

        if (appProgramSelect) {
            appProgramSelect.innerHTML = state.programs
                .map(p => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`)
                .join('');
        }

        if (appProgressSelect) {
            appProgressSelect.innerHTML = state.progressOptions
                .map(p => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`)
                .join('');
        }
    }

    function renderPublicContent() {
        const publicNoticeUl = document.getElementById("publicNoticeList");
        const publicEventUl = document.getElementById("publicEventList");
        const publicAddressText = document.getElementById("publicAddressText");
        const footerAddress = document.querySelector(".footer-address-view");
        const publicPhoneText = document.getElementById("publicPhoneText");
        const publicEmailText = document.getElementById("publicEmailText");

        if (publicAddressText) publicAddressText.textContent = state.settings.address || '';
        if (footerAddress) footerAddress.textContent = state.settings.address || '';
        if (document.getElementById("heroTitle")) document.getElementById("heroTitle").textContent = state.settings.heroTitle || '';
        if (document.getElementById("heroSubtitle")) document.getElementById("heroSubtitle").textContent = state.settings.heroSubtitle || '';
        if (document.getElementById("heroDesc")) document.getElementById("heroDesc").textContent = state.settings.heroDesc || '';
        if (publicPhoneText) publicPhoneText.textContent = state.settings.phone || '';
        if (publicEmailText) publicEmailText.textContent = state.settings.email || '';

        if (publicNoticeUl) {
            publicNoticeUl.innerHTML = state.notices.length
                ? state.notices.map(notice => `<li class="border-b border-gray-50 pb-2"><span class="text-gold-600 block font-semibold font-mono">${escapeHTML(notice.date)}</span> ${escapeHTML(notice.text)}</li>`).join('')
                : '<li class="text-gray-400 italic">No notices yet.</li>';
        }

        if (publicEventUl) {
            publicEventUl.innerHTML = state.events.length
                ? state.events.map(evt => `<li class="border-b border-gray-50 pb-2"><span class="text-emerald-900 font-bold block mb-0.5">${escapeHTML(evt.title)}</span> ${escapeHTML(evt.desc)}</li>`).join('')
                : '<li class="text-gray-400 italic">No events yet.</li>';
        }
    }

    function renderAdminTables() {
        const admissionsBody = document.getElementById("adminAdmissionsTableBody");
        const acceptedBody = document.getElementById("adminAcceptedTableBody");
        const messagesBody = document.getElementById("adminMessagesTableBody");
        const noticesBody = document.getElementById("adminNoticesTableBody");
        const eventsBody = document.getElementById("adminEventsTableBody");

        if (admissionsBody) {
            admissionsBody.innerHTML = state.admissions.length
                ? state.admissions.map(app => {
                    const isPending = app.status === "pending";

                    const actionMarkup = isPending
                        ? `<div class="flex items-center justify-center gap-2">
                        <button onclick="processApplicationAction(${Number(app.id)}, 'accept')" class="px-2.5 py-1 bg-emerald-800 text-white font-medium rounded hover:bg-emerald-900 transition flex items-center gap-1"><i class="fas fa-check"></i> Accept</button>
                        <button onclick="processApplicationAction(${Number(app.id)}, 'reject')" class="px-2.5 py-1 bg-red-50 text-red-700 font-medium border border-red-200 rounded hover:bg-red-100 transition flex items-center gap-1"><i class="fas fa-times"></i> Reject</button>
                   </div>`
                        : `<div class="flex flex-col items-center gap-2">
                        <span class="bg-amber-100 text-amber-800 font-semibold px-2 py-1 rounded text-[10px] tracking-wide inline-block">
                            <i class="fas fa-clock mr-1"></i> ${escapeHTML(String(app.status || 'UNKNOWN').toUpperCase())}
                        </span>
                        <button onclick="deleteApplicationRecord(${Number(app.id)})" class="px-2.5 py-1 bg-red-600 text-white font-medium rounded hover:bg-red-700 transition flex items-center gap-1">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                   </div>`;

                    return `<tr class="hover:bg-slate-50 transition">
                <td class="py-3 font-semibold text-emerald-950">${escapeHTML(app.name)}</td>
                <td class="py-3">${escapeHTML(app.guardian)}</td>
                <td class="py-3 font-mono text-gray-500">${escapeHTML(app.phone)}</td>
                <td class="py-3">
                    <span class="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium block w-max mb-1">${escapeHTML(app.program)}</span>
                    <span class="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-medium inline-block">
                        Progress: ${escapeHTML(app.progress || 'N/A')}
                    </span>
                </td>
                <td class="py-3 text-center">${actionMarkup}</td>
            </tr>`;
                }).join('')
                : `<tr><td colspan="5" class="py-4 text-center text-gray-400 italic">No incoming applications inside current storage buffer.</td></tr>`;
        }

        if (acceptedBody) {
            acceptedBody.innerHTML = state.acceptedRoster.length
                ? state.acceptedRoster.map(student => `<tr>
                <td class="p-2.5 font-medium text-emerald-900">${escapeHTML(student.name)}</td>
                <td class="p-2.5">${escapeHTML(student.guardian)}</td>
                <td class="p-2.5">${escapeHTML(student.program)}</td>
                <td class="p-2.5 text-center">
                    <span class="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px] inline-block">
                        <i class="fas fa-check-circle mr-1"></i>ENROLLED
                    </span>
                    <div class="mt-2">
                        <button onclick="deleteApplicationRecord(${Number(student.id)})" class="px-2.5 py-1 bg-red-600 text-white font-medium rounded hover:bg-red-700 transition flex items-center gap-1 mx-auto">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>`).join('')
                : `<tr><td colspan="4" class="p-3 text-center text-gray-400 italic">No students currently enrolled.</td></tr>`;
        }

        if (messagesBody) {
            messagesBody.innerHTML = state.messages.length
                ? state.messages.map(msg => `<tr class="hover:bg-slate-50 transition">
                        <td class="p-2 font-semibold text-emerald-950">${escapeHTML(msg.name)}</td>
                        <td class="p-2">${escapeHTML(msg.email)}</td>
                        <td class="p-2 font-mono">${escapeHTML(msg.phone)}</td>
                        <td class="p-2 max-w-xs break-words">${escapeHTML(msg.body)}</td>
                        <td class="p-2 text-center"><button onclick="deleteMessageRecord(${Number(msg.id)})" class="text-red-600 hover:underline"><i class="fas fa-trash-alt"></i> Delete</button></td>
                    </tr>`).join('')
                : `<tr><td colspan="5" class="py-4 text-center text-gray-400 italic">No incoming messages inside inbox database.</td></tr>`;
        }

        if (noticesBody) {
            noticesBody.innerHTML = state.notices.length
                ? state.notices.map(notice => `<tr><td class="p-2 font-mono">${escapeHTML(notice.date)}</td><td class="p-2">${escapeHTML(notice.text)}</td><td class="p-2 text-center"><button onclick="deleteNoticeRecord(${Number(notice.id)})" class="text-red-600 hover:underline"><i class="fas fa-trash-alt"></i></button></td></tr>`).join('')
                : `<tr><td colspan="3" class="py-4 text-center text-gray-400 italic">No notices yet.</td></tr>`;
        }

        if (eventsBody) {
            eventsBody.innerHTML = state.events.length
                ? state.events.map(evt => `<tr><td class="p-2 font-semibold">${escapeHTML(evt.title)}</td><td class="p-2">${escapeHTML(evt.desc)}</td><td class="p-2 text-center"><button onclick="deleteEventRecord(${Number(evt.id)})" class="text-red-600 hover:underline"><i class="fas fa-trash-alt"></i></button></td></tr>`).join('')
                : `<tr><td colspan="3" class="py-4 text-center text-gray-400 italic">No events yet.</td></tr>`;
        }

        const currentUsername = document.getElementById("usernameCurrentDisplay");
        const newUsername = document.getElementById("adminUserNew");
        if (currentUsername) currentUsername.value = state.adminUsername;
        if (newUsername && !newUsername.value) newUsername.value = state.adminUsername;
    }

    function updateAdmissionControlUiState() {
        const mode = document.getElementById("configAdmissionStatus")?.value || 'active';
        const elements = [
            document.getElementById("navApplyBtn"),
            document.getElementById("mobileNavApplyBtn"),
            document.getElementById("heroApplyBtn"),
            document.getElementById("ctaApplyBtn")
        ];
        const admissionSection = document.getElementById("admission");
        const navAdmissionLink = document.getElementById("navAdmissionLink");
        const mobileNavAdmissionLink = document.getElementById("mobileNavAdmissionLink");

        if (admissionSection) admissionSection.style.display = mode === "hidden" ? "none" : "block";
        if (navAdmissionLink) navAdmissionLink.style.display = mode === "hidden" ? "none" : "block";
        if (mobileNavAdmissionLink) mobileNavAdmissionLink.style.display = mode === "hidden" ? "none" : "block";

        elements.forEach(el => {
            if (!el) return;
            el.style.display = mode === "hidden" ? "none" : "block";
            if (mode === "disabled") {
                el.classList.add("bg-gray-300", "text-gray-500", "cursor-not-allowed", "opacity-60", "pointer-events-none");
                el.disabled = true;
            } else {
                el.classList.remove("bg-gray-300", "text-gray-500", "cursor-not-allowed", "opacity-60", "pointer-events-none");
                el.disabled = false;
            }
        });
    }

    function setChromeVisibility(visible) {
        const navbar = document.getElementById("mainNavbar");
        const footer = document.querySelector("footer");
        if (navbar) navbar.classList.toggle("hidden", !visible);
        if (footer) footer.classList.toggle("hidden", !visible);
    }

    async function refreshState() {
        const res = await api('/api/public-data', { method: 'GET' });
        syncInitialData(res);
        renderSelectOptions();
        renderPublicContent();
        renderAdminTables();
        updateUndoButtonState();
        updateAdmissionControlUiState();

        if (state.isAdmin) {
            showAdminDashboardView();
            await loadAdminState();
        } else {
            showPublicWebsiteView();
        }
    }

    async function loadAdminState() {
        try {
            const res = await api('/api/admin/state', { method: 'GET' });
            syncInitialData(res);
            renderAdminTables();
            updateUndoButtonState();
            updateAdmissionControlUiState();
            renderSelectOptions();
            renderPublicContent();
        } catch {
            state.isAdmin = false;
            showPublicWebsiteView();
        }
    }

    function changeHeroSlide(index) {
        activeHeroSlidePointer = index;
        const heroBg = document.getElementById("heroBgImage");
        if (!heroBg) return;

        heroBg.style.opacity = 0;
        setTimeout(() => {
            heroBg.style.backgroundImage = `url('${localHeroImages[activeHeroSlidePointer]}')`;
            heroBg.style.opacity = 0.4;
        }, 250);

        for (let i = 0; i < localHeroImages.length; i++) {
            const dot = document.getElementById(`slideDot${i}`);
            if (dot) dot.className = (i === index)
                ? "w-2.5 h-2.5 rounded-full cursor-pointer bg-white"
                : "w-2.5 h-2.5 rounded-full cursor-pointer bg-white/40";
        }
    }

    setInterval(() => {
        let next = activeHeroSlidePointer + 1;
        if (next >= localHeroImages.length) next = 0;
        changeHeroSlide(next);
    }, 6000);

    function resetViewLayers() {
        document.querySelectorAll(".view-layer").forEach(el => el.classList.add("hidden"));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function showPublicWebsiteView() {
        resetViewLayers();
        setChromeVisibility(true);
        document.getElementById("publicWebsiteView")?.classList.remove("hidden");
    }

    function showAdmissionFormView() {
        resetViewLayers();
        setChromeVisibility(false);
        document.getElementById("admissionFormView")?.classList.remove("hidden");
    }

    function showAdminLoginView() {
        window.location.href = '/backend';
    }

    function showAdminDashboardView() {
        if (!state.isAdmin) return;
        resetViewLayers();
        setChromeVisibility(false);
        document.getElementById("adminDashboardView")?.classList.remove("hidden");
    }

    function logoutAdminSession() {
        api('/auth/logout', { method: 'POST', body: '{}' })
            .finally(() => {
                state.isAdmin = false;
                window.location.href = '/';
            });
    }

    function switchAdminSubTab(tab) {
        document.querySelectorAll(".admin-panel-block").forEach(b => b.classList.add("hidden"));
        document.getElementById(`adminSubTab-${tab}`)?.classList.remove("hidden");

        const base = "w-full text-left px-4 py-3 rounded-2xl transition border border-white/10";
        const active = `${base} bg-emerald-600 text-white font-medium shadow`;
        const inactive = `${base} bg-emerald-900/65 text-white/90 hover:bg-emerald-800/80`;

        ["admissions", "messages", "notices", "events", "content"].forEach(k => {
            const btn = document.getElementById(`tabBtn-${k}`);
            if (btn) {
                btn.className = (k === tab) ? active : inactive;
            }
        });
    }

    function navigateToSection(id) {
        showPublicWebsiteView();
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50);
    }

    function toggleMobileMenu() {
        document.getElementById("mobileMenuPanel")?.classList.toggle("hidden");
    }

    async function processAdminLogin(e) {
        e.preventDefault();
        const inputUser = document.getElementById("adminUser")?.value.trim();
        const inputPass = document.getElementById("adminPass")?.value;

        try {
            await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username: inputUser, password: inputPass })
            });
            document.getElementById("adminUser").value = "";
            document.getElementById("adminPass").value = "";
            window.location.href = '/';
        } catch (err) {
            alert(err.message || 'Invalid credentials.');
        }
    }

    async function processSecurityCredentialsUpdate() {
        const currentPassword = document.getElementById("pwdCurrent")?.value || '';
        const newUsername = document.getElementById("adminUserNew")?.value.trim() || '';
        const newPassword = document.getElementById("pwdNew")?.value || '';
        const confirmPassword = document.getElementById("pwdConfirm")?.value || '';

        try {
            await api('/api/admin/credentials', {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newUsername, newPassword, confirmPassword })
            });
            alert('Security credentials updated successfully.');
            closeChangePasswordModal();
            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not update credentials.');
        }
    }

    function openChangePasswordModal() {
        const u = state.adminUsername;
        const current = document.getElementById("usernameCurrentDisplay");
        const target = document.getElementById("adminUserNew");
        if (current) current.value = u;
        if (target) target.value = u;
        document.getElementById("passwordChangeModal")?.classList.remove("hidden");
    }

    function closeChangePasswordModal() {
        document.getElementById("pwdCurrent") && (document.getElementById("pwdCurrent").value = "");
        document.getElementById("pwdNew") && (document.getElementById("pwdNew").value = "");
        document.getElementById("pwdConfirm") && (document.getElementById("pwdConfirm").value = "");
        document.getElementById("passwordChangeModal")?.classList.add("hidden");
    }

    async function processApplicationAction(id, resolution) {
        try {
            await api(`/api/admin/admissions/${id}/action`, {
                method: 'POST',
                body: JSON.stringify({ action: resolution })
            });
            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not update application.');
        }
    }

    async function deleteNoticeRecord(id) {
        try {
            await api(`/api/admin/notices/${id}`, { method: 'DELETE', body: '{}' });
            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not delete notice.');
        }
    }

    async function deleteEventRecord(id) {
        try {
            await api(`/api/admin/events/${id}`, { method: 'DELETE', body: '{}' });
            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not delete event.');
        }
    }

    async function deleteApplicationRecord(id) {
        if (!confirm("Delete this application permanently?")) return;

        try {
            await api(`/api/admin/admissions/${id}`, {
                method: 'DELETE',
                body: '{}'
            });
            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not delete application.');
        }
    }

    async function deleteApplicationRecord(id) {
        if (!confirm("Delete this application permanently?")) return;

        try {
            await api(`/api/admin/admissions/${id}`, {
                method: 'DELETE',
                body: '{}'
            });
            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not delete application.');
        }
    }

    async function createNewNoticeRecord() {
        const text = document.getElementById("newNoticeText")?.value.trim() || '';
        if (!text) return alert("Please specify notice entry details.");
        await api('/api/admin/notices', { method: 'POST', body: JSON.stringify({ text }) });
        document.getElementById("newNoticeText").value = "";
        await refreshState();
    }

    async function createNewEventRecord() {
        const title = document.getElementById("newEventTitle")?.value.trim() || '';
        const desc = document.getElementById("newEventDesc")?.value.trim() || '';
        if (!title || !desc) return alert("Missing structural fields.");
        await api('/api/admin/events', { method: 'POST', body: JSON.stringify({ title, desc }) });
        document.getElementById("newEventTitle").value = "";
        document.getElementById("newEventDesc").value = "";
        await refreshState();
    }

    async function saveGlobalWebsiteContentConfigurations() {
        const address = document.getElementById("txtInputConfigAddress")?.value || '';
        const phone = document.getElementById("txtConfigPhone")?.value || '';
        const email = document.getElementById("txtConfigEmail")?.value || '';
        const heroTitle = document.getElementById("txtConfigHeroTitle")?.value || '';
        const heroSubtitle = document.getElementById("txtConfigHeroSubtitle")?.value || '';
        const heroDesc = document.getElementById("txtConfigHeroDesc")?.value || '';
        const admissionMode = document.getElementById("configAdmissionStatus")?.value || 'active';

        const res = await api('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({
                address,
                phone,
                email,
                heroTitle,
                heroSubtitle,
                heroDesc,
                admissionMode
            })
        });

        state.canUndoSettings = Boolean(res.canUndoSettings ?? false);

        alert("Website layout changes applied accurately.");
        await refreshState();
    }

    async function saveFormOptionsConfiguration() {
        const programs = (document.getElementById("txtConfigPrograms")?.value || '').split('\n').map(x => x.trim()).filter(Boolean);
        const progressOptions = (document.getElementById("txtConfigProgress")?.value || '').split('\n').map(x => x.trim()).filter(Boolean);

        await api('/api/admin/form-options', {
            method: 'POST',
            body: JSON.stringify({ programs, progressOptions })
        });
        alert("Form dynamic lists updated successfully.");
        await refreshState();
    }

    async function submitAdmissionForm(e) {
        e.preventDefault();
        const payload = {
            name: document.getElementById("appStudentName")?.value || '',
            dob: document.getElementById("appStudentDob")?.value || '',
            guardian: document.getElementById("appGuardianName")?.value || '',
            phone: document.getElementById("appPhoneNumber")?.value || '',
            address: document.getElementById("appAddress")?.value || '',
            program: document.getElementById("appProgram")?.value || '',
            progress: document.getElementById("appProgress")?.value || ''
        };

        try {
            await api('/api/admission', { method: 'POST', body: JSON.stringify(payload) });
            document.getElementById("publicApplicationForm")?.reset();
            alert("Application data delivered beautifully!");
            showPublicWebsiteView();
            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not submit application.');
        }
    }

    async function handleInquirySubmission(e) {
        e.preventDefault();
        const payload = {
            name: document.getElementById("msgName")?.value || '',
            email: document.getElementById("msgEmail")?.value || '',
            phone: document.getElementById("msgPhone")?.value || '',
            body: document.getElementById("msgBody")?.value || ''
        };

        try {
            await api('/api/contact', { method: 'POST', body: JSON.stringify(payload) });
            alert("Message sent successfully.");
            e.target.reset();
            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not send message.');
        }
    }
    async function deleteMessageRecord(id) {
        try {
            await api(`/api/admin/messages/${id}`, {
                method: 'DELETE',
                body: '{}'
            });

            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not delete message.');
        }
    }

    async function deleteApplicationRecord(id) {
        if (!confirm("Delete this application permanently?")) return;

        try {
            await api(`/api/admin/admissions/${id}`, {
                method: 'DELETE',
                body: '{}'
            });
            await refreshState();
        } catch (err) {
            alert(err.message || 'Could not delete application.');
        }
    }

    window.changeHeroSlide = changeHeroSlide;
    window.navigateToSection = navigateToSection;
    window.toggleMobileMenu = toggleMobileMenu;
    window.showPublicWebsiteView = showPublicWebsiteView;
    window.showAdmissionFormView = showAdmissionFormView;
    window.showAdminLoginView = showAdminLoginView;
    window.showAdminDashboardView = showAdminDashboardView;
    window.logoutAdminSession = logoutAdminSession;
    window.switchAdminSubTab = switchAdminSubTab;
    window.processAdminLogin = processAdminLogin;
    window.processSecurityCredentialsUpdate = processSecurityCredentialsUpdate;
    window.processApplicationAction = processApplicationAction;
    window.deleteNoticeRecord = deleteNoticeRecord;
    window.deleteEventRecord = deleteEventRecord;
    window.deleteMessageRecord = deleteMessageRecord;
    window.deleteApplicationRecord = deleteApplicationRecord;
    window.createNewNoticeRecord = createNewNoticeRecord;
    window.createNewEventRecord = createNewEventRecord;
    window.saveGlobalWebsiteContentConfigurations = saveGlobalWebsiteContentConfigurations;
    window.saveFormOptionsConfiguration = saveFormOptionsConfiguration;
    window.submitAdmissionForm = submitAdmissionForm;
    window.handleInquirySubmission = handleInquirySubmission;
    window.openChangePasswordModal = openChangePasswordModal;
    window.closeChangePasswordModal = closeChangePasswordModal;
    window.updateAdmissionControlUiState = updateAdmissionControlUiState;

    window.addEventListener("DOMContentLoaded", async () => {
        try {
            const res = await api('/api/public-data', { method: 'GET' });
            syncInitialData(res);
        } catch {
        }

        renderSelectOptions();
        renderPublicContent();
        renderAdminTables();
        updateUndoButtonState();
        const cfgPhone = document.getElementById("txtConfigPhone");
        const cfgEmail = document.getElementById("txtConfigEmail");
        if (cfgPhone) cfgPhone.value = state.settings.phone || '';
        if (cfgEmail) cfgEmail.value = state.settings.email || '';

        const cfgPrograms = document.getElementById("txtConfigPrograms");
        const cfgProgress = document.getElementById("txtConfigProgress");
        if (cfgPrograms) cfgPrograms.value = state.programs.join('\n');
        if (cfgProgress) cfgProgress.value = state.progressOptions.join('\n');

        const admissionSelect = document.getElementById("configAdmissionStatus");
        if (admissionSelect) admissionSelect.value = state.settings.admissionMode || 'active';

        updateAdmissionControlUiState();
        document.documentElement.style.scrollBehavior = "smooth";

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add("active");
            });
        }, { threshold: 0.05 });

        document.querySelectorAll(".reveal-element").forEach(el => obs.observe(el));

        if (state.isAdmin) {
            showAdminDashboardView();
            await loadAdminState();
        } else {
            showPublicWebsiteView();
        }
    });
})();