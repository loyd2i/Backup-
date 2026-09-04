'use client';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: { icon: 32, text: 100 },
  md: { icon: 48, text: 150 },
  lg: { icon: 64, text: 200 },
};

export default function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  const iconSize = sizes[size].icon;
  const textWidth = sizes[size].text;

  if (variant === 'icon') {
    return (
      <img
        src="/logo-icon.png"
        alt="Studiolib"
        width={iconSize}
        height={iconSize}
        className={className}
      />
    );
  }

  if (variant === 'text') {
    return (
      <img
        src="/logo-text.png"
        alt="Studiolib"
        width={textWidth}
        height={Math.round(textWidth * 0.35)}
        className={className}
      />
    );
  }

  // Full variant: icon + text
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo-icon.png"
        alt="Studiolib"
        width={iconSize}
        height={iconSize}
      />
      <img
        src="/logo-text.png"
        alt="Studiolib"
        width={textWidth}
        height={Math.round(textWidth * 0.35)}
      />
    </div>
  );
}
