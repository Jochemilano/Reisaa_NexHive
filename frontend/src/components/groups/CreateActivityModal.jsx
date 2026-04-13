import React, { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import { Input, Textarea, Select } from "@/components/input/Input";
import CollaboratorPicker from "@/components/input/CollaboratorPicker";
import { fetchProjectUsers } from "@/utils/projects";

const CreateActivityModal = ({ isOpen, onClose, currentProjectId, onCreated }) => {
  const [activityName, setActivityName] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityStatus, setActivityStatus] = useState("pending");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);

  useEffect(() => {
    if (isOpen && currentProjectId) {
      const myId = Number(localStorage.getItem("userId"));
      fetchProjectUsers(currentProjectId)
        .then(users => setAvailableUsers(users.filter(u => u.id !== myId)))
        .catch(console.error);
    }
  }, [isOpen, currentProjectId]);

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

  const handleCreate = async () => {
    if (!activityName.trim() || !currentProjectId) return;

    try {
      const { createActivity } = await import("@/utils/activities");
      const newActivity = await createActivity({
        name: activityName,
        description: activityDescription,
        status: activityStatus,
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        projectId: currentProjectId,
        collaborators: selectedCollaborators.map(c => c.id)
      });

      onCreated(newActivity);
      setActivityName("");
      setActivityDescription("");
      setActivityStatus("pending");
      setStartDate("");
      setDeadline("");
      setSelectedCollaborators([]);
      setAvailableUsers([]);
      onClose();
    } catch (err) {
      console.error("Error creando actividad:", err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>Crear Actividad</Modal.Header>
      <Modal.Body>
        <Input
          label="Nombre de la actividad"
          type="text"
          placeholder="¿Qué vas a hacer?"
          value={activityName}
          onChange={e => setActivityName(e.target.value)}
        />
        <Textarea
          label="Descripción de la actividad"
          placeholder="¿Cómo lo vas a hacer?"
          value={activityDescription}
          onChange={e => setActivityDescription(e.target.value)}
        />
        <Select
          label="Estado de la actividad"
          value={activityStatus}
          onChange={e => setActivityStatus(e.target.value)}
          options={[
            { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In progress" },
            { value: "done", label: "Done" },
          ]}
        />
        <Input
          label="Fecha de inicio"
          type="datetime-local"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
        <Input
          label="Fecha de entrega"
          type="datetime-local"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
        />
        <CollaboratorPicker
          availableUsers={availableUsers}
          selectedCollaborators={selectedCollaborators}
          onSelect={selectCollaborator}
          onRemove={removeCollaborator}
        />
      </Modal.Body>
      <Modal.Footer onClose={onClose}>
        <Modal.AcceptButton type="button" onClick={handleCreate}>Crear</Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateActivityModal;