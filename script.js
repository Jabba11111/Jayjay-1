// ===== Navbar scroll state =====
const navbar = document.getElementById('navbar');
const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ===== Mobile menu =====
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ===== Menu tabs =====
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.menu-panel');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector(`.menu-panel[data-panel="${target}"]`).classList.add('active');
    });
});

// ===== Scroll reveal =====
const revealTargets = document.querySelectorAll(
    '.about-grid, .section-header, .menu-panel.active .menu-item, .gallery-item, .reserve-grid, .contact-block, blockquote'
);
revealTargets.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ===== Footer year =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Parallax hero =====
const heroBg = document.querySelector('.hero-bg');
window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight && heroBg) {
        heroBg.style.transform = `translateY(${y * 0.3}px) scale(${1 + y * 0.0005})`;
    }
}, { passive: true });

/* ============================================================
   RESERVATION SYSTEM
   ============================================================ */

// Opening hours per weekday (0 = Sunday, 1 = Monday ...)
// null = closed. Times in 24h HH:MM, last slot is last seating
// (we stop 60 min before actual closing so guests can enjoy their dinner).
const OPENING_HOURS = {
    0: { open: '17:00', lastSeating: '21:30' }, // Zondag
    1: null,                                     // Maandag gesloten
    2: { open: '17:00', lastSeating: '21:30' }, // Dinsdag
    3: { open: '17:00', lastSeating: '21:30' }, // Woensdag
    4: { open: '17:00', lastSeating: '21:30' }, // Donderdag
    5: { open: '17:00', lastSeating: '21:30' }, // Vrijdag
    6: { open: '17:00', lastSeating: '21:30' }, // Zaterdag
};

const WEEKDAYS_NL = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
const MONTHS_NL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

const RESTAURANT = {
    name: 'Restaurant Plato',
    email: 'reserveren@plato.nl',
    phone: '020 123 45 67',
    address: 'Olympusplein 12, 1076 AB Amsterdam',
};

const STORAGE_KEY = 'plato_reservations';

// ===== DOM =====
const form = document.getElementById('reserveForm');
const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');
const dateHint = document.getElementById('dateHint');
const toast = document.getElementById('toast');
const modal = document.getElementById('confirmModal');
const modalDetails = document.getElementById('modalDetails');
const modalCode = document.getElementById('modalCode');
const mailtoLink = document.getElementById('mailtoLink');
const icsBtn = document.getElementById('icsDownload');

// ===== Helpers =====
const pad = (n) => String(n).padStart(2, '0');
const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};
dateInput.min = todayISO();

// Build time slots every 30 minutes between open and lastSeating inclusive.
function buildSlots(hours) {
    const [oH, oM] = hours.open.split(':').map(Number);
    const [cH, cM] = hours.lastSeating.split(':').map(Number);
    const slots = [];
    let h = oH, m = oM;
    while (h < cH || (h === cH && m <= cM)) {
        slots.push(`${pad(h)}:${pad(m)}`);
        m += 30;
        if (m >= 60) { m -= 60; h += 1; }
    }
    return slots;
}

function parseISODate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatDateNL(iso) {
    const d = parseISODate(iso);
    return `${WEEKDAYS_NL[d.getDay()]} ${d.getDate()} ${MONTHS_NL[d.getMonth()]} ${d.getFullYear()}`;
}

function showToast(message, isError = false) {
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== Dynamic time slots based on date =====
function updateTimeSlots() {
    const iso = dateInput.value;
    timeSelect.innerHTML = '';
    if (!iso) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">Kies datum</option>';
        dateHint.textContent = '';
        return;
    }
    const day = parseISODate(iso).getDay();
    const hours = OPENING_HOURS[day];

    if (!hours) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">Gesloten</option>';
        dateHint.textContent = `Wij zijn op ${WEEKDAYS_NL[day]} gesloten. Kies een andere datum.`;
        return;
    }

    const slots = buildSlots(hours);
    const now = new Date();
    const isToday = iso === todayISO();

    timeSelect.disabled = false;
    timeSelect.innerHTML = '<option value="">Kies een tijd</option>';

    let availableCount = 0;
    slots.forEach(slot => {
        const [h, m] = slot.split(':').map(Number);
        let disabled = false;
        if (isToday) {
            const slotDate = new Date();
            slotDate.setHours(h, m, 0, 0);
            if (slotDate.getTime() - now.getTime() < 60 * 60 * 1000) disabled = true;
        }
        const opt = document.createElement('option');
        opt.value = slot;
        opt.textContent = slot;
        opt.disabled = disabled;
        if (!disabled) availableCount++;
        timeSelect.appendChild(opt);
    });

    dateHint.textContent = availableCount
        ? `Geopend tot 22:30 — laatste zitplaats om ${hours.lastSeating}.`
        : 'Geen plek meer voor vandaag — kies een andere datum.';
}
dateInput.addEventListener('change', updateTimeSlots);

