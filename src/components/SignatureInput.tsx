'use client';

import { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, PenLine } from 'lucide-react';

interface SignatureInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  date: string;
  onDateChange: (date: string) => void;
}

export default function SignatureInput({ 
  label, 
  value, 
  onChange, 
  disabled = false,
  date,
  onDateChange
}: SignatureInputProps) {
  const sigPad = useRef<SignatureCanvas>(null);

  // Fix for high DPI screens (blurry canvas)
  useEffect(() => {
    if (!value && !disabled && sigPad.current) {
      const canvas = sigPad.current.getCanvas();
      if (canvas) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        // Only resize if the dimensions don't match the ratio to avoid clearing on every render
        if (canvas.width !== canvas.offsetWidth * ratio) {
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.scale(ratio, ratio);
        }
      }
    }
  }, [value, disabled]);

  // If there's an existing value (base64), we can't easily load it back into the editable canvas 
  // with react-signature-canvas in a way that remains editable as vector paths.
  // Usually, once saved, it's an image. If they want to edit, they clear and redraw.
  // So we display the image if value exists, otherwise show the canvas.

  const clear = () => {
    if (disabled) return;
    sigPad.current?.clear();
    onChange('');
  };

  const handleEnd = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      onChange(sigPad.current.getTrimmedCanvas().toDataURL('image/png'));
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2 uppercase">{label}</label>
      
      <div className="bg-white border border-gray-300 rounded-md overflow-hidden">
        {value ? (
          <div className="relative p-4 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={`${label} Signature`} className="h-24 object-contain mx-auto" />
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                }}
                className="absolute top-2 right-2 p-1 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 print:hidden"
                title="Clear Signature"
              >
                <Eraser className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative bg-gray-50">
            {!disabled ? (
              <>
                <SignatureCanvas
                  ref={sigPad}
                  penColor="black"
                  canvasProps={{
                    className: 'w-full h-32 cursor-crosshair',
                    style: { width: '100%', height: '128px' }
                  }}
                  onEnd={handleEnd}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none flex items-center">
                  <PenLine className="h-3 w-3 mr-1" />
                  Sign here
                </div>
                <button
                  type="button"
                  onClick={clear}
                  className="absolute top-2 right-2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 text-gray-600 print:hidden"
                  title="Clear"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 italic bg-gray-50">
                Not signed
              </div>
            )}
          </div>
        )}
        
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between print:bg-white print:border-none print:px-0">
          <div className="text-xs text-gray-500 print:hidden">
            {value ? 'Signed digitally' : 'Please sign in the box above'}
          </div>
          <div className="flex items-center">
            <label className="text-xs text-gray-500 mr-2">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={disabled}
              className="text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1 text-gray-900 bg-white print:hidden"
              aria-label="Signature Date"
            />
            <span className="hidden print:block text-xs text-gray-900 font-medium">
              {date || '__________________'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
