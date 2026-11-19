import type { ScenePosition } from "../model/geometry.ts";
import { EmitterMotionKind } from "../model/sound.ts";
import type { SoundAssets, SoundCue, SoundEmitter, SoundEmitterId, Soundscape } from "../model/sound.ts";
import { interpolatePosition, pathMotion, spatialMix } from "./spatial.ts";

interface Voice {
  readonly source: AudioBufferSourceNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
  readonly pan: StereoPannerNode;
  readonly startedAt: number;
  readonly duration: number;
}

interface EmitterPlayback {
  readonly emitter: SoundEmitter;
  readonly positionAt: (progress: number) => ScenePosition;
  nextAt: number;
  voice?: Voice;
}

const parameterSmoothing = 0.045;
const listenerSmoothing = 0.12;
const minimumEventGap = 0.5;

export class SoundEngine {
  private readonly rainBus: GainNode;
  private readonly townBus: GainNode;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly loading = new Map<string, Promise<void>>();
  private readonly emitters = new Map<SoundEmitterId, EmitterPlayback>();
  private readonly takeCycles = new Map<SoundCue, { remaining: AudioBuffer[]; last?: AudioBuffer }>();
  private rain?: AudioBufferSourceNode;
  private soundscape?: Soundscape;
  private listener: ScenePosition;
  private listenerTarget: ScenePosition;
  private lastUpdate?: number;
  private townFade = { from: 1, to: 1, start: 0, end: 0 };
  private nextTownEventAt = 0;
  private unlocked = false;
  private disposed = false;

  constructor(
    private readonly context: AudioContext,
    private readonly assets: SoundAssets,
    private readonly sceneWidth: number,
    initialListener: ScenePosition,
  ) {
    if (!Number.isFinite(sceneWidth) || sceneWidth <= 0) {
      throw new RangeError("The audio scene width must be positive.");
    }
    this.listener = initialListener;
    this.listenerTarget = initialListener;
    this.rainBus = context.createGain();
    this.townBus = context.createGain();
    this.rainBus.connect(context.destination);
    this.townBus.connect(context.destination);
  }

  /** Call directly from a trusted click or tap handler. */
  async unlock(): Promise<void> {
    if (this.disposed) return;
    await this.context.resume();
    this.unlocked = true;
    this.update();
  }

  /** Decode the available takes before installing a soundscape. Failed requests can be retried. */
  async preload(soundscape: Soundscape): Promise<void> {
    if (this.disposed) return;
    const cues = new Set<SoundCue>([soundscape.rain.cue]);
    for (const { profile } of soundscape.emitters) {
      for (const cue of profile.cues) cues.add(cue);
    }

    const urls = new Set<string>();
    for (const cue of cues) {
      for (const take of this.assets[cue] ?? []) urls.add(take.url);
    }
    await Promise.all([...urls].map((url) => this.loadBuffer(url)));
  }

  /** Install the replacement while the town bus is silent during fog cover. */
  setSoundscape(soundscape: Soundscape): void {
    if (this.disposed) return;
    this.soundscape = soundscape;
    const now = this.context.currentTime;
    const incoming = new Map(soundscape.emitters.map((emitter) => [emitter.id, emitter]));
    for (const [id, playback] of this.emitters) {
      if (incoming.get(id) === playback.emitter) continue;
      if (playback.voice) this.nextTownEventAt = Math.min(this.nextTownEventAt, now + minimumEventGap);
      this.stopVoice(playback);
      this.emitters.delete(id);
    }

    for (const emitter of incoming.values()) {
      if (this.emitters.has(emitter.id)) continue;
      const motion = emitter.motion;
      this.emitters.set(emitter.id, {
        emitter,
        positionAt: motion.kind === EmitterMotionKind.Stationary
          ? () => motion.position
          : pathMotion(motion.path, this.sceneWidth),
        nextAt: now + this.eventGap(emitter),
      });
    }
    this.rainBus.gain.setTargetAtTime(soundscape.rain.gain, now, parameterSmoothing);
    this.startRain();
  }

  setListenerTarget(position: ScenePosition): void {
    this.listenerTarget = position;
  }

  /** Pass the fog cover or reveal duration to synchronize both transitions. */
  fadeTown(level: number, durationMs: number): void {
    if (this.disposed) return;
    const now = this.context.currentTime;
    const from = this.townLevel(now);
    const to = Math.max(0, Math.min(1, level));
    const end = now + Math.max(0, durationMs) / 1000;
    const gain = this.townBus.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(end > now ? from : to, now);
    if (end > now) gain.linearRampToValueAtTime(to, end);
    this.townFade = { from, to, start: now, end };
  }

  /** Advance listener easing, moving sources, and cue scheduling from the render loop. */
  update(): void {
    if (this.disposed || !this.unlocked || this.context.state !== "running") return;
    const now = this.context.currentTime;
    const elapsed = now - (this.lastUpdate ?? now);
    this.lastUpdate = now;
    this.listener = interpolatePosition(this.listener, this.listenerTarget, 1 - Math.exp(-elapsed / listenerSmoothing));
    this.startRain();

    const canStart = this.townFade.to > 0 && now >= this.nextTownEventAt;
    let due: EmitterPlayback | undefined;
    for (const playback of this.emitters.values()) {
      if (playback.voice) {
        const { startedAt, duration } = playback.voice;
        this.updateVoice(playback, playback.voice, (now - startedAt) / duration, now);
      } else if (canStart && playback.nextAt <= now && (!due || playback.nextAt < due.nextAt)) {
        due = playback;
      }
    }
    if (due) this.playEvent(due, now);
  }

