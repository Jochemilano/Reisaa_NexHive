import { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import { Input, Textarea } from "@/components/input/Input";
import CollaboratorPicker from "@/components/input/CollaboratorPicker";
import { updateProject, fetchProjectUsers, deleteProject } from "@/utils/projects";
import { fetchGroupUsers } from "@/utils/groups";
import { toast } from "sonner";

const EditProjectModal = ({ isOpen, onClose, project, groupId, onUpdated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("pending");
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    if (isOpen && project) {
      const myId = Number(localStorage.getItem("userId"));

      setName(project.name);
      setDescription(project.description || "");
      setStartDate(project.start_date?.split("T")[0] || "");
      setDeadline(project.deadline?.split("T")[0] || "");
      setStatus(project.status || "pending");

      // Traer colaboradores actuales del proyecto
      fetchProjectUsers(project.id)
        .then(projectUsers => {
          setSelectedCollaborators(projectUsers.filter(u => u.id !== myId));
          const alreadyIn = new Set(projectUsers.map(u => u.id));

          // Traer usuarios del grupo como disponibles
          return fetchGroupUsers(groupId).then(groupUsers => {
            setAvailableUsers(
              groupUsers.filter(u => !alreadyIn.has(u.id) && u.id !== myId)
            );
          });
        })
        .catch(console.error);
    }
  }, [isOpen, project]);

  const selectCollaborator = (e) => {
    const userId = Number(e.target.value);
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return;
    setSelectedCollaborators(prev => [...prev, user]);
    setAvailableUsers(prev => prev.filter(u => u.id !== userId));
  };

  const removeCollaborator = (userId) => {
    const user = selectedCollaborators.find(c => c.id === userId);
    setSelectedCollaborators(prev => prev.filter(c => c.id !== userId));
    if (user) setAvailableUsers(prev => [...prev, user]);
  };

  const handleSave = async () => {
    try {
      const collaboratorIds = selectedCollaborators.map(c => c.id);
      await updateProject(project.id, name, description, startDate, deadline, status, collaboratorIds);
      toast.warning("Proyecto actualizado");
      onUpdated(project.id);
      onClose();
    } catch (err) {
      console.error("Error actualizando proyecto:", err);
      toast.error("Error al actualizar el proyecto");
    }
  };

  const isOwner = project?.owner_id === Number(localStorage.getItem("userId"));

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteProject(project.id);
        toast.error("Proyecto eliminado");
        onUpdated(); // Refresh parent
        onClose();
      } catch (err) {
        console.error("Error eliminando proyecto:", err);
        toast.error("No se pudo eliminar el proyecto");
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>Editar Proyecto</Modal.Header>
      <Modal.Body>
        <Input label="Nombre del proyecto" type="text"
          value={name} onChange={e => setName(e.target.value)} />
        <Textarea label="Descripción"
          value={description} onChange={e => setDescription(e.target.value)} />
        <div className="input-group">
          <label>Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field"
          >
            <option value="pending">Pendiente</option>
            <option value="in_progress">En Progreso</option>
            <option value="done">Hecho</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <Input label="Fecha de inicio" type="date"
            value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input label="Fecha límite" type="date"
            value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
        <CollaboratorPicker
          availableUsers={availableUsers}
          selectedCollaborators={selectedCollaborators}
          onSelect={selectCollaborator}
          onRemove={removeCollaborator}
          showAllByDefault={true}
        />
      </Modal.Body>
      <Modal.Footer onClose={onClose}>
        {isOwner && (
          <button className="modal-danger" onClick={handleDelete}>
            Eliminar proyecto
          </button>
        )}
        <Modal.AcceptButton onClick={handleSave}>Guardar cambios</Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default EditProjectModal;