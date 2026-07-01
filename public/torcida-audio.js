(() => {
  const btn = document.getElementById('soundBtn');
  let htmlAudio = null;
  let usingFile = false;
  let ctx, source, gain, lfo, playing = false;

  function setBtn(text) {
    if (btn) btn.textContent = text;
  }

  async function tryAudioFile() {
    if (!htmlAudio) {
      htmlAudio = new Audio('/public/torcida.mp3');
      htmlAudio.loop = true;
      htmlAudio.volume = 0.28;
    }
    await htmlAudio.play();
    usingFile = true;
    playing = true;
    setBtn('⏸ Pausar torcida');
  }

  function bufferNoise(ctx, seconds = 2.2) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.025 * white) / 1.025;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  async function startGeneratedCrowd() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();

    gain = ctx.createGain();
    gain.gain.value = 0.05;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 720;
    band.Q.value = 0.45;

    source = ctx.createBufferSource();
    source.buffer = bufferNoise(ctx);
    source.loop = true;

    lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.22;
    lfoGain.gain.value = 0.018;

    source.connect(band);
    band.connect(gain);
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    gain.connect(ctx.destination);

    source.start();
    lfo.start();
    usingFile = false;
    playing = true;
    setBtn('⏸ Pausar torcida');
  }

  async function start() {
    if (playing) return;
    try {
      await tryAudioFile();
    } catch (e) {
      await startGeneratedCrowd();
    }
  }

  function stop() {
    if (!playing) return;
    if (usingFile && htmlAudio) {
      htmlAudio.pause();
    } else {
      try { source && source.stop(); } catch(e) {}
      try { lfo && lfo.stop(); } catch(e) {}
      try { gain && gain.disconnect(); } catch(e) {}
      source = null; lfo = null; gain = null;
    }
    playing = false;
    setBtn('🔊 Ativar torcida');
  }

  window.toggleTorcida = async () => {
    if (playing) stop();
    else await start().catch(() => setBtn('🔊 Ativar torcida'));
  };

  window.addEventListener('load', () => {
    start().catch(() => setBtn('🔊 Ativar torcida'));
  });

  document.addEventListener('click', () => {
    if (!playing) start().catch(() => {});
  }, { once: true });
})();