document.addEventListener('DOMContentLoaded', () => {
const toggleButton = document.getElementById('toggle-dark-mode');
const body = document.body;

const API_BASE_URL = (window.PORTFOLIO_CONFIG && window.PORTFOLIO_CONFIG.apiBaseUrl) || 'http://localhost:3001';

const year= document.querySelector("#current-year")

if (year) {
  year.textContent = new Date().getFullYear();
}

const skipLink = document.querySelector('.skip-link');
if (skipLink) {
  skipLink.addEventListener('click', () => {
    const main = document.getElementById('main-content');
    if (main) main.focus();
  });
}

const drawerToggle = document.getElementById('drawer-toggle-dark-mode');

function updateDarkModeControls(isDark) {
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  [toggleButton, drawerToggle].forEach((button) => {
    if (!button) return;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  });
}

function setToggleButtonState(isDark) {
  if (toggleButton) {
    const iconHTML = `
      <span class="toggle-slider">
        <span class="toggle-icon">
          <i class="fa-solid fa-moon" aria-hidden="true"></i>
        </span>
      </span>`;
    toggleButton.innerHTML = iconHTML;
    if (isDark) {
      toggleButton.classList.remove('sun');
    } else {
      toggleButton.classList.add('sun');
      // Change the icon to sun when in light mode
      const iconElement = toggleButton.querySelector('.toggle-icon i');
      if (iconElement) {
        iconElement.className = 'fa-solid fa-sun';
      }
    }
  }
  if (drawerToggle) {
    if (isDark) {
      drawerToggle.innerHTML = '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    } else {
      drawerToggle.innerHTML = '<i class="fa-solid fa-sun" aria-hidden="true"></i>';
    }
  }
  updateDarkModeControls(isDark);
}

function getPreferredDarkMode() {
  const stored = localStorage.getItem('darkMode');
  if (stored === 'enabled') return true;
  if (stored === 'disabled') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkMode(enabled, persist) {
  document.documentElement.classList.toggle('dark-mode', enabled);
  body.classList.toggle('dark-mode', enabled);
  if (persist) {
    localStorage.setItem('darkMode', enabled ? 'enabled' : 'disabled');
  }
  setToggleButtonState(enabled);
}

applyDarkMode(getPreferredDarkMode(), false);

if (toggleButton) {
  toggleButton.addEventListener('click', () => {
    applyDarkMode(!document.documentElement.classList.contains('dark-mode'), true);
  });
}
if (drawerToggle) {
  drawerToggle.addEventListener('click', () => {
    applyDarkMode(!document.documentElement.classList.contains('dark-mode'), true);
  });
}

const hamburger = document.getElementById('hamburger-menu');
const drawer = document.getElementById('side-drawer');
const closeDrawer = document.getElementById('close-drawer');

if (hamburger && drawer && closeDrawer) {
  function setDrawerOpen(open) {
    drawer.classList.toggle('open', open);
    document.body.classList.toggle('drawer-open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');

    if (open) {
      closeDrawer.focus();
      return;
    }

    if (document.activeElement && drawer.contains(document.activeElement)) {
      hamburger.focus();
    }
  }

  hamburger.addEventListener('click', () => {
    setDrawerOpen(!drawer.classList.contains('open'));
  });
  closeDrawer.addEventListener('click', () => {
    setDrawerOpen(false);
  });

  // close drawer when clicking on a link
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      setDrawerOpen(false);
    });
  });

  // close drawer when clicking outside of it
  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') &&
        !drawer.contains(e.target) &&
        !hamburger.contains(e.target)) {
      setDrawerOpen(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      setDrawerOpen(false);
    }
  });
}

function setContactStatus(statusEl, type, message) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove('is-success', 'is-error');
  if (type) statusEl.classList.add(type);
}

