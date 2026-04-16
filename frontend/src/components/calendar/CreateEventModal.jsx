import React, { useState, useEffect } from 'react';
import Modal from '@/components/modal/Modal';
import Input from '@/components/input/Input';
import CollaboratorPicker from '@/components/input/CollaboratorPicker';
import { fetchAllUsers } from '@/utils/groups';

const CreateEventModal = ({ isOpen, onClose, onSave, initialDate }) => {
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentUserId(parseInt(localStorage.getItem('userId')) || null);
    fetchAllUsers()
      .then(users => setAllUsers(users))
      .catch(err => console.error('Error cargando usuarios:', err));
    setSelectedCollaborators([]);
  }, [isOpen]);

  // Prellenar fechas cuando cambia initialDate
  useEffect(() => {
    if (initialDate) {
      const startIso = initialDate.toISOString().slice(0, 16); // Fecha y hora
      const endIso = initialDate.toISOString().slice(0, 10);   // Solo fecha

      setStartDate(startIso);
      setEndDate(endIso);
    }
  }, [initialDate]);

  const availableUsers = allUsers.filter(
    user => user.id !== currentUserId && !selectedCollaborators.some(c => c.id === user.id)
  );

  const handleSelectCollaborator = (e) => {
    const userId = parseInt(e.target.value);
    const user = allUsers.find(u => u.id === userId);
    if (user && !selectedCollaborators.some(c => c.id === user.id)) {
      setSelectedCollaborators(prev => [...prev, user]);
    }
    e.target.value = '';
  };

  const handleRemoveCollaborator = (userId) => {
    setSelectedCollaborators(prev => prev.filter(c => c.id !== userId));
  };

  // Guardar evento
  const handleSave = () => {
    if (!eventName.trim() || !startDate || !endDate) {
      alert('Todos los campos son obligatorios');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Ajustar fin al final del día

    if (start >= end) {
      alert('La fecha de inicio debe ser menor que la de fin');
      return;
    }

    // Guardar el evento
    onSave({
      title: eventName.trim(),
      start,
      end,
      collaborators: selectedCollaborators.map(c => c.id),
    });

    // Limpiar campos y cerrar modal
    setEventName('');
    setStartDate('');
    setEndDate('');
    setSelectedCollaborators([]);
    onClose();
  };
    // Cancelar y limpiar
  const handleCancel = () => {
    setEventName('');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <Modal.Header onClose={handleCancel}>Crear Evento</Modal.Header>
      <Modal.Body>
        <Input
          label="Nombre del evento"
          type="text"
          placeholder="Nombre del evento"
          value={eventName}
          onChange={e => setEventName(e.target.value)}
        />
        <Input
          label="Inicio"
          type="datetime-local"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
        <Input
          label="Fin"
          type="datetime-local"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />
        <CollaboratorPicker
          availableUsers={availableUsers}
          selectedCollaborators={selectedCollaborators}
          onSelect={handleSelectCollaborator}
          onRemove={handleRemoveCollaborator}
        />
      </Modal.Body>
      <Modal.Footer onClose={handleCancel}>
        <Modal.AcceptButton onClick={handleSave}>Guardar</Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateEventModal;