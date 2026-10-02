import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// the interface font is self-hosted, not from Google Fonts: the website sends nothing to third parties
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/400-italic.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
