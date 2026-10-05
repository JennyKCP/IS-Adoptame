import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const AnimalSectionCardsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
      
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              
              <Skeleton className="h-6 w-40" />
              
              <Skeleton className="h-4 w-52" />
              
              <Skeleton className="h-4 w-32" />
            </div>
            
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          
          <div className="flex gap-4">
            <Skeleton className="h-28 w-28 shrink-0 rounded-lg" />
            <div className="flex-1 grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1 p-2.5">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>

          
          <div className="flex items-center gap-4 border-t pt-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>

          
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              
              <Skeleton className="h-5 w-32" />
              
              <Skeleton className="h-4 w-56" />
            </div>
            
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>

          
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnimalSectionCardsSkeleton;