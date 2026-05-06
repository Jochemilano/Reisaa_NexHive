import React, { useEffect, useState } from "react";
import Modal from "@/components/modal/Modal";
import Skeleton from "@/components/loading/Skeleton";
import { Input, Textarea, Select } from "@/components/input/Input";
import CollaboratorPicker from "@/components/input/CollaboratorPicker";
import { getActivityDetails, updateActivity, deleteActivity } from "@/utils/activities";
import { fetchProjectUsers } from "@/utils/projects";
import { toast } from "sonner";

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
        setSelectedCollaborators(activityUsers);

        const alreadyIn = new Set(activityUsers.map(u => u.id));

        // Traer usuarios del proyecto como disponibles
        const projectUsers = await fetchProjectUsers(data.project_id);
        setAvailableUsers(
          projectUsers.filter(u => !alreadyIn.has(u.id))
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
      toast.warning("Actividad actualizada");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error("Error al actualizar actividad");
      console.error(err);
    }
  };

  const handleDelete = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!window.confirm(`¿Eliminar la actividad "${activityData.name}"?`)) return;
    try {
      await deleteActivity(activityId);
      toast.error("Actividad eliminada", {
        description: 'La tarea ha sido borrada permanentemente',
      });
      if (onDeleted) {
        onDeleted(activityId);
      } else {
        onUpdated();
      }
      onClose();
    } catch (err) {
      toast.error("Error al eliminar actividad");
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>Editar Actividad</Modal.Header>
      <Modal.Body>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Skeleton height="40px" />
            <Skeleton height="80px" />
            <Skeleton height="40px" />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
              <div style={{ flex: 2 }}>
                <Input
                  label="Nombre de la actividad"
                  value={activityData.name}
                  onChange={e => handleChange("name", e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Estado"
                  value={activityData.status}
                  onChange={e => handleChange("status", e.target.value)}
                  options={[
                    { value: "pending", label: "Pendiente" },
                    { value: "in_progress", label: "En progreso" },
                    { value: "done", label: "Completada" },
                  ]}
                />
              </div>
            </div>
            <Textarea
              label="Descripción"
              value={activityData.description}
              onChange={e => handleChange("description", e.target.value)}
              rows={2}
            />
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="Fecha de inicio"
                  type="datetime-local"
                  value={activityData.start_date}
                  onChange={e => handleChange("start_date", e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label="Fecha de entrega"
                  type="datetime-local"
                  value={activityData.deadline}
                  onChange={e => handleChange("deadline", e.target.value)}
                />
              </div>
            </div>
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
        {isOwner && (
          <button
            type="button"
            className="modal-danger"
            onClick={handleDelete}
          >
            Eliminar Actividad
          </button>
        )}
        <Modal.AcceptButton onClick={handleSave}>
          Guardar cambios
        </Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default EditActivityModal;