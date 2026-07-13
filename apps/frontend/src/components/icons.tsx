/**
 * Lightweight inline stroke icons (Feather/Lucide style, 24-grid, currentColor).
 * No external icon dependency — keeps the bundle lean and offline-safe.
 */
import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const IconDashboard = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);
export const IconBox = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M21 8V16a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
);
export const IconClipboard = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h6" /></svg>
);
export const IconTrendingUp = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M17 7h4v4" /></svg>
);
export const IconAlert = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
);
export const IconCart = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><circle cx="9" cy="21" r="1.4" /><circle cx="19" cy="21" r="1.4" /><path d="M2.5 3h2l2.2 12.4a1.5 1.5 0 0 0 1.5 1.2h9.1a1.5 1.5 0 0 0 1.5-1.2L21 7H6" /></svg>
);
export const IconTruck = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M14 17V5a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h1" /><path d="M14 8h4l3 3v6a1 1 0 0 1-1 1h-1" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>
);
export const IconChart = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="1" /><rect x="12" y="7" width="3" height="10" rx="1" /><rect x="17" y="13" width="3" height="4" rx="1" /></svg>
);
export const IconCalendar = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
export const IconUsers = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" /></svg>
);
export const IconLogout = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>
);
export const IconChevronLeft = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="m15 18-6-6 6-6" /></svg>
);
export const IconMenu = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
);
/** Brand mark — a stylised leaf/route glyph. */
export const IconLeaf = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M11 20A7 7 0 0 1 4 13c0-5 4.5-9 12-9 0 6.5-3.5 11-9 11Z" /><path d="M4 20c1.5-4 4.5-7 9-8" /></svg>
);
