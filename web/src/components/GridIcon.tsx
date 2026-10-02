import type { GridKind } from '../notebook/config';

// A thumbnail of a grid pattern (48×60), drawn the same way as in lib/grids.typ.
export function GridIcon({ kind, color = 'currentColor' }: { kind: GridKind; color?: string }) {
  const w = 48;
  const h = 60;
  const s = 8;
  const els: React.ReactNode[] = [];
  switch (kind) {
    case 'dots':
      for (let x = 4; x < w; x += s)
        for (let y = 6; y < h; y += s)
          els.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} stroke="none" />);
      break;
    case 'lines':
      for (let y = 8; y < h; y += s) els.push(<line key={y} x1={0} x2={w} y1={y} y2={y} />);
      break;
    case 'squares':
      for (let y = 6; y < h; y += s) els.push(<line key={`h${y}`} x1={0} x2={w} y1={y} y2={y} />);
      for (let x = 4; x < w; x += s) els.push(<line key={`v${x}`} x1={x} x2={x} y1={0} y2={h} />);
      break;
    case 'isometric': {
      const row = (s * Math.sqrt(3)) / 2;
      for (let j = 0; j * row + 5 < h; j++)
        for (let x = 4 + (j % 2 ? s / 2 : 0); x < w; x += s)
          els.push(<circle key={`${j}-${x}`} cx={x} cy={5 + j * row} r={0.9} stroke="none" />);
      break;
    }
    case 'hex': {
      const a = 5;
      const hh = a * Math.sqrt(3);
      for (let i = 0; i * 1.5 * a < w; i++)
        for (let j = -1; j * hh < h; j++) {
          const x = i * 1.5 * a;
          const y = j * hh + (i % 2 ? hh / 2 : 0);
          const pts = [
            [0.5 * a, 0],
            [1.5 * a, 0],
            [2 * a, hh / 2],
            [1.5 * a, hh],
            [0.5 * a, hh],
            [0, hh / 2],
          ]
            .map(([px, py]) => `${x + px!},${y + py!}`)
            .join(' ');
          els.push(<polygon key={`${i}-${j}`} points={pts} fill="none" />);
        }
      break;
    }
    case 'staff':
      for (let k = 0; k < 3; k++)
        for (let l = 0; l < 5; l++) {
          const y = 8 + k * 20 + l * 2.2;
          els.push(<line key={`${k}-${l}`} x1={0} x2={w} y1={y} y2={y} />);
        }
      break;
    case 'graph':
      for (let i = 0; i * 2 < h; i++) {
        const sw = i % 10 === 0 ? 0.9 : i % 5 === 0 ? 0.6 : 0.2;
        els.push(<line key={`h${i}`} x1={0} x2={w} y1={i * 2} y2={i * 2} strokeWidth={sw} />);
        if (i * 2 < w)
          els.push(<line key={`v${i}`} x1={i * 2} x2={i * 2} y1={0} y2={h} strokeWidth={sw} />);
      }
      break;
    case 'margin-lines':
      for (let y = 8; y < h; y += s) els.push(<line key={y} x1={0} x2={w} y1={y} y2={y} />);
      els.push(<line key="m" x1={12} x2={12} y1={0} y2={h} strokeWidth={1} />);
      break;
    case 'calligraphy':
      for (let top = 5; top + 12 < h; top += 16) {
        els.push(
          <line key={`a${top}`} x1={0} x2={w} y1={top} y2={top} strokeDasharray="1.5 1.5" />,
          <line key={`x${top}`} x1={0} x2={w} y1={top + 4} y2={top + 4} />,
          <line key={`b${top}`} x1={0} x2={w} y1={top + 8} y2={top + 8} />,
          <line
            key={`d${top}`}
            x1={0}
            x2={w}
            y1={top + 12}
            y2={top + 12}
            strokeDasharray="1.5 1.5"
          />,
        );
        for (let x = -8; x < w; x += 6)
          els.push(
            <line
              key={`s${top}-${x}`}
              x1={x}
              x2={x + 8.4}
              y1={top + 12}
              y2={top}
              strokeWidth={0.3}
            />,
          );
      }
      break;
    case 'seyes':
      for (let i = 0; i * 2 < h; i++)
        els.push(
          <line
            key={`h${i}`}
            x1={0}
            x2={w}
            y1={4 + i * 2}
            y2={4 + i * 2}
            strokeWidth={i % 4 === 0 ? 0.7 : 0.25}
          />,
        );
      for (let x = 18; x < w; x += 8)
        els.push(<line key={`v${x}`} x1={x} x2={x} y1={0} y2={h} strokeWidth={0.25} />);
      els.push(<line key="m" x1={10} x2={10} y1={0} y2={h} strokeWidth={1} />);
      break;
    case 'tab':
      for (let k = 0; k < 3; k++)
        for (let l = 0; l < 6; l++) {
          const y = 6 + k * 19 + l * 2.2;
          els.push(<line key={`${k}-${l}`} x1={0} x2={w} y1={y} y2={y} />);
        }
      break;
    case 'storyboard':
      for (let k = 0; k < 2; k++) {
        const y = 4 + k * 28;
        els.push(
          <rect key={`r${k}`} x={4} y={y} width={40} height={18} fill="none" strokeWidth={0.9} />,
          <line key={`a${k}`} x1={4} x2={44} y1={y + 22} y2={y + 22} />,
          <line key={`b${k}`} x1={4} x2={44} y1={y + 26} y2={y + 26} />,
        );
      }
      break;
    case 'split':
      for (let x = 4; x < w; x += s)
        for (let y = 6; y < h / 2; y += s)
          els.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} stroke="none" />);
      for (let y = h / 2 + 4; y < h; y += s)
        els.push(<line key={`l${y}`} x1={0} x2={w} y1={y} y2={y} />);
      break;
    case 'blank':
      break;
  }
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-full w-full"
      aria-hidden
      fill={color}
      stroke={color}
      strokeWidth={0.6}
    >
      {els}
    </svg>
  );
}
