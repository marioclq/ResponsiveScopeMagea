# ResponsiveScope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clean MV3 Chrome extension (ResponsiveScope) that simulates phones/tablets — device frame, two-layer UA spoofing, screenshots, screencast — with no proprietary backend.

**Architecture:** Toolbar icon opens a dedicated React simulator page in its own tab. The target URL loads in an iframe sized to a device viewport. Spoofing is two-layer: `declarativeNetRequest` session rules (scoped to the simulator tabId) rewrite request headers and strip frame-blocking response headers; MAIN-world content scripts override `navigator`/`screen`/touch and hide `frameElement`. Screenshots use `captureVisibleTab` + crop; screencast uses an offscreen document + `tabCapture` + `MediaRecorder`.

**Tech Stack:** TypeScript, React 18, Vite, `@crxjs/vite-plugin`, Vitest (unit tests for pure libs), Chrome MV3 APIs.

Working directory for all paths: `c:\Users\Mario\Downloads\responsivescope` (already git-init'd, contains `docs/`).

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `manifest.config.ts`, `vitest.config.ts`, `src/vite-env.d.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "responsivescope",
  "version": "0.1.0",
  "description": "Smartphone and tablet simulator for responsive web testing.",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.26",
    "@types/chrome": "^0.0.270",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["chrome", "vite/client"]
  },
  "include": ["src", "manifest.config.ts", "vite.config.ts"]
}
```

- [ ] **Step 3: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 4: Create `manifest.config.ts`**

```ts
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
    { resources: ['src/simulator/index.html'], matches: ['<all_urls>'] },
  ],
});
```

- [ ] **Step 5: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: { port: 5173, strictPort: true, hmr: { port: 5173 } },
});
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 7: Install deps**

Run: `npm install`
Expected: completes, `node_modules/` populated, no peer-dep errors that block install.

- [ ] **Step 8: Add placeholder icons**

Copy reference icons so the build has them:
Run: `mkdir -p public/icons && cp ../magea/icons/32.png ../magea/icons/48.png ../magea/icons/128.png public/icons/`
Expected: three PNGs in `public/icons/`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold ResponsiveScope (vite + react + crxjs)"
```

---

### Task 2: Device catalog (`lib/devices.ts`) — TDD

**Files:**
- Create: `src/lib/devices.ts`
- Test: `src/lib/devices.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { DEVICES, getDevice, DEVICE_GROUPS } from './devices';

