import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchPetCardData } from "@/app/lib/data/analytics.data";


const formatPercentage = (value: number) => {
  const abs = Math.abs(value);
  return `${value >= 0 ? "+" : "-"}${abs.toFixed(1)}%`;
};


const getTrendMessage = (change: number, context: string) => {
  const isPositive = change >= 0;

  if (Math.abs(change) < 5) {
    return `Estable: ${context}`;
  }

  if (isPositive) {
    return `Tendencia al alza este mes`;
  }

  return `Bajó ${Math.abs(change).toFixed(1)}% este período`;
};


const getFooterDescription = (cardType: string, change: number) => {
  const descriptions = {
    totalAnimals: {
      positive: "Aumentan los nuevos ingresos",
      negative: "Menos ingresos este período",
      stable: "Volumen de ingresos estable",
    },
    adopted: {
      positive: "Buen resultado de adopciones",
      negative: "La adopción requiere atención",
      stable: "Tasa de adopción estable",
    },
    published: {
      positive: "La interacción supera los objetivos",
      negative: "La actividad de publicaciones está por debajo del objetivo",
      stable: "Actividad de publicaciones estable",
    },
    tasks: {
      positive: "Aumentan las tareas pendientes",
      negative: "Mejora la finalización de tareas",
      stable: "Volumen de tareas estable",
    },
  };

  const category = descriptions[cardType as keyof typeof descriptions];
  if (!category) return "Rendimiento en seguimiento";

  if (Math.abs(change) < 5) return category.stable;
  return change >= 0 ? category.positive : category.negative;
};

export async function SectionCards() {
  const data = await fetchPetCardData();
  const {
    totalPets,
    adoptedPetsCount,
    publishedPetsCount,
    todoTasksCount,
    trends,
  } = data;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total de animales</CardDescription>
          <CardTitle className="text-2xl tabular-nums @[250px]/card:text-3xl">
            {totalPets}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {trends.totalPetsChange >= 0 ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {formatPercentage(trends.totalPetsChange)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {getTrendMessage(trends.totalPetsChange, "este mes")}
            {trends.totalPetsChange >= 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            {getFooterDescription("totalAnimals", trends.totalPetsChange)}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Animales adoptados</CardDescription>
          <CardTitle className="text-2xl tabular-nums @[250px]/card:text-3xl">
            {adoptedPetsCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {trends.adoptedPetsChange >= 0 ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {formatPercentage(trends.adoptedPetsChange)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {getTrendMessage(trends.adoptedPetsChange, "este período")}
            {trends.adoptedPetsChange >= 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            {getFooterDescription("adopted", trends.adoptedPetsChange)}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Animales publicados</CardDescription>
          <CardTitle className="text-2xl tabular-nums @[250px]/card:text-3xl">
            {publishedPetsCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {trends.publishedPetsChange >= 0 ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {formatPercentage(trends.publishedPetsChange)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {getTrendMessage(trends.publishedPetsChange, "este mes")}
            {trends.publishedPetsChange >= 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            {getFooterDescription("published", trends.publishedPetsChange)}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Tareas pendientes</CardDescription>
          <CardTitle className="text-2xl tabular-nums @[250px]/card:text-3xl">
            {todoTasksCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {trends.todoTasksChange >= 0 ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {formatPercentage(trends.todoTasksChange)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {getTrendMessage(trends.todoTasksChange, "compared to last month")}
            {trends.todoTasksChange >= 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            {getFooterDescription("tasks", trends.todoTasksChange)}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
