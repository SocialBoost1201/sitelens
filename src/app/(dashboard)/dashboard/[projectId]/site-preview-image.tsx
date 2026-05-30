"use client"

import Image from "next/image"
import { useState } from "react"
import { Globe } from "lucide-react"

interface SitePreviewImageProps {
  src: string
  alt: string
  url: string
}

export function SitePreviewImage({ src, alt, url }: SitePreviewImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 min-h-[400px]"
        style={{ color: "oklch(0.35 0.010 265)" }}
      >
        <Globe className="size-10 opacity-20" />
        <p className="text-xs opacity-40">Preview unavailable</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline transition-opacity hover:opacity-70"
          style={{ color: "oklch(0.65 0.22 258)" }}
        >
          Open site →
        </a>
      </div>
    )
  }

  return (
    <div className="relative flex-1 min-h-[400px] overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-top"
        unoptimized
        onError={() => setFailed(true)}
      />
      {/* Bottom gradient overlay */}
      <div
        className="absolute bottom-0 inset-x-0 h-16 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, oklch(0.11 0.007 265))",
        }}
      />
    </div>
  )
}
