import React from "react";

export interface VehicleIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export function ScootyIcon({ size = 56, className = "", ...props }: VehicleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      <path fill="#586169" d="M44,36c0,3.313-2.687,6-6,6c-3.313,0-6-2.687-6-6s2.687-6,6-6C41.313,30,44,32.687,44,36"/><path fill="#999" d="M41,36c0,1.657-1.342,3-3,3s-3-1.342-3-3s1.342-3,3-3S41,34.342,41,36"/><path fill="#35c1f1" d="M38.502,27C34.359,27,31,30.582,31,35h13.975c0.577,0,1.034-0.546,0.952-1.156	C45.402,29.974,42.278,27,38.502,27z"/><path fill="#586169" d="M18,36c0,3.313-2.687,6-6,6s-6-2.687-6-6s2.687-6,6-6S18,32.687,18,36"/><path fill="#999" d="M15,36c0,1.657-1.342,3-3,3s-3-1.342-3-3s1.342-3,3-3S15,34.342,15,36"/><path fill="#b34a16" d="M19,22H9c-1.105,0-2-0.895-2-2v0c0-1.105,0.895-2,2-2h10c1.105,0,2,0.895,2,2v0	C21,21.105,20.105,22,19,22z"/><path fill="#35c1f1" d="M33.5,12h3.264C37.447,12,38,11.447,38,10.764V6.236C38,5.553,37.447,5,36.764,5H33.5	C31.567,5,30,6.567,30,8.5v0C30,10.433,31.567,12,33.5,12z"/><linearGradient id="TAne~B_yoORoj~F3SzNgMa" x1="2.089" x2="40" y1="23.5" y2="23.5" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#2aa4f4"/><stop offset="1" stopColor="#007ad9"/></linearGradient><path fill="url(#TAne~B_yoORoj~F3SzNgMa)" d="M34,12h-2h-4v2h3.652l-3.13,18h-6.676L18,22H9c-3.578,1.789-6.355,5.978-6.902,11.135	C1.992,34.136,2.808,35,3.815,35H17h6h5h2h2l8-8C39.634,22.078,37,15,34,12z"/><path fill="#565b5e" d="M25,14h3v-2h-3c-0.552,0-1,0.448-1,1v0C24,13.552,24.448,14,25,14z"/>
    </svg>
  );
}

