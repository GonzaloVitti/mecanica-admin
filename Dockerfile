FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero (caching)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copiar fuente
COPY . .

# Variables de entorno baked en el build
# NEXT_PUBLIC_* se fija en build-time, el browser las usa para conectar al backend
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build de producción
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
