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

if (localStorage.getItem('darkMode') === 'enabled') {
  body.classList.add('dark-mode');
}

if (toggleButton) {
  toggleButton.setAttribute("aria-pressed", body.classList.contains("dark-mode"));

  toggleButton.addEventListener('click', () => {
    const isDarkMode = body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');

    toggleButton.setAttribute("aria-pressed", isDarkMode);
  });
}