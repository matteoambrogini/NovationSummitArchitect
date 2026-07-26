export function MetricRing({ value, label }: { value: number; label: string }) {
  const percentage = Math.round(value * 100);
  return (
    <div className="metric-ring" style={{ "--value": `${percentage * 3.6}deg` } as React.CSSProperties}>
      <div>
        <strong>{percentage}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