export function BikeIcon({ size = 56, className = "", ...props }: VehicleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      <path fill="#999" d="M8,30c-0.139,0-0.279-0.028-0.413-0.09c-0.503-0.229-0.725-0.821-0.497-1.324l5-11	c0.229-0.503,0.823-0.726,1.324-0.496c0.503,0.229,0.725,0.821,0.497,1.324l-5,11C8.743,29.782,8.379,30,8,30z"/><linearGradient id="fZCpmN9AxXQL6IsaOVAQCa" x1="33.782" x2="35.825" y1="9.191" y2="14.01" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f44f5a"/><stop offset=".4" stopColor="#ee3d4a"/><stop offset="1" stopColor="#bd1237"/></linearGradient><path fill="url(#fZCpmN9AxXQL6IsaOVAQCa)" d="M34.5,14h1.546C36.573,14,37,13.573,37,13.046V9.954C37,9.427,36.573,9,36.046,9H34.5	c-1.38,0-2.5,1.12-2.5,2.5l0,0C32,12.88,33.12,14,34.5,14z"/><path fill="#586169" d="M40,37c-4.444,0-8-3.556-8-8s3.556-8,8-8s8,3.556,8,8S44.444,37,40,37z M40,24c-2.786,0-5,2.214-5,5	s2.214,5,5,5s5-2.214,5-5S42.786,24,40,24z"/><linearGradient id="fZCpmN9AxXQL6IsaOVAQCb" x1="1" x2="9" y1="18" y2="18" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f44f5a"/><stop offset=".4" stopColor="#ee3d4a"/><stop offset="1" stopColor="#bd1237"/></linearGradient><path fill="url(#fZCpmN9AxXQL6IsaOVAQCb)" d="M8,19H2c-0.552,0-1-0.447-1-1s0.448-1,1-1h6c0.552,0,1,0.447,1,1S8.552,19,8,19z"/><linearGradient id="fZCpmN9AxXQL6IsaOVAQCc" x1="26" x2="41" y1="18" y2="18" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f44f5a"/><stop offset=".4" stopColor="#ee3d4a"/><stop offset="1" stopColor="#bd1237"/></linearGradient><path fill="url(#fZCpmN9AxXQL6IsaOVAQCc)" d="M40,30c-0.38,0-0.743-0.218-0.911-0.586L29.623,8.587C29.46,8.229,29.104,8,28.712,8H27	c-0.552,0-1-0.447-1-1s0.448-1,1-1h1.712c1.174,0,2.246,0.69,2.731,1.76l9.467,20.826c0.229,0.503,0.006,1.096-0.496,1.324	C40.28,29.972,40.139,30,40,30z"/><linearGradient id="fZCpmN9AxXQL6IsaOVAQCd" x1="13.407" x2="14.324" y1="12.92" y2="17.871" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#8795a1"/><stop offset="1" stopColor="#6d7882"/></linearGradient><path fill="url(#fZCpmN9AxXQL6IsaOVAQCd)" d="M20,16l-0.447-0.349l-6.708-1.466C12.283,14.062,11.71,14,11.136,14H8c-1.105,0-2,0.895-2,2v3	h15.071l1.675-1.675C22.746,16.46,20.844,16.087,20,16z"/><path fill="#565b5e" d="M28,8h-4c-0.552,0-1-0.448-1-1l0,0c0-0.552,0.448-1,1-1h4V8z"/><circle cx="40" cy="29" r="2" fill="#999"/><path fill="#586169" d="M8,37c-4.444,0-8-3.556-8-8s3.556-8,8-8s8,3.556,8,8S12.444,37,8,37z M8,24c-2.786,0-5,2.214-5,5	s2.214,5,5,5s5-2.214,5-5S10.786,24,8,24z"/><circle cx="8" cy="29" r="2" fill="#999"/><path fill="#999" d="M20,24l0.16,0.56c0.349,1.223-0.569,2.44-1.84,2.44H8v4h14h3h1.064c1.439,0,2.743-0.846,3.329-2.16	L31.554,24H20z"/><linearGradient id="fZCpmN9AxXQL6IsaOVAQCe" x1="24.119" x2="27.299" y1="14.904" y2="24.363" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f44f5a"/><stop offset=".4" stopColor="#ee3d4a"/><stop offset="1" stopColor="#bd1237"/></linearGradient><path fill="url(#fZCpmN9AxXQL6IsaOVAQCe)" d="M35,19l-1.234-3.086C33.303,14.758,32.184,14,30.939,14h-9.225	c-1.683,0-3.242,0.885-4.105,2.33L16,19.024L20,24h11.554l1.952-1.133C34.431,22.33,35,21.342,35,20.272V19z"/>
    </svg>
  );
}

export function ERickshawIcon({ size = 56, className = "", ...props }: VehicleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      {/* Flat Toto Canopy Roof */}
      <rect x="6" y="8" width="36" height="5" rx="2" fill="#046A38" />
      <path fill="#058A48" d="M6,13h36v3c0,0.552-0.448,1-1,1H7c-0.552,0-1-0.448-1-1V13z" />
      
      {/* Vertical Support Pillars */}
      <rect x="8" y="16" width="2" height="15" fill="#455a64" />
      <rect x="23" y="16" width="2" height="15" fill="#455a64" />
      <rect x="38" y="16" width="2" height="15" fill="#455a64" />
      
      {/* Front Windshield Area */}
      <path fill="#81C784" d="M38,17L44,27H38V17z" opacity="0.6" />
      <path fill="#455a64" d="M38,27h6l-1,4h-5V27z" />
      
      {/* Main Body / Chassis */}
      <rect x="6" y="27" width="33" height="6" rx="1.5" fill="#046A38" />
      <path fill="#34D399" d="M8,29h29v2H8V29z" />
      
      {/* Passenger Seating Benches */}
      <rect x="10" y="23" width="12" height="4" rx="1" fill="#FFC107" />
      <rect x="25" y="23" width="10" height="4" rx="1" fill="#FFC107" />
      
      {/* Front Wheel */}
      <circle cx="41" cy="36" r="4.5" fill="#37474F" />
      <circle cx="41" cy="36" r="2" fill="#CFD8DC" />
      
      {/* Rear Wheels */}
      <circle cx="13" cy="36" r="5" fill="#37474F" />
      <circle cx="13" cy="36" r="2.2" fill="#CFD8DC" />
      
      {/* Electric Bolt Accent on Battery Box */}
      <path fill="#FFD54F" d="M22,28l-2,3h3l-1.5,3.5l4-4.5h-3l1.5-2H22z" />
    </svg>
  );
}

