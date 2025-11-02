"use client";
import React, { useState, useEffect } from "react";
import { ApexOptions } from "apexcharts";
import ChartTab from "../common/ChartTab";
import dynamic from "next/dynamic";
import { fetchApi } from "@/app/lib/data";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface DashboardMetrics {
  total_sales: number;
  current_month: {
    sales: number;
    daily_average: number;
    comparison_with_previous: {
      previous_month_sales: number;
      difference_percentage: number;
      is_increase: boolean;
    };
  };
  time_series: {
    monthly: {
      month: string;
      sales: number;
    }[];
    quarterly: {
      quarter: string;
      sales: number;
      start_date: string;
      end_date: string;
    }[];
    yearly: {
      year: number;
      sales: number;
    }[];
    weekdays: {
      day: string;
      count: number;
    }[];
  };
  sales_states: {
    [key: string]: {
      name: string;
      count: number;
    };
  };
}

export default function StatisticsChart() {
  const [loading, setLoading] = useState(true);
  const [quarterlyData, setQuarterlyData] = useState<{ quarter: string; sales: number }[]>([]);
  const [yearlyData, setYearlyData] = useState<{ year: number; sales: number }[]>([]);
  
  const [completedSales, setCompletedSales] = useState<number[]>(new Array(12).fill(0));
  const [pendingSales, setPendingSales] = useState<number[]>(new Array(12).fill(0));
  
  const [activeTab, setActiveTab] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetchApi<DashboardMetrics>('/api/sales/dashboard_metrics/');
        
        if (response) {
          if (response.time_series) {
            if (response.time_series.quarterly) {
              setQuarterlyData(response.time_series.quarterly);
            }
            
            if (response.time_series.yearly) {
              setYearlyData(response.time_series.yearly);
            }
          }
          
          // Process monthly data for completed sales
          const completed = new Array(12).fill(0);
          const pending = new Array(12).fill(0);
          
          // Map months to their index (0-11)
          const monthMapping: Record<string, number> = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
            'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
          };
          
          // Fill in data from API response
          if (response.time_series && response.time_series.monthly) {
            response.time_series.monthly.forEach(item => {
              const parts = item.month.split(' ');
              if (parts.length > 0) {
                const monthName = parts[0];
                const monthIndex = monthMapping[monthName];
                if (monthIndex !== undefined) {
                  completed[monthIndex] = item.sales;
                }
              }
            });
          }
          
          setCompletedSales(completed);
          setPendingSales(pending);
        }
      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getChartOptions = (): ApexOptions => {
    let categories: string[] = [];

    switch (activeTab) {
      case 'monthly':
        categories = [
          "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
          "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
        ];
        break;
      case 'quarterly':
        categories = quarterlyData.map(q => q.quarter);
        break;
      case 'yearly':
        categories = yearlyData.map(y => y.year.toString());
        break;
    }

    return {
      legend: {
        show: false,
        position: "top",
        horizontalAlign: "left",
      },
      colors: ["#465FFF", "#9CB9FF"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        height: 310,
        type: "area",
        toolbar: {
          show: false,
        },
      },
      stroke: {
        curve: "straight",
        width: [2, 2],
      },
      fill: {
        type: "gradient",
        gradient: {
          opacityFrom: 0.55,
          opacityTo: 0,
        },
      },
      markers: {
        size: 0,
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: {
          size: 6,
        },
      },
      grid: {
        xaxis: {
          lines: {
            show: false,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        enabled: true,
        x: {
          format: "MMM",
        },
        y: {
          formatter: (val: number) => `${val} ventas`,
        },
      },
      xaxis: {
        type: "category",
        categories: categories,
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        tooltip: {
          enabled: false,
        },
      },
      yaxis: {
        labels: {
          style: {
            fontSize: "12px",
            colors: ["#6B7280"],
          },
        },
        title: {
          text: "",
          style: {
            fontSize: "0px",
          },
        },
      },
    };
  };

  const getChartSeries = () => {
    switch (activeTab) {
      case 'monthly':
        return [
          {
            name: "Ventas Completadas",
            data: loading ? new Array(12).fill(0) : completedSales,
          },
          {
            name: "Ventas Pendientes",
            data: loading ? new Array(12).fill(0) : pendingSales,
          },
        ];
      case 'quarterly':
        return [
          {
            name: "Ventas Totales",
            data: loading ? [] : quarterlyData.map(q => q.sales),
          }
        ];
      case 'yearly':
        return [
          {
            name: "Ventas Totales",
            data: loading ? [] : yearlyData.map(y => y.sales),
          }
        ];
      default:
        return [];
    }
  };

  const getChartSubtitle = () => {
    switch (activeTab) {
      case 'monthly':
        return "Resumen de ventas mensuales";
      case 'quarterly':
        return "Resumen de ventas cuatrimestrales";
      case 'yearly':
        return "Resumen de ventas anuales";
      default:
        return "";
    }
  };

  const handleTabChange = (tab: 'monthly' | 'quarterly' | 'yearly') => {
    setActiveTab(tab);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Estadísticas de Ventas
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {getChartSubtitle()}
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <ChartTab activeTab={activeTab} onChange={handleTabChange} />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center h-[310px]">
            <span className="text-gray-500">Cargando datos...</span>
          </div>
        ) : (
          <div className="min-w-[1000px] xl:min-w-full">
            <ReactApexChart
              options={getChartOptions()}
              series={getChartSeries()}
              type="area"
              height={310}
            />
          </div>
        )}
      </div>
    </div>
  );
}