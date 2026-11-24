import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { BrandingProvider } from './services/branding';
import { LicenseGate } from './components/LicenseGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrandingProvider>
    <LicenseGate>
      <App />
    </LicenseGate>
  </BrandingProvider>
);
