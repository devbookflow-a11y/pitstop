import React, { useState, useEffect } from 'react';

interface UserAvatarProps {
  src?: string;
  name: string;
  className?: string;
  textClassName?: string;
}

export function getUserInitials(name?: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'PS';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  className = 'w-8 h-8 rounded-lg',
  textClassName = 'text-xs',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const trimmedSrc = (src || '').trim();

  if (trimmedSrc && !hasError) {
    return (
      <img
        src={trimmedSrc}
        alt={name}
        className={`object-cover bg-neutral-800 shrink-0 ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`bg-gradient-to-br from-amber-500 to-amber-600 text-neutral-950 font-extrabold flex items-center justify-center select-none shrink-0 ${className}`}
    >
      <span className={textClassName}>{getUserInitials(name)}</span>
    </div>
  );
};
