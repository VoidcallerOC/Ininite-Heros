(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');

  if (!toggle || !nav) return;

  const desktopQuery = window.matchMedia('(min-width: 821px)');

  const setMenuState = (isOpen, returnFocus = false) => {
    const isDesktop = desktopQuery.matches;
    nav.classList.toggle('is-open', !isDesktop && isOpen);
    document.body.classList.toggle('menu-open', !isDesktop && isOpen);
    toggle.setAttribute('aria-expanded', String(!isDesktop && isOpen));
    toggle.setAttribute('aria-label', !isDesktop && isOpen ? 'Close navigation menu' : 'Open navigation menu');

    if (isDesktop) {
      nav.removeAttribute('aria-hidden');
      nav.removeAttribute('inert');
    } else {
      nav.setAttribute('aria-hidden', String(!isOpen));
      nav.toggleAttribute('inert', !isOpen);
    }

    if (returnFocus) toggle.focus();
  };

  const closeMenu = (returnFocus = false) => setMenuState(false, returnFocus);

  toggle.addEventListener('click', () => {
    const isOpen = !nav.classList.contains('is-open');
    setMenuState(isOpen);
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true);
  });

  const syncMenu = () => setMenuState(false);
  desktopQuery.addEventListener('change', syncMenu);
  syncMenu();
})();
