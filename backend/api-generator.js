const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post("/generate-api", (req, res) => {
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

app.listen(port, () => {
  console.log(`API generator server listening at http://localhost:${port}`);
});
