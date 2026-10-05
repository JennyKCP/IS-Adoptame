"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ChartData } from "@/app/lib/data/analytics.data";

type ChartAreaInteractiveProps = {
  data: ChartData;
};




const formatChartDay = (day: string) =>
  new Date(day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const chartConfig = {
  intakes: {
    label: "Ingresos",
    color: "hsl(var(--chart-1))",
  },
  outcomes: {
    label: "Resultados",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive({ data }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState(() =>
    isMobile ? "30d" : "90d",
  );

  
  let daysToFilter = 90;
  if (timeRange === "30d") {
    daysToFilter = 30;
  } else if (timeRange === "7d") {
    daysToFilter = 7;
  }
  const filteredData = data.slice(-daysToFilter); 

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Ingresos frente a resultados</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Comparación diaria entre ingresos de animales y resultados.
          </span>
          <span className="@[540px]/card:hidden">Ingresos frente a resultados</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Últimos 90 días</ToggleGroupItem>
            <ToggleGroupItem value="30d">Últimos 30 días</ToggleGroupItem>
            <ToggleGroupItem value="7d">Últimos 7 días</ToggleGroupItem>
          </ToggleGroup>
          <Select
            name="time-range"
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Seleccionar un valor"
            >
              <SelectValue placeholder="Últimos 90 días" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Últimos 90 días
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Últimos 30 días
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Últimos 7 días
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillIntakes" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-intakes)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-intakes)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillOutcomes" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-outcomes)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-outcomes)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                return formatChartDay(value);
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return formatChartDay(value as string);
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="outcomes"
              type="monotone"
              fill="url(#fillOutcomes)"
              stroke="var(--color-outcomes)"
            />
            <Area
              dataKey="intakes"
              type="monotone"
              fill="url(#fillIntakes)"
              stroke="var(--color-intakes)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
