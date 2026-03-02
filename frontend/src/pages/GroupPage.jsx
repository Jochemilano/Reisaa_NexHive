import React from "react";
import { useParams } from "react-router-dom";
import SecondSidebar from "components/sidebar/SecondSidebar";

const GroupPage = () => {
  const { groupId } = useParams();

  return (
    <div className="group-page">
      <SecondSidebar groupId={groupId} />
      <div className="main-content">
        {/* Aquí va el contenido principal del grupo */}
      </div>
    </div>
  );
};

export default GroupPage;