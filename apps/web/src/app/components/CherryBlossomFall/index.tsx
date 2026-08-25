import type { CSSProperties } from "react";

type CherryBlossomFallProps = { context: "public" | "admin" };
type PetalStyle = CSSProperties & Record<`--sakura-${string}`, string>;

const petals: PetalStyle[] = [
  petal("3%", 13, 13.5, -8.2, "18vw", 5.1, 0.62, -8),
  petal("9%", 10, 10.8, -2.4, "-12vw", 4.3, 0.48, 5),
  petal("15%", 17, 16.2, -11.7, "26vw", 6.2, 0.7, -12),
  petal("22%", 12, 12.4, -5.1, "10vw", 4.8, 0.54, 8),
  petal("29%", 15, 14.7, -13.2, "-20vw", 5.6, 0.66, -4),
  petal("36%", 9, 9.8, -7.4, "14vw", 3.9, 0.44, 12),
  petal("43%", 18, 17.5, -3.6, "-24vw", 6.5, 0.68, -10),
  petal("50%", 11, 11.6, -9.8, "17vw", 4.6, 0.52, 3),
  petal("57%", 14, 15.4, -1.3, "28vw", 5.8, 0.6, -6),
  petal("64%", 10, 10.3, -6.5, "-16vw", 4.1, 0.46, 10),
  petal("70%", 16, 16.8, -14.4, "22vw", 6, 0.67, -9),
  petal("76%", 12, 12.9, -4.2, "-21vw", 5, 0.55, 6),
  petal("81%", 19, 18.2, -10.6, "15vw", 6.8, 0.72, -14),
  petal("86%", 9, 9.5, -2.8, "-10vw", 3.8, 0.43, 11),
  petal("90%", 15, 14.1, -12.1, "24vw", 5.4, 0.63, -5),
  petal("94%", 11, 11.2, -7.9, "-18vw", 4.4, 0.5, 7),
  petal("97%", 17, 17.1, -5.7, "12vw", 6.3, 0.69, -11),
  petal("99%", 13, 13.8, -15.1, "-25vw", 5.2, 0.57, 4),
  petal("6%", 11, 11.7, -10.4, "22vw", 4.5, 0.52, 9),
  petal("19%", 14, 13.2, -3.1, "-17vw", 5.3, 0.61, -7),
  petal("33%", 10, 10.1, -7.2, "13vw", 4.2, 0.47, 6),
  petal("54%", 16, 14.6, -12.8, "-23vw", 5.7, 0.65, -10),
  petal("73%", 12, 12.3, -5.6, "19vw", 4.8, 0.55, 8),
  petal("92%", 15, 13.9, -9.3, "-15vw", 5.5, 0.63, -5),
  petal("1%", 9, 10.4, -4.8, "16vw", 4.1, 0.5, 7),
  petal("12%", 18, 14.8, -11.3, "-19vw", 5.9, 0.68, -9),
  petal("25%", 13, 12.1, -6.7, "23vw", 4.7, 0.58, 5),
  petal("39%", 20, 15.6, -2.2, "-27vw", 6.4, 0.71, -12),
  petal("47%", 8, 9.6, -8.5, "11vw", 3.8, 0.45, 10),
  petal("60%", 15, 13.4, -13.7, "20vw", 5.2, 0.62, -6),
  petal("67%", 11, 10.9, -5.3, "-14vw", 4.3, 0.51, 8),
  petal("79%", 19, 15.1, -9.9, "25vw", 6.1, 0.69, -11),
  petal("84%", 10, 10.2, -1.7, "-12vw", 4, 0.48, 6),
  petal("88%", 16, 14.3, -12.5, "18vw", 5.6, 0.65, -8),
  petal("96%", 12, 11.8, -7.6, "-21vw", 4.6, 0.55, 9),
  petal("98%", 17, 13.7, -3.9, "14vw", 5.4, 0.66, -7),
];

function petal(left: string, size: number, duration: number, delay: number, drift: string, swayDuration: number, opacity: number, tone: number): PetalStyle {
  return {
    "--sakura-delay": `${delay}s`,
    "--sakura-drift": drift,
    "--sakura-duration": `${Math.round(duration * 88) / 100}s`,
    "--sakura-left": left,
    "--sakura-opacity": String(opacity),
    "--sakura-size": `${size}px`,
    "--sakura-sway-duration": `${swayDuration}s`,
    "--sakura-tone": `${tone}deg`,
  };
}

export default function CherryBlossomFall({ context }: CherryBlossomFallProps) {
  return (
    <div className="sakura-fall-layer" data-context={context} aria-hidden="true">
      <svg className="absolute size-0" focusable="false">
        <defs>
          <linearGradient id="sakura-petal-gradient" x1="7" y1="5" x2="31" y2="43" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fffdfd" />
            <stop offset="0.38" stopColor="#ffdce6" />
            <stop offset="0.76" stopColor="#f5a4bb" />
            <stop offset="1" stopColor="#dc6288" />
          </linearGradient>
          <radialGradient id="sakura-petal-blush" cx="0" cy="0" r="1" gradientTransform="matrix(14 24 -17 10 18 35)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e75582" stopOpacity="0.72" />
            <stop offset="0.58" stopColor="#f5a7bc" stopOpacity="0.2" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <symbol id="sakura-petal-0" viewBox="0 0 40 48">
            <path d="M20 46C16 38 4 30 5 17 6 6 17 2 29 6c8 3 10 10 6 17-4 8-11 16-15 23Z" fill="url(#sakura-petal-gradient)" stroke="#d95f86" strokeOpacity="0.38" strokeWidth="0.7" />
            <path d="M20 45c1-11 4-23 14-34-8 8-15 13-27 13 4 8 10 15 13 21Z" fill="url(#sakura-petal-blush)" opacity="0.66" />
            <path d="M7 15c8-6 18-7 27-1" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity="0.58" strokeWidth="1.3" />
          </symbol>
          <symbol id="sakura-petal-1" viewBox="0 0 40 48">
            <path d="M18 45C15 37 4 31 6 20 8 10 19 4 32 7c-4 4-3 9 5 12-3 10-12 19-19 26Z" fill="url(#sakura-petal-gradient)" stroke="#d85d84" strokeOpacity="0.4" strokeWidth="0.7" />
            <path d="M7 20c10 4 21 2 30-1-7 5-12 9-15 16-6-3-11-8-15-15Z" fill="#e9638a" opacity="0.42" />
            <path d="M8 18c9 3 19 2 28 0" fill="none" stroke="#fff4f7" strokeLinecap="round" strokeOpacity="0.78" strokeWidth="1.4" />
          </symbol>
          <symbol id="sakura-petal-2" viewBox="0 0 40 48">
            <path d="M18 45C12 34 11 18 18 4c7 6 13 22 4 36l-4 5Z" fill="url(#sakura-petal-gradient)" stroke="#d95e85" strokeOpacity="0.42" strokeWidth="0.7" />
            <path d="M19 43c-2-14-1-26 0-36 4 12 6 23 2 32l-2 4Z" fill="#e75f88" opacity="0.5" />
            <path d="M18 7c-3 11-3 23 1 34" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity="0.58" strokeWidth="1" />
          </symbol>
        </defs>
      </svg>
      {petals.map((style, index) => (
        <span className="sakura-petal-track" style={style} key={index}>
          <svg className="sakura-petal" viewBox="0 0 40 48" focusable="false">
            <use href={`#sakura-petal-${index % 3}`} />
          </svg>
        </span>
      ))}
    </div>
  );
}
