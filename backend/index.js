const express = require("express");
const mysql = require("mysql2/promise"); // Usamos la versión con promesas
const cors = require("cors");

const app = express();
const PORT = 3000;

// --- Middlewares ---
// Habilita CORS para permitir peticiones desde el frontend de Angular (que corre en otro puerto)
app.use(cors());
// Permite que Express parsee el cuerpo de las peticiones POST en formato JSON
app.use(express.json());

// --- Rutas de la API ---

/**
 * @route   POST /api/analyze-schema
 * @desc    Se conecta a una BD MySQL y devuelve la lista de tablas.
 * @access  Public
 */
app.post("/api/analyze-schema", async (req, res) => {
  const { host, port, user, pass, dbName } = req.body;

  // Validación básica de entrada
  if (!host || !user || !dbName) {
    return res.status(400).json({
      success: false,
      message: "Los campos host, user y dbName son obligatorios.",
    });
  }

  let connection;
  try {
    // 1. Intenta establecer la conexión con la base de datos del usuario
    connection = await mysql.createConnection({
      host: host,
      port: port || 3306,
      user: user,
      password: pass,
      database: dbName,
    });

    // 2. Si la conexión es exitosa, ejecuta la consulta para obtener todas las tablas
    const [tables] = await connection.execute("SHOW TABLES");

    // 3. Mapea el resultado a un array de nombres de tabla
    const tableNames = tables.map((t) => Object.values(t)[0]);

    const schema = {};
    // 4. Para cada tabla, obtener sus columnas
    for (const tableName of tableNames) {
      // Usamos `DESCRIBE` para obtener la estructura de la tabla
      const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
      schema[tableName] = columns;
    }

    console.log(`[SUCCESS] Análisis de esquema para '${dbName}' en '${host}'.`);

    // 5. Envía una respuesta exitosa con el esquema completo al frontend
    res.json({ success: true, schema: schema });
  } catch (error) {
    // Si algo falla (credenciales incorrectas, BD no existe, etc.), captura el error
    console.error(
      `[ERROR] Conectando a '${dbName}' en '${host}':`,
      error.message,
    );

    // Envía una respuesta de error clara al frontend
    res.status(500).json({
      success: false,
      message:
        "No se pudo conectar a la base de datos. Verifica las credenciales y la conexión.",
      error: error.code,
    });
  } finally {
    // 5. Es CRUCIAL cerrar la conexión en cualquier caso (éxito o error)
    if (connection) {
      await connection.end();
      console.log(`[INFO] Conexión a '${dbName}' cerrada.`);
    }
  }
});

// --- Iniciar el servidor ---
app.listen(PORT, () => {
  // console.log(`Backend server está escuchando en http://localhost:${PORT}`);
});