function bindContactForm(form) {
  const submitButton = form.querySelector('.contact_button');
  const statusEl = form.querySelector('.contact-status') || document.getElementById('contact-status');
  if (!submitButton) return;

  const originalButtonHtml = submitButton.innerHTML;
  let isSubmitting = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const subject = (formData.get('subject') || '').toString().trim();
    const projectType = (formData.get('project-type') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();

    if (!name || !email || !message) {
      setContactStatus(statusEl, 'is-error', 'Please fill in your name, email, and message.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setContactStatus(statusEl, 'is-error', 'Please enter a valid email address.');
      return;
    }

    isSubmitting = true;
    form.setAttribute('aria-busy', 'true');
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    submitButton.textContent = 'Sending...';
    setContactStatus(statusEl, '', 'Sending your message...');

    const payload = { name, email, message };
    if (subject) payload.subject = subject;
    if (projectType) payload.projectType = projectType;

    try {
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (response.ok && result.success) {
        form.reset();
        setContactStatus(statusEl, 'is-success', result.message || 'Thank you for reaching out! I\'ll get back to you soon.');
      } else if (response.status === 429) {
        setContactStatus(statusEl, 'is-error', result.message || 'Too many messages. Please try again later.');
      } else if (response.status >= 400 && response.status < 500) {
        setContactStatus(statusEl, 'is-error', result.message || 'Please check the information you entered.');
      } else {
        setContactStatus(statusEl, 'is-error', result.message || 'Unable to send your message right now. Please try again later.');
      }
    } catch (error) {
      setContactStatus(statusEl, 'is-error', 'Unable to send your message right now. Please try again later.');
    } finally {
      isSubmitting = false;
      form.removeAttribute('aria-busy');
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      submitButton.innerHTML = originalButtonHtml;
    }
  });
}

document.querySelectorAll('form.contact_form').forEach(bindContactForm);

async function fetchMediumPosts() {
  const mediumPostsContainer = document.getElementById('medium-posts');
  if (!mediumPostsContainer) return;

  // this shows the loading state
  mediumPostsContainer.innerHTML = `
    <div class="loading-posts">
      <p>Loading latest posts...</p>
    </div>
  `;

  try {
    // using a CORS proxy to fetch Medium RSS feed
    const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/@keith.murimi');
    const data = await response.json();
    
    if (data.status === 'ok' && data.items && data.items.length > 0) {
      const posts = data.items.slice(0, 3); // show latest 3 posts
      
      mediumPostsContainer.innerHTML = ''; // clear loading state
      
      posts.forEach(post => {
        const postElement = document.createElement('article');
        postElement.className = 'blog-post';
        
        const date = new Date(post.pubDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        // clean up the excerpt by removing HTML tags and limiting length
        const excerpt = post.description
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
          .substring(0, 140);
        
        const cleanExcerpt = excerpt.length > 140 ? excerpt + '...' : excerpt;
        
        const dateEl = document.createElement('div');
        dateEl.className = 'post-date';
        dateEl.textContent = date;

        const titleEl = document.createElement('h3');
        titleEl.className = 'post-title';
        titleEl.textContent = post.title || 'Untitled';

        const excerptEl = document.createElement('p');
        excerptEl.className = 'post-excerpt';
        excerptEl.textContent = cleanExcerpt;

        const linkEl = document.createElement('a');
        linkEl.className = 'post-link';
        linkEl.textContent = 'Read on Medium';
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.href = typeof post.link === 'string' && /^https?:\/\//i.test(post.link)
          ? post.link
          : 'https://medium.com/@keith.murimi';

        postElement.append(dateEl, titleEl, excerptEl, linkEl);
        
        mediumPostsContainer.appendChild(postElement);
      });
    } else {
      // shows a fallback message if no posts are found
      mediumPostsContainer.innerHTML = `
        <article class="blog-post">
          <div class="post-date">Coming Soon</div>
          <h3 class="post-title">My First Blog Post</h3>
          <p class="post-excerpt">I'm working on my first blog post about web development and technology. Stay tuned for updates!</p>
          <a href="https://medium.com/@keith.murimi" class="post-link" target="_blank" rel="noopener noreferrer">Visit My Medium</a>
        </article>
      `;
    }
  } catch (error) {
    console.log('Error fetching Medium posts:', error);
    // show fallback content
    mediumPostsContainer.innerHTML = `
      <article class="blog-post">
        <div class="post-date">Coming Soon</div>
        <h3 class="post-title">My First Blog Post</h3>
        <p class="post-excerpt">I'm working on my first blog post about web development and technology. Stay tuned for updates!</p>
        <a href="https://medium.com/@keith.murimi" class="post-link" target="_blank" rel="noopener noreferrer">Visit My Medium</a>
      </article>
    `;
  }
}

// load Medium posts when page loads
fetchMediumPosts();

// Back to top button functionality
const backToTopButton = document.getElementById('back-to-top');

if (backToTopButton) {
  // show/hide button based on the scroll position
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      backToTopButton.classList.add('visible');
    } else {
      backToTopButton.classList.remove('visible');
    }
  });

  // smooth scroll to top when clicked
  backToTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  });
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function webElementDelay(el) {
  const group = el.closest('.web-core, .web-mid, .web-dense');
  const isPath = el.tagName.toLowerCase() === 'path';
  const isNarrow = window.matchMedia('(max-width: 768px)').matches;

  if (isNarrow) {
    if (el.classList.contains('web-line-strong')) {
      return group && group.querySelector('.web-line-strong') === el ? 0 : 0.06;
    }
    if (el.classList.contains('web-line-accent')) return 0.12;
    if (!isPath) return 0.28;
    return 0.08;
  }

  if (group && group.classList.contains('web-core')) {
    if (el.classList.contains('web-line-strong')) {
      return group.querySelector('.web-line-strong') === el ? 0 : 0.08;
    }
    if (el.classList.contains('web-line-accent')) return 0.18;
    return 0.5;
  }

  if (group && group.classList.contains('web-mid')) {
    return isPath ? 0.28 : 0.68;
  }

  if (group && group.classList.contains('web-dense')) {
    return isPath ? 0.46 : 0.86;
  }

  return 0.2;
}

