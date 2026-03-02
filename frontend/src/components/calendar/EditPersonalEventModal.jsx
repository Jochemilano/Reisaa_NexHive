import React, { useState, useEffect } from 'react';
import Modal from 'components/modal/Modal';
import Input from 'components/input/Input';
import { deletePersonalEvent, updatePersonalEvent } from 'utils/calendar-create-event';

const EditPersonalEventModal = ({ isOpen, onClose, event, onUpdated, onDeleted }) => {
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (event) {
      setEventName(event.title || '');
      setStartDate(event.start ? event.start.toISOString().slice(0,16) : '');
      setEndDate(event.end ? event.end.toISOString().slice(0,16) : '');
    }
  }, [event]);

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
    } catch (err) {
      alert("Error eliminando evento");
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
      <Modal.Footer>
        <button onClick={handleDelete}>
          Eliminar
        </button>

        <Modal.AcceptButton onClick={handleUpdate}>
          Guardar Cambios
        </Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default EditPersonalEventModal;