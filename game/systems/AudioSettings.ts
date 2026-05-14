export interface AudioSettings {
  bgmEnabled: boolean;
  seEnabled: boolean;
}

const AUDIO_SETTINGS_KEY = "cyber-tokyo-runner-audio";
const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  bgmEnabled: true,
  seEnabled: true
};

export function loadAudioSettings(): AudioSettings {
  if (typeof window === "undefined") {
    return DEFAULT_AUDIO_SETTINGS;
  }

  const savedSettings = window.localStorage.getItem(AUDIO_SETTINGS_KEY);

  if (!savedSettings) {
    return DEFAULT_AUDIO_SETTINGS;
  }

  try {
    const parsed = JSON.parse(savedSettings) as Partial<AudioSettings>;

    return {
      bgmEnabled: parsed.bgmEnabled ?? DEFAULT_AUDIO_SETTINGS.bgmEnabled,
      seEnabled: parsed.seEnabled ?? DEFAULT_AUDIO_SETTINGS.seEnabled
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export function saveAudioSettings(settings: AudioSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
}
