export function LoadingState({
  label = "Loading live data…",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span />
      {label}
    </div>
  );
}
