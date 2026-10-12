import { useMemo } from "react";
import { encode } from "uqr";

/** A QR code drawn with round dots and rounded finder squares. */
export function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const { modules, count } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: 0 });
    return { modules: qr.data, count: qr.size };
  }, [value]);

  const isFinder = (x: number, y: number) => (x < 7 || x >= count - 7) && (y < 7 || y >= count - 7) && !(x >= 7 && y >= 7);
  const finders = [
    [0, 0],
    [count - 7, 0],
    [0, count - 7],
  ];

  return (
    <svg viewBox={`-1 -1 ${count + 2} ${count + 2}`} width={size} height={size} fill="currentColor" role="img" aria-label={`QR code for ${value}`}>
      {modules.flatMap((row, y) =>
        row.map((on, x) => (on && !isFinder(x, y) ? <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.42} /> : null)),
      )}
      {finders.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x! + 0.5} y={y! + 0.5} width={6} height={6} rx={1.8} fill="none" stroke="currentColor" strokeWidth={1} />
          <rect x={x! + 2} y={y! + 2} width={3} height={3} rx={0.9} />
        </g>
      ))}
    </svg>
  );
}
