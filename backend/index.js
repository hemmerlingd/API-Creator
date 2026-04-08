const express = require("express");
const mysql = require("mysql2/promise"); // Usamos la versión con promesas
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3001;

// --- Middlewares ---
// Habilita CORS para permitir peticiones desde el frontend de Angular (que corre en otro puerto)
app.use(cors());
// Permite que Express parsee el cuerpo de las peticiones POST en formato JSON
app.use(express.json());
app.use(bodyParser.json());

/**
 * @route   POST /api/execute-sql
 * @desc    Ejecuta un comando SQL en la base de datos del usuario.
 * @access  Public
 */
app.post("/api/execute-sql", async (req, res) => {
  const { dbConfig, sql } = req.body;
  const { host, port, user, pass, dbName } = dbConfig;

  // Validación básica de entrada
  if (!host || !user || !dbName) {
    return res.status(400).json({
      success: false,
      message: "Los campos host, user y dbName son obligatorios.",
    });
  }

  if (!dbConfig || !sql) {
    return res
      .status(400)
      .json({ success: false, message: "dbConfig y sql son requeridos." });
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

    await connection.query(sql); // Usamos query para poder ejecutar sentencias como CREATE TABLE
    res.json({ success: true, message: "Comando SQL ejecutado exitosamente." });
  } catch (error) {
    console.error(`[ERROR] Ejecutando SQL:`, error.message);
    res.status(500).json({
      success: false,
      message: "Error al ejecutar el comando SQL.",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
});

/**
 * @route   POST /api/test-query
 * @desc    Ejecuta una consulta SQL de solo lectura (SELECT) y devuelve los resultados.
 * @access  Public
 */
app.post("/api/test-query", async (req, res) => {
  const { dbConfig, sql } = req.body;
  const { host, port, user, pass, dbName } = dbConfig;

  if (!host || !user || !dbName || !sql) {
    return res
      .status(400)
      .json({ success: false, message: "Faltan parámetros o consulta." });
  }

  // Validación simple para prevenir comandos destructivos en la vista previa
  const upperSql = sql.trim().toUpperCase();
  if (
    !upperSql.startsWith("SELECT") &&
    !upperSql.startsWith("SHOW") &&
    !upperSql.startsWith("DESCRIBE")
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Solo se permiten consultas de lectura (SELECT) para la vista previa.",
    });
  }

  let connection;
  try {
    // 1. Establece la conexión
    connection = await mysql.createConnection({
      host,
      port: port || 3306,
      user,
      password: pass,
      database: dbName,
    });

    // 2. Ejecuta y devuelve las filas
    const [rows] = await connection.execute(sql);
    res.json({ success: true, rows });
  } catch (error) {
    console.error(`[ERROR] Test query:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

/**
 * @route   POST /api/create-api-user
 * @desc    Crea un nuevo usuario para la API en la tabla `users`.
 * @access  Public
 */
app.post("/api/create-api-user", async (req, res) => {
  const { dbConfig, username, password } = req.body;
  const { host, port, user, pass, dbName } = dbConfig;

  // Validación básica de entrada
  if (!host || !user || !dbName) {
    return res.status(400).json({
      success: false,
      message: "Los campos host, user y dbName son obligatorios.",
    });
  }

  if (!dbConfig || !username || !password) {
    return res.status(400).json({
      success: false,
      message: "dbConfig, username y password son requeridos.",
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

    const [existingUser] = await connection.execute(
      "SELECT id FROM users_API WHERE username = ?",
      [username],
    );
    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: "El nombre de usuario ya está en uso.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await connection.execute(
      "INSERT INTO users_API (username, password) VALUES (?, ?)",
      [username, hashedPassword],
    );

    res.status(201).json({
      success: true,
      message: "Usuario de API creado exitosamente.",
      user: { id: result.insertId, username: username },
    });
  } catch (error) {
    console.error(`[ERROR] Creando usuario de API:`, error.message);
    res.status(500).json({
      success: false,
      message: "Error al crear el usuario de API. ¿La tabla `users` existe?",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
});

/**
 * @route   POST /api/get-api-users
 * @desc    Obtiene los usuarios de la API desde la tabla `users`.
 * @access  Public
 */
app.post("/api/get-api-users", async (req, res) => {
  const { dbConfig } = req.body;
  const { host, port, user, pass, dbName } = dbConfig;

  // Validación básica de entrada
  if (!host || !user || !dbName) {
    return res.status(400).json({
      success: false,
      message: "Los campos host, user y dbName son obligatorios.",
    });
  }
  if (!dbConfig) {
    return res
      .status(400)
      .json({ success: false, message: "dbConfig es requerido." });
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
    const [users] = await connection.execute(
      "SELECT id, username, created_at FROM users_API",
    );
    res.json({ success: true, users: users });
  } catch (error) {
    // No es un error crítico si la tabla aún no existe.
    if (error.code === "ER_NO_SUCH_TABLE") {
      res.json({ success: true, users: [] });
    } else {
      console.error(`[ERROR] Obteniendo usuarios de API:`, error.message);
      res.status(500).json({
        success: false,
        message: "Error al obtener los usuarios de API.",
        error: error.message,
      });
    }
  } finally {
    if (connection) await connection.end();
  }
});

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

    // 5. Envía una respuesta exitosa con el esquema completo y los nombres de las tablas al frontend
    res.json({ success: true, tables: tableNames, schema: schema });
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

app.post("/api/generate-api", (req, res) => {
  const { tables, schema } = req.body;

  if (!tables || !schema) {
    return res
      .status(400)
      .json({ success: false, message: "Missing tables or schema." });
  }

  const generatedApi = generateApiCode(tables, schema, req.body.dbConfig);

  res.json({
    success: true,
    message: "API generated successfully.",
    generatedApi,
  });
});

function generateApiCode(tables, schema, dbConfig) {
  const code = [];
  code.push(`
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: "${dbConfig.host}",
  port: ${dbConfig.port},
  user: "${dbConfig.user}",
  password: "${dbConfig.pass}",
  database: "${dbConfig.dbName}"
};

async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

`);

  for (const table in tables) {
    if (tables.hasOwnProperty(table)) {
      const operations = tables[table];
      const tableSchema = schema[table];
      const primaryKey =
        tableSchema.find((col) => col.Key === "PRI")?.Field || "id";

      let selectFields = [];
      let joinClauses = [];

      // Construir SELECT y JOINs dinámicos basados en relaciones
      tableSchema.forEach((col) => {
        if (col.relatedWith && schema[col.relatedWith.table]) {
          const relTable = col.relatedWith.table;
          const relField = col.relatedWith.fieldId;
          const relFieldData = col.relatedWith.fieldShow;
          const relTableAlias = `${relTable}_rel`; // Alias único para evitar colisiones
          const relPK = relField;
          //   schema[relTable].find((c) => c.Key === "PRI")?.Field || "id";

          selectFields.push(
            `\`${relTableAlias}\`.\`${relFieldData}\` AS \`${relTableAlias}\``,
          );
          joinClauses.push(
            `LEFT JOIN \`${relTable}\` AS \`${relTableAlias}\` ON \`${table}\`.\`${col.Field}\` = \`${relTableAlias}\`.\`${relPK}\``,
          );
        } else {
          selectFields.push(`\`${table}\`.\`${col.Field}\``);
        }
      });

      const selectString = selectFields.join(", ");
      const fromString = `\`${table}\` ${joinClauses.join(" ")}`.trim();

      if (operations.read) {
        code.push(`
// GET all ${table}
app.get('/api/${table}', async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute('SELECT ${selectString} FROM ${fromString}');
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET ${table} by ${primaryKey}
app.get('/api/${table}/:${primaryKey}', async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute('SELECT ${selectString} FROM ${fromString} WHERE \`${table}\`.\`${primaryKey}\` = ?', [req.params.${primaryKey}]);
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: '${table} not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`);
      }

      if (operations.create) {
        const columns = tableSchema
          .map((col) => col.Field)
          .filter((col) => col !== primaryKey);
        const placeholders = columns.map(() => "?").join(", ");
        const columnNames = columns.map((col) => `\`${col}\``).join(", ");
        code.push(`
// CREATE ${table}
app.post('/api/${table}', async (req, res) => {
  try {
    const connection = await getConnection();
    const { ${columns.join(", ")} } = req.body;
    const [result] = await connection.execute(
      'INSERT INTO \`${table}\` (${columnNames}) VALUES (${placeholders})',
      [${columns.join(", ")}]
    );
    await connection.end();
    res.status(201).json({ ${primaryKey}: result.insertId, ${columns.join(", ")} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`);
      }

      if (operations.update) {
        const columns = tableSchema
          .map((col) => col.Field)
          .filter((col) => col !== primaryKey);
        const setClause = columns.map((col) => `\`${col}\` = ?`).join(", ");
        code.push(`
// UPDATE ${table}
app.put('/api/${table}/:${primaryKey}', async (req, res) => {
  try {
    const connection = await getConnection();
    const { ${columns.join(", ")} } = req.body;
    await connection.execute(
      'UPDATE \`${table}\` SET ${setClause} WHERE \`${primaryKey}\` = ?',
      [${columns.join(", ")}, req.params.${primaryKey}]
    );
    await connection.end();
    res.json({ message: '${table} updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`);
      }

      if (operations.delete) {
        code.push(`
// DELETE ${table}
app.delete('/api/${table}/:${primaryKey}', async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute('DELETE FROM \`${table}\` WHERE \`${primaryKey}\` = ?', [req.params.${primaryKey}]);
    await connection.end();
    res.json({ message: '${table} deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

  /**
 * @route   GET /api/
 * @desc    Muestra el listado de Consultas disponibles.
 * @access  Public
 */
app.get("/api", async (req, res) => {
  res.sendFile("index.html");
});

`);
      }

      // Generar endpoints para métodos personalizados (customMethods)
      const customMethods =
        operations.customMethods || tableSchema.customMethods;
      if (customMethods && Array.isArray(customMethods)) {
        customMethods.forEach((method) => {
          // Escapamos backticks y símbolos de dólar para evitar errores de sintaxis en el archivo generado
          const safeQuery = method.query
            .replace(/`/g, "\\`")
            .replace(/\$/g, "\\$");
          code.push(`
// CUSTOM METHOD: ${method.name}
app.${method.type}('/api/${table}/custom/${method.name}', async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(\`${safeQuery}\`);
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


        `);
        });
      }
    }
  }

  code.push(`
app.listen(port, () => {
  console.log(\`Generated API server listening at http://localhost:\${port}\`);
});
`);

  return code.join("");
}
// --- Iniciar el servidor ---
app.listen(PORT, () => {
  console.log(`Backend server está escuchando en http://localhost:${PORT}`);
});
