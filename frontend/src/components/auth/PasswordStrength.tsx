'use client';

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    
    if (score <= 1) return { score: 1, label: 'Rất yếu', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Yếu', color: 'bg-orange-500' };
    if (score === 3) return { score: 3, label: 'Trung bình', color: 'bg-yellow-500' };
    if (score === 4) return { score: 4, label: 'Mạnh', color: 'bg-blue-500' };
    return { score: 5, label: 'Rất mạnh', color: 'bg-green-500' };
  };

  const strength = getStrength(password);
  const percentage = (strength.score / 5) * 100;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">Độ mạnh mật khẩu:</span>
        <span className={`text-xs font-semibold ${
          strength.score <= 2 ? 'text-red-600' :
          strength.score === 3 ? 'text-yellow-600' :
          strength.score === 4 ? 'text-blue-600' :
          'text-green-600'
        }`}>
          {strength.label}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
