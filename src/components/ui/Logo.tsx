/**
 * The mark: a ring of twelve points (every form you ever filed, held in one orbit)
 * with one solid point at the centre (the fact on record now). Reads as a sealed
 * memory at 16px and at 200px. No text, no engraving.
 */
export function Mark({ size = 28, className = "", tone = "currentColor" }: { size?: number; className?: string; tone?: string }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return [50 + Math.cos(a) * 38, 50 + Math.sin(a) * 38] as const;
  });
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden fill={tone}>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 6 : 4.2} />
      ))}
      <circle cx="50" cy="50" r="11" />
    </svg>
  );
}