export const TotoIcon = ERickshawIcon;

export function AutoRickshawIcon({ size = 56, className = "", ...props }: VehicleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      <rect width="2" height="16" x="18" y="9" fill="#455a64"/><path fill="#455a64" d="M46,36c0,2.762-2.238,5-5,5s-5-2.238-5-5s2.238-5,5-5S46,33.238,46,36"/><path fill="#cfd8dc" d="M43,36c0,1.105-0.895,2-2,2s-2-0.895-2-2s0.895-2,2-2S43,34.895,43,36"/><path fill="#388e3c" d="M48,34H34v-7h9C48,29,48,34,48,34z"/><path fill="#455a64" d="M32,21L31.997,9H37c0,0,6,4,6,12H32z"/><path fill="#43a047" d="M33,36H0V23h20v9h9v-8h14v3L33,36z"/><path fill="#ffc107" d="M32,21V9h7V7H11C4.029,7,0,11.029,0,16v7h9v-7c0-2.761,2.239-5,5-5h15v13h14v-3H32z"/><path fill="#66bb6a" d="M9,29c-3.866,0-7,3.134-7,7h14C16,32.134,12.866,29,9,29z"/><path fill="#455a64" d="M14,36c0,2.762-2.238,5-5,5s-5-2.238-5-5s2.238-5,5-5S14,33.238,14,36"/><path fill="#cfd8dc" d="M11,36c0,1.105-0.895,2-2,2s-2-0.895-2-2s0.895-2,2-2S11,34.895,11,36"/>
    </svg>
  );
}

export function CarMiniIcon({ size = 56, className = "", ...props }: VehicleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      <path fill="#FF4081" d="M5,22c2,0,2-10,15-10s12.466,9.29,15.466,10.29V27H5V22z"/>
      <path fill="#FF4081" d="M46,31.25c0,0,0,1.75-2,1.75c-3,0-39,0-39,0c-1.657,0-3-1.344-3-3v-5c0,0,0-3,3-3c4,0,26,0,26,0c10,0,15,4,15,6V31.25z"/>
      <path fill="#455A64" d="M41 30c0 2.761-2.238 5-5 5s-5-2.239-5-5 2.238-5 5-5S41 27.239 41 30M17 30c0 2.761-2.239 5-5 5s-5-2.239-5-5 2.239-5 5-5S17 27.239 17 30"/>
      <path fill="#B0BEC5" d="M38 30c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2S38 28.895 38 30M14 30c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2S14 28.895 14 30"/>
      <g>
        <path fill="#FFC107" d="M3.5 25H2v4h1.5C4.329 29 5 28.328 5 27.5v-1C5 25.672 4.329 25 3.5 25zM43 24.658V27.5c0 .828.672 1.5 1.5 1.5H46v-1C46 27.106 44.995 25.815 43 24.658z"/>
      </g>
      <g>
        <path fill="#660636" d="M32.328 22c-.293-.456-.565-.945-.841-1.445-1.535-2.791-3.442-6.226-10.487-6.525V22H32.328zM19 22v-7.967c-7.281.336-9.313 4.284-10.668 6.942C8.155 21.321 7.975 21.668 7.783 22H19z"/>
      </g>
    </svg>
  );
}

