import { Platform, Vibration } from 'react-native';
import Sound from 'react-native-sound';
import { getBellSound } from '../data/defaultTimetable';
import { BellSoundId } from '../models/types';

/**
 * Foreground bell playback. Background/terminated playback is done by the OS
 * via the notification sound — JS cannot (and should not) keep running for it.
 */
const cache = new Map<BellSoundId, Sound>();
let current: Sound | undefined;
let initialised = false;

/** Three pulses, matching the three rings of every bell sound. */
const VIBRATION_PATTERN = Platform.select({
  android: [0, 400, 250, 400, 250, 400],
  default: [0, 400, 400],
}) as number[];

const init = () => {
  if (initialised) return;
  initialised = true;
  // 'Playback' + mixWithOthers: audible like an alarm, without killing other audio.
  Sound.setCategory('Playback', true);
};

const load = (id: BellSoundId): Promise<Sound> => {
  init();
  const cached = cache.get(id);
  if (cached?.isLoaded()) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const s = new Sound(getBellSound(id).fileName, Sound.MAIN_BUNDLE, err => {
      if (err) {
        reject(err);
        return;
      }
      cache.set(id, s);
      resolve(s);
    });
  });
};

export const bellService = {
  preload(id: BellSoundId) {
    load(id).catch(() => undefined);
  },

  async ring(id: BellSoundId, vibrate: boolean) {
    this.stop();
    if (vibrate) Vibration.vibrate(VIBRATION_PATTERN);
    try {
      const s = await load(id);
      current = s;
      s.setVolume(1);
      s.setNumberOfLoops(0); // play once: the file itself is exactly 3 rings
      s.play(() => {
        if (current === s) current = undefined;
      });
    } catch (e) {
      console.warn('[DailyBell] bell playback failed', e);
    }
  },

  stop() {
    Vibration.cancel();
    if (current) {
      current.stop();
      current = undefined;
    }
  },
};
