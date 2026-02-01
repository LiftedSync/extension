import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'LiftedSync',
    description: 'Synchronized YouTube, Crunchyroll, Netflix & Prime Video watching',
    browser_specific_settings: {
      gecko: {
        id: 'liftedsync@lifted.app',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
    permissions: ['storage', 'tabs'],
    host_permissions: [
      '*://www.youtube.com/*',
      '*://www.crunchyroll.com/*',
      '*://static.crunchyroll.com/*',
      '*://www.netflix.com/*',
      '*://www.primevideo.com/*',
      '*://www.amazon.com/gp/video/*',
      '*://www.amazon.de/gp/video/*',
    ],
    web_accessible_resources: [
      {
        resources: ['netflix-inject.js'],
        matches: ['*://www.netflix.com/*'],
      },
    ],
  },
});