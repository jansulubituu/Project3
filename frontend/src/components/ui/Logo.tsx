'use client';

import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  href?: string;
}

export default function Logo({ 
  size = 'md', 
  showText = true, 
  className = '',
  href = '/'
}: LogoProps) {
  const sizeClasses = {
    sm: {
      icon: 'w-8 h-8',
      iconInner: 'w-4 h-4',
      text: 'text-lg',
    },
    md: {
      icon: 'w-10 h-10',
      iconInner: 'w-6 h-6',
      text: 'text-xl sm:text-2xl',
    },
    lg: {
      icon: 'w-12 h-12',
      iconInner: 'w-7 h-7',
      text: 'text-2xl sm:text-3xl',
    },
  };

  const classes = sizeClasses[size];

  const logoContent = (
    <div className={`flex items-center space-x-2 group ${className}`}>
      <div className={`${classes.icon} bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
        <svg
          className={`${classes.iconInner} text-white`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
      {showText && (
        <span className={`${classes.text} font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`}>
          EduLearn
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
