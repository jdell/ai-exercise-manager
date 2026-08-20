import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LocaleProvider } from './context/LocaleContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    {/*
      Language and theme wrap everything, including the sign-in screens — a
      student who cannot read the app cannot get far enough to change a setting
      inside it, and a dark-mode reader should not be flashed a white sign-in
      page on the way in. The theme attribute itself is set before this file
      loads, by the inline script in index.html.
    */}
    <ThemeProvider>
      <LocaleProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>,
);
