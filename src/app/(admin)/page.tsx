import type { Metadata } from "next";
import React from "react";
import MechanicDashboard from "@/components/ecommerce/MechanicDashboard";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";

export const metadata: Metadata = {
  title: "Mecanica | Dashboard",
  description: "Panel de administración Mecanica",
};

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <MechanicDashboard />
      <MonthlySalesChart />
    </div>
  );
}
