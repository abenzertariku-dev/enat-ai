'use client'

import Image from 'next/image'

type BrandLogoProps = {
  size?: number
  className?: string
  variant?: 'mark' | 'full'
  priority?: boolean
}

export default function BrandLogo({
  size = 40,
  className = '',
  variant = 'mark',
  priority = false,
}: BrandLogoProps) {
  if (variant === 'full') {
    return (
      <Image
        src="/enat-ai-logo.png"
        alt="ENAT AI — Your smart business companion"
        width={440}
        height={500}
        className={`object-contain ${className}`}
        style={{ width: size, height: 'auto' }}
        priority={priority}
      />
    )
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/enat-ai-logo.png"
        alt="ENAT AI"
        width={size * 2}
        height={size * 2}
        className="h-full w-full object-cover object-[center_18%]"
        style={{ width: '100%', height: '100%' }}
        priority={priority}
      />
    </span>
  )
}
