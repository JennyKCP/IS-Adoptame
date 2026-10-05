import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/app/lib/prisma";
import { authOptions } from "@/auth.options";

export const auth = betterAuth({
  ...authOptions(prisma),
  emailAndPassword: {
    enabled: true,
    
    
    
    
    
    disableSignUp: true,
  },
  
  
  plugins: [nextCookies()],
});
