import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRight, CheckCircle, AlertCircle, Lock, Calendar, Hash, ShieldCheck } from 'lucide-react';
import { Button } from './Shared';
import Footer from './Footer';
import { safeStringify, safeParse } from '../src/utils/safeJson';
import { formatAmount } from '../src/utils/format';
import { useFirebase } from '../contexts/FirebaseContext';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface WaiveRequestFormProps {
  onClose: () => void;
  prefill?: any;
}

const REGION_CITIES: Record<string, string[]> = {
  "الرياض": ["الرياض","الدرعية","الخرج","الدوادمي","المجمعة","القويعية","وادي الدواسر","الزلفي","شقراء","حوطة بني تميم","الأفلاج","السليل","ضرما","المزاحمية"],
  "مكة المكرمة": ["مكة المكرمة","جدة","الطائف","رابغ","خليص","الليث","القنفذة","العرضيات","الكامل"],
  "المدينة": ["المدينة المنورة","ينبع","العلا","بدر","الحناكية","خيبر"],
  "القصيم": ["بريدة","عنيزة","الرس","البكيرية","البدائع","المذنب","عيون الجواء","رياض الخبراء"],
  "الشرقية": ["الدمام","الخبر","الظهران","القطيف","الأحساء","الجبيل","الخفجي","حفر الباطن","بقيق","رأس تنورة"],
  "عسير": ["أبها","خميس مشيط","بيشة","محايل عسير","النماص","رجال ألمع"],
  "تبوك": ["تبوك","الوجه","ضباء","تيماء","أملج","حقل"],
  "حائل": ["حائل","بقعاء","الغزالة","الشنان"],
  "الحدود الشمالية": ["عرعر","رفحاء","طريف","العويقلية"],
  "جازان": ["جيزان","صبيا","أبو عريش","صامطة","بيش","الدرب"],
  "نجران": ["نجران","شرورة","حبونا","بدر الجنوب"],
  "الباحة": ["الباحة","بلجرشي","المندق","المخواة"],
  "الجوف": ["سكاكا","القريات","دومة الجندل","طبرجل"]
};

const BANKS = [
  "البنك الأهلي السعودي (SNB)", "مصرف الراجحي", "بنك الرياض", 
  "البنك السعودي البريطاني (ساب)", "البنك السعودي الفرنسي", "بنك البلاد", 
  "بنك الجزيرة", "بنك الإنماء", "بنك الخليج الدولي - السعودية", "جهة تمويلية أخرى"
];

