import { motion } from 'framer-motion'

export function Panel({
  title,
  eyebrow,
  children,
  className = '',
}: {
  title: string
  eyebrow?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.section
      className={`panel ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="panel-header">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </motion.section>
  )
}

export function StatCard({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <motion.article className="stat-card" whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </motion.article>
  )
}
