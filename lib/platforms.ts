import type { Platform } from './types';

interface PlatformConfig {
  urlPatterns: string[];
  urlMatches: string[];
  label: string;
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  youtube: {
    urlPatterns: ['*://www.youtube.com/*', '*://youtu.be/*'],
    urlMatches: ['youtube.com', 'youtu.be'],
    label: 'YouTube',
  },
  crunchyroll: {
    urlPatterns: ['*://www.crunchyroll.com/*', '*://static.crunchyroll.com/*'],
    urlMatches: ['crunchyroll.com'],
    label: 'Crunchyroll',
  },
  netflix: {
    urlPatterns: ['*://www.netflix.com/*'],
    urlMatches: ['netflix.com'],
    label: 'Netflix',
  },
  primevideo: {
    urlPatterns: [
      '*://www.primevideo.com/*',
      '*://www.amazon.com/gp/video/*',
      '*://www.amazon.de/gp/video/*',
    ],
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

export function getUrlPatternsForPlatform(platform: Platform): string[] {
  return PLATFORM_CONFIGS[platform].urlPatterns;
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