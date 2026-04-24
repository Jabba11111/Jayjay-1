// ===== Navbar scroll state =====
const navbar = document.getElementById('navbar');
const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ===== Mobile menu =====
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
});
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

// ===== Reservation form =====
const form = document.getElementById('reserveForm');
const toast = document.getElementById('toast');
const dateInput = document.getElementById('date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
}
form.addEventListener('submit', (e) => {
    e.preventDefault();
    toast.classList.add('show');
    form.reset();
    setTimeout(() => toast.classList.remove('show'), 3500);
});

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
