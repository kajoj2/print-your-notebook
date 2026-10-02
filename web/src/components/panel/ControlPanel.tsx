import { useState } from 'react';
import { Tabs } from 'radix-ui';
import { AnimatePresence, motion } from 'motion/react';
import { FormatTab } from './FormatTab';
import { PaperTab } from './PaperTab';
import { PagesTab } from './PagesTab';
import { StyleTab } from './StyleTab';
import { useT } from '../../i18n';

// tab names: Messages.panel.tabs
const TABS = [
  { id: 'format', Content: FormatTab },
  { id: 'paper', Content: PaperTab },
  { id: 'pages', Content: PagesTab },
  { id: 'style', Content: StyleTab },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ControlPanel() {
  const m = useT().panel;
  const [tab, setTab] = useState<TabId>('format');

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(v) => setTab(v as TabId)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <Tabs.List aria-label={m.tabsLabel} className="flex shrink-0 gap-1 border-b border-rule px-3">
        {TABS.map((t) => (
          <Tabs.Trigger
            key={t.id}
            value={t.id}
            className="relative px-3 pb-2.5 pt-3 text-sm text-ink-soft transition-colors hover:text-ink data-[state=active]:text-ink"
          >
            {m.tabs[t.id]}
            {t.id === tab && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {TABS.filter((t) => t.id === tab).map(({ id, Content }) => (
            <Tabs.Content key={id} value={id} forceMount asChild>
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
              >
                <Content />
              </motion.div>
            </Tabs.Content>
          ))}
        </AnimatePresence>
      </div>
    </Tabs.Root>
  );
}
