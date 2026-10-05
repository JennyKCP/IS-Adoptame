import { Inter, Open_Sans, Geist, Caprasimo, Figtree } from "next/font/google";

export const inter = Inter({ subsets: ["latin"] });
export const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
});

export const fontgeist = Geist({
  subsets: ["latin"] });




export const caprasimo = Caprasimo({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-caprasimo",
  display: "swap",
});

export const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});
