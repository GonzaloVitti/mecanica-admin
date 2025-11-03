# Mecanica - Panel de Administración

Un sistema integral de administración para comercio electrónico desarrollado por PONT Solutions.

## Mecanica - Panel de Administración

## Descripción

Mecanica Admin es un panel de administración completo construido con Next.js y Tailwind CSS, diseñado específicamente para gestionar talleres mecánicos. Proporciona a los administradores todas las herramientas necesarias para supervisar servicios, repuestos, clientes, mecánicos y métricas de operación en una solución robusta y escalable.

Desarrollado por PONT Solutions, esta plataforma utiliza las características más avanzadas de Next.js 15 como renderizado del lado del servidor (SSR), generación de sitios estáticos (SSG) e integración perfecta de rutas API. Combinado con React 19 y TypeScript, Mecanica Admin ofrece una experiencia de usuario fluida tanto para administradores como para operadores del taller.

## Tecnologías Utilizadas

Mecanica Admin está construido con:

- **Next.js 15**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Docker** (para el despliegue)

## Características principales

- **Gestión completa de productos**: Registro, categorización, inventario y gestión de variantes
- **Seguimiento de pedidos en tiempo real**: Visualización del estado de pedidos y envíos
- **Administración de clientes**: Historial completo, perfiles de usuario y preferencias
- **Panel de métricas**: Estadísticas clave del negocio, ventas, conversiones y satisfacción del cliente
- **Gestión de inventario**: Control de stock, alertas de productos agotados y reposición
- **Sistema de cupones y descuentos**: Gestión de promociones y ofertas especiales
- **Modo oscuro integrado**: Interfaz adaptable para distintas condiciones de uso

## Instalación

### Requisitos previos

Para comenzar a usar Mecanica Admin, asegúrate de tener:

- Node.js 18.x o posterior (recomendado usar Node.js 20.x o posterior)
- NPM o Yarn como gestor de paquetes
- Docker (opcional, para desarrollo con contenedores)

### Clonar el repositorio

```bash
git clone https://github.com/pontsolutions/mecanica-admin.git
cd mecanica-admin
```

### Instalación de dependencias

```bash
npm install --legacy-peer-deps
```

Algunos paquetes incluidos pueden causar problemas de dependencias con React 19. Con npm, la bandera `--legacy-peer-deps` es una solución temporal para este problema.

### Iniciar el servidor de desarrollo

```bash
npm run dev
```

## Integración con el backend

Mecanica Admin se integra con una API RESTful desarrollada en Django. Para la conexión completa:

1. Asegúrate de tener el servidor Mecanica en funcionamiento
2. Configura las variables de entorno para la conexión con la API
3. Verifica la conexión a través del panel de administración

## Desarrollo con Docker

### Construir e iniciar contenedores

```bash
docker-compose up --build
```

### Ver logs de contenedores

```bash
docker-compose logs -f
```

## Módulos del sistema

Mecanica Admin incluye los siguientes módulos principales:

- **Dashboard**: Vista general de métricas y actividad del taller
- **Servicios**: Gestión completa de servicios mecánicos
- **Repuestos**: Administración de inventario de repuestos
- **Clientes**: Base de datos y perfiles de clientes
- **Mecánicos**: Gestión de personal técnico
- **Reportes**: Generación de informes personalizables
- **Configuración**: Ajustes del sistema y perfiles de administrador

## Contribución

PONT Solutions mantiene este proyecto como una solución propietaria para talleres mecánicos. Para reportar problemas o sugerencias, contacta directamente con el equipo de desarrollo.

## Soporte técnico

Para soporte técnico, contacta a PONT Solutions:

- **Email**: soporte@pontsolutions.com
- **Teléfono**: +52 (123) 456-7890

## Licencia

© 2025 PONT Solutions. Todos los derechos reservados. Este software es propiedad de PONT Solutions y está protegido por leyes de propiedad intelectual.

---

Desarrollado con ❤️ por PONT Solutions