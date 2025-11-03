import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mecanica | Administración",
  description: "Sistema de administración Mecanica",
};

export default function SignIn() {
  return <SignInForm />;
}
