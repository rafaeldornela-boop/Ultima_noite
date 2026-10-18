import type { AttributeType, LocationId, ResourceType } from '../game/types.ts';

export function TitleEmblemSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b241f" />
          <stop offset="100%" stopColor="#14110f" />
        </linearGradient>
      </defs>
      {/* Outer Heavy Metal Shield */}
      <path
        d="M48 6 L84 18 V46 C84 68 68 83 48 91 C28 83 12 68 12 46 V18 Z"
        fill="url(#shieldGrad)"
        stroke="#c26d2d"
        strokeWidth="2.5"
      />
      <path
        d="M48 12 L78 22 V45 C78 63 64 76 48 84 C32 76 18 63 18 45 V22 Z"
        fill="none"
        stroke="#4a3b31"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      {/* Barricade Cross Planks & Sunburst */}
      <circle cx="48" cy="44" r="16" fill="#b93829" fillOpacity="0.22" />
      <path
        d="M30 34 L66 54 M66 34 L30 54"
        stroke="#d9822b"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M48 22 V68"
        stroke="#e7e2da"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="48" cy="44" r="5" fill="#14110f" stroke="#d9822b" strokeWidth="2.5" />
    </svg>
  );
}

export function TitleBackdropSvg() {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full object-cover"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d0b0a" />
          <stop offset="45%" stopColor="#1c1512" />
          <stop offset="78%" stopColor="#381d14" />
          <stop offset="100%" stopColor="#12100e" />
        </linearGradient>
        <radialGradient id="amberGlow" cx="72%" cy="58%" r="45%">
          <stop offset="0%" stopColor="#d97724" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#9e2f20" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#12100e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#skyDusk)" />
      <rect width="1440" height="900" fill="url(#amberGlow)" />

      {/* Distant ruined city skyline on right half (leaving calm negative space on left) */}
      <g fill="#161210" opacity="0.9">
        <polygon points="620,620 620,340 690,340 710,370 710,620" />
        <polygon points="730,620 730,270 830,285 830,620" />
        <polygon points="850,620 850,320 940,300 960,620" />
        <polygon points="980,620 980,230 1090,250 1110,620" />
        <polygon points="1130,620 1130,310 1240,310 1240,620" />
        <polygon points="1260,620 1260,360 1380,340 1380,620" />
      </g>

      {/* Glowing shelter window light in the ruins */}
      <g fill="#e08b36" opacity="0.75">
        <rect x="1015" y="340" width="14" height="22" rx="1" />
        <rect x="1038" y="340" width="14" height="22" rx="1" />
        <rect x="765" y="390" width="12" height="18" rx="1" />
      </g>

      {/* Foreground Barricaded Overlook Silhouette */}
      <path
        d="M0,610 L1440,590 L1440,900 L0,900 Z"
        fill="#110e0c"
      />
      {/* Wooden Barricade Beams on Right Foreground */}
      <g stroke="#29211c" strokeWidth="18" opacity="0.7">
        <line x1="920" y1="480" x2="1390" y2="660" />
        <line x1="960" y1="670" x2="1360" y2="490" />
      </g>
      {/* Subtle barbed wire silhouette */}
      <path
        d="M580,595 Q760,570 940,595 T1320,580"
        fill="none"
        stroke="#3b2e26"
        strokeWidth="2"
      />
    </svg>
  );
}

