import React, { useState } from "react";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  alt?: string;
}

export function BrandLogo({
  className = "",
  size = "md",
  alt = "Junin Barbeiro",
}: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "size-10",
    md: "size-14",
    lg: "size-24",
    xl: "size-36 sm:size-40",
  };

  const containerSizes = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full transition-transform hover:scale-105 ${containerSizes} ${className}`}
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#00f0ff]/20 via-[#d4af37]/25 to-[#0088ff]/20 blur-md pointer-events-none" />

      {/* Main Image with double metallic gold & neon cyan ring */}
      <div className="relative size-full rounded-full overflow-hidden p-0.5 bg-gradient-to-b from-[#d4af37] via-[#222] to-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.35)]">
        {!imageError ? (
          <img
            src="/logo.png"
            alt={alt}
            onError={() => setImageError(true)}
            className="size-full rounded-full object-cover bg-[#090b10]"
          />
        ) : (
          <div className="size-full rounded-full bg-[#14161c] flex items-center justify-center text-[#00f0ff] font-bold font-display text-sm">
            JB
          </div>
        )}
      </div>
    </div>
  );
}