describe('devices catalog', () => {
  it('has at least 12 devices', () => {
    expect(DEVICES.length).toBeGreaterThanOrEqual(12);
  });

  it('every device has required fields and positive dimensions', () => {
    for (const d of DEVICES) {
      expect(d.id).toBeTruthy();
      expect(d.name).toBeTruthy();
      expect(['apple', 'android', 'tablet', 'custom']).toContain(d.group);
      expect(d.width).toBeGreaterThan(0);
      expect(d.height).toBeGreaterThan(0);
      expect(d.devicePixelRatio).toBeGreaterThan(0);
      expect(d.userAgent).toContain('Mozilla/5.0');
      expect(typeof d.hasTouch).toBe('boolean');
    }
  });

  it('device ids are unique', () => {
    const ids = DEVICES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getDevice returns by id and undefined for unknown', () => {
    expect(getDevice(DEVICES[0].id)?.id).toBe(DEVICES[0].id);
    expect(getDevice('nope')).toBeUndefined();
  });

  it('DEVICE_GROUPS lists groups present in catalog', () => {
    expect(DEVICE_GROUPS).toContain('apple');
    expect(DEVICE_GROUPS).toContain('android');
    expect(DEVICE_GROUPS).toContain('tablet');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- devices`
Expected: FAIL — cannot find module `./devices`.

- [ ] **Step 3: Write `src/lib/devices.ts`**

```ts
export type DeviceGroup = 'apple' | 'android' | 'tablet' | 'custom';

export interface UserAgentData {
  mobile: boolean;
  platform: string;
  brands: { brand: string; version: string }[];
}

export interface Device {
  id: string;
  name: string;
  group: DeviceGroup;
  width: number;
  height: number;
  devicePixelRatio: number;
  userAgent: string;
  userAgentData?: UserAgentData;
  hasTouch: boolean;
}

const IOS_UA = (model: string, os: string) =>
  `Mozilla/5.0 (${model}; CPU iPhone OS ${os} like Mac OS X) AppleWebKit/605.1.15 ` +
  `(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`;

const IPAD_UA =
  `Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ` +
  `(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`;

const ANDROID_UA = (model: string) =>
  `Mozilla/5.0 (Linux; Android 14; ${model}) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36`;

const CHROME_BRANDS = [
  { brand: 'Not/A)Brand', version: '8' },
  { brand: 'Chromium', version: '126' },
  { brand: 'Google Chrome', version: '126' },
];

export const DEVICES: Device[] = [
  { id: 'iphone-se', name: 'iPhone SE', group: 'apple', width: 375, height: 667, devicePixelRatio: 2, userAgent: IOS_UA('iPhone', '17_0'), hasTouch: true },
  { id: 'iphone-14', name: 'iPhone 14', group: 'apple', width: 390, height: 844, devicePixelRatio: 3, userAgent: IOS_UA('iPhone', '17_0'), hasTouch: true },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', group: 'apple', width: 393, height: 852, devicePixelRatio: 3, userAgent: IOS_UA('iPhone', '17_0'), hasTouch: true },
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', group: 'apple', width: 402, height: 874, devicePixelRatio: 3, userAgent: IOS_UA('iPhone', '18_0'), hasTouch: true },
  { id: 'pixel-7', name: 'Pixel 7', group: 'android', width: 412, height: 915, devicePixelRatio: 2.625, userAgent: ANDROID_UA('Pixel 7'), userAgentData: { mobile: true, platform: 'Android', brands: CHROME_BRANDS }, hasTouch: true },
  { id: 'pixel-8', name: 'Pixel 8', group: 'android', width: 412, height: 915, devicePixelRatio: 2.625, userAgent: ANDROID_UA('Pixel 8'), userAgentData: { mobile: true, platform: 'Android', brands: CHROME_BRANDS }, hasTouch: true },
  { id: 'galaxy-s20', name: 'Galaxy S20', group: 'android', width: 360, height: 800, devicePixelRatio: 3, userAgent: ANDROID_UA('SM-G980F'), userAgentData: { mobile: true, platform: 'Android', brands: CHROME_BRANDS }, hasTouch: true },
  { id: 'galaxy-s24', name: 'Galaxy S24', group: 'android', width: 360, height: 780, devicePixelRatio: 3, userAgent: ANDROID_UA('SM-S921B'), userAgentData: { mobile: true, platform: 'Android', brands: CHROME_BRANDS }, hasTouch: true },
  { id: 'ipad-10', name: 'iPad (10th gen)', group: 'tablet', width: 820, height: 1180, devicePixelRatio: 2, userAgent: IPAD_UA, hasTouch: true },
  { id: 'ipad-mini', name: 'iPad Mini', group: 'tablet', width: 744, height: 1133, devicePixelRatio: 2, userAgent: IPAD_UA, hasTouch: true },
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', group: 'tablet', width: 834, height: 1194, devicePixelRatio: 2, userAgent: IPAD_UA, hasTouch: true },
  { id: 'galaxy-tab-s9', name: 'Galaxy Tab S9', group: 'tablet', width: 800, height: 1280, devicePixelRatio: 2, userAgent: ANDROID_UA('SM-X710'), userAgentData: { mobile: false, platform: 'Android', brands: CHROME_BRANDS }, hasTouch: true },
];

export const DEVICE_GROUPS: DeviceGroup[] = ['apple', 'android', 'tablet', 'custom'];

export function getDevice(id: string): Device | undefined {
  return DEVICES.find((d) => d.id === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- devices`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/devices.ts src/lib/devices.test.ts
git commit -m "feat: device catalog with typed models"
```

---

### Task 3: DNR rule builder (`lib/dnr.ts`) — TDD

**Files:**
- Create: `src/lib/dnr.ts`
- Test: `src/lib/dnr.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildRulesForDevice } from './dnr';
import { getDevice } from './devices';

const tabId = 42;

describe('buildRulesForDevice', () => {
  const device = getDevice('pixel-8')!;
  const rules = buildRulesForDevice(device, tabId);

  it('produces a header-modify rule and a frame-unblock rule', () => {
    expect(rules.length).toBe(2);
  });

  it('scopes every rule to the given tabId', () => {
    for (const r of rules) {
      expect(r.condition.tabIds).toEqual([tabId]);
    }
  });

  it('sets User-Agent to the device UA', () => {
    const hdr = rules[0].action.requestHeaders!.find((h) => h.header === 'user-agent');
    expect(hdr?.value).toBe(device.userAgent);
    expect(hdr?.operation).toBe('set');
  });

  it('sets sec-ch-ua-mobile to ?1 for mobile devices', () => {
    const m = rules[0].action.requestHeaders!.find((h) => h.header === 'sec-ch-ua-mobile');
    expect(m?.value).toBe('?1');
  });

  it('removes x-frame-options and content-security-policy response headers', () => {
    const removed = rules[1].action.responseHeaders!.map((h) => h.header);
    expect(removed).toContain('x-frame-options');
    expect(removed).toContain('content-security-policy');
    for (const h of rules[1].action.responseHeaders!) {
      expect(h.operation).toBe('remove');
    }
  });

  it('uses distinct numeric rule ids', () => {
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(typeof id).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- dnr`
Expected: FAIL — cannot find module `./dnr`.

- [ ] **Step 3: Write `src/lib/dnr.ts`**

```ts
import type { Device } from './devices';

// Two rule ids per simulator tab, derived from tabId so re-applying for the same
// tab always overwrites (we also remove-by-id before adding in the background SW).
export function ruleIdsForTab(tabId: number): [number, number] {
  const base = tabId * 2 + 1; // keep ids >= 1, non-overlapping per tab
  return [base, base + 1];
}

type RuleType = chrome.declarativeNetRequest.Rule;

function quote(v: string): string {
  return `"${v}"`;
}

function secChUa(device: Device): string {
  const brands = device.userAgentData?.brands;
  if (brands && brands.length) {
    return brands.map((b) => `${quote(b.brand)};v=${quote(b.version)}`).join(', ');
  }
  // Apple/Safari devices: Chromium does not send sec-ch-ua; emit empty.
  return '';
}

export function buildRulesForDevice(device: Device, tabId: number): RuleType[] {
  const [headerRuleId, frameRuleId] = ruleIdsForTab(tabId);
  const isMobile = device.userAgentData?.mobile ?? device.group !== 'tablet';
  const platform = device.userAgentData?.platform
    ?? (device.group === 'android' ? 'Android' : 'iOS');

  const requestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [
    { header: 'user-agent', operation: 'set', value: device.userAgent },
    { header: 'sec-ch-ua-mobile', operation: 'set', value: isMobile ? '?1' : '?0' },
    { header: 'sec-ch-ua-platform', operation: 'set', value: quote(platform) },
  ];
  const ch = secChUa(device);
  if (ch) {
    requestHeaders.push({ header: 'sec-ch-ua', operation: 'set', value: ch });
    requestHeaders.push({ header: 'sec-ch-ua-full-version-list', operation: 'set', value: ch });
  }

  const headerRule: RuleType = {
    id: headerRuleId,
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders },
    condition: { tabIds: [tabId], resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'] },
  };

  const frameRule: RuleType = {
    id: frameRuleId,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [
        { header: 'x-frame-options', operation: 'remove' },
        { header: 'content-security-policy', operation: 'remove' },
        { header: 'content-security-policy-report-only', operation: 'remove' },
      ],
    },
    condition: { tabIds: [tabId], resourceTypes: ['main_frame', 'sub_frame'] },
  };

  return [headerRule, frameRule];
}
```

> Note: removing the entire CSP header (not just `frame-ancestors`) is intentional — DNR cannot edit a single CSP directive. Acceptable because this only applies inside the simulator tab.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- dnr`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dnr.ts src/lib/dnr.test.ts
git commit -m "feat: declarativeNetRequest rule builder for UA + frame unblocking"
```

---

### Task 4: Message contracts (`lib/messages.ts`)

**Files:**
- Create: `src/lib/messages.ts`

- [ ] **Step 1: Write `src/lib/messages.ts`** (no test — pure types/constants)

```ts
import type { Device } from './devices';

export const ACTIVE_DEVICE_KEY = 'rs_active_device';

export interface ScreenshotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Msg =
  | { type: 'apply-device'; device: Device }
  | { type: 'clear-device' }
  | { type: 'screenshot'; rect: ScreenshotRect; deviceName: string }
  | { type: 'record-start'; tabId: number }
  | { type: 'record-stop' }
  | { type: 'recorder-data'; dataUrl: string } // offscreen -> SW
  | { type: 'recorder-error'; message: string };

export interface ScreenshotResult {
  ok: boolean;
  error?: string;
}

export type Sendable<T extends Msg['type']> = Extract<Msg, { type: T }>;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/messages.ts
git commit -m "feat: typed message contracts"
```

---

### Task 5: MAIN-world spoofers (`content/frame-spoofer.ts`, `content/spoofer.ts`)

**Files:**
- Create: `src/content/frame-spoofer.ts`
- Create: `src/content/spoofer.ts`

> These run in MAIN world at `document_start` in all frames. They no-op unless
> `window.name === 'responsivescope-frame'`. The active device is read
> synchronously from a global the SW injects is not possible here (MAIN world has
> no `chrome.storage`), so the spoofer reads device dimensions/UA from a JSON
> blob placed on `window.name` after the marker: format `responsivescope-frame:<base64 json>`.

- [ ] **Step 1: Write `src/content/frame-spoofer.ts`**

```ts
// Hides the fact that the page is framed. Idempotent across re-injection.
(() => {
  if (!window.name.startsWith('responsivescope-frame')) return;
  try {
    const d = Object.getOwnPropertyDescriptor(window, 'frameElement');
    const already = d && d.configurable === false && typeof d.get === 'function';
    if (!already) {
      Object.defineProperty(window, 'frameElement', {
        get: () => null,
        configurable: false,
      });
    }
  } catch {
    /* already frozen by a prior injection */
  }
})();
```

- [ ] **Step 2: Write `src/content/spoofer.ts`**

```ts
// MAIN-world device spoofer. Reads device config from window.name:
//   "responsivescope-frame:" + base64(JSON.stringify(cfg))
interface SpoofConfig {
  userAgent: string;
  platform: string;
  mobile: boolean;
  width: number;
  height: number;
  dpr: number;
  touch: boolean;
  brands: { brand: string; version: string }[];
}

(() => {
  const PREFIX = 'responsivescope-frame:';
  if (!window.name.startsWith(PREFIX)) return;

  let cfg: SpoofConfig;
  try {
    cfg = JSON.parse(atob(window.name.slice(PREFIX.length)));
  } catch {
    return;
  }

  const define = (obj: object, prop: string, value: unknown) => {
    try {
      Object.defineProperty(obj, prop, { get: () => value, configurable: true });
    } catch {
      /* ignore non-configurable */
    }
  };

  define(navigator, 'userAgent', cfg.userAgent);
  define(navigator, 'platform', cfg.mobile ? (cfg.platform === 'Android' ? 'Linux armv8l' : 'iPhone') : cfg.platform);
  define(navigator, 'maxTouchPoints', cfg.touch ? 5 : 0);

  // userAgentData (Chromium only)
  if (cfg.brands.length) {
    const uaData = {
      brands: cfg.brands,
      mobile: cfg.mobile,
      platform: cfg.platform,
      getHighEntropyValues: () =>
        Promise.resolve({ platform: cfg.platform, mobile: cfg.mobile, brands: cfg.brands }),
      toJSON: () => ({ brands: cfg.brands, mobile: cfg.mobile, platform: cfg.platform }),
    };
    define(navigator, 'userAgentData', uaData);
  }

  define(window, 'devicePixelRatio', cfg.dpr);
  define(screen, 'width', cfg.width);
  define(screen, 'height', cfg.height);
  define(screen, 'availWidth', cfg.width);
  define(screen, 'availHeight', cfg.height);

  if (cfg.touch && !('ontouchstart' in window)) {
    define(window, 'ontouchstart', null);
  }

  // Coerce pointer/hover media queries to coarse/none for touch devices.
  if (cfg.touch) {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => {
      if (/pointer:\s*coarse/.test(q)) return { ...orig(q), matches: true } as MediaQueryList;
      if (/hover:\s*none/.test(q)) return { ...orig(q), matches: true } as MediaQueryList;
      if (/pointer:\s*fine/.test(q)) return { ...orig(q), matches: false } as MediaQueryList;
      if (/hover:\s*hover/.test(q)) return { ...orig(q), matches: false } as MediaQueryList;
      return orig(q);
    };
  }
})();
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/content/
git commit -m "feat: MAIN-world UA/screen/touch spoofer + frame-element hider"
```

---

### Task 6: Background service worker (`background/index.ts`)

**Files:**
- Create: `src/background/index.ts`

- [ ] **Step 1: Write `src/background/index.ts`**

```ts
import { buildRulesForDevice, ruleIdsForTab } from '../lib/dnr';
import { ACTIVE_DEVICE_KEY, type Msg } from '../lib/messages';
import type { Device } from '../lib/devices';

const SIM_PAGE = 'src/simulator/index.html';
const simulatorTabs = new Set<number>();

// Open (or focus) the simulator page when the toolbar icon is clicked.
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL(SIM_PAGE);
  const tab = await chrome.tabs.create({ url });
  if (tab.id != null) simulatorTabs.add(tab.id);
});

async function applyDevice(tabId: number, device: Device) {
  const [a, b] = ruleIdsForTab(tabId);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [a, b],
    addRules: buildRulesForDevice(device, tabId),
  });
  await chrome.storage.session.set({ [`${ACTIVE_DEVICE_KEY}_${tabId}`]: device });
}

async function clearDevice(tabId: number) {
  const [a, b] = ruleIdsForTab(tabId);
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [a, b] });
  await chrome.storage.session.remove(`${ACTIVE_DEVICE_KEY}_${tabId}`);
}

// Screenshot: capture the simulator tab, crop to the frame rect via offscreen canvas.
async function screenshot(
  tabId: number,
  rect: { x: number; y: number; width: number; height: number },
  deviceName: string,
): Promise<void> {
  await chrome.tabs.update(tabId, { active: true });
  const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
  const cropped = await cropDataUrl(dataUrl, rect);
  await chrome.downloads.download({
    url: cropped,
    filename: `responsivescope/${slug(deviceName)}-${Date.now()}.png`,
  });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Crop runs in the SW via OffscreenCanvas + createImageBitmap (available in SW).
async function cropDataUrl(
  dataUrl: string,
  rect: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const dpr = 1; // captureVisibleTab returns device-pixel image; rect is in CSS px * dpr already handled by caller
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(rect.width * dpr, rect.height * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  const outBlob = await canvas.convertToBlob({ type: 'image/png' });
  return await blobToDataUrl(outBlob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

// ---- Screencast via offscreen document ----
async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument?.();
  if (existing) return;
  await chrome.offscreen.createDocument({
    url: 'src/offscreen/offscreen.html',
    reasons: ['USER_MEDIA' as chrome.offscreen.Reason],
    justification: 'Record the simulator tab to a video file.',
  });
}

chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  (async () => {
    switch (msg.type) {
      case 'apply-device':
        if (tabId != null) await applyDevice(tabId, msg.device);
        sendResponse({ ok: true });
        break;
      case 'clear-device':
        if (tabId != null) await clearDevice(tabId);
        sendResponse({ ok: true });
        break;
      case 'screenshot':
        if (tabId != null) {
          try {
            await screenshot(tabId, msg.rect, msg.deviceName);
            sendResponse({ ok: true });
          } catch (e) {
            sendResponse({ ok: false, error: String(e) });
          }
        }
        break;
      case 'record-start': {
        await ensureOffscreen();
        const streamId = await chrome.tabCapture.getMediaStreamId({
          targetTabId: msg.tabId,
        });
        chrome.runtime.sendMessage({ type: 'offscreen-start', streamId });
        sendResponse({ ok: true });
        break;
      }
      case 'record-stop':
        chrome.runtime.sendMessage({ type: 'offscreen-stop' });
        sendResponse({ ok: true });
        break;
      case 'recorder-data':
        await chrome.downloads.download({
          url: msg.dataUrl,
          filename: `responsivescope/recording-${Date.now()}.webm`,
        });
        await chrome.offscreen.closeDocument().catch(() => {});
        break;
    }
  })();
  return true; // async sendResponse
});

// Cleanup rules when a simulator tab closes.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (!simulatorTabs.has(tabId)) return;
  simulatorTabs.delete(tabId);
  await clearDevice(tabId).catch(() => {});
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `chrome.offscreen.Reason` cast complains, it is acceptable; adjust to `['USER_MEDIA']` plainly.

- [ ] **Step 3: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: background SW - device rules, screenshot crop, screencast orchestration"
```

---

### Task 7: Offscreen recorder (`offscreen/offscreen.html`, `offscreen/recorder.ts`)

**Files:**
- Create: `src/offscreen/offscreen.html`
- Create: `src/offscreen/recorder.ts`

- [ ] **Step 1: Write `src/offscreen/offscreen.html`**

```html
<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script type="module" src="./recorder.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Write `src/offscreen/recorder.ts`**

```ts
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let stream: MediaStream | null = null;

chrome.runtime.onMessage.addListener((msg: { type: string; streamId?: string }) => {
  if (msg.type === 'offscreen-start' && msg.streamId) void start(msg.streamId);
  if (msg.type === 'offscreen-stop') stop();
});

async function start(streamId: string) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // @ts-expect-error chrome-specific constraints
        mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId },
      },
    });
    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const dataUrl = await blobToDataUrl(blob);
      chrome.runtime.sendMessage({ type: 'recorder-data', dataUrl });
      stream?.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
  } catch (e) {
    chrome.runtime.sendMessage({ type: 'recorder-error', message: String(e) });
  }
}

