import { useCallback, useEffect, useState } from "react";

type SetSearchParams = (nextInit: URLSearchParams) => void;

export function useDebouncedSearchParam({
  value,
  searchParams,
  setSearchParams,
  delay = 250,
}: {
  value: string;
  searchParams: URLSearchParams;
  setSearchParams: SetSearchParams;
  delay?: number;
}) {
  const [local, setLocal] = useState({ source: value, draft: value });
  const draft = local.source === value ? local.draft : value;
  const setDraft = useCallback(
    (nextDraft: string) => setLocal({ source: value, draft: nextDraft }),
    [value],
  );

  useEffect(() => {
    if (draft === value) return undefined;

    const handle = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const trimmed = draft.trim();
      if (trimmed) next.set("search", trimmed);
      else next.delete("search");
      next.set("page", "1");
      setSearchParams(next);
    }, delay);

    return () => window.clearTimeout(handle);
  }, [delay, draft, searchParams, setSearchParams, value]);

  return [draft, setDraft] as const;
}
