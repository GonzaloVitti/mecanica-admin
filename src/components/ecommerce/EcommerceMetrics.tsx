"use client";
import React, { useEffect, useState } from "react";
import Badge from "../ui/badge/Badge";
import { ArrowDownIcon, ArrowUpIcon, BoxIconLine, GroupIcon } from "@/icons";
import { fetchApi } from "@/app/lib/data";

interface UserStats {
  count: number;
  growth?: number;
}

interface TripStats {
  count: number;
  growth?: number;
}

interface DashboardMetrics {
  total_sales: number;
  current_month: {
    sales: number;
    daily_average: number;
    comparison_with_previous: {
      previous_month_sales: number;
      difference_percentage: number;
      is_increase: boolean;
    }
  };
  users: {
    total: number;
    customers: number;
    staff: number;
  };
  branch_info?: {
    id: number;
    name: string;
    code: string;
  };
  // Other fields omitted for brevity
}

export const EcommerceMetrics = () => {
  const [userStats, setUserStats] = useState<UserStats>({ count: 0, growth: 0 });
  const [salesStats, setSalesStats] = useState<TripStats>({ count: 0, growth: 0 });
  const [loading, setLoading] = useState(true);
  const [branchInfo, setBranchInfo] = useState<{ name: string; code: string } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch user statistics from users endpoint
        const userResponse = await fetchApi<{ count: number }>('/api/users/');
        
        if (userResponse) {
          // Obtain current count
          const currentCount = userResponse.count;
          
          // Get previous count from localStorage (if exists)
          const lastMonthKey = 'lastMonthUserCount';
          const lastUpdateKey = 'lastUserStatsUpdate';
          const previousCount = parseInt(localStorage.getItem(lastMonthKey) || '0', 10);
          const lastUpdate = localStorage.getItem(lastUpdateKey);
          
          // Calculate growth rate for users
          let growthRate = 0;
          if (previousCount > 0) {
            growthRate = ((currentCount - previousCount) / previousCount) * 100;
          }
          
          // Update user stats
          setUserStats({
            count: currentCount,
            growth: parseFloat(growthRate.toFixed(2))
          });
          
          // Determine if we should update the last month's count
          const now = new Date();
          const shouldUpdatePreviousCount = !lastUpdate || 
            (new Date(lastUpdate).getMonth() !== now.getMonth() || 
             new Date(lastUpdate).getFullYear() !== now.getFullYear());
          
          // If it's been a month since the last update, save current count as previous
          if (shouldUpdatePreviousCount) {
            localStorage.setItem(lastMonthKey, previousCount.toString());
            localStorage.setItem(lastUpdateKey, now.toISOString());
          }
        }

        // Fetch sales statistics from dashboard metrics endpoint
        const dashboardResponse = await fetchApi<DashboardMetrics>('/api/sales/dashboard_metrics/');
        
        if (dashboardResponse) {
          // Set sales stats from dashboard metrics
          setSalesStats({
            count: dashboardResponse.total_sales,
            growth: dashboardResponse.current_month.comparison_with_previous.difference_percentage
          });
          
          // Set branch info if available
          if (dashboardResponse.branch_info) {
            setBranchInfo({
              name: dashboardResponse.branch_info.name,
              code: dashboardResponse.branch_info.code
            });
          }
        }
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchStats();
  }, []);

  return (
    <div className="space-y-4">
      {/* Branch Info Header */}
      {branchInfo && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Sucursal: {branchInfo.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Código: {branchInfo.code}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Métricas específicas de tu sucursal
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        {/* <!-- User Metric Item Start --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
          </div>

          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Clientes totales
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {loading ? "..." : userStats.count.toLocaleString()}
              </h4>
            </div>
            {userStats.growth !== undefined && (
              <Badge color={userStats.growth >= 0 ? "success" : "error"}>
                {userStats.growth >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon className="text-error-500" />}
                {Math.abs(userStats.growth).toFixed(2)}%
              </Badge>
            )}
          </div>
        </div>
        {/* <!-- User Metric Item End --> */}

        {/* <!-- Sales Metric Item Start --> */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <BoxIconLine className="text-gray-800 dark:text-white/90" />
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Ventas totales
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {loading ? "..." : salesStats.count.toLocaleString()}
              </h4>
            </div>

            {salesStats.growth !== undefined && (
              <Badge color={salesStats.growth >= 0 ? "success" : "error"}>
                {salesStats.growth >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon className="text-error-500" />}
                {Math.abs(salesStats.growth).toFixed(2)}%
              </Badge>
            )}
          </div>
        </div>
        {/* <!-- Sales Metric Item End --> */}
      </div>
    </div>
  );
};