const WaiveRequestForm: React.FC<WaiveRequestFormProps> = ({ onClose, prefill }) => {
  const { user } = useFirebase();
  console.log("WaiveRequestForm Rendered");
  const [requestId, setRequestId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showContractPrompt, setShowContractPrompt] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const [region, setRegion] = useState(prefill?.region || '');
  const [products, setProducts] = useState(prefill?.products?.length > 0 ? prefill.products : [{ id: 1, type: '', amount: '', accountNumber: '' }]);
  const [documents, setDocuments] = useState<any[]>(prefill?.documents?.length > 0 
    ? prefill.documents.map((d: any) => ({ 
        ...d, 
        id: d.id || Date.now() + Math.random(),
        file: null // Files are not persisted in prefill
      })) 
    : [{ id: 1, type: '', file: null, fileName: '', date: new Date().toLocaleDateString('ar-SA') }]
  );
  const [totalAmount, setTotalAmount] = useState(0);
  const [attachments, setAttachments] = useState<any[]>([]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [agreedToAuth, setAgreedToAuth] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Form values for pre-filling
  const [formData, setFormData] = useState({
    firstName: prefill?.fullName?.split(' ')[0] || '',
    middleName: prefill?.fullName?.split(' ')[1] || '',
    lastName: prefill?.fullName?.split(' ').slice(2).join(' ') || '',
    age: prefill?.age || '',
    nationalId: prefill?.national_id || prefill?.nationalId || '',
    mobile: prefill?.phone || prefill?.mobile || '',
    jobStatus: prefill?.jobStatus || '',
    city: prefill?.city || '',
    bank: prefill?.bank || '',
    email: prefill?.email || '',
    summary: prefill?.summary || '',
  });

  // Auto-prefill from localStorage if available
  useEffect(() => {
    if (!prefill) {
      const savedProfile = localStorage.getItem('guest_profile');
      if (savedProfile && savedProfile !== 'undefined') {
        const data = safeParse(savedProfile, null as any);
        if (data) {
          setRegion(data.region || '');
          if (data.products?.length > 0) setProducts(data.products);
          setFormData({
            firstName: data.firstName || data.fullName?.split(' ')[0] || '',
            middleName: data.middleName || data.fullName?.split(' ')[1] || '',
            lastName: data.lastName || data.fullName?.split(' ').slice(2).join(' ') || '',
            age: data.age || '',
            nationalId: data.nationalId || data.national_id || '',
            mobile: data.mobile || data.phone || '',
            jobStatus: data.jobStatus || '',
            city: data.city || '',
            bank: data.bank || '',
            email: data.email || '',
            summary: data.summary || '',
          });
        }
      }
    } else if (prefill) {
      // If prefill is provided (e.g. from dashboard), use it all
      setRegion(prefill.region || '');
      if (prefill.products?.length > 0) setProducts(prefill.products);
      setFormData({
        firstName: prefill.firstName || prefill.fullName?.split(' ')[0] || '',
        middleName: prefill.middleName || prefill.fullName?.split(' ')[1] || '',
        lastName: prefill.lastName || prefill.fullName?.split(' ').slice(2).join(' ') || '',
        age: prefill.age || '',
        nationalId: prefill.nationalId || prefill.national_id || '',
        mobile: prefill.mobile || prefill.phone || '',
        jobStatus: prefill.jobStatus || '',
        city: prefill.city || '',
        bank: prefill.bank || '',
        email: prefill.email || '',
        summary: prefill.summary || '',
      });
    }
  }, [prefill]);

  // Signature logic
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    // Generate Request ID
    if (!prefill) {
      const savedProfile = localStorage.getItem('guest_profile');
      if (savedProfile && savedProfile !== 'undefined') {
        const data = safeParse(savedProfile, null as any);
        if (data && data.fileNumber) {
          setRequestId(data.fileNumber);
          return;
        }
      }
    }
    
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yy = String(now.getFullYear()).slice(-2);
    const rand = Math.floor(100 + Math.random()*900);
    setRequestId(`RF-${dd}${mm}${yy}-${rand}`);
  }, [prefill]);

  useEffect(() => {
    // Calculate total - strip commas before parsing
    const total = products.reduce((sum, p) => {
      const cleanAmount = (p.amount || '0').replace(/,/g, '');
      return sum + (parseFloat(cleanAmount) || 0);
    }, 0);
    setTotalAmount(total);
  }, [products]);

  // Signature Canvas Handling
  useEffect(() => {
    const handleWindowClick = (e: MouseEvent) => {
      // Removed problematic console.log(e.target) which causes circular structure errors
    };
    window.addEventListener('click', handleWindowClick);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#003399'; // Changed to blue
    }

    const resizeCanvas = () => {
       const parent = canvas.parentElement;
       if(parent) {
         canvas.width = parent.clientWidth;
         canvas.height = 130;
         if (ctx) {
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#003399'; // Changed to blue
         }
       }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    e.preventDefault(); // Prevent scrolling on touch
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    
    // Immediate feedback
    console.log("Submit function triggered");
    setStatusMessage('جاري التحقق من البيانات...');
    
    // Manual Validation with clear alerts
    if (!formData.firstName || !formData.middleName || !formData.lastName) {
      const msg = 'يرجى إدخال الاسم الثلاثي كاملاً (الأول، الأب، العائلة).';
      setStatusMessage(msg);
      alert(msg);
      return;
    }
    if (!formData.age) {
      const msg = 'يرجى إدخال العمر.';
      setStatusMessage(msg);
      alert(msg);
      return;
    }
    if (!formData.nationalId || !/^[0-9]{10}$/.test(formData.nationalId)) {
      const msg = 'يرجى إدخال رقم هوية صحيح مكون من 10 أرقام.';
      setStatusMessage(msg);
      alert(msg);
      return;
    }
    if (!formData.mobile || !/^05[0-9]{8}$/.test(formData.mobile)) {
      const msg = 'يرجى إدخال رقم جوال صحيح مكون من 10 أرقام ويبدأ بـ 05 (مثال: 05xxxxxxxx).';
      setStatusMessage(msg);
      alert(msg);
      return;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      const msg = 'يرجى إدخال بريد إلكتروني صحيح.';
      setStatusMessage(msg);
      alert(msg);
      return;
    }
    if (!formData.jobStatus) {
      const msg = 'يرجى اختيار الحالة الوظيفية.';
      setStatusMessage(msg);
      alert(msg);
      return;
    }
    if (!region) {
      const msg = 'يرجى اختيار المنطقة.';
      setStatusMessage(msg);
      alert(msg);
      return;
    }
    if (!formData.city) {
      const msg = 'يرجى اختيار المدينة.';
      setStatusMessage(msg);
      alert(msg);
      return;
    }
    if (!formData.bank) {
      const msg = 'يرجى اختيار الجهة المالية.';
      setStatusMessage(msg);
      alert(msg);
      return;
    }
    
    // Validate products
    const invalidProduct = products.find(p => !p.type || !p.amount);
    if (invalidProduct) {
      const msg = 'يرجى إكمال بيانات المنتجات التمويلية (تحديد النوع وإدخال المبلغ).';
      setStatusMessage(msg);
      alert(msg);
      return;
    }

    if (!agreedToAuth || !agreedToTerms) {
      const msg = 'يجب الموافقة على تفويض ريفانس المالية وعلى الشروط والأحكام للمتابعة (المربعات في أسفل النموذج).';
      setStatusMessage(msg);
      alert(msg);
      return;
    }

    if (!hasSignature) {
      const msg = 'يرجى التوقيع في المربع المخصص في أسفل النموذج قبل الإرسال.';
      setStatusMessage(msg);
      alert(msg);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('جاري إرسال الطلب...');
    
    try {
      const type = prefill?.requestType === 'rescheduling_request' ? 'إعادة جدولة' : (prefill?.serviceType === 'جدولة المديونيات' ? 'جدولة مديونيات' : 'طلب إعفاء');
      
      // Signature as base64 string
      const signatureData = canvasRef.current?.toDataURL();

      // Convert documents to base64 for email
      const preparedAttachments = await Promise.all(
        documents
          .filter(doc => doc.file)
          .map(async doc => {
            const base64 = await fileToBase64(doc.file);
            return {
              filename: doc.fileName || doc.file.name,
              content: base64.split(',')[1], // Remove data:mime;base64,
              encoding: 'base64'
            };
          })
      );
      setAttachments(preparedAttachments);

      console.log("Submitting to backend...");
      
      // Send email notification via our server
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: safeStringify({
          requestData: {
            id: requestId,
            type: type,
            details: formData.summary,
            products: safeStringify(products),
            data: {
              region: region,
              city: formData.city,
              signature: signatureData
            }
          },
          userData: {
            fullName: `${formData.firstName} ${formData.middleName} ${formData.lastName}`,
            phone: formData.mobile,
            national_id: formData.nationalId,
            email: formData.email
          },
          attachments: preparedAttachments
        })
      });

      if (!response.ok) {
        throw new Error("فشل إرسال الطلب عبر البريد الإلكتروني");
      }
      
      setIsSuccess(true);
      setShowContractPrompt(true);
      window.dispatchEvent(new CustomEvent('request-submitted'));
    } catch (error: any) {
      console.error("Submission error:", error);
      const errorMessage = error.message || "حدث خطأ أثناء الإرسال، يرجى المحاولة لاحقاً.";
      setStatusMessage(errorMessage);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addProduct = () => setProducts([...products, { id: Date.now(), type: '', amount: '', accountNumber: '' }]);
  const removeProduct = (id: number) => setProducts(products.filter(p => p.id !== id));
  const updateProduct = (id: number, field: 'type' | 'amount' | 'accountNumber', value: string) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        if (field === 'amount') {
          // Allow numbers, dots, and commas for natural typing
          const numericValue = value.replace(/[^\d.,]/g, '');
          // Ensure only one decimal point
          const parts = numericValue.split('.');
          const sanitizedValue = parts.length > 2 
            ? `${parts[0]}.${parts.slice(1).join('')}` 
            : numericValue;
          return { ...p, [field]: sanitizedValue };
        }
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const addDocument = () => setDocuments([...documents, { 
    id: Date.now(), 
    type: '', 
    file: null,
    fileName: '', 
    date: new Date().toLocaleDateString('ar-SA') 
  }]);

  const removeDocument = (id: number) => setDocuments(documents.filter(d => d.id !== id));

  const updateDocumentFile = (id: number, file: File | null) => {
    if (file && file.size > 2 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. يرجى اختيار ملف أقل من 2 ميجابايت.');
      return;
    }
    setDocuments(documents.map(d => d.id === id ? { 
      ...d, 
      file, 
      fileName: file ? file.name : '',
      date: new Date().toLocaleDateString('ar-SA')
    } : d));
  };

  const updateDocumentType = (id: number, type: string) => {
    setDocuments(documents.map(d => d.id === id ? { ...d, type } : d));
  };

  const onlyNumbers = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Delete') {
      e.preventDefault();
    }
  };

  if (isSuccess && showContractPrompt) {
    const fullName = `${formData.firstName} ${formData.middleName} ${formData.lastName}`;
    const type = prefill?.requestType === 'rescheduling_request' ? 'إعادة جدولة' : (prefill?.serviceType === 'جدولة المديونيات' ? 'جدولة مديونيات' : 'إعفاء');
    
    return (
      <div className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl">
        <div className="bg-white rounded-[24px] border border-gold shadow-2xl p-6 max-w-sm w-full text-center animate-in zoom-in duration-300">
           <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-blue-600" size={32} />
           </div>
           <h2 className="text-[18px] font-extrabold text-brand mb-3">خطوة أخيرة لاعتماد طلبك</h2>
           <p className="text-[12px] text-muted mb-6 leading-relaxed">
             تم استلام بيانات طلبك بنجاح. هل ترغب بالانتقال إلى توقيع عقد طلب {type} لاعتماد الطلب رسمياً؟
           </p>
           <div className="flex flex-col gap-2">
             <Button 
               onClick={() => {
                 const firstProduct = products[0] || { type: '', accountNumber: '', amount: '0' };
                 const customerData = {
                   requestId,
                   fullName,
                   nationalId: formData.nationalId,
                   mobile: formData.mobile,
                   email: formData.email,
                   type: type === 'إعفاء' ? 'طلب إعفاء' : type,
                   financingInstitutionName: formData.bank,
                   productType: firstProduct.type,
                   accountNumber: firstProduct.accountNumber,
                   amount: totalAmount.toString(),
                   allProducts: products,
                   attachments: attachments
                 };
                 
                 // Save to localStorage for the contract page to pick up
                 localStorage.setItem('tempContractData', JSON.stringify(customerData));
                 
                 const params = new URLSearchParams({
                   requestId,
                   fullName,
                   nationalId: formData.nationalId,
                   mobile: formData.mobile,
                   type: type === 'إعفاء' ? 'طلب إعفاء' : type,
                   financingInstitutionName: formData.bank,
                   productType: firstProduct.type,
                   accountNumber: firstProduct.accountNumber,
                   amount: totalAmount.toString(),
                   email: formData.email,
                   products: JSON.stringify(products)
                 });
                 window.location.hash = `#/contract?${params.toString()}`;
                 onClose();
               }} 
               className="w-full py-2.5 text-sm"
             >
               نعم، الانتقال للتوقيع
             </Button>
             <button 
               onClick={() => {
                 window.location.hash = '#/';
                 onClose();
               }} 
               className="text-brand font-bold text-[12px] hover:underline py-1"
             >
               لا، العودة للرئيسية
             </button>
           </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F5F4FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-[24px] border border-gold shadow-2xl p-8 max-w-md w-full text-center animate-in zoom-in duration-300">
           <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={40} />
           </div>
           <h2 className="text-[22px] font-extrabold text-brand mb-2">تم استلام طلبك بنجاح</h2>
           <p className="text-[13px] text-muted mb-6 leading-relaxed">
             شكراً لك. تم تسجيل طلب الإعفاء الخاص بك برقم 
             <span className="font-bold text-brand block mt-1 text-[16px]">{requestId}</span>
             سيقوم فريقنا بالتواصل معك قريباً لاستكمال الإجراءات.
           </p>
           <Button onClick={onClose} className="w-full">العودة للرئيسية</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2147483647] bg-[#F5F4FA] overflow-y-auto overflow-x-hidden pointer-events-auto will-change-transform">
      {/* Top Bar */}
      <div className="sticky top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gold/30 h-[60px] flex items-center justify-between px-4 z-[2147483647] shadow-sm pointer-events-auto">
        <button 
          onClick={() => {
            onClose();
          }} 
          className="p-2 rounded-full hover:bg-gray-100 text-brand"
        >
          <ArrowRight size={20} />
        </button>
        <span className="text-[14px] font-extrabold text-brand">
          {prefill?.requestType === 'rescheduling_request' ? 'نموذج طلب إعادة جدولة المنتجات التمويلية' : (prefill?.serviceType === 'جدولة المديونيات' ? 'نموذج طلب جدولة المديونيات' : 'نموذج طلب الإعفاء')}
        </span>
        <div className="w-10"></div> {/* Spacer to keep title centered */}
      </div>

      <div className="max-w-[980px] mx-auto px-1.5 sm:px-4 py-3 sm:py-6 pb-12">
        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-[12px] sm:rounded-[16px] border border-gold/45 shadow-[0_18px_45px_rgba(0,0,0,0.06)] p-3.5 sm:p-8">
          
          <div className="mb-6 border-b border-gray-100 pb-4">
             <div className="flex justify-between items-center mb-2">
               <h1 className="text-[20px] font-extrabold text-brand">بيانات الطلب الأساسية</h1>
               <span className="bg-[#FFFBF2] text-gold px-3 py-1 rounded-full text-[12px] font-bold border border-gold/30 tracking-wider font-mono">{requestId}</span>
             </div>
             <p className="text-[12px] text-muted">يرجى تعبئة جميع البيانات المطلوبة بدقة لضمان سرعة معالجة الطلب.</p>
             {statusMessage && (
               <div className="mt-3 p-3 bg-gold/10 border border-gold/30 rounded-[12px] text-brand text-[12px] font-bold animate-pulse">
                 {statusMessage}
               </div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
             {/* Name */}
             <div className="md:col-span-2">
               <label className="block text-[12px] font-bold text-brand mb-1.5">الاسم الثلاثي <span className="text-red-500">*</span></label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   name="firstName" 
                   placeholder="الأول" 
                   required 
                   value={formData.firstName}
                   onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                   className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none" 
                 />
                 <input 
                   type="text" 
                   name="middleName" 
                   placeholder="الأوسط" 
                   required 
                   value={formData.middleName}
                   onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                   className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none" 
                 />
                 <input 
                   type="text" 
                   name="lastName" 
                   placeholder="العائلة" 
                   required 
                   value={formData.lastName}
                   onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                   className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none" 
                 />
               </div>
             </div>
                          {/* National ID & Mobile */}
             <div className="md:col-span-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[12px] font-bold text-brand mb-1.5">رقم الهوية <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="nationalId" 
                      inputMode="numeric"
                      onKeyDown={onlyNumbers}
                      maxLength={10}
                      required 
                      value={formData.nationalId}
                      onChange={(e) => setFormData({...formData, nationalId: e.target.value.replace(/\D/g, '')})}
                      className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none" 
                      placeholder="10 أرقام" 
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-brand mb-1.5">رقم الجوال <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="mobile" 
                      inputMode="numeric"
                      required 
                      value={formData.mobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({...formData, mobile: val});
                      }}
                      onKeyDown={onlyNumbers}
                      maxLength={10}
                      className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] font-bold tracking-wider focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-left dir-ltr" 
                      placeholder="05xxxxxxxx" 
                    />
                  </div>
                </div>
             </div>

             {/* Email */}
             <div className="md:col-span-2">
                <label className="block text-[12px] font-bold text-brand mb-1.5">البريد الإلكتروني <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-left dir-ltr" 
                  placeholder="example@email.com" 
                />
             </div>

             {/* Region & City */}
             <div className="md:col-span-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[12px] font-bold text-brand mb-1.5">المنطقة <span className="text-red-500">*</span></label>
                    <select 
                       name="region" 
                       value={region} 
                       onChange={(e) => setRegion(e.target.value)}
                       required 
                       className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-white"
                    >
                      <option value="">اختر المنطقة</option>
                      {Object.keys(REGION_CITIES).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-brand mb-1.5">المدينة <span className="text-red-500">*</span></label>
                    <select 
                      name="city" 
                      required 
                      disabled={!region} 
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-white"
                    >
                      <option value="">اختر المدينة</option>
                      {region && REGION_CITIES[region]?.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
             </div>

             {/* Age & Job Status */}
             <div className="md:col-span-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[12px] font-bold text-brand mb-1.5">العمر <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="age" 
                      inputMode="numeric"
                      onKeyDown={onlyNumbers}
                      required 
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value.replace(/\D/g, '')})}
                      className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none" 
                      placeholder="بالسنوات" 
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-brand mb-1.5">الحالة الوظيفية <span className="text-red-500">*</span></label>
                    <select 
                      name="jobStatus" 
                      required 
                      value={formData.jobStatus}
                      onChange={(e) => setFormData({...formData, jobStatus: e.target.value})}
                      className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-white"
                    >
                      <option value="">اختر الحالة</option>
                      <option value="موظف حكومي">موظف حكومي</option>
                      <option value="موظف قطاع خاص">موظف قطاع خاص</option>
                      <option value="متقاعد">متقاعد</option>
                      <option value="لا يوجد عمل">لا يوجد عمل</option>
                    </select>
                  </div>
                </div>
             </div>

             {/* Bank */}
             <div className="md:col-span-2">
                <label className="block text-[12px] font-bold text-brand mb-1.5">الجهة المالية <span className="text-red-500">*</span></label>
                <select 
                  name="bank" 
                  required 
                  value={formData.bank}
                  onChange={(e) => setFormData({...formData, bank: e.target.value})}
                  className="w-full py-1 px-2.5 rounded-[12px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-white"
                >
                  <option value="">اختر البنك أو الجهة التمويلية</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
             </div>
          </div>

          {/* Products Section */}
          <div className="mt-8 mb-6 bg-gradient-to-b from-white to-[#FCFAF4] rounded-[16px] border border-gold/30 p-4 shadow-inner">
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-[14px] font-bold text-brand">المنتجات التمويلية</h3>
               <button type="button" onClick={addProduct} className="flex items-center gap-1 text-[11px] text-brand bg-white border border-gold/40 px-3 py-1.5 rounded-full hover:bg-gold/10 transition-colors">
                 <Plus size={12} />
                 إضافة منتج
               </button>
             </div>
             
             <div className="space-y-3">
               {products.map((product, idx) => (
                 <div key={product.id} className="flex flex-wrap gap-2 items-end animate-in fade-in slide-in-from-right-2">
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] font-bold text-muted mb-1">نوع المنتج</label>
                      <select 
                        name={`productType_${idx}`}
                        required
                        value={product.type}
                        onChange={(e) => updateProduct(product.id, 'type', e.target.value)}
                        className="w-full py-1 px-2 rounded-[10px] border border-gold/20 text-[12px] bg-white"
                      >
                         <option value="">اختر النوع</option>
                         <option value="تمويل شخصي">تمويل شخصي</option>
                         <option value="تمويل عقاري">تمويل عقاري</option>
                         <option value="التمويل التأجيري">التمويل التأجيري</option>
                         <option value="بطاقة ائتمانية">بطاقة ائتمانية</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-[10px] font-bold text-muted mb-1">رقم حساب التمويل (اختياري)</label>
                      <input 
                        type="text"
                        name={`productAccount_${idx}`}
                        inputMode="numeric"
                        onKeyDown={onlyNumbers}
                        value={product.accountNumber || ''}
                        onChange={(e) => updateProduct(product.id, 'accountNumber', e.target.value.replace(/\D/g, ''))}
                        className="w-full py-1 px-2 rounded-[10px] border border-gold/20 text-[12px]" 
                        placeholder="رقم الحساب"
                      />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-[10px] font-bold text-muted mb-1">المبلغ المتبقي</label>
                      <input 
                        type="text"
                        name={`productAmount_${idx}`}
                        inputMode="decimal"
                        required
                        value={product.amount}
                        onChange={(e) => updateProduct(product.id, 'amount', e.target.value)}
                        className="w-full py-1 px-2 rounded-[10px] border border-gold/20 text-[12px]" 
                        placeholder="0.00"
                      />
                    </div>
                    {products.length > 1 && (
                      <button type="button" onClick={() => removeProduct(product.id)} className="mb-1 p-2 text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                 </div>
               ))}
             </div>

             <div className="mt-4 pt-3 border-t border-gold/10 flex justify-between items-center">
                <span className="text-[12px] text-muted font-bold">المجموع الكلي:</span>
                <span className="text-[14px] font-extrabold text-brand tabular-nums">{formatAmount(totalAmount)} ر.س</span>
             </div>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <label className="block text-[12px] font-bold text-brand mb-1.5">ملخص الحالة (اختياري)</label>
            <textarea 
              name="summary" 
              value={formData.summary} 
              onChange={(e) => setFormData({...formData, summary: e.target.value})} 
              className="w-full py-1 px-3 rounded-[14px] border border-gold/30 text-[13px] focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none min-h-[80px]" 
              placeholder={prefill?.requestType === 'rescheduling_request' ? "اكتب نبذة مختصرة عن وضعك المالي وسبب طلب إعادة الجدولة..." : (prefill?.serviceType === 'جدولة المديونيات' ? "اكتب نبذة مختصرة عن وضعك المالي وطلب الجدولة..." : "اكتب نبذة مختصرة عن سبب طلب الإعفاء...")}
            ></textarea>
          </div>

          {/* Files */}
          <div className="mb-6">
             <div className="flex justify-between items-center mb-2">
               <label className="text-[12px] font-bold text-brand">المرفقات الداعمة</label>
               <button type="button" onClick={addDocument} className="text-[11px] text-gold underline hover:text-brand">
                 + إضافة مرفق
               </button>
             </div>
             <div className="space-y-2">
                {documents.map((doc) => (
                   <div key={doc.id} className="flex gap-2 items-center">
                       <select 
                         name={`docType_${doc.id}`} 
                         value={doc.type}
                         onChange={(e) => updateDocumentType(doc.id, e.target.value)}
                         className="w-1/3 py-1 px-2 rounded-[10px] border border-gold/20 text-[11px] bg-white"
                       >
                          <option value="">نوع المرفق</option>
                         {prefill?.requestType === 'rescheduling_request' || prefill?.serviceType === 'جدولة المديونيات' ? (
                           <>
                             <option value="خطاب تعريف بالراتب">خطاب تعريف بالراتب</option>
                             <option value="قرار تقاعد">قرار تقاعد</option>
                             <option value="تقرير سمه">تقرير سمه</option>
                             <option value="كشف حساب ثلاثة أشهر">كشف حساب ثلاثة أشهر</option>
                             <option value="قرار إعادة خدمة">قرار إعادة خدمة</option>
                             <option value="مستندات اخرى">مستندات اخرى</option>
                           </>
                         ) : (
                           <>
                             <option value="تقرير طبي">تقرير طبي</option>
                             <option value="قرار انهاء خدمة">قرار انهاء خدمة</option>
                             <option value="مشهد تقييم اعاقه">مشهد تقييم اعاقه</option>
                             <option value="مشهد ضمان اجتماعي">مشهد ضمان اجتماعي</option>
                             <option value="قرار طبي">قرار طبي</option>
                             <option value="قرار اللجنة الطبية">قرار اللجنة الطبية</option>
                             <option value="مستندات اخرى">مستندات اخرى</option>
                           </>
                         )}
                      </select>
                      <div className="flex-1 relative">
                        <input 
                          type="file" 
                          id={`docFile_${doc.id}`}
                          name={`docFile_${doc.id}`} 
                          onChange={(e) => updateDocumentFile(doc.id, e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        />
                        <div className="w-full py-1 px-2 rounded-[10px] border border-gold/20 text-[11px] bg-gray-50 flex items-center justify-between">
                          <span className="truncate max-w-[120px]">{doc.fileName || 'اختر ملفاً...'}</span>
                          <Hash size={12} className="text-gold/50" />
                        </div>
                      </div>
                      {documents.length > 1 && (
                        <button type="button" onClick={() => removeDocument(doc.id)} className="text-red-400 p-1 hover:bg-red-50 rounded-full transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                   </div>
                ))}
             </div>
          </div>

          {/* Consent */}
          <div className="mb-6 space-y-3 bg-[#F9F9F9] p-4 rounded-[12px] border border-gray-100">
             <label className="flex gap-2 items-start cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={agreedToAuth}
                  onChange={(e) => setAgreedToAuth(e.target.checked)}
                  className="mt-1 accent-gold w-4 h-4" 
                />
                <span className="text-[11px] text-brand leading-relaxed">
                  أوافق على <button type="button" onClick={() => setShowAuthModal(true)} className="text-gold font-bold hover:underline">تفويض ريفانس المالية</button> بالاطلاع على المستندات ودراسة الحالة ومتابعة الإجراءات مع الجهات التمويلية.
                </span>
             </label>
             <label className="flex gap-2 items-start cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 accent-gold w-4 h-4" 
                />
                <span className="text-[11px] text-brand leading-relaxed">
                  وأوافق على <button type="button" onClick={() => setShowTermsModal(true)} className="text-gold font-bold hover:underline">الشروط والأحكام</button> ، و أتعهد بصحة جميع البيانات المدخلة والمرفقات.
                </span>
             </label>
          </div>

          {/* Signature */}
          <div className="mb-8">
             <div className="flex justify-between items-end mb-1.5">
                <label className="text-[12px] font-bold text-brand">التوقيع الإلكتروني <span className="text-red-500">*</span></label>
                <button type="button" onClick={clearSignature} className="text-[10px] text-red-500 hover:underline">مسح التوقيع</button>
             </div>
             <div className="border border-gold/60 rounded-[12px] overflow-hidden bg-white shadow-inner touch-none h-[130px]">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair"
                />
             </div>
             <p className="text-[10px] text-muted mt-1 text-center">يرجى التوقيع داخل المربع باستخدام الإصبع أو المؤشر</p>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col gap-3 pt-4 border-t border-gold/30">
             <div className="flex gap-3">
               <button 
                 type="button" 
                 onClick={onClose} 
                 className="flex-1 px-4 py-3 rounded-full border border-gold/30 text-brand font-bold text-[13px] hover:bg-gray-50 transition-colors"
               >
                 إلغاء
               </button>
               <button 
                 type="button" 
                 onClick={() => {
                   console.log("Submit button clicked");
                   setStatusMessage('تم استلام الضغطة، جاري التحقق...');
                   handleSubmit();
                 }} 
                 disabled={isSubmitting} 
                 className="flex-[2] bg-gold-gradient text-brand font-bold py-3 rounded-full shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed text-[14px] transition-all active:scale-95 pointer-events-auto cursor-pointer"
               >
                 {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
               </button>
             </div>
          </div>

        </form>

        {/* Authorization Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
            <div className="relative bg-white rounded-[24px] p-6 sm:p-10 w-[95vw] max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-gold/30 animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-brand">تفويض ريفانس المالية</h3>
                <button onClick={() => setShowAuthModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="text-[14px] sm:text-[16px] text-gray-600 leading-relaxed space-y-4 text-right flex-1 overflow-y-auto px-4 custom-scrollbar">
                <p>أقر أنا مقدم الطلب بموافقتي الصريحة على تفويض ريفانس المالية أو من تفوضه بالنيابة عنها في الاطلاع على البيانات والمعلومات والمستندات ذات الصلة بطلب إعادة جدولة المنتجات التمويلية المقدم مني، وذلك لغرض دراسة الحالة ومراجعة المستندات ورفع الطلب ومتابعته لدى الجهات التمويلية والتنظيمية ذات العلاقة.</p>
                <p className="font-bold text-brand">يشمل هذا التفويض على وجه الخصوص:</p>
                <ul className="list-disc pr-6 space-y-2">
                  <li>استلام ومراجعة المستندات والبيانات المقدمة من مقدم الطلب والتحقق من اكتمالها.</li>
                  <li>التواصل مع البنوك والمصارف وشركات التمويل والجهات ذات العلاقة بخصوص طلب إعادة الجدولة.</li>
                  <li>رفع طلبات إعادة الجدولة ومتابعتها وتحديث حالة الملف وإشعار مقدم الطلب بالمستجدات.</li>
                  <li>إعداد الصيغ النظامية والمخاطبات اللازمة والمذكرات التوضيحية عند الحاجة.</li>
                  <li>طلب أي مستندات إضافية لازمة لاستكمال دراسة الحالة أو دعم فرص قبول الطلب.</li>
                </ul>
                <p className="font-bold text-brand">إقرار مقدم الطلب</p>
                <p>يقر مقدم الطلب بأن هذا التفويض يقتصر على الغرض المرتبط بطلب إعادة الجدولة، وأنه مفوض بإرادته الكاملة، كما يقر بصحة البيانات والمستندات المقدمة منه ويتحمل كامل المسؤولية النظامية عن أي بيانات غير صحيحة أو ناقصة تؤثر على مسار الطلب أو نتيجته.</p>
                <p className="font-bold text-brand">السرية وحماية البيانات</p>
                <p>تلتزم ريفانس المالية بالمحافظة على سرية البيانات والمعلومات وعدم استخدامها إلا في الحدود اللازمة لدراسة الطلب ومتابعته وفق مقتضى الأنظمة والتعليمات ذات العلاقة وبما يحقق الغرض المشروع من هذا التفويض.</p>
              </div>
              <div className="mt-8">
                <Button onClick={() => setShowAuthModal(false)} className="w-full py-4 text-lg">إغلاق</Button>
              </div>
            </div>
          </div>
        )}

        {/* Terms Modal */}
        {showTermsModal && (
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTermsModal(false)} />
            <div className="relative bg-white rounded-[24px] p-6 sm:p-10 w-[95vw] max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-gold/30 animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-brand">الشروط والأحكام</h3>
                <button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="text-[14px] sm:text-[16px] text-gray-600 leading-relaxed space-y-4 text-right flex-1 overflow-y-auto px-4 custom-scrollbar">
                <p>تخضع خدمة طلب إعادة جدولة المنتجات التمويلية المقدمة عبر هذه الصفحة للشروط والأحكام التالية، ويعد استمرار مقدم الطلب في استخدام النموذج وإرسال البيانات موافقة صريحة ونهائية على ما ورد فيها.</p>
                <p className="font-bold text-brand">1) صحة البيانات</p>
                <p>يلتزم مقدم الطلب بإدخال بيانات صحيحة ودقيقة ومحدثة، ويتحمل وحده المسؤولية الكاملة عن صحة المعلومات والمستندات والوثائق المرفقة، وعن أي آثار نظامية أو إجرائية قد تنتج عن تقديم معلومات غير صحيحة أو مضللة.</p>
                <p className="font-bold text-brand">2) طبيعة الخدمة</p>
                <p>تقتصر الخدمة على دراسة حالة العميل ومراجعة مستنداته ورفع الطلب ومتابعته مع الجهات ذات العلاقة، ولا يُعد استقبال الطلب أو مراجعته أو متابعته ضمانًا لقبوله أو الموافقة عليه من قبل الجهة التمويلية أو أي جهة أخرى.</p>
                <p className="font-bold text-brand">3) المستندات الداعمة</p>
                <p>يحق لريفانس المالية طلب مستندات إضافية أو تحديث بيانات الملف متى كان ذلك لازمًا لاستكمال دراسة الطلب أو تعزيز فرص قبوله، ويلتزم مقدم الطلب بالتعاون وتزويد الشركة بما يلزم خلال المدة المطلوبة.</p>
                <p className="font-bold text-brand">4) التواصل والإشعارات</p>
                <p>يوافق مقدم الطلب على التواصل معه عبر الجوال أو البريد الإلكتروني أو الوسائل الرقمية المتاحة بخصوص الطلب، ويعد أي إشعار أو تحديث يرسل إلى بيانات الاتصال المدخلة في النموذج معتبرًا ومنتجًا لآثاره.</p>
                <p className="font-bold text-brand">5) الخصوصية والسرية</p>
                <p>تتعامل ريفانس المالية مع البيانات والمعلومات بسرية مهنية، وتستخدمها بالقدر اللازم لتنفيذ الخدمة ومتابعة الطلب والوفاء بالمتطلبات التشغيلية والتنظيمية ذات العلاقة.</p>
                <p className="font-bold text-brand">6) حدود المسؤولية</p>
                <p>لا تتحمل ريفانس المالية المسؤولية عن رفض الطلب أو تأخر معالجته أو طلب مستندات إضافية من الجهة التمويلية أو أي قرار يصدر من أي جهة ذات علاقة، كما لا تتحمل مسؤولية أي تأخير ناتج عن نقص البيانات أو عدم تعاون مقدم الطلب أو عدم أهلية الحالة للقبول.</p>
                <p className="font-bold text-brand">7) الإقرار النهائي</p>
                <p>بإرسال النموذج يقر مقدم الطلب بأنه اطلع على هذه الشروط وفهمها ووافق عليها، وأنه على علم بأن معالجة الطلب تخضع لمراجعة الجهة المختصة وفق أنظمتها وإجراءاتها، وأن موافقته الإلكترونية والتوقيع المدرج في النموذج حجة معتبرة وملزمة.</p>
              </div>
              <div className="mt-8">
                <Button onClick={() => setShowTermsModal(false)} className="w-full py-4 text-lg">إغلاق</Button>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
};

export default WaiveRequestForm;
