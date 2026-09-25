import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FireflyPage } from './FireflyPage';

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

createRoot(container).render(
  <StrictMode>
    <FireflyPage />
  </StrictMode>,
);
