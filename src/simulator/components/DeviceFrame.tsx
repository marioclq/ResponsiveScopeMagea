import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { Device } from '../../lib/devices';
import type { ScreenshotRect } from '../../lib/messages';

export interface DeviceFrameHandle {
  reload: () => void;
  getViewportRect: () => ScreenshotRect | null;
}

interface Props {
  device: Device;
  url: string;
  width: number;
  height: number;
}

function buildFrameName(device: Device, width: number, height: number): string {
  const cfg = {
    userAgent: device.userAgent,
    platform: device.userAgentData?.platform ?? (device.group === 'android' ? 'Android' : 'iOS'),
    mobile: device.userAgentData?.mobile ?? device.group !== 'tablet',
    width,
    height,
    dpr: device.devicePixelRatio,
    touch: device.hasTouch,
    brands: device.userAgentData?.brands ?? [],
  };
  return 'responsivescope-frame:' + btoa(JSON.stringify(cfg));
}

export const DeviceFrame = forwardRef<DeviceFrameHandle, Props>(function DeviceFrame(
  { device, url, width, height },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const maxH = window.innerHeight * 0.8;
    setScale(height > maxH ? maxH / height : 1);
  }, [height]);

  useImperativeHandle(ref, () => ({
    reload: () => {
      const f = iframeRef.current;
      if (f) f.src = f.src;
    },
    getViewportRect: () => {
      const f = iframeRef.current;
      if (!f) return null;
      const r = f.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      return { x: r.x * dpr, y: r.y * dpr, width: r.width * dpr, height: r.height * dpr };
    },
  }));

  return (
    <div className="device-bezel" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
      <iframe
        ref={iframeRef}
        name={buildFrameName(device, width, height)}
        src={url}
        width={width}
        height={height}
        title="device-viewport"
      />
    </div>
  );
});
