const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = "tu_clave_secreta_super_segura_y_dificil_de_adivinar"; // ¡CAMBIAR ESTO EN PRODUCCIÓN!

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  database: "enaltura",
};

async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// --- Middleware de Seguridad ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res
      .status(401)
      .json({ message: "Acceso denegado. Token no proporcionado." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ message: "Token inválido o expirado." });
    req.user = user;
    next();
  });
}

// --- Rutas de Autenticación ---

// REGISTRO DE USUARIO
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Usuario y contraseña son requeridos." });
  }

  let connection;
  try {
    connection = await getConnection();

    const [existingUser] = await connection.execute(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );
    if (existingUser.length > 0) {
      return res
        .status(409)
        .json({ message: "El nombre de usuario ya está en uso." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await connection.execute(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
    );

    console.log(`[AUTH] Nuevo usuario registrado: ${username}`);
    res.status(201).json({ message: "Usuario registrado exitosamente." });
  } catch (error) {
    console.error("[ERROR] en /api/register:", error.message);
    res
      .status(500)
      .json({
        message: "Error en el servidor al registrar el usuario.",
        error: error.code,
      });
  } finally {
    if (connection) await connection.end();
  }
});

// LOGIN DE USUARIO
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Usuario y contraseña son requeridos." });
  }

  let connection;
  try {
    connection = await getConnection();
    const [users] = await connection.execute(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    const payload = { user: { id: user.id, name: user.username } };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    res.json({ accessToken });
  } catch (error) {
    console.error("[ERROR] en /api/login:", error.message);
    res
      .status(500)
      .json({
        message: "Error en el servidor durante el login.",
        error: error.code,
      });
  } finally {
    if (connection) await connection.end();
  }
});

// GET all quienes
app.get("/api/quienes", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute("SELECT * FROM `quienes`");
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET quienes by id
app.get("/api/quienes/:id", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM `quienes` WHERE `id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "quienes not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE quienes
app.post("/api/quienes", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const { texto, foto, activo } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `quienes` (`texto`, `foto`, `activo`) VALUES (?, ?, ?)",
      [texto, foto, activo],
    );
    await connection.end();
    res.status(201).json({ id: result.insertId, texto, foto, activo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE quienes
app.put("/api/quienes/:id", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const { texto, foto, activo } = req.body;
    await connection.execute(
      "UPDATE `quienes` SET `texto` = ?, `foto` = ?, `activo` = ? WHERE `id` = ?",
      [texto, foto, activo, req.params.id],
    );
    await connection.end();
    res.json({ message: "quienes updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE quienes
app.delete("/api/quienes/:id", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `quienes` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "quienes deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all servicios
app.get("/api/servicios", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute("SELECT * FROM `servicios`");
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET servicios by id_servicio
app.get("/api/servicios/:id_servicio", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM `servicios` WHERE `id_servicio` = ?",
      [req.params.id_servicio],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "servicios not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE servicios
app.post("/api/servicios", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const { servicio, descripcion, foto, orden } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `servicios` (`servicio`, `descripcion`, `foto`, `orden`) VALUES (?, ?, ?, ?)",
      [servicio, descripcion, foto, orden],
    );
    await connection.end();
    res
      .status(201)
      .json({
        id_servicio: result.insertId,
        servicio,
        descripcion,
        foto,
        orden,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE servicios
app.put("/api/servicios/:id_servicio", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const { servicio, descripcion, foto, orden } = req.body;
    await connection.execute(
      "UPDATE `servicios` SET `servicio` = ?, `descripcion` = ?, `foto` = ?, `orden` = ? WHERE `id_servicio` = ?",
      [servicio, descripcion, foto, orden, req.params.id_servicio],
    );
    await connection.end();
    res.json({ message: "servicios updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE servicios
app.delete(
  "/api/servicios/:id_servicio",
  authenticateToken,
  async (req, res) => {
    try {
      const connection = await getConnection();
      await connection.execute(
        "DELETE FROM `servicios` WHERE `id_servicio` = ?",
        [req.params.id_servicio],
      );
      await connection.end();
      res.json({ message: "servicios deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET all testimonios
app.get("/api/testimonios", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute("SELECT * FROM `testimonios`");
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET testimonios by id_testimonio
app.get(
  "/api/testimonios/:id_testimonio",
  authenticateToken,
  async (req, res) => {
    try {
      const connection = await getConnection();
      const [rows] = await connection.execute(
        "SELECT * FROM `testimonios` WHERE `id_testimonio` = ?",
        [req.params.id_testimonio],
      );
      await connection.end();
      if (rows.length > 0) {
        res.json(rows[0]);
      } else {
        res.status(404).json({ message: "testimonios not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// CREATE testimonios
app.post("/api/testimonios", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const { nombre, cargo, texto, foto, orden } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `testimonios` (`nombre`, `cargo`, `texto`, `foto`, `orden`) VALUES (?, ?, ?, ?, ?)",
      [nombre, cargo, texto, foto, orden],
    );
    await connection.end();
    res
      .status(201)
      .json({
        id_testimonio: result.insertId,
        nombre,
        cargo,
        texto,
        foto,
        orden,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE testimonios
app.put(
  "/api/testimonios/:id_testimonio",
  authenticateToken,
  async (req, res) => {
    try {
      const connection = await getConnection();
      const { nombre, cargo, texto, foto, orden } = req.body;
      await connection.execute(
        "UPDATE `testimonios` SET `nombre` = ?, `cargo` = ?, `texto` = ?, `foto` = ?, `orden` = ? WHERE `id_testimonio` = ?",
        [nombre, cargo, texto, foto, orden, req.params.id_testimonio],
      );
      await connection.end();
      res.json({ message: "testimonios updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE testimonios
app.delete(
  "/api/testimonios/:id_testimonio",
  authenticateToken,
  async (req, res) => {
    try {
      const connection = await getConnection();
      await connection.execute(
        "DELETE FROM `testimonios` WHERE `id_testimonio` = ?",
        [req.params.id_testimonio],
      );
      await connection.end();
      res.json({ message: "testimonios deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET all users_api
app.get("/api/users_api", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute("SELECT * FROM `users_api`");
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET users_api by id
app.get("/api/users_api/:id", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM `users_api` WHERE `id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "users_api not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE users_api
app.post("/api/users_api", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const { username, password, created_at } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `users_api` (`username`, `password`, `created_at`) VALUES (?, ?, ?)",
      [username, password, created_at],
    );
    await connection.end();
    res
      .status(201)
      .json({ id: result.insertId, username, password, created_at });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE users_api
app.put("/api/users_api/:id", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    const { username, password, created_at } = req.body;
    await connection.execute(
      "UPDATE `users_api` SET `username` = ?, `password` = ?, `created_at` = ? WHERE `id` = ?",
      [username, password, created_at, req.params.id],
    );
    await connection.end();
    res.json({ message: "users_api updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE users_api
app.delete("/api/users_api/:id", authenticateToken, async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `users_api` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "users_api deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Generated API server listening at http://localhost:${port}`);
});
