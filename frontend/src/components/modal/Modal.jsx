import React from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

export const ModalButton = ({ children, text, onClick, type = "button" }) => {
  return (
    <button
      type={type}
      className="modal-button"
      onClick={onClick}
    >
      {children}
      {text}
    </button>
  );
};

export const Modal = ({ isOpen, onClose, children, className = "" }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${className}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

// Subcomponentes
export const ModalHeader = ({ children, onClose }) => (
  <>
    <div className="modal-header">
      <h2>{children}</h2>
      {onClose && (
        <button className="modal-close-btn" onClick={onClose}>
          &times;
        </button>
      )}
    </div>
  </>
);

export const ModalBody = ({ children }) => (
  <div className="modal-body">{children}</div>
);

export const ModalFooter = ({ children, onClose, onAccept }) => (
  <>
    <div className="modal-footer">
      <button
        className="modal-cancel"
        onClick={onClose}
      >
        Cancelar
      </button>
      {children}
      <div></div>
    </div>
  </>
  
);

export const ModalAcceptButton = ({ type, children, onClick }) =>(
  <button
    type={type}
    className="modal-accept"
    onClick = {onClick}
  >
    {children}
  </button>
);
 
Modal.Button = ModalButton;
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.AcceptButton = ModalAcceptButton;

export default Modal;