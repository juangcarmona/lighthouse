try {
  const value = localStorage.getItem('lighthouse.appearance');
  if (['light', 'dark', 'system'].includes(value)) document.documentElement.dataset.lhTheme = value;
} catch { /* Appearance still works for the current page when storage is disabled. */ }