// ===== Validation =====
function setError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errEl = document.querySelector(`.field-error[data-for="${fieldId}"]`);
    if (message) {
        field.classList.add('invalid');
        errEl.textContent = message;
        errEl.classList.add('show');
    } else {
        field.classList.remove('invalid');
        errEl.textContent = '';
        errEl.classList.remove('show');
    }
}

function validateForm(data) {
    let ok = true;
    ['name','phone','email','date','time','guests'].forEach(f => setError(f, ''));

    if (data.name.length < 2) { setError('name', 'Vul uw naam in.'); ok = false; }
    if (!/^[0-9+\s\-()]{7,}$/.test(data.phone)) { setError('phone', 'Geldig telefoonnummer vereist.'); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { setError('email', 'Geldig e-mailadres vereist.'); ok = false; }
    if (!data.date) {
        setError('date', 'Kies een datum.'); ok = false;
    } else if (data.date < todayISO()) {
        setError('date', 'Datum ligt in het verleden.'); ok = false;
    } else {
        const day = parseISODate(data.date).getDay();
        if (!OPENING_HOURS[day]) { setError('date', 'Wij zijn deze dag gesloten.'); ok = false; }
    }
    if (!data.time) { setError('time', 'Kies een tijd.'); ok = false; }
    if (!data.guests) { setError('guests', 'Aantal personen?'); ok = false; }
    return ok;
}

// ===== Storage =====
function loadReservations() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}
function saveReservation(res) {
    const all = loadReservations();
    all.push(res);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `PL-${code}`;
}

// ===== ICS (calendar) =====
function toICSDate(iso, time) {
    return `${iso.replace(/-/g, '')}T${time.replace(':', '')}00`;
}
function addHours(iso, time, hoursToAdd) {
    const d = parseISODate(iso);
    const [h, m] = time.split(':').map(Number);
    d.setHours(h + hoursToAdd, m, 0, 0);
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}
function buildICS(res) {
    const dtStart = toICSDate(res.date, res.time);
    const dtEnd = addHours(res.date, res.time, 2);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Restaurant Plato//Reservering//NL',
        'BEGIN:VEVENT',
        `UID:${res.code}@plato.nl`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:Reservering ${RESTAURANT.name} (${res.guests} pers.)`,
        `DESCRIPTION:Reserveringscode ${res.code}\\nNaam: ${res.name}\\nTelefoon: ${res.phone}${res.message ? '\\nOpmerking: ' + res.message : ''}`,
        `LOCATION:${RESTAURANT.address}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}
function downloadICS(res) {
    const blob = new Blob([buildICS(res)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservering-plato-${res.code}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ===== Mailto =====
function buildMailto(res) {
    const subject = `Reservering ${res.code} — ${res.name} — ${formatDateNL(res.date)} ${res.time}`;
    const body = [
        `Beste ${RESTAURANT.name},`,
        '',
        'Graag bevestig ik mijn reservering:',
        '',
        `Reserveringscode: ${res.code}`,
        `Naam: ${res.name}`,
        `Telefoon: ${res.phone}`,
        `E-mail: ${res.email}`,
        `Datum: ${formatDateNL(res.date)}`,
        `Tijd: ${res.time}`,
        `Aantal personen: ${res.guests}`,
        res.message ? `\nOpmerking: ${res.message}` : '',
        '',
        'Met vriendelijke groet,',
        res.name,
    ].filter(Boolean).join('\n');
    return `mailto:${RESTAURANT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ===== Modal =====
function openModal(res) {
    modalDetails.innerHTML = `
        <dt>Naam</dt><dd>${escapeHtml(res.name)}</dd>
        <dt>Datum</dt><dd>${formatDateNL(res.date)}</dd>
        <dt>Tijd</dt><dd>${res.time} uur</dd>
        <dt>Personen</dt><dd>${res.guests}</dd>
        <dt>Contact</dt><dd>${escapeHtml(res.email)}<br>${escapeHtml(res.phone)}</dd>
        ${res.message ? `<dt>Opmerking</dt><dd>${escapeHtml(res.message)}</dd>` : ''}
    `;
    modalCode.textContent = res.code;
    mailtoLink.href = buildMailto(res);
    icsBtn.onclick = () => downloadICS(res);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}
modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
});

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}

// ===== Submit =====
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
        name: fd.get('name').trim(),
        phone: fd.get('phone').trim(),
        email: fd.get('email').trim(),
        date: fd.get('date'),
        time: fd.get('time'),
        guests: fd.get('guests'),
        message: (fd.get('message') || '').trim(),
    };

    if (!validateForm(data)) {
        showToast('Controleer de velden die rood zijn gemarkeerd.', true);
        return;
    }

    const reservation = {
        ...data,
        code: generateCode(),
        createdAt: new Date().toISOString(),
    };
    saveReservation(reservation);
    openModal(reservation);
    showToast('Reservering geregistreerd.');
    form.reset();
    updateTimeSlots();
});

// Clear errors while typing
['name','phone','email','guests','time','date'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => setError(id, ''));
    el.addEventListener('change', () => setError(id, ''));
});

// Initial slot state
updateTimeSlots();
