import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";


const FormFieldSkeleton = () => (
  <div className="space-y-2">
    <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
    <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
  </div>
);

export default function Loading() {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        
        <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded-md bg-muted" />
      </CardHeader>
      <CardContent className="space-y-10">
        
        <div className="space-y-6">
          <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
          <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-8">
            <div className="col-span-2">
              <FormFieldSkeleton />
            </div>
            <div className="col-span-2">
              <FormFieldSkeleton />
            </div>
            <div className="col-span-2">
              <FormFieldSkeleton />
            </div>
            <div className="col-span-2">
              <FormFieldSkeleton />
            </div>
            <div className="col-span-2">
              <FormFieldSkeleton />
            </div>
            <div className="col-span-2">
              <FormFieldSkeleton />
            </div>
            <div className="col-span-full">
              <FormFieldSkeleton />
            </div>
          </div>
        </div>

        
        <div className="space-y-6">
          <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8">
            <div className="col-span-1">
              <FormFieldSkeleton />
            </div>
            <div className="col-span-1">
              <FormFieldSkeleton />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-4">
        
        <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
        
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
      </CardFooter>
    </Card>
  );
}