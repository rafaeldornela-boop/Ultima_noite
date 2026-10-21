import type { DistrictId } from '../action/actionTypes.ts';

/**
 * High-impact cinematic backdrop of an abandoned, post-apocalyptic zombie city at twilight.
 * Pure responsive SVG with high-detail silhouettes, wrecked vehicles, cracked asphalt,
 * burning flares, and toxic fog effects. Works 100% offline and loads instantly.
 */
export function CityCinematicBackdropSvg() {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full object-cover"
      aria-hidden="true"
    >
      <defs>
        {/* Sky gradient: dark apocalyptic dusk */}
        <linearGradient id="apocSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#080706" />
          <stop offset="35%" stopColor="#15110e" />
          <stop offset="65%" stopColor="#2e1810" />
          <stop offset="100%" stopColor="#0f0c0a" />
        </linearGradient>

        {/* Eerie toxic fog / dust glow */}
        <radialGradient id="smokeGlow" cx="45%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#d97724" stopOpacity="0.25" />
          <stop offset="40%" stopColor="#b93829" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Hazard flare glow */}
        <radialGradient id="flareGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff4d2e" stopOpacity="0.8" />
          <stop offset="30%" stopColor="#d97724" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#15110e" stopOpacity="0" />
        </radialGradient>

        {/* Spotlight beam */}
        <linearGradient id="searchBeam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
          <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#0d0c0a" stopOpacity="0" />
        </linearGradient>

        {/* Asphalt pattern */}
        <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1614" />
          <stop offset="100%" stopColor="#0d0b09" />
        </linearGradient>
      </defs>

      {/* Sky & Atmosphere */}
      <rect width="1600" height="900" fill="url(#apocSky)" />
      <rect width="1600" height="900" fill="url(#smokeGlow)" />

      {/* Distant searchlight sweeps across the sky */}
      <polygon points="1200,900 1100,0 1280,0" fill="url(#searchBeam)" opacity="0.35" />

      {/* Distant Ruined Skyline Layer 1 (farthest) */}
      <g fill="#120e0c" opacity="0.6">
        <polygon points="120,600 120,380 180,380 200,420 200,600" />
        <polygon points="220,600 220,340 310,320 340,360 340,600" />
        <polygon points="400,600 400,390 470,390 490,430 490,600" />
        <polygon points="560,600 560,300 660,320 680,600" />
        <polygon points="720,600 720,250 830,270 850,600" />
        <polygon points="900,600 900,350 990,330 1020,600" />
        <polygon points="1060,600 1060,280 1180,310 1210,600" />
        <polygon points="1250,600 1250,360 1370,340 1400,600" />
        <polygon points="1440,600 1440,390 1560,410 1580,600" />
      </g>

      {/* Midground Collapsed Skyscraper & Communication Tower */}
      <g fill="#191310" opacity="0.85">
        <polygon points="280,600 280,290 380,240 430,340 430,600" />
        {/* Broken structure hole */}
        <polygon points="310,320 360,300 370,360 320,380" fill="#0c0908" />
        {/* Ruined tower on right */}
        <polygon points="960,600 960,220 1050,220 1070,600" />
        <line x1="1005" y1="220" x2="1005" y2="140" stroke="#2c221c" strokeWidth="4" />
        <line x1="985" y1="170" x2="1025" y2="170" stroke="#2c221c" strokeWidth="3" />
        {/* Antennas & cranes */}
        <line x1="770" y1="250" x2="810" y2="170" stroke="#33241c" strokeWidth="3" />
        <line x1="810" y1="170" x2="890" y2="190" stroke="#33241c" strokeWidth="2" />
      </g>

      {/* Red beacon lights atop ruins */}
      <circle cx="1005" cy="140" r="3" fill="#ff3b30" opacity="0.9" />
      <circle cx="770" cy="250" r="2.5" fill="#ff3b30" opacity="0.8" />
      <circle cx="810" cy="170" r="2.5" fill="#f59e0b" opacity="0.7" />

      {/* Elevated Highway / Overpass Overhang */}
      <polygon points="0,520 1600,480 1600,560 0,600" fill="#14100e" />
      {/* Highway Support Columns */}
      <rect x="250" y="560" width="40" height="180" fill="#1a1411" />
      <rect x="680" y="540" width="45" height="200" fill="#1a1411" />
      <rect x="1150" y="520" width="45" height="220" fill="#1a1411" />

      {/* Wrecked Cars on Highway Deck */}
      <polygon points="320,535 340,515 390,515 410,535" fill="#0d0a09" />
      <polygon points="760,515 785,495 840,495 860,515" fill="#0d0a09" />
      <polygon points="855,510 870,490 920,490 940,510" fill="#1e1814" />

      {/* Ground Level Asphalt & Street */}
      <polygon points="0,620 1600,580 1600,900 0,900" fill="url(#roadGrad)" />

      {/* Asphalt Cracks */}
      <path
        d="M200,680 L240,710 L220,740 L280,780 M600,640 L650,670 L640,720 L700,760 M1100,660 L1150,680 L1130,730 L1180,750"
        stroke="#060505"
        strokeWidth="3"
        fill="none"
      />

      {/* Abandoned Police Cruiser / SUV in Foreground Left */}
      <g transform="translate(180, 670) scale(0.95)">
        {/* Car body */}
        <polygon points="20,70 50,30 150,30 200,50 240,50 250,75 10,75" fill="#12161b" stroke="#2c3642" strokeWidth="2" />
        {/* Windshield & windows */}
        <polygon points="55,34 75,50 140,50 145,34" fill="#202933" />
        {/* Broken police roof light bar (one red flare glowing) */}
        <rect x="90" y="22" width="30" height="8" rx="2" fill="#242b35" />
        <rect x="92" y="24" width="12" height="4" fill="#38bdf8" opacity="0.4" />
        <rect x="106" y="24" width="12" height="4" fill="#ef4444" opacity="0.8" />
        <circle cx="112" cy="26" r="14" fill="#ef4444" opacity="0.25" />
        {/* Flat tires */}
        <circle cx="50" cy="78" r="16" fill="#0d0d0f" stroke="#1f1f24" strokeWidth="3" />
        <circle cx="195" cy="78" r="16" fill="#0d0d0f" stroke="#1f1f24" strokeWidth="3" />
      </g>

      {/* Overturned Delivery Truck in Foreground Right */}
      <g transform="translate(1220, 640) scale(1)">
        <polygon points="20,110 50,20 220,30 240,110" fill="#181310" stroke="#33241b" strokeWidth="2" />
        {/* Cab */}
        <polygon points="220,40 270,60 270,110 230,110" fill="#211814" />
        {/* Shattered windshield */}
        <polygon points="230,50 260,65 245,85 225,80" fill="#3b2b22" />
        {/* Biohazard warning symbol hint on truck side */}
        <circle cx="120" cy="65" r="18" fill="none" stroke="#d97724" strokeWidth="2.5" opacity="0.4" />
        <circle cx="120" cy="65" r="7" fill="#d97724" opacity="0.4" />
      </g>

      {/* Burning Road Flare in Foreground Center (Atmospheric Lighting) */}
      <circle cx="820" cy="760" r="120" fill="url(#flareGlow)" />
      <polygon points="815,760 825,760 822,740 818,740" fill="#fff" />
      <circle cx="820" cy="742" r="5" fill="#fde047" />

      {/* Barricade Beams & Concertina Wire */}
      <g stroke="#382920" strokeWidth="7" strokeLinecap="round">
        <line x1="720" y1="730" x2="790" y2="760" />
        <line x1="740" y1="770" x2="770" y2="720" />
        <line x1="860" y1="730" x2="930" y2="760" />
        <line x1="880" y1="770" x2="910" y2="720" />
      </g>

      {/* Zombie Silhouettes in distant fog */}
      <g fill="#0e0a09" opacity="0.75">
        {/* Walker 1 */}
        <circle cx="540" cy="640" r="6" />
        <path d="M536,646 L544,646 L546,670 L540,670 L538,660 L535,670 L531,670 Z" />
        <line x1="536" y1="652" x2="528" y2="662" stroke="#0e0a09" strokeWidth="2" />
        {/* Walker 2 */}
        <circle cx="575" cy="644" r="5" />
        <path d="M572,649 L579,649 L581,671 L576,671 L575,662 L572,671 L568,671 Z" />
        <line x1="578" y1="654" x2="588" y2="656" stroke="#0e0a09" strokeWidth="2" />
        {/* Walker 3 */}
        <circle cx="1020" cy="635" r="5.5" />
        <path d="M1016,641 L1024,641 L1025,665 L1020,665 L1019,655 L1015,665 L1012,665 Z" />
      </g>

      {/* Atmospheric Heavy Smoke vignette at bottom and sides */}
      <rect width="1600" height="900" fill="url(#smokeGlow)" opacity="0.7" />
    </svg>
  );
}

