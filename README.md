# Adoptame

Plataforma para gestionar un refugio de animales: ingresos, fichas, tareas,
adopciones, solicitudes y un portal público para los adoptantes.

La aplicación está construida con Next.js, TypeScript, Prisma, PostgreSQL,
Better Auth y Tailwind CSS.

> El proyecto está en desarrollo activo. Pueden existir cambios incompatibles
> entre versiones.

## Documentación

- [Arquitectura y estructura](./docs/architecture.md)
- [Flujos principales](./docs/flows.md)

## Requisitos

Instala estas herramientas antes de comenzar:

- [Node.js 24](https://nodejs.org/)
- npm 10.9 o superior
- [Docker](https://www.docker.com/) y Docker Compose
- OpenSSL para generar secretos (`openssl version`)

También necesitarás una cuenta de [Vercel](https://vercel.com/) y un Blob
Store si quieres subir imágenes desde el dashboard.

## Instalación local

### Inicio rápido

La aplicación es full-stack: Next.js ejecuta la interfaz y el backend en el
mismo proceso. No existe un servicio backend separado que debas iniciar.

Desde la raíz del proyecto, ejecuta:

```bash
npm ci                         # solo la primera vez
docker compose up -d           # inicia PostgreSQL
docker compose ps              # verifica el contenedor
npm run db                     # sincroniza Prisma y carga el seed
npm run dev                    # inicia frontend y backend
```

Después abre [http://localhost:3000](http://localhost:3000). Para detener la
aplicación, presiona `Ctrl + C` en la terminal donde ejecutaste `npm run dev`.

### 1. Abrir el proyecto

Abre una terminal en la carpeta del proyecto:

```bash
cd /ruta/a/la/carpeta-del-proyecto
```

### 2. Instalar dependencias

```bash
npm ci
```

El proyecto requiere Node.js `24.x` y npm `10.9` o superior.

### 3. Crear la configuración local

```bash
cp .env.example .env
```

Edita `.env` y completa, como mínimo, estas variables:

```env
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_ALLOWED_HOSTS="localhost:*"
ADMIN_PASSWORD="elige-una-contrasena-segura"

DATABASE_URL="postgresql://postgres:mysecretpassword@127.0.0.1:5432/postgres"
DATABASE_URL_UNPOOLED="postgresql://postgres:mysecretpassword@127.0.0.1:5432/postgres"
```

Genera `BETTER_AUTH_SECRET` con:

```bash
openssl rand -base64 32
```

Copia el resultado en `BETTER_AUTH_SECRET`. No compartas este valor ni el
archivo `.env`.

### 4. Configuración opcional

#### Imágenes

Para subir, editar o eliminar imágenes desde el dashboard, crea un Blob Store
en Vercel y añade su token:

```env
BLOB_READ_WRITE_TOKEN="tu-token-de-vercel-blob"
```

Sin este token, las imágenes incluidas en el seed pueden visualizarse, pero no
se podrán gestionar las nuevas imágenes desde la aplicación.

#### Inicio de sesión con GitHub o Google

El inicio de sesión con email y contraseña funciona sin OAuth. Para habilitar
GitHub o Google, completa las variables correspondientes en `.env` y registra
los callbacks locales:

```text
http://localhost:3000/api/auth/callback/github
http://localhost:3000/api/auth/callback/google
```

#### Asistente de IA

El asistente es opcional. Para habilitarlo, configura:

```env
GROQ_API_KEY="tu-api-key"
AI_PROVIDER_TIER="free"
AI_TOOL_APPROVAL_SECRET="otro-secreto-generado-con-openssl"
```

Puedes generar el secreto de aprobación con el mismo comando:

```bash
openssl rand -base64 32
```

### 5. Levantar PostgreSQL

El archivo `compose.yml` levanta únicamente PostgreSQL; la aplicación Next.js
se ejecuta fuera de Docker.

```bash
docker compose up -d
```

Comprueba que el contenedor esté activo:

```bash
docker compose ps
```

Si el puerto `5432` ya está ocupado, define otro puerto en `.env`:

```env
POSTGRES_PORT="5433"
```

Las variables Docker disponibles son `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`POSTGRES_DB` y `POSTGRES_PORT`. Si cambias usuario, contraseña o base de
datos, actualiza también las URLs `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.

### 6. Crear la base de datos y los datos iniciales

```bash
npm run db
```

Este comando genera el cliente de Prisma, sincroniza el esquema y ejecuta el
seed con usuarios y animales de ejemplo.

### 7. Iniciar la aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Este comando inicia Next.js en modo desarrollo, incluyendo las páginas,
acciones del servidor, rutas API y conexión de Prisma con PostgreSQL.

## Acceso de administrador

Entra en [http://localhost:3000/sign-in](http://localhost:3000/sign-in) con:

- **Email:** `admin@example.com`
- **Contraseña:** el valor definido en `ADMIN_PASSWORD`

La cuenta se crea al ejecutar `npm run db`.

## Comandos útiles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Next.js en modo desarrollo. |
| `npm run db` | Genera Prisma, sincroniza la base de datos y ejecuta el seed. |
| `npm run db:reset` | Borra y recrea el esquema, y vuelve a ejecutar el seed. |
| `npm run prisma:studio` | Abre Prisma Studio. |
| `npm run lint` | Ejecuta ESLint. |
| `npm test` | Ejecuta las pruebas unitarias. |
| `npm run test:db` | Ejecuta las pruebas contra una base de datos temporal. |
| `npm run e2e:install` | Instala Chromium para Playwright. |
| `npm run e2e` | Ejecuta las pruebas end-to-end. |
| `docker compose down` | Detiene PostgreSQL y conserva sus datos. |
| `docker compose down -v` | Detiene PostgreSQL y elimina sus datos. |

### Detener y reiniciar servicios

Para detener solo PostgreSQL y conservar la información local:

```bash
docker compose down
```

Para reiniciar PostgreSQL sin eliminar el volumen:

```bash
docker compose up -d
```

Para eliminar completamente la base de datos local y sus datos:

```bash
docker compose down -v
```

Después de eliminar el volumen, debes ejecutar nuevamente `npm run db` para
crear el esquema y cargar los datos iniciales.

> `docker compose down -v` es una operación destructiva para la base local:
> elimina el volumen de PostgreSQL y todos sus datos.

## Estructura principal

```text
app/          Rutas, páginas, acciones y APIs de Next.js
components/   Componentes reutilizables de la interfaz
prisma/       Esquema, seed y pruebas de base de datos
public/       Recursos estáticos e imágenes del seed
tests/e2e/    Pruebas end-to-end con Playwright
compose.yml   PostgreSQL para desarrollo local
```

## Licencia y créditos

Las imágenes de animales provienen de [Unsplash](https://unsplash.com/),
[Pixabay](https://pixabay.com/) y [Pexels](https://www.pexels.com/), bajo sus
respectivas licencias.
