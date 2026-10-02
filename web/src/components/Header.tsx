import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Download, Link2, LoaderCircle, RotateCcw } from 'lucide-react';
import { LANGS, MESSAGES, useLang, useT, type Lang } from '../i18n';
import { shareUrl } from '../notebook/share';
import { usePrinter } from '../state/printer';
import { useNotebook } from '../state/store';
import { useDownloadPdf } from '../state/typst';
import { Stepper } from '../wizard/Stepper';
import { useWizard } from '../wizard/WizardContext';

// Interface language. A notebook nobody has changed yet (default title in the website's
// language) switches along with the interface; a custom design keeps its own language.
function LanguageSwitch() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const update = useNotebook((s) => s.update);
  const t = useT();
  const choose = (next: Lang) => {
    if (next === lang) return;
    update((c) => {
      if (c.lang === lang && c.title === MESSAGES[lang].format.defaultTitle) {
        c.lang = next;
        c.title = MESSAGES[next].format.defaultTitle;
      }
    });
    setLang(next);
  };
  return (
    <div
      role="group"
      aria-label={t.language}
      className="flex rounded-full bg-rule/60 p-0.5 text-xs"
    >
      {(Object.keys(LANGS) as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === lang}
          title={LANGS[l]}
          onClick={() => choose(l)}
          className="rounded-full px-2 py-0.5 uppercase text-ink-soft aria-pressed:bg-panel-raised aria-pressed:text-ink aria-pressed:shadow-sm"
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const t = useT().header;
  const appTitle = useT().appTitle;
  const config = useNotebook((s) => s.config);
  const reset = useNotebook((s) => s.reset);
  const printer = usePrinter((s) => s.printer);
  const pdf = useDownloadPdf(config, printer);
  const [copied, setCopied] = useState(false);
  const { step, go } = useWizard();

  const copyLink = async () => {
    const url = shareUrl(config, location.href);
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // without clipboard permission the link is in the address bar anyway
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const button =
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors disabled:opacity-50 max-sm:px-2.5';

  return (
    // phone: title and buttons in one row, the step bar below them; design buttons
    // are icons only (the name stays for screen readers), so the preview has room
    <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-panel px-5 py-3 max-sm:gap-x-2 max-sm:px-3 max-sm:py-2">
      <h1 className="font-type text-[22px] leading-none tracking-tight text-ink max-sm:text-lg">
        {appTitle}
      </h1>
      <div className="min-w-0 max-lg:order-last max-lg:basis-full">
        <Stepper />
      </div>
      <div className="ml-auto flex items-center gap-2 max-sm:gap-1">
        {step === 'design' && (
          <>
            <button
              type="button"
              onClick={reset}
              className={`${button} text-ink-soft hover:text-ink`}
              title={t.resetTitle}
            >
              <RotateCcw size={15} />
              <span className="max-sm:sr-only">{t.reset}</span>
            </button>
            <button
              type="button"
              onClick={copyLink}
              className={`${button} border border-rule bg-panel-raised text-ink hover:border-ink-soft/40`}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={copied ? 'ok' : 'link'}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="inline-flex"
                >
                  {copied ? <Check size={15} /> : <Link2 size={15} />}
                </motion.span>
              </AnimatePresence>
              <span aria-live="polite" className="max-sm:sr-only">
                {copied ? t.copied : t.copyLink}
              </span>
            </button>
            <button
              type="button"
              onClick={pdf.download}
              disabled={pdf.disabled}
              title={t.pdfTitle}
              className={`${button} border border-rule bg-panel-raised text-ink hover:border-ink-soft/40`}
            >
              {pdf.busy ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              <span className="max-sm:sr-only">{pdf.busy ? t.pdfBusy : t.pdf}</span>
            </button>
            <button
              type="button"
              onClick={() => go('test')}
              className={`${button} bg-accent font-medium text-white hover:bg-accent/90`}
            >
              {t.toTest}
              <ArrowRight size={15} />
            </button>
          </>
        )}
        <LanguageSwitch />
      </div>
      {pdf.error && (
        <p role="alert" className="w-full text-sm text-danger">
          {t.pdfError(pdf.error)}
        </p>
      )}
    </header>
  );
}
