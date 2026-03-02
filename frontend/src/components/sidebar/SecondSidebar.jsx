import React, { useEffect, useState } from "react";
import { fetchGroupDetails } from "utils/groups";
import "./SecondSidebar.css";
import { createProject } from "utils/projects";
import { Input, Textarea, Select } from "components/input/Input";
import Modal from "components/modal/Modal";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { createActivity, getActivities } from "utils/activities";
import EditActivityModal from "components/groups/EditActivityModal";


const SecondSidebar = ({ groupId }) => {
  const today = new Date().toISOString().split("T")[0];
  const [details, setDetails] = useState({ channels: [], projects: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [project_name, setProjectName] = useState("");
  const [project_description, setProjectDescription] = useState("");
  const [activity_name, setActivityName] = useState("");
  const [activity_description, setActivityDescription] = useState("");
  const [activity_status, setActivityStatus] = useState("");
  const [activity_startDate, setStartDate] = useState("");
  const [activity_deadline, setDeadline] = useState("");
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);

  const loadDetails = async () => {
    if (!groupId) return;
    try {
      const data = await fetchGroupDetails(groupId); // ya usa apiClient
      const projectsMap = {};
      data.projects.forEach(row => {
        if (!projectsMap[row.project_id]) {
          projectsMap[row.project_id] = {
            id: row.project_id,
            name: row.project_name,
            activities: []
          };
        }
        if (row.activity_id) {
          projectsMap[row.project_id].activities.push({
            id: row.activity_id,
            name: row.activity_name,
            description: row.activity_description,
            status: row.activity_status,
            start_date: row.start_date ? new Date(row.start_date) : null,
            deadline: row.deadline ? new Date(row.deadline) : null
          });
        }
      });

      setDetails({
        channels: data.channels,
        projects: Object.values(projectsMap)
      });
    } catch (err) {
      console.error("Error cargando detalles del grupo:", err);
      setDetails({ channels: [], projects: [] });
    }
  };

  useEffect(() => {
    loadDetails();
  }, [groupId]);

  const handleCreateProject = async () => {
    if (!project_name.trim()) return;
    try {
      const newProject = await createProject(project_name,project_description, groupId); // apiClient maneja headers
      setDetails(prev => ({
        ...prev,
        projects: [...prev.projects, newProject]
      }));
      setProjectName("");
      setIsOpen(false);
    } catch (err) {
      console.error("Error creando proyecto:", err);
    }
  };

  const handleCreateActivity = async () => {
    if (!activity_name.trim() || !currentProjectId) return;

    try {
      const newActivity = await createActivity({
        name: activity_name,
        description: activity_description,
        status: activity_status,
        start_date: activity_startDate ? new Date(activity_startDate).toISOString() : new Date().toISOString(),
        deadline: activity_deadline ? new Date(activity_deadline).toISOString() : null,
        projectId: currentProjectId
      });

      setDetails(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === currentProjectId
            ? { ...p, activities: [...(p.activities || []), newActivity] }
            : p
        )
      }));

      setActivityName("");
      setActivityDescription("");
      setActivityStatus("");
      setDeadline("");
      setIsActivityOpen(false);
    } catch (err) {
      console.error("Error creando actividad:", err);
    }
  };

  return (
    <aside className="second-sidebar">
      <h3>Canales</h3>
      {details.channels.map(c => <div key={c.id}>{c.name}</div>)}

      <div className="cont-sec">
      <h3>Proyectos</h3>
      <Modal.Button onClick={() => setIsOpen(true)}><IoEllipsisHorizontal/></Modal.Button>
      </div>
      
      {details.projects.map(p => (
        <div key={`project-${p.id}`} className="project-item">
          <div className="project-header">
            {p.name}
            <button
              className="add-activity-btn"
              onClick={() => {
                setCurrentProjectId(p.id);
                setActivityName("");
                setIsActivityOpen(true);
              }}
            >+</button>
          </div>

          <div className="project-activities">
            {p.activities && p.activities.length > 0 ? (
              p.activities.map(a => (
                <div
                  key={`activity-${a.id}`}
                  className="activity-item"
                  onClick={() => {
                    setCurrentProjectId(p.id); // opcional, por si necesitas el projectId
                    setEditingActivityId(a.id); // guardamos el id de la actividad
                    setIsEditActivityOpen(true); // abrimos modal de editar
                  }}
                  style={{ cursor: "pointer" }} // para que se vea clickeable
                >
                  {a.name}
                </div>
              ))
            ) : (
              <span className="empty-activities">Sin actividades</span>
            )}
          </div>

        </div>
      ))}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <Modal.Header onClose={() => setIsOpen(false)}>Crear Proyecto</Modal.Header>
        <Modal.Body>
        <Input 
          label="Nombre del proyecto"
          type="text"
          placeholder="Escribe el nombre de tu proyecto"
          value={project_name}
          onChange={e => setProjectName(e.target.value)}
        />
        <Textarea
          label="Descripción del proyecto"
          type="text"
          placeholder="Danos una breve descripcion de tu proyecto"
          value={project_description}
          onChange={e => setProjectDescription(e.target.value)}
        />
        </Modal.Body>
        <Modal.Footer onClose={() => setIsOpen(false)}>
          <Modal.AcceptButton type="button" onClick={handleCreateProject}>Crear</Modal.AcceptButton>
        </Modal.Footer>
      </Modal>

      <Modal isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)}>
        <Modal.Header onClose={() => setIsActivityOpen(false)}>Crear Actividad</Modal.Header>
        <Modal.Body>
          <Input
            label="Nombre de la actividad"
            type="text"
            placeholder="¿Qué vas a hacer?"
            value={activity_name}
            onChange={e => setActivityName(e.target.value)}
          />
          <Textarea
            label="Descripción de la actividad"
            type="text"
            placeholder="¿Cómo lo vas a hacer?, ¿Algo mas que comentar?"
            value={activity_description}
            onChange={e => setActivityDescription(e.target.value)}
          />
          
          <Select
            label="Estado de la actividad"
            value={activity_status}
            onChange={(e) => setActivityStatus(e.target.value)}
            options={[
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
              { value: "pending", label: "Pending" },
            ]}
          />
          <Input
            label="Fecha de inicio"
            type="datetime-local"
            value={activity_startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <Input
            label="Fecha de entrega"
            type="datetime-local"
            value={activity_deadline}
            onChange={e => setDeadline(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer onClose={() => setIsActivityOpen(false)}>
          <Modal.AcceptButton type="button" onClick={handleCreateActivity}>Crear</Modal.AcceptButton>
        </Modal.Footer>
      </Modal>
      
      <EditActivityModal
        isOpen={isEditActivityOpen}
        onClose={() => setIsEditActivityOpen(false)}
        activityId={editingActivityId}
        onUpdated={() => loadDetails()}
      />
    </aside>
  );
};

export default SecondSidebar;
