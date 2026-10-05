import { SectionCards } from "@/components/dashboard/analytics/section-cards";
import { Suspense } from "react";
import ChartWrapper from "@/components/dashboard/analytics/chart-wrapper";
import AnalyticsTables from "@/components/dashboard/analytics/analytics-tables";
import SectionCardsSkeleton from "@/components/skeletons/sectionCards";
import AnalyticsTablesSkeleton from "@/components/skeletons/analyticsTablesSkeleton";

const Page = async () => {
  return (
    <>
      <Suspense fallback={<SectionCardsSkeleton />}>
        <SectionCards />
      </Suspense>

      <ChartWrapper />

      <Suspense fallback={<AnalyticsTablesSkeleton />}>
        <AnalyticsTables />
      </Suspense>
    </>
  );
};

export default Page;
