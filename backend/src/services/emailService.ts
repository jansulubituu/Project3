import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter
const createTransporter = () => {
  // Check if email configuration exists
  // Need at least SMTP_HOST and SMTP_USER to send emails
  // If SMTP_PASS is missing, we'll use console logging instead
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  Email not configured. Missing SMTP credentials.');
    console.warn('   Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
    console.warn('   Emails will be logged to console instead.');
    return null;
  }

  try {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error);
    return null;
  }
};

/**
 * Send email
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    // If email not configured, log to console (development)
    if (!transporter) {
      console.log('\n📧 ===== EMAIL (Development Mode) =====');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log('Content:');
      console.log(options.text || options.html);
      console.log('=====================================\n');
      return true;
    }

    // Send actual email (production)
    const info = await transporter.sendMail({
      from: `${process.env.FROM_NAME || 'EduLearn'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`✅ Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
};

/**
 * Send OTP verification email
 */
export const sendOTPEmail = async (email: string, fullName: string, otp: string): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #f9fafb;
          border-radius: 10px;
          padding: 30px;
          text-align: center;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .title {
          color: #1f2937;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .otp-box {
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #3b82f6;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
        }
        .message {
          color: #6b7280;
          margin: 20px 0;
          line-height: 1.8;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          text-align: left;
          border-radius: 4px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #9ca3af;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🎓</div>
        <h1 class="title">Xác thực tài khoản EduLearn</h1>
        
        <p class="message">
          Xin chào <strong>${fullName}</strong>,<br><br>
          Cảm ơn bạn đã đăng ký tài khoản EduLearn!<br>
          Vui lòng sử dụng mã OTP bên dưới để xác thực email của bạn:
        </p>
        
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        
        <div class="warning">
          <strong>⚠️ Lưu ý:</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Mã OTP này có hiệu lực trong <strong>10 phút</strong></li>
            <li>Không chia sẻ mã này với bất kỳ ai</li>
            <li>Nếu bạn không yêu cầu, vui lòng bỏ qua email này</li>
          </ul>
        </div>
        
        <p class="message">
          Nếu bạn cần trợ giúp, vui lòng liên hệ support@edulearn.com
        </p>
        
        <div class="footer">
          <p>© 2024 EduLearn. All rights reserved.</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Xin chào ${fullName},
    
    Cảm ơn bạn đã đăng ký tài khoản EduLearn!
    
    Mã OTP xác thực email của bạn là: ${otp}
    
    Mã này có hiệu lực trong 10 phút.
    
    Nếu bạn không yêu cầu, vui lòng bỏ qua email này.
    
    Trân trọng,
    EduLearn Team
  `;

  return await sendEmail({
    to: email,
    subject: 'Xác thực tài khoản EduLearn - Mã OTP',
    html,
    text,
  });
};

/**
 * Send welcome email after verification
 */
export const sendWelcomeEmail = async (email: string, fullName: string): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          padding: 40px;
          text-align: center;
          color: white;
        }
        .logo { font-size: 64px; margin-bottom: 20px; }
        .title { font-size: 28px; font-weight: bold; margin-bottom: 20px; }
        .button {
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 15px 40px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🎉</div>
        <h1 class="title">Chào mừng đến với EduLearn!</h1>
        <p>Xin chào ${fullName},</p>
        <p>Tài khoản của bạn đã được xác thực thành công!</p>
        <p>Bắt đầu khám phá hàng ngàn khóa học chất lượng ngay hôm nay.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
          Bắt đầu học ngay
        </a>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Chào mừng đến với EduLearn! 🎉',
    html,
    text: `Chào mừng ${fullName} đến với EduLearn! Tài khoản của bạn đã được xác thực thành công.`,
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  fullName: string,
  resetToken: string
): Promise<boolean> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  const html = `
    <h2>Reset Mật Khẩu</h2>
    <p>Xin chào ${fullName},</p>
    <p>Bạn đã yêu cầu reset mật khẩu cho tài khoản EduLearn.</p>
    <p>Click vào link bên dưới để reset mật khẩu:</p>
    <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
      Reset Mật Khẩu
    </a>
    <p>Hoặc copy link này vào trình duyệt:</p>
    <p>${resetUrl}</p>
    <p><strong>Link này có hiệu lực trong 10 phút.</strong></p>
    <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset Mật Khẩu - EduLearn',
    html,
    text: `Reset mật khẩu: ${resetUrl}`,
  });
};

