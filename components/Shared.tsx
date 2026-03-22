import React, { ReactNode } from 'react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false }) => {
  return (
    <div className={`rounded-[18px] border border-gold/45 shadow-[0_12px_30px_rgba(0,0,0,0.08)] bg-card-gradient dark:bg-none dark:bg-dark-card dark:border-white/10 overflow-hidden transition-colors duration-300 ${noPadding ? '' : 'p-4'} ${className}`}>
      {children}
    </div>
  );
};

interface SectionProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ id, children, className = '' }) => {
  return (
    <section id={id} className={`max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-6 sm:pt-10 scroll-mt-[90px] ${className}`}>
      {children}
    </section>
  );
};

interface SectionHeaderProps {
  eyebrow?: string;
  title?: string;
  subtitle?: ReactNode;
  align?: 'right' | 'center' | 'left';
  titleClassName?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ eyebrow, title, subtitle, align, titleClassName = '' }) => {
  const { direction } = useLanguage();
  
  // Determine alignment based on props or direction
  let textAlignClass = '';
  if (align) {
    if (align === 'center') textAlignClass = 'text-center';
    else if (align === 'right') textAlignClass = 'text-right';
    else textAlignClass = 'text-left';
  } else {
    // Default based on direction
    textAlignClass = direction === 'rtl' ? 'text-right' : 'text-left';
  }

  return (
    <div className={`mb-3 ${textAlignClass}`}>
      {eyebrow && <div className="text-[10px] font-bold text-gold mb-1">{eyebrow}</div>}
      {title && <h2 className={`text-lg sm:text-xl font-bold text-brand dark:text-gray-100 mb-1.5 transition-colors tracking-tight leading-tight ${titleClassName}`}>{title}</h2>}
      {subtitle && <div className="text-sm text-muted dark:text-gray-400 leading-relaxed transition-colors">{subtitle}</div>}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline';
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-bold cursor-pointer transition-transform active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  const variants = {
    primary: "bg-gold-gradient text-brand shadow-md border border-transparent",
    ghost: "bg-white dark:bg-transparent dark:text-gold border border-gold/80 text-brand shadow-sm hover:bg-gray-50 dark:hover:bg-white/5",
    outline: "bg-transparent border border-gold text-gold"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const PulseDot = () => (
  <span className="w-[9px] h-[9px] rounded-full bg-gold animate-rf-pulse block" />
);

export const StripContainer: React.FC<{ children: ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div className={`flex gap-4 overflow-x-auto pb-6 pt-4 px-3.5 scrollbar-default -mx-3.5 touch-pan-x snap-x snap-proximity cursor-grab active:cursor-grabbing ${className}`}>
    {children}
  </div>
);

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error && parsedError.error.includes("insufficient permissions")) {
          errorMessage = "عذراً، ليس لديك الصلاحيات الكافية لإتمام هذه العملية. يرجى التأكد من تسجيل الدخول.";
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dir-rtl font-['Tajawal']">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-xl font-bold text-brand mb-2">عذراً، حدث خطأ</h2>
            <p className="text-muted mb-6">{errorMessage}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              إعادة تحميل الصفحة
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
