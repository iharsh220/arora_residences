/**
 * ARORA RESIDENCES - Main JavaScript
 * Loader, theme (light / dark / system), navigation, Vastu plan, portfolio,
 * lightbox, process key, WhatsApp form, reveal on scroll.
 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Scroll work runs at most once per frame
const scrollTasks = [];
let scrollQueued = false;
const runScrollTasks = () => {
  scrollQueued = false;
  scrollTasks.forEach(fn => fn());
};
const queueScrollTasks = () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(runScrollTasks);
};

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initTheme();
  initNavigation();
  initVastuPlan();
  initPortfolioFilter();
  initLightbox();
  initProcessKey();
  initSnapRows();
  initWhatsAppForm();
  initReveal();

  addEventListener('scroll', queueScrollTasks, { passive: true });
  addEventListener('resize', queueScrollTasks);
  addEventListener('load', queueScrollTasks);
  runScrollTasks();
});

/* 0. Loader: real progress of the photos on the first screen ---------------- */
function initLoader() {
  const root = document.documentElement;
  const loader = $('#loader');
  const wait = (ms) => new Promise(done => setTimeout(done, ms));

  let seen = false;
  try { seen = sessionStorage.getItem('arora_seen') === '1'; sessionStorage.setItem('arora_seen', '1'); } catch (e) { /* storage blocked */ }

  const loaded = (img) => img.complete ? Promise.resolve() : new Promise(done => {
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
  // Only what the visitor sees first; anything hidden on phones is skipped
  const images = $$('.hero-scene img').filter(img => img.offsetParent !== null);
  const jobs = [...images.map(loaded), document.fonts ? document.fonts.ready : Promise.resolve()];

  let done = 0;
  const step = () => {
    done += 1;
    loader.style.setProperty('--p', (done / jobs.length).toFixed(2));
  };
  loader.style.setProperty('--p', '0.08');
  jobs.forEach(job => job.then(step, step));

  // A short hold so the key is seen filling; almost none on repeat visits. Slow networks stop waiting at 5s.
  Promise.race([Promise.all([...jobs, wait(seen ? 250 : 900)]), wait(5000)])
    .then(() => { loader.style.setProperty('--p', '1'); return wait(reducedMotion.matches ? 0 : 450); })
    .then(() => { loader.classList.add('turn'); return wait(reducedMotion.matches ? 0 : 520); })
    .then(() => {
      root.classList.remove('loading');
      root.classList.add('ready');
      setTimeout(() => loader.remove(), 1700);
      warmImages();
    });

  // Once the page is open, fetch the remaining photos quietly so scrolling never meets a blank
  function warmImages() {
    if (navigator.connection && navigator.connection.saveData) return;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 800));
    idle(() => $$('main img[loading="lazy"]').forEach(img => {
      if (img.offsetParent !== null) img.loading = 'eager';
    }));
  }
}

/* 1. Theme: one button steps through System, Light and Dark ----------------- */
function initTheme() {
  const KEY = 'arora_theme_choice';
  const root = document.documentElement;
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const btn = $('#themeBtn');
  const setters = $$('[data-theme-set]');
  const metaColor = $('meta[name="theme-color"]');
  const tip = $('#themeTip');
  const NAMES = { system: 'System', light: 'Light', dark: 'Dark' };
  const deviceTheme = () => (systemDark.matches ? 'dark' : 'light');
  // System comes first, then the opposite of the device's theme so the first tap always shows a change
  const following = (choice) => {
    const order = ['system', ...(deviceTheme() === 'dark' ? ['light', 'dark'] : ['dark', 'light'])];
    return order[(order.indexOf(choice) + 1) % 3];
  };

  const paint = (choice) => {
    const theme = choice === 'system' ? deviceTheme() : choice;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-choice', choice);
    metaColor.setAttribute('content', theme === 'dark' ? '#04130c' : '#f5f8f5');
    const label = `Theme: ${NAMES[choice]}. Switch to ${NAMES[following(choice)]}`;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    setters.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === choice)));
  };

  const choose = (choice, origin) => {
    try { localStorage.setItem(KEY, choice); } catch (e) { /* storage blocked: applies to this visit only */ }
    if (!document.startViewTransition || reducedMotion.matches) return paint(choice);

    // The new palette opens out from the button that was pressed
    const box = origin.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => paint(choice)).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  };

  let tipTimer;
  btn.addEventListener('click', () => {
    const next = following(root.getAttribute('data-theme-choice'));
    choose(next, btn);
    tip.textContent = NAMES[next];
    tip.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => tip.classList.remove('show'), 1600);
  });
  setters.forEach(b => b.addEventListener('click', () => choose(b.dataset.themeSet, b)));

  // Follow the device while the choice is "system"
  systemDark.addEventListener('change', () => {
    if (root.getAttribute('data-theme-choice') === 'system') paint('system');
  });

  paint(root.getAttribute('data-theme-choice') || 'system');
}

