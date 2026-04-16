import React, { useState, useEffect } from 'react';
import Modal from '@/components/modal/Modal';
import Input from '@/components/input/Input';
import CollaboratorPicker from '@/components/input/CollaboratorPicker';
import { deletePersonalEvent, updatePersonalEvent } from '@/utils/calendar';
import { fetchAllUsers } from '@/utils/groups';

const EditPersonalEventModal = ({ isOpen, onClose, event, currentUserId, onUpdated, onDeleted }) => {
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentUserIdState, setCurrentUserIdState] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentUserIdState(parseInt(localStorage.getItem('userId')) || null);
    fetchAllUsers()
      .then(users => setAllUsers(users))
      .catch(err => console.error('Error cargando usuarios:', err));
  }, [isOpen]);

  const enrichCollaborators = (collabs) => {
    return (collabs || []).map(collab => {
      if (collab && typeof collab === 'object') {
        return {
          id: collab.id,
          name: collab.name || collab.username || `Usuario ${collab.id}`,
        };
      }

      const id = Number(collab);
      const user = allUsers.find(u => u.id === id);
      return user ? { id: user.id, name: user.name || user.username || `Usuario ${id}` } : { id, name: `Usuario ${id}` };
    });
  };

  useEffect(() => {
    if (event) {
      setEventName(event.title || '');
      setStartDate(event.start ? event.start.toISOString().slice(0,16) : '');
      setEndDate(event.end ? event.end.toISOString().slice(0,16) : '');
      setCollaborators(enrichCollaborators(event.collaborators || []));
    }
  }, [event, allUsers]);

  if (!event) return null;

  const isOwner = event.owner_id === currentUserId;

  const handleRemoveCollaborator = (userId) => {
    setCollaborators(prev => prev.filter(c => c.id !== userId));
  };

  const availableUsers = allUsers.filter(
    user => user.id !== currentUserIdState && !collaborators.some(c => c.id === user.id)
  );

  const handleSelectCollaborator = (e) => {
    const userId = parseInt(e.target.value);
    const user = allUsers.find(u => u.id === userId);
    if (user && !collaborators.some(c => c.id === user.id)) {
      setCollaborators(prev => [...prev, { id: user.id, name: user.name || user.username || `Usuario ${user.id}` }]);
    }
    e.target.value = '';
  };

  const handleUpdate = async () => {
    if (!eventName || !startDate || !endDate) {
      alert('Todos los campos son obligatorios');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      alert('La fecha de inicio debe ser menor que la de fin');
      return;
    }

    try {
      await updatePersonalEvent(event.id, {
        title: eventName,
        start: new Date(startDate).toISOString(),
        end: new Date(endDate).toISOString(),
        collaborators: collaborators.map(c => c.id),
      });
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar evento');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Seguro que quieres eliminar este evento?")) return;

    try {
      await deletePersonalEvent(event.id);
      onDeleted(event.id);
      onClose();
    } catch (err) {
      alert("Error eliminando evento");
      console.error(err);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("¿Seguro que quieres salir de este evento?")) return;

    try {
      await deletePersonalEvent(event.id);
      onDeleted(event.id);
      onClose();
    } catch (err) {
      alert("Error al salir del evento");
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>Editar Evento Personal</Modal.Header>
      <Modal.Body>
        <Input
          label="Nombre del evento"
          type="text"
          value={eventName}
          onChange={e => setEventName(e.target.value)}
          readOnly={!isOwner}
          disabled={!isOwner}
        />
        <Input
          label="Inicio"
          type="datetime-local"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          readOnly={!isOwner}
          disabled={!isOwner}
        />
        <Input
          label="Fin"
          type="datetime-local"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          readOnly={!isOwner}
          disabled={!isOwner}
        />

        {isOwner ? (
          <CollaboratorPicker
            availableUsers={availableUsers}
            selectedCollaborators={collaborators}
            onSelect={handleSelectCollaborator}
            onRemove={handleRemoveCollaborator}
          />
        ) : (
          <div className="input-container">
            <label className="input-label">Colaboradores</label>
            {collaborators?.length > 0 ? (
              <ul className="collaborator-picker__list">
                {collaborators.map((collab) => (
                  <li key={collab.id} className="collaborator-picker__item">
                    <span>
                      {collab.name || `Usuario ${collab.id}`}
                      {collab.id === event.owner_id ? ' (Propietario)' : ''}
                      {collab.id === currentUserId ? ' (Tú)' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Solo tú.</p>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer onClose={onClose}>
        {!isOwner ? (
          <button className='calendar-delete-btn' onClick={handleLeave}>
            Salir del evento
          </button>
        ) : (
          <>
            <button className='calendar-delete-btn' onClick={handleDelete}>
              Eliminar
            </button>
            <Modal.AcceptButton onClick={handleUpdate}>
              Guardar Cambios
            </Modal.AcceptButton>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default EditPersonalEventModal;