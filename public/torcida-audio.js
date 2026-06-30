(() => {
  let ctx, source, gain, lfo, playing = false;
  const btn = document.getElementById('soundBtn');

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

  async function start() {
    if (playing) return;
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
    playing = true;
    if (btn) btn.textContent = '⏸ Pausar torcida';
  }

  function stop() {
    if (!playing) return;
    try { source && source.stop(); } catch(e) {}
    try { lfo && lfo.stop(); } catch(e) {}
    try { gain && gain.disconnect(); } catch(e) {}
    source = null; lfo = null; gain = null;
    playing = false;
    if (btn) btn.textContent = '🔊 Ativar torcida';
  }

  window.toggleTorcida = async () => {
    if (playing) stop();
    else await start();
  };

  window.addEventListener('load', () => {
    start().catch(() => { if (btn) btn.textContent = '🔊 Ativar torcida'; });
  });

  document.addEventListener('click', () => {
    if (!playing) start().catch(() => {});
  }, { once: true });
})();