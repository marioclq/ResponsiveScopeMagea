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
