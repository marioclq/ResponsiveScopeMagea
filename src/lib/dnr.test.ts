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
    const hdr = rules[0].action.requestHeaders!.find((h: { header: string }) => h.header === 'user-agent');
    expect(hdr?.value).toBe(device.userAgent);
    expect(hdr?.operation).toBe('set');
  });

  it('sets sec-ch-ua-mobile to ?1 for mobile devices', () => {
    const m = rules[0].action.requestHeaders!.find((h: { header: string }) => h.header === 'sec-ch-ua-mobile');
    expect(m?.value).toBe('?1');
  });

  it('removes x-frame-options and content-security-policy response headers', () => {
    const removed = rules[1].action.responseHeaders!.map((h: { header: string }) => h.header);
    expect(removed).toContain('x-frame-options');
    expect(removed).toContain('content-security-policy');
    for (const h of rules[1].action.responseHeaders!) {
      expect(h.operation).toBe('remove');
    }
  });

  it('uses distinct numeric rule ids', () => {
    const ids = rules.map((r: { id: number }) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(typeof id).toBe('number');
  });
});
