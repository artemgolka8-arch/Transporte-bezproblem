import { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      extraSections: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    extraSections?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    extraSections?: string[];
  }
}
