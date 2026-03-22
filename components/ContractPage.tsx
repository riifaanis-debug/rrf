import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, CheckCircle, ArrowRight, Download, Printer, FileText, PenTool, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './Shared';
import Footer from './Footer';
import { useFirebase } from '../contexts/FirebaseContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import * as SignatureCanvasModule from 'react-signature-canvas';
const SignatureCanvas = (SignatureCanvasModule as any).default || SignatureCanvasModule;
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatAmount } from '../src/utils/format';

const ContractPage: React.FC = () => {
  const { user } = useFirebase();
  const [contractData, setContractData] = useState({
    clientFileNumber: '',
    unifiedContractNumber: '',
    fullName: 'العميل الكريم',
    nationalId: '0000000000',
    mobile: '05XXXXXXXX',
    email: '',
    type: 'طلب إعفاء / جدولة',
    financingInstitutionName: '____________________',
    productType: '____________________',
    accountNumber: '____________________',
    amount: '0.00',
    allProducts: [] as any[]
  });

  const [signatureDate, setSignatureDate] = useState<string>('');

  useEffect(() => {
    // Generate a unique ID if not present
    const generateUniqueId = () => {
      const prefix = 'RF-';
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${prefix}${timestamp}${random}`;
    };

    // 1. Try localStorage
    const savedData = localStorage.getItem('tempContractData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        const uniqueId = data.requestId || generateUniqueId();
        setContractData(prev => ({ 
          ...prev, 
          ...data, 
          clientFileNumber: uniqueId,
          unifiedContractNumber: uniqueId,
          allProducts: data.allProducts || [] 
        }));
        return;
      } catch (e) {
        console.error("Error parsing localStorage data", e);
      }
    }

    // 2. Fallback to URL params
    const hash = window.location.hash;
    const queryStr = hash.split('?')[1];
    if (queryStr) {
      const queryParams = Object.fromEntries(new URLSearchParams(queryStr));
      const uniqueId = queryParams.requestId || generateUniqueId();
      setContractData(prev => ({
        ...prev,
        clientFileNumber: uniqueId,
        unifiedContractNumber: uniqueId,
        fullName: queryParams.fullName || prev.fullName,
        nationalId: queryParams.nationalId || prev.nationalId,
        mobile: queryParams.mobile || prev.mobile,
        email: queryParams.email || prev.email,
        type: queryParams.type || prev.type,
        financingInstitutionName: queryParams.financingInstitutionName || prev.financingInstitutionName,
        productType: queryParams.productType || prev.productType,
        accountNumber: queryParams.accountNumber || prev.accountNumber,
        amount: queryParams.amount || prev.amount,
        allProducts: queryParams.products ? JSON.parse(queryParams.products) : prev.allProducts
      }));
    } else {
      const uniqueId = generateUniqueId();
      setContractData(prev => ({ ...prev, clientFileNumber: uniqueId, unifiedContractNumber: uniqueId }));
    }
  }, []);

  const { clientFileNumber, unifiedContractNumber, fullName, nationalId, mobile, email, type, financingInstitutionName, productType, accountNumber, amount, allProducts } = contractData;

  const navigateToHome = () => {
    console.log("navigateToHome called");
    try {
      // Direct navigation to the root
      window.location.href = window.location.origin + '/#/';
      window.location.reload();
    } catch (err) {
      console.error("Navigation error:", err);
      window.location.hash = '#/';
      window.location.reload();
    }
  };

  const [isSigned, setIsSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stampBase64, setStampBase64] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [watermarkBase64, setWatermarkBase64] = useState<string | null>(null);

  // Pre-load images as base64 to ensure they render in PDF
  useEffect(() => {
    const loadImage = async (url: string, setter: (val: string) => void) => {
      try {
        const response = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(url)}`);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setter(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error(`Failed to pre-load image: ${url}`, err);
      }
    };
    
    loadImage('https://d.top4top.io/p_3733lj72b1.jpg', setStampBase64);
    loadImage('https://l.top4top.io/p_3733v1p2d1.png', setLogoBase64);
    loadImage('https://k.top4top.io/p_3730t4bzr0.jpeg', setWatermarkBase64);
  }, []);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [signatureImgUrl, setSignatureImgUrl] = useState<string | null>(null);
  const sigCanvas = useRef<any>(null);
  const contractRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setIsSigned(false);
    setSignatureImgUrl(null);
  };

  const handleSignatureEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsSigned(true);
      try {
        // Try to get trimmed canvas, fallback to raw canvas if it fails due to trim-canvas issues
        const canvas = sigCanvas.current.getTrimmedCanvas();
        setSignatureImgUrl(canvas.toDataURL('image/png'));
      } catch (e) {
        console.warn("getTrimmedCanvas failed, using raw canvas", e);
        setSignatureImgUrl(sigCanvas.current.getCanvas().toDataURL('image/png'));
      }
    }
  };

  const handleApprove = async () => {
    console.log("handleApprove started");
    if (!isSigned) {
      alert('يرجى التوقيع أولاً لاعتماد العقد.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Set signature date
      const now = new Date();
      const formattedDate = now.toLocaleDateString('ar-SA');
      setSignatureDate(formattedDate);
      console.log("Signature date set:", formattedDate);

      // Capture signature image with fallback
      let currentSignatureUrl = signatureImgUrl;
      if (sigCanvas.current) {
        try {
          currentSignatureUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        } catch (e) {
          console.warn("getTrimmedCanvas failed in handleApprove, using raw canvas", e);
          currentSignatureUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
        }
        setSignatureImgUrl(currentSignatureUrl);
      }
      console.log("Signature image captured");

      // Wait for state update to reflect signature and date in template
      await new Promise(resolve => setTimeout(resolve, 800));

      // Helper to wait for images to load with timeout
      const waitForImages = async (element: HTMLElement) => {
        const images = Array.from(element.getElementsByTagName('img'));
        console.log(`Waiting for ${images.length} images to load...`);
        const promises = images.map(img => {
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.warn(`Image load timeout: ${img.src}`);
              resolve(false);
            }, 10000); // Increased timeout to 10s
            if (img.complete && img.naturalHeight !== 0) {
              clearTimeout(timeout);
              resolve(true);
            } else {
              img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
              };
              img.onerror = () => {
                clearTimeout(timeout);
                console.error(`Image load error: ${img.src}`);
                resolve(false);
              };
            }
          });
        });
        await Promise.all(promises);
      };

      // Generate PDF from the 2-page template
      console.log("Starting PDF generation...");
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = pdfTemplateRef.current?.children;
      
      if (!pages || pages.length === 0) {
        throw new Error('فشل العثور على قالب التقرير');
      }

      // Ensure all images in the template are loaded
      if (pdfTemplateRef.current) {
        await waitForImages(pdfTemplateRef.current);
        // Extra small delay to ensure rendering is stable
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      for (let i = 0; i < pages.length; i++) {
        console.log(`Rendering page ${i + 1}...`);
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 2, // Reduced scale for better performance
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      
      console.log("PDF generated successfully");
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      
      const pdfBase64 = pdf.output('datauristring');

      // Send PDF to server (Owner email)
      console.log("Sending PDF to server...");
      const response = await fetch('/api/send-contract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          requestId: clientFileNumber,
          fullName,
          email: (contractData as any).email,
          products: allProducts,
          attachments: (contractData as any).attachments || []
        }),
      });

      if (response.ok) {
        console.log("PDF sent successfully");
        localStorage.removeItem('tempContractData');
        setShowSuccessModal(true);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'فشل إرسال العقد عبر البريد الإلكتروني' }));
        console.error("Server error sending PDF:", errorData);
        throw new Error(errorData.error || 'فشل إرسال العقد عبر البريد الإلكتروني');
      }
    } catch (error) {
      console.error('Error generating/sending PDF:', error);
      alert('حدث خطأ أثناء اعتماد العقد. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
      console.log("handleApprove finished");
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] pb-12 dir-rtl font-['Tajawal']">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={navigateToHome} className="p-2.5 hover:bg-gray-50 rounded-xl text-[#22042C] transition-all">
            <ArrowRight size={22} />
          </button>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#C5A059]" size={24} />
            <h1 className="text-lg font-black text-[#22042C]">بوابة توقيع العقود الإلكترونية</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-muted hover:text-brand transition-all"><Printer size={20} /></button>
            <button className="p-2 text-muted hover:text-brand transition-all"><Download size={20} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-0 sm:px-2 py-4 sm:py-8">
        <div className="bg-white shadow-xl sm:shadow-[0_20px_60px_rgba(0,0,0,0.15)] border-x-0 sm:border border-gray-300 relative overflow-hidden">
          {/* Contract Content */}
          <div ref={contractRef} className="px-5 sm:px-10 py-8 sm:py-16 text-right relative min-h-[1200px] sm:min-h-[1600px] bg-white">
            {/* Watermark Logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none rotate-[-15deg]">
              <img src="https://k.top4top.io/p_3730t4bzr0.jpeg" alt="" className="w-[300px] sm:w-[700px] mix-blend-multiply" referrerPolicy="no-referrer" />
            </div>

            {/* Document Border Frame */}
            <div className="absolute inset-1 sm:inset-2 border-[1px] border-[#C5A059]/30 pointer-events-none" />
            <div className="absolute inset-2 sm:inset-4 border-[3px] border-[#C5A059]/10 pointer-events-none" />

            {/* Document Header (Letterhead Style) */}
            <div className="relative z-10 mb-4">
              
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 px-2">
                {/* Contract Info Section */}
                <div className="bg-[#fcfaf7] border border-[#C5A059]/20 rounded p-1 sm:p-1.5 space-y-0">
                  <div className="flex justify-between gap-1 whitespace-nowrap">
                    <span className="text-[5px] sm:text-[7px] font-bold text-[#22042C]">رقم ملف العميل: <span className="text-brand font-mono mr-1">{clientFileNumber}</span></span>
                  </div>
                  <div className="flex justify-between gap-1 whitespace-nowrap">
                    <span className="text-[5px] sm:text-[7px] font-bold text-[#22042C]">رقم العقد الموحد: <span className="text-brand font-mono mr-1">{unifiedContractNumber}</span></span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[6px] sm:text-[8px] font-bold text-[#22042C]">تاريخ العقد:</span>
                    <span className="text-[6px] sm:text-[8px] text-brand font-mono">{signatureDate || new Date().toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>

                {/* Company Info Section */}
                <div className="text-left pt-0 sm:pt-1">
                  <img src="https://l.top4top.io/p_3733v1p2d1.png" alt="Rifans Logo" className="h-10 sm:h-14 w-auto" referrerPolicy="no-referrer" />
                </div>
              </div>
              
              <div className="h-[1px] bg-gray-300 w-full mt-4" />
            </div>

            <div className="text-center mb-8 relative z-10">
              <p className="text-[11px] sm:text-[16px] font-black text-[#22042C] bg-[#fcfaf7] border-r-4 border-[#C5A059] py-2 px-4 sm:px-10 inline-block shadow-sm max-w-full">
                {type.includes('جدولة') 
                  ? 'عقد تفويض ومتابعة طلب جدولة منتجات تمويلية' 
                  : 'عقد تفويض ومتابعة طلب إعفاء تمويلي'}
              </p>
            </div>

            <div className="space-y-6 sm:space-y-10 text-right relative z-10">
              <div className="space-y-5 sm:space-y-8 text-[12px] text-[#22042C] leading-[1.6] sm:leading-[1.8]">
                {/* Parties Section */}
                <div className="grid grid-cols-1 gap-4">
                  <section className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                      <h3 className="font-bold text-[13px] text-[#C5A059]">الطرف الأول</h3>
                    </div>
                    <div className="space-y-2 sm:space-y-3 pr-4 border-r-2 border-[#C5A059]/10">
                      <p className="flex items-center gap-2"><span className="font-bold text-[#22042C]">الاسم:</span> <span className="text-[#22042C]/80 text-[12px]">شركة ريفانس المالية</span></p>
                      <p className="flex items-center gap-2"><span className="font-bold text-[#22042C]">الرقم الوطني الموحد:</span> <span className="text-[#22042C]/80 text-[12px]">7038821125</span></p>
                      <p className="flex items-center gap-2"><span className="font-bold text-[#22042C]">ويمثلها:</span> <span className="text-[#22042C]/80 text-[12px]">AZZAH ALOBIDI بصفة المدير العام</span></p>
                    </div>
                    <div className="absolute top-4 left-4 opacity-10">
                      <ShieldCheck size={40} className="text-[#C5A059]" />
                    </div>
                  </section>

                  <section className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                      <h3 className="font-bold text-[13px] text-[#C5A059]">الطرف الثاني</h3>
                    </div>
                    <div className="space-y-3 sm:space-y-4 pr-4 border-r-2 border-[#C5A059]/10 max-w-[400px] text-[12px]">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#22042C] whitespace-nowrap min-w-[80px]">اسم الطرف الثاني:</span>
                        <div className="flex-1 border-b border-gray-200 py-1 text-[#22042C]/80">{fullName}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#22042C] whitespace-nowrap min-w-[80px]">رقم الهوية الوطنية:</span>
                        <div className="flex-1 border-b border-gray-200 py-1 text-[#22042C]/80">{nationalId}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#22042C] whitespace-nowrap min-w-[80px]">رقم الجوال:</span>
                        <div className="flex-1 border-b border-gray-200 py-1 text-[#22042C]/80">{mobile}</div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Preamble */}
                <section className="space-y-1.5">
                  <h3 className="font-bold text-[13px] text-[#C5A059]">التمهيد:</h3>
                  <p className="pr-2 sm:pr-4 text-justify leading-relaxed text-[#22042C]/90">
                    {type.includes('جدولة') ? 
                      "حيث إن الطرف الثاني لديه التزامات مالية قائمة لدى البنوك والجهات التمويلية، وحيث إن الطرف الأول يعد من الجهات المتخصصة ذات الخبرة والكفاءة المهنية العالية في مجال المنازعات المصرفية والتمويلية، ويضم نخبة من اللجان القانونية المؤهلة القادرة على دراسة الطلبات وتدقيق المستندات ومتابعة الإجراءات بشكل رسمي ونظامي مع البنوك والمصارف والجهات التمويلية وكافة الجهات التنظيمية ذات العلاقة؛ وحيث إن الطرف الثاني قد أبدى رغبته الصريحة في التقدم بطلب إعادة جدولة منتجاته التمويلية القائمة؛ وحيث إن هذا التمهيد يُعد جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لبنوده؛ فقد اتفق الطرفان، وهما بكامل الأهلية المعتبرة شرعاً ونظاماً، على إبرام هذا العقد وفقاً لما يلي:" :
                      "حيث إن الطرف الثاني قد تقدم وأفاد بأن لديه عجزاً طبياً مثبتاً بموجب تقارير رسمية صادرة من الجهات الطبية المختصة؛ وحيث إن الطرف الأول يُعد من الجهات المتخصصة ذات الخبرة والكفاءة المهنية العالية في مجال المنازعات المصرفية والتمويلية، ويضم نخبة من اللجان القانونية المؤهلة القادرة على دراسة الطلبات، وتدقيق المستندات والتقارير الطبية، ومتابعة الإجراءات بشكل رسمي ونظامي مع البنوك والمصارف والجهات التمويلية والهيئات الطبية وكافة الجهات التنظيمية ذات العلاقة؛ وحيث إن الطرف الثاني قد أبدى رغبته الصريحة في التقدم بطلب إعفاء من جميع التزاماته التمويلية القائمة لدى البنوك والمصارف؛ وحيث إن الطرف الأول قد أثبت جدارته المهنية من خلال ما يملكه من لجان متخصصة وخبرات عملية في إدارة طلبات العملاء المقدمة إلى الجهات التمويلية، وما حققه من نتائج إيجابية تسهم في حفظ حقوق العملاء وتحقيق مصالحهم؛ وحيث إن هذا التمهيد يُعد جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لبنوده؛ فقد اتفق الطرفان، وهما بكامل الأهلية المعتبرة شرعاً ونظاماً، على إبرام هذا العقد وفقاً لما يلي:"
                    }
                  </p>
                </section>

                <div className="space-y-6 sm:space-y-10">
                  <div className="text-center">
                    {/* Removed specific headers as requested */}
                  </div>
                  
                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (1): حجية التعامل الإلكتروني</h3>
                    <p className="pr-4 sm:pr-6 text-justify">يقر الطرفان بموافقتهما على إبرام هذا العقد واستخدام الوسائل الإلكترونية (البريد الإلكتروني، الرسائل النصية OTP) لتوثيقه، وتعد هذه الوسائل حجة ملزمة وقائمة بذاتها وفقاً لنظام التعاملات الإلكترونية السعودي، ولها ذات الحجية القانونية للتوقيع اليدوي أمام كافة الجهات الرسمية والقضائية.</p>
                  </section>

                  <section className="space-y-4">
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-2 sm:mb-4">المادة (2): موضوع العقد والتفويض</h3>
                    <div className="space-y-10 pr-2 sm:pr-6">
                      <p className="text-justify leading-relaxed">
                        {type.includes('جدولة') ?
                          `يفوض الطرف الثاني بموجب هذا العقد تفويضاً صريحاً ومباشراً وقابلاً للتنفيذ للطرف الأول في استلام وتقديم ومتابعة طلب إعادة جدولة المنتجات التمويلية الخاصة به لدى ${financingInstitutionName}، وذلك فيما يتعلق بمنتجات التمويل الموضحة أدناه:` :
                          `يفوض الطرف الثاني بموجب هذا العقد تفويضاً صريحاً ومباشراً وقابلاً للتنفيذ للطرف الأول في استلام وتقديم ومتابعة طلب الإعفاء المقدم من الطرف الثاني لدى ${financingInstitutionName}، وذلك فيما يتعلق بمنتجات التمويل الموضحة أدناه:`
                        }
                      </p>
                      
                      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm max-w-lg mx-auto">
                        <table className="w-full border-collapse bg-white text-[12px]">
                          <thead>
                            <tr className="bg-gray-50 text-[#C5A059]">
                              <th className="border border-gray-200 p-1.5 text-center align-middle font-bold">الجهة التمويلية</th>
                              <th className="border border-gray-200 p-1.5 text-center align-middle font-bold">نوع المنتج</th>
                              <th className="border border-gray-200 p-1.5 text-center align-middle font-bold">رقم حساب المنتج (إن وجد)</th>
                              <th className="border border-gray-200 p-1.5 text-center align-middle font-bold">المبلغ المتبقي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(allProducts && allProducts.length > 0 ? allProducts : [{ type: productType, accountNumber, amount }]).map((p, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="border border-gray-200 p-1.5 text-center align-middle text-[#22042C]">{financingInstitutionName}</td>
                                <td className="border border-gray-200 p-1.5 text-center align-middle text-[#22042C]">{p.type || p.productType}</td>
                                <td className="border border-gray-200 p-1.5 text-center align-middle text-[#22042C] font-mono">{p.accountNumber}</td>
                                <td className="border border-gray-200 p-1.5 text-center align-middle text-[#22042C] font-bold">{formatAmount(p.amount)} ريال</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#fcfaf7] font-black">
                              <td colSpan={3} className="border border-gray-200 p-2 text-right align-middle text-[#22042C]">إجمالي المديونية لجميع المنتجات:</td>
                              <td className="border border-gray-200 p-2 text-left align-middle text-brand text-[10px] sm:text-[13px]">{formatAmount(amount)} ريال</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (3): نطاق التفويض</h3>
                    <p className="pr-2 sm:pr-6 text-justify">يشمل التفويض الممنوح للطرف الأول الصلاحيات التالية: الاطلاع على التقارير الطبية والمستندات الرسمية، التواصل مع البنوك والجهات التمويلية، رفع الطلبات ومتابعتها، وإعداد المذكرات القانونية والحضور النظامي عند الحاجة.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (4): التزامات الطرف الأول</h3>
                    <p className="pr-2 sm:pr-6 text-justify">يلتزم الطرف الأول بالمحافظة على سرية بيانات الطرف الثاني، بذل أقصى درجات العناية المهنية، رفع الطلبات بصيغة رسمية تعزز فرص القبول، وإبلاغ الطرف الثاني بالمستجدات دورياً.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (5): التزامات الطرف الثاني</h3>
                    <p className="pr-2 sm:pr-6 text-justify">يلتزم الطرف الثاني بتقديم كافة المستندات والبيانات الصحيحة، التعاون مع الطرف الأول لاستكمال النواقص، والالتزام بسداد الأتعاب المستحقة وفقاً لأحكام العقد.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (6): المستحقات المالية والأتعاب</h3>
                    <p className="pr-2 sm:pr-6 text-justify">
                      {type.includes('جدولة') ? 
                        "يلتزم الطرف الثاني بسداد أتعاب الطرف الأول مقدماً عبر رابط الدفع المعتمد. وفي حال عدم تنفيذ طلب إعادة الجدولة لأي سبب كان، يلتزم الطرف الأول بإعادة كامل المبلغ المدفوع للطرف الثاني دون أي استقطاع. وفي حال صدور قرار بالموافقة على إعادة جدولة المنتجات التمويلية وإتمام الإجراءات ذات العلاقة، تُعد الأتعاب المدفوعة مستحقة للطرف الأول، وتكون أتعاباً مقطوعة قدرها: 2,000.00 ريال سعودي فقط." :
                        "لا تستحق أتعاب الطرف الأول إلا بعد صدور قرار الإعفاء النهائي وإصدار خطاب المخالصة المالية. وفي حال صدور القرار، يستحق الطرف الأول أتعاباً مقطوعة قدرها (4%) من إجمالي المبالغ المعفية فعلياً. وفي حال عدم قبول الطلب، لا يحق للطرف الأول المطالبة بأي أتعاب."
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (7): مدة العقد</h3>
                    <p className="pr-2 sm:pr-6 text-justify">
                      {type.includes('جدولة') ?
                        "يبدأ العمل بهذا العقد من تاريخ توقيعه، ويستمر سارياً حتى قبول طلب إعادة الجدولة، ما لم يتم إنهاؤه باتفاق مكتوب بين الطرفين أو وفقاً للأنظمة." :
                        "يبدأ العمل بهذا العقد من تاريخ توقيعه، ويستمر سارياً حتى قبول طلب الإعفاء، ما لم يتم إنهاؤه باتفاق مكتوب بين الطرفين أو وفقاً للأنظمة."
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">
                      {type.includes('جدولة') ? "المادة (8): سند لأمر وإقرار التزام مالي واجب السداد على الطرف الأول" : "المادة (8): سند لأمر وإقرار دين واجب النفاذ"}
                    </h3>
                    <div className="pr-2 sm:pr-6 space-y-8 sm:space-y-10">
                      <p className="text-justify leading-relaxed">
                        {type.includes('جدولة') ?
                          "اتفق الطرفان على أن يُعد هذا العقد بمثابة سندٍ لأمرٍ واجب النفاذ وفقًا لأحكام نظام الأوراق التجارية ونظام التنفيذ السعودي، ويقر الطرف الأول إقرارًا صريحًا ونهائيًا بالتزامه برد كامل المبلغ المدفوع من الطرف الثاني، وذلك في حال عدم تنفيذ طلب إعادة جدولة المنتجات التمويلية لأي سبب كان. ويكون هذا السند مستحق الأداء فور ثبوت عدم تنفيذ الطلب، ويحق للطرف الثاني التقدم به مباشرة إلى الجهات المختصة لاتخاذ إجراءات التنفيذ النظامية دون حاجة إلى إشعار أو إنذار مسبق." :
                          "اتفق الطرفان على أن يُعد هذا العقد بمثابة سندٍ لأمرٍ واجب النفاذ وفقًا لأحكام نظام الأوراق التجارية ونظام التنفيذ السعودي، ويقر الطرف الثاني إقرارًا صريحًا ونهائيًا بالتزامه بسداد أتعاب الطرف الأول بنسبة (4%) من إجمالي مبالغ المنتجات التمويلية التي يتم إعفاؤه منها، وذلك فور قبول طلب الإعفاء واستلام خطاب المخالصة المالية."
                        }
                      </p>
                      <div className="mt-2 sm:mt-4 p-2 sm:p-4 bg-gold/5 border border-gold/20 rounded-xl text-[10px] sm:text-[13px]">
                        <p className="mb-1 sm:mb-2">• رقم السند: <span className="text-brand font-bold">{unifiedContractNumber}</span></p>
                        <p className="mb-1 sm:mb-2">• قيمة السند: <span className="text-brand font-bold">{type.includes('جدولة') ? "2,000.00 ريال سعودي" : "نسبة (4%) من إجمالي مبالغ المنتجات التمويلية المعفاة"}</span></p>
                        <p className="mb-0">• تاريخ الاستحقاق: <span className="text-brand font-bold">{type.includes('جدولة') ? "عند عدم تنفيذ طلب إعادة الجدولة" : "فور قبول طلب الإعفاء واستلام خطاب المخالصة المالية"}</span></p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (9): أحكام عامة</h3>
                    <div className="pr-2 sm:pr-6">
                      <p className="text-justify leading-relaxed">يخضع العقد لأنظمة المملكة العربية السعودية. لا يُعد أي تعديل نافذاً إلا إذا كان مكتوباً وموقعاً من الطرفين.</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (10): الإقرار والتنازل عن الدفوع</h3>
                    <div className="pr-2 sm:pr-6">
                      <p className="text-justify leading-relaxed">
                        {type.includes('جدولة') ?
                          "يُقر الطرفان إقراراً صريحاً ونهائياً بما يلي: 1- صحة جميع البيانات والمستندات المقدمة بموجب هذا العقد، ويتحمل كل طرف مسؤولية ما يخصه منها. 2- صحة استحقاق المبالغ وآلية السداد أو الاسترداد وفق ما ورد في هذا العقد، وبما يتوافق مع تنفيذ أو عدم تنفيذ طلب إعادة الجدولة. 3- التنازل عن أي دفوع أو منازعات تتعلق بسند الأمر. 4- عدم الطعن أو الاعتراض على التنفيذ أمام محكمة التنفيذ إلا في الحدود التي يجيزها النظام. ويشمل هذا الإقرار التزام الطرف الأول برد المبالغ للطرف الثاني في حال عدم تنفيذ طلب إعادة الجدولة، ويعد ذلك التزاماً نهائياً واجب النفاذ." :
                          "يُقر الطرف الثاني إقراراً صريحاً ونهائياً بما يلي: صحة جميع البيانات والمستندات المقدمة منه. صحة احتساب الأتعاب وفق النسبة المتفق عليها. التنازل عن أي دفوع أو منازعات تتعلق بسند الأمر متى ما تم إصداره عبر منصة نافذ وفق أحكام هذا العقد. عدم الطعن أو الاعتراض على التنفيذ أمام محكمة التنفيذ إلا في الحدود التي يجيزها النظام."
                        }
                      </p>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (11): الإقرار والقبول النهائي</h3>
                    <div className="pr-2 sm:pr-6">
                      <p className="text-justify leading-relaxed">يُقر الطرف الثاني بما يلي: اطلاعه الكامل على العقد وفهمه لآثاره، صحة التفويض الممنوح، صحة احتساب الأتعاب، وأن هذا الإقرار حجة قاطعة وملزمة أمام جميع الجهات القضائية والتنفيذية.</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-[13px] text-[#C5A059] mb-1.5 sm:mb-2">المادة (12): التفويض</h3>
                    <div className="pr-2 sm:pr-6">
                      <p className="text-justify leading-relaxed">أقر أنا الموقع أدناه وبكامل أهليتي المعتبرة شرعاً ونظاماً بأنني قد فوضت شركة ريفانس المالية، سجل تجاري رقم 7038821125 تفويضاً كاملاً غير مشروط بمراجعة كافة الجهات الحكومية والخاصة والجهات التمويلية (البنوك والمصارف وشركات التمويل) وشركة المعلومات الائتمانية (سمة)، وذلك للاطلاع على كافة بياناتي الائتمانية والتمويلية والطبية. كما يشمل هذا التفويض حق تقديم طلبات الإعفاء من المديونيات، أو طلبات إعادة الجدولة، أو تسوية الالتزامات واستلام خطابات المخالصة أو قرارات الإعفاء، ومتابعة كافة الإجراءات المتعلقة بملفي لدى البنك المركزي السعودي وكافة اللجان القضائية والرقابية. ويعد هذا التفويض سارياً من تاريخ توقيعه وحتى انتهاء الغرض الذي أعد من أجله أو قيامي بإلغائه رسمياً عبر القنوات المعتمدة لدى الشركة، مع التزامي بكافة النتائج والآثار القانونية المترتبة على هذا التفويض.</p>
                    </div>
                  </section>
                </div>

                {/* Signature Section */}
                <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gold/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12">
                    <div className="text-center">
                      <p className="font-bold text-brand mb-3 sm:mb-4 text-[12px] sm:text-[14px]">توقيع الطرف الأول (المفوض)</p>
                      <div className="h-32 sm:h-48 flex items-center justify-center p-4">
                        <img src={stampBase64 || "https://d.top4top.io/p_3733lj72b1.jpg"} alt="Stamp" className="max-h-full" referrerPolicy="no-referrer" />
                      </div>
                      <p className="mt-2 sm:mt-3 font-bold text-brand text-[12px] sm:text-[14px]">شركة ريفانس المالية</p>
                    </div>

                    <div className="text-center">
                      <p className="font-bold text-brand mb-3 sm:mb-4 text-[12px] sm:text-[14px]">توقيع الطرف الثاني (العميل)</p>
                      <div className="relative h-32 sm:h-40 overflow-hidden group">
                        <SignatureCanvas 
                          ref={sigCanvas}
                          penColor="#003399"
                          canvasProps={{
                            className: "absolute inset-0 w-full h-full cursor-crosshair touch-none",
                          }}
                          onEnd={handleSignatureEnd}
                        />
                        {!isSigned && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted/40 group-hover:text-muted/60 transition-colors">
                            <PenTool size={24} className="mb-2" />
                            <p className="text-[10px] sm:text-[12px]">وقع هنا إلكترونياً</p>
                          </div>
                        )}
                        {isSigned && (
                          <button 
                            onClick={clearSignature}
                            className="absolute top-2 left-2 p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors z-10"
                            title="مسح التوقيع"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <p className="mt-2 sm:mt-3 font-bold text-brand text-[12px] sm:text-[14px]">{fullName}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 sm:mt-12 flex flex-col items-center gap-4">
                  <Button 
                    onClick={handleApprove}
                    disabled={isSubmitting || !isSigned}
                    className="w-full sm:w-auto px-12 py-4 text-lg flex items-center justify-center gap-3 shadow-xl shadow-gold/20"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        جاري الاعتماد...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={24} />
                        اعتماد وتوقيع العقد
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] sm:text-[12px] text-muted text-center max-w-md">
                    بالضغط على "اعتماد وتوقيع العقد"، فإنك تقر بموافقتك الكاملة على كافة بنود العقد وتفويض شركة ريفانس المالية بمتابعة طلبك.
                  </p>
                </div>

                {/* Footer Bar */}
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <p className="text-[7px] sm:text-[9px] text-muted text-center mb-0">صفحه 1 من 2</p>
                  <div className="bg-[#22042C] text-white py-1.5 px-4 flex flex-wrap justify-around items-center gap-1 text-[5px] sm:text-[7px]">
                    <span>سجل تجاري : 7038821125</span>
                    <span>المملكة العربية السعودية - الطائف</span>
                    <span>8002440432</span>
                    <span>info@rifans.net</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden PDF Template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', pointerEvents: 'none' }}>
        <div ref={pdfTemplateRef} className="bg-white text-right dir-rtl" style={{ fontFamily: 'Tajawal, sans-serif', fontSize: '12px', color: '#22042C' }}>
          
          {/* Page 1 */}
          <div style={{ width: '210mm', height: '297mm', padding: '10mm', position: 'relative', backgroundColor: 'white', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              {/* Info Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6mm' }}>
                <div style={{ padding: '1.5mm', border: '1px solid #C5A059', borderRadius: '6px', backgroundColor: '#fcfaf7', minWidth: '35mm', textAlign: 'right' }}>
                  <p style={{ margin: '0.3mm 0', fontSize: '7.5px', fontWeight: 'bold' }}>رقم ملف العميل : <span style={{ color: '#C5A059' }}>{clientFileNumber}</span></p>
                  <p style={{ margin: '0.3mm 0', fontSize: '7.5px', fontWeight: 'bold' }}>رقم العقد الموحد : <span style={{ color: '#C5A059' }}>{unifiedContractNumber}</span></p>
                  <p style={{ margin: '0.3mm 0', fontSize: '7.5px', fontWeight: 'bold' }}>تاريخ العقد : <span style={{ color: '#C5A059' }}>{signatureDate || new Date().toLocaleDateString('ar-SA')}</span></p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <img src={logoBase64 || "https://wsrv.nl/?url=https://l.top4top.io/p_3733v1p2d1.png"} alt="Rifans Logo" style={{ height: '14mm', width: 'auto' }} referrerPolicy="no-referrer" crossOrigin="anonymous" />
                </div>
              </div>

              {/* Watermark */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: '0.05', pointerEvents: 'none', zIndex: '0' }}>
                <img src={watermarkBase64 || "https://wsrv.nl/?url=https://k.top4top.io/p_3730t4bzr0.jpeg"} alt="" style={{ width: '150mm' }} referrerPolicy="no-referrer" crossOrigin="anonymous" />
              </div>

              <div style={{ borderBottom: '1.5px solid #C5A059', paddingBottom: '2mm', marginBottom: '4mm', textAlign: 'center', position: 'relative', zIndex: '1' }}>
                <h1 style={{ fontSize: '15px', fontWeight: '900', color: '#22042C', margin: 0 }}>
                  {type.includes('جدولة') 
                    ? "عقد تفويض ومتابعة طلب جدولة منتجات تمويلية" 
                    : "عقد تفويض ومتابعة طلب إعفاء تمويلي"}
                </h1>
              </div>

            {/* Parties Table */}
            <div style={{ marginBottom: '3mm' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2mm', color: '#C5A059' }}>بيانات أطراف العقد :</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '2mm', backgroundColor: '#f9f9f9', fontWeight: 'bold', width: '20%', color: '#C5A059' }}>الطرف الأول</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm', width: '30%', fontWeight: 'bold' }}>شركة ريفانس المالية</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm', backgroundColor: '#f9f9f9', fontWeight: 'bold', width: '20%', color: '#C5A059' }}>الطرف الثاني</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm', width: '30%', fontWeight: 'bold' }}>{fullName}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '2mm', backgroundColor: '#f9f9f9', fontWeight: 'bold', color: '#C5A059' }}>الرقم الموحد</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm' }}>7038821125</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm', backgroundColor: '#f9f9f9', fontWeight: 'bold', color: '#C5A059' }}>رقم الهوية</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm' }}>{nationalId}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '2mm', backgroundColor: '#f9f9f9', fontWeight: 'bold', color: '#C5A059' }}>الشخص المفوض</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm' }}>AZZAH ALOBIDI</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm', backgroundColor: '#f9f9f9', fontWeight: 'bold', color: '#C5A059' }}>رقم الجوال</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm' }}>{mobile}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Preamble */}
            <div style={{ marginBottom: '3mm' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2mm', color: '#C5A059' }}>التمهيد :</h3>
              <p style={{ fontSize: '12px', lineHeight: '1.5', textAlign: 'justify', color: '#333' }}>
                {type.includes('جدولة') ? 
                  "حيث إن الطرف الثاني لديه التزامات مالية قائمة لدى البنوك والجهات التمويلية، وحيث إن الطرف الأول يعد من الجهات المتخصصة ذات الخبرة والكفاءة المهنية العالية في مجال المنازعات المصرفية والتمويلية، ويضم نخبة من اللجان القانونية المؤهلة القادرة على دراسة الطلبات وتدقيق المستندات ومتابعة الإجراءات بشكل رسمي ونظامي مع البنوك والمصارف والجهات التمويلية وكافة الجهات التنظيمية ذات العلاقة؛ وحيث إن الطرف الثاني قد أبدى رغبته الصريحة في التقدم بطلب إعادة جدولة منتجاته التمويلية القائمة؛ وحيث إن هذا التمهيد يُعد جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لبنوده؛ فقد اتفق الطرفان، وهما بكامل الأهلية المعتبرة شرعاً ونظاماً، على إبرام هذا العقد وفقاً لما يلي:" :
                  "حيث إن الطرف الثاني قد تقدم وأفاد بأن لديه عجزاً طبياً مثبتاً بموجب تقارير رسمية صادرة من الجهات الطبية المختصة؛ وحيث إن الطرف الأول يُعد من الجهات المتخصصة ذات الخبرة والكفاءة المهنية العالية في مجال المنازعات المصرفية والتمويلية، ويضم نخبة من اللجان القانونية المؤهلة القادرة على دراسة الطلبات، وتدقيق المستندات والتقارير الطبية، ومتابعة الإجراءات بشكل رسمي ونظامي مع البنوك والمصارف والجهات التمويلية والهيئات الطبية وكافة الجهات التنظيمية ذات العلاقة؛ وحيث إن الطرف الثاني قد أبدى رغبته الصريحة في التقدم بطلب إعفاء من جميع التزاماته التمويلية القائمة لدى البنوك والمصارف؛ وحيث إن الطرف الأول قد أثبت جدارته المهنية من خلال ما يملكه من لجان متخصصة وخبرات عملية في إدارة طلبات العملاء المقدمة إلى الجهات التمويلية، وما حققه من نتائج إيجابية تسهم في حفظ حقوق العملاء وتحقيق مصالحهم؛ وحيث إن هذا التمهيد يُعد جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لبنوده؛ فقد اتفق الطرفان، وهما بكامل الأهلية المعتبرة شرعاً ونظاماً، على إبرام هذا العقد وفقاً لما يلي:"
                }
              </p>
            </div>

            {/* Articles */}
            <div style={{ marginBottom: '2mm' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (1) : حجية التعامل الإلكتروني</h3>
              <p style={{ fontSize: '12px', lineHeight: '1.4', textAlign: 'justify', color: '#333' }}>يقر الطرفان بموافقتهما على إبرام هذا العقد واستخدام الوسائل الإلكترونية (البريد الإلكتروني، الرسائل النصية OTP) لتوثيقه، وتعد هذه الوسائل حجة ملزمة وقائمة بذاتها وفقاً لنظام التعاملات الإلكترونية السعودي، ولها ذات الحجية القانونية للتوقيع اليدوي أمام كافة الجهات الرسمية والقضائية.</p>
            </div>

            <div style={{ marginBottom: '2mm' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (2) : موضوع العقد والتفويض</h3>
              <p style={{ fontSize: '12px', lineHeight: '1.4', textAlign: 'justify', marginBottom: '10mm', color: '#333' }}>
                {type.includes('جدولة') ?
                  `يفوض الطرف الثاني بموجب هذا العقد تفويضاً صريحاً ومباشراً وقابلاً للتنفيذ للطرف الأول في استلام وتقديم ومتابعة طلب إعادة جدولة المنتجات التمويلية الخاصة به لدى ${financingInstitutionName}، وذلك فيما يتعلق بمنتجات التمويل الموضحة أدناه:` :
                  `يفوض الطرف الثاني بموجب هذا العقد تفويضاً صريحاً ومباشراً وقابلاً للتنفيذ للطرف الأول في استلام وتقديم ومتابعة طلب الإعفاء المقدم من الطرف الثاني لدى ${financingInstitutionName}، وذلك فيما يتعلق بمنتجات التمويل الموضحة أدناه:`
                }
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fcfaf7', color: '#C5A059' }}>
                    <th style={{ border: '1px solid #ddd', padding: '1.5mm', textAlign: 'center' }}>الجهة التمويلية</th>
                    <th style={{ border: '1px solid #ddd', padding: '1.5mm', textAlign: 'center' }}>نوع المنتج</th>
                    <th style={{ border: '1px solid #ddd', padding: '1.5mm', textAlign: 'center' }}>رقم حساب المنتج</th>
                    <th style={{ border: '1px solid #ddd', padding: '1.5mm', textAlign: 'center' }}>المبلغ المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {(allProducts && allProducts.length > 0 ? allProducts : [{ type: productType, accountNumber, amount }]).map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #ddd', padding: '1.5mm', textAlign: 'center' }}>{financingInstitutionName}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1.5mm', textAlign: 'center' }}>{p.type || p.productType}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1.5mm', textAlign: 'center' }}>{p.accountNumber}</td>
                      <td style={{ border: '1px solid #ddd', padding: '1.5mm', textAlign: 'center', fontWeight: 'bold' }}>{formatAmount(p.amount)} ريال</td>
                    </tr>
                  ))}
                  {[...Array(Math.max(0, 3 - (allProducts?.length || 1)))].map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td style={{ border: '1px solid #ddd', padding: '1.5mm', height: '5mm' }}></td>
                      <td style={{ border: '1px solid #ddd', padding: '1.5mm' }}></td>
                      <td style={{ border: '1px solid #ddd', padding: '1.5mm' }}></td>
                      <td style={{ border: '1px solid #ddd', padding: '1.5mm' }}></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#fcfaf7', fontWeight: 'bold' }}>
                    <td colSpan={3} style={{ border: '1px solid #ddd', padding: '2mm', textAlign: 'right' }}>إجمالي المديونية لجميع المنتجات:</td>
                    <td style={{ border: '1px solid #ddd', padding: '2mm', textAlign: 'left', color: '#C5A059' }}>{formatAmount(amount)} ريال</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ fontSize: '12px', lineHeight: '1.4', textAlign: 'justify', color: '#333' }}>
              <div style={{ marginBottom: '2.5mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (3) : نطاق التفويض</h3>
                <p>يشمل التفويض الممنوح للطرف الأول الصلاحيات التالية: الاطلاع على التقارير الطبية والمستندات الرسمية، التواصل مع البنوك والجهات التمويلية، رفع الطلبات ومتابعتها، وإعداد المذكرات القانونية والحضور النظامي عند الحاجة.</p>
              </div>

              <div style={{ marginBottom: '2mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (4) : التزامات الطرف الأول</h3>
                <p>يلتزم الطرف الأول بالمحافظة على سرية بيانات الطرف الثاني، بذل أقصى درجات العناية المهنية، رفع الطلبات بصيغة رسمية تعزز فرص القبول، وإبلاغ الطرف الثاني بالمستجدات دورياً.</p>
              </div>

              <div style={{ marginBottom: '2mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (5) : التزامات الطرف الثاني</h3>
                <p>يلتزم الطرف الثاني بتقديم كافة المستندات والبيانات الصحيحة، التعاون مع الطرف الأول لاستكمال النواقص، والالتزام بسداد الأتعاب المستحقة وفقاً لأحكام العقد.</p>
              </div>

              <div style={{ marginBottom: '2mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (6) : المستحقات المالية والأتعاب</h3>
                <p>
                  {type.includes('جدولة') ? 
                    "يلتزم الطرف الثاني بسداد أتعاب الطرف الأول مقدماً عبر رابط الدفع المعتمد. وفي حال عدم تنفيذ طلب إعادة الجدولة لأي سبب كان، يلتزم الطرف الأول بإعادة كامل المبلغ المدفوع للطرف الثاني دون أي استقطاع. وفي حال صدور قرار بالموافقة على إعادة جدولة المنتجات التمويلية وإتمام الإجراءات ذات العلاقة، تُعد الأتعاب المدفوعة مستحقة للطرف الأول، وتكون أتعاباً مقطوعة قدرها: 2,000.00 ريال سعودي فقط." :
                    "لا تستحق أتعاب الطرف الأول إلا بعد صدور قرار الإعفاء النهائي وإصدار خطاب المخالصة المالية. وفي حال صدور القرار، يستحق الطرف الأول أتعاباً مقطوعة قدرها (4%) من إجمالي المبالغ المعفية فعلياً. وفي حال عدم قبول الطلب، لا يحق للطرف الأول المطالبة بأي أتعاب."
                  }
                </p>
              </div>
            </div>
          </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', marginBottom: '1.5mm', color: '#999' }}>صفحه 1 من 2</p>
              <div style={{ backgroundColor: '#22042C', color: 'white', padding: '3mm 2mm', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <span style={{ fontSize: '9px' }}>سجل تجاري : 7038821125</span>
                <span style={{ fontSize: '9px' }}>المملكة العربية السعودية - الطائف</span>
                <span style={{ fontSize: '9px' }}>8002440432</span>
                <span style={{ fontSize: '9px' }}>info@rifans.net</span>
              </div>
            </div>
          </div>

          {/* Page 2 */}
          <div style={{ width: '210mm', height: '297mm', padding: '10mm', position: 'relative', backgroundColor: 'white', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              {/* Info Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6mm' }}>
                <div style={{ padding: '1.5mm', border: '1px solid #C5A059', borderRadius: '6px', backgroundColor: '#fcfaf7', minWidth: '35mm', textAlign: 'right' }}>
                  <p style={{ margin: '0.3mm 0', fontSize: '7.5px', fontWeight: 'bold' }}>رقم ملف العميل : <span style={{ color: '#C5A059' }}>{clientFileNumber}</span></p>
                  <p style={{ margin: '0.3mm 0', fontSize: '7.5px', fontWeight: 'bold' }}>رقم العقد الموحد : <span style={{ color: '#C5A059' }}>{unifiedContractNumber}</span></p>
                  <p style={{ margin: '0.3mm 0', fontSize: '7.5px', fontWeight: 'bold' }}>تاريخ العقد : <span style={{ color: '#C5A059' }}>{signatureDate || new Date().toLocaleDateString('ar-SA')}</span></p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <img src={logoBase64 || "https://wsrv.nl/?url=https://l.top4top.io/p_3733v1p2d1.png"} alt="Rifans Logo" style={{ height: '14mm', width: 'auto' }} referrerPolicy="no-referrer" crossOrigin="anonymous" />
                </div>
              </div>

              {/* Watermark */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: '0.05', pointerEvents: 'none', zIndex: '0' }}>
                <img src={watermarkBase64 || "https://wsrv.nl/?url=https://k.top4top.io/p_3730t4bzr0.jpeg"} alt="" style={{ width: '150mm' }} referrerPolicy="no-referrer" crossOrigin="anonymous" />
              </div>

              <div style={{ fontSize: '12px', lineHeight: '1.4', textAlign: 'justify', color: '#333', position: 'relative', zIndex: '1' }}>
              <div style={{ marginBottom: '3mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (7) : مدة العقد</h3>
                <p>
                  {type.includes('جدولة') ?
                    "يبدأ العمل بهذا العقد من تاريخ توقيعه، ويستمر سارياً حتى قبول طلب إعادة الجدولة، ما لم يتم إنهاؤه باتفاق مكتوب بين الطرفين أو وفقاً للأنظمة." :
                    "يبدأ العمل بهذا العقد من تاريخ توقيعه، ويستمر سارياً حتى قبول طلب الإعفاء، ما لم يتم إنهاؤه باتفاق مكتوب بين الطرفين أو وفقاً للأنظمة."
                  }
                </p>
              </div>

              <div style={{ marginBottom: '3mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>
                  {type.includes('جدولة') ? "المادة (8) : سند لأمر وإقرار التزام مالي" : "المادة (8) : سند لأمر وإقرار دين واجب النفاذ"}
                </h3>
                <p style={{ marginBottom: '10mm' }}>
                  {type.includes('جدولة') ?
                    "اتفق الطرفان على أن يُعد هذا العقد بمثابة سندٍ لأمرٍ واجب النفاذ وفقًا لأحكام نظام الأوراق التجارية ونظام التنفيذ السعودي، ويقر الطرف الأول إقرارًا صريحًا ونهائيًا بالتزامه برد كامل المبلغ المدفوع من الطرف الثاني، وذلك في حال عدم تنفيذ طلب إعادة جدولة المنتجات التمويلية لأي سبب كان." :
                    "اتفق الطرفان على أن يُعد هذا العقد بمثابة سندٍ لأمرٍ واجب النفاذ وفقًا لأحكام نظام الأوراق التجارية ونظام التنفيذ السعودي، ويقر الطرف الثاني إقرارًا صريحًا ونهائيًا بالتزامه بسداد أتعاب الطرف الأول بنسبة (4%) من إجمالي مبالغ المنتجات التمويلية التي يتم إعفاؤه منها."
                  }
                </p>
                <div style={{ padding: '2mm', backgroundColor: '#fcfaf7', border: '1px solid #C5A059', borderRadius: '6px' }}>
                  <p style={{ margin: '0.5mm 0', fontWeight: 'bold', fontSize: '10px' }}>رقم السند : <span style={{ color: '#C5A059' }}>{unifiedContractNumber}</span></p>
                  <p style={{ margin: '0.5mm 0', fontWeight: 'bold', fontSize: '10px' }}>قيمة السند : <span style={{ color: '#C5A059' }}>{type.includes('جدولة') ? "2,000.00 ريال سعودي" : "نسبة (4%) من إجمالي المبالغ المعفاة"}</span></p>
                  <p style={{ margin: '0.5mm 0', fontWeight: 'bold', fontSize: '10px' }}>تاريخ الإستحقاق : <span style={{ color: '#C5A059' }}>{type.includes('جدولة') ? "عند عدم تنفيذ طلب إعادة الجدولة" : "فور قبول طلب الإعفاء"}</span></p>
                </div>
              </div>

              <div style={{ marginBottom: '3mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (9) : أحكام عامة</h3>
                <p>يخضع العقد لأنظمة المملكة العربية السعودية. لا يُعد أي تعديل نافذاً إلا إذا كان مكتوباً وموقعاً من الطرفين.</p>
              </div>

              <div style={{ marginBottom: '3mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (10) : الإقرار والتنازل عن الدفوع</h3>
                <p>
                  {type.includes('جدولة') ?
                    "يُقر الطرفان إقراراً صريحاً ونهائياً بصحة جميع البيانات والمستندات المقدمة بموجب هذا العقد، والتنازل عن أي دفوع أو منازعات تتعلق بسند الأمر، وعدم الاعتراض على التنفيذ أمام محكمة التنفيذ إلا في الحدود التي يجيزها النظام." :
                    "يُقر الطرف الثاني إقراراً صريحاً ونهائياً بصحة جميع البيانات والمستندات المقدمة منه، وصحة احتساب الأتعاب، والتنازل عن أي دفوع أو منازعات تتعلق بسند الأمر، وعدم الاعتراض على التنفيذ أمام محكمة التنفيذ إلا في الحدود التي يجيزها النظام."
                  }
                </p>
              </div>

              <div style={{ marginBottom: '3mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (11) : الإقرار والقبول النهائي</h3>
                <p>يُقر الطرف الثاني باطلاعه الكامل على العقد وفهمه لآثاره، وصحة التفويض الممنوح، وصحة احتساب الأتعاب، وأن هذا الإقرار حجة قاطعة وملزمة أمام جميع الجهات القضائية والتنفيذية.</p>
              </div>

              <div style={{ marginBottom: '4mm' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1mm', color: '#C5A059' }}>المادة (12) : التفويض</h3>
                <p style={{ fontSize: '12px', lineHeight: '1.3' }}>أقر أنا الموقع أدناه وبكامل أهليتي المعتبرة شرعاً ونظاماً بأنني قد فوضت شركة ريفانس المالية، سجل تجاري رقم 7038821125 تفويضاً كاملاً غير مشروط بمراجعة كافة الجهات الحكومية والخاصة والجهات التمويلية (البنوك والمصارف وشركات التمويل) وشركة المعلومات الائتمانية (سمة)، وذلك للاطلاع على كافة بياناتي الائتمانية والتمويلية والطبية. كما يشمل هذا التفويض حق تقديم طلبات الإعفاء من المديونيات، أو طلبات إعادة الجدولة، أو تسوية الالتزامات واستلام خطابات المخالصة أو قرارات الإعفاء، ومتابعة كافة الإجراءات المتعلقة بملفي لدى البنك المركزي السعودي وكافة اللجان القضائية والرقابية.</p>
              </div>

              <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '3mm', color: '#22042C', textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: '1.5mm' }}>توقيع واعتماد أطراف العقد</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '2mm', color: '#C5A059', fontSize: '11px' }}>الطرف الأول (المفوض)</p>
                  <div style={{ height: '35mm', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1mm' }}>
                    <img 
                      src={stampBase64 || "https://wsrv.nl/?url=https://d.top4top.io/p_3733lj72b1.jpg"} 
                      alt="Stamp" 
                      style={{ maxHeight: '100%', maxWidth: '100%', display: 'block', objectFit: 'contain' }} 
                      referrerPolicy="no-referrer" 
                      crossOrigin="anonymous" 
                    />
                  </div>
                  <p style={{ marginTop: '1.5mm', fontWeight: 'bold', fontSize: '11px' }}>شركة ريفانس المالية</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '2mm', color: '#C5A059', fontSize: '11px' }}>الطرف الثاني (العميل)</p>
                  <div style={{ height: '24mm', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1mm' }}>
                    {signatureImgUrl ? (
                      <img src={signatureImgUrl} alt="Signature" style={{ maxHeight: '100%' }} referrerPolicy="no-referrer" />
                    ) : (
                      <span style={{ color: '#ccc', fontSize: '11px' }}>بانتظار التوقيع الإلكتروني</span>
                    )}
                  </div>
                  <p style={{ marginTop: '1.5mm', fontWeight: 'bold', fontSize: '11px' }}>{fullName}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', marginBottom: '1.5mm', color: '#999' }}>صفحه 2 من 2</p>
              <div style={{ backgroundColor: '#22042C', color: 'white', padding: '3mm 2mm', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <span style={{ fontSize: '9px' }}>سجل تجاري : 7038821125</span>
                <span style={{ fontSize: '9px' }}>المملكة العربية السعودية - الطائف</span>
                <span style={{ fontSize: '9px' }}>8002440432</span>
                <span style={{ fontSize: '9px' }}>info@rifans.net</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showSuccessModal && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 dir-rtl" style={{ pointerEvents: 'auto' }}>
          <div 
            className="bg-white rounded-[24px] border border-gold shadow-2xl p-6 max-w-sm w-full text-center relative"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h2 className="text-[18px] font-extrabold text-brand mb-2">تم اعتماد العقد بنجاح</h2>
            <p className="text-[12px] text-muted mb-6">
              شكراً لك {fullName}. تم توقيع العقد واعتماده للطلب رقم {clientFileNumber}.
            </p>
            
            <div className="flex flex-col gap-3 mb-4">
              <button 
                type="button"
                onClick={(e) => {
                  console.log("Download button clicked");
                  if (pdfUrl) {
                    try {
                      const link = document.createElement('a');
                      link.href = pdfUrl;
                      link.download = `contract_${clientFileNumber}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      setTimeout(() => document.body.removeChild(link), 100);
                    } catch (err) {
                      console.error("Download error:", err);
                      window.open(pdfUrl, '_blank');
                    }
                  } else {
                    alert('جاري تجهيز ملف العقد، يرجى المحاولة بعد ثوانٍ...');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-full border border-gold/30 bg-gold/5 text-brand font-bold text-[13px] hover:bg-gold/10 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Download size={18} />
                تحميل العقد (PDF)
              </button>
            </div>
            
            <button 
              type="button"
              onClick={() => {
                console.log("Home button clicked");
                navigateToHome();
              }}
              className="w-full py-2.5 text-sm flex items-center justify-center gap-2 bg-gold-gradient text-brand shadow-md border border-transparent rounded-full font-bold cursor-pointer transition-transform active:scale-95 whitespace-nowrap"
            >
              <ArrowRight size={16} />
              العودة للرئيسية
            </button>
          </div>
        </div>
      )}
      <Footer />
    </div>
  </div>
);
};

export default ContractPage;
