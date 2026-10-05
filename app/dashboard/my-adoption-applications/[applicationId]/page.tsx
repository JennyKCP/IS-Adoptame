import { notFound } from "next/navigation";
import { MyAdoptionApplicationView } from "@/components/dashboard/my-adoption-applications/my-adoption-application-view";
import { fetchMyAdoptionAppById } from "@/app/lib/data/my-adoption-applications.data";

interface Props {
  params: Promise<{ applicationId: string }>;
}


const Page = async ({ params }: Props) => {
  const { applicationId } = await params;

  const myApplication = await fetchMyAdoptionAppById(applicationId);

  if (!myApplication) {
    notFound();
  }

  return <MyAdoptionApplicationView application={myApplication} />;
};

export default Page;
