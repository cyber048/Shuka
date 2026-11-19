import React from 'react';

export default function Logo({ size = 'normal', theme = 'dark', showSubtitle = true, onClick }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const iconSize = isLarge ? 50 : isSmall ? 32 : 40;
  const mainFontSize = isLarge ? '2.1rem' : isSmall ? '1.3rem' : '1.65rem';
  const subFontSize = isLarge ? '0.78rem' : isSmall ? '0.6rem' : '0.68rem';

  const textColor = theme === 'dark' ? '#ffffff' : '#0f172a';
  const subColor = theme === 'dark' ? '#94a3b8' : '#64748b';

  return (
    <div
      className="shuka-brand-logo"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '0.5rem' : '0.75rem',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Premium Vector Brand Icon */}
      <div
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '100%',
            height: '100%',
            filter: 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.35))'
          }}
        >
          <defs>
            <linearGradient id="shukaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="handleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
            <linearGradient id="smileGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
          </defs>

          {/* Bag Body with rounded organic curves */}
          <rect
            x="6"
            y="14"
            width="36"
            height="30"
            rx="9"
            fill="url(#shukaGrad)"
          />

          {/* Bag Handle */}
          <path
            d="M17 15V11C17 7.134 20.134 4 24 4C27.866 4 31 7.134 31 11V15"
            stroke="url(#handleGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Dynamic Amazon/Marketplace-style Smile Arrow */}
          <path
            d="M14 28.5C18 33 28 33.5 33.5 28.5"
            stroke="url(#smileGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Arrowhead */}
          <path
            d="M32 26L34.5 28.8L31.5 31.5"
            stroke="url(#smileGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Armenian Tricolor subtle micro-badge (Red-Blue-Orange dots) */}
          <circle cx="37" cy="18" r="2.2" fill="#ef4444" />
          <circle cx="37" cy="23" r="2.2" fill="#3b82f6" />
          <circle cx="37" cy="28" r="2.2" fill="#f59e0b" />
        </svg>
      </div>

      {/* Brand Name & Identity */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div
            style={{
              fontSize: mainFontSize,
              fontWeight: 900,
              letterSpacing: '-0.6px',
              color: textColor,
              display: 'flex',
              alignItems: 'baseline'
            }}
          >
            SHU<span style={{ color: '#f59e0b', textShadow: '0 2px 10px rgba(245, 158, 11, 0.4)' }}>KA</span>
          </div>

          <span
            style={{
              fontSize: isSmall ? '0.55rem' : '0.62rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#ffffff',
              padding: '0.15rem 0.4rem',
              borderRadius: '9999px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: '0 2px 4px rgba(245,158,11,0.3)'
            }}
          >
            AM
          </span>
        </div>

        {showSubtitle && (
          <div
            style={{
              fontSize: subFontSize,
              color: subColor,
              fontWeight: 700,
              letterSpacing: '0.4px',
              marginTop: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>ՀԱՅԿԱԿԱՆ ՄԱՐԿԵՏՓԼԵՅՍ</span>
            <span style={{ color: '#f59e0b' }}>•</span>
            <span style={{ color: '#10b981', fontWeight: 800 }}>#1</span>
          </div>
        )}
      </div>
    </div>
  );
}
