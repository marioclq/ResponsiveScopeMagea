import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'ResponsiveScope',
  description: 'Smartphone and tablet simulator for responsive web testing.',
  version: '0.1.0',
  icons: { '32': 'icons/32.png', '48': 'icons/48.png', '128': 'icons/128.png' },
  action: { default_title: 'Open ResponsiveScope' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  permissions: [
    'scripting', 'tabs', 'activeTab', 'declarativeNetRequest',
    'offscreen', 'tabCapture', 'storage', 'downloads',
  ],
  host_permissions: ['<all_urls>'],
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/frame-spoofer.ts', 'src/content/spoofer.ts'],
      run_at: 'document_start',
      all_frames: true,
      world: 'MAIN',
    },
  ],
  web_accessible_resources: [
    { resources: ['src/simulator/index.html', 'src/offscreen/offscreen.html'], matches: ['<all_urls>'] },
  ],
});
