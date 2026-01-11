/**
 * Auth error message utilities
 * Maps API error messages to user-friendly Vietnamese messages
 */

export type ErrorType = 'validation' | 'auth' | 'network' | 'server' | 'unknown';

export interface AuthError {
  message: string;
  type: ErrorType;
  actionable?: string;
  field?: string;
}

/**
 * Map API error to user-friendly Vietnamese message
 */
export function getAuthErrorMessage(error: any): AuthError {
  // Handle network errors
  if (!error || (error.response === undefined && error.message)) {
    if (error.message?.includes('Network Error') || error.message?.includes('timeout')) {
      return {
        message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet và thử lại.',
        type: 'network',
        actionable: 'Kiểm tra kết nối internet của bạn',
      };
    }
  }

  // Handle API response errors
  const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || '';
  const statusCode = error?.response?.status;
  const field = error?.response?.data?.field;

  // Map common error messages
  const errorMap: Record<string, AuthError> = {
    // Login errors
    'Invalid credentials': {
      message: 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.',
      type: 'auth',
      actionable: 'Kiểm tra lại email và mật khẩu của bạn',
      field: 'password',
    },
    'User not found': {
      message: 'Không tìm thấy tài khoản với email này.',
      type: 'auth',
      actionable: 'Kiểm tra lại email hoặc đăng ký tài khoản mới',
      field: 'email',
    },
    'Account has been deactivated': {
      message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.',
      type: 'auth',
      actionable: 'Liên hệ admin để được hỗ trợ',
    },
    'Email not verified': {
      message: 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư và xác thực email của bạn.',
      type: 'auth',
      actionable: 'Kiểm tra email và xác thực tài khoản',
    },
    'Please provide email and password': {
      message: 'Vui lòng nhập đầy đủ email và mật khẩu.',
      type: 'validation',
      actionable: 'Điền đầy đủ thông tin',
    },

    // Register errors
    'Email already registered': {
      message: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.',
      type: 'validation',
      actionable: 'Đăng nhập hoặc sử dụng email khác',
      field: 'email',
    },
    'An account with this email already exists': {
      message: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.',
      type: 'validation',
      actionable: 'Đăng nhập hoặc sử dụng email khác',
      field: 'email',
    },
    'Please provide a valid email address': {
      message: 'Email không đúng định dạng. Vui lòng kiểm tra lại.',
      type: 'validation',
      actionable: 'Nhập email đúng định dạng (ví dụ: user@example.com)',
      field: 'email',
    },
    'Password must be at least 6 characters long': {
      message: 'Mật khẩu phải có ít nhất 6 ký tự.',
      type: 'validation',
      actionable: 'Tạo mật khẩu có ít nhất 6 ký tự',
      field: 'password',
    },
    'Password must contain at least one letter and one number': {
      message: 'Mật khẩu phải có ít nhất 1 chữ cái và 1 số.',
      type: 'validation',
      actionable: 'Thêm chữ cái và số vào mật khẩu',
      field: 'password',
    },
    'Full name must be at least 2 characters long': {
      message: 'Họ và tên phải có ít nhất 2 ký tự.',
      type: 'validation',
      actionable: 'Nhập họ và tên đầy đủ',
      field: 'fullName',
    },
    'Full name cannot exceed 100 characters': {
      message: 'Họ và tên không được vượt quá 100 ký tự.',
      type: 'validation',
      actionable: 'Rút ngắn họ và tên',
      field: 'fullName',
    },
    'Invalid role': {
      message: 'Vai trò không hợp lệ.',
      type: 'validation',
      field: 'role',
    },
    'Invalid role. Only student or instructor roles are allowed': {
      message: 'Vai trò không hợp lệ. Chỉ có thể chọn Học viên hoặc Giảng viên.',
      type: 'validation',
      field: 'role',
    },
  };

  // Check if we have a mapped error
  const mappedError = errorMap[errorMessage];
  if (mappedError) {
    return {
      ...mappedError,
      field: field || mappedError.field,
    };
  }

  // Handle by status code
  if (statusCode === 400) {
    return {
      message: errorMessage || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đã nhập.',
      type: 'validation',
      field,
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      message: errorMessage || 'Bạn không có quyền thực hiện thao tác này.',
      type: 'auth',
    };
  }

  if (statusCode === 404) {
    return {
      message: errorMessage || 'Không tìm thấy tài nguyên.',
      type: 'auth',
    };
  }

  if (statusCode === 409) {
    return {
      message: errorMessage || 'Tài khoản đã tồn tại.',
      type: 'validation',
      field: 'email',
    };
  }

  if (statusCode === 500 || statusCode >= 500) {
    return {
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
      type: 'server',
      actionable: 'Thử lại sau vài phút',
    };
  }

  // Default error
  return {
    message: errorMessage || 'Đã xảy ra lỗi. Vui lòng thử lại.',
    type: 'unknown',
  };
}
