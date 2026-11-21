(() => {
  const dialog = document.querySelector('#party-intro');
  const film = document.querySelector('#corky-film');
  let opening = true;
  let clip;
  async function playFilm() {
    dialog.showModal();
    try {
      // A typed local blob also supports seeking on the original arcade server.
      clip ??= fetch('corky-intro-through-pop.mp4').then(async response => {
        if (!response.ok) throw Error('Film unavailable');
        return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: 'video/mp4' }));
      }).catch(error => {clip = null; throw error;});
      film.src = await clip;
      if (dialog.open && !matchMedia('(prefers-reduced-motion: reduce)').matches) await film.play();
    } catch { /* Contest selection and the native play control stay available. */ }
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
    if (opening) choose('cork');
    else dialog.close();
  });
  dialog.addEventListener('cancel', () => {opening = false;});
  document.querySelector('#replay-intro').addEventListener('click', playFilm);
  const contest = new URLSearchParams(location.search).get('contest');
  if (contest === 'dog' || contest === 'cork') {
    opening = false;
    window.dispatchEvent(new CustomEvent('party-select', {detail:{mode:contest}}));
  } else playFilm();
})();
