import Link from "next/link";



const footerColumns = [
  {
    heading: "Adopta",
    links: [
      { name: "Todas las mascotas", href: "/pets" },
      { name: "Perros", href: "/pets?category=Dog" },
      { name: "Gatos", href: "/pets?category=Cat" },
    ],
  },
  {
    heading: "Apoya",
    links: [
      { name: "Donar", href: "/donate" },
      { name: "Voluntariado", href: "/volunteer" },
      { name: "Acogida", href: "/foster" },
    ],
  },
  {
    heading: "Nosotros",
    links: [
      { name: "Nosotros", href: "/about" },
      { name: "Contacto", href: "/contact" },
      { name: "Privacidad", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="hidden bg-organic-neutral-900 px-5 py-14 text-organic-neutral-200 md:block sm:px-8 lg:px-14">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="mb-3 font-display text-[20px] text-background">
              Adoptame
            </div>
            <p className="m-0 max-w-[30ch] text-[14px] leading-[1.6] text-organic-neutral-400">
              248 Rescue Way, Brooklyn, NY 11201. Abierto de miércoles a domingo, de 11:00 a 18:00.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div
              key={column.heading}
              className="flex flex-col gap-[10px] text-[14px]"
            >
              <div className="font-display text-[12px] tracking-[0.08em] text-organic-neutral-500 uppercase">
                {column.heading}
              </div>
              {column.links.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-inherit transition-colors hover:text-background"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-organic-neutral-800 pt-[22px] text-[12.5px] text-organic-neutral-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Adoptame</span>
          <span>Brooklyn, Nueva York</span>
        </div>
      </div>
    </footer>
  );
}
