import { LogoSymbol } from "./Logo";

export function WorkFolioIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 288 248"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <image
        href="/images/proof-paint-swash.webp"
        x="-36"
        y="33.25"
        width="360"
        height="211.5"
        opacity="0.58"
        transform="rotate(-9 144 139)"
      />

      <path
        d="M39 183V80a10 10 0 0 1 10-10h47l15 14h121a10 10 0 0 1 10 10v89"
        fill="var(--stone)"
        stroke="var(--graphite)"
        strokeOpacity="0.48"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M53 79h36" stroke="var(--ink)" strokeOpacity="0.2" strokeLinecap="round" />

      <g transform="rotate(7 153 116)">
        <rect
          x="89"
          y="30"
          width="128"
          height="167"
          rx="11"
          fill="var(--stone)"
          stroke="var(--graphite)"
          strokeOpacity="0.38"
          strokeWidth="1.5"
        />
        <path
          d="M105 48h54M105 56h35M201 74v30M201 113v9"
          stroke="var(--graphite)"
          strokeOpacity="0.32"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      <g transform="rotate(-6 131 121)">
        <rect
          x="61"
          y="36"
          width="140"
          height="174"
          rx="11"
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeOpacity="0.76"
          strokeWidth="1.7"
        />
        <text x="77" y="61" fill="var(--ink)" fontSize="10" fontWeight="600" letterSpacing="1.1">
          PROJECT NOTES
        </text>
        <circle cx="184" cy="57" r="2" fill="var(--ink)" fillOpacity="0.3" />
        <path d="M77 73h108" stroke="var(--ink)" strokeOpacity="0.12" />

        <text x="77" y="93" fill="var(--graphite)" fontSize="10" fontWeight="500">
          Problem
        </text>
        <path
          d="M77 103h82M77 110h54"
          stroke="var(--ink)"
          strokeOpacity="0.28"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <text x="77" y="132" fill="var(--graphite)" fontSize="10" fontWeight="500">
          Solution
        </text>

        <path
          d="M95 154h22m24 0h21"
          stroke="var(--ink)"
          strokeOpacity="0.62"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="m157 150 5 4-5 4"
          stroke="var(--ink)"
          strokeOpacity="0.62"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="77"
          y="145"
          width="18"
          height="18"
          rx="5"
          fill="var(--stone)"
          stroke="var(--graphite)"
          strokeWidth="1.5"
        />
        <LogoSymbol x="117" y="142" width="24" height="24" />
        <rect
          x="163"
          y="145"
          width="18"
          height="18"
          rx="5"
          fill="var(--stone)"
          stroke="var(--graphite)"
          strokeWidth="1.5"
        />
        <path
          d="M82 152h8m-8 4h5"
          stroke="var(--graphite)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="m168 154 3 3 5-6"
          stroke="var(--graphite)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <path
        d="M41 164h59l13 13h126a9 9 0 0 1 9 11l-7 29a10 10 0 0 1-10 8H52a10 10 0 0 1-10-8l-10-40a10 10 0 0 1 9-13Z"
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeOpacity="0.72"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M49 170h44" stroke="var(--lime)" strokeWidth="3" strokeLinecap="round" />
      <text x="60" y="205" fill="var(--ink)" fontSize="12" fontWeight="500">
        Case studies
      </text>
      <path
        d="M208 196h13m-5-5 5 5-5 5"
        stroke="var(--ink)"
        strokeOpacity="0.65"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M58 217h36" stroke="var(--ink)" strokeOpacity="0.12" strokeLinecap="round" />
    </svg>
  );
}
