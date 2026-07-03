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
    // Quando o áudio parar por qualquer motivo, tenta retomar
    audio.addEventListener('pause', () => {
      if (playing) {
        setTimeout(() => { try { audio.play(); } catch(e){} }, 300);
      }
    });
  }

  async function startAudio() {
    createAudio();
    try {
      await audio.play();
      playing = true;
      setBtn(false);
      sessionStorage.setItem('pappi_audio', '1');
    } catch (e) {
      playing = false;
      setBtn(true);
    }
  }

  function pauseAudio() {
    playing = false;
    sessionStorage.setItem('pappi_audio', '0');
    if (audio) audio.pause();
    setBtn(true);
  }

  // Botão: só pausa / retoma
  window.toggleTorcida = () => {
    if (playing) pauseAudio();
    else startAudio();
  };

  // Tenta autoplay imediato
  function tryAutoplay() {
    // Se o usuário pausou manualmente, respeita a escolha
    if (sessionStorage.getItem('pappi_audio') === '0') {
      setBtn(true);
      return;
    }
    startAudio();
  }

  // 1ª tentativa: ao carregar o DOM
  document.addEventListener('DOMContentLoaded', tryAutoplay);

  // 2ª tentativa: ao carregar tudo (fallback)
  window.addEventListener('load', () => { if (!playing) tryAutoplay(); });

  // 3ª tentativa: no primeiro gesto do usuário (obrigatório em alguns browsers)
  function onFirstGesture() {
    if (!playing && sessionStorage.getItem('pappi_audio') !== '0') {
      startAudio();
    }
  }
  document.addEventListener('click',      onFirstGesture, { once: true });
  document.addEventListener('touchstart', onFirstGesture, { once: true });
  document.addEventListener('keydown',    onFirstGesture, { once: true });
  document.addEventListener('scroll',     onFirstGesture, { once: true });

  // 4ª tentativa: visibilidade — retoma se a aba voltar ao foco
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !playing && sessionStorage.getItem('pappi_audio') !== '0') {
      startAudio();
    }
  });
})();
