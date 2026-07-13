import { useEffect, useRef, useState } from "react";

/**
 * WalkingIntro
 * A short, self-contained entrance animation:
 *   1) an illustrated student walks in from the left edge of the panel
 *   2) the student stops and settles
 *   3) the student waves hello, a "Hi!" speech bubble appears
 *   4) everything fades out, handing off to the login form
 *
 * Respects prefers-reduced-motion — if set, it resolves instantly.
 *
 * Props:
 *   onComplete: () => void   called once the intro has fully faded out
 */
export default function WalkingIntro({ onComplete }) {
  const [phase, setPhase] = useState("walk"); // walk -> stop -> wave -> pause -> fadeout
  const timers = useRef([]);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      onComplete?.();
      return;
    }

    const schedule = (fn, ms) => timers.current.push(setTimeout(fn, ms));

    schedule(() => setPhase("stop"), 1650);
    schedule(() => setPhase("wave"), 1950);
    schedule(() => setPhase("pause"), 3000);
    schedule(() => setPhase("fadeout"), 3400);
    schedule(() => onComplete?.(), 4000);

    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    onComplete?.();
  };

  return (
    <div className={`wi-stage wi-phase-${phase}`}>
      <style>{`
        .wi-stage{
          position:absolute; inset:0; overflow:hidden;
          display:flex; align-items:flex-end; justify-content:flex-start;
          transition:opacity .55s ease, transform .55s ease;
        }
        .wi-phase-fadeout{ opacity:0; transform:translateY(-8px); pointer-events:none; }

        .wi-skip{
          position:absolute; top:20px; right:20px; z-index:5;
          background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18);
          color:rgba(255,255,255,0.65); font-size:11.5px; font-weight:600;
          padding:6px 12px; border-radius:20px; cursor:pointer; letter-spacing:.02em;
          backdrop-filter:blur(6px); transition:background .2s;
        }
        .wi-skip:hover{ background:rgba(255,255,255,0.16); color:#fff; }

        .wi-floor{
          position:absolute; left:0; right:0; bottom:96px; height:1px;
          background:linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 15%, rgba(255,255,255,0.16) 85%, transparent);
        }
        .wi-shadow{
          position:absolute; bottom:90px; width:66px; height:12px; border-radius:50%;
          background:radial-gradient(closest-side, rgba(0,0,0,0.4), transparent 75%);
          animation: wi-walkX 1.65s cubic-bezier(.45,.05,.55,.95) forwards;
        }

        .wi-walker{
          position:relative; bottom:96px; width:150px; height:288px;
          animation: wi-walkX 1.65s cubic-bezier(.45,.05,.55,.95) forwards;
        }
        @keyframes wi-walkX{
          from{ transform:translateX(-140px); }
          to{ transform:translateX(min(48vw, 210px)); }
        }

        .wi-bob{ position:absolute; inset:0; }
        .wi-phase-walk .wi-bob{ animation: wi-bob .54s ease-in-out infinite; }
        @keyframes wi-bob{ 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-4px);} }

        .wi-fig{ width:100%; height:100%; overflow:visible; }

        /* -- limbs: default = relaxed standing pose -- */
        .wi-leg-left{ transform-origin:58px 152px; transform:rotate(3deg); }
        .wi-leg-right{ transform-origin:82px 152px; transform:rotate(-3deg); }
        .wi-arm-left{ transform-origin:38px 84px; transform:rotate(-6deg); }
        .wi-arm-right{ transform-origin:102px 84px; transform:rotate(8deg); }
        .wi-leg-left, .wi-leg-right, .wi-arm-left{ transition:transform .4s ease; }

        /* -- walking cycle -- */
        .wi-phase-walk .wi-leg-left{ animation: wi-legL .54s ease-in-out infinite; }
        .wi-phase-walk .wi-leg-right{ animation: wi-legR .54s ease-in-out infinite; }
        .wi-phase-walk .wi-arm-left{ animation: wi-armL .54s ease-in-out infinite; }
        .wi-phase-walk .wi-arm-right{ animation: wi-armR .54s ease-in-out infinite; }
        @keyframes wi-legL{ 0%,100%{ transform:rotate(23deg);} 50%{ transform:rotate(-21deg);} }
        @keyframes wi-legR{ 0%,100%{ transform:rotate(-21deg);} 50%{ transform:rotate(23deg);} }
        @keyframes wi-armL{ 0%,100%{ transform:rotate(-23deg);} 50%{ transform:rotate(19deg);} }
        @keyframes wi-armR{ 0%,100%{ transform:rotate(19deg);} 50%{ transform:rotate(-23deg);} }

        /* -- wave -- */
        .wi-phase-wave .wi-arm-right, .wi-phase-pause .wi-arm-right{
          animation: wi-wave 0.7s ease-in-out 2, wi-waveHold .3s ease forwards 1.4s;
        }
        @keyframes wi-wave{
          0%{ transform:rotate(8deg); }
          30%{ transform:rotate(-122deg); }
          50%{ transform:rotate(-100deg); }
          70%{ transform:rotate(-128deg); }
          100%{ transform:rotate(-112deg); }
        }
        @keyframes wi-waveHold{ to{ transform:rotate(-112deg); } }
        .wi-phase-wave .wi-head-tilt, .wi-phase-pause .wi-head-tilt{
          transform:rotate(-4deg) translateX(-1.5px);
        }
        .wi-head-tilt{ transform-origin:70px 44px; transition:transform .4s ease; }

        /* -- speech bubble -- */
        .wi-bubble{ opacity:0; transform:translateY(6px) scale(.9); transform-origin:80% 100%;
          transition:opacity .35s ease, transform .35s ease; }
        .wi-phase-wave .wi-bubble, .wi-phase-pause .wi-bubble{
          opacity:1; transform:translateY(0) scale(1);
        }

        .wi-caption{
          position:absolute; left:24px; bottom:128px; z-index:3;
          font-size:12px; letter-spacing:.05em; color:rgba(255,255,255,0.4);
          text-transform:uppercase; opacity:0; animation: wi-captionIn .5s ease forwards;
          animation-delay:2.1s;
        }
        @keyframes wi-captionIn{ from{ opacity:0; transform:translateY(6px);} to{ opacity:1; transform:translateY(0);} }
      `}</style>

      <button type="button" className="wi-skip" onClick={skip}>Skip</button>

      <div className="wi-floor" />
      <div className="wi-shadow" />

      <div className="wi-walker">
        <div className="wi-bob">
          <svg className="wi-fig" viewBox="0 -12 140 272" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="wiSkin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f2c79c" />
                <stop offset="1" stopColor="#dda876" />
              </linearGradient>
              <linearGradient id="wiSkinShade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#dda876" />
                <stop offset="1" stopColor="#c78f5f" />
              </linearGradient>
              <linearGradient id="wiShirt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fdf3e2" />
                <stop offset="1" stopColor="#f7e2bd" />
              </linearGradient>
              <linearGradient id="wiBlazer" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#4c46a3" />
                <stop offset="1" stopColor="#332d78" />
              </linearGradient>
              <linearGradient id="wiBlazerBack" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#3d3785" />
                <stop offset="1" stopColor="#2a255f" />
              </linearGradient>
              <linearGradient id="wiTrouser" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#332d78" />
                <stop offset="1" stopColor="#211d54" />
              </linearGradient>
              <linearGradient id="wiHair" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#453f78" />
                <stop offset="1" stopColor="#211d42" />
              </linearGradient>
              <linearGradient id="wiHairGloss" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#948bdc" />
                <stop offset="1" stopColor="#5851a8" />
              </linearGradient>
              <linearGradient id="wiShoe" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2a2440" />
                <stop offset="1" stopColor="#15132a" />
              </linearGradient>
              <clipPath id="wiHeadClip">
                <circle cx="70" cy="42" r="25" />
              </clipPath>
            </defs>

            {/* back leg */}
            <g className="wi-leg-right">
              <rect x="76" y="152" width="14" height="56" rx="6" fill="url(#wiTrouser)" />
              <rect x="74" y="204" width="18" height="6" rx="2" fill="#211d54" />
              <path d="M72,208 h24 a4,4 0 0 1 4,4 v3 a3,3 0 0 1 -3,3 h-27 a3,3 0 0 1 -2,-5 z" fill="url(#wiShoe)" />
              <rect x="76" y="212" width="18" height="1.6" fill="#453f78" opacity="0.6" />
            </g>

            {/* back arm */}
            <g className="wi-arm-left">
              <rect x="32" y="84" width="13" height="42" rx="6.5" fill="url(#wiBlazerBack)" />
              <rect x="33" y="119" width="11" height="9" rx="3.5" fill="url(#wiShirt)" />
              <circle cx="38.5" cy="132" r="7.2" fill="url(#wiSkinShade)" />
            </g>

            {/* torso: shirt base */}
            <rect x="45" y="70" width="50" height="80" rx="22" fill="url(#wiShirt)" />

            {/* blazer left + right panels */}
            <path d="M45,72 Q44,70 48,70 L66,70 L54,110 Q48,114 45,108 Z" fill="url(#wiBlazer)" />
            <path d="M95,72 Q96,70 92,70 L74,70 L86,110 Q92,114 95,108 Z" fill="url(#wiBlazer)" />
            <rect x="45" y="106" width="20" height="44" rx="10" fill="url(#wiBlazer)" />
            <rect x="75" y="106" width="20" height="44" rx="10" fill="url(#wiBlazer)" />

            {/* shirt buttons */}
            <circle cx="70" cy="112" r="2" fill="#e8c68f" />
            <circle cx="70" cy="124" r="2" fill="#e8c68f" />
            <circle cx="70" cy="136" r="2" fill="#e8c68f" />

            {/* neck + head group (tiltable) */}
            <g className="wi-head-tilt">
              <rect x="61" y="26" width="18" height="20" rx="5" fill="url(#wiSkinShade)" />
              {/* base coverage, clipped to the skull */}
              <g clipPath="url(#wiHeadClip)">
                <circle cx="70" cy="42" r="25" fill="url(#wiSkin)" />
                <path d="M44,31 Q45,9 70,8 Q95,9 96,31 Q92,15 70,14 Q48,15 44,31 Z" fill="url(#wiHair)" />
                <path d="M45,32 Q43,45 49,52 Q44,41 46,30 Z" fill="url(#wiHair)" />
                <path d="M95,32 Q97,45 91,52 Q96,41 94,30 Z" fill="url(#wiHair)" />
              </g>
              {/* swept quiff, allowed to rise above the skull outline for volume */}
              <path d="M46,27 Q49,6 70,3 Q90,1 96,17 Q97,22 94,25 Q90,10 72,8 Q56,8 50,21 Q48,25 46,27 Z" fill="url(#wiHair)" />
              <path d="M64,9 Q68,-4 79,-1 Q86,1 87,9 Q79,0 70,3 Q66,4 64,9 Z" fill="url(#wiHair)" />
              {/* texture strands */}
              <path d="M55,17 Q60,7 67,9" stroke="#17142c" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.45" />
              <path d="M68,10 Q73,1 80,4" stroke="#17142c" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.45" />
              <path d="M78,9 Q84,4 90,10" stroke="#17142c" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.4" />
              {/* gloss highlight */}
              <path d="M56,18 Q64,7 76,7" stroke="url(#wiHairGloss)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
              <path d="M72,5 Q78,1 84,6" stroke="url(#wiHairGloss)" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.55" />
              {/* ears */}
              <ellipse cx="45.5" cy="43" rx="3" ry="4.5" fill="url(#wiSkin)" />
              <ellipse cx="94.5" cy="43" rx="3" ry="4.5" fill="url(#wiSkin)" />
              {/* face */}
              <path d="M56,36 q4,-3 8,0" stroke="#8a5c37" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M76,36 q4,-3 8,0" stroke="#8a5c37" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <circle cx="61" cy="43" r="2.1" fill="#2d2a4a" />
              <circle cx="79" cy="43" r="2.1" fill="#2d2a4a" />
              <path d="M62,54 Q70,60 78,54" stroke="#a86b3f" strokeWidth="2.1" fill="none" strokeLinecap="round" />
            </g>

            {/* front leg */}
            <g className="wi-leg-left">
              <rect x="50" y="152" width="14" height="56" rx="6" fill="url(#wiTrouser)" />
              <rect x="48" y="204" width="18" height="6" rx="2" fill="#332d78" />
              <path d="M46,208 h24 a4,4 0 0 1 4,4 v3 a3,3 0 0 1 -3,3 h-27 a3,3 0 0 1 -2,-5 z" fill="url(#wiShoe)" />
              <rect x="50" y="212" width="18" height="1.6" fill="#5851a8" opacity="0.7" />
            </g>

            {/* front / waving arm */}
            <g className="wi-arm-right">
              <rect x="95" y="84" width="13" height="42" rx="6.5" fill="url(#wiBlazer)" />
              <rect x="96" y="119" width="11" height="9" rx="3.5" fill="url(#wiShirt)" />
              <circle cx="101.5" cy="132" r="7.6" fill="url(#wiSkin)" />
              <circle cx="106" cy="128" r="3" fill="url(#wiSkin)" />
            </g>

            {/* speech bubble */}
            <g className="wi-bubble">
              <path d="M92,0 h38 a8,8 0 0 1 8,8 v15 a8,8 0 0 1 -8,8 h-20 l-10,9 v-9 h-8 a8,8 0 0 1 -8,-8 v-15 a8,8 0 0 1 8,-8 z" fill="#fff" />
              <text x="111" y="21" fontSize="16" fontWeight="800" textAnchor="middle" fill="#4c1d95" fontFamily="'Plus Jakarta Sans',sans-serif">Hi!</text>
            </g>
          </svg>
        </div>
      </div>

      <p className="wi-caption">Say hello · signing in…</p>
    </div>
  );
}