export function LocationIllustrationSvg({
  locationId,
  className = 'w-full h-32',
}: {
  locationId: LocationId;
  className?: string;
}) {
  switch (locationId) {
    case 'supermercado':
      return (
        <svg viewBox="0 0 400 160" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="bgSuper" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1c1815" />
              <stop offset="100%" stopColor="#2d2118" />
            </linearGradient>
          </defs>
          <rect width="400" height="160" fill="url(#bgSuper)" />
          {/* Sunbeam from skylight */}
          <polygon points="180,0 250,0 320,160 120,160" fill="#d9822b" opacity="0.12" />
          {/* Shelving aisles */}
          <g stroke="#4a3c32" strokeWidth="3" fill="#171311">
            <rect x="28" y="28" width="90" height="110" />
            <line x1="28" y1="62" x2="118" y2="62" />
            <line x1="28" y1="96" x2="118" y2="96" />
            <rect x="275" y="24" width="95" height="114" />
            <line x1="275" y1="60" x2="370" y2="60" />
            <line x1="275" y1="96" x2="370" y2="96" />
          </g>
          {/* Canned goods & crates */}
          <rect x="42" y="46" width="14" height="14" fill="#c26d2d" rx="2" />
          <rect x="62" y="48" width="12" height="12" fill="#8c4a27" rx="2" />
          <rect x="295" y="78" width="22" height="16" fill="#b93829" rx="2" />
          <circle cx="195" cy="128" r="9" fill="#5c4b3e" />
        </svg>
      );

    case 'farmacia':
      return (
        <svg viewBox="0 0 400 160" className={className} aria-hidden="true">
          <rect width="400" height="160" fill="#161b19" />
          <polygon points="80,0 150,0 240,160 30,160" fill="#38a169" opacity="0.09" />
          {/* Medical Cross Sign tilted */}
          <g transform="translate(175, 28) rotate(-8)">
            <rect x="0" y="0" width="52" height="52" rx="6" fill="#1f2925" stroke="#3f594e" strokeWidth="2" />
            <path d="M26 12 V40 M12 26 H40" stroke="#c53030" strokeWidth="8" strokeLinecap="round" />
          </g>
          {/* Pharmacy counter and medicine shelves */}
          <rect x="24" y="102" width="352" height="42" fill="#212825" stroke="#37453f" strokeWidth="2" />
          <rect x="52" y="84" width="16" height="18" rx="2" fill="#d9822b" />
          <rect x="76" y="88" width="12" height="14" rx="2" fill="#e2e8f0" opacity="0.6" />
          <rect x="300" y="82" width="20" height="20" rx="2" fill="#b93829" />
        </svg>
      );

    case 'delegacia':
      return (
        <svg viewBox="0 0 400 160" className={className} aria-hidden="true">
          <rect width="400" height="160" fill="#16171c" />
          <polygon points="260,0 330,0 390,160 200,160" fill="#b93829" opacity="0.14" />
          {/* Steel Armory Bars */}
          <g stroke="#434754" strokeWidth="5">
            <line x1="60" y1="10" x2="60" y2="150" />
            <line x1="110" y1="10" x2="110" y2="150" />
            <line x1="160" y1="10" x2="160" y2="150" />
            <line x1="210" y1="10" x2="210" y2="150" />
            <line x1="30" y1="55" x2="240" y2="55" />
            <line x1="30" y1="110" x2="240" y2="110" />
          </g>
          {/* Ammo Crates */}
          <rect x="268" y="92" width="84" height="44" rx="4" fill="#272a33" stroke="#d9822b" strokeWidth="2" />
          <path d="M286 114 H334" stroke="#d9822b" strokeWidth="3" />
        </svg>
      );

    case 'casas_abandonadas':
    default:
      return (
        <svg viewBox="0 0 400 160" className={className} aria-hidden="true">
          <rect width="400" height="160" fill="#1a1613" />
          {/* House Silhouette */}
          <polygon points="80,75 200,22 320,75" fill="#29211c" stroke="#473930" strokeWidth="2" />
          <rect x="105" y="75" width="190" height="75" fill="#211b17" stroke="#3b2f28" strokeWidth="2" />
          {/* Boarded window with warm crack of light */}
          <rect x="135" y="92" width="44" height="36" fill="#d9822b" opacity="0.35" />
          <line x1="128" y1="96" x2="186" y2="122" stroke="#4a3b31" strokeWidth="6" />
          <line x1="128" y1="122" x2="186" y2="96" stroke="#4a3b31" strokeWidth="6" />
          {/* Door */}
          <rect x="220" y="88" width="42" height="62" fill="#14110f" stroke="#4a3b31" strokeWidth="2" />
        </svg>
      );
  }
}

