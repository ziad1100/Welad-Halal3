export function applyTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('appTheme', theme);
  } catch {
    /* ignore */
  }
}

export function initTheme() {
  let t = 'light';
  try {
    t = localStorage.getItem('appTheme') || 'light';
  } catch {
    /* ignore */
  }
  document.documentElement.setAttribute('data-theme', t);
  return t;
}

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}
