import React from "react";

interface ChartTabProps {
  activeTab: 'monthly' | 'quarterly' | 'yearly';
  onChange: (tab: 'monthly' | 'quarterly' | 'yearly') => void;
}

const ChartTab: React.FC<ChartTabProps> = ({ activeTab, onChange }) => {
  const getButtonClass = (option: 'monthly' | 'quarterly' | 'yearly') =>
    activeTab === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => onChange('monthly')}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("monthly")}`}
      >
        Mensual
      </button>

      <button
        onClick={() => onChange('quarterly')}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("quarterly")}`}
      >
        Cuatrimestral
      </button>

      <button
        onClick={() => onChange('yearly')}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("yearly")}`}
      >
        Anual
      </button>
    </div>
  );
};

export default ChartTab;