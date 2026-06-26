import clsx from 'clsx'
import type { ReactNode } from "react";

export function Panel({
  title,
  eyebrow,
  headerMeta,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  headerMeta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('panel', className)}>
      <div className="panel-header">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        {headerMeta && (
          <div className="panel-header-aside">
            <span className="panel-header-meta">{headerMeta}</span>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
