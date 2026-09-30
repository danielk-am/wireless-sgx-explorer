// Public presentation settings only. Never put credentials in banners.json.
export function safeLink(value, origin) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, origin);
    return url.protocol === 'https:' || (url.origin === origin && url.protocol === 'http:') ? url.href : null;
  } catch { return null; }
}

export function bannerSettings(settings, origin) {
  if (!settings || !['available', 'sponsored', 'affiliate'].includes(settings.state)) return null;
  const url = safeLink(settings.url, origin);
  if (!url || typeof settings.title !== 'string' || !settings.title.trim()) return null;
  let image = null;
  if (typeof settings.image === 'string' && settings.image.startsWith('/banner-assets/')) {
    const candidate = new URL(settings.image, origin);
    if (candidate.origin === origin && candidate.pathname.startsWith('/banner-assets/')) image = candidate.href;
  }
  return {
    state: settings.state, title: settings.title.slice(0, 120),
    description: typeof settings.description === 'string' ? settings.description.slice(0, 300) : '',
    button: typeof settings.button === 'string' && settings.button.trim() ? settings.button.slice(0, 60) : 'Learn more',
    label: settings.state === 'affiliate' ? 'Affiliate' : settings.state === 'sponsored' ? 'Sponsored' : 'Ad space available',
    disclosure: settings.state === 'affiliate' ? 'We may earn a commission if you buy through this link.' : '',
    url, image, imageAlt: typeof settings.imageAlt === 'string' ? settings.imageAlt.slice(0, 200) : ''
  };
}

export async function loadBanners() {
  const slots = [...document.querySelectorAll('[data-banner-slot]')];
  try {
    const response = await fetch('/banners.json', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return;
    const config = await response.json();
    for (const slot of slots) {
      const settings = bannerSettings(config?.slots?.[slot.dataset.bannerSlot], location.origin);
      if (!settings) { slot.hidden = true; continue; }
      const content = document.createElement('div');
      content.className = 'banner-copy';
      const label = document.createElement('p');
      label.className = 'banner-label'; label.textContent = settings.label;
      const heading = document.createElement('h2'); heading.textContent = settings.title;
      const description = document.createElement('p'); description.textContent = settings.description;
      content.append(label, heading, description);
      if (settings.disclosure) {
        const disclosure = document.createElement('p');
        disclosure.className = 'banner-disclosure';
        disclosure.textContent = settings.disclosure;
        content.append(disclosure);
      }
      const link = document.createElement('a');
      link.className = 'banner-button'; link.href = settings.url; link.textContent = settings.button;
      link.rel = 'sponsored noopener noreferrer'; link.referrerPolicy = 'no-referrer';
      slot.replaceChildren();
      if (settings.image) {
        const img = document.createElement('img');
        img.src = settings.image; img.alt = settings.imageAlt; img.className = 'banner-image';
        img.addEventListener('error', () => img.remove(), { once: true });
        slot.append(img);
      }
      slot.append(content, link);
      slot.hidden = false;
    }
  } catch { /* Optional banners must never prevent hotspot lookup. */ }
}
if (typeof document !== 'undefined') loadBanners();