export function CarPremierIcon({ size = 56, className = "", ...props }: VehicleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      <g>
        <path fill="#db5669" d="M47,25.39A7.23,7.23,0,0,1,46.82,28,3,3,0,0,1,44,30H4a3,3,0,0,1-3-3c0-3.25-.1-2.68.5-4.51s1.88-2.24,3.66-3.21c6.29-3.43,7.28-4.2,9.63-4.54C28,12.87,28.66,14.57,35,20l8.66,1.44A4,4,0,0,1,47,25.39Z"/>
        <path fill="#f26674" d="M47,25.38A7.3,7.3,0,0,1,46.82,28H19.91a9,9,0,0,1-8.5-12.13c2-1.1,3.53-1.15,6.49-1.57C27.82,12.88,29.72,15.48,35,20l8.66,1.44A4,4,0,0,1,47,25.38Z"/>
        <circle cx="36" cy="30" r="4" fill="#374f68"/>
        <circle cx="12" cy="30" r="4" fill="#374f68"/>
        <path fill="#425b72" d="M15.64,31.64a4,4,0,0,1-5.28-5.28A4,4,0,0,1,15.64,31.64Z"/>
        <path fill="#425b72" d="M39.64,31.64a4,4,0,0,1-5.28-5.28A4,4,0,0,1,39.64,31.64Z"/>
        <path fill="#edebf2" d="M25,25H23a1,1,0,0,1,0-2h2A1,1,0,0,1,25,25Z"/>
        <path fill="#9fdbf3" d="M35,20H13.87A1,1,0,0,1,13,18.45l2.54-3.82C28.05,12.88,28.94,14.8,35,20Z"/>
        <path fill="#b2e5fb" d="M32.67,18H20.54a3.15,3.15,0,0,1-3.11-3.63A30.55,30.55,0,0,1,23.56,14C28,14,30.48,16.13,32.67,18Z"/>
        <path fill="#edebf2" d="M47,27H45a1,1,0,0,1,0-2h2C47,25.35,47,25.31,47,27Z"/>
        <path fill="#fc6" d="M5,24a2,2,0,0,1-2,2H1a6.89,6.89,0,0,1,.5-3.51A3,3,0,0,1,1.71,22H3A2,2,0,0,1,5,24Z"/>
        <path fill="#ffde76" d="M4.82,24.82c-.94.45-2.73-.62-2.54-2.32l.05-.5H3A2,2,0,0,1,4.82,24.82Z"/>
        <path fill="#edebf2" d="M36,31a1,1,0,1,1,.38-1.92A1,1,0,0,1,36,31Z"/>
        <path fill="#edebf2" d="M12,31a1,1,0,1,1,.92-.62A1,1,0,0,1,12,31Z"/>
      </g>
    </svg>
  );
}

export function SuvIcon({ size = 56, className = "", ...props }: VehicleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      <path fill="#455A64" d="M3,28H1c-0.6,0-1-0.5-1-1v-9c0-0.5,0.4-1,1-1h2c0.5,0,1,0.5,1,1v9C4,27.5,3.5,28,3,28z"/>
      <path fill="#FFC107" d="M37,19l-3.5-7.7c-0.3-0.8-1.1-1.3-1.9-1.3H5.8c-0.5,0-0.9,0.3-1,0.8C4.3,12.7,3.1,16.5,3,27l0,0v3l3,2l4,1h1h30l2.2-1c1.7,0,3.6-1.7,4.4-2.5c0.3-0.3,0.4-0.7,0.4-1.1v-5.7c0-0.6-0.3-1.1-0.8-1.4C45.7,20.7,42.8,19.4,37,19z"/>
      <path fill="#37474F" d="M6,32l3,1h2h30l2.2-1c1.7,0,3.6-1.7,4.4-2.5c0.3-0.3,0.4-0.7,0.4-1.1V27h-3l-0.5-0.9c-0.3-0.6-1-1.1-1.7-1.1h-5.6c-0.7,0-1.4,0.4-1.7,1.1L32,31H19l-2-5.1c-0.4-0.5-1-0.9-1.6-0.9H8.2c-0.7,0-1.4,0.4-1.7,1.1L6,27H3v3L6,32z"/>
      <path fill="#546E7A" d="M7,33.5C7,31,9,29,11.5,29c2.5,0,4.5,2,4.5,4.5c0,2.5-2,4.5-4.5,4.5C9,38,7,36,7,33.5z M39.5,38c2.5,0,4.5-2,4.5-4.5c0-2.5-2-4.5-4.5-4.5C37,29,35,31,35,33.5C35,36,37,38,39.5,38z"/>
      <path fill="#90A4AE" d="M9,33.5c0-1.4,1.1-2.5,2.5-2.5s2.5,1.1,2.5,2.5c0,1.4-1.1,2.5-2.5,2.5S9,34.9,9,33.5z M39.5,36c1.4,0,2.5-1.1,2.5-2.5c0-1.4-1.1-2.5-2.5-2.5S37,32.1,37,33.5C37,34.9,38.1,36,39.5,36z"/>
      <path fill="#FFB300" d="M25,31h-2V12h2V31z M15,12h-2v13h2V12z"/>
      <path fill="#00B0FF" d="M47.2,21.4c-0.3-0.1-0.7-0.3-1.2-0.5V24c0,0.6,0.5,1,1,1h1v-2.3C48,22.1,47.7,21.6,47.2,21.4z"/>
      <path fill="#37474F" d="M13,12v7H5.4c0.3-3.7,0.8-5.7,1.1-7H13z M31.7,12L31.7,12C31.7,12,31.7,12,31.7,12L25,12v7h9.8L31.7,12L31.7,12z M15,12v7h8v-7H15z"/>
    </svg>
  );
}

