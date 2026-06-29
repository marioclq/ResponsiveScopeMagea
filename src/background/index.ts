import { buildRulesForDevice, ruleIdsForTab } from '../lib/dnr';
import { ACTIVE_DEVICE_KEY, type Msg } from '../lib/messages';
import type { Device } from '../lib/devices';

const SIM_PAGE = 'src/simulator/index.html';
const simulatorTabs = new Set<number>();

// Open the simulator page when the toolbar icon is clicked.
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL(SIM_PAGE);
  const tab = await chrome.tabs.create({ url });
  if (tab.id != null) simulatorTabs.add(tab.id);
});

async function applyDevice(tabId: number, device: Device) {
  const [a, b] = ruleIdsForTab(tabId);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [a, b],
    addRules: buildRulesForDevice(device, tabId) as chrome.declarativeNetRequest.Rule[],
  });
  await chrome.storage.session.set({ [`${ACTIVE_DEVICE_KEY}_${tabId}`]: device });
}

async function clearDevice(tabId: number) {
  const [a, b] = ruleIdsForTab(tabId);
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [a, b] });
  await chrome.storage.session.remove(`${ACTIVE_DEVICE_KEY}_${tabId}`);
}

async function screenshot(
  tabId: number,
  rect: { x: number; y: number; width: number; height: number },
  deviceName: string,
): Promise<void> {
  await chrome.tabs.update(tabId, { active: true });
  const dataUrl = await chrome.tabs.captureVisibleTab();
  const cropped = await cropDataUrl(dataUrl, rect);
  await chrome.downloads.download({
    url: cropped,
    filename: `responsivescope/${slug(deviceName)}-${Date.now()}.png`,
  });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function cropDataUrl(
  dataUrl: string,
  rect: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(rect.width, rect.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  const outBlob = await canvas.convertToBlob({ type: 'image/png' });
  return blobToDataUrl(outBlob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument();
  if (existing) return;
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
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
        const streamId = await new Promise<string>((resolve) =>
          chrome.tabCapture.getMediaStreamId({ targetTabId: msg.tabId }, resolve),
        );
        void chrome.runtime.sendMessage({ type: 'offscreen-start', streamId });
        sendResponse({ ok: true });
        break;
      }
      case 'record-stop':
        void chrome.runtime.sendMessage({ type: 'offscreen-stop' });
        sendResponse({ ok: true });
        break;
      case 'recorder-data':
        await chrome.downloads.download({
          url: msg.dataUrl,
          filename: `responsivescope/recording-${Date.now()}.webm`,
        });
        await chrome.offscreen.closeDocument().catch(() => {});
        break;
      case 'recorder-error':
        console.error('Recorder error:', msg.message);
        break;
    }
  })();
  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (!simulatorTabs.has(tabId)) return;
  simulatorTabs.delete(tabId);
  await clearDevice(tabId).catch(() => {});
});
