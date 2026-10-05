import { fetchChartData } from "@/app/lib/data/analytics.data";
import { ChartAreaInteractive } from "./chart-area-interactive";
import { Suspense } from "react";
import AnalyticsChartSkeleton from "@/components/skeletons/analyticsChartSkeleton";

const ChartWrapper = async () => {
  const chartData = await fetchChartData();

  return (
    <Suspense fallback={<AnalyticsChartSkeleton />}>
      <ChartAreaInteractive data={chartData} />
    </Suspense>
  );
};

export default ChartWrapper;
