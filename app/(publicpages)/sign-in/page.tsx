import { redirect } from "next/navigation";
import { IconPaw } from "@tabler/icons-react";
import { TriangleAlert } from "lucide-react";
import { auth } from "@/auth";
import {
  DEACTIVATED_ACCOUNT_CODE,
  DEACTIVATED_ACCOUNT_MESSAGE,
} from "@/auth.options";
import { getCachedSession } from "@/app/lib/auth/session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GitHubIcon, GoogleIcon } from "@/components/auth/provider-icons";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SearchParamsType } from "@/app/lib/types";
import { safeInternalPath } from "@/app/lib/utils/safe-redirect";



const providerMap = [
  { id: "github", name: "GitHub", label: "Iniciar sesión con GitHub" },
  { id: "google", name: "Google", label: "Iniciar sesión con Google" },
] as const;

const providerIcons = {
  github: GitHubIcon,
  google: GoogleIcon,
} as const;


const signInPathFor = (destination: string) =>
  `/sign-in?callbackUrl=${encodeURIComponent(destination)}`;


const signInErrorMessage = (code: string) =>
  code === DEACTIVATED_ACCOUNT_CODE
    ? DEACTIVATED_ACCOUNT_MESSAGE
    : "Inténtalo de nuevo o contacta al refugio si el problema continúa.";

interface Props {
  searchParams: SearchParamsType;
}

const SignInPage = async ({ searchParams }: Props) => {
  const { callbackUrl, error } = await searchParams;
  
  
  
  
  const redirectTo = safeInternalPath(callbackUrl, "/");

  const session = await getCachedSession();
  if (session) {
    return redirect(redirectTo);
  }

  return (
    
    
    
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-14 sm:px-8 sm:py-20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center">
          
          <span
            aria-hidden="true"
            className="grid size-[38px] place-items-center rounded-full bg-primary"
          >
            <IconPaw className="size-5 text-background" />
          </span>
          <h1 className="mt-5 font-display text-[32px]">Iniciar sesión</h1>
        </div>

        <div className="mt-8 rounded-[32px] bg-card p-8 shadow-organic-md">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>No pudimos iniciar tu sesión</AlertTitle>
              <AlertDescription>{signInErrorMessage(error)}</AlertDescription>
            </Alert>
          )}
          <SignInForm callbackUrl={redirectTo} />

          
          <div className="relative my-6 flex justify-center">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-1/2 h-px bg-border"
            />
            <span className="relative bg-card px-3 text-[12px] text-muted-foreground">
              o
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {providerMap.map((provider) => {
              const Icon = providerIcons[provider.id];
              return (
                <form
                  key={provider.id}
                  action={async () => {
                    "use server";
                    const { url } = await auth.api.signInSocial({
                      body: {
                        provider: provider.id,
                        callbackURL: redirectTo,
                        errorCallbackURL: signInPathFor(redirectTo),
                      },
                    });
                    if (url) redirect(url);
                  }}
                >
                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-transparent px-4 text-[14px] transition-colors hover:bg-accent"
                  >
                    {provider.id === "google" ? (
                      
                      
                      
                      <span className="flex items-center justify-center rounded bg-white p-1">
                        <Icon aria-hidden="true" className="w-4 h-4" />
                      </span>
                    ) : (
                      <Icon aria-hidden="true" className="w-5 h-5" />
                    )}
                    <span>{provider.label}</span>
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
