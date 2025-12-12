'use client';

interface PasswordRequirementsProps {
  password: string;
  showAll?: boolean; // If true, show all requirements even if password is empty
}

export default function PasswordRequirements({ password, showAll = false }: PasswordRequirementsProps) {
  const requirements = [
    {
      label: 'Tối thiểu 6 ký tự',
      met: password.length >= 6,
    },
    {
      label: 'Có ít nhất 1 chữ cái',
      met: /[A-Za-z]/.test(password),
    },
    {
      label: 'Có ít nhất 1 số',
      met: /\d/.test(password),
    },
  ];

  const hasPassword = password.length > 0;

  // Don't show if password is empty and showAll is false
  if (!hasPassword && !showAll) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-gray-700 mb-2">Yêu cầu mật khẩu:</p>
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center text-xs">
            <span
              className={`mr-2 ${
                req.met ? 'text-green-600' : hasPassword ? 'text-red-600' : 'text-gray-400'
              }`}
            >
              {req.met ? '✓' : '○'}
            </span>
            <span className={req.met ? 'text-green-700' : hasPassword ? 'text-red-700' : 'text-gray-500'}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

