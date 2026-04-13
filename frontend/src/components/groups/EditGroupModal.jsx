import { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Input from "@/components/input/Input";
import AvatarInput from "./AvatarInput";
import CollaboratorPicker from "@/components/input/CollaboratorPicker";
import { updateGroup, fetchAllUsers, fetchGroupUsers } from "@/utils/groups";
import { getAvatarUrl } from "@/utils/media";

const EditGroupModal = ({
  isOpen,
  handleClose,
  group,
  onUpdate
}) => {
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Cargar datos del grupo
  useEffect(() => {
    if (isOpen && group) {
      setName(group.name);
      setSelectedCollaborators(group.collaborators || []);
    }
  }, [isOpen, group]);

  // Traer usuarios disponibles
  useEffect(() => {
    if (isOpen && group) {
      const myId = Number(localStorage.getItem("userId"));

      setName(group.name);

      fetchGroupUsers(group.id)
        .then(groupUsers => {
          // Los que ya están en el grupo (menos yo)
          setSelectedCollaborators(groupUsers.filter(u => u.id !== myId));

          const alreadyIn = new Set(groupUsers.map(u => u.id));

          // Todos los usuarios menos los que ya están y menos yo
          return fetchAllUsers().then(allUsers => {
            setAvailableUsers(
              allUsers.filter(u => !alreadyIn.has(u.id) && u.id !== myId)
            );
          });
        })
        .catch(console.error);
    }
  }, [isOpen, group]);

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
      await updateGroup(group.id, name, collaboratorIds, avatarFile);
      onUpdate(group.id);
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
          onFileChange={setAvatarFile}
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