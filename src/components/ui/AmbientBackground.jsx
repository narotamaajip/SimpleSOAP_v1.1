import React from 'react';

export function AmbientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Soft Icy Blue Ambient Orb (Top Left) */}
      <div className="ambient-orb-ice absolute -top-24 -left-20 w-72 h-72 rounded-full" />
      {/* Pale Sage Clinical Orb (Top Right / Center) */}
      <div className="ambient-orb-sage absolute top-1/4 -right-24 w-80 h-80 rounded-full" />
      {/* Gentle Cool Slate Orb (Bottom Left) */}
      <div className="ambient-orb-slate absolute -bottom-20 -left-16 w-80 h-80 rounded-full" />
      {/* Secondary Soft Icy Blue Glow (Bottom Right) */}
      <div className="ambient-orb-ice absolute bottom-12 -right-16 w-64 h-64 rounded-full opacity-70" />
    </div>
  );
}
