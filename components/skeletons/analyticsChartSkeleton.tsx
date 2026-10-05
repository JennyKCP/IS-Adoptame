import { Card, CardContent, CardHeader } from "../ui/card";

const AnalyticsChartSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between gap-4">
      
      <div className="flex flex-col gap-2">
        <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
      </div>
      
      <div className="flex gap-2">
        <div className="hidden h-10 w-24 animate-pulse rounded-md bg-muted @[767px]/card:block" />
        <div className="hidden h-10 w-24 animate-pulse rounded-md bg-muted @[767px]/card:block" />
        <div className="hidden h-10 w-24 animate-pulse rounded-md bg-muted @[767px]/card:block" />
        <div className="h-10 w-40 animate-pulse rounded-md bg-muted @[767px]/card:hidden" />
      </div>
    </CardHeader>
    
    <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
      <div className="h-[250px] w-full animate-pulse rounded-lg bg-muted" />
    </CardContent>
  </Card>
);

export default AnalyticsChartSkeleton;