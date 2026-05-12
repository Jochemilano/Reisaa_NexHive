import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from "react-router-dom";
import process from 'process';

// Hack de compatibilidad: Algunas librerías de dependencias (especialmente tras migraciones o en entornos Vite/Webpack) 
// esperan encontrar el objeto 'process' global en el objeto window para acceder a variables de entorno.
window.process = process;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
