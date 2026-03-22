import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import SideMenu from './SideMenu';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from './Logo';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    
    // Force light mode as requested (removing dark mode toggle)
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 mx-auto max-w-[480px] z-50 transition-all duration-500 h-[72px] flex items-center
        ${isScrolled ? 'bg-white/80 backdrop-blur-xl border-b border-gold/20 shadow-lg' : 'bg-transparent'}`}>
        
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Left Side: Menu (RTL: Left edge) */}
          <div className="flex-1 flex items-center justify-start gap-2 order-1">
            <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-xl transition-all hover:bg-gold/10 group text-brand">
              <Menu size={24} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Center: Logo */}
          <a href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({top:0, behavior:'smooth'}); }} className="flex-shrink-0 flex items-center justify-center order-2 transition-transform hover:scale-105 active:scale-95 mx-2">
            <Logo className="w-[130px] h-auto" variant="default" />
          </a>

          {/* Right Side: Spacer/Balance */}
          <div className="flex-1 flex items-center justify-end order-3">
            {/* Balanced spacer */}
          </div>
        </div>
      </header>

      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};

export default Header;
