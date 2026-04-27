import { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Input from "@/components/input/Input";
import AvatarInput from "./AvatarInput";
import CollaboratorPicker from "@/components/input/CollaboratorPicker";
import { updateGroup, fetchAllUsers, fetchGroupUsers, deleteGroup } from "@/utils/groups";
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

  const isOwner = group?.owner_id === Number(localStorage.getItem("userId"));

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el grupo "${group.name}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteGroup(group.id);
        handleClose();
        window.location.reload(); 
      } catch (err) {
        console.error("Error eliminando grupo:", err);
        alert("No se pudo eliminar el grupo");
      }
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
        {isOwner && (
          <button className="modal-danger" onClick={handleDelete}>
            Eliminar grupo
          </button>
        )}
        <Modal.AcceptButton onClick={handleSave}>
          Guardar cambios
        </Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default EditGroupModal;