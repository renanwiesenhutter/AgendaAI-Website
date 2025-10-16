import { useState } from "react";
import { ChevronDown, Calendar, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { SiWhatsapp, SiInstagram } from "react-icons/si";

export default function CentralAjuda() {
  const [open, setOpen] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const faqs = [
    { q: "Como funciona o Agenda AI?", a: "O Agenda AI organiza seus compromissos via WhatsApp usando IA..." },
    { q: "Preciso instalar aplicativo?", a: "Não. Funciona direto no WhatsApp que você já usa." },
    { q: "Posso adicionar lembretes recorrentes?", a: "Sim! Ex.: “Me lembre de tomar meu remédio todos os dias às 20h”." },
    { q: "Como integro com o Google Calendar?", a: "Ao ativar sua conta você recebe um link para conectar ao Google Calendar." },
    { q: "Como funciona o cancelamento?", a: "Entre na sua conta pelo site e cancele quando quiser. Se mudar de ideia, é só assinar novamente." },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - Fixed */}
      <header className="bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] border-b border-gray-100 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            {/* Logo */}
            <Link
              to="/home"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Agenda AI</span>
            </Link>
      
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <nav className="flex space-x-6">
                <Link
                  to={{ pathname: "/home", hash: "#como-funciona" }}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Como Funciona
                </Link>
                <Link
                  to={{ pathname: "/home", hash: "#depoimentos" }}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Avaliações
                </Link>
                <Link
                  to={{ pathname: "/home", hash: "#precos" }}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Planos
                </Link>
              </nav>
              <a
                href="https://billing.stripe.com/p/login/dRm4gy9hC2DGd8cgVA5ZC00"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Minha Conta
              </a>
            </div>
      
            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center space-x-1">
              <a
                href="https://billing.stripe.com/p/login/dRm4gy9hC2DGd8cgVA5ZC00"
                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Login
              </a>
              <button
                onClick={toggleMobileMenu}
                className="text-gray-600 hover:text-gray-900 transition-colors p-2"
              >
                <Menu className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
      
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-2 space-y-1">
              <Link
                to={{ pathname: "/home", hash: "#como-funciona" }}
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                onClick={closeMobileMenu}
              >
                Como Funciona
              </Link>
              <Link
                to={{ pathname: "/home", hash: "#depoimentos" }}
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                onClick={closeMobileMenu}
              >
                Avaliações
              </Link>
              <Link
                to={{ pathname: "/home", hash: "#precos" }}
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                onClick={closeMobileMenu}
              >
                Planos
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* CONTEÚDO */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-28">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Central de Ajuda</h1>
        <div className="space-y-4">
          {faqs.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 transition"
              >
                <span className="font-medium text-gray-900">{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-4 text-gray-700 leading-relaxed">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </main>

        {/* Footer Section */}
        <footer className="bg-white border-t border-gray-200 mt-20">
          <div className="max-w-7xl mx-auto px-8 sm:px-10 lg:px-12 py-12">
        
            {/* LINHA DO LOGO (Agenda AI + powered by Dalzzen) */}
            <div className="flex flex-col items-center mb-12 md:mb-16">
              {/* Agenda AI (igual header) */}
              <a
                href="/home"
                className="inline-flex flex-col items-center gap-1 group transition hover:opacity-90"
                aria-label="Agenda AI"
              >
                {/* Linha principal - Agenda AI */}
                <div className="inline-flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span
                    className="
                      text-2xl font-bold
                      text-transparent bg-clip-text
                      bg-gradient-to-r from-gray-900 to-gray-900
                      transition-all duration-200
                      group-hover:from-blue-600 group-hover:to-green-500
                      group-hover:opacity-80
                    "
                  >
                    Agenda AI
                  </span>
                </div>
              </a>
            
              {/* Powered by Dalzzen */}
              <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
                <span>Created by</span>
                <span className="flex items-baseline group cursor-default">
                  <span
                    style={{ fontFamily: '"Lily Script One", cursive' }}
                    className="text-gray-900 text-sm leading-none group-hover:text-[#6C63FF]"
                  >
                    D
                  </span>
                  <span
                    style={{ fontFamily: '"Lobster", cursive' }}
                    className="text-gray-900 text-sm leading-none group-hover:text-[#6C63FF]"
                  >
                    alzzen
                  </span>
                </span>
              </div>

              {/* Ícones sociais */}
              <div className="mt-3 flex items-center gap-4">
                {/* WhatsApp */}
                <a
                  href="https://wa.me/5545988251919"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="text-gray-900 hover:text-[#25D366] transition-colors duration-200"
                >
                  <SiWhatsapp className="w-5 h-5" />
                </a>
              
                {/* Instagram */}
                <a
                  href="https://instagram.com/agenda.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-gray-900 hover:text-[#E1306C] transition-colors duration-200"
                >
                  <SiInstagram className="w-5 h-5" />
                </a>
              </div>
            </div>
        
            {/* CATEGORIAS */}
            <div className="md:max-w-4xl md:mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
            
              {/* Idioma */}
              <div className="text-left">
                <h4 className="text-[#687280] text-xl font-semibold mb-3">Idioma</h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      to={{ pathname: "/home", hash: "#idioma" }}
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Português
                    </Link>
                  </li>
                </ul>
              </div>
            
              {/* Produto */}
              <div className="text-left">
                <h4 className="text-[#687280] text-xl font-semibold mb-3">Produto</h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      to="/central-de-ajuda"
                      onClick={() => window.location.href = "/central-de-ajuda"}
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Como usar
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/home", hash: "#precos" }}
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Assinar agora
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/home", hash: "#depoimentos" }}
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Avaliações
                    </Link>
                  </li>
                </ul>
              </div>
            
              {/* Termos */}
              <div className="text-left">
                <h4 className="text-[#687280] text-xl font-semibold mb-3">Termos</h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      to={{ pathname: "/home", hash: "#termos" }}
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Termos de uso
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/home", hash: "#privacidade" }}
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Política de privacidade
                    </Link>
                  </li>
                </ul>
              </div>
            
              {/* Suporte */}
              <div className="text-left">
                <h4 className="text-[#687280] text-xl font-semibold mb-3">Suporte</h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="https://wa.me/5545988251919?text=Ol%C3%A1%21%20Gostaria%20de%20ajuda%20com%20o%20Agenda.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      WhatsApp
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://instagram.com/agenda.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Instagram
                    </a>
                  </li>
                  <li>
                    <Link
                      to="/central-de-ajuda"
                      onClick={() => window.location.href = "/central-de-ajuda"}
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Central de ajuda
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        
          {/* Copyright */}
          <div className="border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
              <p className="py-6 text-center text-sm text-gray-500">
                Copyright © {new Date().getFullYear()} Dalzzen. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
    </div>
  );
}