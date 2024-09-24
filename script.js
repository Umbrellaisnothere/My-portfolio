const toggleButton = document.getElementById('toggle-dark-mode');
const body = document.body;
const content = document.getElementById("content");
const hamburger = document.getElementById('hamburger-menu');
const navMenu = document.getElementById('nav-menu');

window.onload = function() {
  setTimeout(() => {
    document.getElementById('content').style.display = 'block';
  }, 2000);
};

hamburger.addEventListener('click', () => {
  // console.log('Hamburger clicked!');
  navMenu.classList.toggle('show');
  const expanded = navMenu.classList.contains('show');
  hamburger.setAttribute('aria-expanded', expanded);
});


if (localStorage.getItem('dark-mode') === 'enabled') {
  body.classList.add('dark-mode');
}

toggleButton.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  if (body.classList.contains('dark-mode')) {
    localStorage.setItem('dark-mode', 'enabled');
} else {
    localStorage.setItem('dark-mode', 'disabled');
}
});
