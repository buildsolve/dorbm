import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, isPast, isWithinInterval, format } from 'date-fns';
import { AlertTriangle, ShoppingBag, History, BoxIcon } from 'lucide-react';
import { storageApi } from '../../api/client';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import BatchTraceModal from '../../components/trace/BatchTraceModal';

// ── Expiry helpers ────────────────────────────────────────────────────────────

type ExpiryState = 'expired' | 'soon' | 'ok' | 'none';

function getExpiryState(expiryDate?: string): ExpiryState {
  if (!expiryDate) return 'none';
  const exp = new Date(expiryDate);
  if (isPast(exp)) return 'expired';
  if (isWithinInterval(exp, { start: new Date(), end: addDays(new Date(), 4) })) return 'soon';
  return 'ok';
}

const EXPIRY_COLORS: Record<ExpiryState, { bg: string; border: string; text: string; dot: string; label: string }> = {
  expired: { bg: '#FFF0EC', border: '#FFCCC0', text: '#C13515', dot: '#C13515', label: 'Abgelaufen' },
  soon:    { bg: '#FFF8E1', border: '#FFE68A', text: '#8A6D00', dot: '#F5A623', label: 'Läuft ab' },
  ok:      { bg: '#E8F8EE', border: '#C0E8CB', text: '#008A05', dot: '#22C55E', label: 'Frisch' },
  none:    { bg: '#F7F7F7', border: '#EBEBEB', text: '#6A6A6A', dot: '#DDDDDD', label: '' },
};

// ── Device type detection ─────────────────────────────────────────────────────

type DeviceType = 'freezer' | 'fridge' | 'display' | 'counter' | 'walkin' | 'generic';

function detectDevice(name: string): DeviceType {
  const n = name.toLowerCase();
  if (n.includes('tiefkühl') || n.includes('freezer') || n.includes('tk-')) return 'freezer';
  if (n.includes('kühlschrank') || n.includes('fridge') && !n.includes('display')) return 'fridge';
  if (n.includes('display') || n.includes('showcase')) return 'display';
  if (n.includes('theke') || n.includes('counter') || n.includes('vitrine')) return 'counter';
  if (n.includes('walk') || n.includes('cooler') || n.includes('kammer')) return 'walkin';
  return 'generic';
}

// ── Capacity fill color ───────────────────────────────────────────────────────
function fillColor(pct: number) {
  if (pct >= 0.9) return '#EF4444';
  if (pct >= 0.65) return '#F59E0B';
  return '#22C55E';
}

// ── 3D Device illustrations ───────────────────────────────────────────────────

