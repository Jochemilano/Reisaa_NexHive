import React, { useState } from "react";
import Modal from "@/components/modal/Modal";
import { Input, Textarea } from "@/components/input/Input";
import CollaboratorPicker from "@/components/input/CollaboratorPicker";
import { createProject } from "@/utils/projects";
import useCollaborators from "@/hooks/useCollaborators";
import { toast } from "sonner";

const CreateProjectModal = ({ isOpen, onClose, groupId, availableUsers = [], onCreated }) => {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");

  const {
    availableUsers: filteredUsers,
    selectedCollaborators,
    selectCollaborator,
    removeCollaborator,
    resetCollaborators
  } = useCollaborators(availableUsers);

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    try {
      const newProject = await createProject(
        projectName, projectDescription, groupId,
        startDate || null, deadline || null,
        selectedCollaborators.map(c => c.id)
      );
      toast.success(`Proyecto "${projectName}" creado con éxito`);
      onCreated(newProject);
      setProjectName("");
      setProjectDescription("");
      setStartDate("");
      setDeadline("");
      resetCollaborators();
      onClose();
    } catch (err) {
      console.error("Error creando proyecto:", err);
      toast.error("Error al crear el proyecto");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>Crear Proyecto</Modal.Header>
      <Modal.Body>
        <Input label="Nombre del proyecto" type="text"
          placeholder="Escribe el nombre de tu proyecto"
          value={projectName} onChange={e => setProjectName(e.target.value)} />
        <Textarea label="Descripción del proyecto"
          placeholder="Danos una breve descripción de tu proyecto"
          value={projectDescription} onChange={e => setProjectDescription(e.target.value)} />
        <Input label="Fecha de inicio" type="date"
          value={startDate} onChange={e => setStartDate(e.target.value)} />
        <Input label="Fecha límite" type="date"
          value={deadline} onChange={e => setDeadline(e.target.value)} />
        <CollaboratorPicker
          availableUsers={filteredUsers}
          selectedCollaborators={selectedCollaborators}
          onSelect={selectCollaborator}
          onRemove={removeCollaborator}
          showAllByDefault={true}
        />
      </Modal.Body>
      <Modal.Footer onClose={onClose}>
        <Modal.AcceptButton type="button" onClick={handleCreate}>Crear</Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateProjectModal;