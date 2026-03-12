const express = require("express");
const mysql = require("mysql2/promise"); // Usamos la versión con promesas
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3001;

// --- Middlewares ---
// Habilita CORS para permitir peticiones desde el frontend de Angular (que corre en otro puerto)
app.use(cors());
// Permite que Express parsee el cuerpo de las peticiones POST en formato JSON
app.use(express.json());
app.use(bodyParser.json());
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
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'tu_clave_secreta_super_segura';

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
  // --- Middleware de Seguridad ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token requerido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}
  // --- Ruta de Login (Ejemplo básico) ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  // Aquí deberías validar contra tu tabla de usuarios
  // Por ahora generamos un token si el usuario existe en la petición
  if (username) {
    const user = { name: username };
    const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
    res.json({ accessToken });
  } else {
    res.status(400).json({ message: 'Usuario requerido' });
  }
});
`);

  for (const table in tables) {
    if (tables.hasOwnProperty(table)) {
      const operations = tables[table];
      const tableSchema = schema[table];
      const primaryKey =
        tableSchema.find((col) => col.Key === "PRI")?.Field || "id";

      if (operations.read) {
        code.push(`
// GET all ${table}
app.get('/api/${table}', async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM \`${table}\`');
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
    const [rows] = await connection.execute('SELECT * FROM \`${table}\` WHERE \`${primaryKey}\` = ?', [req.params.${primaryKey}]);
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
`);
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
  // console.log(`Backend server está escuchando en http://localhost:${PORT}`);
});