/**
 * Visual illustration card for a district (Top-down & isometric apocalyptic style).
 * Distinct art for Vila Esperança (suburbs), Centro Comercial (commercial strip),
 * Complexo Médico (quarantine hospital), and Locked Military Sectors.
 */
export function DistrictVisualCardArt({
  districtId,
  isLocked = false,
  className = 'w-full h-32',
}: {
  districtId: DistrictId | 'zona_industrial';
  isLocked?: boolean;
  className?: string;
}) {
  if (isLocked || districtId === 'zona_industrial') {
    return (
      <svg viewBox="0 0 400 180" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="lockBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#151210" />
            <stop offset="100%" stopColor="#0a0807" />
          </linearGradient>
          <pattern id="hazardStripe" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="20" fill="#1c1611" />
            <rect x="10" width="10" height="20" fill="#0d0a08" />
          </pattern>
        </defs>
        <rect width="400" height="180" fill="url(#lockBg)" />
        <rect width="400" height="180" fill="url(#hazardStripe)" opacity="0.6" />

        {/* Heavy Steel Quarantine Gate */}
        <rect x="40" y="20" width="320" height="140" rx="4" fill="#1a1512" stroke="#3d2c22" strokeWidth="3" />
        <line x1="40" y1="65" x2="360" y2="65" stroke="#3d2c22" strokeWidth="2" />
        <line x1="40" y1="115" x2="360" y2="115" stroke="#3d2c22" strokeWidth="2" />
        <line x1="120" y1="20" x2="120" y2="160" stroke="#3d2c22" strokeWidth="2" />
        <line x1="200" y1="20" x2="200" y2="160" stroke="#3d2c22" strokeWidth="2" />
        <line x1="280" y1="20" x2="280" y2="160" stroke="#3d2c22" strokeWidth="2" />

        {/* Heavy Chains across Gate */}
        <path d="M60,35 Q200,120 340,35" fill="none" stroke="#6b5b50" strokeWidth="5" strokeDasharray="8 4" />
        <path d="M60,145 Q200,60 340,145" fill="none" stroke="#6b5b50" strokeWidth="5" strokeDasharray="8 4" />

        {/* Central Padlock & Quarantine Warning */}
        <g transform="translate(175, 65)">
          <rect x="10" y="20" width="30" height="26" rx="4" fill="#2c221b" stroke="#c87a28" strokeWidth="2" />
          <path d="M16,20 V10 A9,9 0 0 1 34,10 V20" fill="none" stroke="#c87a28" strokeWidth="3" />
          <circle cx="25" cy="32" r="3" fill="#c87a28" />
        </g>

        {/* Warning Plate */}
        <rect x="110" y="130" width="180" height="24" rx="2" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
        <text x="200" y="146" fill="#fef2f2" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
          ACESSO BLOQUEADO
        </text>
      </svg>
    );
  }

  switch (districtId) {
    case 'vila_esperanca':
      return (
        <svg viewBox="0 0 400 180" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="suburbBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e1a17" />
              <stop offset="100%" stopColor="#110e0c" />
            </linearGradient>
            <radialGradient id="houseLight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e09132" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="180" fill="url(#suburbBg)" />

          {/* Cracked Suburban Roadway */}
          <polygon points="140,0 260,0 320,180 80,180" fill="#171311" />
          <line x1="200" y1="0" x2="200" y2="180" stroke="#4a3e35" strokeWidth="2" strokeDasharray="16 12" />

          {/* Left Suburban House (Barricaded) */}
          <g transform="translate(15, 20)">
            <polygon points="10,40 55,10 100,40" fill="#2b231d" stroke="#423429" strokeWidth="2" />
            <rect x="15" y="40" width="80" height="60" fill="#1f1814" stroke="#423429" strokeWidth="2" />
            {/* Boarded window */}
            <rect x="25" y="50" width="22" height="20" fill="#0d0b09" />
            <line x1="23" y1="52" x2="49" y2="68" stroke="#8c6d48" strokeWidth="3" />
            <line x1="23" y1="68" x2="49" y2="52" stroke="#8c6d48" strokeWidth="3" />
            {/* Barricaded Door */}
            <rect x="60" y="55" width="24" height="45" fill="#130f0d" stroke="#33241b" strokeWidth="1.5" />
            <line x1="57" y1="70" x2="87" y2="70" stroke="#c87a28" strokeWidth="3" />
          </g>

          {/* Right Suburban House & Garden Fence */}
          <g transform="translate(285, 30)">
            <polygon points="10,40 55,10 100,40" fill="#26211c" stroke="#3d332b" strokeWidth="2" />
            <rect x="15" y="40" width="80" height="65" fill="#1c1714" stroke="#3d332b" strokeWidth="2" />
            {/* Warm crack of light in window */}
            <rect x="30" y="52" width="20" height="18" fill="url(#houseLight)" />
            <rect x="30" y="52" width="20" height="18" fill="none" stroke="#523e30" strokeWidth="1.5" />
            {/* Wooden garden fence */}
            <line x1="-20" y1="95" x2="15" y2="95" stroke="#4a3b30" strokeWidth="4" />
            <line x1="-15" y1="85" x2="-15" y2="105" stroke="#4a3b30" strokeWidth="3" />
            <line x1="-5" y1="85" x2="-5" y2="105" stroke="#4a3b30" strokeWidth="3" />
            <line x1="5" y1="85" x2="5" y2="105" stroke="#4a3b30" strokeWidth="3" />
          </g>

          {/* Abandoned Station Wagon in street */}
          <g transform="translate(140, 95) scale(0.85)">
            <rect x="10" y="15" width="75" height="36" rx="4" fill="#242127" stroke="#3d3845" strokeWidth="1.5" />
            <rect x="22" y="19" width="30" height="14" rx="2" fill="#141216" />
            <circle cx="28" cy="51" r="7" fill="#0d0c0e" stroke="#2b2830" strokeWidth="2" />
            <circle cx="68" cy="51" r="7" fill="#0d0c0e" stroke="#2b2830" strokeWidth="2" />
          </g>

          {/* Extraction Gate indicator (Estrada Norte) */}
          <rect x="235" y="10" width="150" height="22" rx="2" fill="#0f291a" stroke="#2d6a4f" strokeWidth="1.5" />
          <text x="310" y="24" fill="#52b788" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="1">
            🚪 ESTRADA NORTE
          </text>
        </svg>
      );

    case 'centro_comercial':
      return (
        <svg viewBox="0 0 400 180" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="comBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e1816" />
              <stop offset="100%" stopColor="#0f0c0a" />
            </linearGradient>
            <linearGradient id="shatteredShop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2c3e50" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0d1117" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <rect width="400" height="180" fill="url(#comBg)" />

          {/* Wide Commercial Avenue */}
          <rect x="0" y="70" width="400" height="85" fill="#14110f" />
          <line x1="0" y1="112" x2="400" y2="112" stroke="#c87a28" strokeWidth="2" strokeDasharray="18 14" opacity="0.4" />

          {/* Storefronts on top edge */}
          <rect x="20" y="10" width="110" height="60" fill="#211b18" stroke="#3d312a" strokeWidth="2" />
          <rect x="28" y="24" width="94" height="34" fill="url(#shatteredShop)" stroke="#4a5568" strokeWidth="1" />
          {/* Shattered glass crack lines */}
          <path d="M40,30 L65,45 L80,32 M65,45 L70,55" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.6" fill="none" />
          <text x="75" y="20" fill="#d97724" fontSize="8" fontWeight="bold" textAnchor="middle">SUPERMERCADO</text>

          <rect x="145" y="10" width="110" height="60" fill="#1b201d" stroke="#2e3832" strokeWidth="2" />
          <rect x="153" y="24" width="94" height="34" fill="#141c18" stroke="#2e3832" strokeWidth="1" />
          <text x="200" y="20" fill="#52b788" fontSize="8" fontWeight="bold" textAnchor="middle">FARMÁCIA CENTRAL</text>
          {/* Green cross on shop */}
          <path d="M200,32 V48 M192,40 H208" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />

          <rect x="270" y="10" width="110" height="60" fill="#221b24" stroke="#3b2e3e" strokeWidth="2" />
          <text x="325" y="20" fill="#a855f7" fontSize="8" fontWeight="bold" textAnchor="middle">DELEGACIA DISTRITAL</text>

          {/* Overturned Box Truck in intersection */}
          <g transform="translate(150, 80) scale(0.9)">
            <polygon points="10,45 25,10 110,10 115,45" fill="#2d221b" stroke="#4d3b2f" strokeWidth="1.5" />
            <rect x="110" y="20" width="30" height="25" fill="#241b15" />
            <circle cx="35" cy="46" r="8" fill="#120e0b" />
            <circle cx="95" cy="46" r="8" fill="#120e0b" />
          </g>

          {/* Concrete highway barricades & trash in foreground */}
          <rect x="30" y="145" width="60" height="16" rx="2" fill="#2b2622" stroke="#473f38" strokeWidth="1.5" />
          <rect x="110" y="148" width="55" height="15" rx="2" fill="#2b2622" stroke="#473f38" strokeWidth="1.5" />
          <rect x="280" y="145" width="80" height="16" rx="2" fill="#2b2622" stroke="#473f38" strokeWidth="1.5" />

          {/* Extraction Gate indicator */}
          <rect x="250" y="85" width="135" height="22" rx="2" fill="#0f291a" stroke="#2d6a4f" strokeWidth="1.5" />
          <text x="317" y="99" fill="#52b788" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="1">
            🚪 ESTAÇÃO SUL
          </text>
        </svg>
      );

    case 'complexo_medico':
      return (
        <svg viewBox="0 0 400 180" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="medBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1e22" />
              <stop offset="100%" stopColor="#0d1114" />
            </linearGradient>
            <radialGradient id="ambGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="180" fill="url(#medBg)" />

          {/* Hospital Perimeter Wall */}
          <rect x="20" y="20" width="360" height="45" fill="#242b33" stroke="#3b4754" strokeWidth="2" />
          <text x="200" y="38" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="2">
            HOSPITAL REGIONAL DE CONTENÇÃO
          </text>
          <text x="200" y="52" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1">
            BIOHAZARD NÍVEL 4 · ISOLAMENTO TOTAL
          </text>

          {/* Triage Tents (Quarantine Field) */}
          <polygon points="50,110 80,75 110,110" fill="#3a4738" stroke="#4e614b" strokeWidth="2" />
          <polygon points="120,110 150,75 180,110" fill="#3a4738" stroke="#4e614b" strokeWidth="2" />
          {/* Red Cross on Tents */}
          <path d="M80,88 V98 M75,93 H85" stroke="#ef4444" strokeWidth="2" />
          <path d="M150,88 V98 M145,93 H155" stroke="#ef4444" strokeWidth="2" />

          {/* Ambulance parked with flashing broken light */}
          <g transform="translate(240, 80) scale(0.95)">
            <rect x="10" y="15" width="85" height="42" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
            {/* Orange hazard side stripe */}
            <rect x="10" y="32" width="85" height="10" fill="#f97316" />
            {/* Red Cross */}
            <path d="M52,20 V30 M47,25 H57" stroke="#dc2626" strokeWidth="3" />
            {/* Broken flashing roof light */}
            <circle cx="25" cy="10" r="16" fill="url(#ambGlow)" />
            <rect x="20" y="8" width="10" height="7" rx="1" fill="#dc2626" />
            {/* Tires */}
            <circle cx="30" cy="58" r="8" fill="#1e293b" />
            <circle cx="78" cy="58" r="8" fill="#1e293b" />
          </g>

          {/* Barbed Wire fence along bottom */}
          <line x1="20" y1="150" x2="380" y2="150" stroke="#64748b" strokeWidth="2" />
          <path d="M30,146 L38,154 M60,146 L68,154 M90,146 L98,154 M120,146 L128,154 M150,146 L158,154 M180,146 L188,154 M210,146 L218,154 M240,146 L248,154 M270,146 L278,154 M300,146 L308,154 M330,146 L338,154 M360,146 L368,154" stroke="#94a3b8" strokeWidth="2" />

          {/* Extraction Gate indicator (Heliporto Oeste) */}
          <rect x="20" y="80" width="105" height="22" rx="2" fill="#12251a" stroke="#2d6a4f" strokeWidth="1.5" />
          <text x="72" y="94" fill="#52b788" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" letterSpacing="1">
            🚪 HELIPORTO OESTE
          </text>
        </svg>
      );
  }
}
