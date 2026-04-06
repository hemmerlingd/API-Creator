const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  database: "Arbolado",
};

async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// GET all alumbrado
app.get("/api/alumbrado", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `alumbrado`.`id`, `alumbrado`.`fecha`, `alumbrado`.`nombre`, `alumbrado`.`domicilio`, `barrio_rel`.`Nombre` AS `barrio_rel`, `alumbrado`.`observacion`, `alumbrado`.`estado`, `sec_user_rel`.`Nombre` AS `sec_user_rel` FROM `alumbrado` LEFT JOIN `barrio` AS `barrio_rel` ON `alumbrado`.`id_barrio` = `barrio_rel`.`Codigo` LEFT JOIN `sec_user` AS `sec_user_rel` ON `alumbrado`.`user` = `sec_user_rel`.`id`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET alumbrado by id
app.get("/api/alumbrado/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `alumbrado`.`id`, `alumbrado`.`fecha`, `alumbrado`.`nombre`, `alumbrado`.`domicilio`, `barrio_rel`.`Nombre` AS `barrio_rel`, `alumbrado`.`observacion`, `alumbrado`.`estado`, `sec_user_rel`.`Nombre` AS `sec_user_rel` FROM `alumbrado` LEFT JOIN `barrio` AS `barrio_rel` ON `alumbrado`.`id_barrio` = `barrio_rel`.`Codigo` LEFT JOIN `sec_user` AS `sec_user_rel` ON `alumbrado`.`user` = `sec_user_rel`.`id` WHERE `alumbrado`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "alumbrado not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE alumbrado
app.post("/api/alumbrado", async (req, res) => {
  try {
    const connection = await getConnection();
    const { fecha, nombre, domicilio, id_barrio, observacion, estado, user } =
      req.body;
    const [result] = await connection.execute(
      "INSERT INTO `alumbrado` (`fecha`, `nombre`, `domicilio`, `id_barrio`, `observacion`, `estado`, `user`) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [fecha, nombre, domicilio, id_barrio, observacion, estado, user],
    );
    await connection.end();
    res
      .status(201)
      .json({
        id: result.insertId,
        fecha,
        nombre,
        domicilio,
        id_barrio,
        observacion,
        estado,
        user,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE alumbrado
app.put("/api/alumbrado/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { fecha, nombre, domicilio, id_barrio, observacion, estado, user } =
      req.body;
    await connection.execute(
      "UPDATE `alumbrado` SET `fecha` = ?, `nombre` = ?, `domicilio` = ?, `id_barrio` = ?, `observacion` = ?, `estado` = ?, `user` = ? WHERE `id` = ?",
      [
        fecha,
        nombre,
        domicilio,
        id_barrio,
        observacion,
        estado,
        user,
        req.params.id,
      ],
    );
    await connection.end();
    res.json({ message: "alumbrado updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE alumbrado
app.delete("/api/alumbrado/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `alumbrado` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "alumbrado deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all barrio
app.get("/api/barrio", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `barrio`.`Codigo`, `barrio`.`Nombre`, `barrio`.`Zona`, `barrio`.`Inspector` FROM `barrio`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET barrio by Codigo
app.get("/api/barrio/:Codigo", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `barrio`.`Codigo`, `barrio`.`Nombre`, `barrio`.`Zona`, `barrio`.`Inspector` FROM `barrio` WHERE `barrio`.`Codigo` = ?",
      [req.params.Codigo],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "barrio not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE barrio
app.post("/api/barrio", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Nombre, Zona, Inspector } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `barrio` (`Nombre`, `Zona`, `Inspector`) VALUES (?, ?, ?)",
      [Nombre, Zona, Inspector],
    );
    await connection.end();
    res.status(201).json({ Codigo: result.insertId, Nombre, Zona, Inspector });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE barrio
app.put("/api/barrio/:Codigo", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Nombre, Zona, Inspector } = req.body;
    await connection.execute(
      "UPDATE `barrio` SET `Nombre` = ?, `Zona` = ?, `Inspector` = ? WHERE `Codigo` = ?",
      [Nombre, Zona, Inspector, req.params.Codigo],
    );
    await connection.end();
    res.json({ message: "barrio updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE barrio
app.delete("/api/barrio/:Codigo", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `barrio` WHERE `Codigo` = ?", [
      req.params.Codigo,
    ]);
    await connection.end();
    res.json({ message: "barrio deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all especies
app.get("/api/especies", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `especies`.`Id`, `especies`.`Nombre`, `especies`.`Nombre_cient`, `especies`.`Info`, `especies`.`Foto` FROM `especies`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET especies by Id
app.get("/api/especies/:Id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `especies`.`Id`, `especies`.`Nombre`, `especies`.`Nombre_cient`, `especies`.`Info`, `especies`.`Foto` FROM `especies` WHERE `especies`.`Id` = ?",
      [req.params.Id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "especies not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE especies
app.post("/api/especies", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Nombre, Nombre_cient, Info, Foto } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `especies` (`Nombre`, `Nombre_cient`, `Info`, `Foto`) VALUES (?, ?, ?, ?)",
      [Nombre, Nombre_cient, Info, Foto],
    );
    await connection.end();
    res
      .status(201)
      .json({ Id: result.insertId, Nombre, Nombre_cient, Info, Foto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE especies
app.put("/api/especies/:Id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Nombre, Nombre_cient, Info, Foto } = req.body;
    await connection.execute(
      "UPDATE `especies` SET `Nombre` = ?, `Nombre_cient` = ?, `Info` = ?, `Foto` = ? WHERE `Id` = ?",
      [Nombre, Nombre_cient, Info, Foto, req.params.Id],
    );
    await connection.end();
    res.json({ message: "especies updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE especies
app.delete("/api/especies/:Id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `especies` WHERE `Id` = ?", [
      req.params.Id,
    ]);
    await connection.end();
    res.json({ message: "especies deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all especiexzona
app.get("/api/especiexzona", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `especiexzona`.`Id_zona`, `especiexzona`.`Id_Vereda`, `especiexzona`.`Id_Especie` FROM `especiexzona`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET especiexzona by Id_zona
app.get("/api/especiexzona/:Id_zona", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `especiexzona`.`Id_zona`, `especiexzona`.`Id_Vereda`, `especiexzona`.`Id_Especie` FROM `especiexzona` WHERE `especiexzona`.`Id_zona` = ?",
      [req.params.Id_zona],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "especiexzona not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE especiexzona
app.post("/api/especiexzona", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Id_Vereda, Id_Especie } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `especiexzona` (`Id_Vereda`, `Id_Especie`) VALUES (?, ?)",
      [Id_Vereda, Id_Especie],
    );
    await connection.end();
    res.status(201).json({ Id_zona: result.insertId, Id_Vereda, Id_Especie });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE especiexzona
app.put("/api/especiexzona/:Id_zona", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Id_Vereda, Id_Especie } = req.body;
    await connection.execute(
      "UPDATE `especiexzona` SET `Id_Vereda` = ?, `Id_Especie` = ? WHERE `Id_zona` = ?",
      [Id_Vereda, Id_Especie, req.params.Id_zona],
    );
    await connection.end();
    res.json({ message: "especiexzona updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE especiexzona
app.delete("/api/especiexzona/:Id_zona", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `especiexzona` WHERE `Id_zona` = ?", [
      req.params.Id_zona,
    ]);
    await connection.end();
    res.json({ message: "especiexzona deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all estado
app.get("/api/estado", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `estado`.`id`, `estado`.`estado` FROM `estado`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET estado by id
app.get("/api/estado/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `estado`.`id`, `estado`.`estado` FROM `estado` WHERE `estado`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "estado not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE estado
app.post("/api/estado", async (req, res) => {
  try {
    const connection = await getConnection();
    const { estado } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `estado` (`estado`) VALUES (?)",
      [estado],
    );
    await connection.end();
    res.status(201).json({ id: result.insertId, estado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE estado
app.put("/api/estado/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { estado } = req.body;
    await connection.execute(
      "UPDATE `estado` SET `estado` = ? WHERE `id` = ?",
      [estado, req.params.id],
    );
    await connection.end();
    res.json({ message: "estado updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE estado
app.delete("/api/estado/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `estado` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "estado deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all informe
app.get("/api/informe", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `informe`.`id_unico`, `informe`.`id_tramite`, `informe`.`id_inspector`, `informe`.`id_usuario`, `informe`.`fecha`, `informe`.`informe`, `informe`.`prioridad`, `informe`.`adjuntos` FROM `informe`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET informe by id_unico
app.get("/api/informe/:id_unico", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `informe`.`id_unico`, `informe`.`id_tramite`, `informe`.`id_inspector`, `informe`.`id_usuario`, `informe`.`fecha`, `informe`.`informe`, `informe`.`prioridad`, `informe`.`adjuntos` FROM `informe` WHERE `informe`.`id_unico` = ?",
      [req.params.id_unico],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "informe not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE informe
app.post("/api/informe", async (req, res) => {
  try {
    const connection = await getConnection();
    const {
      id_tramite,
      id_inspector,
      id_usuario,
      fecha,
      informe,
      prioridad,
      adjuntos,
    } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `informe` (`id_tramite`, `id_inspector`, `id_usuario`, `fecha`, `informe`, `prioridad`, `adjuntos`) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        id_tramite,
        id_inspector,
        id_usuario,
        fecha,
        informe,
        prioridad,
        adjuntos,
      ],
    );
    await connection.end();
    res
      .status(201)
      .json({
        id_unico: result.insertId,
        id_tramite,
        id_inspector,
        id_usuario,
        fecha,
        informe,
        prioridad,
        adjuntos,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE informe
app.put("/api/informe/:id_unico", async (req, res) => {
  try {
    const connection = await getConnection();
    const {
      id_tramite,
      id_inspector,
      id_usuario,
      fecha,
      informe,
      prioridad,
      adjuntos,
    } = req.body;
    await connection.execute(
      "UPDATE `informe` SET `id_tramite` = ?, `id_inspector` = ?, `id_usuario` = ?, `fecha` = ?, `informe` = ?, `prioridad` = ?, `adjuntos` = ? WHERE `id_unico` = ?",
      [
        id_tramite,
        id_inspector,
        id_usuario,
        fecha,
        informe,
        prioridad,
        adjuntos,
        req.params.id_unico,
      ],
    );
    await connection.end();
    res.json({ message: "informe updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE informe
app.delete("/api/informe/:id_unico", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `informe` WHERE `id_unico` = ?", [
      req.params.id_unico,
    ]);
    await connection.end();
    res.json({ message: "informe deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all inspector
app.get("/api/inspector", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `inspector`.`id`, `inspector`.`Nombre`, `inspector`.`Apellido`, `inspector`.`nro_inspector`, `inspector`.`estado` FROM `inspector`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET inspector by id
app.get("/api/inspector/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `inspector`.`id`, `inspector`.`Nombre`, `inspector`.`Apellido`, `inspector`.`nro_inspector`, `inspector`.`estado` FROM `inspector` WHERE `inspector`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "inspector not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE inspector
app.post("/api/inspector", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Nombre, Apellido, nro_inspector, estado } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `inspector` (`Nombre`, `Apellido`, `nro_inspector`, `estado`) VALUES (?, ?, ?, ?)",
      [Nombre, Apellido, nro_inspector, estado],
    );
    await connection.end();
    res
      .status(201)
      .json({ id: result.insertId, Nombre, Apellido, nro_inspector, estado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE inspector
app.put("/api/inspector/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Nombre, Apellido, nro_inspector, estado } = req.body;
    await connection.execute(
      "UPDATE `inspector` SET `Nombre` = ?, `Apellido` = ?, `nro_inspector` = ?, `estado` = ? WHERE `id` = ?",
      [Nombre, Apellido, nro_inspector, estado, req.params.id],
    );
    await connection.end();
    res.json({ message: "inspector updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE inspector
app.delete("/api/inspector/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `inspector` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "inspector deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all llamado
app.get("/api/llamado", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `llamado`.`id`, `llamado`.`id_tramite`, `llamado`.`fecha_hora`, `llamado`.`id_usuario`, `llamado`.`texto` FROM `llamado`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET llamado by id
app.get("/api/llamado/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `llamado`.`id`, `llamado`.`id_tramite`, `llamado`.`fecha_hora`, `llamado`.`id_usuario`, `llamado`.`texto` FROM `llamado` WHERE `llamado`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "llamado not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE llamado
app.post("/api/llamado", async (req, res) => {
  try {
    const connection = await getConnection();
    const { id_tramite, fecha_hora, id_usuario, texto } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `llamado` (`id_tramite`, `fecha_hora`, `id_usuario`, `texto`) VALUES (?, ?, ?, ?)",
      [id_tramite, fecha_hora, id_usuario, texto],
    );
    await connection.end();
    res
      .status(201)
      .json({ id: result.insertId, id_tramite, fecha_hora, id_usuario, texto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE llamado
app.put("/api/llamado/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { id_tramite, fecha_hora, id_usuario, texto } = req.body;
    await connection.execute(
      "UPDATE `llamado` SET `id_tramite` = ?, `fecha_hora` = ?, `id_usuario` = ?, `texto` = ? WHERE `id` = ?",
      [id_tramite, fecha_hora, id_usuario, texto, req.params.id],
    );
    await connection.end();
    res.json({ message: "llamado updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE llamado
app.delete("/api/llamado/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `llamado` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "llamado deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all memorandum
app.get("/api/memorandum", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `memorandum`.`id`, `memorandum`.`fecha`, `memorandum`.`numero`, `memorandum`.`para`, `memorandum`.`de`, `memorandum`.`memo`, `memorandum`.`user` FROM `memorandum`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET memorandum by id
app.get("/api/memorandum/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `memorandum`.`id`, `memorandum`.`fecha`, `memorandum`.`numero`, `memorandum`.`para`, `memorandum`.`de`, `memorandum`.`memo`, `memorandum`.`user` FROM `memorandum` WHERE `memorandum`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "memorandum not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE memorandum
app.post("/api/memorandum", async (req, res) => {
  try {
    const connection = await getConnection();
    const { fecha, numero, para, de, memo, user } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `memorandum` (`fecha`, `numero`, `para`, `de`, `memo`, `user`) VALUES (?, ?, ?, ?, ?, ?)",
      [fecha, numero, para, de, memo, user],
    );
    await connection.end();
    res
      .status(201)
      .json({ id: result.insertId, fecha, numero, para, de, memo, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE memorandum
app.put("/api/memorandum/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { fecha, numero, para, de, memo, user } = req.body;
    await connection.execute(
      "UPDATE `memorandum` SET `fecha` = ?, `numero` = ?, `para` = ?, `de` = ?, `memo` = ?, `user` = ? WHERE `id` = ?",
      [fecha, numero, para, de, memo, user, req.params.id],
    );
    await connection.end();
    res.json({ message: "memorandum updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE memorandum
app.delete("/api/memorandum/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `memorandum` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "memorandum deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all movimiento_tramite
app.get("/api/movimiento_tramite", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `movimiento_tramite`.`id`, `movimiento_tramite`.`id_tramite`, `movimiento_tramite`.`estado`, `movimiento_tramite`.`fechahora`, `movimiento_tramite`.`usuario`, `movimiento_tramite`.`responsable` FROM `movimiento_tramite`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET movimiento_tramite by id
app.get("/api/movimiento_tramite/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `movimiento_tramite`.`id`, `movimiento_tramite`.`id_tramite`, `movimiento_tramite`.`estado`, `movimiento_tramite`.`fechahora`, `movimiento_tramite`.`usuario`, `movimiento_tramite`.`responsable` FROM `movimiento_tramite` WHERE `movimiento_tramite`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "movimiento_tramite not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE movimiento_tramite
app.post("/api/movimiento_tramite", async (req, res) => {
  try {
    const connection = await getConnection();
    const { id_tramite, estado, fechahora, usuario, responsable } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `movimiento_tramite` (`id_tramite`, `estado`, `fechahora`, `usuario`, `responsable`) VALUES (?, ?, ?, ?, ?)",
      [id_tramite, estado, fechahora, usuario, responsable],
    );
    await connection.end();
    res
      .status(201)
      .json({
        id: result.insertId,
        id_tramite,
        estado,
        fechahora,
        usuario,
        responsable,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE movimiento_tramite
app.put("/api/movimiento_tramite/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { id_tramite, estado, fechahora, usuario, responsable } = req.body;
    await connection.execute(
      "UPDATE `movimiento_tramite` SET `id_tramite` = ?, `estado` = ?, `fechahora` = ?, `usuario` = ?, `responsable` = ? WHERE `id` = ?",
      [id_tramite, estado, fechahora, usuario, responsable, req.params.id],
    );
    await connection.end();
    res.json({ message: "movimiento_tramite updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE movimiento_tramite
app.delete("/api/movimiento_tramite/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute(
      "DELETE FROM `movimiento_tramite` WHERE `id` = ?",
      [req.params.id],
    );
    await connection.end();
    res.json({ message: "movimiento_tramite deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all prioridad
app.get("/api/prioridad", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `prioridad`.`id`, `prioridad`.`prioridad` FROM `prioridad`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET prioridad by id
app.get("/api/prioridad/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `prioridad`.`id`, `prioridad`.`prioridad` FROM `prioridad` WHERE `prioridad`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "prioridad not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE prioridad
app.post("/api/prioridad", async (req, res) => {
  try {
    const connection = await getConnection();
    const { prioridad } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `prioridad` (`prioridad`) VALUES (?)",
      [prioridad],
    );
    await connection.end();
    res.status(201).json({ id: result.insertId, prioridad });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE prioridad
app.put("/api/prioridad/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { prioridad } = req.body;
    await connection.execute(
      "UPDATE `prioridad` SET `prioridad` = ? WHERE `id` = ?",
      [prioridad, req.params.id],
    );
    await connection.end();
    res.json({ message: "prioridad updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE prioridad
app.delete("/api/prioridad/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `prioridad` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "prioridad deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all relacion
app.get("/api/relacion", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `relacion`.`id_unico`, `relacion`.`id_tram1`, `relacion`.`id_tram2` FROM `relacion`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET relacion by id_unico
app.get("/api/relacion/:id_unico", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `relacion`.`id_unico`, `relacion`.`id_tram1`, `relacion`.`id_tram2` FROM `relacion` WHERE `relacion`.`id_unico` = ?",
      [req.params.id_unico],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "relacion not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE relacion
app.post("/api/relacion", async (req, res) => {
  try {
    const connection = await getConnection();
    const { id_tram1, id_tram2 } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `relacion` (`id_tram1`, `id_tram2`) VALUES (?, ?)",
      [id_tram1, id_tram2],
    );
    await connection.end();
    res.status(201).json({ id_unico: result.insertId, id_tram1, id_tram2 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE relacion
app.put("/api/relacion/:id_unico", async (req, res) => {
  try {
    const connection = await getConnection();
    const { id_tram1, id_tram2 } = req.body;
    await connection.execute(
      "UPDATE `relacion` SET `id_tram1` = ?, `id_tram2` = ? WHERE `id_unico` = ?",
      [id_tram1, id_tram2, req.params.id_unico],
    );
    await connection.end();
    res.json({ message: "relacion updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE relacion
app.delete("/api/relacion/:id_unico", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `relacion` WHERE `id_unico` = ?", [
      req.params.id_unico,
    ]);
    await connection.end();
    res.json({ message: "relacion deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all sec_user
app.get("/api/sec_user", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `sec_user`.`id`, `sec_user`.`Nombre`, `sec_user`.`propietario`, `sec_user`.`Email`, `sec_user`.`Pass`, `sec_user`.`acceso`, `sec_user`.`inspector` FROM `sec_user`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET sec_user by id
app.get("/api/sec_user/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `sec_user`.`id`, `sec_user`.`Nombre`, `sec_user`.`propietario`, `sec_user`.`Email`, `sec_user`.`Pass`, `sec_user`.`acceso`, `sec_user`.`inspector` FROM `sec_user` WHERE `sec_user`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "sec_user not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE sec_user
app.post("/api/sec_user", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Nombre, propietario, Email, Pass, acceso, inspector } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `sec_user` (`Nombre`, `propietario`, `Email`, `Pass`, `acceso`, `inspector`) VALUES (?, ?, ?, ?, ?, ?)",
      [Nombre, propietario, Email, Pass, acceso, inspector],
    );
    await connection.end();
    res
      .status(201)
      .json({
        id: result.insertId,
        Nombre,
        propietario,
        Email,
        Pass,
        acceso,
        inspector,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE sec_user
app.put("/api/sec_user/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { Nombre, propietario, Email, Pass, acceso, inspector } = req.body;
    await connection.execute(
      "UPDATE `sec_user` SET `Nombre` = ?, `propietario` = ?, `Email` = ?, `Pass` = ?, `acceso` = ?, `inspector` = ? WHERE `id` = ?",
      [Nombre, propietario, Email, Pass, acceso, inspector, req.params.id],
    );
    await connection.end();
    res.json({ message: "sec_user updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE sec_user
app.delete("/api/sec_user/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `sec_user` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "sec_user deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all tipo_formulario
app.get("/api/tipo_formulario", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `tipo_formulario`.`id`, `tipo_formulario`.`tipo_tramite`, `tipo_formulario`.`abrev` FROM `tipo_formulario`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET tipo_formulario by id
app.get("/api/tipo_formulario/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `tipo_formulario`.`id`, `tipo_formulario`.`tipo_tramite`, `tipo_formulario`.`abrev` FROM `tipo_formulario` WHERE `tipo_formulario`.`id` = ?",
      [req.params.id],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "tipo_formulario not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE tipo_formulario
app.post("/api/tipo_formulario", async (req, res) => {
  try {
    const connection = await getConnection();
    const { tipo_tramite, abrev } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `tipo_formulario` (`tipo_tramite`, `abrev`) VALUES (?, ?)",
      [tipo_tramite, abrev],
    );
    await connection.end();
    res.status(201).json({ id: result.insertId, tipo_tramite, abrev });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE tipo_formulario
app.put("/api/tipo_formulario/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const { tipo_tramite, abrev } = req.body;
    await connection.execute(
      "UPDATE `tipo_formulario` SET `tipo_tramite` = ?, `abrev` = ? WHERE `id` = ?",
      [tipo_tramite, abrev, req.params.id],
    );
    await connection.end();
    res.json({ message: "tipo_formulario updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE tipo_formulario
app.delete("/api/tipo_formulario/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `tipo_formulario` WHERE `id` = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "tipo_formulario deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all tramite
app.get("/api/tramite", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `tramite`.`id_unico`, `tramite`.`tipo`, `tramite`.`numero`, `tramite`.`iniciador`, `tramite`.`calle`, `tramite`.`id_barrio`, `tramite`.`fecha_inicio`, `tramite`.`estado`, `tramite`.`fecha_estado`, `tramite`.`observacion`, `tramite`.`id_usuario` FROM `tramite`",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET tramite by id_unico
app.get("/api/tramite/:id_unico", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT `tramite`.`id_unico`, `tramite`.`tipo`, `tramite`.`numero`, `tramite`.`iniciador`, `tramite`.`calle`, `tramite`.`id_barrio`, `tramite`.`fecha_inicio`, `tramite`.`estado`, `tramite`.`fecha_estado`, `tramite`.`observacion`, `tramite`.`id_usuario` FROM `tramite` WHERE `tramite`.`id_unico` = ?",
      [req.params.id_unico],
    );
    await connection.end();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "tramite not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE tramite
app.post("/api/tramite", async (req, res) => {
  try {
    const connection = await getConnection();
    const {
      tipo,
      numero,
      iniciador,
      calle,
      id_barrio,
      fecha_inicio,
      estado,
      fecha_estado,
      observacion,
      id_usuario,
    } = req.body;
    const [result] = await connection.execute(
      "INSERT INTO `tramite` (`tipo`, `numero`, `iniciador`, `calle`, `id_barrio`, `fecha_inicio`, `estado`, `fecha_estado`, `observacion`, `id_usuario`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        tipo,
        numero,
        iniciador,
        calle,
        id_barrio,
        fecha_inicio,
        estado,
        fecha_estado,
        observacion,
        id_usuario,
      ],
    );
    await connection.end();
    res
      .status(201)
      .json({
        id_unico: result.insertId,
        tipo,
        numero,
        iniciador,
        calle,
        id_barrio,
        fecha_inicio,
        estado,
        fecha_estado,
        observacion,
        id_usuario,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE tramite
app.put("/api/tramite/:id_unico", async (req, res) => {
  try {
    const connection = await getConnection();
    const {
      tipo,
      numero,
      iniciador,
      calle,
      id_barrio,
      fecha_inicio,
      estado,
      fecha_estado,
      observacion,
      id_usuario,
    } = req.body;
    await connection.execute(
      "UPDATE `tramite` SET `tipo` = ?, `numero` = ?, `iniciador` = ?, `calle` = ?, `id_barrio` = ?, `fecha_inicio` = ?, `estado` = ?, `fecha_estado` = ?, `observacion` = ?, `id_usuario` = ? WHERE `id_unico` = ?",
      [
        tipo,
        numero,
        iniciador,
        calle,
        id_barrio,
        fecha_inicio,
        estado,
        fecha_estado,
        observacion,
        id_usuario,
        req.params.id_unico,
      ],
    );
    await connection.end();
    res.json({ message: "tramite updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE tramite
app.delete("/api/tramite/:id_unico", async (req, res) => {
  try {
    const connection = await getConnection();
    await connection.execute("DELETE FROM `tramite` WHERE `id_unico` = ?", [
      req.params.id_unico,
    ]);
    await connection.end();
    res.json({ message: "tramite deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