function initHeroWeb() {
  const svg = document.querySelector('.hero-web svg');
  if (!svg || prefersReducedMotion()) return;

  const paths = svg.querySelectorAll('path');
  paths.forEach((path) => {
    const group = path.closest('g');
    if (group && getComputedStyle(group).display === 'none') return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    path.style.setProperty('--web-delay', `${webElementDelay(path)}s`);
  });

  svg.querySelectorAll('circle').forEach((node) => {
    const group = node.closest('g');
    if (group && getComputedStyle(group).display === 'none') return;
    node.style.setProperty('--web-delay', `${webElementDelay(node)}s`);
  });

  svg.classList.add('is-drawing');

  window.setTimeout(() => {
    svg.classList.remove('is-drawing');
    svg.classList.add('is-drawn');
    paths.forEach((path) => {
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
    });
  }, 1500);
}

function initScrollReveal() {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -6% 0px'
  });

  document.querySelectorAll('section:not(#hero-section), footer.footer').forEach((section) => {
    section.classList.add('reveal');
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
      section.classList.add('is-visible');
    } else {
      observer.observe(section);
    }
  });

  document.documentElement.classList.add('js-ready');
}

initHeroWeb();
initScrollReveal();

function isIndexPath(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  return path === '/' || /\/index\.html$/i.test(path);
}

function navSectionIdFromLink(link) {
  const href = link.getAttribute('href');
  if (!href) return null;

  const url = new URL(href, window.location.href);
  if (url.hash) return decodeURIComponent(url.hash.slice(1));

  const page = (url.pathname.split('/').pop() || '').toLowerCase();
  if (page === 'index.html' || page === '') return 'hero-section';
  return null;
}

let pinnedNavId = null;
let pinnedNavUntil = 0;
let pinnedNavTimer = 0;

