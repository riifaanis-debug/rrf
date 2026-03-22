import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle, Download, Printer, ShieldCheck, PenTool, ArrowRight } from 'lucide-react';
import { Button } from './Shared';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureData: string) => void;
  userData: {
    fullName: string;
    nationalId: string;
    mobile: string;
    email: string;
  };
  contractId: string;
  type?: string;
}

const ContractModal: React.FC<ContractModalProps> = ({ isOpen, onClose, onSign, userData, contractId, type = 'طلب إعفاء / جدولة' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [stampBase64, setStampBase64] = useState<string | null>(null);

  useEffect(() => {
    const loadStamp = async () => {
      try {
        const response = await fetch('https://wsrv.nl/?url=https://d.top4top.io/p_3733lj72b1.jpg');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setStampBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("Failed to pre-load stamp:", err);
      }
    };
    loadStamp();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0000FF';
      }
      
      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = 150;
          if (ctx) {
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#0000FF';
          }
        }
      };
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [isOpen]);

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
    
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleSignSubmit = async () => {
    if (!hasSignature) {
      alert('يرجى التوقيع أولاً');
      return;
    }
    
    setIsSubmitting(true);
    const signatureData = canvasRef.current?.toDataURL();
    if (signatureData) {
      await onSign(signatureData);
      setIsSuccess(true);
    }
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-[#22042C]/95 backdrop-blur-md flex items-center justify-center p-0 overflow-hidden antialiased">
      <div className="bg-[#fcfaf7] w-full h-full flex flex-col overflow-hidden border-none" dir="rtl">
        
        {/* Top Navigation Bar */}
        <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#22042C] rounded-lg flex items-center justify-center shadow-lg shadow-brand/20">
              <ShieldCheck className="text-[#C5A059]" size={18} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-[#22042C] font-['Tajawal']">بوابة توقيع العقود الإلكترونية</h2>
              <p className="text-[9px] text-muted font-medium">عقد رقم: {contractId}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button className="p-2 text-muted hover:text-brand hover:bg-gray-50 rounded-lg transition-all" title="طباعة">
              <Printer size={18} />
            </button>
            <button className="p-2 text-muted hover:text-brand hover:bg-gray-50 rounded-lg transition-all" title="تحميل">
              <Download size={18} />
            </button>
            <div className="w-px h-5 bg-gray-100 mx-0.5" />
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center bg-gray-50 text-muted hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#f0f0f0] p-2 sm:p-4">
          <div className="max-w-3xl mx-auto bg-white shadow-xl border border-gray-200 relative overflow-hidden font-['Tajawal'] min-h-screen flex flex-col">
            
            {/* Purple Header like in the image */}
            <div className="bg-[#22042C] text-white p-4 flex items-center justify-between sticky top-0 z-20">
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                <PenTool size={16} />
              </button>
              <h2 className="text-[18px] font-bold">عرض العقد</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-8 flex-1 relative">
              {/* Watermark Logo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none rotate-[-15deg] z-0">
                <img src="https://k.top4top.io/p_3730t4bzr0.jpeg" alt="" className="w-[500px] mix-blend-multiply" referrerPolicy="no-referrer" />
              </div>

              {/* Document Header */}
              <div className="flex flex-col items-start mb-8 relative z-10 text-right">
                <div className="w-full flex justify-end mb-4">
                  <img 
                    src="https://k.top4top.io/p_3730t4bzr0.jpeg" 
                    alt="Rifans Logo" 
                    className="h-16 mix-blend-multiply" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                
                <div className="w-full space-y-1">
                  <p className="text-[#C5A059] font-bold text-[14px]">شركة ريفانس المالية</p>
                  <div className="inline-block bg-[#fcfaf7] border-b-2 border-[#C5A059] px-4 py-1">
                    <h1 className="text-[16px] font-black text-[#22042C]">عقد تفويض ومتابعة طلب إعفاء تمويلي</h1>
                  </div>
                  
                  <div className="mt-4 space-y-1 text-[13px] font-bold text-[#22042C]">
                    <p>رقم ملف العميل: <span className="text-muted font-normal">________________</span></p>
                    <p>رقم العقد الموحد: <span className="text-muted font-normal">________________</span></p>
                    <p>تاريخ الإصدار: <span className="text-muted font-normal">{new Date().toLocaleDateString('ar-SA')}</span></p>
                  </div>
                </div>
              </div>

              {/* Contract Body */}
              <div className="space-y-6 text-right relative z-10">
                <div className="space-y-6 text-[13px] text-[#22042C] leading-relaxed">
                  
                  {/* Parties Section */}
                  <div className="border border-[#C5A059]/20 rounded-xl p-4 bg-[#fcfaf7]/50 space-y-4">
                    <section>
                      <h3 className="font-bold text-[#C5A059] mb-1 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                        الطرف الأول
                      </h3>
                      <div className="pr-4 space-y-0.5 text-[12px]">
                        <p><strong>الاسم:</strong> شركة ريفانس المالية</p>
                        <p><strong>الرقم الوطني الموحد:</strong> 7038821125</p>
                        <p><strong>ويمثلها:</strong> AZZAH ALOBIDI بصفة المدير العام</p>
                      </div>
                    </section>

                    <div className="h-px bg-[#C5A059]/10" />

                    <section>
                      <h3 className="font-bold text-[#C5A059] mb-1 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                        الطرف الثاني
                      </h3>
                      <div className="pr-4 space-y-0.5 text-[12px]">
                        <p><strong>اسم العميل:</strong> {userData.fullName || '________________'}</p>
                        <p><strong>رقم الهوية:</strong> {userData.nationalId || '________________'}</p>
                        <p><strong>رقم الجوال:</strong> {userData.mobile || '________________'}</p>
                      </div>
                    </section>
                  </div>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-2 text-[15px]">التمهيد</h3>
                    <p className="text-justify opacity-90">
                      حيث إن الطرف الثاني قد تقدم وأفاد بأن لديه عجزاً طبياً مثبتاً بموجب تقارير رسمية صادرة من الجهات الطبية المختصة؛ وحيث إن الطرف الأول يُعد من الجهات المتخصصة ذات الخبرة والكفاءة المهنية العالية في مجال المنازعات المصرفية والتمويلية، ويضم نخبة من اللجان القانونية المؤهلة القادرة على دراسة الطلبات، وتدقيق المستندات والتقارير الطبية، ومتابعة الإجراءات بشكل رسمي ونظامي مع البنوك والمصارف والجهات التمويلية والهيئات الطبية وكافة الجهات التنظيمية ذات العلاقة؛ وحيث إن الطرف الثاني قد أبدى رغبته الصريحة في التقدم بطلب إعفاء من جميع التزاماته التمويلية القائمة لدى البنوك والمصارف؛ وحيث إن الطرف الأول قد أثبت جدارته المهنية من خلال ما يملكه من لجان متخصصة وخبرات عملية في إدارة طلبات العملاء المقدمة إلى الجهات التمويلية، وما حققه من نتائج إيجابية تسهم في حفظ حقوق العملاء وتحقيق مصالحهم؛ وحيث إن هذا التمهيد يُعد جزءاً لا يتجزأ من هذا العقد ومكملاً ومفسراً لبنوده؛ فقد اتفق الطرفان، وهما بكامل الأهلية المعتبرة شرعاً ونظاماً، على إبرام هذا العقد وفقاً لما يلي:
                    </p>
                  </section>

                  <div className="text-center py-2">
                    <span className="text-[14px] font-bold text-[#22042C] border-b-2 border-[#C5A059] px-6">بنود العقد التفصيلية</span>
                  </div>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (1): حجية التعامل الإلكتروني</h3>
                    <p className="text-justify">يقر الطرفان بموافقتهما على إبرام هذا العقد واستخدام الوسائل الإلكترونية (البريد الإلكتروني، الرسائل النصية OTP) لتوثيقه، وتعد هذه الوسائل حجة ملزمة وقائمة بذاتها وفقاً لنظام التعاملات الإلكترونية السعودي، ولها ذات الحجية القانونية للتوقيع اليدوي أمام كافة الجهات الرسمية والقضائية.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (2): موضوع العقد والتفويض</h3>
                    <p className="text-justify mb-3">يفوض الطرف الثاني بموجب هذا العقد تفويضاً صريحاً ومباشراً وقابلاً للتنفيذ للطرف الأول في استلام وتقديم ومتابعة طلب الإعفاء المقدم من الطرف الثاني لدى البنك الأهلي السعودي (SNB)، وذلك فيما يتعلق بمنتجات التمويل الموضحة أدناه:</p>
                    <div className="border border-gray-200 rounded-lg overflow-hidden text-[11px] max-w-[280px] mx-auto">
                      <div className="grid grid-cols-2 border-b border-gray-100">
                        <div className="p-1.5 bg-gray-50 font-bold border-l border-gray-100">اسم الجهة التمويلية</div>
                        <div className="p-1.5">________________</div>
                      </div>
                      <div className="grid grid-cols-2 border-b border-gray-100">
                        <div className="p-1.5 bg-gray-50 font-bold border-l border-gray-100">نوع المنتج</div>
                        <div className="p-1.5">________________</div>
                      </div>
                      <div className="grid grid-cols-2 border-b border-gray-100">
                        <div className="p-1.5 bg-gray-50 font-bold border-l border-gray-100">رقم الحساب</div>
                        <div className="p-1.5">________________</div>
                      </div>
                      <div className="grid grid-cols-2 border-b border-gray-100">
                        <div className="p-1.5 bg-gray-50 font-bold border-l border-gray-100">المبلغ</div>
                        <div className="p-1.5">________________</div>
                      </div>
                      <div className="p-1.5 bg-[#22042C] text-white font-bold flex justify-between">
                        <span>إجمالي المديونية:</span>
                        <span>________________</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (3): نطاق التفويض</h3>
                    <p className="text-justify">يشمل التفويض الممنوح للطرف الأول الصلاحيات التالية: الاطلاع على التقارير الطبية والمستندات الرسمية، التواصل مع البنوك والجهات التمويلية، رفع الطلبات ومتابعتها، وإعداد المذكرات القانونية والحضور النظامي عند الحاجة.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (4): التزامات الطرف الأول</h3>
                    <p className="text-justify">يلتزم الطرف الأول بالمحافظة على سرية بيانات الطرف الثاني، بذل أقصى درجات العناية المهنية، رفع الطلبات بصيغة رسمية تعزز فرص القبول، وإبلاغ الطرف الثاني بالمستجدات دورياً.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (5): التزامات الطرف الثاني</h3>
                    <p className="text-justify">يلتزم الطرف الثاني بتقديم كافة المستندات والبيانات الصحيحة، التعاون مع الطرف الأول لاستكمال النواقص، والالتزام بسداد الأتعاب المستحقة وفقاً لأحكام العقد.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (6): المستحقات المالية والأتعاب</h3>
                    <p className="text-justify">
                      {type.includes('جدولة') ? 
                        "يلتزم الطرف الثاني بسداد أتعاب الطرف الأول مقدماً عبر رابط الدفع المعتمد. وفي حال عدم تنفيذ طلب إعادة الجدولة لأي سبب كان، يلتزم الطرف الأول بإعادة كامل المبلغ المدفوع للطرف الثاني دون أي استقطاع. وفي حال صدور قرار بالموافقة على إعادة جدولة المنتجات التمويلية وإتمام الإجراءات ذات العلاقة، تُعد الأتعاب المدفوعة مستحقة للطرف الأول، وتكون أتعاباً مقطوعة قدرها: 2,000.00 ريال سعودي فقط." :
                        "لا تستحق أتعاب الطرف الأول إلا بعد صدور قرار الإعفاء النهائي وإصدار خطاب المخالصة المالية. وفي حال صدور القرار، يستحق الطرف الأول أتعاباً مقطوعة قدرها (4%) من إجمالي المبالغ المعفية فعلياً. وفي حال عدم قبول الطلب، لا يحق للطرف الأول المطالبة بأي أتعاب."
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (7): مدة العقد</h3>
                    <p className="text-justify">
                      {type.includes('جدولة') ?
                        "يبدأ العمل بهذا العقد من تاريخ توقيعه، ويستمر سارياً حتى قبول طلب إعادة الجدولة، ما لم يتم إنهاؤه باتفاق مكتوب بين الطرفين أو وفقاً للأنظمة." :
                        "يبدأ العمل بهذا العقد من تاريخ توقيعه، ويستمر سارياً حتى قبول طلب الإعفاء، ما لم يتم إنهاؤه باتفاق مكتوب بين الطرفين أو وفقاً للأنظمة."
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">
                      {type.includes('جدولة') ? "المادة (8): سند لأمر وإقرار التزام مالي واجب السداد على الطرف الأول" : "المادة (8): سند لأمر وإقرار دين واجب النفاذ"}
                    </h3>
                    <div className="space-y-3">
                      <p className="text-justify">
                        {type.includes('جدولة') ?
                          "اتفق الطرفان على أن يُعد هذا العقد بمثابة سندٍ لأمرٍ واجب النفاذ وفقًا لأحكام نظام الأوراق التجارية ونظام التنفيذ السعودي، ويقر الطرف الأول إقرارًا صريحًا ونهائيًا بالتزامه برد كامل المبلغ المدفوع من الطرف الثاني، وذلك في حال عدم تنفيذ طلب إعادة جدولة المنتجات التمويلية لأي سبب كان. ويكون هذا السند مستحق الأداء فور ثبوت عدم تنفيذ الطلب، ويحق للطرف الثاني التقدم به مباشرة إلى الجهات المختصة لاتخاذ إجراءات التنفيذ النظامية دون حاجة إلى إشعار أو إنذار مسبق." :
                          "اتفق الطرفان على أن يُعد هذا العقد بمثابة سندٍ لأمرٍ واجب النفاذ وفقًا لأحكام نظام الأوراق التجارية ونظام التنفيذ السعودي، ويقر الطرف الثاني إقرارًا صريحًا ونهائيًا بالتزامه بسداد أتعاب الطرف الأول بنسبة (7.5%) من إجمالي مبالغ المنتجات التمويلية التي يتم إعفاؤه منها، وذلك فور قبول طلب الإعفاء واستلام خطاب المخالصة المالية."
                        }
                      </p>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-[12px] space-y-1">
                        <p><strong>• رقم السند:</strong> <span className="text-brand">{contractId}</span></p>
                        <p><strong>• قيمة السند:</strong> {type.includes('جدولة') ? "2,000.00 ريال سعودي" : "تمثل نسبة (4%) من إجمالي مبالغ المنتجات التمويلية المعفاة فعليًا"}</p>
                        <p><strong>• تاريخ الاستحقاق:</strong> {type.includes('جدولة') ? "عند عدم تنفيذ طلب إعادة الجدولة" : "فور قبول طلب الإعفاء واستلام خطاب المخالصة المالية الصادر من الجهة المختصة"}</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (9): أحكام عامة</h3>
                    <p className="text-justify">يخضع العقد لأنظمة المملكة العربية السعودية. لا يُعد أي تعديل نافذاً إلا إذا كان مكتوباً وموقعاً من الطرفين.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (10): الإقرار والتنازل عن الدفوع</h3>
                    <div className="text-justify space-y-1">
                      {type.includes('جدولة') ?
                        <p>يُقر الطرفان إقراراً صريحاً ونهائياً بما يلي: 1- صحة جميع البيانات والمستندات المقدمة بموجب هذا العقد، ويتحمل كل طرف مسؤولية ما يخصه منها. 2- صحة استحقاق المبالغ وآلية السداد أو الاسترداد وفق ما ورد في هذا العقد، وبما يتوافق مع تنفيذ أو عدم تنفيذ طلب إعادة الجدولة. 3- التنازل عن أي دفوع أو منازعات تتعلق بسند الأمر. 4- عدم الطعن أو الاعتراض على التنفيذ أمام محكمة التنفيذ إلا في الحدود التي يجيزها النظام. ويشمل هذا الإقرار التزام الطرف الأول برد المبالغ للطرف الثاني في حال عدم تنفيذ طلب إعادة الجدولة، ويعد ذلك التزاماً نهائياً واجب النفاذ.</p> :
                        <>
                          <p>يُقر الطرف الثاني إقراراً صريحاً ونهائياً بما يلي:</p>
                          <ul className="list-decimal pr-5 space-y-0.5">
                            <li>صحة جميع البيانات والمستندات المقدمة منه.</li>
                            <li>صحة احتساب الأتعاب وفق النسبة المتفق عليها.</li>
                            <li>التنازل عن أي دفوع أو منازعات تتعلق بسند الأمر متى ما تم إصداره عبر منصة نافذ وفق أحكام هذا العقد.</li>
                            <li>عدم الطعن أو الاعتراض على التنفيذ أمام محكمة التنفيذ إلا في الحدود التي يجيزها النظام.</li>
                          </ul>
                        </>
                      }
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (11): الإقرار والقبول النهائي</h3>
                    <p className="text-justify">يُقر الطرف الثاني بما يلي: اطلاعه الكامل على العقد وفهمه لآثاره، صحة التفويض الممنوح، صحة احتساب الأتعاب، وأن هذا الإقرار حجة قاطعة وملزمة أمام جميع الجهات القضائية والتنفيذية.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-[#C5A059] mb-1">المادة (12): التفويض</h3>
                    <div className="text-justify space-y-3">
                      <p>أقر أنا الموقع أدناه وبكامل أهليتي المعتبرة شرعاً ونظاماً بأنني قد فوضت شركة ريفانس المالية، سجل تجاري رقم 7038821125 تفويضاً كاملاً غير مشروط بمراجعة كافة الجهات الحكومية والخاصة والجهات التمويلية (البنوك والمصارف وشركات التمويل) وشركة المعلومات الائتمانية (سمة)، وذلك للاطلاع على كافة بياناتي الائتمانية والتمويلية والطبية.</p>
                      <p>كما يشمل هذا التفويض حق تقديم طلبات الإعفاء من المديونيات، أو طلبات إعادة الجدولة، أو تسوية الالتزامات واستلام خطابات المخالصة أو قرارات الإعفاء، ومتابعة كافة الإجراءات المتعلقة بملفي لدى البنك المركزي السعودي وكافة اللجان القضائية والرقابية.</p>
                      <p>ويعد هذا التفويض سارياً من تاريخ توقيعه وحتى انتهاء الغرض الذي أعد من أجله أو قيامي بإلغائه رسمياً عبر القنوات المعتمدة لدى الشركة، مع التزامي بكافة النتائج والآثار القانونية المترتبة على هذا التفويض.</p>
                    </div>
                  </section>

                  <div className="h-px bg-gray-200 my-8" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center space-y-2">
                      <p className="font-bold text-[13px] text-[#22042C]">ختم وتوقيع الطرف الأول</p>
                      <div className="h-24 flex items-center justify-center relative overflow-hidden">
                        <img 
                          src={stampBase64 || "https://d.top4top.io/p_3733lj72b1.jpg"} 
                          alt="First Party Stamp" 
                          className="h-20 w-auto object-contain mix-blend-multiply opacity-80" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] text-[#22042C]/40 font-bold">شركة ريفانس المالية</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-bold text-[13px] text-[#22042C]">توقيع الطرف الثاني (العميل)</p>
                      <div className="h-24 flex items-center justify-center relative overflow-hidden">
                        {isSuccess ? (
                          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                            <CheckCircle className="text-green-500 mb-1" size={20} />
                            <span className="text-green-600 font-bold text-[10px]">تم التوقيع إلكترونياً</span>
                            <span className="text-[8px] text-muted mt-0.5">{new Date().toLocaleString('ar-SA')}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted italic">بانتظار التوقيع...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#C5A059]/30 rounded-xl p-4 bg-[#fcfaf7] space-y-4">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="agree" className="mt-1 w-4 h-4 accent-[#C5A059]" />
                      <label htmlFor="agree" className="text-[12px] font-medium leading-relaxed cursor-pointer">
                        أوافق على العقد وأقر بصحة جميع البيانات والمحتوى وأفوض شركة ريفانس المالية بموجب هذا العقد.
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#22042C]">توقيع العميل:</span>
                        <button onClick={clearSignature} className="text-[10px] text-red-500 font-bold">مسح التوقيع</button>
                      </div>
                      <div className="h-[120px] relative">
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
                    </div>
                  </div>

                  <div className="text-center space-y-1 pt-4">
                    <p className="text-[11px] text-muted leading-relaxed">هذه الوثيقة صادرة من النظام الإلكتروني لشركة ريفانس المالية وهي معتمدة قانوناً بمجرد التوقيع عليها.</p>
                    <div className="flex justify-between text-[10px] text-muted font-bold px-4">
                      <span>رقم المرجع: {contractId}</span>
                      <span>صفحة 1 من 1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="bg-white border-t border-gray-100 p-4 flex items-center justify-center gap-3 sticky bottom-0 z-20">
              <button 
                onClick={handleSignSubmit}
                disabled={!hasSignature || isSubmitting}
                className="flex-1 max-w-[180px] py-2.5 bg-[#C5A059] text-white rounded-full font-bold text-[13px] shadow-lg shadow-[#C5A059]/20 hover:bg-[#C5A059]/90 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'الموافقة على العقد'}
              </button>
              <button className="flex-1 max-w-[180px] py-2.5 bg-white border border-gray-200 text-[#22042C] rounded-full font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                <Printer size={16} />
                طباعة العقد
              </button>
              <button 
                onClick={onClose}
                className="flex-1 max-w-[100px] py-2.5 bg-white border border-gray-200 text-muted rounded-full font-bold text-[13px] hover:bg-gray-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>

        {/* Success Overlay */}
        {isSuccess && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in duration-500">
            <div className="text-center p-10 max-w-sm">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
                <CheckCircle className="text-green-500" size={48} />
              </div>
              <h3 className="text-[24px] font-black text-[#22042C] mb-3 font-['Tajawal']">تم ارسال العقد بنجاح</h3>
              <p className="text-[14px] text-muted leading-relaxed font-['Tajawal'] mb-6">
                شكراً لك {userData?.fullName?.split(' ')[0]}، تم اعتماد توقيعك الإلكتروني بنجاح وإرسال النسخة الموقعة إلى النظام.
              </p>
              <Button 
                onClick={onClose}
                className="w-full py-3 bg-brand text-white rounded-xl font-bold shadow-lg hover:bg-brand/90 transition-all flex items-center justify-center gap-2 font-['Tajawal']"
              >
                الرجوع
                <ArrowRight size={18} className="rotate-180" />
              </Button>
              <div className="mt-8 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-[progress_3s_linear]" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractModal;
