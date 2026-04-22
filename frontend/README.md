# API Creator - Frontend (Angular)

Interfaz de usuario interactiva construida con Angular para configurar, probar y descargar proyectos de API generados dinámicamente.

## Flujo de Trabajo

La interfaz guía al usuario a través de 4 pasos fundamentales:

1. **Conexión:** Configuración de credenciales MySQL y análisis de esquema.
2. **Configuración CRUD:** Selección de tablas, métodos y creación de consultas SQL personalizadas.
3. **Gestión de Usuarios:** Administración de acceso y roles para la futura API.
4. **Generación:** Vista previa del código y descarga del proyecto en formato `.ZIP`.

## Funcionalidades Destacadas

- **Editor SQL Integrado:** Permite escribir y probar consultas personalizadas con previsualización de datos.
- **Gestor de Relaciones:** Herramienta visual para definir relaciones entre tablas (Joins).
- **Importación/Exportación:** Guarda el progreso de tu configuración en archivos JSON para continuar más tarde.
- **ZIP Bundler:** Genera y empaqueta automáticamente `index.js`, `package.json`, `docs.html` y `.env`.

## Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (Puerto 4200)
npm start
```

## Tecnologías Utilizadas

- **Angular 19:** Framework principal.
- **Bootstrap 5:** Estructura y diseño responsivo.
- **JSZip:** Generación de archivos comprimidos en el cliente.
- **FileSaver:** Gestión de descargas de archivos.
- **RxJS:** Manejo de flujos de datos asíncronos.
