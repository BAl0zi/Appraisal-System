"use client";

import React from 'react';

export default function FinalScoresheetButton({ targetId }: { targetId: string }) {
  const id = targetId.replace('scoresheet-', '') ;
  const href = `/print/scoresheet/${id}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-600 text-white rounded no-print inline-block">
      View Final Scoresheet
    </a>
  );
}
