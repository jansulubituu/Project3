'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import ErrorMessage from '@/components/auth/ErrorMessage';
import PasswordRequirements from '@/components/auth/PasswordRequirements';
import PasswordStrength from '@/components/auth/PasswordStrength';
import FieldError from '@/components/auth/FieldError';
import { getAuthErrorMessage } from '@/lib/authErrorUtils';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'instructor',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<{ message: string; type?: string; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { register } = useAuth();
  const fullNameRef = useRef<HTMLInputElement>(null);

  const updateFieldError = (name: keyof FieldErrors, message?: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[name] = message;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  // Auto-focus first field on mount
  useEffect(() => {
    fullNameRef.current?.focus();
  }, []);

  // Real-time validation
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'fullName':
        if (!value.trim()) {
          return 'Họ và tên là bắt buộc';
        }
        if (value.trim().length < 2) {
          return 'Họ và tên phải có ít nhất 2 ký tự';
        }
        if (value.trim().length > 100) {
          return 'Họ và tên không được vượt quá 100 ký tự';
        }
        return undefined;

      case 'email':
        if (!value.trim()) {
          return 'Email là bắt buộc';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Email không đúng định dạng';
        }
        return undefined;

      case 'password':
        if (!value) {
          return 'Mật khẩu là bắt buộc';
        }
        if (value.length < 6) {
          return 'Mật khẩu phải có ít nhất 6 ký tự';
        }
        const hasLetter = /[A-Za-z]/.test(value);
        const hasNumber = /\d/.test(value);
        if (!hasLetter || !hasNumber) {
          return 'Mật khẩu phải có ít nhất 1 chữ cái và 1 số';
        }
        // Check confirm password match if it exists
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          updateFieldError('confirmPassword', 'Mật khẩu xác nhận không khớp');
        } else if (formData.confirmPassword && value === formData.confirmPassword) {
          updateFieldError('confirmPassword');
        }
        return undefined;

      case 'confirmPassword':
        if (!value) {
          return 'Xác nhận mật khẩu là bắt buộc';
        }
        if (value !== formData.password) {
          return 'Mật khẩu xác nhận không khớp';
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear general error if user is typing
    if (error?.field === name) {
      setError(null);
    }

    // Real-time validation for touched fields
    if (touched[name]) {
      const fieldError = validateField(name, value);
      updateFieldError(name as keyof FieldErrors, fieldError);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const fieldError = validateField(name, value);
    updateFieldError(name as keyof FieldErrors, fieldError);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    const errors: FieldErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'role') {
        const error = validateField(key, value as string);
        if (error) {
          errors[key as keyof FieldErrors] = error;
        }
      }
    });

    // Check terms
    if (!termsAccepted) {
      setError({
        message: 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật',
        type: 'validation',
      });
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });
    } catch (err) {
      const authError = getAuthErrorMessage(err);
      setError({
        message: authError.message,
        type: authError.type,
        field: authError.field,
      });
      
      // Also set field error if field is specified
      if (authError.field) {
        setFieldErrors(prev => ({
          ...prev,
          [authError.field!]: authError.message,
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.fullName.trim().length >= 2 &&
      formData.email.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.password.length >= 6 &&
      /[A-Za-z]/.test(formData.password) &&
      /\d/.test(formData.password) &&
      formData.password === formData.confirmPassword &&
      termsAccepted &&
      Object.values(fieldErrors).every((value) => !value)
    );
  };

  const passwordMatch = formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordHasValue = formData.password.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} href="/" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản mới</h1>
          <p className="mt-2 text-sm text-gray-600">
            Đăng ký để bắt đầu hành trình học tập của bạn
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Error Message */}
            {error && !error.field && (
              <ErrorMessage
                error={error.message}
                type={error.type === 'validation' || error.type === 'auth' ? 'error' : error.type === 'warning' ? 'warning' : 'error'}
                onDismiss={() => setError(null)}
              />
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                ref={fullNameRef}
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`mt-1 block w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  touched.fullName && fieldErrors.fullName
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : touched.fullName && !fieldErrors.fullName && formData.fullName
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 bg-white'
                }`}
                placeholder="Nguyễn Văn A"
                aria-invalid={touched.fullName && fieldErrors.fullName ? 'true' : 'false'}
                aria-describedby={touched.fullName && fieldErrors.fullName ? 'fullName-error' : undefined}
              />
              {touched.fullName && fieldErrors.fullName && (
                <FieldError error={fieldErrors.fullName} id="fullName-error" />
              )}
              {touched.fullName && !fieldErrors.fullName && formData.fullName && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Hợp lệ
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`mt-1 block w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  touched.email && fieldErrors.email
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : touched.email && !fieldErrors.email && formData.email
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 bg-white'
                }`}
                placeholder="your@email.com"
                aria-invalid={touched.email && fieldErrors.email ? 'true' : 'false'}
                aria-describedby={touched.email && fieldErrors.email ? 'email-error' : undefined}
              />
              {touched.email && fieldErrors.email && (
                <FieldError error={fieldErrors.email} id="email-error" />
              )}
              {touched.email && !fieldErrors.email && formData.email && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Email hợp lệ
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="student">Học viên</option>
                <option value="instructor">Giảng viên</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.role === 'student' 
                  ? 'Học viên có thể đăng ký và học các khóa học'
                  : 'Giảng viên có thể tạo và quản lý khóa học'}
              </p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 block w-full px-4 py-3 pr-12 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    touched.password && fieldErrors.password
                      ? 'border-red-300 bg-red-50 focus:ring-red-500'
                      : touched.password && !fieldErrors.password && passwordHasValue
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 bg-white'
                  }`}
                  placeholder="••••••••"
                  aria-invalid={touched.password && fieldErrors.password ? 'true' : 'false'}
                  aria-describedby={touched.password && fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <FieldError error={fieldErrors.password} id="password-error" />
              )}
              {passwordHasValue && (
                <>
                  <PasswordStrength password={formData.password} />
                  <PasswordRequirements password={formData.password} showAll={true} />
                </>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 block w-full px-4 py-3 pr-12 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    touched.confirmPassword && fieldErrors.confirmPassword
                      ? 'border-red-300 bg-red-50 focus:ring-red-500'
                      : touched.confirmPassword && passwordMatch
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 bg-white'
                  }`}
                  placeholder="••••••••"
                  aria-invalid={touched.confirmPassword && fieldErrors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={touched.confirmPassword && fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.confirmPassword && fieldErrors.confirmPassword && (
                <FieldError error={fieldErrors.confirmPassword} id="confirmPassword-error" />
              )}
              {touched.confirmPassword && passwordMatch && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Mật khẩu khớp
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                required
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                Tôi đồng ý với{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-500 underline">
                  Điều khoản dịch vụ
                </Link>
                {' '}và{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                  Chính sách bảo mật
                </Link>
                {' '}<span className="text-red-500">*</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang đăng ký...
                </span>
              ) : (
                'Đăng ký'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Đã có tài khoản?{' '}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          © 2024 EduLearn. All rights reserved.
        </p>
      </div>
    </div>
  );
}
