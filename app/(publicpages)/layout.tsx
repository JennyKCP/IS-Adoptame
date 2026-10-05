import DemoBanner from "@/components/demo-banner";
import Footer from "../../components/public-pages/footer";
import TopNavWrapper from "../../components/public-pages/nav/top-nav-wrapper";
import { isDemo } from "../../lib/flags";

export default async function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {isDemo && <DemoBanner />}
      
      <div className="theme-organic flex min-h-screen flex-col bg-background text-foreground">
        <TopNavWrapper />
        <main className="grow pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:pb-0">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
