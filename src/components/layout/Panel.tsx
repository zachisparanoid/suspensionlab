/**
 * Reusable titled panel with optional collapse. The app's core surface.
 */
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface PanelProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  /** Remove internal padding (for edge-to-edge charts/diagrams). */
  flush?: boolean;
}

export const PANEL_EASE = [0.22, 1, 0.36, 1] as const;

export function Panel({
  title,
  actions,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className = '',
  flush = false,
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section className={`panel ${flush ? '!p-0' : ''} ${className}`}>
      {title && (
        <header
          className={`flex items-center justify-between gap-2 ${flush ? 'px-4 pt-4' : ''} ${
            collapsed ? '' : 'mb-3'
          }`}
        >
          {collapsible ? (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              className="section-title flex items-center gap-1.5 hover:text-ink"
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
              />
              {title}
            </button>
          ) : (
            <h2 className="section-title">{title}</h2>
          )}
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: PANEL_EASE }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
