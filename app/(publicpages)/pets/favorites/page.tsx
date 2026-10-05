import Link from "next/link";
import { getCachedSession } from "@/app/lib/auth/session";
import FavoritesGrid from "@/components/public-pages/pets/favorites/favorites-grid";




const SIGN_IN_HREF = `/sign-in?callbackUrl=${encodeURIComponent(
  "/pets/favorites",
)}`;

const Page = async () => {
  const session = await getCachedSession();
  const isSignedIn = Boolean(session?.user?.personId);

  return (
    <>
      
      <section className="bg-organic-accent-100">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
          
          <h1 className="mb-4 font-display text-[clamp(34px,5vw,56px)] leading-[1.05] tracking-[-0.02em]">
            favoritos
          </h1>

          
          <p className="text-[15px] text-organic-neutral-800">
            {isSignedIn
              ? "Aquí están las mascotas que guardaste para volver a ellas."
              : "Guarda las mascotas que quieras volver a visitar."}
          </p>
        </div>
      </section>

      
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-14">
        {isSignedIn ? <FavoritesGrid /> : <SignedOutState />}
      </div>
    </>
  );
};


const SignedOutState = () => (
  <div className="py-20 text-center">
    <h2 className="font-display text-[clamp(24px,4vw,32px)]">
      Inicia sesión para ver tus favoritos
    </h2>
    <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-[1.65] text-pretty text-organic-neutral-800">
      Las mascotas guardadas están vinculadas a tu cuenta para que puedas
      encontrarlas cuando vuelvas a buscar.
    </p>

    <Link
      href={SIGN_IN_HREF}
      className="mt-7 inline-flex rounded-full bg-primary px-[26px] py-[13px] text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-organic-accent-600"
    >
      Iniciar sesión
    </Link>

    
    <p className="mt-5 text-[15px] text-organic-neutral-800">
      O{" "}
      <Link
        href="/pets"
        className="whitespace-nowrap text-primary underline underline-offset-4 hover:no-underline"
      >
        explora todas las mascotas que buscan un hogar
      </Link>
      .
    </p>
  </div>
);

export default Page;
