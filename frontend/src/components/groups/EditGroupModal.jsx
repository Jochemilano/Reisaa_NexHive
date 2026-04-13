import { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Input from "@/components/input/Input";
import AvatarInput from "./AvatarInput";
import CollaboratorPicker from "@/components/input/CollaboratorPicker";
import { updateGroup } from "@/utils/groups";
import { getAvatarUrl } from "@/utils/media";

const EditGroupModal = ({
  isOpen,
  handleClose,
  group,
  availableUsers,
  onUpdate
}) => {
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setSelectedCollaborators(group.collaborators || []);
    }
  }, [group]);

  const selectCollaborator = (userId) => {
    setSelectedCollaborators(prev => [...prev, userId]);
  };

  const removeCollaborator = (userId) => {
    setSelectedCollaborators(prev => prev.filter(id => id !== userId));
  };

  const handleSave = async () => {
    try {
      await updateGroup(group.id, name, selectedCollaborators, avatarFile);
      onUpdate(); // callback para refrescar lista
      handleClose();
    } catch (err) {
      console.error("Error actualizando grupo:", err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Header onClose={handleClose}>Editar grupo</Modal.Header>
      <Modal.Body>
        <AvatarInput 
          handleFile={setAvatarFile} 
          currentAvatar={getAvatarUrl(group?.avatar)} 
        />
        <Input
          label="Nombre del grupo"
          type="text"
          placeholder="Nombre del grupo"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <CollaboratorPicker
          availableUsers={availableUsers}
          selectedCollaborators={selectedCollaborators}
          onSelect={selectCollaborator}
          onRemove={removeCollaborator}
        />
      </Modal.Body>
      <Modal.Footer onClose={handleClose}>
        <Modal.AcceptButton onClick={handleSave}>
          Guardar cambios
        </Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default EditGroupModal;