export const CarPriorityIcon = SuvIcon;

export function FreightTruckIcon({ size = 56, className = "", ...props }: VehicleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      <g ><path fill="#dad7e5" d="M7.13,34H1V30H8.36A4,4,0,0,0,7.13,34Z"/><path fill="#dad7e5" d="M47,30v4H41.87a4,4,0,0,0-1.23-4Z"/><path fill="#dad7e5" d="M34.13,34H14.87a4,4,0,0,0-1.23-4H35.36A4,4,0,0,0,34.13,34Z"/><path fill="#fc6" d="M32,12V30H13.64a4,4,0,0,0-5.28,0H2V12Z"/><path fill="#ffde76" d="M32,12V28H14A10,10,0,0,1,4,18V12Z"/><path fill="#db5669" d="M47,22v8H40.64a4,4,0,0,0-5.28,0H32V14h4v6a2,2,0,0,0,2,2Z"/><path fill="#9fdbf3" d="M47,22H38a2,2,0,0,1-2-2V14h6Z"/><path fill="#b2e5fb" d="M46.38,21H44a7,7,0,0,1-7-7h5Z"/><path fill="#374f68" d="M42,33c0,4.65-6.72,5.53-7.87,1A4,4,0,1,1,42,33Z"/><path fill="#425b72" d="M41.27,35.3c-3.82,2.59-8-2.15-5.55-5.57A4,4,0,0,1,41.27,35.3Z"/><path fill="#374f68" d="M15,33c0,4.65-6.72,5.53-7.87,1A4,4,0,1,1,15,33Z"/><path fill="#425b72" d="M14.27,35.3c-3.82,2.59-8-2.15-5.55-5.57A4,4,0,0,1,14.27,35.3Z"/><rect width="8" height="8" x="13" y="17" fill="#a87e6b"/><path fill="#be927c" d="M21,17v7H20a6,6,0,0,1-6-6V17Z"/><path fill="#f26674" d="M47,22v6H40a6,6,0,0,1-6-6V14h2v6a2,2,0,0,0,2,2Z"/><path fill="#edebf2" d="M47,30v3c-2.18,0-4.32.25-5.48-1.89A4,4,0,0,0,40.64,30Z"/><path fill="#edebf2" d="M35.36,30a4,4,0,0,0-.88,1.11A3.85,3.85,0,0,1,31.08,33H17.92a3.85,3.85,0,0,1-3.4-1.89A4,4,0,0,0,13.64,30Z"/><path fill="#edebf2" d="M8.36,30A4,4,0,0,0,7,33H4a3,3,0,0,1-3-3Z"/><path d="M47.85,21.47C42.57,13,42.79,13,42,13H33V12a1,1,0,0,0-1-1H2a1,1,0,0,0-1,1V29a1,1,0,0,0-1,1v4a1,1,0,0,0,1,1H6.42a5,5,0,0,0,9.16,0H33.42a5,5,0,0,0,9.16,0H47a1,1,0,0,0,1-1C48,21.09,48.07,21.83,47.85,21.47ZM45.2,21H38a1,1,0,0,1-1-1V15h4.45ZM35,15v5a3,3,0,0,0,3,3h8v2H45a1,1,0,0,0,0,2h1v2H41A4.92,4.92,0,0,0,35,29H33V15ZM3,13H31V29H14A4.92,4.92,0,0,0,8,29H3ZM2,33V31H6.42A4.94,4.94,0,0,0,6,33Zm9,3a3,3,0,1,1,3-3A3,3,0,0,1,11,36Zm5-3a4.94,4.94,0,0,0-.42-2H32c2.4,0,1-.4,1,2Zm22,3a3,3,0,1,1,3-3A3,3,0,0,1,38,36Zm8-3H43a4.94,4.94,0,0,0-.42-2H46Z"/><path d="M11,32a1,1,0,0,0,0,2A1,1,0,0,0,11,32Z"/><path d="M38,32a1,1,0,0,0,0,2A1,1,0,0,0,38,32Z"/><path d="M13,26h8a1,1,0,0,0,1-1V17a1,1,0,0,0-1-1H13a1,1,0,0,0-1,1v8A1,1,0,0,0,13,26Zm1-8h2v1a1,1,0,0,0,2,0V18h2v6H14Z"/></g>
    </svg>
  );
}

