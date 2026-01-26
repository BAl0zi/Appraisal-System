"use client";

import React from 'react';

export default function PrintPageToolbar() {
  return (
    <div className="no-print fixed right-4 top-4 z-50">
      <button
        onClick={() => window.print()}
        className="px-4 py-2 bg-white border rounded shadow text-sm"
      >
        Print / Save PDF
      </button>
    </div>
  );
}
