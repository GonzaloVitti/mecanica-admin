import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Red Lenic | Administración",
  description: "Sistema de administración Red Lenic",
};

export default function SignIn() {
  return <SignInForm />;
}
