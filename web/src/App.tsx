import { useEffect, useRef } from 'react';
import { MotionConfig } from 'motion/react';
import { Header } from './components/Header';
import { ControlPanel } from './components/panel/ControlPanel';
import { useLang, useT } from './i18n';
import { configFromHash } from './notebook/share';
import { Desk } from './preview/Desk';
import { DocProvider } from './state/doc';
import { useNotebook } from './state/store';
import { TypstProvider } from './state/typst';
import type { TypstClient } from './typst/client';
import { AssemblyStep } from './wizard/AssemblyStep';
import { PrinterStep } from './wizard/PrinterStep';
import { PrintStep } from './wizard/PrintStep';
import { StartStep } from './wizard/StartStep';
import { TestStep } from './wizard/TestStep';
import { WizardProvider, useWizard } from './wizard/WizardContext';

// A link with a configuration (#c=…) takes precedence over the one saved in the browser.
// It's only loaded when the design in the address changes: moving between steps
// (#step=…) or "back" must not undo changes made after opening the link.
function useConfigFromLink() {
  const replace = useNotebook((s) => s.replace);
  const loaded = useRef<string | null>(null);
  useEffect(() => {
    const load = () => {
      const c = new URLSearchParams(location.hash.replace(/^#/, '')).get('c');
      if (c === loaded.current) return;
      loaded.current = c;
      const cfg = configFromHash(location.hash);
      if (cfg) replace(cfg);
    };
    load();
    window.addEventListener('hashchange', load);
    return () => window.removeEventListener('hashchange', load);
  }, [replace]);
}

// <html lang> follows the website's language (screen readers, hyphenation).
function useHtmlLang() {
  const lang = useLang((s) => s.lang);
  const title = useT().appTitle;
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = title;
  }, [lang, title]);
}

function DesignStep() {
  const t = useT().panel;
  return (
    <main className="flex min-h-0 flex-1 max-lg:flex-col max-lg:overflow-y-auto">
      <aside
        aria-label={t.settings}
        className="flex min-h-0 flex-col border-rule bg-panel max-lg:order-2 lg:w-[400px] lg:shrink-0 lg:border-r"
      >
        <ControlPanel />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col max-lg:order-1 max-lg:h-[72svh] max-lg:flex-none">
        <Desk />
      </div>
    </main>
  );
}

function CurrentStep() {
  const { step } = useWizard();
  switch (step) {
    case 'start':
      return <StartStep />;
    case 'printer':
      return <PrinterStep />;
    case 'design':
      return <DesignStep />;
    case 'test':
      return <TestStep />;
    case 'print':
      return <PrintStep />;
    case 'assembly':
      return <AssemblyStep />;
  }
}

export function App({ client }: { client?: TypstClient }) {
  useConfigFromLink();
  useHtmlLang();
  return (
    <MotionConfig reducedMotion="user">
      <TypstProvider client={client}>
        <DocProvider>
          <WizardProvider>
            <div className="flex h-full flex-col">
              <Header />
              <CurrentStep />
            </div>
          </WizardProvider>
        </DocProvider>
      </TypstProvider>
    </MotionConfig>
  );
}
