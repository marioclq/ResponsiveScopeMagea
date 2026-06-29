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
