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
  | { type: 'recorder-data'; dataUrl: string }
  | { type: 'recorder-error'; message: string };

export interface ScreenshotResult {
  ok: boolean;
  error?: string;
}

export type Sendable<T extends Msg['type']> = Extract<Msg, { type: T }>;
