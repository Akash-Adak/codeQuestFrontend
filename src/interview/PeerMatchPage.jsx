// src/pages/PeerMatchPage.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const PeerMatchPage = () => {
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const generateSessionId = () => Math.random().toString(36).substring(2, 10);

  const handleCreateSession = () => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    navigate(`/interviewPanel/${newSessionId}`, { state: { sessionId: newSessionId } });
  };

  const handleJoinSession = () => {
    if (sessionId) {
      navigate(`/interviewPanel/${sessionId}`, { state: { sessionId } });
    }
  };

  return (
    <div className={`w-full h-screen flex justify-center items-center transition duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`p-6 rounded shadow-lg transition duration-300 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
        <h2 className="text-2xl mb-4">Create or Join Interview Session</h2>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-4 py-2 mb-4 border rounded outline-none transition duration-300 ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'}`}
        />
        <button
          onClick={handleCreateSession}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 mb-2 rounded transition duration-200"
        >
          Create Session
        </button>
        <input
          type="text"
          placeholder="Enter Session ID to join"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className={`w-full px-4 py-2 mb-4 border rounded outline-none transition duration-300 ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'}`}
        />
        <button
          onClick={handleJoinSession}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition duration-200"
        >
          Join Session
        </button>
      </div>
    </div>
  );
};

export default PeerMatchPage;
