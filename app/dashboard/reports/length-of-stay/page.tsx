import Link from "next/link";

import { Authorize } from "@/components/auth/authorize";
import StatusPage from "@/components/StatusPage";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { SearchParamsType } from "@/app/lib/types";
import { ReportParamsSchema } from "@/app/lib/zod-schemas/report.schemas";
import {
  formatRangeLabel,
  resolveReportRange,
} from "@/app/lib/utils/report-date-utils";
import {
  getShelterSettings,
  getShelterToday,
} from "@/app/lib/data/shelter-settings.data";
import { fetchSpecies } from "@/app/lib/data/animals/animal.data";
import { fetchLengthOfStayReport } from "@/app/lib/data/reports/length-of-stay-report.data";
import { ServerSideFacetedFilter } from "@/components/table-common/server-side-faceted-filter";
import { ReportRangePicker } from "@/components/dashboard/reports/report-range-picker";
import { LosHistogram } from "@/components/dashboard/reports/los-histogram";
import { LongestStaysTable } from "@/components/dashboard/reports/longest-stays-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  searchParams: SearchParamsType;
}


function overviewHref({
  from,
  to,
  species,
}: {
  from?: string;
  to?: string;
  species?: string;
}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (species) params.set("species", species);
  const qs = params.toString();
  return qs ? `/dashboard/reports?${qs}` : "/dashboard/reports";
}

const Page = async ({ searchParams }: Props) => {
  return (
    <Authorize
      permission={AppPermissions.REPORTS_READ}
      fallback={<StatusPage type="accessDenied" />}
    >
      <PageContent searchParams={searchParams} />
    </Authorize>
  );
};

const PageContent = async ({ searchParams }: Props) => {
  const raw = await searchParams;
  
  
  const parsed = ReportParamsSchema.safeParse(raw);
  const { from, to, species } = parsed.success ? parsed.data : {};

  const timezone = (await getShelterSettings()).timezone;
  const range = resolveReportRange(from, to, await getShelterToday());
  const [speciesList, report] = await Promise.all([
    fetchSpecies(),
    fetchLengthOfStayReport(from, to, species),
  ]);
  const speciesOptions = speciesList.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={overviewHref({ from, to, species })}>Reportes</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Tiempo de permanencia</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tiempo de permanencia
          </h1>
          <p className="text-muted-foreground text-sm">
            Las estadísticas de permanencia completada usan el período seleccionado;
            la lista actual refleja los animales bajo cuidado hoy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{formatRangeLabel(range)}</span>
          <span className="text-muted-foreground text-xs">
            · Horarios calculados en {timezone}
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <ReportRangePicker />
            <ServerSideFacetedFilter
              title="Especies"
              paramKey="species"
              options={speciesOptions}
            />
            
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <MetricCard
          label="Mediana de días bajo cuidado"
          value={report.medianDays === null ? "—" : `${report.medianDays}`}
          hint="Permanencias completadas en el período"
        />
        <MetricCard
          label="Permanencia completada más larga"
          value={
            report.longestCompletedDays === null
              ? "—"
              : `${report.longestCompletedDays}`
          }
          hint="Días del período"
        />
        <MetricCard
          label="Animales bajo cuidado ahora"
          value={`${report.inCareNow}`}
          hint="A la fecha de hoy"
        />
        <MetricCard
          label="Bajo cuidado por más de 90 días"
          value={`${report.over90}`}
          hint="A la fecha de hoy"
          valueClassName={
            report.over90 > 0 ? "text-amber-600 dark:text-amber-400" : undefined
          }
        />
      </div>

      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Distribución de permanencias completadas</CardTitle>
          <CardDescription>
            Cuánto tiempo permanecieron los animales que salieron durante este período,
            agrupado por días.
          </CardDescription>
        </CardHeader>
        <div className="px-2 pb-4 sm:px-6 sm:pb-6">
          <LosHistogram
            data={report.histogram}
            completedCount={report.completedCount}
          />
        </div>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Permanencias actuales más largas</CardTitle>
          <CardDescription>
            Animals in care today, longest-waiting first (top 20). Reflects today
            regardless of the selected period.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <LongestStaysTable rows={report.worklist} />
        </div>
      </Card>

      <p className="text-muted-foreground text-xs">
        Median and histogram cover stays that ended within the selected period. A
        stay runs from an intake to its next outcome; repeat visits are separate
        stays; cumulative is the sum of an animal&apos;s stays. Same-day intake and
        outcome counts as 0 days. In-care status is derived from intake/outcome
        records. Date boundaries computed in {timezone}.
      </p>
    </div>
  );
};

function MetricCard({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "text-2xl tabular-nums @[250px]/card:text-3xl",
            valueClassName,
          )}
        >
          {value}
        </CardTitle>
        {hint && (
          <p className="text-muted-foreground text-xs tabular-nums">{hint}</p>
        )}
      </CardHeader>
    </Card>
  );
}

export default Page;
