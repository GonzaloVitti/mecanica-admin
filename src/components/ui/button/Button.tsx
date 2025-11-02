import React, { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "info" | "outline";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  // La propiedad onClick ahora viene de ButtonHTMLAttributes
  // Eliminamos required ya que no es parte del elemento button
  className?: string;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  ...rest // Para capturar cualquier otra prop de button
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    secondary:
      "bg-gray-600 text-white shadow-theme-xs hover:bg-gray-700 disabled:bg-gray-400",
    danger:
      "bg-red-600 text-white shadow-theme-xs hover:bg-red-700 disabled:bg-red-400",
    success:
      "bg-green-600 text-white shadow-theme-xs hover:bg-green-700 disabled:bg-green-400",
    warning:
      "bg-amber-500 text-white shadow-theme-xs hover:bg-amber-600 disabled:bg-amber-400",
    info:
      "bg-blue-500 text-white shadow-theme-xs hover:bg-blue-600 disabled:bg-blue-400",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium gap-2 rounded-lg transition ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      {...rest} // Pasa cualquier otra prop de HTML nativa
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;