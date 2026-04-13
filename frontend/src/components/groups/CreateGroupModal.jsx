import { useState } from "react";
import Modal from "@/components/modal/Modal";
import Input from "@/components/input/Input";
import AvatarInput from "./AvatarInput"
import CollaboratorPicker from "@/components/input/CollaboratorPicker";

const CreateGroupModal = ({
  isOpen,
  handleClose,
  name,
  setName,
  availableUsers,
  selectedCollaborators,
  selectCollaborator,
  removeCollaborator,
  handleCreate
}) => {
  const [avatarFile, setAvatarFile] = useState(null);

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Header onClose={handleClose}>Crea un grupo</Modal.Header>

      <Modal.Body>
        <AvatarInput handleFile={setAvatarFile} />

        <Input
          label="Nombre del grupo"
          type="text"
          placeholder="Dinos el nombre del grupo"
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
        <Modal.AcceptButton onClick={() => handleCreate(avatarFile)}>
          Crear
        </Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateGroupModal;