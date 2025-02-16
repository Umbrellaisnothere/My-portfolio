const toggleButton = document.getElementById('toggle-dark-mode');
const body = document.body;
const content = document.getElementById("content");

const year= document.querySelector("#current-year")

year.innerHTML = new Date().getFullYear()

setTimeout(function() {
  content.classList.add('content-visible');
}, 2000);

if (localStorage.getItem('darkMode') === 'enabled') {
  body.classList.add('dark-mode');
}

toggleButton.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  if (body.classList.contains('dark-mode')) {
    localStorage.setItem('darkMode', 'enabled');
  } else {
    localStorage.setItem('darkMode', 'disabled');
  }
});
