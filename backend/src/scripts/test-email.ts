/**
 * Test Email Service
 * 
 * Script để test gửi email
 * 
 * Usage: npx ts-node src/scripts/test-email.ts your-email@gmail.com
 */

import * as dotenv from 'dotenv';
import { sendOTPEmail } from '../services/emailService';

dotenv.config();

const testEmail = async () => {
  // Get email from command line argument
  const testEmailAddress = process.argv[2];

  if (!testEmailAddress) {
    console.log('❌ Vui lòng cung cấp email để test');
    console.log('Usage: npx ts-node src/scripts/test-email.ts your-email@gmail.com');
    process.exit(1);
  }

  console.log('\n🧪 Testing Email Service...\n');
  console.log(`📧 Sending test OTP email to: ${testEmailAddress}\n`);

  try {
    const testOTP = '123456';
    const result = await sendOTPEmail(testEmailAddress, 'Test User', testOTP);

    if (result) {
      console.log('✅ Email sent successfully!\n');
      console.log('📬 Next steps:');
      console.log('1. Check your inbox:', testEmailAddress);
      console.log('2. Check Spam folder if not in Inbox');
      console.log('3. Look for email from: EduLearn');
      console.log('4. Subject: Xác thực tài khoản EduLearn - Mã OTP\n');
      console.log('🔢 Test OTP code:', testOTP);
    } else {
      console.log('❌ Email sending failed!\n');
      console.log('📝 Troubleshooting:');
      console.log('1. Check SMTP configuration in .env');
      console.log('2. Verify SMTP_USER and SMTP_PASS are correct');
      console.log('3. Make sure 2FA is enabled and using App Password');
      console.log('4. Check backend/EMAIL_SETUP_GUIDE.md for details\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
};

testEmail();

