import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email transporter
const emailHost = (process.env.EMAIL_HOST || "smtp.gmail.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
const transporter = nodemailer.createTransport({
  host: emailHost,
  port: parseInt(process.env.EMAIL_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || "rifans.finance@gmail.com",
    pass: process.env.EMAIL_PASS || "xuchzkkqxbulobpl",
  },
});

// Verify transporter connection
transporter.verify(function (error, success) {
  if (error) {
    console.error("Transporter verification error:", error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get("/api/health/status", (req, res) => {
  res.json({ 
    status: "ok",
    mode: "static"
  });
});

// Send generic request data via email
app.post("/api/send-email", async (req, res) => {
  const { requestData, userData, attachments } = req.body;
  
  let htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #22042C; border-bottom: 2px solid #C7A969; padding-bottom: 10px;">طلب جديد من الموقع</h2>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p><strong>نوع الطلب:</strong> ${requestData.type || 'غير محدد'}</p>
        <p><strong>رقم الطلب:</strong> ${requestData.id || 'N/A'}</p>
        <p><strong>التاريخ:</strong> ${new Date().toLocaleString('ar-SA')}</p>
      </div>
      
      <h3 style="color: #C7A969;">بيانات العميل:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; width: 150px;"><strong>الاسم:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${userData?.fullName || 'غير متوفر'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>الجوال:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${userData?.phone || 'غير متوفر'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>البريد الإلكتروني:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${userData?.email || 'غير متوفر'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>رقم الهوية:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${userData?.national_id || 'غير متوفر'}</td>
        </tr>
      </table>

      <h3 style="color: #C7A969; margin-top: 20px;">تفاصيل الطلب:</h3>
      <div style="background: #fff; border: 1px solid #eee; padding: 15px; border-radius: 8px;">
        <p><strong>المنطقة:</strong> ${requestData.data?.region || 'غير محدد'}</p>
        <p><strong>المدينة:</strong> ${requestData.data?.city || 'غير محدد'}</p>
        <p><strong>التفاصيل/الرسالة:</strong> ${requestData.details || 'لا يوجد'}</p>
        
        ${requestData.products ? `
          <h4 style="margin-top: 15px; border-top: 1px solid #eee; pt: 10px;">المنتجات التمويلية:</h4>
          <ul>
            ${(typeof requestData.products === 'string' ? JSON.parse(requestData.products) : requestData.products).map((p: any) => `<li>${p.type}: ${p.amount} ر.س ${p.accountNumber ? `(حساب: ${p.accountNumber})` : ''}</li>`).join('')}
          </ul>
        ` : ''}

        ${requestData.salary ? `<p><strong>الراتب:</strong> ${requestData.salary} ر.س</p>` : ''}
        ${requestData.obligations ? `<p><strong>الالتزامات:</strong> ${requestData.obligations} ر.س</p>` : ''}
        ${requestData.dbr ? `<p><strong>نسبة الاستقطاع:</strong> ${requestData.dbr}%</p>` : ''}
        ${requestData.status ? `<p><strong>حالة الملاءة:</strong> ${requestData.status}</p>` : ''}
        
        ${requestData.data?.signature ? `
          <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
            <p><strong>التوقيع الإلكتروني:</strong></p>
            <img src="${requestData.data.signature}" alt="توقيع العميل" style="max-width: 200px; border: 1px solid #eee; border-radius: 4px;" />
          </div>
        ` : ''}
      </div>
      
      <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">هذا البريد تم إرساله آلياً من نظام ريفانس المالية.</p>
    </div>
  `;

  const recipients = [process.env.EMAIL_USER || "rifans.finance@gmail.com"];
  if (userData?.email && userData.email.includes('@')) {
    recipients.push(userData.email);
  }

  const mailOptions = {
    from: `"ريفانس المالية" <${process.env.EMAIL_USER || "rifans.finance@gmail.com"}>`,
    to: recipients.join(','),
    subject: `طلب جديد: ${requestData.type} - ${userData?.fullName || ''}`,
    html: htmlContent,
    attachments: attachments || []
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

// Send contract PDF via email
app.post("/api/send-contract-pdf", async (req, res) => {
  const { pdfBase64, requestId, fullName, attachments, products, email } = req.body;
  
  let productsHtml = "";
  if (products && Array.isArray(products) && products.length > 0) {
    productsHtml = `
      <h3 style="color: #C7A969; margin-top: 20px;">المنتجات التمويلية:</h3>
      <ul>
        ${products.map((p: any) => `<li>${p.type || p.productType}: ${p.amount} ر.س ${p.accountNumber ? `(حساب: ${p.accountNumber})` : ''}</li>`).join('')}
      </ul>
    `;
  }

  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #22042C; border-bottom: 2px solid #C7A969; padding-bottom: 10px;">نسخة العقد المعتمدة</h2>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p><strong>العميل:</strong> ${fullName}</p>
        <p><strong>رقم الطلب:</strong> ${requestId}</p>
        <p><strong>التاريخ:</strong> ${new Date().toLocaleString('ar-SA')}</p>
      </div>
      
      ${productsHtml}

      <p style="margin-top: 20px;">مرفق نسخة من العقد الموقع والمعتمد للطلب رقم ${requestId}. العقد يتضمن توقيع الطرف الأول والطرف الثاني.</p>
      
      <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">هذا البريد تم إرساله آلياً من نظام ريفانس المالية.</p>
    </div>
  `;

  const recipients = [process.env.EMAIL_USER || "rifans.finance@gmail.com"];
  if (email && email.includes('@')) {
    recipients.push(email);
  }

  const mailOptions = {
    from: `"ريفانس المالية" <${process.env.EMAIL_USER || "rifans.finance@gmail.com"}>`,
    to: recipients.join(','),
    subject: `نسخة العقد المعتمدة - ${fullName} - ${requestId}`,
    html: htmlContent,
    attachments: [
      {
        filename: `contract_${requestId}.pdf`,
        content: pdfBase64.split("base64,")[1],
        encoding: "base64",
      },
      ...(attachments || [])
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }
}

setupVite();

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
