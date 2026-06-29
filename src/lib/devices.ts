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
