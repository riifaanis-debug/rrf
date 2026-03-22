import React from 'react';
import { ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t, direction } = useLanguage();

  return (
    <footer className="w-full mt-auto pt-16 pb-8 bg-[#FDFDFF] dark:bg-[#08020c] border-t border-gold/10 relative overflow-hidden">
      {/* Subtle Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      
      <div className="max-w-full mx-auto px-4 relative z-10">
        
        {/* Social Links - Refined */}
        <div className="flex justify-center items-center gap-5 mb-12">
            <SocialLink href="https://wa.me/966125911227" icon="https://img.icons8.com/ios-filled/50/C7A969/whatsapp--v1.png" label="WhatsApp" />
            <SocialLink href="https://x.com/rifaniis" icon="https://img.icons8.com/ios-filled/50/C7A969/twitter.png" label="Twitter" />
            <SocialLink href="https://www.snapchat.com/add/rifaniis" icon="https://img.icons8.com/ios-filled/50/C7A969/snapchat--v1.png" label="Snapchat" />
            <SocialLink href="https://www.instagram.com/rifaniis" icon="https://img.icons8.com/ios-filled/50/C7A969/instagram-new--v1.png" label="Instagram" />
            <SocialLink href="mailto:rifans.finance@gmail.com" icon="https://img.icons8.com/ios-filled/50/C7A969/gmail--v1.png" label="Email" />
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 gap-0 mb-16 relative" dir={direction}>
            <div className={`px-6 ${direction === 'rtl' ? 'text-right border-l border-gold/10' : 'text-left border-r border-gold/10'}`}>
                <h3 className={`text-[13px] font-black text-brand dark:text-white mb-5 flex items-center gap-2 justify-start`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span>{t('about_rifans')}</span>
                </h3>
                <ul className="space-y-4">
                    <li><FooterLink href="#/about">{t('who_we_are')}</FooterLink></li>
                    <li><FooterLink href="#/services">{t('services_guide')}</FooterLink></li>
                    <li><FooterLink href="#/complaints">{t('complaints_suggestions')}</FooterLink></li>
                    <li><FooterLink href="#/contact">{t('contact_us')}</FooterLink></li>
                </ul>
            </div>
            <div className={`px-6 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                <h3 className={`text-[13px] font-black text-brand dark:text-white mb-5 flex items-center gap-2 justify-start`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span>{t('important_links')}</span>
                </h3>
                <ul className="space-y-4">
                    <li><FooterLink href="#/terms">{t('terms_conditions')}</FooterLink></li>
                    <li><FooterLink href="#/privacy">{t('privacy_policy')}</FooterLink></li>
                    <li><FooterLink href="#/acceptable-use">{t('policy_acceptable_use')}</FooterLink></li>
                    <li><FooterLink href="#/intellectual-property">{t('policy_intellectual_property')}</FooterLink></li>
                </ul>
            </div>
        </div>

        {/* Trust & Licensing - More Elegant */}
        <div className="mb-16">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-gold/30 to-brand/30 rounded-[32px] blur-md opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white/80 dark:bg-[#12031a]/80 backdrop-blur-xl rounded-[28px] p-8 border border-gold/20 shadow-xl flex flex-col items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
                <Logo className="w-[200px] h-auto" />
                <div className="h-10 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
              </div>
              <div className="text-center">
                <h3 className="text-[14px] font-black text-brand dark:text-gold mb-1 uppercase tracking-wider">الموثوقية والترخيص الرقمي</h3>
                <p className="text-[10px] text-muted dark:text-gray-400 font-medium max-w-[280px] mx-auto leading-relaxed">
                  نعمل وفق ضوابط الشريعة الإسلامية وتحت إشراف الجهات الرقابية المختصة في المملكة العربية السعودية
                </p>
              </div>
              <div className="flex flex-col items-center gap-6">
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/16/Logo_Saudi_Arabian_Monetary_Authority.svg" alt="SAMA" className="h-14 opacity-80 dark:invert dark:brightness-200 grayscale hover:grayscale-0 transition-all" />
                <div className="flex flex-col items-center">
                  <ShieldCheck className="text-gold mb-1" size={24} />
                  <span className="text-[10px] font-bold text-muted">آمن وموثوق</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center pt-8 border-t border-gold/10">
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] text-brand/40 dark:text-gray-500 font-bold uppercase tracking-widest">
                © 2025 Rifans Financial. All Rights Reserved.
              </p>
              <p className="text-[11px] text-brand dark:text-gold font-black">
                جميع الحقوق محفوظة | ريفانس المالية
              </p>
            </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink: React.FC<{ href: string; icon: string; label: string }> = ({ href, icon, label }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-[38px] h-[38px] rounded-full bg-white dark:bg-white/10 border border-gold/30 flex items-center justify-center shadow-sm hover:scale-110 transition-all group">
    <img src={icon} alt={label} className="w-[20px] h-[20px] object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
  </a>
);

const FooterLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
    const { direction } = useLanguage();
    return (
        <a 
            href={href} 
            className={`text-xs font-medium text-muted hover:text-gold transition-colors block hover:${direction === 'rtl' ? '-translate-x-1' : 'translate-x-1'} duration-200`}
        >
            {children}
        </a>
    );
};

export default Footer;
