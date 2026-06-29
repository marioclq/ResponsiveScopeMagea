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
