import React, { useEffect, useState } from "react";
import Modal from "@/components/modal/Modal";
import { Input, Textarea, Select } from "@/components/input/Input";
import CollaboratorPicker from "@/components/input/CollaboratorPicker";
import { getActivityDetails, updateActivity } from "@/utils/activities";
import { fetchProjectUsers } from "@/utils/projects";

const EditActivityModal = ({ isOpen, onClose, activityId, onUpdated, onDeleted }) => {
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState({
    name: "", description: "", status: "pending", start_date: "", deadline: ""
  });
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isOwner, setIsOwner] = useState(false);

  function toLocalDateTimeInput(isoDate) {
    if (!isoDate) return "";
    const dt = new Date(isoDate);
    const offset = dt.getTimezoneOffset();
    const local = new Date(dt.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  useEffect(() => {
    if (!activityId || !isOpen) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const myId = Number(localStorage.getItem("userId"));

        const data = await getActivityDetails(activityId);
        setActivityData({
          name: data.name,
          description: data.description,
          status: data.status,
          start_date: toLocalDateTimeInput(data.start_date),
          deadline: toLocalDateTimeInput(data.deadline)
        });
        setIsOwner(data.owner_id === myId);

        // Traer usuarios de la actividad
        const { fetchActivityUsers } = await import("@/utils/activities");
        const activityUsers = await fetchActivityUsers(activityId);
        setSelectedCollaborators(activityUsers.filter(u => u.id !== myId));

        const alreadyIn = new Set(activityUsers.map(u => u.id));

        // Traer usuarios del proyecto como disponibles
        const projectUsers = await fetchProjectUsers(data.project_id);
        setAvailableUsers(
          projectUsers.filter(u => !alreadyIn.has(u.id) && u.id !== myId)
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activityId, isOpen]);

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

  const handleChange = (field, value) => {
    setActivityData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...activityData,
        start_date: activityData.start_date ? new Date(activityData.start_date).toISOString() : null,
        deadline: activityData.deadline ? new Date(activityData.deadline).toISOString() : null,
        collaborators: selectedCollaborators.map(c => c.id)
      };

      await updateActivity(activityId, payload);
      onUpdated();
      onClose();
    } catch (err) {
      alert("Error al actualizar actividad");
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar la actividad "${activityData.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const { deleteActivity } = await import("@/utils/activities");
      await deleteActivity(activityId);
      if (onDeleted) {
        onDeleted(activityId);
      } else {
        onUpdated();
      }
      onClose();
    } catch (err) {
      alert("Error al eliminar actividad");
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>Editar Actividad</Modal.Header>
      <Modal.Body>
        {loading ? <p>Cargando...</p> : (
          <>
            <Input
              label="Nombre de la actividad"
              value={activityData.name}
              onChange={e => handleChange("name", e.target.value)}
            />
            <Textarea
              label="Descripción"
              value={activityData.description}
              onChange={e => handleChange("description", e.target.value)}
            />
            <Select
              label="Estado"
              value={activityData.status}
              onChange={e => handleChange("status", e.target.value)}
              options={[
                { value: "pending", label: "Pending" },
                { value: "in_progress", label: "In Progress" },
                { value: "done", label: "Done" },
              ]}
            />
            <Input
              label="Fecha de inicio"
              type="datetime-local"
              value={activityData.start_date}
              onChange={e => handleChange("start_date", e.target.value)}
            />
            <Input
              label="Fecha de entrega"
              type="datetime-local"
              value={activityData.deadline}
              onChange={e => handleChange("deadline", e.target.value)}
            />
            <CollaboratorPicker
              availableUsers={availableUsers}
              selectedCollaborators={selectedCollaborators}
              onSelect={selectCollaborator}
              onRemove={removeCollaborator}
              showAllByDefault={true}
            />
          </>
        )}
      </Modal.Body>
      <Modal.Footer onClose={onClose}>
        <button className="calendar-delete-btn" onClick={handleDelete}>
          Eliminar
        </button>
        <Modal.AcceptButton onClick={handleSave}>
          Guardar cambios
        </Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default EditActivityModal;