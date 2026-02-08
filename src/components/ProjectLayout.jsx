// src/components/ProjectLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const ProjectLayout = () => {
  return (
    <div>
      <Sidebar />
      <div style={{ marginLeft: '240px' }}> {/* Adjust based on navbar width */}
        <Outlet />
      </div>
    </div>
  );
};

export default ProjectLayout;
