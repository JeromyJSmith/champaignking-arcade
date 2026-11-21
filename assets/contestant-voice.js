// A tiny formant synth for the pool cast. Each voice goes from “ee!” to breathy “ha-ha-ha”.
(() => {
  const profiles = [
    {pitch: 1.04, throat: 1.00, pace: 1.00},
    {pitch: 0.89, throat: 0.92, pace: 1.09},
    {pitch: 1.13, throat: 1.07, pace: 0.93},
    {pitch: 0.97, throat: 0.96, pace: 1.04}
  ];
  const breaths = new WeakMap();

  window.contestantVoice = function contestantVoice(scene, index = 0) {
    const audio = scene.sound?.context;
    if (!audio || audio.state !== 'running') return () => {};
    const voice = profiles[index] || profiles[0];
    const voiceBox = audio.createOscillator();
    voiceBox.type = 'sawtooth';
    const vibration = audio.createOscillator();
    vibration.frequency.value = 7.8;
    const vibrato = audio.createGain();
    vibrato.gain.value = 16;
    vibration.connect(vibrato).connect(voiceBox.detune);
    const vowel = audio.createGain();
    const air = audio.createGain();
    const mix = audio.createGain();
    const envelope = audio.createGain();
    const output = scene.sound.destination || audio.destination;
    mix.connect(envelope).connect(output);
    const start = audio.currentTime + 0.006;
    const at = t => start + t * voice.pace;
    const nodes = [voiceBox, vibration, vibrato, vowel, air, mix, envelope];

    if (!breaths.has(audio)) {
      const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.42), audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      breaths.set(audio, buffer);
    }
    const breath = audio.createBufferSource();
    breath.buffer = breaths.get(audio);
    breath.loop = true;
    breath.connect(air).connect(vowel);
    air.gain.value = 0.13;
    voiceBox.connect(vowel);
    nodes.push(breath);

    // Independently moving vowel resonances make the pitch slide read as a voice.
    for (const [ee, ah, level] of [[480, 800, 0.96], [2360, 1430, 0.64], [3160, 2950, 0.31]]) {
      const band = audio.createBiquadFilter();
      const gain = audio.createGain();
      band.type = 'bandpass';
      band.Q.value = 4.3;
      band.frequency.setValueAtTime(ee * voice.throat, start);
      band.frequency.exponentialRampToValueAtTime(ah * voice.throat, at(0.5));
      gain.gain.value = level;
      vowel.connect(band).connect(gain).connect(mix);
      nodes.push(band, gain);
    }

    function syllable(t, duration, onset, peak, tail, volume) {
      const hz = voiceBox.frequency;
      hz.setValueAtTime(onset * voice.pitch, at(t));
      hz.exponentialRampToValueAtTime(peak * voice.pitch, at(t + duration * 0.31));
      hz.exponentialRampToValueAtTime(tail * voice.pitch, at(t + duration));
      const gain = envelope.gain;
      gain.setValueAtTime(0.0001, at(t));
      gain.exponentialRampToValueAtTime(volume, at(t + 0.025));
      gain.exponentialRampToValueAtTime(volume * 0.7, at(t + duration * 0.67));
      gain.exponentialRampToValueAtTime(0.0001, at(t + duration));
    }

    envelope.gain.value = 0.0001;
    syllable(0, 0.34, 320, 700, 420, 0.44);
    syllable(0.46, 0.14, 584, 846, 572, 0.40);
    syllable(0.64, 0.13, 546, 802, 522, 0.35);
    syllable(0.81, 0.20, 528, 730, 416, 0.31);

    const sources = [voiceBox, vibration, breath];
    let done = false;
    function cleanup() {
      if (done) return;
      done = true;
      scene.events.off('shutdown', cleanup);
      for (const source of sources) source.stop();
      for (const node of nodes) node.disconnect();
    }
    voiceBox.onended = cleanup;
    scene.events.once('shutdown', cleanup);
    for (const source of sources) {
      source.start(start);
      source.stop(at(1.03));
    }
    return cleanup;
  };
})();
