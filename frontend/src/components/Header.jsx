import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Header() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <img
              src="/LOGO PNG.png"
              alt="Kataloff Islamic Finance"
              className="h-8 lg:h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-lg font-medium transition-colors duration-200 hover:text-[#2d9f8a] ${location.pathname === '/' ? 'text-[#2d9f8a] border-b-2 border-[#2d9f8a] pb-1' : 'text-gray-700'
                }`}
            >
              Главная
            </Link>
            <Link
              to="/calculator"
              className={`text-lg font-medium transition-colors duration-200 hover:text-[#2d9f8a] ${location.pathname === '/calculator' ? 'text-[#2d9f8a] border-b-2 border-[#2d9f8a] pb-1' : 'text-gray-700'
                }`}
            >
              Калькулятор
            </Link>
            <Link
              to="/check"
              className={`text-lg font-medium transition-colors duration-200 hover:text-[#2d9f8a] ${location.pathname === '/check' ? 'text-[#2d9f8a] border-b-2 border-[#2d9f8a] pb-1' : 'text-gray-700'
                }`}
            >
              Мои рассрочки
            </Link>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/calculator"
              className="bg-gradient-to-r from-[#043c6f] to-[#5bc5a7] text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Рассчитать рассрочку
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-[#2d9f8a] hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden bg-white border-t border-gray-200 shadow-lg transition-all duration-350 ease-in-out transform ${
        isMobileMenuOpen 
          ? 'max-h-96 opacity-100 translate-y-0' 
          : 'max-h-0 opacity-0 -translate-y-2 overflow-hidden'
      }`}>
        <div className={`px-4 py-6 space-y-4 transition-all duration-350 ease-in-out transform ${
          isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}>
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block text-lg font-medium py-2 text-center transition-colors ${
              location.pathname === "/" ? "text-[#2d9f8a]" : "text-gray-700"
            }`}
          >
            Главная
          </Link>

          <Link
            to="/calculator"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block text-lg font-medium py-2 text-center transition-colors ${
              location.pathname === "/calculator" ? "text-[#2d9f8a]" : "text-gray-700"
            }`}
          >
            Калькулятор
          </Link>

          <Link
            to="/check"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block text-lg font-medium py-2 text-center transition-colors ${
              location.pathname === "/check" ? "text-[#2d9f8a]" : "text-gray-700"
            }`}
          >
            Мои рассрочки
          </Link>

          <div className="pt-4 border-t border-gray-200">
            <Link
              to="/calculator"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full bg-gradient-to-r from-[#043c6f] to-[#5bc5a7] text-white px-6 py-3 rounded-full font-semibold text-center"
            >
              Рассчитать рассрочку
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}