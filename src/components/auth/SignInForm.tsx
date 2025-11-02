"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { login } from "@/app/lib/auth";
import { useRouter } from 'next/navigation';
import React, { useState } from "react";

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(true); // Por defecto true para mejor UX
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
  
    try {
      // Enviar el estado de isChecked como tercer parámetro
      const result = await login(username, password, isChecked);
      
      // Verificar si hay un error de permisos
      if (result && 'error' in result && result.error === 'access_denied') {
        setError(result.message || "No tienes permisos para acceder al panel de administración");
        return;
      }
      
      if (result && !('error' in result)) {
        router.push('/');
      } else {
        setError("Email o contraseña incorrectos");
      }
    } catch (error) {
      setError("Error al intentar iniciar sesión");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col flex-1 lg:w-1/2 w-full max-w-md mx-auto p-6">
        <div className="flex flex-col justify-center flex-1 w-full">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Iniciar Sesión
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ¡Ingresa tu mail y contraseña para iniciar sesión!
              </p>
            </div>
            {error && (
              <div className="mb-4 p-3 text-sm text-red-500 bg-red-100 rounded-md dark:bg-red-900/30">
                {error}
              </div>
            )}
            <div>
              <div className="relative py-3 sm:py-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                </div>
              </div>
              <form onSubmit={handleLogin}>
                <div className="space-y-6">
                  <div>
                    <Label>
                      Email <span className="text-error-500">*</span>{" "}
                    </Label>
                    <Input 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ingresa tu email" 
                      type="email"
                      required 
                    />
                  </div>
                  <div>
                    <Label>
                      Contraseña <span className="text-error-500">*</span>{" "}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ingresa tu contraseña"
                        required
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isChecked} onChange={setIsChecked} />
                      <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                        Mantener sesión iniciada
                      </span>
                    </div>
{/*                     <Link
                      href="/reset-password"
                      className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link> */}
                  </div>
                  <div>
                    <Button 
                      className="w-full" 
                      size="sm" 
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}