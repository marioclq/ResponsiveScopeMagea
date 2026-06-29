// MAIN-world device spoofer. Reads device config from window.name:
//   "responsivescope-frame:" + base64(JSON.stringify(cfg))
interface SpoofConfig {
  userAgent: string;
  platform: string;
  mobile: boolean;
  width: number;
  height: number;
  dpr: number;
  touch: boolean;
  brands: { brand: string; version: string }[];
}

(() => {
  const PREFIX = 'responsivescope-frame:';
  if (!window.name.startsWith(PREFIX)) return;

  let cfg: SpoofConfig;
  try {
    cfg = JSON.parse(atob(window.name.slice(PREFIX.length)));
  } catch {
    return;
  }

  const define = (obj: object, prop: string, value: unknown) => {
    try {
      Object.defineProperty(obj, prop, { get: () => value, configurable: true });
    } catch {
      /* ignore non-configurable */
    }
  };

  define(navigator, 'userAgent', cfg.userAgent);
  define(navigator, 'platform', cfg.mobile ? (cfg.platform === 'Android' ? 'Linux armv8l' : 'iPhone') : cfg.platform);
  define(navigator, 'maxTouchPoints', cfg.touch ? 5 : 0);

  // userAgentData (Chromium only)
  if (cfg.brands.length) {
    const uaData = {
      brands: cfg.brands,
      mobile: cfg.mobile,
      platform: cfg.platform,
      getHighEntropyValues: () =>
        Promise.resolve({ platform: cfg.platform, mobile: cfg.mobile, brands: cfg.brands }),
      toJSON: () => ({ brands: cfg.brands, mobile: cfg.mobile, platform: cfg.platform }),
    };
    define(navigator, 'userAgentData', uaData);
  }

  define(window, 'devicePixelRatio', cfg.dpr);
  define(screen, 'width', cfg.width);
  define(screen, 'height', cfg.height);
  define(screen, 'availWidth', cfg.width);
  define(screen, 'availHeight', cfg.height);

  if (cfg.touch && !('ontouchstart' in window)) {
    define(window, 'ontouchstart', null);
  }

  // Coerce pointer/hover media queries to coarse/none for touch devices.
  if (cfg.touch) {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => {
      if (/pointer:\s*coarse/.test(q)) return { ...orig(q), matches: true } as MediaQueryList;
      if (/hover:\s*none/.test(q)) return { ...orig(q), matches: true } as MediaQueryList;
      if (/pointer:\s*fine/.test(q)) return { ...orig(q), matches: false } as MediaQueryList;
      if (/hover:\s*hover/.test(q)) return { ...orig(q), matches: false } as MediaQueryList;
      return orig(q);
    };
  }
})();
