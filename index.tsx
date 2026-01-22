import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import GameViewer from './GameViewer.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical Error: Could not find root element with ID 'root'");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/game/:id" element={<GameViewer />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
}
