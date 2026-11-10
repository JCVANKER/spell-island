// Thin line icons (instead of emoji), drawn in currentColor so the stylesheet decides their colour.
const svg = (body: string, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICON = {
  home: svg('<path d="M3 19c3-1.6 6-2.2 9-2.2s6 .6 9 2.2"/><path d="M9 16.8V9.5L12 4l3 5.5v7.3"/><path d="M8 9.5h8"/><path d="M11 13h2"/>'),
  map: svg('<path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5L3.5 20z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  labels: svg('<path d="M4 18 8.5 6h1L14 18"/><path d="M5.6 14h6.8"/><path d="M15.5 12.5c.6-.9 1.5-1.3 2.6-1.3 1.6 0 2.4.9 2.4 2.4V18"/><path d="M20.5 15.2c-.8-.3-1.6-.4-2.4-.4-1.5 0-2.6.7-2.6 1.8 0 1 .8 1.6 1.9 1.6 1.3 0 2.4-.8 3.1-1.8"/>'),
  companion: svg('<circle cx="12" cy="13.5" r="6.5"/><path d="M7.2 9.2 5.5 4.5l4.2 2.6M16.8 9.2l1.7-4.7-4.2 2.6"/><circle cx="9.7" cy="13" r=".7" fill="currentColor"/><circle cx="14.3" cy="13" r=".7" fill="currentColor"/><path d="M11 16.2c.6.5 1.4.5 2 0"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
  gem: svg('<path d="M6.5 4h11L21 9l-9 11L3 9z"/><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5"/>'),
  sound: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  replay: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>'),
  ear: svg('<path d="M7 9a5 5 0 0 1 10 0c0 3-2.6 3.8-3 6.2-.3 1.8-1.4 3.3-3.4 3.3"/><path d="M10 9.4a2 2 0 0 1 4 0c0 1-.8 1.4-1.3 2"/>'),
  spark: svg('<path d="M12 3.5 13.6 10.4 20.5 12l-6.9 1.6L12 20.5l-1.6-6.9L3.5 12l6.9-1.6z"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  help: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><circle cx="12" cy="16.9" r=".6" fill="currentColor"/>'),
  close: svg('<path d="m7 7 10 10M17 7 7 17"/>'),
  pen: svg('<path d="m14.5 5.5 4 4L8.5 19.5H4.5v-4z"/><path d="m12.5 7.5 4 4"/>'),
  book: svg('<path d="M4 5.5c2.7-.8 5.4-.6 8 1 2.6-1.6 5.3-1.8 8-1v13c-2.7-.8-5.4-.6-8 1-2.6-1.6-5.3-1.8-8-1z"/><path d="M12 6.5v13"/>'),
  star: svg('<path d="m12 3.8 2.5 5.3 5.7.7-4.2 3.9 1.1 5.7L12 16.6l-5.1 2.8 1.1-5.7-4.2-3.9 5.7-.7z"/>'),
  pin: svg('<path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  mic: svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>'),
};

/** an icon for a toast, from the (legacy) emoji callers pass */
export function toastIcon(e: string): string {
  if (e.includes('💎')) return ICON.gem;
  if (e.includes('📖')) return ICON.book;
  if (e.includes('👂')) return ICON.ear;
  if (e.includes('🔤')) return ICON.labels;
  if (e.includes('🐾')) return ICON.companion;
  if (e.includes('🎙')) return ICON.mic;
  if (e.includes('⭐') || e === 'star') return ICON.star;
  if (e.includes('📍') || e === 'pin') return ICON.pin;
  return ICON.spark;
}
