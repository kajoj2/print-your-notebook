// Interface texts in Polish. The template for the Messages type: en.ts must have the same keys.
// Text printed in the notebook is separate, in lib/i18n.typ.

import type {
  ContactField,
  GridKind,
  PackingGroup,
  PixelTheme,
  SectionType,
  ShoppingGroup,
  ShoppingSplit,
  TastingKind,
  WatchKind,
  WorkoutKind,
} from '../notebook/config';
import type { MarginSide } from '../notebook/printer';
import type { StepId } from '../wizard/steps';

// Polish plural forms: 1 strona, 2–4 strony, 5+ stron (but 12–14 stron, 22 strony).
function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

const mm = (x: number) => `${String(x).replace('.', ',')} mm`;

export const pl = {
  lang: 'pl',
  mm,
  pages: (n: number) => `${n} ${plural(n, 'strona', 'strony', 'stron')}`,
  appTitle: 'Generator notesów',
  language: 'Język',

  steps: {
    start: 'Start',
    printer: 'Drukarka',
    design: 'Projekt',
    test: 'Próba',
    print: 'Druk',
    assembly: 'Składanie',
  } satisfies Record<StepId, string>,
  nav: { label: 'Kroki kreatora', back: 'Wstecz', next: 'Dalej' },

  header: {
    reset: 'Od nowa',
    resetTitle: 'Przywróć ustawienia domyślne',
    copyLink: 'Kopiuj link',
    copied: 'Link skopiowany',
    pdf: 'Pobierz PDF',
    pdfBusy: 'Przygotowuję PDF…',
    pdfTitle: 'Pojedyncze strony notesu, bez układania do druku',
    pdfError: (e: string) => `Nie udało się przygotować PDF: ${e}`,
    toTest: 'Dalej: próba',
  },

  start: {
    title: 'Wydrukuj własny notes',
    lead: 'Zaprojektujesz wkład do notesu podróżnego (regular, passport, pocket albo własny rozmiar), wydrukujesz go na zwykłej drukarce i zszyjesz. Wszystko dzieje się w przeglądarce: nic nie jest wysyłane na serwer.',
    begin: 'Zaczynamy',
    needTitle: 'Co będzie potrzebne',
    need: [
      'drukarka i papier A4 albo Letter (najlepiej 80–100 g/m²);',
      'nożyk i metalowa linijka albo gilotyna do papieru;',
      'igła i mocna nić (np. lniana) albo zszywacz z długim ramieniem; do dziurek przyda się szydło lub cienki gwóźdź;',
      'ok. pół godziny na notes 32-stronicowy.',
    ],
    aboutTitle: 'O stronie',
    about:
      'Projekt i ustawienia drukarki zostają w tej przeglądarce. Strona nie używa ciasteczek ani statystyk i niczego nie wysyła na serwer: skład robi Typst uruchomiony w przeglądarce.',
    trademark:
      'Traveler’s Notebook to znak towarowy Traveler’s Company. Ta strona nie jest z nią związana; wkłady mają po prostu pasujące wymiary.',
    creditsTitle: 'Fonty i oprogramowanie',
    howTitle: 'Jak to przebiega',
    how: [
      [
        'Drukarka',
        'mówisz, jak drukujesz dwustronnie i ile miejsca drukarka zostawia przy krawędzi.',
      ],
      [
        'Projekt',
        'wybierasz format, siatkę i strony (kalendarze, listy, notatki) i od razu widzisz notes.',
      ],
      [
        'Próba',
        '(można pominąć): jedna kartka testowa pokaże, czy skala, margines i tyły kartek są w porządku.',
      ],
      ['Druk', 'pobierasz pliki ułożone do składki i drukujesz je według instrukcji.'],
      ['Składanie', 'tniesz, składasz i zszywasz.'],
    ] as [string, string][],
  },

  printer: {
    title: 'Drukarka i papier',
    lead: 'Te ustawienia zostają w tej przeglądarce i nie trafiają do linku z projektem, więc przy kolejnym notesie nie trzeba ich powtarzać.',
    paper: 'Papier',
    paperSize: 'Rozmiar kartki',
    duplex: 'Druk dwustronny',
    autoTitle: 'Drukarka sama',
    autoText:
      'W oknie drukowania jest opcja „Dwustronnie”. Dostaniesz jeden plik, a drukarka sama obróci kartki.',
    manualTitle: 'Ręcznie',
    manualText:
      'Najpierw drukujesz przody, potem wkładasz stos z powrotem i drukujesz tyły. Dostaniesz dwa pliki.',
    duplexHelp:
      'Nie wiesz? Otwórz dowolny dokument, wybierz Drukuj i poszukaj opcji „Dwustronnie” albo „Druk dwustronny”. Jeśli jej nie ma, wybierz „Ręcznie”.',
    margin: 'Margines drukarki',
    marginText:
      'Większość drukarek nie drukuje kilku milimetrów przy krawędzi kartki: atramentowe zwykle ok. 3 mm, laserowe 4–5 mm. Jeśli nie wiesz, zostaw 5 mm. Projekt dopasuje do tego marginesy notesu.',
    unprintable: 'Drukarka nie drukuje przy krawędzi',
    advanced: 'Zaawansowane: tyły kartek',
    advancedText:
      'Potrzebne tylko wtedy, gdy tyły wychodzą na złych kartkach, do góry nogami albo przesunięte względem przodów.',
    evenReverse: 'Tyły w odwrotnej kolejności',
    evenReverseText:
      'Przy ręcznym druku: zwykle potrzebne w drukarkach, które wydają kartki zadrukiem w dół.',
    rotateBack: 'Obróć tyły o 180°',
    rotateBackText: 'Gdy tył kartki wychodzi do góry nogami względem przodu.',
    dx: 'Przesunięcie tyłu w prawo',
    dy: 'Przesunięcie tyłu w dół',
    reset: 'Przywróć ustawienia domyślne drukarki',
    compat: 'Tryb zgodności',
    raster: 'Drukuj strony jako obrazy',
    rasterText:
      'Dla drukarek, które zamiast tekstu drukują przypadkowe znaki, pomijają grafikę albo same zmieniają skalę. Pliki są większe i przygotowują się dłużej.',
  },

  test: {
    title: 'Wydruk próbny',
    lead: 'Dwie, trzy kartki, zanim wydrukujesz cały notes: sprawdzisz skalę, margines drukarki i to, czy tyły trafiają na właściwe kartki we właściwej orientacji. Krok możesz pominąć.',
    noFit: 'Ten format nie zmieści się na kartce. Zmień go w kroku Projekt.',
    printTitle: '1. Wydrukuj',
    prepare: 'Przygotuj wydruk próbny',
    busy: 'Przygotowuję…',
    error: (e: string) => `Nie udało się przygotować plików: ${e}`,
    files: {
      both: 'Arkusz próbny (dwustronnie)',
      front: 'Arkusz próbny: przód',
      back: 'Arkusz próbny: tył',
      'order-duplex': 'Test kolejności (dwustronnie)',
      'order-odd': 'Test kolejności: przody',
      'order-even': 'Test kolejności: tyły',
    },
    fileNames: {
      both: 'proba-dwustronnie.pdf',
      front: 'proba-1-przod.pdf',
      back: 'proba-2-tyl.pdf',
      order: 'kolejnosc.pdf',
    },
    manualSteps: (front: string, back: string) => [
      `Wydrukuj „${front}” w skali 100%.`,
      `Włóż tę kartkę z powrotem tak, jak wkładasz stos przy drukowaniu tyłów, i wydrukuj „${back}”.`,
      'Tak samo test kolejności: najpierw przody (dwie kartki), potem ten stos z powrotem i tyły.',
    ],
    autoText: (longEdge: boolean) =>
      `Wydrukuj oba pliki dwustronnie, w skali 100%, z odwracaniem wzdłuż ${longEdge ? 'dłuższej' : 'krótszej'} krawędzi.`,
    checkTitle: '2. Sprawdź',
    yes: 'Tak',
    scaleQ:
      'Zmierz linijką odcinek od kreski −50 do 50 na poziomej linijce arkusza próbnego. Ma 100 mm?',
    scaleYes: 'Tak, 100 mm',
    scaleNo: 'Nie',
    scaleDone:
      'W oknie drukowania ustaw skalę 100% („Rzeczywisty rozmiar”) zamiast „Dopasuj do strony” i wydrukuj jeszcze raz.',
    frameQ: 'Przerywana ramka przy krawędziach przodu wydrukowała się w całości?',
    frameNo: 'Nie, jest ucięta',
    frameDone: 'Margines drukarki zwiększony o 1 mm. Przygotuj arkusz jeszcze raz i sprawdź ramkę.',
    arrowQ: 'Strzałka „GÓRA” z tyłu wskazuje tę samą krawędź kartki co strzałka z przodu?',
    arrowNo: 'Nie, jest odwrócona',
    arrowDone: 'Tyły będą obrócone o 180°.',
    orderQ: 'Test kolejności: kartka z przodem 8 | 1 ma z tyłu 2 | 7 (numery stron na dole)?',
    orderNo: 'Nie, tyły są zamienione',
    orderDone: 'Kolejność tyłów odwrócona. Wydrukuj test kolejności jeszcze raz.',
    offsetQ:
      'Obejrzyj kartkę pod światło od strony przodu. O ile milimetrów krzyżyk z tyłu jest przesunięty względem krzyżyka z przodu? Odczytaj to z linijek. W lewo i w górę wpisz z minusem.',
    right: 'W prawo',
    down: 'W dół',
    applyOffset: 'Popraw przesunięcie tyłu',
    offsetDone: (dx: number, dy: number) =>
      `Zapisane (w prawo ${dx} mm, w dół ${dy} mm). Przygotuj arkusz jeszcze raz i sprawdź. Jeśli rozjazd się zwiększył, wpisz ten sam odczyt z przeciwnym znakiem.`,
  },

  print: {
    title: 'Druk',
    lead: 'Pliki są ułożone do składki: strony trafią na właściwe miejsca dopiero po złożeniu kartek.',
    summary: 'Twój notes',
    format: 'Format',
    customFormat: 'Własny format',
    pagesLabel: 'Strony',
    sheets: (paper: string) => `Kartki ${paper}`,
    stackedNote: ' (na każdej kartce dwie rozkładówki, jedna nad drugą)',
    duplex: 'Druk dwustronny',
    duplexAuto: 'drukarka sama',
    duplexManual: 'ręcznie',
    change: 'zmień',
    widerMargins: (u: string) =>
      `Marginesy są szersze niż w projekcie, bo drukarka nie drukuje ${u} przy krawędzi.`,
    thick: (max: number) =>
      `Ponad ${max} kartek w jednej składce trudno zszyć, a zewnętrzne kartki wystają po złożeniu. Rozważ mniejszą liczbę stron.`,
    noFit: (w: number, h: number, paper: string) =>
      `Rozkładówka ${w} × ${h} mm nie zmieści się na kartce ${paper}. Zmień format w kroku`,
    filesTitle: 'Pliki do druku',
    prepare: 'Przygotuj pliki do druku',
    busy: 'Przygotowuję pliki…',
    error: (e: string) => `Nie udało się przygotować plików: ${e}`,
    files: { duplex: 'Notes (dwustronnie)', odd: '1. Przody kartek', even: '2. Tyły kartek' },
    fileSuffix: { duplex: 'dwustronnie', odd: '1-przody', even: '2-tyly' },
    dialogTitle: 'Ustawienia w oknie drukowania',
    dialog: (paper: string) => [
      'Skala 100% („Rzeczywisty rozmiar”). Nie wybieraj „Dopasuj do strony”: notes wyjdzie mniejszy, a znaczniki cięcia się rozjadą.',
      `Papier ${paper}, orientacja automatyczna.`,
      'Otwieraj pliki w czytniku PDF (Podgląd, Adobe Acrobat, przeglądarka) i drukuj z niego, a nie z podglądu plików w systemie.',
    ],
    autoTitle: 'Drukowanie',
    autoSteps: (file: string, longEdge: boolean) => [
      `Otwórz plik „${file}”.`,
      `Włącz druk dwustronny z odwracaniem wzdłuż ${longEdge ? 'dłuższej' : 'krótszej'} krawędzi.`,
      'Wydrukuj i przejdź do składania.',
    ],
    manualTitle: 'Drukowanie ręcznie dwustronne',
    manualSteps: (front: string, back: string) => [
      `Wydrukuj plik „${front}” jednostronnie.`,
      'Wyjmij stos z tacy. Nie tasuj go i nie obracaj. Wyprostuj kartki (drukarka laserowa je wygina) i włóż z powrotem do podajnika w tej samej orientacji, w jakiej wyszły, najlepiej na kilku czystych kartkach. Dosuń prowadnice.',
      `Wydrukuj plik „${back}” jednostronnie.`,
    ],
    manualCheck:
      'Sprawdź pierwszą kartkę: pod stroną 1 ma być strona 2, w tej samej orientacji. Jeśli tyły trafiły na złe kartki albo są do góry nogami, zrób wydruk próbny albo zmień ustawienia w kroku',
  },

  assembly: {
    title: 'Składanie',
    lead: 'Linia ciągła to cięcie, przerywana to zgięcie. Krzyżyki na przecięciach linii cięcia zostają po pierwszym cięciu, więc kolejność cięć jest dowolna.',
    cutTitle: 'Cięcie',
    cutHalf: 'Przetnij cały stos na pół, wzdłuż linii między górną a dolną rozkładówką.',
    stackHalves:
      'Połóż stos dolnych połówek pod stosem górnych. Od góry leżą teraz kolejne kartki składki.',
    trimSides:
      'Przytnij lewy i prawy bok wzdłuż znaczników. Góry i dołu nie przycinasz: krawędź kartki jest krawędzią notesu.',
    trimAll: 'Przytnij boki oraz pasy u góry i u dołu wzdłuż znaczników.',
    cutHow: 'Tnij nożykiem po metalowej linijce, po kilka kartek naraz, albo gilotyną.',
    foldTitle: 'Składanie',
    fold: [
      'Złóż każdą kartkę na pół wzdłuż linii przerywanej, zadrukiem na zewnątrz.',
      'Wkładaj kartki jedna w drugą w kolejności ze stosu: kartka ze stroną 1 jest na zewnątrz. Sprawdź numery stron: powinny iść po kolei.',
      'Dociśnij grzbiet, np. przykrywając go książką na kilka minut.',
    ],
    sewTitle: 'Zszywanie',
    sew: [
      'Otwórz składkę na środku i przekłuj trzy dziurki w zgięciu: na środku i po ok. 2 cm od góry i dołu (przy wyższym notesie pięć, równo rozłożonych).',
      'Przeszyj: od środka przez środkową dziurkę na zewnątrz, z powrotem przez górną, na zewnątrz przez dolną i do środka przez środkową. Zawiąż oba końce nad nitką biegnącą wzdłuż grzbietu.',
      'Albo: dwie zszywki zszywaczem z długim ramieniem, od zewnątrz grzbietu.',
    ],
    stitchAlt:
      'Grzbiet składki z trzema dziurkami: igła wychodzi środkową, wraca górną, wychodzi dolną i kończy w środkowej.',
    stitchCaption:
      'Liczby to kolejne wkłucia igły. Linia ciągła: nić na zewnątrz grzbietu, przerywana: wewnątrz składki.',
    doneTitle: 'Gotowe',
    done: 'Wsuń wkład pod gumkę w okładce. Projekt możesz zachować na później: link z kroku Projekt (przycisk „Kopiuj link”) otwiera ten sam notes.',
  },

  panel: {
    settings: 'Ustawienia',
    tabsLabel: 'Ustawienia notesu',
    tabs: { format: 'Format', paper: 'Papier', pages: 'Strony', style: 'Wygląd' },
  },

  format: {
    titleGroup: 'Tytuł',
    titleLabel: 'Na stronie tytułowej i okładce podglądu',
    titlePlaceholder: 'Bez tytułu',
    defaultTitle: 'Notes podróżny',
    group: 'Format',
    custom: 'Własny',
    width: 'Szerokość',
    height: 'Wysokość',
    noFit: (w: string, h: string, paper: string, pw: number, ph: number) =>
      `Rozkładówka ${w} × ${h} nie zmieści się na kartce ${paper} (${pw} × ${ph} mm). Podgląd działa, ale tego formatu nie da się wydrukować.`,
    lang: 'Język notesu',
    langNote: 'Nazwy miesięcy, dni i nagłówki na stronach',
    year: 'Rok kalendarza',
    yearLabel: 'Kalendarz, tygodnie i daty zaczynają się w tym roku',
    weekStart: 'Tydzień zaczyna się w',
    monday: 'poniedziałek',
    sunday: 'niedzielę',
    margins: 'Marginesy',
    marginLabels: {
      top: 'Górny',
      bottom: 'Dolny',
      inner: 'Przy grzbiecie',
      outer: 'Zewnętrzny',
    } satisfies Record<MarginSide, string>,
    fixes: (u: string, number: boolean, marks: boolean) => {
      const why = [number && 'numer strony', marks && 'znaczniki cięcia przy krawędzi kartki']
        .filter(Boolean)
        .join(' i ');
      return `Drukarka nie zadrukuje ${u} od krawędzi kartki${why ? `, a nad tym pasem muszą się zmieścić ${why}` : ''}. W podglądzie i w PDF-ie:`;
    },
    fix: (side: string, to: string, from: string) => `${side.toLowerCase()} ${to} zamiast ${from}`,
    changePrinter: 'Zmień margines drukarki',
  },

  volume: {
    title: 'Objętość',
    count: 'Liczba stron',
    custom: 'Własna (wielokrotność 4)',
    leaves: (n: number) => `Kartek w składce: ${n}`,
    sheets: (paper: string, n: number) => `Arkuszy ${paper}: ${n}`,
    stacked: ' (dwie składki na arkuszu)',
    thick: (max: number) =>
      `Ponad ${max} kartek w jednej składce: zszywka słabo trzyma, a zewnętrzne kartki wystają po złożeniu. Rozważ dwa cieńsze zeszyty.`,
    contentOver: (pages: string) => `Sekcje zajmują ${pages}, więcej niż wybrana objętość.`,
    used: 'Zajęte strony',
    over: (by: string, content: number, target: number) =>
      `Za dużo o ${by}: sekcje zajmują ${content} z ${target}. Wyłącz albo skróć którąś sekcję, albo zwiększ objętość.`,
    grow: (n: number) => `Zwiększ do ${n} stron`,
    filling: (pages: string) => `Notatki wypełniają resztę: ${pages}.`,
    left: (pages: string) => `Zostaje ${pages}: na końcu dojdą strony z siatką.`,
    exact: 'Treść wypełnia notes co do strony.',
  },

  paper: {
    pattern: 'Wzór strony',
    grids: {
      dots: 'Kropki',
      lines: 'Linie',
      squares: 'Kratka',
      blank: 'Czysta',
      isometric: 'Izometryczna',
      hex: 'Heksagony',
      staff: 'Pięciolinia',
      graph: 'Milimetrowa',
      'margin-lines': 'Z marginesem',
      calligraphy: 'Kaligrafia',
      seyes: 'Seyès',
      tab: 'Tabulatura',
      storyboard: 'Storyboard',
      split: 'Pół na pół',
    } satisfies Record<GridKind, string>,
    sizeColor: 'Rozmiar i kolor',
    spacing: 'Odstęp',
    spacingLabels: {
      hex: 'Bok heksagonu',
      staff: 'Odstęp pięciolinii',
      tab: 'Odstęp tabulatury',
      graph: 'Kratka główna',
      calligraphy: 'Wysokość litery x',
      seyes: 'Odstęp grubych linii',
      storyboard: 'Odstęp linii opisu',
    } as Partial<Record<GridKind, string>>,
    dot: 'Średnica kropki',
    line: 'Grubość linii',
    laserNote:
      'Na drukarce laserowej jasne, drobne kropki potrafią zniknąć. Grafit i średnica od 0,5 mm drukują się pewnie.',
    colors: 'Kolory',
    themes: 'Zestawy',
    themesLabel: 'Zestawy kolorów',
    patternColor: 'Wzór',
    patternColorText: 'Kropki i linie siatki',
    accent: 'Akcent',
    accentUsed: 'Margines, grube linie milimetrowej, linia bazowa kaligrafii, ramki kadrów',
    accentUnused: 'Widać go w siatkach: milimetrowa, z marginesem, kaligrafia, Seyès, storyboard',
    ink: 'Linie na stronach sekcji',
    inkText: 'Tabele, kalendarze i kwadraciki; tekst zostaje czarny',
    tooLight: 'Za jasny na laser: cienkie linie i drobne kropki mogą zniknąć w druku.',
    colorNote: 'Kolory inne niż szarości drukuj w kolorze.',
    palette: {
      black: 'Czerń',
      graphite: 'Grafit',
      grey: 'Jasnoszary',
      blue: 'Niebieski',
      cyan: 'Cyjan',
      navy: 'Granat',
      violet: 'Fiolet',
      red: 'Czerwony',
      magenta: 'Magenta',
      orange: 'Pomarańczowy',
      green: 'Zielony',
      sage: 'Szałwia',
      sepia: 'Sepia',
      brown: 'Brąz',
    } as Record<string, string>,
    paletteThemes: {
      graphite: 'Grafit',
      seyes: 'Szkolny Seyès',
      'blue-red': 'Niebieski + czerwony',
      graph: 'Milimetrowy',
      sepia: 'Sepia',
      sage: 'Szałwia',
    } as Record<string, string>,
    custom: 'Własny',
    customColor: 'Własny kolor',
  },

  style: {
    font: 'Czcionka',
    fontNotes: {
      'Special Elite': 'maszyna do pisania',
      'Courier Prime': 'maszynowa, czytelna',
      'Cutive Mono': 'maszynowa, lekka',
      'Libertinus Serif': 'szeryfowa, książkowa',
      'New Computer Modern': 'klasyczna, LaTeX',
    } as Record<string, string>,
    fontSize: 'Rozmiar tekstu',
    numbering: 'Numeracja stron',
    numberPages: 'Numeruj strony',
    numberPagesText: 'Strona tytułowa zostaje bez numeru',
    position: 'Położenie',
    outer: 'Zewnętrzny róg',
    center: 'Środek',
    numberSize: 'Rozmiar numeru',
    cover: 'Okładka',
    coverColor: 'Kolor skóry w podglądzie (nie trafia do PDF)',
    coverColors: {
      brown: 'Brąz',
      black: 'Czerń',
      camel: 'Camel',
      olive: 'Oliwka',
      navy: 'Granat',
      burgundy: 'Bordo',
    } as Record<string, string>,
  },

  pagesTab: {
    order: 'Kolejność w notesie',
    dragHint: 'przeciągnij za uchwyt',
    empty: 'Włącz sekcje poniżej, żeby ułożyć notes.',
    move: (label: string) => `Przestaw: ${label} (strzałki w górę i w dół)`,
    count: (on: number, all: number) => `${on} z ${all}`,
    categories: {
      basics: 'Podstawy',
      calendar: 'Kalendarz',
      trackers: 'Trackery',
      lists: 'Listy',
      work: 'Praca i nauka',
      hobby: 'Podróże i dom',
    } as Record<string, string>,
  },

  sections: {
    title: {
      label: 'Strona tytułowa',
      description: 'Tytuł i dane właściciela na wypadek zgubienia',
    },
    index: { label: 'Indeks', description: 'Spis treści: temat i numer strony' },
    year: { label: 'Kalendarz roczny', description: '12 miesięcy na jednej stronie' },
    'future-log': { label: 'Future log', description: 'Pół roku planów na rozkładówce' },
    months: { label: 'Kalendarz miesięczny', description: 'Siatka tygodni z numerami ISO' },
    weeks: { label: 'Tygodnie', description: 'Tydzień na rozkładówce, dzień w ramce' },
    daily: { label: 'Strony dzienne', description: 'Data, trzy priorytety i miejsce na notatki' },
    birthdays: {
      label: 'Kalendarz urodzin',
      description: 'Wieczny: miesiące bez dni tygodnia, na każdy rok',
    },
    habits: { label: 'Tracker nawyków', description: 'Dni miesiąca × nawyki do odhaczania' },
    pixels: { label: 'Rok w pikselach', description: 'Kratka na każdy dzień roku do zamalowania' },
    'one-line': {
      label: 'Jedna linijka dziennie',
      description: 'Ten sam dzień przez kilka lat, linijka na rok',
    },
    workout: { label: 'Dziennik treningów', description: 'Ćwiczenia, serie, powtórzenia, ciężar' },
    budget: { label: 'Wydatki', description: 'Tabela wydatków i podsumowanie miesiąca' },
    todo: { label: 'Lista zadań', description: 'Kwadraciki do odhaczania' },
    packing: { label: 'Lista pakowania', description: 'Grupy rzeczy z kwadracikami' },
    shopping: { label: 'Lista zakupów', description: 'Działy sklepu, kwadraciki i ilość' },
    reading: { label: 'Książki', description: 'Tytuł, autor i ocena w kółkach' },
    watchlist: { label: 'Filmy i seriale', description: 'Do obejrzenia: tytuł, rok, ocena' },
    contacts: { label: 'Kontakty', description: 'Imię, telefon, e-mail, adres' },
    cornell: { label: 'Notatki Cornella', description: 'Hasła, notatki i podsumowanie' },
    meeting: { label: 'Notatki ze spotkań', description: 'Temat, uczestnicy, notatki i zadania' },
    project: { label: 'Projekt', description: 'Cel, termin, kroki i notatki' },
    travel: { label: 'Dziennik podróży', description: 'Miejsce, pogoda, trasa i ramka na bilet' },
    tasting: { label: 'Degustacje', description: 'Kawa, wino, herbata, piwo: smaki i ocena' },
    meals: { label: 'Plan posiłków', description: 'Tydzień posiłków i lista zakupów' },
    notes: { label: 'Strony na notatki', description: 'Czyste strony z wybraną siatką' },
  } satisfies Record<SectionType, { label: string; description: string }>,

  options: {
    pages: 'Liczba stron',
    fromMonth: 'Od miesiąca',
    months: 'Ile miesięcy',
    pattern: 'Wzór',
    patternAuto: 'Jak w zakładce Papier',
    notesPattern: 'Wzór notatek',
    owner: 'Dane właściciela',
    ownerText: 'Imię, kontakt i prośba o zwrot',
    year: (y: number) => `Rok ${y}. Zmienisz go w zakładce Format.`,
    habitColumns: 'Kolumn na nawyki',
    fromWeek: 'Od tygodnia',
    weeks: 'Ile tygodni',
    fromDay: 'Od dnia',
    days: 'Ile dni',
    fill: 'Wypełnij resztę notesu',
    fillText: (pages: string) => `Tyle stron, ile zostanie z objętości: teraz ${pages}`,
    monthsPerPage: 'Miesięcy na stronie',
    dayColumn: 'Kolumna na dzień',
    dayColumnText: 'Wąska kolumna z datą przed każdą linią',
    tracking: 'Co śledzisz',
    legend: 'Kolorów w legendzie',
    years: 'Ile lat',
    daysPerPage: 'Dni na stronie',
    workoutKind: 'Rodzaj treningu',
    groups: 'Grupy',
    columns: 'Kolumny',
    split: 'Podział',
    departments: 'Działy',
    storeCount: 'Ile sklepów',
    storeEmpty: 'Puste pole: nazwę wpiszesz ręcznie w notesie',
    store: (i: number) => `Sklep ${i}`,
    qty: 'Ilość',
    qtyText: 'Kolumna „ile” przy każdej pozycji',
    watching: 'Co oglądasz',
    contactFields: 'Rubryki (oprócz imienia)',
    actions: 'Wierszy na zadania',
    steps: 'Liczba kroków',
    kind: 'Rodzaj',
    perPage: 'Wpisów na stronie',
    wheel: 'Wykres smaków',
    wheelText: 'Pajęczyna do zaznaczenia intensywności smaków',
    mealsPerDay: 'Posiłków dziennie',
    shopping: 'Lista zakupów',
    shoppingText: 'Pod planem, w dwóch kolumnach',
    pixelThemes: {
      mood: 'Nastrój',
      weather: 'Pogoda',
      sleep: 'Sen',
      energy: 'Energia',
      activity: 'Ruch',
    } satisfies Record<PixelTheme, string>,
    packingGroups: {
      clothes: 'Ubrania',
      documents: 'Dokumenty i pieniądze',
      electronics: 'Elektronika',
      toiletries: 'Kosmetyki',
      health: 'Apteczka',
      outdoor: 'Sprzęt i outdoor',
      food: 'Jedzenie na drogę',
      other: 'Inne',
    } satisfies Record<PackingGroup, string>,
    shoppingGroups: {
      produce: 'Warzywa i owoce',
      bakery: 'Pieczywo',
      dairy: 'Nabiał',
      meat: 'Mięso i ryby',
      pantry: 'Spiżarnia',
      frozen: 'Mrożonki',
      drinks: 'Napoje',
      household: 'Chemia i dom',
      cosmetics: 'Kosmetyki',
      other: 'Inne',
    } satisfies Record<ShoppingGroup, string>,
    shoppingSplits: { departments: 'Działy', stores: 'Sklepy' } satisfies Record<
      ShoppingSplit,
      string
    >,
    workoutKinds: { strength: 'Siłowy', cardio: 'Wytrzymałościowy' } satisfies Record<
      WorkoutKind,
      string
    >,
    contactFieldNames: {
      phone: 'Telefon',
      email: 'E-mail',
      address: 'Adres',
      birthday: 'Urodziny',
    } satisfies Record<ContactField, string>,
    tastingKinds: { coffee: 'Kawa', wine: 'Wino', tea: 'Herbata', beer: 'Piwo' } satisfies Record<
      TastingKind,
      string
    >,
    watchKinds: {
      movies: 'Filmy',
      series: 'Seriale',
      games: 'Gry',
      podcasts: 'Podcasty',
    } satisfies Record<WatchKind, string>,
  },

  preview: {
    loading: 'Rozkładam biurko…',
    loadingBytes: (loaded: string, total: string) =>
      `Silnik składu: ${loaded} z ${total} MB (pobiera się raz)`,
    engineError: 'Silnik składu się nie uruchomił',
    reload: 'Odśwież stronę',
    over: (by: string, volume: number) => `za dużo o ${by} (objętość ${volume})`,
    compiling: 'składam…',
    jump: 'Przejdź do sekcji',
    prev: 'Poprzednia rozkładówka',
    next: 'Następna rozkładówka',
    thumbs: 'Miniatury rozkładówek',
    compileError: (e: string) =>
      `Tej wersji nie da się złożyć: ${e}. Podgląd pokazuje ostatnią poprawną.`,
    cover: 'Okładka',
    page: (n: number) => `Strona ${n}`,
    spread: (a: number, b: number) => `Strony ${a}–${b}`,
  },

  months: [
    'styczeń',
    'luty',
    'marzec',
    'kwiecień',
    'maj',
    'czerwiec',
    'lipiec',
    'sierpień',
    'wrzesień',
    'październik',
    'listopad',
    'grudzień',
  ],
};

export type Messages = typeof pl;