function stop() {
  recorder?.stop();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/offscreen/
git commit -m "feat: offscreen MediaRecorder for tab screencast"
```

---

### Task 8: Simulator React app — shell + state

**Files:**
- Create: `src/simulator/index.html`
- Create: `src/simulator/main.tsx`
- Create: `src/simulator/App.tsx`
- Create: `src/simulator/styles.css`

- [ ] **Step 1: Write `src/simulator/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ResponsiveScope</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Write `src/simulator/main.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Write `src/simulator/App.tsx`**

```tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import { DEVICES, getDevice, type Device } from '../lib/devices';
import { AddressBar } from './components/AddressBar';
import { DevicePicker } from './components/DevicePicker';
import { DeviceFrame, type DeviceFrameHandle } from './components/DeviceFrame';
import { Toolbar } from './components/Toolbar';

export function App() {
  const [device, setDevice] = useState<Device>(DEVICES[1]);
  const [url, setUrl] = useState('https://example.com');
  const [landscape, setLandscape] = useState(false);
  const [recording, setRecording] = useState(false);
  const frameRef = useRef<DeviceFrameHandle>(null);

  const applyDevice = useCallback(async (d: Device) => {
    setDevice(d);
    await chrome.runtime.sendMessage({ type: 'apply-device', device: d });
  }, []);

  const onSelect = useCallback((id: string) => {
    const d = getDevice(id);
    if (d) void applyDevice(d);
  }, [applyDevice]);

  const navigate = useCallback((next: string) => {
    const withProto = /^https?:\/\//.test(next) ? next : `https://${next}`;
    setUrl(withProto);
  }, []);

  const screenshot = useCallback(async () => {
    const rect = frameRef.current?.getViewportRect();
    if (!rect) return;
    await chrome.runtime.sendMessage({ type: 'screenshot', rect, deviceName: device.name });
  }, [device]);

  const toggleRecord = useCallback(async () => {
    if (!recording) {
      const tabId = (await chrome.tabs.getCurrent())?.id;
      if (tabId == null) return;
      await chrome.runtime.sendMessage({ type: 'record-start', tabId });
      setRecording(true);
    } else {
      await chrome.runtime.sendMessage({ type: 'record-stop' });
      setRecording(false);
    }
  }, [recording]);

  const dims = useMemo(
    () => (landscape ? { w: device.height, h: device.width } : { w: device.width, h: device.height }),
    [device, landscape],
  );

  return (
    <div className="app">
      <header className="topbar">
        <DevicePicker devices={DEVICES} value={device.id} onChange={onSelect} />
        <AddressBar url={url} onNavigate={navigate} onReload={() => frameRef.current?.reload()} />
        <Toolbar
          recording={recording}
          onRotate={() => setLandscape((v) => !v)}
          onScreenshot={screenshot}
          onToggleRecord={toggleRecord}
        />
      </header>
      <main className="stage">
        <DeviceFrame ref={frameRef} device={device} url={url} width={dims.w} height={dims.h} />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/simulator/styles.css`**

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
.app { display: flex; flex-direction: column; height: 100vh; background: #f3f4f6; }
.topbar {
  display: flex; gap: 12px; align-items: center;
  padding: 8px 12px; background: #1f2937; color: #fff;
}
.stage {
  flex: 1; display: flex; align-items: center; justify-content: center;
  overflow: auto; padding: 24px;
}
.device-bezel {
  background: #111; border-radius: 36px; padding: 14px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.35);
}
.device-bezel iframe { border: 0; border-radius: 22px; background: #fff; display: block; }
button { cursor: pointer; }
```

- [ ] **Step 5: Typecheck (components not yet present → expect errors, that's fine here)**

Skip standalone typecheck until Task 9 components exist. Proceed.

- [ ] **Step 6: Commit**

```bash
git add src/simulator/index.html src/simulator/main.tsx src/simulator/App.tsx src/simulator/styles.css
git commit -m "feat: simulator app shell + state wiring"
```

---

### Task 9: Simulator components

**Files:**
- Create: `src/simulator/components/AddressBar.tsx`
- Create: `src/simulator/components/DevicePicker.tsx`
- Create: `src/simulator/components/Toolbar.tsx`
- Create: `src/simulator/components/DeviceFrame.tsx`

- [ ] **Step 1: Write `src/simulator/components/AddressBar.tsx`**

```tsx
import { useEffect, useState } from 'react';

interface Props {
  url: string;
  onNavigate: (url: string) => void;
  onReload: () => void;
}

export function AddressBar({ url, onNavigate, onReload }: Props) {
  const [value, setValue] = useState(url);
  useEffect(() => setValue(url), [url]);

  return (
    <form
      className="addressbar"
      style={{ flex: 1, display: 'flex', gap: 6 }}
      onSubmit={(e) => { e.preventDefault(); onNavigate(value.trim()); }}
    >
      <button type="button" onClick={onReload} title="Reload">⟳</button>
      <input
        style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none' }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="example.com"
      />
      <button type="submit">Go</button>
    </form>
  );
}
```

- [ ] **Step 2: Write `src/simulator/components/DevicePicker.tsx`**

```tsx
import { DEVICE_GROUPS, type Device } from '../../lib/devices';

interface Props {
  devices: Device[];
  value: string;
  onChange: (id: string) => void;
}

const GROUP_LABEL: Record<string, string> = {
  apple: 'Apple Phones',
  android: 'Android Phones',
  tablet: 'Tablets',
  custom: 'Custom',
};

export function DevicePicker({ devices, value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ padding: '6px 8px', borderRadius: 6 }}
    >
      {DEVICE_GROUPS.map((g) => {
        const items = devices.filter((d) => d.group === g);
        if (!items.length) return null;
        return (
          <optgroup key={g} label={GROUP_LABEL[g]}>
            {items.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.width}×{d.height}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
```

- [ ] **Step 3: Write `src/simulator/components/Toolbar.tsx`**

```tsx
interface Props {
  recording: boolean;
  onRotate: () => void;
  onScreenshot: () => void;
  onToggleRecord: () => void;
}

export function Toolbar({ recording, onRotate, onScreenshot, onToggleRecord }: Props) {
  return (
    <div className="toolbar" style={{ display: 'flex', gap: 6 }}>
      <button onClick={onRotate} title="Rotate">⟲ Rotate</button>
      <button onClick={onScreenshot} title="Screenshot">📷</button>
      <button onClick={onToggleRecord} title="Record" style={{ color: recording ? '#f87171' : undefined }}>
        {recording ? '■ Stop' : '● Rec'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/simulator/components/DeviceFrame.tsx`**

```tsx
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { Device } from '../../lib/devices';
import type { ScreenshotRect } from '../../lib/messages';

export interface DeviceFrameHandle {
  reload: () => void;
  getViewportRect: () => ScreenshotRect | null;
}

interface Props {
  device: Device;
  url: string;
  width: number;
  height: number;
}

function buildFrameName(device: Device, width: number, height: number): string {
  const cfg = {
    userAgent: device.userAgent,
    platform: device.userAgentData?.platform ?? (device.group === 'android' ? 'Android' : 'iOS'),
    mobile: device.userAgentData?.mobile ?? device.group !== 'tablet',
    width,
    height,
    dpr: device.devicePixelRatio,
    touch: device.hasTouch,
    brands: device.userAgentData?.brands ?? [],
  };
  return 'responsivescope-frame:' + btoa(JSON.stringify(cfg));
}

export const DeviceFrame = forwardRef<DeviceFrameHandle, Props>(function DeviceFrame(
  { device, url, width, height },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);

  // Fit to available stage height (keep within ~80vh).
  useLayoutEffect(() => {
    const maxH = window.innerHeight * 0.8;
    setScale(height > maxH ? maxH / height : 1);
  }, [height]);

  useImperativeHandle(ref, () => ({
    reload: () => {
      const f = iframeRef.current;
      if (f) f.src = f.src;
    },
    getViewportRect: () => {
      const f = iframeRef.current;
      if (!f) return null;
      const r = f.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      return { x: r.x * dpr, y: r.y * dpr, width: r.width * dpr, height: r.height * dpr };
    },
  }));

  return (
    <div className="device-bezel" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
      <iframe
        ref={iframeRef}
        name={buildFrameName(device, width, height)}
        src={url}
        width={width}
        height={height}
        title="device-viewport"
      />
    </div>
  );
});
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/simulator/components/
git commit -m "feat: simulator components (address bar, picker, toolbar, device frame)"
```

---

### Task 10: Build + load + manual smoke test

**Files:** none (verification task)

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: `dist/` produced, no TS errors. If `@crxjs` reports a missing `src/simulator/index.html` in web_accessible_resources, confirm path matches manifest.

- [ ] **Step 2: Load unpacked**

In Chrome → `chrome://extensions` → enable Developer mode → Load unpacked → select `dist/`.
Expected: ResponsiveScope appears, no manifest errors.

- [ ] **Step 3: Smoke — frame + UA**

Click the toolbar icon → simulator tab opens. Pick "Pixel 8", navigate to a UA-gated site (e.g. a site with a distinct mobile layout). 
Expected: mobile layout served. Open DevTools on the iframe → console: `navigator.userAgent` shows Pixel 8 UA, `navigator.userAgentData.mobile === true`, `window.frameElement === null`.

- [ ] **Step 4: Smoke — frame-blocked site**

Navigate to a site that normally sets `X-Frame-Options` (e.g. github.com).
Expected: loads inside the frame (header stripped by DNR). If blocked, verify the DNR rule applied via `chrome://extensions` → service worker → `chrome.declarativeNetRequest.getSessionRules`.

- [ ] **Step 5: Smoke — rotate + screenshot**

Click Rotate (dimensions swap). Click 📷.
Expected: a PNG downloads to `Downloads/responsivescope/`, cropped to the device viewport.

- [ ] **Step 6: Smoke — record**

Click ● Rec, wait ~5s, click ■ Stop.
Expected: a `.webm` downloads and plays.

- [ ] **Step 7: Commit any fixes discovered, then tag**

```bash
git add -A
git commit -m "fix: smoke-test adjustments" || echo "no fixes needed"
git tag v0.1.0
```

---

## Self-Review Notes

- **Spec coverage:** device frame (Tasks 8–9), UA spoofing request layer (Task 3) + JS layer (Task 5), screenshots (Task 6 crop + Task 9 rect), screencast (Tasks 6–7), device catalog (Task 2), permissions trimmed (Task 1). All spec sections mapped.
- **Known follow-ups not in v1 (per spec non-goals):** full-page screenshots, ~50-device catalog, network throttling, custom-device editor UI (the `custom` group is defined but no editor yet — acceptable; catalog has 12 built-ins meeting the ≥12 bar).
- **Type consistency:** `DeviceFrameHandle.getViewportRect` returns `ScreenshotRect` (from `lib/messages.ts`), consumed by `screenshot` msg and SW `cropDataUrl`. `ruleIdsForTab` used in both `dnr.ts` and `background/index.ts`. `buildFrameName` prefix matches `spoofer.ts` PREFIX constant `responsivescope-frame:`.
