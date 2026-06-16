export function LoadingState({ label = 'Loading live data...' }: { label?: string }) {
  return (
    <div className="loading-state">
      <span />
      {label}
    </div>
  )
}
