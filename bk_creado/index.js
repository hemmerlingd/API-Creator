const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  database: "pruebas",
};

async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// GET all tabla
app.get("/api/tabla", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `tabla`.`id`, `tabla`.`nombre`, `tabla`.`apellido`, `tabla`.`dni` FROM `tabla`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET tabla by id
app.get("/api/tabla/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `tabla`.`id`, `tabla`.`nombre`, `tabla`.`apellido`, `tabla`.`dni` FROM `tabla` WHERE `tabla`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "tabla not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE tabla
app.post("/api/tabla", async (req, res) => {
  try {
    const connection = await getConnection();
    const { nombre, apellido, dni } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `tabla` (`nombre`, `apellido`, `dni`) VALUES (?, ?, ?)",
      [nombre, apellido, dni],
    );
    await connection.end();
    res.status(201).json({ id: result.insertId, nombre, apellido, dni });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE tabla
app.put("/api/tabla/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { nombre, apellido, dni } = req.body;
    await connection.execute(
      "UPDATE `tabla` SET `nombre` = ?, `apellido` = ?, `dni` = ? WHERE `id` = ?",
      [nombre, apellido, dni, req.params.id],
    );
    await connection.end();
    res.json({ message: "tabla updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE tabla
app.delete("/api/tabla/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `tabla` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "tabla deleted successfully" });
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
  res.sendFile(path.join(__dirname, "index.html"));
});

// GET all users_api
app.get("/api/users_api", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `users_api`.`id`, `users_api`.`username`, `users_api`.`password`, `users_api`.`created_at` FROM `users_api`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET users_api by id
app.get("/api/users_api/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `users_api`.`id`, `users_api`.`username`, `users_api`.`password`, `users_api`.`created_at` FROM `users_api` WHERE `users_api`.`id` = ?",
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
app.post("/api/users_api", async (req, res) => {
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
app.put("/api/users_api/:id", async (req, res) => {
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
app.delete("/api/users_api/:id", async (req, res) => {
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
