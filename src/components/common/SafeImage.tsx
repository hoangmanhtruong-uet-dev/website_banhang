'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';
import { resolveAllowedImageSource } from '@/lib/image-source';

type SafeImageProps = Omit<ImageProps, 'src' | 'onError'> & {
  src?: string | null;
  fallbackSrc?: string;
  onImageError?: () => void;
};

export default function SafeImage({
  src,
  fallbackSrc,
  onImageError,
  unoptimized,
  alt,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [fallbackSrc, src]);

  const requestedSrc = resolveAllowedImageSource(src, fallbackSrc);
  const resolvedSrc = failed
    ? resolveAllowedImageSource(undefined, fallbackSrc)
    : requestedSrc;

  if (!resolvedSrc) return null;

  return (
    <Image
      alt={alt}
      {...props}
      src={resolvedSrc}
      unoptimized={unoptimized ?? resolvedSrc.startsWith('blob:')}
      onError={() => {
        setFailed(true);
        onImageError?.();
      }}
    />
  );
}
