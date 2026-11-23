/**
 * ARORA RESIDENCES - Main JavaScript
 * Handles Theme Toggling (Dark/Light), Mobile Navigation, Portfolio Filters,
 * Lightbox Gallery, and Dynamic WhatsApp Integration.
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  initNavigation();
  initPortfolioFilter();
  initLightbox();
  initWhatsAppForm();
  initScrollAnimations();
});

/* ==========================================================================
   1. Dark / Light Mode Engine (System-Aware + Manual Override)
   ========================================================================== */
function initThemeEngine() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Check stored theme in localStorage
  const savedTheme = localStorage.getItem('arora_theme');

  // Determine initial theme:
  // If user saved a preference, use it. Otherwise, follow system preference.
  let currentTheme = savedTheme ? savedTheme : (systemPrefersDark.matches ? 'dark' : 'light');
  
  applyTheme(currentTheme);

  // Toggle button click listener
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('arora_theme', newTheme);
    });
  }

  // React to system changes ONLY if user has not explicitly chosen a preference
  systemPrefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('arora_theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`);
      themeToggleBtn.setAttribute('title', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`);
    }
  }
}

/* ==========================================================================
   2. Sticky Navigation, Mobile Drawer & Active Spy
   ========================================================================== */
function initNavigation() {
  const header = document.querySelector('.site-header');
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileDrawerClose = document.getElementById('mobileDrawerClose');
  const navOverlay = document.getElementById('navOverlay');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Scroll Header Shadow
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  }, { passive: true });

  // Open / Close helper functions
  const openMobileMenu = () => {
    navMenu?.classList.add('open');
    mobileToggle?.classList.add('open');
    navOverlay?.classList.add('active');
    mobileToggle?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeMobileMenu = () => {
    navMenu?.classList.remove('open');
    mobileToggle?.classList.remove('open');
    navOverlay?.classList.remove('active');
    mobileToggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      if (navMenu.classList.contains('open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    mobileDrawerClose?.addEventListener('click', closeMobileMenu);
    navOverlay?.addEventListener('click', closeMobileMenu);

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('open') && 
          !navMenu.contains(e.target) && 
          !mobileToggle.contains(e.target)) {
        closeMobileMenu();
      }
    });

    // Close menu when clicking a nav link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });
  }

  // Active Navigation Spy on Scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');
      const matchedLink = document.querySelector(`.nav-link[href*="${sectionId}"]`);
      
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        matchedLink?.classList.add('active');
      } else {
        matchedLink?.classList.remove('active');
      }
    });
  }, { passive: true });
}

/* ==========================================================================
   3. Portfolio Filter System
   ========================================================================== */
function initPortfolioFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      portfolioItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (filterValue === 'all' || itemCategory === filterValue) {
          item.style.display = 'block';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
          }, 50);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'translateY(15px)';
          setTimeout(() => {
            item.style.display = 'none';
          }, 250);
        }
      });
    });
  });
}

/* ==========================================================================
   4. Image Lightbox Modal
   ========================================================================== */
function initLightbox() {
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxWaBtn = document.getElementById('lightboxWaBtn');
  const closeBtn = document.getElementById('lightboxCloseBtn');
  const zoomTriggers = document.querySelectorAll('[data-lightbox-trigger]');

  if (!lightboxModal) return;

  zoomTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const parentItem = trigger.closest('.portfolio-item') || trigger.closest('.service-card') || trigger.closest('.hero-visual');
      const img = parentItem.querySelector('img');
      const title = parentItem.querySelector('.portfolio-item-title')?.textContent || parentItem.querySelector('.service-title')?.textContent || 'Arora Residences Design';

      if (img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || title;
        if (lightboxTitle) lightboxTitle.textContent = title;
        
        // Update direct WhatsApp link inside lightbox
        if (lightboxWaBtn) {
          const encodedTitle = encodeURIComponent(title);
          lightboxWaBtn.href = `https://wa.me/919372290192?text=Hello%20Arora%20Residences%2C%20I%20am%20interested%20in%20the%20${encodedTitle}%20design%20concept%20featured%20on%20your%20website.`;
        }

        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  // Close Lightbox functions
  const closeLightbox = () => {
    lightboxModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  const lightboxCloseAction = document.getElementById('lightboxCloseAction');
  lightboxCloseAction?.addEventListener('click', closeLightbox);
  closeBtn?.addEventListener('click', closeLightbox);
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal.classList.contains('active')) {
      closeLightbox();
    }
  });
}

/* ==========================================================================
   5. Interactive WhatsApp Message Generator & Form
   ========================================================================== */
function initWhatsAppForm() {
  const form = document.getElementById('waConsultationForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('formName')?.value.trim();
    const phone = document.getElementById('formPhone')?.value.trim();
    const projectType = document.getElementById('formProjectType')?.value;
    const style = document.getElementById('formStyle')?.value;
    const city = document.getElementById('formCity')?.value.trim();
    const notes = document.getElementById('formNotes')?.value.trim();

    if (!name || !phone) {
      alert('Please provide your name and phone number to continue.');
      return;
    }

    // Build the formatted WhatsApp message
    let message = `✦ *NEW CONSULTATION INQUIRY - ARORA RESIDENCES* ✦\n\n`;
    message += `👤 *Client Name:* ${name}\n`;
    message += `📞 *Phone / Contact:* ${phone}\n`;
    if (projectType) message += `🏡 *Project Type:* ${projectType}\n`;
    if (style) message += `🎨 *Preferred Style:* ${style}\n`;
    if (city) message += `📍 *Location / City:* ${city}\n`;
    if (notes) message += `💬 *Design Requirements:* ${notes}\n`;
    message += `\nLooking forward to scheduling an interior consultation.`;

    // Target Phone: +91-9372290192 (919372290192)
    const targetNumber = '919372290192';
    const waUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp
    window.open(waUrl, '_blank');
  });
}

/* ==========================================================================
   6. Scroll-Triggered Animations (Intersection Observer)
   ========================================================================== */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.service-card, .portfolio-item, .process-card, .testimonial-card, .strip-item');
  
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersectObserver || entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });
}
