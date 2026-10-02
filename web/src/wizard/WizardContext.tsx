import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { hashWithStep, stepFromHash, type StepId } from './steps';

interface WizardValue {
  step: StepId;
  go: (step: StepId) => void;
}

const WizardContext = createContext<WizardValue | null>(null);

// The step in the address: every step is a history entry, so the browser's "back"
// goes back to the previous step.
export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<StepId>(() => stepFromHash(location.hash));

  useEffect(() => {
    const sync = () => setStep(stepFromHash(location.hash));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const go = useCallback((next: StepId) => {
    history.pushState(null, '', hashWithStep(location.hash, next));
    setStep(next);
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(() => ({ step, go }), [step, go]);
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard poza WizardProvider');
  return ctx;
}

// For controls also used outside the wizard (the panel in tests): null without a wizard.
export function useOptionalWizard(): WizardValue | null {
  return useContext(WizardContext);
}
