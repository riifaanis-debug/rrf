
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Calculator from './components/Calculator';
import Performance from './components/Performance';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import WaiveServices from './components/WaiveServices';
import Services from './components/Services';
import BackToTop from './components/BackToTop';
import { Section, SectionHeader, Card, Button, StripContainer } from './components/Shared';
import { Check, Scale, MessageCircle, Lock, Monitor, FileText, Bell, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from './contexts/LanguageContext';
import { FirebaseProvider } from './contexts/FirebaseContext';
import { ErrorBoundary } from './components/Shared';
import { Terms, Privacy, Complaints, Contact, AboutPage, GoalPage, VisionPage, MessagePage, MissionPage, ServicesPage, AcceptableUse, IntellectualProperty } from './components/StaticPages';
import { ServiceDetailPage } from './components/ServiceDetailPage';
import WaiveRequestForm from './components/WaiveRequestForm';
import ClientCard from './components/ClientCard';
import ContractPage from './components/ContractPage';

// Sub-components for long text sections
const StorySection = () => {
  const { t, direction } = useLanguage();
  return (
    <Section id="story">
      <Card className="bg-story-gradient dark:bg-none dark:bg-[#1a0520] border-gold/90 shadow-xl">
        <h2 className={`text-xl font-bold text-brand dark:text-gold mb-2 ${direction === 'rtl' ? 'text-right' : 'text-left'} transition-colors tracking-tight`}>{t('story_title')}</h2>
        <div className={`space-y-3 text-sm leading-relaxed text-muted dark:text-gray-300 ${direction === 'rtl' ? 'text-right' : 'text-left'} transition-colors`}>
          <p>{t('story_p1')}</p>
          <p>{t('story_p2')}</p>
          <p>{t('story_p3')}</p>
        </div>
      </Card>
    </Section>
  );
};

const WhySection = () => {
  const { t } = useLanguage();
  return (
    <Section id="why-rv">
      <Card>
        <SectionHeader 
          eyebrow={t('why_eyebrow')} 
          title={t('why_title')} 
          subtitle={t('why_subtitle')}
        />
        <div className="grid grid-cols-1 gap-2.5">
          {[
            { icon: <Check size={14} />, title: t('why_1_title'), text: t('why_1_text') },
            { icon: <Scale size={14} />, title: t('why_2_title'), text: t('why_2_text') },
            { icon: <MessageCircle size={14} />, title: t('why_3_title'), text: t('why_3_text') },
            { icon: <Lock size={14} />, title: t('why_4_title'), text: t('why_4_text') }
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-white to-[#F6F0E4] border border-gold/70 flex items-center justify-center text-gold shrink-0">
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-bold text-brand dark:text-gray-100 mb-0.5 transition-colors">{item.title}</div>
                <div className="text-xs text-muted dark:text-gray-400 transition-colors">{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
};

const AudienceSection = () => {
  const { t, direction } = useLanguage();
  const audienceItems = [
    { tag: t('aud_1_tag'), title: t('aud_1_title'), text: t('aud_1_text') },
    { tag: t('aud_2_tag'), title: t('aud_2_title'), text: t('aud_2_text') },
    { tag: t('aud_3_tag'), title: t('aud_3_title'), text: t('aud_3_text') },
  ];

  const [isPaused, setIsPaused] = useState(false);

  return (
    <Section id="audience">
      <Card className="overflow-hidden">
        <SectionHeader 
          eyebrow={t('aud_eyebrow')} 
          title={t('aud_title')} 
          subtitle={t('aud_subtitle')}
        />
        <div 
          className="relative w-full overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <motion.div 
            className="flex gap-4 will-change-transform"
            animate={isPaused ? {} : {
              x: direction === 'rtl' ? ["50%", "0%"] : ["0%", "-50%"],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 25,
                ease: "linear",
              },
            }}
            style={{ width: 'max-content' }}
          >
            {/* Duplicate items for seamless loop */}
            {[...audienceItems, ...audienceItems].map((item, i) => (
              <div key={i} className="min-w-[210px] max-w-[210px] bg-white dark:bg-[#12031a] rounded-[18px] border border-gold/70 dark:border-white/10 p-3 shadow-sm transition-colors">
                <div className="text-[11px] text-gold mb-1">{item.tag}</div>
                <div className="text-[13px] font-extrabold text-brand dark:text-gray-100 mb-1 transition-colors">{item.title}</div>
                <div className="text-[12px] text-muted dark:text-gray-400 transition-colors">{item.text}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </Card>
    </Section>
  );
};

const CTASection = () => {
  const { t } = useLanguage();
  return (
    <Section id="cta-block">
      <Card className="bg-gradient-to-br from-[#FFFDF5] to-[#F6ECD4] dark:from-[#1a0b25] dark:to-[#0f0216] border-gold/90 shadow-xl">
        <div className="flex flex-col gap-2.5">
          <div>
            <div className="text-[14px] font-extrabold text-brand dark:text-gold transition-colors">{t('cta_title')}</div>
            <div className="text-[12px] text-muted dark:text-gray-300 mt-1 transition-colors">{t('cta_text')}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="https://wa.me/966125911227" target="_blank" rel="noopener noreferrer">
              <Button>{t('cta_whatsapp')}</Button>
            </a>
            <a href="#/services" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost">{t('cta_all_services')}</Button>
            </a>
          </div>
        </div>
      </Card>
    </Section>
  );
};

const PlatformSection = () => {
  const { t } = useLanguage();
  return (
    <Section id="platform">
      <Card>
        <SectionHeader 
          eyebrow={t('plat_eyebrow')} 
          title={t('plat_title')} 
          subtitle={t('plat_subtitle')}
        />
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: <FileText size={16} />, title: t('plat_1_title'), text: t('plat_1_text') },
            { icon: <Monitor size={16} />, title: t('plat_2_title'), text: t('plat_2_text') },
            { icon: <Bell size={16} />, title: t('plat_3_title'), text: t('plat_3_text') },
          ].map((item, i) => (
            <div key={i} className="rounded-[14px] bg-white dark:bg-[#12031a] border border-gold/50 dark:border-white/10 p-2.5 flex items-start gap-2 transition-colors">
              <div className="text-gold pt-0.5">{item.icon}</div>
              <div>
                <div className="text-[13px] font-extrabold text-brand dark:text-gray-100 mb-0.5 transition-colors">{item.title}</div>
                <div className="text-[12px] text-muted dark:text-gray-400 transition-colors">{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
};

const TimelineSection = () => {
  const { t, direction } = useLanguage();
  return (
    <Section id="timeline">
      <Card>
        <SectionHeader eyebrow={t('time_eyebrow')} title={t('time_title')} />
        <div className={`relative flex flex-col gap-2 ${direction === 'rtl' ? 'pr-2' : 'pl-2'}`}>
          {/* Vertical Line */}
          <div className={`absolute top-1 ${direction === 'rtl' ? 'right-[11px]' : 'left-[11px]'} w-[2px] h-full bg-gold/50`} />
          
          {[
            { title: t('time_1_title'), text: t('time_1_text') },
            { title: t('time_2_title'), text: t('time_2_text') },
            { title: t('time_3_title'), text: t('time_3_text') },
            { title: t('time_4_title'), text: t('time_4_text') },
          ].map((item, i) => (
            <div key={i} className={`relative ${direction === 'rtl' ? 'pr-6' : 'pl-6'}`}>
              <div className={`w-[10px] h-[10px] rounded-full bg-gold absolute ${direction === 'rtl' ? 'right-[7px]' : 'left-[7px]'} top-[5px] shadow-[0_0_0_4px_rgba(199,169,105,0.25)] z-10`} />
              <div className="text-[13px] font-extrabold text-brand dark:text-gray-100 mb-0.5 transition-colors">{item.title}</div>
              <div className="text-[12px] text-muted dark:text-gray-400 transition-colors">{item.text}</div>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
};

const LandingPage: React.FC = () => (
  <>
    <Header />
    <Hero />
    <div className="relative mt-10 z-10">
      <About />
      <StorySection />
      <WhySection />
      <Services />
      <Performance />
      <Calculator />
      <AudienceSection />
      <WaiveServices />
      <FAQ />
      <CTASection />
      <TimelineSection />
      <div className="h-12" />
      <Footer />
    </div>
  </>
);

const WaiveLandingPage: React.FC = () => (
  <>
    <Header />
    <Hero />
    <div className="relative mt-10 z-10">
      <About />
      <StorySection />
      <WhySection />
      <Services />
      <Performance />
      <WaiveServices />
      <FAQ />
      <TimelineSection />
      <div className="h-12" />
      <Footer />
    </div>
  </>
);


const AppContent: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash);
  const [waivePrefill, setWaivePrefill] = useState<any>(null);
  const [showWaiveForm, setShowWaiveForm] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handleOpenWaiveForm = (e: any) => {
      setWaivePrefill(e.detail);
      setShowWaiveForm(true);
    };
    window.addEventListener('open-waive-form', handleOpenWaiveForm);
    return () => {
      window.removeEventListener('open-waive-form', handleOpenWaiveForm);
    };
  }, []);

  const getComponent = () => {
    if (route.startsWith('#/service/')) {
      const fullType = route.replace('#/service/', '');
      const [type, subType] = fullType.split('/');
      return <ServiceDetailPage type={type} subType={subType} />;
    }

    if (route.startsWith('#/contract')) {
      return <ContractPage />;
    }

    switch(route) {
      case '#/services': return <ServicesPage />;
      case '#/terms': return <Terms />;
      case '#/privacy': return <Privacy />;
      case '#/complaints': return <Complaints />;
      case '#/contact': return <Contact />;
      case '#/about': return <AboutPage />;
      case '#/goal': return <GoalPage />;
      case '#/vision': return <VisionPage />;
      case '#/message': return <MessagePage />;
      case '#/mission': return <MissionPage />;
      case '#/acceptable-use': return <AcceptableUse />;
      case '#/intellectual-property': return <IntellectualProperty />;
      case '#/waive-landing': return <WaiveLandingPage />;
      case '#/client-card': return <ClientCard />;
      default: return <LandingPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black/90 flex justify-center">
      <main className="w-full max-w-[480px] overflow-x-hidden min-h-screen bg-page dark:bg-[#06010a] transition-colors duration-300 shadow-2xl border-x border-gold/10 relative">
        {getComponent()}
        {showWaiveForm && (
          <WaiveRequestForm 
            prefill={waivePrefill} 
            onClose={() => {
              setShowWaiveForm(false);
              setWaivePrefill(null);
            }} 
          />
        )}
      </main>

      {/* Floating Elements constrained to mobile width */}
      <div className="fixed inset-0 pointer-events-none z-[100] mx-auto max-w-[480px] w-full">
        <div className="relative h-full w-full">
          <div className="pointer-events-auto">
            <BackToTop />
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <AppContent />
      </FirebaseProvider>
    </ErrorBoundary>
  );
};

export default App;
