import { useT } from '../i18n';
import { StepPage, StepSection } from './Stepper';

// Fonts printed in the notebook and the libraries the website is built on, with licences.
const CREDITS: [string, string, string][] = [
  ['Special Elite', 'Apache License 2.0', 'https://fonts.google.com/specimen/Special+Elite'],
  [
    'Courier Prime',
    'SIL Open Font License 1.1',
    'https://github.com/quoteunquoteapps/CourierPrime',
  ],
  ['Cutive Mono', 'SIL Open Font License 1.1', 'https://github.com/googlefonts/cutivemono'],
  ['Libertinus Serif', 'SIL Open Font License 1.1', 'https://github.com/alerque/libertinus'],
  ['New Computer Modern', 'GUST Font License', 'https://ctan.org/pkg/newcomputermodern'],
  ['Public Sans', 'SIL Open Font License 1.1', 'https://public-sans.digital.gov/'],
  ['Typst', 'Apache License 2.0', 'https://typst.app/'],
  ['typst.ts', 'Apache License 2.0', 'https://github.com/Myriad-Dreamin/typst.ts'],
  ['pdf.js', 'Apache License 2.0', 'https://mozilla.github.io/pdf.js/'],
  ['pdf-lib', 'MIT', 'https://pdf-lib.js.org/'],
];

export function StartStep() {
  const t = useT().start;
  return (
    <StepPage title={t.title} lead={t.lead} nextLabel={t.begin}>
      <StepSection title={t.needTitle}>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-ink-soft">
          {t.need.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </StepSection>

      <StepSection title={t.howTitle}>
        <ol className="list-decimal space-y-1.5 pl-5 marker:text-ink-soft">
          {t.how.map(([name, text]) => (
            <li key={name}>
              <strong>{name}</strong>: {text}
            </li>
          ))}
        </ol>
      </StepSection>

      <details className="rounded-xl border border-rule bg-panel-raised px-4 py-3 text-sm">
        <summary className="cursor-pointer text-[15px] font-semibold text-ink">
          {t.aboutTitle}
        </summary>
        <div className="mt-3 space-y-3 leading-relaxed text-ink-soft">
          <p>{t.about}</p>
          <p>{t.trademark}</p>
          <p className="font-medium text-ink">{t.creditsTitle}</p>
          <ul className="space-y-0.5">
            {CREDITS.map(([name, license, url]) => (
              <li key={name}>
                <a href={url} className="text-accent underline-offset-2 hover:underline">
                  {name}
                </a>{' '}
                · {license}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </StepPage>
  );
}