export function MiniTruckIcon({ size = 56, className = "", ...props }: VehicleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      <path fill="#6fabe6" d="M47,26v9H43a4,4,0,0,0-8,0H31V15h9Z"/>
      <path fill="#82bcf4" d="M47,26v7H42.46a4,4,0,0,0-6.92,0H31V15h9Z"/>
      <polygon fill="#9fdbf3" points="47 26 35 26 35 19 42.55 19 47 26"/>
      <polygon fill="#9fdbf3" points="47 26 35 26 35 19 42.55 19 47 26"/>
      <polygon fill="#b2e5fb" points="47 26 35 26 35 19 42.55 19 47 26"/>
      <circle cx="39" cy="35" r="4" fill="#374f68"/>
      <path fill="#425b72" d="M39,31a4,4,0,0,0-3.28,1.72,4,4,0,0,1,5.56,5.56A4,4,0,0,0,39,31Z"/>
      <circle cx="11" cy="35" r="4" fill="#374f68"/>
      <path fill="#425b72" d="M11,31a4,4,0,0,0-3.28,1.72,4,4,0,0,1,5.56,5.56A4,4,0,0,0,11,31Z"/>
      <rect width="30" height="18" x="1" y="9" fill="#fc6"/>
      <path fill="#ffba55" d="M31,27v8H15a4,4,0,0,0-8,0H1V27Z"/>
      <rect width="26" height="18" x="5" y="9" fill="#ffde76"/>
      <path fill="#fc6" d="M31,27v6H14.46a4,4,0,0,0-6.92,0A2.54,2.54,0,0,1,5,30.46V27Z"/>
      <path d="M48,26c0-.4.46.42-7-11.35-.56-.87-.06-.63-9-.63V9a1,1,0,0,0-1-1H1A1,1,0,0,0,0,9V35a1,1,0,0,0,1,1H6.1a5,5,0,0,0,9.8,0H34.1a5,5,0,0,0,9.8,0H47a1,1,0,0,0,1-1Zm-2.82-1H36V20h6ZM2,10H30V26H2ZM2,28H30v6H15.9a5,5,0,0,0-9.8,0H2Zm9,10a3,3,0,1,1,3-3A3,3,0,0,1,11,38Zm28,0a3,3,0,1,1,3-3A3,3,0,0,1,39,38Zm4.9-4a5,5,0,0,0-9.8,0H32V16h7.45l1.27,2H35a1,1,0,0,0-1,1v7a1,1,0,0,0,1,1H46v3H45a1,1,0,0,0,0,2h1v2Z"/>
    </svg>
  );
}

export const ExpressMiniIcon = MiniTruckIcon;
export const AutoIcon = AutoRickshawIcon;
export const CarIcon = CarPremierIcon;
export const TruckIcon = FreightTruckIcon;

export const VEHICLE_SVG_ICONS: Record<string, React.ComponentType<VehicleIconProps>> = {
  scooty: ScootyIcon,
  bike: BikeIcon,
  auto: AutoRickshawIcon,
  "e-rickshaw": ERickshawIcon,
  toto: ERickshawIcon,
  mini: CarMiniIcon,
  car: CarPremierIcon,
  premier: CarPremierIcon,
  priority: SuvIcon,
  xl: SuvIcon,
  intercity: SuvIcon,
  loading: MiniTruckIcon,
  truck: FreightTruckIcon,
};
