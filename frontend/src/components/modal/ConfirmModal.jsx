import React from 'react';
import Modal from './Modal'; // reutiliza tu modal existente

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>{title || "Confirmar acción"}</Modal.Header>
      <Modal.Body>
        {message || "¿Estás seguro que quieres continuar?"}
      </Modal.Body>
      <Modal.Footer onClose={onClose}>
        <Modal.AcceptButton onClick={() => { onConfirm(); onClose(); }}>Confirmar</Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;