export function SurvivorPortraitSvg({
  portraitId,
  isDead = false,
  className = 'w-14 h-14',
}: {
  portraitId: 'helena' | 'marcos' | 'caio' | 'elena';
  isDead?: boolean;
  className?: string;
}) {
  const bgMap = {
    helena: '#36211c',
    marcos: '#2b261d',
    caio: '#1c2b29',
    elena: '#292230',
  };
  const accentMap = {
    helena: '#d96b43',
    marcos: '#d99b38',
    caio: '#4ca68a',
    elena: '#b07cd9',
  };

  const bg = isDead ? '#1c1917' : bgMap[portraitId];
  const accent = isDead ? '#57534e' : accentMap[portraitId];

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="12" fill={bg} stroke={accent} strokeWidth="2" />
      {/* Shoulders / Jacket */}
      <path d="M10 60 C10 44 22 40 32 40 C42 40 54 44 54 60" fill="#171412" />
      {/* Collar detail */}
      <path d="M24 41 L32 51 L40 41" fill="none" stroke={accent} strokeWidth="2.5" />
      {/* Head */}
      <circle cx="32" cy="24" r="11" fill={isDead ? '#78716c' : '#d6c7b8'} />
      {/* Distinct Character Hair / Gear */}
      {portraitId === 'helena' && (
        <path d="M20 22 C20 12 44 12 44 22 C44 18 24 18 20 22 Z" fill="#291d18" />
      )}
      {portraitId === 'marcos' && (
        <>
          <path d="M20 20 C22 11 42 11 44 20 Z" fill="#4a3b31" />
          <path d="M24 30 Q32 36 40 30" fill="none" stroke="#3b2e26" strokeWidth="3" />
        </>
      )}
      {portraitId === 'caio' && (
        <>
          <rect x="24" y="21" width="6" height="4" rx="1" fill="none" stroke="#1f2937" strokeWidth="1.8" />
          <rect x="34" y="21" width="6" height="4" rx="1" fill="none" stroke="#1f2937" strokeWidth="1.8" />
          <line x1="30" y1="23" x2="34" y2="23" stroke="#1f2937" strokeWidth="1.8" />
        </>
      )}
      {portraitId === 'elena' && (
        <path d="M19 25 C19 11 45 11 45 25" fill="none" stroke="#3b2f28" strokeWidth="4" />
      )}
      {isDead && (
        <path
          d="M18 18 L46 46 M46 18 L18 46"
          stroke="#b93829"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function ResourceIconSvg({
  type,
  className = 'w-5 h-5',
}: {
  type: ResourceType;
  className?: string;
}) {
  switch (type) {
    case 'comida':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="5" y="4" width="14" height="16" rx="2.5" fill="#2a211b" stroke="#e09132" strokeWidth="2" />
          <line x1="5" y1="9" x2="19" y2="9" stroke="#e09132" strokeWidth="1.5" />
          <line x1="5" y1="15" x2="19" y2="15" stroke="#e09132" strokeWidth="1.5" />
        </svg>
      );
    case 'medicamentos':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="3" fill="#291818" stroke="#e05246" strokeWidth="2" />
          <path d="M12 8.5 V15.5 M8.5 12 H15.5" stroke="#e05246" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'materiais':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M4 8 L12 4 L20 8 L12 12 Z" fill="#2b2520" stroke="#b59272" strokeWidth="1.8" />
          <path d="M4 12 L12 16 L20 12" fill="none" stroke="#b59272" strokeWidth="1.8" />
          <path d="M4 16 L12 20 L20 16" fill="none" stroke="#b59272" strokeWidth="1.8" />
        </svg>
      );
    case 'ferramentas':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
            fill="#1f2429"
            stroke="#7fa1c3"
            strokeWidth="1.8"
          />
        </svg>
      );
    case 'municao':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M8 10 C8 6 10 4 10 4 C10 4 12 6 12 10 V19 H8 Z" fill="#2b2218" stroke="#d97724" strokeWidth="1.8" />
          <path d="M14 10 C14 6 16 4 16 4 C16 4 18 6 18 10 V19 H14 Z" fill="#2b2218" stroke="#d97724" strokeWidth="1.8" />
        </svg>
      );
  }
}

export function AttributeIconSvg({
  attribute,
  className = 'w-4 h-4',
}: {
  attribute: AttributeType;
  className?: string;
}) {
  switch (attribute) {
    case 'combate':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="#e05246" strokeWidth="2" />
          <path d="M12 2 V6 M12 18 V22 M2 12 H6 M18 12 H22" stroke="#e05246" strokeWidth="2" />
        </svg>
      );
    case 'percepcao':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
            fill="none"
            stroke="#e09132"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="3" fill="#e09132" />
        </svg>
      );
    case 'tecnica':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="#7fa1c3" strokeWidth="2" />
          <path
            d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
            stroke="#7fa1c3"
            strokeWidth="2"
          />
        </svg>
      );
    case 'resistencia':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 3l7 4v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V7l7-4z"
            fill="none"
            stroke="#52b788"
            strokeWidth="2"
          />
        </svg>
      );
  }
}
