import React, { useState } from 'react';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
  error?: boolean;
  className?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  values,
  placeholder,
  onChange,
  error,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleOption = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  // Cerrar el dropdown al hacer click fuera
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.multiselect-root')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="relative multiselect-root">
      <div
        className={`mt-1 flex items-center justify-between w-full rounded-md border px-3 py-2 shadow-sm cursor-pointer transition-colors focus:outline-none ${
          error ? 'border-red-500' : isOpen ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'
        } ${isOpen ? 'ring-2 ring-blue-500' : ''} bg-white dark:bg-gray-800 text-gray-700 dark:text-white ${className || ''}`}
        tabIndex={0}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(v => !v); }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={values.length === 0 ? 'text-gray-400 dark:text-gray-500' : ''}>
          {values.length === 0
            ? placeholder
            : options.filter(opt => values.includes(opt.value)).map(opt => opt.label).join(', ')
          }
        </span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''} text-gray-400 dark:text-gray-300`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto animate-fade-in">
          {options.length === 0 && (
            <div className="px-4 py-2 text-gray-400 dark:text-gray-500">Sin opciones</div>
          )}
          {options.map(option => (
            <div
              key={option.value}
              className={`flex items-center px-4 py-2 cursor-pointer select-none transition-colors ${
                values.includes(option.value)
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
              }`}
              onClick={() => handleToggleOption(option.value)}
            >
              <input
                type="checkbox"
                checked={values.includes(option.value)}
                readOnly
                className="mr-2 accent-blue-600 dark:accent-blue-400"
              />
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
