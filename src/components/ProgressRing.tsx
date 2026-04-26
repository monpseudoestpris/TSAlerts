import { useEffect, useRef, useState } from 'react';

const SIZE = 240;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

interface Props {
  icon: string;
  totalSec: number;
  elapsedSec: number;
  onExpire?: () => void;
}

export function ProgressRing({ icon, totalSec, elapsedSec, onExpire }: Props) {
  const ringRef = useRef<SVGCircleElement | null>(null);
  const [expired, setExpired] = useState(elapsedSec >= totalSec);

  useEffect(() => {
    let raf = 0;
    const startedAt = Date.now() - elapsedSec * 1000;
    let calledExpire = false;

    function setOffset(ratio: number) {
      if (!ringRef.current) return;
      ringRef.current.setAttribute('stroke-dashoffset', String(C * (1 - ratio)));
    }

    function tick() {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, totalSec - elapsed);
      const ratio = totalSec > 0 ? remaining / totalSec : 0;
      setOffset(ratio);
      if (remaining <= 0) {
        if (!calledExpire) {
          calledExpire = true;
          setExpired(true);
          onExpire?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    if (elapsedSec >= totalSec) {
      setOffset(0);
      setExpired(true);
      calledExpire = true;
      onExpire?.();
    } else {
      tick();
    }

    return () => cancelAnimationFrame(raf);
  }, [totalSec, elapsedSec, onExpire]);

  return (
    <div
      className={`relative w-60 h-60 rounded-full ${expired ? 'animate-halo' : ''}`}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%">
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none" stroke="rgba(163,177,198,0.35)" strokeWidth={STROKE}
        />
        <circle
          ref={ringRef}
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none" stroke="var(--accent, #7aa2c8)" strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={0}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ stroke: '#7aa2c8' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-mega select-none">
        {icon}
      </div>
    </div>
  );
}
