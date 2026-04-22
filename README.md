# API Creator - Node.js + MySQL

Esta herramienta permite generar APIs completas y listas para desplegar a partir de una base de datos MySQL existente. El sistema analiza el esquema, permite seleccionar tablas, definir métodos CRUD y consultas personalizadas, y gestiona la seguridad mediante JWT y roles.

## Estructura del Proyecto

El proyecto se divide en dos componentes principales:

1. **Backend (Generador):** Servidor Node.js que procesa las solicitudes de análisis de BD, ejecución de SQL y generación del código de la API.
2. **Frontend (Generador):** Aplicación Angular que proporciona la interfaz de usuario para configurar y descargar el proyecto generado.

## Características Principales

- **Análisis Automático:** Conexión y lectura del esquema de cualquier base de datos MySQL.
- **Generación de CRUD:** Creación automática de endpoints GET, POST, PUT y DELETE para cada tabla seleccionada.
- **Consultas Personalizadas:** Posibilidad de añadir métodos SQL personalizados con validación de sintaxis en tiempo real.
- **Gestión de Usuarios de API (Paso 3):**
    - Creación automática de la tabla `users_api` en la base de datos de destino.
    - Interfaz para Crear, Listar y Editar usuarios de la API.
    - Soporte para roles: `admin`, `editor` y `lector`.
- **Seguridad Integrada:** Generación de código con autenticación JWT y autorización basada en roles.
- **Documentación Interactiva:** Cada proyecto generado incluye un archivo `docs.html` (tipo Swagger) para probar los endpoints inmediatamente.
- **Descarga en ZIP:** Empaquetado completo del proyecto (código, documentación, configuración y variables de entorno) para su despliegue.

## Guía de Instalación y Ejecución

### Requisitos Previos
- Node.js instalado.
- Servidor MySQL accesible.

### Configuración del Generador

1. **Backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```
   *Escucha en el puerto 3001*

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   *Escucha en el puerto 4200*

## Notas Importantes

- **Seguridad:** El generador utiliza `bcryptjs` para el hash de contraseñas y `jsonwebtoken` para la seguridad de los tokens.
- **Roles:**
    - `admin`: Acceso total (incluyendo gestión de usuarios).
    - `editor`: Permiso para crear y modificar registros.
    - `lector`: Acceso solo de lectura (GET).
- **Despliegue:** El proyecto generado incluye un archivo `.env` sugerido para facilitar la configuración en producción.

## Referencias Técnicas

- **Backend:** Node.js, Express, Mysql2, Bcryptjs, Cors.
- **Frontend:** Angular, Bootstrap 5, JSZip, FileSaver.
- **Base de Datos:** Requiere una tabla `users_api` para el funcionamiento del sistema de autenticación generado.
