import React, { useState, useEffect } from 'react';
import Modal from 'components/modal/Modal';
import Input from 'components/input/Input';

const CreateEventModal = ({ isOpen, onClose, onSave, initialDate }) => {
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Si cambia initialDate, actualizar los campos de fecha
  useEffect(() => {
    if (initialDate) {
      const iso = initialDate.toISOString().slice(0, 16);
      setStartDate(iso);
      setEndDate(iso);
    }
  }, [initialDate]);

  const handleSave = () => {
    if (!eventName.trim() || !startDate || !endDate) {
      alert('Todos los campos son obligatorios');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      alert('La fecha de inicio debe ser menor que la de fin');
      return;
    }

    // Guardar el evento
    onSave({
      title: eventName.trim(),
      start: new Date(startDate),
      end: new Date(endDate),
    });

    // Limpiar campos y cerrar modal
    setEventName('');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  const handleCancel = () => {
    // Limpiar campos y cerrar modal
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
      </Modal.Body>
      <Modal.Footer onClose={handleCancel}>
        <Modal.AcceptButton onClick={handleSave}>Guardar</Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateEventModal;