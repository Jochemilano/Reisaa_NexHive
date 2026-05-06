const express = require("express");
const router = express.Router();
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

// Crear proyecto
router.post("/projects", verifyToken, async (req, res) => {
  const { name, description, groupId, start_date, deadline, status, collaborators } = req.body;
  const userId = req.userId;

  if (!name || !groupId)
    return res.status(400).json({ message: "Datos incompletos" });

  try {
    const userGroup = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [userId, groupId]
    );
    if (userGroup.length === 0)
      return res.status(403).json({ message: "No pertenece al grupo" });

    const result = await query(
      "INSERT INTO projects (name, description, group_id, start_date, deadline, status, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, description || "", groupId, start_date || null, deadline || null, status || 'pending', userId]
    );
    const projectId = result.insertId;

    // Agregar owner
    await query(
      "INSERT INTO users_projects (user_id, project_id) VALUES (?, ?)",
      [userId, projectId]
    );

    // Agregar colaboradores
    if (Array.isArray(collaborators) && collaborators.length > 0) {
      const filtered = collaborators.filter(id => id !== userId);
      if (filtered.length > 0) {
        const values = filtered.map(id => [id, projectId]);
        await query("INSERT INTO users_projects (user_id, project_id) VALUES ?", [values]);
      }
    }

    res.json({
      id: projectId,
      name,
      description: description || "",
      group_id: groupId,
      start_date: start_date || null,
      deadline: deadline || null,
      status: status || 'pending',
      owner_id: userId,
      collaborators: collaborators || []
    });
  } catch (err) {
    console.error("ERROR DB CREATE PROJECT:", err);
    res.status(500).json({ message: "Error creando proyecto" });
  }
});

// Traer proyectos de un grupo
router.get("/groups/:groupId/projects", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    // 1. Verificar si el usuario pertenece al grupo
    const userGroup = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [userId, groupId]
    );
    if (userGroup.length === 0)
      return res.status(403).json({ message: "No pertenece al grupo" });

    const [group] = await query("SELECT owner_id FROM groups WHERE id=?", [groupId]);
    const [user] = await query("SELECT rol FROM users WHERE id=?", [userId]);

    const isGroupOwner = group && group.owner_id == userId;
    const isAdmin = user && (user.rol === 'admin' || user.rol === 'Admin');

    let projects;
    if (isGroupOwner || isAdmin) {
      // Owner del grupo o Admin ve todos los proyectos del grupo
      projects = await query(
        `SELECT p.id, p.name, p.description, p.start_date, p.deadline, p.status, p.owner_id, u.name AS owner_name
         FROM projects p
         LEFT JOIN users u ON u.id = p.owner_id
         WHERE p.group_id = ?
         ORDER BY p.id`,
        [groupId]
      );
    } else {
      // Usuario normal solo ve proyectos donde es owner o colaborador
      projects = await query(
        `SELECT p.id, p.name, p.description, p.start_date, p.deadline, p.status, p.owner_id, u.name AS owner_name
         FROM projects p
         LEFT JOIN users u ON u.id = p.owner_id
         WHERE p.group_id = ? 
           AND (p.owner_id = ? OR p.id IN (SELECT project_id FROM users_projects WHERE user_id = ?))
         ORDER BY p.id`,
        [groupId, userId, userId]
      );
    }

    res.json(projects);
  } catch (err) {
    console.error("ERROR DB GET PROJECTS:", err);
    res.status(500).json({ message: "Error al traer proyectos" });
  }
});

// Traer detalle de proyecto con actividades
router.get("/projects/:projectId", verifyToken, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;

  try {
    const projectRows = await query(
      `SELECT p.id, p.name, p.description, p.start_date, p.deadline, p.status, p.owner_id, p.group_id, u.name AS owner_name
       FROM projects p
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.id = ?`,
      [projectId]
    );
    if (projectRows.length === 0)
      return res.status(404).json({ message: "Proyecto no encontrado" });

    const project = projectRows[0];

    const member = await query(
      "SELECT * FROM users_projects WHERE user_id=? AND project_id=?",
      [userId, projectId]
    );

    const [user] = await query("SELECT rol FROM users WHERE id=?", [userId]);
    const isAdmin = user && (user.rol === 'admin' || user.rol === 'Admin');

    const [group] = await query("SELECT owner_id FROM groups WHERE id=?", [project.group_id]);
    const isGroupOwner = group && group.owner_id == userId;

    if (member.length === 0 && !isAdmin && !isGroupOwner)
      return res.status(403).json({ message: "No pertenece al proyecto" });

    const activities = await query(
      `SELECT a.id, a.name, a.description, a.status, a.start_date, a.deadline, a.owner_id, u.name AS owner_name, u.profile_pic
       FROM activities a
       LEFT JOIN users u ON u.id = a.owner_id
       WHERE a.project_id = ?
       ORDER BY a.id`,
      [projectId]
    );

    res.json({ ...projectRows[0], activities });
  } catch (err) {
    console.error("ERROR DB GET PROJECT:", err);
    res.status(500).json({ message: "Error al traer proyecto" });
  }
});

// Traer usuarios de un proyecto
router.get("/projects/:projectId/users", verifyToken, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;

  try {
    const [projectRows] = await query("SELECT group_id FROM projects WHERE id=?", [projectId]);
    if (!projectRows) return res.status(404).json({ message: "Proyecto no encontrado" });

    const member = await query(
      "SELECT * FROM users_projects WHERE user_id=? AND project_id=?",
      [userId, projectId]
    );

    const [user] = await query("SELECT rol FROM users WHERE id=?", [userId]);
    const isAdmin = user?.rol === 'admin';

    const [group] = await query("SELECT owner_id FROM groups WHERE id=?", [projectRows.group_id]);
    const isGroupOwner = group?.owner_id === userId;

    if (member.length === 0 && !isAdmin && !isGroupOwner)
      return res.status(403).json({ message: "No pertenece al proyecto" });

    const users = await query(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN users_projects up ON u.id = up.user_id
       WHERE up.project_id = ?`,
      [projectId]
    );
    res.json(users);
  } catch (err) {
    console.error("ERROR DB GET PROJECT USERS:", err);
    res.status(500).json({ message: "Error al traer usuarios del proyecto" });
  }
});

// Editar proyecto — solo owner
router.patch("/projects/:projectId", verifyToken, async (req, res) => {
  const { projectId } = req.params;
  const { name, description, start_date, deadline, status, collaborators } = req.body;
  const userId = req.userId;

  try {
    const projectRows = await query(
      "SELECT * FROM projects WHERE id=?",
      [projectId]
    );
    if (projectRows.length === 0)
      return res.status(404).json({ message: "Proyecto no encontrado" });

    const [user] = await query("SELECT rol FROM users WHERE id=?", [userId]);
    const isAdmin = user?.rol === 'admin';
    const isOwner = projectRows[0].owner_id === userId;

    // Verificar si es owner del grupo
    const [group] = await query("SELECT owner_id FROM groups WHERE id=?", [projectRows[0].group_id]);
    const isGroupOwner = group?.owner_id === userId;

    if (!isOwner && !isAdmin && !isGroupOwner)
      return res.status(403).json({ message: "No tienes permisos (No eres owner del proyecto, admin ni owner del grupo)" });

    await query(
      `UPDATE projects
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           start_date = COALESCE(?, start_date),
           deadline = COALESCE(?, deadline),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [name ?? null, description ?? null, start_date ?? null, deadline ?? null, status ?? null, projectId]
    );

    if (Array.isArray(collaborators)) {
      await query(
        "DELETE FROM users_projects WHERE project_id=? AND user_id != ?",
        [projectId, userId]
      );

      if (collaborators.length > 0) {
        const filtered = collaborators.filter(id => id !== userId);
        if (filtered.length > 0) {
          const values = filtered.map(id => [id, projectId]);
          await query("INSERT INTO users_projects (user_id, project_id) VALUES ?", [values]);
        }
      }
    }

    res.json({ message: "Proyecto actualizado" });
  } catch (err) {
    console.error("ERROR DB UPDATE PROJECT:", err);
    res.status(500).json({ message: "Error al actualizar proyecto" });
  }
});

// Transferir ownership del proyecto
router.patch("/projects/:projectId/transfer", verifyToken, async (req, res) => {
  const { projectId } = req.params;
  const { newOwnerId } = req.body;
  const userId = req.userId;

  try {
    const project = await query(
      "SELECT * FROM projects WHERE id=? AND owner_id=?",
      [projectId, userId]
    );
    if (project.length === 0)
      return res.status(403).json({ message: "No eres owner del proyecto" });

    const member = await query(
      "SELECT * FROM users_projects WHERE user_id=? AND project_id=?",
      [newOwnerId, projectId]
    );
    if (member.length === 0)
      return res.status(400).json({ message: "El usuario no pertenece al proyecto" });

    await query(
      "UPDATE projects SET owner_id=? WHERE id=?",
      [newOwnerId, projectId]
    );

    res.json({ message: "Ownership transferido" });
  } catch (err) {
    console.error("ERROR DB TRANSFER PROJECT:", err);
    res.status(500).json({ message: "Error al transferir ownership" });
  }
});

// Eliminar proyecto — solo owner
router.delete("/projects/:projectId", verifyToken, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;

  try {
    const projectRows = await query(
      "SELECT * FROM projects WHERE id=?",
      [projectId]
    );
    if (projectRows.length === 0)
      return res.status(404).json({ message: "Proyecto no encontrado" });

    const [user] = await query("SELECT rol FROM users WHERE id=?", [userId]);
    const isAdmin = user?.rol === 'admin';
    const isOwner = projectRows[0].owner_id === userId;

    // Verificar si es owner del grupo
    const [group] = await query("SELECT owner_id FROM groups WHERE id=?", [projectRows[0].group_id]);
    const isGroupOwner = group?.owner_id === userId;

    if (!isOwner && !isAdmin && !isGroupOwner)
      return res.status(403).json({ message: "No tienes permisos (No eres owner del proyecto, admin ni owner del grupo)" });

    await query("DELETE FROM users_projects WHERE project_id=?", [projectId]);

    // Eliminar el proyecto
    await query("DELETE FROM projects WHERE id=?", [projectId]);

    res.json({ message: "Proyecto eliminado correctamente" });
  } catch (err) {
    console.error("ERROR DB DELETE PROJECT:", err);
    res.status(500).json({ message: "Error al eliminar proyecto" });
  }
});

module.exports = router;