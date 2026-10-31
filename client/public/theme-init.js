// Applies the saved theme before first paint to avoid a light/dark flash.
// A file rather than an inline script so the production Content-Security-Policy can stay strict.
(function () {
  var theme;
  try {
    theme = localStorage.getItem('bo-theme');
  } catch (e) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
})();
