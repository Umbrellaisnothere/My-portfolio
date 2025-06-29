document.addEventListener('DOMContentLoaded', () => {
const toggleButton = document.getElementById('toggle-dark-mode');
const body = document.body;
const content = document.getElementById("content");

const year= document.querySelector("#current-year")

if (year) {
  year.textContent = new Date().getFullYear();
}

if (content) {
  setTimeout(() => content.classList.add('content-visible'), 2000);
}

const drawerToggle = document.getElementById('drawer-toggle-dark-mode');

function setToggleButtonState(isDark) {
  if (toggleButton) {
    const iconHTML = `
      <span class="toggle-slider">
        <span class="toggle-icon">
          <i class="fa-solid fa-moon"></i>
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
      drawerToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      drawerToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  }
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
  hamburger.addEventListener('click', () => {
    drawer.classList.add('open');
    document.body.classList.add('drawer-open');
  });
  closeDrawer.addEventListener('click', () => {
    drawer.classList.remove('open');
    document.body.classList.remove('drawer-open');
  });
  
  // close drawer when clicking on a link
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      document.body.classList.remove('drawer-open');
    });
  });
  
  // close drawer when clicking outside of it
  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') && 
        !drawer.contains(e.target) && 
        !hamburger.contains(e.target)) {
      drawer.classList.remove('open');
      document.body.classList.remove('drawer-open');
    }
  });
}

// Enhanced Contact Form
const contactForm = document.getElementById('contact-form');
const contactSuccess = document.getElementById('contact-success');
if (contactForm && contactSuccess) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(contactForm);
    const name = formData.get('name') || document.getElementById('name')?.value;
    const email = formData.get('email') || document.getElementById('email')?.value;
    const subject = formData.get('subject') || document.getElementById('subject')?.value;
    const message = formData.get('message') || document.getElementById('message')?.value;
    
    // Basic validation
    if (!name || !email || !subject || !message) {
      alert('Please fill in all required fields.');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
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
  });
}

// FAQ Accordion Functionality
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
  const question = item.querySelector('.faq-question');
  const answer = item.querySelector('.faq-answer');
  
  if (question && answer) {
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all other FAQ items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
        }
      });
      
      // Toggle current item
      if (isActive) {
        item.classList.remove('active');
      } else {
        item.classList.add('active');
      }
    });
  }
});

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
        
        postElement.innerHTML = `
          <div class="post-date">${date}</div>
          <h3 class="post-title">${post.title}</h3>
          <p class="post-excerpt">${cleanExcerpt}</p>
          <a href="${post.link}" class="post-link" target="_blank" rel="noopener noreferrer">Read on Medium</a>
        `;
        
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
      behavior: 'smooth'
    });
  });
}

});