  /** Release the engine's audio nodes. The caller owns the AudioContext. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rain) {
      this.rain.stop();
      this.rain.disconnect();
    }
    for (const playback of this.emitters.values()) this.stopVoice(playback);
    this.emitters.clear();
    this.buffers.clear();
    this.loading.clear();
    this.takeCycles.clear();
    this.rainBus.disconnect();
    this.townBus.disconnect();
    delete this.rain;
    delete this.soundscape;
  }

  private loadBuffer(url: string): Promise<void> {
    if (this.buffers.has(url)) return Promise.resolve();
    const pending = this.loading.get(url);
    if (pending) return pending;
    const load = (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Unable to load sound ${url} (HTTP ${response.status}).`);
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      if (!this.disposed) this.buffers.set(url, buffer);
    })().finally(() => this.loading.delete(url));
    this.loading.set(url, load);
    return load;
  }

  private take(cue: SoundCue): AudioBuffer | undefined {
    const cycle = this.takeCycles.get(cue) ?? { remaining: [] };
    if (cycle.remaining.length === 0) {
      const available = new Set<AudioBuffer>();
      for (const { url } of this.assets[cue] ?? []) {
        const buffer = this.buffers.get(url);
        if (buffer) available.add(buffer);
      }
      cycle.remaining = [...available];
      for (let index = cycle.remaining.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [cycle.remaining[index], cycle.remaining[other]] = [cycle.remaining[other]!, cycle.remaining[index]!];
      }
      const lastIndex = cycle.remaining.length - 1;
      if (lastIndex > 0 && cycle.remaining[lastIndex] === cycle.last) {
        [cycle.remaining[0], cycle.remaining[lastIndex]] = [cycle.remaining[lastIndex]!, cycle.remaining[0]!];
      }
    }
    const buffer = cycle.remaining.pop();
    if (buffer) {
      cycle.last = buffer;
      this.takeCycles.set(cue, cycle);
    }
    return buffer;
  }

  private startRain(): void {
    if (!this.unlocked || this.rain || !this.soundscape || this.context.state !== "running") return;
    const buffer = this.take(this.soundscape.rain.cue);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.rainBus);
    source.start();
    this.rain = source;
  }

  private townLevel(now: number): number {
    const { from, to, start, end } = this.townFade;
    return now >= end ? to : from + (to - from) * (now - start) / (end - start);
  }

  private eventGap({ profile }: SoundEmitter): number {
    const { min, max } = profile.gapMs;
    return Math.max(minimumEventGap, (min + Math.random() * (max - min)) / 1000);
  }

  private playEvent(playback: EmitterPlayback, now: number): void {
    const cues = playback.emitter.profile.cues.filter((cue) =>
      this.assets[cue]?.some(({ url }) => this.buffers.has(url)));
    const cue = cues[Math.floor(Math.random() * cues.length)];
    const buffer = cue && this.take(cue);
    const gap = this.eventGap(playback.emitter);
    playback.nextAt = now + gap;
    if (!buffer) return;

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.Q.value = 0;
    source.connect(filter).connect(gain).connect(pan).connect(this.townBus);
    const voice = { source, filter, gain, pan, startedAt: now, duration: buffer.duration };
    source.onended = () => this.disconnectVoice(playback, voice);
    playback.voice = voice;
    this.updateVoice(playback, voice, 0, now, true);
    source.start(now);
    playback.nextAt += buffer.duration;
    this.nextTownEventAt = now + buffer.duration + minimumEventGap;
  }

  private updateVoice(playback: EmitterPlayback, voice: Voice, progress: number, now: number, initial = false): void {
    const mix = spatialMix(playback.positionAt(progress), this.listener, this.sceneWidth, playback.emitter.placement);
    const gain = mix.gain * playback.emitter.profile.gain;
    if (initial) {
      voice.gain.gain.setValueAtTime(gain, now);
      voice.pan.pan.setValueAtTime(mix.pan, now);
      voice.filter.frequency.setValueAtTime(mix.cutoff, now);
    } else {
      voice.gain.gain.setTargetAtTime(gain, now, parameterSmoothing);
      voice.pan.pan.setTargetAtTime(mix.pan, now, parameterSmoothing);
      voice.filter.frequency.setTargetAtTime(mix.cutoff, now, parameterSmoothing);
    }
  }

  private stopVoice(playback: EmitterPlayback): void {
    const voice = playback.voice;
    if (!voice) return;
    voice.source.stop();
    this.disconnectVoice(playback, voice);
  }

  private disconnectVoice(playback: EmitterPlayback, voice: Voice): void {
    voice.source.onended = null;
    voice.source.disconnect();
    voice.filter.disconnect();
    voice.gain.disconnect();
    voice.pan.disconnect();
    delete playback.voice;
  }
}
