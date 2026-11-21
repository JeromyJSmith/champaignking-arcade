(() => {
  const dialog = document.querySelector('#party-intro');
  const film = document.querySelector('#corky-film');
  let opening = true;
  const requested = new URLSearchParams(location.search).get('contest');
  const initialMode = requested === 'dog' ? 'dog' : 'cork';
  function playFilm() {
    dialog.showModal();
    film.muted = true;
    film.currentTime = 0;
    // Keep native controls available if a browser restricts inline playback.
    film.play().catch(() => {});
  }
  function choose(mode) {
    opening = false;
    window.dispatchEvent(new CustomEvent('party-select', {detail: {mode}}));
    dialog.close();
  }
  dialog.querySelectorAll('[data-contest]').forEach(button =>
    button.addEventListener('click', () => choose(button.dataset.contest)));
  dialog.addEventListener('close', () => film.pause());
  document.querySelector('#skip-film').addEventListener('click', () => {
    if (opening) choose(initialMode);
    else dialog.close();
  });
  dialog.addEventListener('cancel', event => {
    if (opening) { event.preventDefault(); choose(initialMode); }
  });
  document.querySelector('#replay-intro').addEventListener('click', playFilm);
  film.addEventListener('ended', () => {
    if (opening && (requested === 'cork' || requested === 'dog')) choose(initialMode);
  });
  playFilm();
})();
