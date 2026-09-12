(() => {
  const page = location.pathname.split('/').pop().replace('.html', '') || 'home';
  const apply = data => {
    document.querySelectorAll('[data-content-key]').forEach(el => {
      const value = data.content?.[el.dataset.contentKey];
      if (value == null || value === '') return;
      if (el.dataset.contentMode === 'html') el.textContent = value;
      else el.textContent = value;
    });
    document.querySelectorAll('[data-social]').forEach(el => {
      const value = data.socials?.[el.dataset.social];
      el.hidden = !value;
      if (value) el.href = value;
    });
    document.querySelectorAll('[data-managed-image]').forEach(el => {
      const value = data.images?.[el.dataset.managedImage];
      if (value) { el.src = value; el.dataset.managedImageReady = 'true'; }
    });
  };
  fetch('/api/content').then(r => r.ok ? r.json() : null).then(data => data && apply(data)).catch(() => {});
  if (!sessionStorage.getItem('ih-tracked')) { fetch('/api/track', { method: 'POST' }).catch(() => {}); sessionStorage.setItem('ih-tracked', '1'); }
})();
