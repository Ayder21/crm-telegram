import type { Metadata } from "next";
import { DemoDashboardPage } from "@/components/demo/DemoDashboardPage";

export const metadata: Metadata = {
  title: "Demo CRM",
  description:
    "Интерактивная демо-версия Sellio для магазина женской одежды: чаты Telegram и Instagram, воронка и настройки.",
};

export default function DemoPage() {
  return <DemoDashboardPage />;
}
