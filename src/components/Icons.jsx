import React from 'react'
import { COLORS } from '../lib/theme'

const Icon = ({ size = 20, strokeWidth = 1.5, children, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
)

export const HomeIcon = (p) => (<Icon {...p}><path d="M3 11 L12 4 L21 11 V20 Q21 21 20 21 H4 Q3 21 3 20 Z" /></Icon>)
export const ShirtIcon = (p) => (<Icon {...p}><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" /></Icon>)
export const CalendarIcon = (p) => (<Icon {...p}><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></Icon>)
export const BarChartIcon = (p) => (<Icon {...p}><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></Icon>)
export const ShoppingBagIcon = (p) => (<Icon {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Icon>)
export const ImageIcon = (p) => (<Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></Icon>)
export const SparklesIcon = (p) => (<Icon {...p}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" /></Icon>)
export const XIcon = (p) => (<Icon {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>)
export const SendIcon = (p) => (<Icon {...p}><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></Icon>)
export const PlusIcon = (p) => (<Icon {...p}><path d="M5 12h14" /><path d="M12 5v14" /></Icon>)
export const UserIcon = (p) => (<Icon {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>)
export const ChevronRight = (p) => (<Icon {...p}><path d="m9 18 6-6-6-6" /></Icon>)
export const ChevronLeft = (p) => (<Icon {...p}><path d="m15 18-6-6 6-6" /></Icon>)
export const ChevronDown = (p) => (<Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>)
export const TrashIcon = (p) => (<Icon {...p}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Icon>)
export const CameraIcon = (p) => (<Icon {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></Icon>)
export const LinkIcon = (p) => (<Icon {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Icon>)
export const ExternalIcon = (p) => (<Icon {...p}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></Icon>)
export const ArrowRightIcon = (p) => (<Icon {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Icon>)
export const EditIcon = (p) => (<Icon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon>)
export const PenIcon = (p) => (<Icon {...p}><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /></Icon>)
export const ClipboardIcon = (p) => (<Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></Icon>)
export const GridIcon = (p) => (<Icon {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></Icon>)
export const CheckIcon = (p) => (<Icon {...p}><polyline points="20 6 9 17 4 12" /></Icon>)
export const MoveIcon = (p) => (<Icon {...p}><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></Icon>)
export const TagIcon = (p) => (<Icon {...p}><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></Icon>)
export const TypeIcon = (p) => (<Icon {...p}><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></Icon>)
export const MessageIcon = (p) => (<Icon {...p}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /></Icon>)
export const ClockIcon = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>)
export const MenuIcon = (p) => (<Icon {...p}><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></Icon>)
export const HatIcon = (p) => (<Icon {...p}><path d="M3 19h18" /><path d="M5 19c0-3 2.5-12 7-12s7 9 7 12" /></Icon>)
export const GlassesIcon = (p) => (<Icon {...p}><circle cx="6" cy="14" r="3.5" /><circle cx="18" cy="14" r="3.5" /><path d="M9.5 14h5" /><path d="M2.5 14 4 8" /><path d="M21.5 14 20 8" /></Icon>)
export const NecklaceIcon = (p) => (<Icon {...p}><path d="M4 5c1 5 4 8 8 8s7-3 8-8" /><path d="M12 13v3" /><path d="M12 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></Icon>)
export const JacketIcon = (p) => (<Icon {...p}><path d="M6 3 3 5l1 4h2v12h12V9h2l1-4-3-2-3 1-3 2-3-2z" /><path d="M12 5v16" /></Icon>)
export const WatchIcon = (p) => (<Icon {...p}><circle cx="12" cy="12" r="5" /><path d="M8.5 7.5 8 4h8l-.5 3.5" /><path d="M8.5 16.5 8 20h8l-.5-3.5" /><path d="M12 10v2l1 1" /></Icon>)
export const BeltIcon = (p) => (<Icon {...p}><rect x="2" y="9" width="20" height="6" rx="1" /><rect x="10" y="11" width="4" height="2" /><circle cx="12" cy="12" r="0.4" fill="currentColor" /></Icon>)
export const PantsIcon = (p) => (<Icon {...p}><path d="M5 3h14v3l-2 15h-4l-1-11-1 11H7L5 6z" /></Icon>)
export const SocksIcon = (p) => (<Icon {...p}><path d="M9 2v9l-4 4a3 3 0 0 0 0 4l1 1a3 3 0 0 0 4 0l5-5V2z" /><path d="M9 11h6" /></Icon>)
export const ShoesIcon = (p) => (<Icon {...p}><path d="M3 17c0-2 2-3 4-3l2-1 3-6 5 2 1 4h4v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Icon>)
export const LayersIcon = (p) => (<Icon {...p}><path d="m12 2 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></Icon>)
export const PaletteIcon = (p) => (<Icon {...p}><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 0-4-4h-2.5a2.5 2.5 0 0 1 0-5H17A10 10 0 0 0 12 2z" /><circle cx="7" cy="11" r="0.6" fill="currentColor" /><circle cx="10" cy="7" r="0.6" fill="currentColor" /><circle cx="15" cy="7.5" r="0.6" fill="currentColor" /><circle cx="6.5" cy="15" r="0.6" fill="currentColor" /></Icon>)
export const ResizeIcon = (p) => (<Icon {...p}><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></Icon>)
export const SearchIcon = (p) => (<Icon {...p}><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></Icon>)
export const DiceIcon = ({ size = 24, ...rest }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...rest}>
    {/* Back die — isometric cube */}
    <g>
      {/* Right face (shadow side) */}
      <path d="M16 5.5 L19.6 7.3 L19.6 11.3 L16 13.3 Z" fill="currentColor" opacity="0.45" />
      {/* Front face (medium) */}
      <path d="M16 5.5 L16 13.3 L12.4 11.3 L12.4 7.3 Z" fill="currentColor" opacity="0.7" />
      {/* Top face (highlight) */}
      <path d="M16 1.7 L19.6 3.5 L16 5.5 L12.4 3.5 Z" fill="currentColor" opacity="0.95" />
      {/* Edge outlines */}
      <path d="M16 1.7 L19.6 3.5 L19.6 11.3 L16 13.3 L12.4 11.3 L12.4 3.5 Z M12.4 3.5 L16 5.5 L19.6 3.5 M16 5.5 L16 13.3"
        fill="none" stroke="currentColor" strokeWidth="0.55" strokeLinejoin="round" opacity="0.55" />
      {/* Pips on top face */}
      <circle cx="14.2" cy="3.5" r="0.5" fill="currentColor" opacity="0.35" />
      <circle cx="17.8" cy="3.5" r="0.5" fill="currentColor" opacity="0.35" />
      {/* Pips on front face */}
      <circle cx="13.4" cy="5.7" r="0.45" fill="currentColor" opacity="0.35" />
      <circle cx="15" cy="8.1" r="0.45" fill="currentColor" opacity="0.35" />
      <circle cx="14.2" cy="10.4" r="0.45" fill="currentColor" opacity="0.35" />
      {/* Pip on right face */}
      <circle cx="17.8" cy="9.5" r="0.45" fill="currentColor" opacity="0.3" />
    </g>
    {/* Front die — larger, tilted forward */}
    <g>
      <path d="M8.4 14.7 L12.7 12.2 L12.7 17.5 L8.4 20.1 Z" fill="currentColor" opacity="0.5" />
      <path d="M8.4 14.7 L8.4 20.1 L4.1 17.5 L4.1 12.2 Z" fill="currentColor" opacity="0.78" />
      <path d="M8.4 9.5 L12.7 12.2 L8.4 14.7 L4.1 12.2 Z" fill="currentColor" opacity="0.98" />
      <path d="M8.4 9.5 L12.7 12.2 L12.7 17.5 L8.4 20.1 L4.1 17.5 L4.1 12.2 Z M4.1 12.2 L8.4 14.7 L12.7 12.2 M8.4 14.7 L8.4 20.1"
        fill="none" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round" opacity="0.6" />
      {/* Pips on top */}
      <circle cx="8.4" cy="12.1" r="0.55" fill="currentColor" opacity="0.4" />
      {/* Pips on front */}
      <circle cx="5.6" cy="13.7" r="0.5" fill="currentColor" opacity="0.4" />
      <circle cx="6.9" cy="15.2" r="0.5" fill="currentColor" opacity="0.4" />
      <circle cx="5.6" cy="16.8" r="0.5" fill="currentColor" opacity="0.4" />
      <circle cx="6.9" cy="18.3" r="0.5" fill="currentColor" opacity="0.4" />
      {/* Pips on right */}
      <circle cx="10.5" cy="13.6" r="0.5" fill="currentColor" opacity="0.35" />
      <circle cx="11.7" cy="15.4" r="0.5" fill="currentColor" opacity="0.35" />
      <circle cx="10.5" cy="17.5" r="0.5" fill="currentColor" opacity="0.35" />
    </g>
  </svg>
)
