import type { Platform } from './types';

interface PlatformConfig {
  urlMatches: string[];
  label: string;
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  youtube: {
    urlMatches: ['youtube.com', 'youtu.be'],
    label: 'YouTube',
  },
  crunchyroll: {
    urlMatches: ['crunchyroll.com'],
    label: 'Crunchyroll',
  },
  netflix: {
    urlMatches: ['netflix.com'],
    label: 'Netflix',
  },
  primevideo: {
    urlMatches: ['primevideo.com', 'amazon.com/gp/video', 'amazon.de/gp/video'],
    label: 'Prime Video',
  },
};

export function detectPlatformFromUrl(url: string): Platform | null {
  for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
    if (config.urlMatches.some((match) => url.includes(match))) {
      return platform as Platform;
    }
  }
  return null;
}

export function isSupportedUrl(url: string): boolean {
  return detectPlatformFromUrl(url) !== null;
}

export function isValidUrlForPlatform(url: string, platform: Platform): boolean {
  const config = PLATFORM_CONFIGS[platform];
  return config.urlMatches.some((match) => url.includes(match));
}

export function getPlatformLabel(platform: Platform): string {
  return PLATFORM_CONFIGS[platform].label;
}
