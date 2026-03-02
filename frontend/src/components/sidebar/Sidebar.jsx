import Modal from "components/modal/Modal";
import Separator from "components/separator/Separator";
import { useNavigate } from "react-router-dom";
import Button from "components/button/Button";
import { useState, useEffect } from "react";
import Input from "components/input/Input";
import { FaPlus } from "react-icons/fa";
import React from "react";
import "./Sidebar.css";
import { fetchGroups, createGroup } from "utils/groups";

const Sidebar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [groups, setGroups] = useState([]);

  // Cargar grupos al iniciar
   useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await fetchGroups();
        setGroups(data);
      } catch (err) {
        console.error("Error cargando grupos:", err);
      }
    };
    loadGroups();
  }, []);

  // Crear grupo y agregar al estado
  const handleCreateGroup = async () => {
    if (!name.trim()) return;

    try {
      const newGroup = await createGroup(name);
      setGroups(prev => [...prev, newGroup]);
      setName("");
      setIsOpen(false);
    } catch (err) {
      console.error("Error creando grupo:", err);
    }
  };


  return (
    <aside className="sidebar">
        <Button text="H" onClick={() => navigate("/home")} />
        <Button text="CLL" onClick={() => navigate("/call")} />
        <Button text="GD" onClick={() => navigate("/saved")} />
        <Button text="C" onClick={() => navigate("/calendar")} />
        <Separator />
        
        {groups.map(group => (
          <Button
            key={group.id}
            text={group.name[0].toUpperCase()}
            onClick={() => navigate(`/groups/${group.id}`)}
          />
        ))}

        <Modal.Button onClick={() => setIsOpen(true)}><FaPlus/></Modal.Button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <Modal.Header onClose={() => setIsOpen(false)}>Crea un grupo</Modal.Header>
          <Modal.Body>
          <Input
            label="Nombre del grupo"
            type="text"
            placeholder="Dinos el nombre del grupo"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          
          </Modal.Body>
          <Modal.Footer onClose={() => setIsOpen(false)}>
            <Modal.AcceptButton onClick={handleCreateGroup}> Crear </Modal.AcceptButton>
          </Modal.Footer>
        </Modal>

    </aside>
  );
};

export default Sidebar;