function setHomeNavCurrent(sectionId, pinMs = 0) {
  if (pinMs) {
    pinnedNavId = sectionId;
    pinnedNavUntil = Date.now() + pinMs;
    window.clearTimeout(pinnedNavTimer);
    pinnedNavTimer = window.setTimeout(() => {
      pinnedNavId = null;
      pinnedNavUntil = 0;
      window.dispatchEvent(new Event('scroll'));
    }, pinMs);
  }

  document.querySelectorAll('.menu a, .side-drawer a').forEach((link) => {
    if (navSectionIdFromLink(link) === sectionId) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function scrollToId(id, behavior) {
  const target = document.getElementById(id);
  if (!target) return false;

  const html = document.documentElement;
  const previousBehavior = html.style.scrollBehavior;
  const useSmooth = behavior === 'smooth' && !prefersReducedMotion();

  if (!useSmooth) {
    html.style.scrollBehavior = 'auto';
  }

  target.scrollIntoView({
    behavior: useSmooth ? 'smooth' : 'auto',
    block: 'start'
  });

  if (!useSmooth) {
    html.style.scrollBehavior = previousBehavior;
  }

  return true;
}

function jumpToLocationHash() {
  const id = decodeURIComponent((window.location.hash || '').slice(1));
  if (!id) return;
  scrollToId(id, 'auto');
  if (document.getElementById('Projects') && document.getElementById(id)) {
    setHomeNavCurrent(id, 900);
  }
}

function initHashNavigation() {
  jumpToLocationHash();
  window.addEventListener('load', jumpToLocationHash);
  window.addEventListener('hashchange', jumpToLocationHash);

  document.querySelectorAll('.menu a, .side-drawer a, .footer a').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const hereIndex = isIndexPath(window.location.pathname);
      const targetIndex = isIndexPath(url.pathname);
      const sameDocument = url.pathname === window.location.pathname || (hereIndex && targetIndex);
      if (!sameDocument) return;

      const hashId = url.hash ? decodeURIComponent(url.hash.slice(1)) : '';

      if (hashId && document.getElementById(hashId)) {
        event.preventDefault();
        if (window.location.hash !== `#${hashId}`) {
          history.pushState(null, '', `#${hashId}`);
        }
        scrollToId(hashId, prefersReducedMotion() ? 'auto' : 'smooth');
        if (document.getElementById('Projects')) {
          setHomeNavCurrent(hashId, 900);
        }
        return;
      }

      if (hereIndex && !hashId && navSectionIdFromLink(link) === 'hero-section') {
        event.preventDefault();
        history.pushState(null, '', window.location.pathname + window.location.search);
        const html = document.documentElement;
        const previousBehavior = html.style.scrollBehavior;
        const useSmooth = !prefersReducedMotion();
        html.style.scrollBehavior = useSmooth ? previousBehavior : 'auto';
        window.scrollTo({ top: 0, behavior: useSmooth ? 'smooth' : 'auto' });
        html.style.scrollBehavior = previousBehavior;
        setHomeNavCurrent('hero-section', 900);
      }
    });
  });
}

function initHomeSectionNav() {
  if (!document.getElementById('Projects')) return;

  const sections = ['hero-section', 'Skills', 'Projects']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length) return;

  const updateFromScroll = () => {
    if (Date.now() < pinnedNavUntil && pinnedNavId) {
      return;
    }

    const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 72;
    const activateBelow = headerHeight + Math.min(160, Math.max(72, window.innerHeight * 0.2));
    let current = 'hero-section';
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= activateBelow) {
        current = section.id;
      }
    });
    setHomeNavCurrent(current);
  };

  updateFromScroll();
  window.addEventListener('scroll', updateFromScroll, { passive: true });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(() => {
      updateFromScroll();
    }, {
      root: null,
      threshold: [0, 0.2, 0.5, 1],
      rootMargin: '-20% 0px -55% 0px'
    });

    sections.forEach((section) => observer.observe(section));
  }
}

initHomeSectionNav();
initHashNavigation();

});