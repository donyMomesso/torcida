(() => {
  const btn = document.getElementById('soundBtn');
  let audio = null;
  let playing = false;

  function setBtn(paused) {
    if (btn) btn.textContent = paused ? '🔊 Retomar som' : '⏸ Pausar som';
  }

  function createAudio() {
    if (audio) return;
    audio = new Audio('/public/torcida-audio.mp3');
    audio.loop = true;
    audio.volume = 0.30;
  }

  async function play() {
    createAudio();
    try {
      await audio.play();
      playing = true;
      setBtn(false);
    } catch (e) {
      // Autoplay bloqueado pelo navegador — aguarda primeiro clique do usuário
      playing = false;
      setBtn(true);
    }
  }

  function pause() {
    if (audio) audio.pause();
    playing = false;
    setBtn(true);
  }

  // Botão alterna pausar / retomar
  window.toggleTorcida = () => {
    if (playing) pause();
    else play();
  };

  // Tenta autoplay assim que o DOM estiver pronto
  window.addEventListener('DOMContentLoaded', () => play());

  // Fallback: se o autoplay for bloqueado, toca no primeiro clique/toque do usuário
  document.addEventListener('click', () => { if (!playing) play(); }, { once: true });
  document.addEventListener('touchstart', () => { if (!playing) play(); }, { once: true });
})();
