document.addEventListener('DOMContentLoaded', () => {
const toggleButton = document.getElementById('toggle-dark-mode');
const body = document.body;

// API endpoint configuration - change this for production
const API_BASE_URL = 'http://localhost:3001'; // For production, change to your deployed backend URL

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

function setDarkMode(enabled) {
  if (enabled) {
    body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');
    setToggleButtonState(true);
  } else {
    body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');
    setToggleButtonState(false);
  }
}

const darkModeEnabled = localStorage.getItem('darkMode') === 'enabled';
setDarkMode(darkModeEnabled);

if (toggleButton) {
  toggleButton.addEventListener('click', () => {
    setDarkMode(!body.classList.contains('dark-mode'));
  });
}
if (drawerToggle) {
  drawerToggle.addEventListener('click', () => {
    setDarkMode(!body.classList.contains('dark-mode'));
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

// Enhanced Contact Form
const contactForm = document.getElementById('contact-form');
const contactSuccess = document.getElementById('contact-success');
if (contactForm && contactSuccess) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(contactForm);
    const name = formData.get('name') || document.getElementById('name')?.value;
    const email = formData.get('email') || document.getElementById('email')?.value;
    const subject = formData.get('subject') || document.getElementById('subject')?.value || 'Portfolio Contact';
    const projectType = formData.get('project-type') || document.getElementById('project-type')?.value;
    const message = formData.get('message') || document.getElementById('message')?.value;
    
    // Basic validation
    if (!name || !email || !message) {
      alert('Please fill in all required fields.');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
    try {
      // Send data to backend
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          projectType,
          message
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Hide form and show success message
        contactForm.querySelectorAll('input, textarea, select, button').forEach(el => {
          if (el !== contactSuccess) el.style.display = 'none';
        });
        
        contactSuccess.style.display = 'flex';
        contactSuccess.style.opacity = 0;
        setTimeout(() => { contactSuccess.style.opacity = 1; }, 50);
        
        // Reset form after 5 seconds
        setTimeout(() => {
          contactForm.reset();
          contactForm.querySelectorAll('input, textarea, select, button').forEach(el => {
            if (el !== contactSuccess) el.style.display = '';
          });
          contactSuccess.style.display = 'none';
        }, 5000);
      } else {
        alert(result.error || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please check your connection and try again.');
    }
  });
}

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

});