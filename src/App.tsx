import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './components/Home';
import Checkout from './components/Checkout';
import Login from './components/Login';
import Conta from './components/Conta';
import TermsOfUse from './components/TermsOfUse';
import PrivacyPolicy from './components/PrivacyPolicy';
import GoogleConnected from './components/GoogleConnected';
import AITransparency from './components/AITransparency';

export default function App() {
  const { pathname } = useLocation();

  // Força abrir no topo a cada troca de rota (e limpa qualquer lock de rolagem)
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    document.body.classList.remove('lock-scroll'); // caso alguma tela anterior tenha travado o scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const id = setTimeout(() => window.scrollTo(0, 0), 0); // iOS precisa desse tick
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/login" element={<Login />} />
      <Route path="/conta" element={<Conta />} />
      <Route path="/termos-de-uso" element={<TermsOfUse />} />
      <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
      <Route path="/transparencia-ia" element={<AITransparency />} />
      <Route path="/google/conectado" element={<GoogleConnected />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
