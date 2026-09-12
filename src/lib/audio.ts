let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let windGain: GainNode | null = null;
let rainGain: GainNode | null = null;
let started = false;

function noiseBuffer(c: AudioContext, seconds: number) {
  const buffer = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export async function unlockAudio() {
  if (started) return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  await ctx.resume();
  master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 2);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  windGain = ctx.createGain();
  windGain.gain.value = 0;
  src.connect(filter);
  filter.connect(windGain);
  windGain.connect(master);
  src.start();

  const rainSrc = ctx.createBufferSource();
  rainSrc.buffer = noiseBuffer(ctx, 1.5);
  rainSrc.loop = true;
  const rainFilter = ctx.createBiquadFilter();
  rainFilter.type = "highpass";
  rainFilter.frequency.value = 1800;
  rainGain = ctx.createGain();
  rainGain.gain.value = 0;
  rainSrc.connect(rainFilter);
  rainFilter.connect(rainGain);
  rainGain.connect(master);
  rainSrc.start();

  started = true;
}

export function setWeatherAudio(weather: number) {
  if (!ctx || !windGain || !rainGain) return;
  const now = ctx.currentTime;
  windGain.gain.linearRampToValueAtTime(weather * 0.55, now + 0.12);
  rainGain.gain.linearRampToValueAtTime(weather * 0.32, now + 0.12);
}

export function thunder() {
  if (!ctx || !master) return;
  const burst = ctx.createBufferSource();
  burst.buffer = noiseBuffer(ctx, 0.8);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 180;
  const g = ctx.createGain();
  g.gain.value = 0.9;
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
  burst.connect(filter);
  filter.connect(g);
  g.connect(master);
  burst.start();
  burst.stop(ctx.currentTime + 1.5);
}