function FreezerDevice({ size, fillPct }: { size: 'groß' | 'mittel' | 'klein' | ''; fillPct: number }) {
  const fc = fillColor(fillPct);
  const w = size === 'groß' ? 200 : size === 'mittel' ? 160 : 130;
  return (
    <svg viewBox={`0 0 ${w} 220`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* 3D side panel (right) */}
      <polygon points={`${w-2},8 ${w+18},2 ${w+18},218 ${w-2},212`} fill="#A8C5E8" />
      {/* 3D top panel */}
      <polygon points={`4,4 ${w-2},4 ${w+18},2 22,2`} fill="#C8DFF5" />
      {/* Main body */}
      <rect x="4" y="4" width={w-6} height={210} rx="6" fill="url(#freezerBody)" />
      {/* Frost texture stripes */}
      {[30,55,80,105,130,155,180].map((y,i) => (
        <line key={i} x1="12" y1={y} x2={w-10} y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      ))}
      {/* Door frame inset */}
      <rect x="14" y="18" width={w-30} height={170} rx="4" fill="url(#freezerDoor)" />
      {/* Door inner glass effect */}
      <rect x="18" y="22" width={w-38} height={162} rx="3" fill="rgba(200,230,255,0.18)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      {/* Capacity fill bar inside door */}
      <rect x="18" y={22 + 162*(1-Math.min(fillPct,1))} width={w-38} height={162*Math.min(fillPct,1)} rx="2" fill={`${fc}22`} />
      {/* Shelves */}
      {[60, 100, 140].map((y,i) => (
        <rect key={i} x="18" y={y} width={w-38} height="2.5" rx="1" fill="rgba(255,255,255,0.35)" />
      ))}
      {/* Handle */}
      <rect x={w-16} y="80" width="6" height="60" rx="3" fill="#B0C8E0" />
      <rect x={w-15} y="82" width="4" height="56" rx="2" fill="#D8EAFF" />
      {/* Control panel top */}
      <rect x="14" y="4" width={w-30} height="14" rx="2" fill="#1B5090" />
      <text x={w/2-8} y="14" fontSize="7" fill="#7BC8FF" fontWeight="700" fontFamily="monospace">-18°C ❄</text>
      {/* Snowflake decoration */}
      <text x="22" y="50" fontSize="14" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">❄</text>
      <text x={w-36} y="50" fontSize="10" fill="rgba(255,255,255,0.2)" fontFamily="sans-serif">❄</text>
      {/* Footer */}
      <rect x="4" y="207" width={w-6} height="7" rx="3" fill="#1B5090" />
      {/* Gradient defs */}
      <defs>
        <linearGradient id="freezerBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#D8EEFF" />
          <stop offset="50%" stopColor="#EAF4FF" />
          <stop offset="100%" stopColor="#C8E2F8" />
        </linearGradient>
        <linearGradient id="freezerDoor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#BFD8F0" />
          <stop offset="100%" stopColor="#96BEDC" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FridgeDevice({ fillPct }: { fillPct: number }) {
  const fc = fillColor(fillPct);
  return (
    <svg viewBox="0 0 180 230" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* 3D side */}
      <polygon points="174,6 194,2 194,228 174,224" fill="#C0C8D0" />
      {/* 3D top */}
      <polygon points="4,4 174,4 194,2 24,2" fill="#D8DDE2" />
      {/* Body */}
      <rect x="4" y="4" width="170" height="222" rx="8" fill="url(#fridgeBody)" />
      {/* Brushed metal texture lines */}
      {Array.from({length: 18}, (_,i) => (
        <line key={i} x1="4" y1={4 + i*13} x2="174" y2={4 + i*13} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      {/* Fridge section (top 60%) */}
      <rect x="12" y="14" width="152" height="128" rx="5" fill="url(#fridgeSection)" />
      {/* Glass tint */}
      <rect x="15" y="17" width="146" height="122" rx="4" fill="rgba(220,240,255,0.15)" />
      {/* Capacity fill */}
      <rect x="15" y={17 + 122*(1-Math.min(fillPct,1))} width="146" height={122*Math.min(fillPct,1)} rx="3" fill={`${fc}1A`} />
      {/* Shelves in fridge */}
      {[50, 85, 120].map((y,i) => (
        <rect key={i} x="15" y={y} width="146" height="2" rx="1" fill="rgba(255,255,255,0.5)" />
      ))}
      {/* Freezer section (bottom 40%) */}
      <rect x="12" y="150" width="152" height="68" rx="5" fill="url(#freezerSection)" />
      <rect x="15" y="153" width="146" height="62" rx="4" fill="rgba(190,220,255,0.12)" />
      {/* Divider line */}
      <rect x="4" y="146" width="170" height="4" fill="#A0AABB" />
      <rect x="4" y="147" width="170" height="2" fill="rgba(255,255,255,0.3)" />
      {/* Handle - left side, full height */}
      <rect x="168" y="30" width="6" height="90" rx="3" fill="#9AAABB" />
      <rect x="169" y="32" width="4" height="86" rx="2" fill="#C8D4E0" />
      <rect x="168" y="160" width="6" height="40" rx="3" fill="#9AAABB" />
      <rect x="169" y="162" width="4" height="36" rx="2" fill="#C8D4E0" />
      {/* Control panel */}
      <rect x="12" y="4" width="152" height="10" rx="2" fill="#3A4A5A" />
      <text x="86" y="12" textAnchor="middle" fontSize="5.5" fill="#90C8FF" fontWeight="700" fontFamily="monospace">+4°C  ❄ -18°C</text>
      {/* Logo area */}
      <circle cx="30" cy="180" r="8" fill="rgba(255,255,255,0.1)" />
      <text x="30" y="183" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">❄</text>
      <defs>
        <linearGradient id="fridgeBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#CDD5DC" />
          <stop offset="40%" stopColor="#E2E8EE" />
          <stop offset="100%" stopColor="#B8C4CE" />
        </linearGradient>
        <linearGradient id="fridgeSection" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A8B8C8" />
          <stop offset="100%" stopColor="#8898A8" />
        </linearGradient>
        <linearGradient id="freezerSection" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7890A8" />
          <stop offset="100%" stopColor="#607080" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DisplayFridgeDevice({ fillPct }: { fillPct: number }) {
  const fc = fillColor(fillPct);
  return (
    <svg viewBox="0 0 200 210" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* 3D side */}
      <polygon points="194,6 212,2 212,208 194,206" fill="#2A3040" />
      {/* 3D top */}
      <polygon points="4,4 194,4 212,2 26,2" fill="#3A4252" />
      {/* Main body */}
      <rect x="4" y="4" width="190" height="204" rx="6" fill="#1E2330" />
      {/* LED strip top */}
      <rect x="4" y="4" width="190" height="6" rx="2" fill="url(#ledStrip)" />
      {/* Glass panel - the whole front */}
      <rect x="14" y="16" width="172" height="178" rx="4" fill="url(#glassFill)" />
      {/* Glass reflection */}
      <rect x="14" y="16" width="30" height="178" rx="4" fill="rgba(255,255,255,0.04)" />
      <line x1="20" y1="20" x2="30" y2="200" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
      {/* Interior back wall */}
      <rect x="16" y="18" width="168" height="174" rx="3" fill="#0A1520" />
      {/* LED interior lighting */}
      <rect x="16" y="18" width="168" height="4" fill="url(#interiorLED)" />
      {/* Capacity fill */}
      <rect x="16" y={18 + 170*(1-Math.min(fillPct,1))} width="168" height={170*Math.min(fillPct,1)} rx="2" fill={`${fc}18`} />
      {/* Shelves - glass style */}
      {[70, 115, 158].map((y,i) => (
        <g key={i}>
          <rect x="16" y={y} width="168" height="3" fill="rgba(100,180,255,0.25)" />
          <rect x="16" y={y} width="168" height="1" fill="rgba(150,220,255,0.5)" />
        </g>
      ))}
      {/* Glass frame */}
      <rect x="14" y="16" width="172" height="178" rx="4" fill="none" stroke="#4A5568" strokeWidth="2" />
      {/* Door handle - horizontal bar at bottom */}
      <rect x="60" y="196" width="80" height="5" rx="2.5" fill="#6A7888" />
      <rect x="62" y="197" width="76" height="3" rx="1.5" fill="#90A0B0" />
      {/* Brand badge */}
      <rect x="80" y="4" width="40" height="7" rx="2" fill="#2A3A50" />
      <text x="100" y="10" textAnchor="middle" fontSize="5" fill="#60A8E0" fontWeight="700" fontFamily="monospace">DISPLAY</text>
      {/* Corner LED dots */}
      <circle cx="20" cy="22" r="2" fill="#00AAFF" opacity="0.8" />
      <circle cx="180" cy="22" r="2" fill="#00AAFF" opacity="0.8" />
      <defs>
        <linearGradient id="glassFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(40,80,120,0.6)" />
          <stop offset="100%" stopColor="rgba(20,40,80,0.8)" />
        </linearGradient>
        <linearGradient id="ledStrip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0040A0" />
          <stop offset="50%" stopColor="#00AAFF" />
          <stop offset="100%" stopColor="#0040A0" />
        </linearGradient>
        <linearGradient id="interiorLED" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,150,255,0)" />
          <stop offset="50%" stopColor="rgba(0,200,255,0.4)" />
          <stop offset="100%" stopColor="rgba(0,150,255,0)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function KuchenThekeDevice({ fillPct }: { fillPct: number }) {
  const fc = fillColor(fillPct);
  return (
    <svg viewBox="0 0 220 190" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* 3D back */}
      <polygon points="10,10 210,10 210,50 10,50" fill="#F5E6C8" />
      {/* 3D side */}
      <polygon points="210,10 228,2 228,180 210,172" fill="#D4B896" />
      {/* 3D top slanted glass panel */}
      <polygon points="10,10 210,10 228,2 28,2" fill="rgba(180,220,255,0.5)" stroke="#B0C0D0" strokeWidth="1" />
      {/* Counter base */}
      <rect x="4" y="130" width="210" height="55" rx="4" fill="url(#woodBase)" />
      {/* Wood grain lines */}
      {[140,150,160,170].map((y,i) => (
        <line key={i} x1="4" y1={y} x2="214" y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      ))}
      {/* Glass display case body */}
      <rect x="4" y="10" width="206" height="124" rx="4" fill="#F8F0E0" />
      {/* Glass front panel */}
      <rect x="8" y="14" width="198" height="114" rx="3" fill="rgba(200,230,255,0.35)" stroke="rgba(180,210,240,0.6)" strokeWidth="1.5" />
      {/* Glass reflection */}
      <rect x="8" y="14" width="25" height="114" rx="3" fill="rgba(255,255,255,0.12)" />
      {/* Interior */}
      <rect x="10" y="16" width="194" height="110" rx="2" fill="rgba(255,250,240,0.8)" />
      {/* Capacity fill */}
      <rect x="10" y={16 + 110*(1-Math.min(fillPct,1))} width="194" height={110*Math.min(fillPct,1)} rx="2" fill={`${fc}18`} />
      {/* Shelves - wood style */}
      {[55, 90].map((y,i) => (
        <g key={i}>
          <rect x="10" y={y} width="194" height="4" rx="1" fill="#D4B896" />
          <rect x="10" y={y} width="194" height="1" fill="rgba(255,255,255,0.4)" />
        </g>
      ))}
      {/* Interior lighting - warm */}
      <rect x="10" y="16" width="194" height="5" fill="url(#warmLight)" />
      {/* Frame top bar */}
      <rect x="4" y="4" width="206" height="8" rx="2" fill="#C8A878" />
      <text x="107" y="11" textAnchor="middle" fontSize="5.5" fill="#FFFFFF" fontWeight="700" fontFamily="sans-serif" letterSpacing="2">BÄCKEREI VITRINE</text>
      {/* Counter edge highlight */}
      <rect x="4" y="130" width="210" height="3" rx="1" fill="rgba(255,255,255,0.4)" />
      {/* Counter front panel */}
      <rect x="4" y="133" width="210" height="52" rx="3" fill="url(#woodFront)" />
      {/* Decorative panel lines */}
      {[0.33, 0.66].map((x,i) => (
        <line key={i} x1={4 + x*210} y1="133" x2={4 + x*210} y2="185" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
      ))}
      <defs>
        <linearGradient id="woodBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4B896" />
          <stop offset="100%" stopColor="#B89060" />
        </linearGradient>
        <linearGradient id="woodFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4A070" />
          <stop offset="100%" stopColor="#A07840" />
        </linearGradient>
        <linearGradient id="warmLight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,220,150,0)" />
          <stop offset="50%" stopColor="rgba(255,220,150,0.5)" />
          <stop offset="100%" stopColor="rgba(255,220,150,0)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function WalkInDevice({ fillPct }: { fillPct: number }) {
  const fc = fillColor(fillPct);
  return (
    <svg viewBox="0 0 200 220" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* 3D side wall */}
      <polygon points="190,4 210,10 210,216 190,216" fill="#6A7A6A" />
      {/* 3D top */}
      <polygon points="4,4 190,4 210,10 24,10" fill="#8A9A8A" />
      {/* Main door */}
      <rect x="4" y="4" width="186" height="214" rx="3" fill="url(#industrialMetal)" />
      {/* Rivets / bolt pattern */}
      {[20,50,80].map(x => [20,60,100,140,180,200].map((y,j) => (
        <circle key={`${x}-${j}`} cx={x} cy={y} r="3" fill="#708070" />
      )))}
      {[170].map(x => [20,60,100,140,180,200].map((y,j) => (
        <circle key={`r${x}-${j}`} cx={x} cy={y} r="3" fill="#708070" />
      )))}
      {/* Door inset panel */}
      <rect x="16" y="20" width="158" height="180" rx="3" fill="url(#doorPanel)" />
      {/* Capacity fill on door panel */}
      <rect x="16" y={20 + 180*(1-Math.min(fillPct,1))} width="158" height={180*Math.min(fillPct,1)} rx="2" fill={`${fc}20`} />
      {/* Warning stripes at bottom */}
      {Array.from({length: 10}, (_,i) => (
        <rect key={i} x={16 + i*16} y="188" width="8" height="12"
          fill={i%2===0 ? '#F59E0B' : '#1E2A1E'} />
      ))}
      <rect x="16" y="188" width="158" height="12" fill="none" stroke="#404040" strokeWidth="0.5" />
      {/* Main handle - large industrial bar */}
      <rect x="154" y="70" width="14" height="80" rx="4" fill="#4A5A4A" />
      <rect x="156" y="72" width="10" height="76" rx="3" fill="#6A7A6A" />
      <rect x="157" y="74" width="8" height="72" rx="2" fill="url(#handleShine)" />
      {/* Padlock detail */}
      <rect x="155" y="148" width="12" height="10" rx="2" fill="#3A3A3A" />
      <path d="M 159 148 Q 159 143 161 143 Q 163 143 163 148" fill="none" stroke="#5A5A5A" strokeWidth="1.5" />
      {/* Temperature display */}
      <rect x="30" y="28" width="70" height="22" rx="3" fill="#0A1A0A" />
      <text x="65" y="38" textAnchor="middle" fontSize="8" fill="#00DD00" fontWeight="700" fontFamily="monospace">+2°C</text>
      <text x="65" y="46" textAnchor="middle" fontSize="5" fill="#006600" fontFamily="monospace">KÜHLRAUM</text>
      {/* Door seal gasket lines */}
      <rect x="10" y="10" width="170" height="202" rx="4" fill="none" stroke="#384838" strokeWidth="3" />
      <rect x="10" y="10" width="170" height="202" rx="4" fill="none" stroke="#506050" strokeWidth="1" />
      <defs>
        <linearGradient id="industrialMetal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A5A4A" />
          <stop offset="30%" stopColor="#607060" />
          <stop offset="70%" stopColor="#506050" />
          <stop offset="100%" stopColor="#3A4A3A" />
        </linearGradient>
        <linearGradient id="doorPanel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3A4A3A" />
          <stop offset="100%" stopColor="#2A382A" />
        </linearGradient>
        <linearGradient id="handleShine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7A8A7A" />
          <stop offset="50%" stopColor="#90A090" />
          <stop offset="100%" stopColor="#6A7A6A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GenericDevice({ fillPct }: { fillPct: number }) {
  const fc = fillColor(fillPct);
  return (
    <svg viewBox="0 0 180 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <polygon points="174,4 192,2 192,200 174,198" fill="#C0C0C0" />
      <polygon points="4,4 174,4 192,2 22,2" fill="#D8D8D8" />
      <rect x="4" y="4" width="170" height="196" rx="6" fill="url(#genericBody)" />
      <rect x="14" y="20" width="150" height="166" rx="4" fill="rgba(0,0,0,0.08)" />
      <rect x="14" y={20 + 166*(1-Math.min(fillPct,1))} width="150" height={166*Math.min(fillPct,1)} rx="3" fill={`${fc}20`} />
      {[70, 120].map((y,i) => <rect key={i} x="14" y={y} width="150" height="2" rx="1" fill="rgba(255,255,255,0.4)" />)}
      <rect x="4" y="4" width="170" height="12" rx="3" fill="#888" />
      <defs>
        <linearGradient id="genericBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C8C8C8" />
          <stop offset="50%" stopColor="#E0E0E0" />
          <stop offset="100%" stopColor="#B8B8B8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DeviceIllustration({ name, fillPct }: { name: string; fillPct: number }) {
  const type = detectDevice(name);
  const n = name.toLowerCase();
  const size = n.includes('groß') ? 'groß' : n.includes('mittel') ? 'mittel' : n.includes('klein') ? 'klein' : '';

  if (type === 'freezer') return <FreezerDevice size={size as any} fillPct={fillPct} />;
  if (type === 'fridge')  return <FridgeDevice fillPct={fillPct} />;
  if (type === 'display') return <DisplayFridgeDevice fillPct={fillPct} />;
  if (type === 'counter') return <KuchenThekeDevice fillPct={fillPct} />;
  if (type === 'walkin')  return <WalkInDevice fillPct={fillPct} />;
  return <GenericDevice fillPct={fillPct} />;
}

// ── Device accent colors ──────────────────────────────────────────────────────

function deviceAccent(name: string): { color: string; bg: string; border: string } {
  const type = detectDevice(name);
  if (type === 'freezer') return { color: '#1B66C9', bg: '#EBF3FF', border: '#B8D4FF' };
  if (type === 'fridge')  return { color: '#6F19C2', bg: '#F4EDFF', border: '#D4C0FF' };
  if (type === 'display') return { color: '#0066CC', bg: '#E0EEFF', border: '#90C0FF' };
  if (type === 'counter') return { color: '#8A5A00', bg: '#FDF5E6', border: '#DDBB88' };
  if (type === 'walkin')  return { color: '#2D6A2D', bg: '#E8F5E8', border: '#90C890' };
  return { color: '#6A6A6A', bg: '#F7F7F7', border: '#DDDDDD' };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StorageVisualPage() {
  const qc = useQueryClient();
  const [verkauftRec, setVerkauftRec] = useState<any | null>(null);
  const [traceRec, setTraceRec] = useState<any | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['storage-records'],
    queryFn: () => storageApi.records.list().then(r => r.data),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ['storage-locations'],
    queryFn: () => storageApi.locations.list().then(r => r.data),
  });

  const verkauftMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) =>
      storageApi.records.move(id, { type: 'OUT', quantity: qty, notes: 'Verkauft' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-records'] });
      toast.success('✓ Verkauf gebucht');
      setVerkauftRec(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler beim Buchen'),
  });

  const activeRecords = (records as any[]).filter(r => r.quantity > 0 && r.isActive !== false);
  const expiredCount = activeRecords.filter(r => getExpiryState(r.expiryDate) === 'expired').length;
  const soonCount = activeRecords.filter(r => getExpiryState(r.expiryDate) === 'soon').length;
  const totalUnits = activeRecords.reduce((s: number, r: any) => s + Number(r.quantity), 0);

  const byLocation = new Map<string | null, any[]>();
  byLocation.set(null, []);
  for (const loc of locations as any[]) byLocation.set(loc.id, []);
  for (const rec of activeRecords) {
    const key = rec.locationId ?? null;
    if (!byLocation.has(key)) byLocation.set(key, []);
    byLocation.get(key)!.push(rec);
  }
  const unlocated = byLocation.get(null) ?? [];

  if (isLoading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="animate-pulse rounded-2xl" style={{ height: 160, background: '#F7F7F7' }} />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Lagerorte', value: (locations as any[]).length, color: '#1B66C9', bg: '#EBF3FF' },
          { label: 'Positionen', value: activeRecords.length, color: '#256F3A', bg: '#E8F8EE' },
          { label: 'Gesamt Stk', value: Math.round(totalUnits), color: '#6F19C2', bg: '#F4EDFF' },
          { label: 'Ablauf-Warnungen', value: expiredCount + soonCount, color: expiredCount + soonCount > 0 ? '#C13515' : '#6A6A6A', bg: expiredCount + soonCount > 0 ? '#FFF0EC' : '#F7F7F7' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 18px', border: `1px solid ${s.color}22` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(expiredCount > 0 || soonCount > 0) && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: '#FEF3CD', border: '1px solid #FADA92' }}>
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            {expiredCount > 0 && <span className="font-semibold text-amber-800">{expiredCount} Charge(n) abgelaufen. </span>}
            {soonCount > 0 && <span className="text-amber-700">{soonCount} Charge(n) laufen in den nächsten 4 Tagen ab.</span>}
          </div>
        </div>
      )}

      {/* Device list — horizontal cards */}
      <div className="space-y-4">
        {(locations as any[]).map(loc => {
          const items = byLocation.get(loc.id) ?? [];
          const totalQty = items.reduce((s: number, r: any) => s + Number(r.quantity), 0);
          const maxQty = loc.capacity ? loc.capacity * 80 : 160;
          const fillPct = Math.min(totalQty / maxQty, 1);
          const accent = deviceAccent(loc.name);

          return (
            <DeviceCard
              key={loc.id}
              loc={loc}
              items={items}
              totalQty={totalQty}
              fillPct={fillPct}
              accent={accent}
              onVerkauft={setVerkauftRec}
              onTrace={setTraceRec}
            />
          );
        })}

        {unlocated.length > 0 && (
          <DeviceCard
            loc={{ id: '__none', name: 'Kein Lagerort', description: 'Nicht zugewiesene Produkte', capacity: null }}
            items={unlocated}
            totalQty={unlocated.reduce((s: number, r: any) => s + Number(r.quantity), 0)}
            fillPct={0}
            accent={{ color: '#6A6A6A', bg: '#F7F7F7', border: '#DDDDDD' }}
            onVerkauft={setVerkauftRec}
            onTrace={setTraceRec}
          />
        )}
      </div>

      {/* Verkauft dialog */}
      {verkauftRec && (
        <VerkauftDialog
          rec={verkauftRec}
          onClose={() => setVerkauftRec(null)}
          onConfirm={(qty) => verkauftMutation.mutate({ id: verkauftRec.id, qty })}
          loading={verkauftMutation.isPending}
        />
      )}

      {/* Trace modal */}
      {traceRec && (
        <BatchTraceModal
          storageRecordId={traceRec.id}
          batchNumber={traceRec.batchNumber ?? '—'}
          productName={traceRec.product?.name ?? '—'}
          onClose={() => setTraceRec(null)}
        />
      )}
    </div>
  );
}

// ── Device Card — horizontal layout ──────────────────────────────────────────

function DeviceCard({ loc, items, totalQty, fillPct, accent, onVerkauft, onTrace }: {
  loc: any; items: any[]; totalQty: number; fillPct: number;
  accent: { color: string; bg: string; border: string };
  onVerkauft: (r: any) => void; onTrace: (r: any) => void;
}) {
  const fc = fillColor(fillPct);
  const pctLabel = `${Math.round(fillPct * 100)}%`;

  return (
    <div style={{
      display: 'flex', borderRadius: 18, overflow: 'hidden',
      border: `1.5px solid ${accent.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)',
      background: '#FFFFFF',
    }}>
      {/* ── Left panel: device illustration ── */}
      <div style={{
        width: 200, minWidth: 200, flexShrink: 0,
        background: accent.bg,
        borderRight: `1.5px solid ${accent.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '20px 16px', gap: 10, position: 'relative',
      }}>
        {/* Device type badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10, right: 10,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: accent.color,
            background: '#FFFFFF', border: `1px solid ${accent.border}`,
            borderRadius: 9999, padding: '2px 10px', letterSpacing: '0.04em',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: '90%',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {loc.name}
          </div>
        </div>

        {/* SVG illustration */}
        <div style={{ width: 130, marginTop: 20, marginBottom: 4 }}>
          <DeviceIllustration name={loc.name} fillPct={fillPct} />
        </div>

        {/* Capacity mini-bar */}
        <div style={{ width: '100%', paddingTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: accent.color, opacity: 0.7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Kapazität</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: fc }}>{pctLabel}</span>
          </div>
          <div style={{ height: 5, background: `${accent.color}22`, borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${fillPct * 100}%`,
              background: `linear-gradient(90deg, ${fc}CC, ${fc})`,
              borderRadius: 9999, transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ fontSize: 9, color: '#B0B0B0', marginTop: 3, textAlign: 'center' }}>
            {Math.round(totalQty)} Stk{loc.capacity != null ? ` · max ${loc.capacity} Einh.` : ''}
          </div>
        </div>
      </div>

      {/* ── Right panel: product rows ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 20px 10px',
          borderBottom: `1px solid #F0F0F0`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#222222', flex: 1 }}>{loc.description || 'Lagerinhalt'}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#FFFFFF',
            background: items.length > 0 ? accent.color : '#CCCCCC',
            borderRadius: 9999, padding: '2px 10px',
          }}>{items.length} Position{items.length !== 1 ? 'en' : ''}</span>
          {/* Expiry legend inline */}
          {(['expired', 'soon', 'ok'] as ExpiryState[]).map(s => {
            const cnt = items.filter(r => getExpiryState(r.expiryDate) === s).length;
            if (cnt === 0) return null;
            const c = EXPIRY_COLORS[s];
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: c.text, fontWeight: 600 }}>{cnt} {c.label}</span>
              </div>
            );
          })}
        </div>

        {/* Product rows */}
        <div style={{ padding: '8px 16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 6, padding: '20px 0',
              border: '1.5px dashed #EBEBEB', borderRadius: 12,
            }}>
              <BoxIcon style={{ width: 24, height: 24, color: '#DDDDDD' }} />
              <span style={{ fontSize: 12, color: '#C0C0C0', fontWeight: 500 }}>Dieses Lager ist leer</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 5, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {items.map(rec => {
                const state = getExpiryState(rec.expiryDate);
                const c = EXPIRY_COLORS[state];
                const qty = Number(rec.quantity);
                return (
                  <div key={rec.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 10, padding: '7px 10px',
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#222222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.product?.name ?? '—'}
                      </div>
                      {rec.batchNumber && (
                        <div style={{ fontSize: 10, color: '#9A9A9A', marginTop: 1 }}>#{rec.batchNumber}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: c.text, flexShrink: 0 }}>{qty} Stk</span>
                    {rec.expiryDate && (
                      <span style={{
                        fontSize: 10, color: c.text, flexShrink: 0,
                        background: `${c.border}`, borderRadius: 6, padding: '2px 6px', fontWeight: 600,
                      }}>
                        {format(new Date(rec.expiryDate), 'dd.MM.yy')}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => onVerkauft(rec)} title="Verkaufen" style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: '#222222', color: '#FFFFFF', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}>
                        <ShoppingBag style={{ width: 12, height: 12 }} />
                      </button>
                      <button onClick={() => onTrace(rec)} title="Verlauf" style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: '#F7F7F7', color: '#6A6A6A',
                        border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}>
                        <History style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Verkauft Dialog ───────────────────────────────────────────────────────────

function VerkauftDialog({ rec, onClose, onConfirm, loading }: {
  rec: any; onClose: () => void; onConfirm: (qty: number) => void; loading: boolean;
}) {
  const max = Number(rec.quantity);
  const [qty, setQty] = useState(max);
  return (
    <Modal title="Verkauft buchen" onClose={onClose} size="sm">
      <div style={{
        background: '#F7F7F7', border: '1px solid #EBEBEB',
        borderRadius: 14, padding: '14px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <ShoppingBag style={{ width: 22, height: 22, color: '#222222', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#222222' }}>{rec.product?.name ?? '—'}</div>
          <div style={{ fontSize: 12, color: '#6A6A6A', marginTop: 2 }}>Auf Lager: <strong>{max} Stück</strong></div>
        </div>
      </div>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#222222', marginBottom: 8 }}>
        Wie viele Stück wurden verkauft?
      </label>
      <input
        type="number" min={1} max={max} value={qty}
        onChange={e => setQty(Math.min(max, Math.max(1, Number(e.target.value))))}
        autoFocus className="input"
        style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', height: 64 }}
      />
      <div style={{ fontSize: 11, color: '#B0B0B0', textAlign: 'center', marginTop: 6 }}>Maximum: {max} Stück</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Abbrechen</button>
        <button
          onClick={() => onConfirm(qty)} disabled={loading || qty < 1 || qty > max}
          className="btn btn-primary" style={{ flex: 2, fontSize: 15, fontWeight: 700 }}
        >
          <ShoppingBag style={{ width: 16, height: 16 }} />
          {loading ? 'Wird gebucht…' : `${qty} Stk verkauft ✓`}
        </button>
      </div>
    </Modal>
  );
}
