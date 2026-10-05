import {
  fetchAdoptionApplicantDefaults,
  getAnimalForAdoptionApplication,
} from "@/app/lib/data/my-adoption-applications.data";
import { IDParamType, AnimalForAdoptionApplicationPayload } from "@/app/lib/types";
import { getCachedSession } from "@/app/lib/auth/session";
import { notFound, redirect } from "next/navigation";
import { MyApplicationForm } from "@/components/dashboard/my-adoption-applications/my-adoption-application-form";

interface Props {
  params: IDParamType;
}

const Page = async ({ params }: Props) => {
  const { id } = await params;

  const session = await getCachedSession();
  if (!session || !session.user) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/pets/${id}/adopt`)}`);
  }

  const animalToAdopt: AnimalForAdoptionApplicationPayload | null =
    await getAnimalForAdoptionApplication(id);

  if (!animalToAdopt) {
    notFound();
  }

  
  
  
  const currentUserHasBlockingApplication =
    animalToAdopt.adoptionApplications &&
    animalToAdopt.adoptionApplications.length > 0;

  if (currentUserHasBlockingApplication) {
    redirect(`/dashboard/my-adoption-applications`);
  }

  const applicantDefaults = await fetchAdoptionApplicantDefaults();

  return (
    <>
      
      <section className="bg-organic-accent-100">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
          <h1 className="mb-5 font-display text-[clamp(34px,5vw,56px)] leading-[1.05] tracking-[-0.02em]">
            Adoption Application
          </h1>
          <p className="max-w-[52ch] text-[16px] leading-[1.65] text-pretty text-organic-neutral-800">
            Three short sections about you and your home, so we can be sure
            this is a good fit.
          </p>
        </div>
      </section>

      
      <main className="mx-auto w-full max-w-6xl px-5 pt-10 pb-16 sm:px-8 sm:pt-12 lg:px-14 lg:pb-20">
        
        <MyApplicationForm
          animal={animalToAdopt}
          applicantDefaults={applicantDefaults}
          variant="public"
          selectContentClassName="theme-organic"
        />
      </main>
    </>
  );
};

export default Page;