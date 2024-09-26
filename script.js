const toggleButton = document.getElementById('toggle-dark-mode');
const body = document.body;
const content = document.getElementById("content");

setTimeout(function() {
  content.classList.add('content-visible');
}, 2000);


toggleButton.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
});