/* 2. Header, full-screen menu, active link, action bar ---------------------- */
function initNavigation() {
  const header = $('#siteHeader');
  const menu = $('#mobileMenu');
  const menuBtn = $('#menuBtn');
  const actionBar = $('#actionBar');
  const behind = [$('main'), $('.site-footer'), actionBar];

  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    header.classList.toggle('menu-open', open);
    menu.inert = !open;
    behind.forEach(el => { el.inert = open; });
    document.body.classList.toggle('locked', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  $('.brand-logo', header).addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });
  matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  const sections = $$('main section[id]');
  const links = $$('.nav-link, .menu-link');
  const hero = $('#home');
  const contact = $('#contact');

  scrollTasks.push(() => {
    header.classList.toggle('scrolled', scrollY > 24);

    const line = innerHeight * 0.35;
    let current = sections[0];
    sections.forEach(s => { if (s.getBoundingClientRect().top <= line) current = s; });
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));

    // Appears after the hero, steps aside while the contact form is on screen
    const c = contact.getBoundingClientRect();
    const inContact = c.top < innerHeight * 0.8 && c.bottom > innerHeight * 0.3;
    actionBar.classList.toggle('show', hero.getBoundingClientRect().bottom < innerHeight * 0.5 && !inContact);
  });
}

/* 3. Vastu plan ------------------------------------------------------------ */
function initVastuPlan() {
  const plan = $('#vastuPlan');
  if (!plan) return;
  const cells = $$('button.zone', plan);
  const texts = $$('.vastu-zone', plan);

  const activate = (zone) => {
    plan.dataset.active = zone;
    cells.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.zone === zone)));
    texts.forEach(t => t.classList.toggle('active', t.dataset.zone === zone));
  };

  cells.forEach(c => c.addEventListener('click', () => activate(c.dataset.zone)));
  texts.forEach(t => {
    t.addEventListener('click', () => activate(t.dataset.zone));
    t.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') activate(t.dataset.zone); });
  });
  activate('ne');
}

/* 4. Portfolio filter ------------------------------------------------------ */
function initPortfolioFilter() {
  const grid = $('#portfolioGrid');
  if (!grid) return;
  const buttons = $$('.filter-btn');
  const items = $$('.portfolio-item', grid);

  buttons.forEach(btn => btn.addEventListener('click', () => {
    buttons.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    // Keep the chosen filter in view inside its own swipe row
    const row = btn.parentElement;
    row.scrollTo({ left: btn.offsetLeft - (row.clientWidth - btn.offsetWidth) / 2, behavior: 'smooth' });

    const filter = btn.dataset.filter;
    let shown = 0;
    items.forEach(item => {
      const show = filter === 'all' || item.dataset.category === filter;
      item.hidden = !show;
      item.classList.remove('entering', 'reveal-ready', 'reveal-in');
      if (show) {
        void item.offsetWidth; // restart the entrance animation
        item.style.animationDelay = `${shown * 45}ms`;
        item.classList.add('entering');
        shown += 1;
      }
    });
    grid.classList.toggle('filtered', filter !== 'all');
    grid.classList.toggle('single', shown === 1);
    queueScrollTasks();
  }));
}

