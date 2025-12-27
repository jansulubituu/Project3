'use client';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white overflow-hidden ${className}`;

  if (src) {
    return (
      <div className={baseClasses}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('span')) {
              const span = document.createElement('span');
              span.textContent = getInitials(name);
              parent.appendChild(span);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      <span>{getInitials(name)}</span>
    </div>
  );
}
