(() => {
  const screen = document.querySelector('#screen-content');
  const scriptUrl = document.currentScript?.src || document.baseURI;
  const photoUrls = [...new Set([
    new URL('./assets/irene-photo.jpg', scriptUrl),
    new URL('./assets/irene-photo.jpg', document.baseURI),
    new URL('/assets/irene-photo.jpg', window.location.origin)
  ].map(url => {
    url.searchParams.set('v', '2');
    return url.href;
  }))];
  let matchingQuery = false;

  function showLoveAnimation() {
    const row = screen.querySelector('.search-row');
    if (!row || row.querySelector('.irene-love-animation')) return;

    const animation = document.createElement('div');
    animation.className = 'irene-love-animation';
    animation.setAttribute('role', 'status');
    animation.setAttribute('aria-label', 'A little love for Irene');

    const photo = document.createElement('img');
    photo.className = 'irene-love-photo';
    photo.alt = 'Irene';
    let photoUrlIndex = 0;
    photo.addEventListener('error', () => {
      if (photoUrlIndex < photoUrls.length - 1) {
        photo.src = photoUrls[++photoUrlIndex];
        return;
      }
      console.error('Unable to load the Irene easter egg photo from the deployed asset paths.');
    });
    photo.src = photoUrls[photoUrlIndex];

    const heart = document.createElement('span');
    heart.className = 'irene-love-heart';
    heart.setAttribute('aria-hidden', 'true');
    heart.textContent = '♥';

    const name = document.createElement('span');
    name.className = 'irene-love-name';
    name.textContent = 'Irene';

    animation.append(photo, heart, name);
    row.append(animation);
    animation.addEventListener('animationend', () => animation.remove(), { once: true });
  }

  document.addEventListener('input', event => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== 'search' ||
        screen.dataset.friendsScene !== 'explore') return;

    const matches = event.target.value.trim().toLowerCase() === 'irene';
    if (matches && !matchingQuery) {
      requestAnimationFrame(() => {
        const search = screen.querySelector('#search');
        if (screen.dataset.friendsScene === 'explore' &&
            search?.value.trim().toLowerCase() === 'irene') showLoveAnimation();
      });
    }
    if (!matches) screen.querySelector('.irene-love-animation')?.remove();
    matchingQuery = matches;
  }, true);
})();
