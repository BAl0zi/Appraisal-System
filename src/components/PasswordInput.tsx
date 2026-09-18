'use client';

import { forwardRef, useState } from 'react';
import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  leftIcon?: ReactNode;
  wrapperClassName?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = '', leftIcon, wrapperClassName = '', style, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    const inputStyle: CSSProperties = {
      ...style,
      paddingLeft: leftIcon ? '2.5rem' : style?.paddingLeft,
      paddingRight: '2.5rem',
    };

    return (
      <div className={`relative ${wrapperClassName}`}>
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          {...props}
          ref={ref}
          type={visible ? 'text' : 'password'}
          style={inputStyle}
          className={className}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
