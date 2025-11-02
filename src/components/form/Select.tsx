interface Option {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: Option[];
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  error?: boolean;
  isSearchable?: boolean;
  isLoading?: boolean;
  classNamePrefix?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  placeholder = "Seleccione una opción",
  onChange,
  className = "",
  error,
  isSearchable,
  isLoading,
  classNamePrefix,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const baseClasses = `h-11 w-full appearance-none rounded-lg border`;
  const errorClasses = error ? 'border-red-500' : 'border-gray-300';
  const stateClasses = value
    ? "text-gray-800 dark:text-white/90"
    : "text-gray-400 dark:text-gray-400";
  const focusClasses = `focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10`;
  const darkClasses = `dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800`;
  const paddingClasses = `px-4 py-2.5 pr-11`;
  const otherClasses = `text-sm shadow-theme-xs placeholder:text-gray-400`;

  const combinedClassName = `${baseClasses} ${errorClasses} ${stateClasses} ${focusClasses} ${darkClasses} ${paddingClasses} ${otherClasses} ${className}`;

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute right-3 top-3.5 z-10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
        </div>
      )}
      <select
        className={combinedClassName}
        value={value}
        onChange={handleChange}
        {...props}
      >
        <option
          value=""
          disabled
          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
          >
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg
          className="h-4 w-4 fill-current"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
};

export default Select;