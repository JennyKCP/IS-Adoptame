import { getCachedSession } from "@/app/lib/auth/session";
import TopNav from "./top-nav";
import { Role } from "@/prisma/generated/enums";

const TopNavWrapper = async () => {
  const session = await getCachedSession();
  const showUserProfile = session ? true : false;

  let dashboardHref = "/dashboard";
  if (session?.user?.role === Role.USER) {
    dashboardHref = "/dashboard/my-adoption-applications"; 
  }

  
  
  const navLinks = [
    { name: "Inicio", href: "/" },
    { name: "Mascotas", href: "/pets" },
    { name: "Nosotros", href: "/about" },
    { name: "Contacto", href: "/contact" },
    { name: "Panel", href: dashboardHref },
  ];

  return (
    <TopNav
      userImage={session?.user.image}
      showUserProfile={showUserProfile}
      links={navLinks}
    />
  );
};

export default TopNavWrapper;
