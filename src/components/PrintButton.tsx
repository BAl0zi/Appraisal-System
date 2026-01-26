 'use client';

import React from 'react';

export default function PrintButton({ className }: { className?: string }) {
  const base = 'px-4 py-2 bg-white border rounded no-print';
  return (
    <button onClick={() => window.print()} className={className ? `${base} ${className}` : base}>
      Print / Save PDF
    </button>
  );
}
