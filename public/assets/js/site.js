(() => {
  const SHOP_TIME_ZONE = window.__IH_TIME_ZONE__ || 'America/New_York';
  const HOURS = window.__IH_HOURS__ || {};
  const statusFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIME_ZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
  const displayTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });

  const getParts = (date) => Object.fromEntries(statusFormatter.formatToParts(date)
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, value]));

  const getDayParts = (date) => Object.fromEntries(dayFormatter.formatToParts(date)
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, value]));

  const getWeekdayNumber = (weekday) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const dateKey = (parts) => `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

  // Convert a wall-clock time in the shop's timezone into a real Date, including DST.
  const zonedDate = (year, month, day, minutes) => {
    let result = new Date(Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60));
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const parts = getDayParts(result);
      const current = getParts(result);
      const wallClock = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(current.hour), Number(current.minute));
      const wanted = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
      result = new Date(result.getTime() + wanted - wallClock);
    }
    return result;
  };

  const formatOpening = (date) => {
    if (!date) return 'the next scheduled opening';
    const parts = getDayParts(date);
    const today = getDayParts(new Date());
    const day = getWeekdayNumber(parts.weekday);
    const dayLabel = dateKey(parts) === dateKey(today)
      ? 'today'
      : dateKey(parts) === dateKey(getDayParts(new Date(Date.now() + 24 * 60 * 60 * 1000)))
        ? 'tomorrow'
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
    return `${dayLabel} at ${displayTimeFormatter.format(date)}`;
  };

  const updateShopStatus = () => {
    const status = document.querySelector('.status-pill');
    if (!status) return;

    const now = new Date();
    const currentParts = getParts(now);
    const currentDay = getWeekdayNumber(currentParts.weekday);
    const currentMinutes = Number(currentParts.hour) * 60 + Number(currentParts.minute);
    const today = getDayParts(now);
    const todayHours = HOURS[currentDay];
    const isOpen = Boolean(todayHours && currentMinutes >= todayHours.open && currentMinutes < todayHours.close);
    let target;
    let action;

    if (isOpen) {
      target = zonedDate(Number(today.year), Number(today.month), Number(today.day), todayHours.close);
      action = 'CLOSES';
    } else {
      for (let offset = 0; offset <= 7; offset += 1) {
        const candidate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
        const candidateParts = getDayParts(candidate);
        const candidateDay = getWeekdayNumber(candidateParts.weekday);
        const hours = HOURS[candidateDay];
        if (!hours) continue;
        const candidateOpen = zonedDate(Number(candidateParts.year), Number(candidateParts.month), Number(candidateParts.day), hours.open);
        if (candidateOpen > now) {
          target = candidateOpen;
          break;
        }
      }
      action = 'OPENS';
    }

    const state = isOpen ? 'open' : 'closed';
    const opening = formatOpening(target);
    status.classList.toggle('status-pill--open', isOpen);
    status.dataset.state = state;
    status.setAttribute('aria-label', `Shop is ${state}. ${action.toLowerCase()} ${opening}`);
    status.innerHTML = `<span class="status-pill__dot" aria-hidden="true"></span> ${state.toUpperCase()} · ${action} ${opening}`;
  };

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (toggle && nav) {
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
    toggle.addEventListener('click', () => setMenuState(!nav.classList.contains('is-open')));
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true);
    });
    desktopQuery.addEventListener('change', () => setMenuState(false));
    setMenuState(false);
  }

  updateShopStatus();
  window.setInterval(updateShopStatus, 60 * 1000);
})();
