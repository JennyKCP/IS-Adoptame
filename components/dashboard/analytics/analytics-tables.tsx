import {
  fetchAnimalsRequiringAttention,
  fetchAnalyticsTaskTableData,
} from "@/app/lib/data/analytics.data";
import { getShelterToday } from "@/app/lib/data/shelter-settings.data";

import { getRecentTasksColumns } from "@/components/dashboard/analytics/tables/tasks/recent-tasks-columns";
import { healthColumns } from "@/components/dashboard/analytics/tables/animal-health/recent-health-columns";
import DataTable from "@/components/dashboard/analytics/tables/data-table-client";
import { DataTableViewToolbarClient } from "@/components/dashboard/analytics/tables/data-table-view-toolbar-client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AnalyticsTables = async () => {
  const [tasks, animalHealth, today] = await Promise.all([
    fetchAnalyticsTaskTableData(),
    fetchAnimalsRequiringAttention(),
    getShelterToday(),
  ]);

  return (
    <Tabs defaultValue="animal-tasks">
      <TabsList>
        <TabsTrigger value="animal-tasks">Tareas</TabsTrigger>
        <TabsTrigger value="health">Salud</TabsTrigger>
      </TabsList>
      <TabsContent value="animal-tasks">
        <Card>
          <CardHeader>
            <CardTitle>Tareas de animales</CardTitle>
            <CardDescription>
              Vista rápida de las tareas más recientes que aún no se han completado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={tasks}
              getColumns={getRecentTasksColumns}
              columnProps={{ today }}
              ToolbarComponent={DataTableViewToolbarClient}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="health">
        <Card>
          <CardHeader>
            <CardTitle>Salud de los animales</CardTitle>
            <CardDescription>
              Esta pestaña muestra animales en un estado especial que requiere
              supervisión administrativa o médica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={animalHealth}
              columns={healthColumns}
              ToolbarComponent={DataTableViewToolbarClient}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default AnalyticsTables;
