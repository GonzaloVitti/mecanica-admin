"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { fetchApi } from "@/app/lib/data";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface DashboardMetrics {
  time_series: {
    monthly: {
      month: string;
      sales: number;
    }[];
  };
}

export default function MonthlySalesChart() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ month: string; sales: number }[]>([]);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        const response = await fetchApi<DashboardMetrics>('/api/sales/dashboard_metrics/');
        if (response && response.time_series && response.time_series.monthly) {
          setMonthlyData(response.time_series.monthly);
        }
      } catch (error) {
        console.error('Error fetching monthly sales data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  const formatMonthNames = (monthNames: string[]): string[] => {
    const monthTranslations: Record<string, string> = {
      'January': 'Ene',
      'February': 'Feb',
      'March': 'Mar',
      'April': 'Abr',
      'May': 'May',
      'June': 'Jun',
      'July': 'Jul',
      'August': 'Ago',
      'September': 'Sep',
      'October': 'Oct',
      'November': 'Nov',
      'December': 'Dic'
    };

    return monthNames.map(monthName => {
      // Extract just the month name from "Month YYYY" format
      const parts = monthName.split(' ');
      if (parts.length > 0) {
        const englishMonth = parts[0];
        // Return Spanish abbreviation or default to first 3 chars
        return monthTranslations[englishMonth] || englishMonth.substring(0, 3);
      }
      return monthName;
    });
  };

  // Extract month names and sales counts from API data
  const months = monthlyData.map(item => item.month);
  const salesCounts = monthlyData.map(item => item.sales);

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: loading ? 
        ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] : 
        formatMonthNames(months),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: undefined,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${val} ventas`,
      },
    },
  };

  const series = [
    {
      name: "Ventas",
      data: loading ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : salesCounts,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Ventas Mensuales
        </h3>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center h-[180px]">
            <span className="text-gray-500">Cargando datos...</span>
          </div>
        ) : (
          <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
            <ReactApexChart
              options={options}
              series={series}
              type="bar"
              height={180}
            />
          </div>
        )}
      </div>
    </div>
  );
}