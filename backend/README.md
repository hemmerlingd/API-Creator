# API Creator - Backend

Este es el servidor central del generador de APIs. Se encarga de la lógica de negocio, la conexión con las bases de datos MySQL y la generación dinámica del código fuente de los proyectos.

## Características Técnicas

- **Análisis de Esquema:** Utiliza `mysql2/promise` para explorar tablas, columnas y tipos de datos.
- **Generación de Código:** Motor de plantillas dinámico que construye archivos `index.js`, `package.json`, `.env` y `docs.html`.
- **Seguridad en Generación:** Implementa lógica de hashing con `bcryptjs` para los usuarios de la API generada.
- **Gestión de Usuarios:** Endpoints dedicados para la administración remota de la tabla `users_api` en la base de datos conectada.

## Endpoints Principales

```bash
POST /api/analyze-schema   # Analiza la estructura de la BD
POST /api/generate-api     # Genera el código fuente del proyecto
POST /api/execute-sql      # Ejecuta comandos SQL (DDL/DML)
POST /api/get-api-users    # Obtiene lista de usuarios de la API
POST /api/create-api-user  # Crea un nuevo usuario de API
POST /api/update-api-user  # Actualiza credenciales/roles de usuario
POST /api/test-query       # Prueba consultas SELECT en tiempo real
```

## Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor (Puerto 3001)
npm start
```

## Dependencias Clave

- `express`: Framework web.
- `mysql2`: Driver para MySQL con soporte de promesas.
- `bcryptjs`: Hashing de contraseñas.
- `cors`: Manejo de peticiones entre dominios.
- `body-parser`: Parsing de JSON.
