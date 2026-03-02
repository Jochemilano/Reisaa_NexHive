import React, { useEffect, useState } from "react";
import Modal from "components/modal/Modal";
import { Input, Textarea, Select, DateInput } from "components/input/Input";
import { getActivityDetails, updateActivity } from "utils/activities";

const EditActivityModal = ({ isOpen, onClose, activityId, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState({
    name: "",
    description: "",
    status: "pending",
    start_date: "",
    deadline: ""
  });

  // Convierte ISO UTC a formato compatible con datetime-local
  function toLocalDateTimeInput(isoDate) {
    if (!isoDate) return "";
    const dt = new Date(isoDate);
    const offset = dt.getTimezoneOffset();
    const local = new Date(dt.getTime() - offset * 60000); // ajusta a hora local
    return local.toISOString().slice(0,16); // "YYYY-MM-DDTHH:mm"
  }

  useEffect(() => {
    if (!activityId || !isOpen) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getActivityDetails(activityId); // usa utils
        setActivityData({
          name: data.name,
          description: data.description,
          status: data.status,
          start_date: toLocalDateTimeInput(data.start_date),
          deadline: toLocalDateTimeInput(data.deadline)
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activityId, isOpen]);

  const handleChange = (field, value) => {
    setActivityData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      // Convertir fechas a ISO antes de enviar
      const payload = {
        ...activityData,
        start_date: activityData.start_date ? new Date(activityData.start_date).toISOString() : null,
        deadline: activityData.deadline ? new Date(activityData.deadline).toISOString() : null
      };

      await updateActivity(activityId, payload);
      onUpdated(); // refrescar en el sidebar
      onClose();
    } catch (err) {
      alert("Error al actualizar actividad");
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>Editar Actividad</Modal.Header>
      <Modal.Body>
        {loading ? <p>Cargando...</p> : (
          <>
            <Input
              label="Nombre de la actividad"
              value={activityData.name}
              onChange={e => handleChange("name", e.target.value)}
            />
            <Textarea
              label="Descripción"
              value={activityData.description}
              onChange={e => handleChange("description", e.target.value)}
            />
            <Select
              label="Estado"
              value={activityData.status}
              onChange={e => handleChange("status", e.target.value)}
              options={[
                { value: "pending", label: "Pending" },
                { value: "in_progress", label: "In Progress" },
                { value: "done", label: "Done" },
              ]}
            />
            <Input
              label="Fecha de inicio"
              type="datetime-local"
              value={activityData.start_date}
              onChange={e => handleChange("start_date", e.target.value)}
            />

            <Input
              label="Fecha de entrega"
              type="datetime-local"
              value={activityData.deadline}
              onChange={e => handleChange("deadline", e.target.value)}
            />
          </>
        )}
      </Modal.Body>
      <Modal.Footer onClose={onClose}>
        <Modal.AcceptButton onClick={handleSave}>Guardar cambios</Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default EditActivityModal;