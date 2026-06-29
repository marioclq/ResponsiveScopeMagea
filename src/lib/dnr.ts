import type { Device } from './devices';

// Plain-object types matching chrome.declarativeNetRequest.Rule shape.
// Using local types instead of chrome.* so this module is testable in node env.
interface ModifyHeaderInfo {
  header: string;
  operation: 'set' | 'remove' | 'append';
  value?: string;
}

interface RuleCondition {
  tabIds?: number[];
  resourceTypes?: string[];
}

interface RuleAction {
  type: string;
  requestHeaders?: ModifyHeaderInfo[];
  responseHeaders?: ModifyHeaderInfo[];
}

interface Rule {
  id: number;
  priority: number;
  action: RuleAction;
  condition: RuleCondition;
}

export function ruleIdsForTab(tabId: number): [number, number] {
  const base = tabId * 2 + 1;
  return [base, base + 1];
}

function quote(v: string): string {
  return `"${v}"`;
}

function secChUa(device: Device): string {
  const brands = device.userAgentData?.brands;
  if (brands && brands.length) {
    return brands.map((b) => `${quote(b.brand)};v=${quote(b.version)}`).join(', ');
  }
  return '';
}

export function buildRulesForDevice(device: Device, tabId: number): Rule[] {
  const [headerRuleId, frameRuleId] = ruleIdsForTab(tabId);
  const isMobile = device.userAgentData?.mobile ?? device.group !== 'tablet';
  const platform = device.userAgentData?.platform
    ?? (device.group === 'android' ? 'Android' : 'iOS');

  const requestHeaders: ModifyHeaderInfo[] = [
    { header: 'user-agent', operation: 'set', value: device.userAgent },
    { header: 'sec-ch-ua-mobile', operation: 'set', value: isMobile ? '?1' : '?0' },
    { header: 'sec-ch-ua-platform', operation: 'set', value: quote(platform) },
  ];
  const ch = secChUa(device);
  if (ch) {
    requestHeaders.push({ header: 'sec-ch-ua', operation: 'set', value: ch });
    requestHeaders.push({ header: 'sec-ch-ua-full-version-list', operation: 'set', value: ch });
  }

  const headerRule: Rule = {
    id: headerRuleId,
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders },
    condition: { tabIds: [tabId], resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'] },
  };

  const frameRule: Rule = {
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
