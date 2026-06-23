import { useI18n } from "../context/I18nContext";

export function LoadingState({
  label,
}: {
  label?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span />
      {label ?? t.common.loadingLiveData}
    </div>
  );
}