/* 5. Lightbox -------------------------------------------------------------- */
function initLightbox() {
  const box = $('#lightbox');
  if (!box) return;
  const img = $('#lightboxImg');
  const title = $('#lightboxTitle');
  const count = $('#lightboxCount');
  const closeBtn = $('#lightboxClose');
  const prevBtn = $('#lightboxPrev');
  const nextBtn = $('#lightboxNext');
  const stage = $('#lightboxStage');
  const behind = [$('#siteHeader'), $('main'), $('.site-footer'), $('#actionBar')];
  let set = [];
  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + set.length) % set.length;
    const item = set[index];
    const src = $('img', item);
    img.style.backgroundImage = src.style.backgroundImage; // soft preview until the full photo lands
    img.src = src.src;
    img.alt = src.alt;
    title.textContent = item.dataset.title;
    count.textContent = set.length > 1 ? `${index + 1} / ${set.length}` : '';
    prevBtn.hidden = nextBtn.hidden = set.length < 2;
  };

  const open = (trigger) => {
    opener = trigger;
    const item = trigger.closest('[data-lightbox-item]');
    // Browse the designs currently visible in the gallery
    const gallery = item.closest('#portfolioGrid');
    set = gallery ? $$('[data-lightbox-item]:not([hidden])', gallery) : [item];
    show(set.indexOf(item));
    box.inert = false;
    box.classList.add('open');
    behind.forEach(el => { el.inert = true; });
    document.body.classList.add('locked');
    closeBtn.focus({ preventScroll: true });
  };

  const close = (restoreFocus) => {
    box.classList.remove('open');
    box.inert = true;
    behind.forEach(el => { el.inert = false; });
    document.body.classList.remove('locked');
    if (restoreFocus) opener.focus({ preventScroll: true });
  };

  $$('[data-lightbox-trigger]').forEach(t => t.addEventListener('click', () => open(t)));
  closeBtn.addEventListener('click', () => close(true));
  prevBtn.addEventListener('click', () => show(index - 1));
  nextBtn.addEventListener('click', () => show(index + 1));
  stage.addEventListener('click', (e) => { if (e.target === stage) close(true); });

  // Carry the design name into the enquiry form
  $('#lightboxInquire').addEventListener('click', () => {
    const notes = $('#formNotes');
    if (!notes.value.trim()) notes.value = `I am interested in this design: ${title.textContent}`;
    close(false);
  });

  document.addEventListener('keydown', (e) => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close(true);
    if (set.length > 1 && e.key === 'ArrowLeft') show(index - 1);
    if (set.length > 1 && e.key === 'ArrowRight') show(index + 1);
  });

  // Swipe
  let startX = null;
  let startY = 0;
  stage.addEventListener('touchstart', (e) => {
    startX = e.touches.length === 1 ? e.touches[0].clientX : null;
    startY = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (startX === null || set.length < 2) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

/* 6. Process: the key fills as you scroll ---------------------------------- */
function initProcessKey() {
  const key = $('#processKey');
  if (!key) return;
  const narrow = matchMedia('(max-width: 900px)');
  scrollTasks.push(() => {
    const r = key.getBoundingClientRect();
    const from = innerHeight * (narrow.matches ? 0.7 : 0.85);
    const travel = narrow.matches ? r.height : innerHeight * 0.4;
    const p = Math.min(1, Math.max(0, (from - r.top) / travel));
    key.style.setProperty('--p', p.toFixed(3));
    key.classList.toggle('unlocked', p >= 1);
  });
}

/* 7. Swipe rows: progress line --------------------------------------------- */
function initSnapRows() {
  $$('.snap-row').forEach(row => {
    const bar = document.createElement('div');
    bar.className = 'snap-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.append(document.createElement('span'));
    row.after(bar);

    const update = () => {
      const share = Math.min(1, row.clientWidth / row.scrollWidth);
      const max = row.scrollWidth - row.clientWidth;
      const done = max > 0 ? Math.min(1, Math.max(0, row.scrollLeft / max)) : 0;
      bar.style.setProperty('--w', `${share * 100}%`);
      bar.style.setProperty('--x', `${done * (1 / share - 1) * 100}%`);
    };
    row.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  });
}

/* 8. WhatsApp enquiry form ------------------------------------------------- */
function initWhatsAppForm() {
  const form = $('#waConsultationForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault(); // required fields are already checked by the browser
    const value = (id) => document.getElementById(id).value.trim();

    const lines = [
      '✦ *NEW CONSULTATION INQUIRY - ARORA RESIDENCES* ✦',
      '',
      `👤 *Client Name:* ${value('formName')}`,
      `📞 *Phone / Contact:* ${value('formPhone')}`
    ];
    [
      ['🏡 *Project Type:*', 'formProjectType'],
      ['🎨 *Preferred Style:*', 'formStyle'],
      ['📍 *Location / City:*', 'formCity'],
      ['💬 *Design Requirements:*', 'formNotes']
    ].forEach(([label, id]) => { if (value(id)) lines.push(`${label} ${value(id)}`); });
    lines.push('', 'Looking forward to scheduling an interior consultation.');

    const url = `https://wa.me/919372290192?text=${encodeURIComponent(lines.join('\n'))}`;
    // Some phone browsers block new tabs; fall back to this one
    if (!window.open(url, '_blank')) location.href = url;
  });
}

/* 9. Reveal on scroll ------------------------------------------------------ */
function initReveal() {
  if (!('IntersectionObserver' in window) || reducedMotion.matches) return;
  const targets = $$('.section-header, .about-images, .about-content, .service-card, .vastu-content, .vastu-photo, .vastu-compass, .portfolio-item, .process-step, .contact-info, .whatsapp-form');

  const io = new IntersectionObserver((entries) => {
    entries.filter(en => en.isIntersecting).forEach((en, i) => {
      const el = en.target;
      io.unobserve(el);
      el.style.transitionDelay = `${Math.min(i, 4) * 70}ms`;
      el.classList.add('reveal-in');
      setTimeout(() => {
        el.classList.remove('reveal-ready', 'reveal-in');
        el.style.transitionDelay = '';
      }, 1300);
    });
  }, { rootMargin: '0px 0px -8% 0px' });

  targets.forEach(el => {
    if (el.getBoundingClientRect().top < innerHeight) return; // already on screen
    el.classList.add('reveal-ready');
    io.observe(el);
  });
}
