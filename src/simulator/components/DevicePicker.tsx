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
