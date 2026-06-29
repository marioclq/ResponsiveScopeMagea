# ResponsiveScope — Design Spec

**Date:** 2026-06-28
**Status:** Approved design, pre-implementation

## Summary

A Chrome MV3 extension that simulates smartphones/tablets for responsive web
testing. Clean, owned source — inspired by the commercial *WebMobileFirst*
extension (decompiled, used as functional reference only), but rebuilt from
scratch with **no proprietary backend, auth, paid tiers, or analytics**.

Built so features can be added cleanly over time. Reference copy lives in a
separate `magea/` folder and is never imported or shipped.

## Goals (v1)

Replicate the original's **core local features**:

1. **Device simulator frame** — render a target URL inside a device bezel at the
   device's logical viewport, scalable to fit the window, rotatable.
2. **User-agent spoofing** — make framed sites serve their mobile version via
   request-header + JS-runtime spoofing (UA string + client hints + touch).
3. **Screenshots** — capture the simulated viewport to PNG.
4. **Video screencast** — record the device view to a downloadable `.webm`.

### Non-goals (v1)

- No login, accounts, paid features, cloud sync, or analytics.
- No full-page (scrolling) screenshots — visible viewport only for v1.
- No pixel-perfect device-only video crop (cross-origin constraint; capture the
  simulator tab on a neutral background instead).
- Device catalog starts at ~12 models, not the original's ~50.

## Architecture

**Entry:** Click toolbar icon → background service worker opens a **dedicated
simulator page** (`simulator/index.html`) in its own tab. That page is the whole
UI; all spoofing is scoped to that tab only (`declarativeNetRequest` session
rules keyed by `condition.tabIds`).

**Why dedicated page (not in-page injection like the original):** full control of
the UI, no fights with host-page CSP, robust, and easy to extend. Trade-off: UX
differs slightly from the original's "activate on the current tab".

### Spoofing — two layers (mirrors original)

1. **Request headers (DNR)** — `declarativeNetRequest` `modifyHeaders` session
   rules scoped to the simulator tabId:
   - Set `User-Agent`, `sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform`,
     `sec-ch-ua-platform-version`, `sec-ch-ua-model`, `sec-ch-ua-full-version-list`.
   - **Remove** `X-Frame-Options` and the `frame-ancestors` directive from CSP
     response headers so any site can be iframed.
2. **JS runtime (content script, MAIN world)** — injected into frames, gated by
   `window.name === 'responsivescope-frame'`:
   - Override `navigator.userAgent`, `navigator.userAgentData`,
     `navigator.platform`, `navigator.maxTouchPoints`, `window.ontouchstart`.
   - Override `screen.width/height/availWidth/availHeight`,
     `window.innerWidth/innerHeight`, `devicePixelRatio`.
   - Patch `matchMedia` for `pointer: coarse` / `hover: none`.
   - Override `frameElement` → `null` (anti-frame-detection), idempotent.

## Components

```
responsivescope/
  manifest.config.ts          MV3 manifest (via @crxjs/vite-plugin)
  vite.config.ts
  package.json
  src/
    background/index.ts        SW: open page, manage DNR rules, screenshot +
                               record orchestration, message router
    simulator/
      index.html
      main.tsx
      App.tsx                  state: device, url, orientation, zoom, recording
      components/
        AddressBar.tsx         URL input + reload/back/forward
        DevicePicker.tsx       grouped dropdown (Apple / Android / Tablet / Custom)
        DeviceFrame.tsx        bezel + scaled iframe (name="responsivescope-frame")
        Toolbar.tsx            rotate, screenshot, record toggle, zoom
    content/
      spoofer.ts               MAIN-world navigator/screen/touch spoof
      frame-spoofer.ts         frameElement -> null
    offscreen/
      offscreen.html
      recorder.ts              tabCapture stream -> MediaRecorder -> webm
    lib/
      devices.ts               device catalog (typed)
      dnr.ts                   build/apply/clear DNR header rules for a tabId
      messages.ts              typed message contracts (SW <-> page <-> offscreen)
      capture.ts               screenshot crop helpers
  public/icons/                32/48/128 png
```

### Data model — device

```ts
interface Device {
  id: string;
  name: string;
  group: 'apple' | 'android' | 'tablet' | 'custom';
  width: number;          // logical viewport CSS px (portrait)
  height: number;
  devicePixelRatio: number;
  userAgent: string;
  userAgentData?: {        // navigator.userAgentData stub
    mobile: boolean;
    platform: string;
    brands: { brand: string; version: string }[];
  };
  hasTouch: boolean;
}
```

v1 catalog (~12): iPhone SE, iPhone 14, iPhone 15 Pro, iPhone 16 Pro,
Pixel 7, Pixel 8, Galaxy S20, Galaxy S24, iPad (10th), iPad Mini, iPad Pro 11",
plus a user-editable **Custom** entry persisted in `storage`.

## Data flow

- **Open:** icon click → `chrome.action.onClicked` → SW opens simulator tab →
  records tabId.
- **Select device / navigate:** page sends `{type:'apply-device', device, tabId}`
  to SW → SW rebuilds DNR rules for that tabId → page sets iframe `src`.
- **Spoofer:** content scripts auto-run at `document_start`, all frames, gated by
  `window.name`; read the active device from `chrome.storage.session` (written by
  SW on apply) so request-layer and JS-layer stay in sync.
- **Screenshot:** page → SW `{type:'screenshot', variant}` → `captureVisibleTab`
  → crop to frame rect (rect sent by page) → return data URL → `downloads`.
- **Record:** page → SW `{type:'record-start'}` → SW ensures offscreen doc →
  offscreen gets `tabCapture` stream for the simulator tab → MediaRecorder →
  on stop, blob → `downloads` `.webm`.

## Error handling

- Site still refuses to frame (rare residual CSP) → detect iframe `load` failure
  / `about:blank`, show inline banner "This site blocks embedding."
- `captureVisibleTab` requires the simulator tab active → if not, focus it first.
- `tabCapture` needs a user gesture + active tab → start only from the toolbar
  button click; surface permission errors in the toolbar.
- DNR rule limits → use session rules, always clear prior rules for the tabId
  before re-applying to avoid ID collisions; clear on tab close
  (`tabs.onRemoved`).

## Testing

- **Unit:** `lib/devices.ts` shape validation; `lib/dnr.ts` rule generation
  (correct headers per device, correct tabId scoping, strips XFO/CSP).
- **Manual smoke matrix:** load a known responsive site (e.g. a site that gates
  on UA), verify mobile layout served; rotate; screenshot both variants;
  record 5s and confirm playable webm; switch devices and confirm headers change
  (DevTools Network).
- **Anti-detection check:** `frameElement` is null inside iframe; `navigator.userAgentData.mobile === true`.

## Tooling / permissions

- `@crxjs/vite-plugin`, React 18, TypeScript, Vite.
- Permissions: `scripting`, `tabs`, `activeTab`, `declarativeNetRequest`,
  `offscreen`, `tabCapture`, `storage`, `downloads`. Host: `<all_urls>`.
- No `webRequest`, `contextMenus`, `commands`, `externally_connectable`,
  `update_url`, or remote `connect-src` (all dropped vs original).

## Future (post-v1)

- Full ~50-device catalog + device groups parity.
- Full-page scrolling screenshots.
- Network throttling simulation.
- Keyboard/network status-bar chrome.
- Shareable links / export settings.
- Optional in-page injection mode for "activate on current tab" UX.
