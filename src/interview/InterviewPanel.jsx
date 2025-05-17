import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import CodeEditor from '../components/CodeEditor';
import WhiteBoard from '../interview/WhiteBoard';
import { useLocation, useNavigate } from 'react-router-dom';

const InterviewPanel = () => {
  const navigate = useNavigate();
  const [showWhiteBoard, setShowWhiteBoard] = useState(false);
  const [code, setCode] = useState('// Start coding here...');
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [joinedSession, setJoinedSession] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [interviewerName, setInterviewerName] = useState('');

  const [participants, setParticipants] = useState([]);
  const [videoEnabled1, setVideoEnabled1] = useState(true);
  const [audioEnabled1, setAudioEnabled1] = useState(true);

  const webcamRef1 = useRef(null);
  const stompClient = useRef(null);
  const chatBoxRef = useRef(null);
  const location = useLocation();
  const sessionIdFromState = location?.state?.sessionId || '';

  // On mount get sessionId and name
  useEffect(() => {
    if (sessionIdFromState) {
      setSessionId(sessionIdFromState);
      setJoinedSession(true);
    }
  }, [sessionIdFromState]);

  useEffect(() => {
    const storedName = localStorage.getItem("name");
    if (storedName) {
      setInterviewerName(storedName);
    }
  }, []);

  // Enable/disable webcam video/audio tracks
  useEffect(() => {
    if (webcamRef1.current && webcamRef1.current.stream) {
      const videoTrack = webcamRef1.current.stream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = videoEnabled1;
      const audioTrack = webcamRef1.current.stream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = audioEnabled1;
    }
  }, [videoEnabled1, audioEnabled1]);

  // Timer logic
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Connect/disconnect websocket on session join/leave
  useEffect(() => {
    if (joinedSession && sessionId) {
      connectWebSocket();
      fetchUploadedFiles();
    }
    return () => disconnectWebSocket();
  }, [joinedSession, sessionId]);

  // Scroll chat down on new messages
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Update self status in participants when video/audio changes
  useEffect(() => {
    updateSelfStatus();
    sendParticipantStatus();
  }, [videoEnabled1, audioEnabled1]);

  const connectWebSocket = () => {
    const socket = new SockJS('/ws');
    stompClient.current = over(socket);
    stompClient.current.connect({}, () => {
      // Subscribe to chat messages and participant updates
      stompClient.current.subscribe(`/topic/${sessionId}`, (message) => {
        if (message.body) {
          const msg = JSON.parse(message.body);
          if (msg.type === 'chat') {
            setChatMessages((prev) => [...prev, msg.data]);
          } else if (msg.type === 'participant') {
            handleParticipantUpdate(msg.data);
          }
        }
      });
      // Notify server of new participant join
      sendParticipantJoin();
    }, (err) => {
      console.error("WebSocket connection error:", err);
    });
  };

  const disconnectWebSocket = () => {
    if (stompClient.current?.connected) {
      sendParticipantLeave();
      stompClient.current.disconnect(() => {
        console.log('Disconnected WebSocket');
      });
    }
  };

  // Send chat message
  const sendMessage = () => {
    if (chatInput.trim() && stompClient.current?.connected && sessionId) {
      const message = {
        type: 'chat',
        data: {
          from: interviewerName || 'User',
          content: chatInput.trim()
        }
      };
      stompClient.current.send(`/topic/${sessionId}`, {}, JSON.stringify(message));
      setChatInput('');
    }
  };

  // Participant notifications
  const sendParticipantJoin = () => {
    if (stompClient.current?.connected && sessionId) {
      const participant = {
        name: interviewerName || 'User',
        video: videoEnabled1,
        audio: audioEnabled1,
        self: true,
      };
      const message = {
        type: 'participant',
        data: {
          action: 'join',
          participant,
        }
      };
      stompClient.current.send(`/topic/${sessionId}`, {}, JSON.stringify(message));
      setParticipants((prev) => {
        if (!prev.find(p => p.name === participant.name)) {
          return [...prev, participant];
        }
        return prev;
      });
    }
  };

  const sendParticipantLeave = () => {
    if (stompClient.current?.connected && sessionId) {
      const message = {
        type: 'participant',
        data: {
          action: 'leave',
          name: interviewerName || 'User'
        }
      };
      stompClient.current.send(`/topic/${sessionId}`, {}, JSON.stringify(message));
    }
  };

  const sendParticipantStatus = () => {
    if (stompClient.current?.connected && sessionId) {
      const participant = {
        name: interviewerName || 'User',
        video: videoEnabled1,
        audio: audioEnabled1,
        self: true,
      };
      const message = {
        type: 'participant',
        data: {
          action: 'update',
          participant,
        }
      };
      stompClient.current.send(`/topic/${sessionId}`, {}, JSON.stringify(message));
    }
  };

  // Handle participant updates from server
  const handleParticipantUpdate = (data) => {
    const { action, participant, name } = data;
    setParticipants((prev) => {
      if (action === 'join' && participant) {
        if (!prev.find(p => p.name === participant.name)) {
          return [...prev, participant];
        }
      } else if (action === 'leave' && name) {
        return prev.filter(p => p.name !== name);
      } else if (action === 'update' && participant) {
        return prev.map(p => p.name === participant.name ? { ...p, video: participant.video, audio: participant.audio } : p);
      }
      return prev;
    });
  };

  // Update self participant locally
  const updateSelfStatus = () => {
    setParticipants((prev) => {
      return prev.map(p => {
        if (p.name === (interviewerName || 'User')) {
          return { ...p, video: videoEnabled1, audio: audioEnabled1, self: true };
        }
        return p;
      });
    });
  };

  // File upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) fetchUploadedFiles();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  // Fetch uploaded files list
  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch(`/api/files/list?sessionId=${sessionId}`);
      if (res.ok) setUploadedFiles(await res.json());
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  // Format timer display (mm:ss)
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // End session and navigate away
  const endSession = () => {
    if (window.confirm("Are you sure you want to end the session?")) {
      disconnectWebSocket();
      navigate("/InterviewTypes");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white transition-colors">
      {/* Left Panel */}
      <div className="w-full lg:w-2/3 p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2">
                                                             <h2 className="text-xl font-semibold">Timer: {formatTime(seconds)}</h2>
                                                             <button
                                                             onClick={() => setIsRunning(!isRunning)}
                                                             className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
                                                             >
                                                             {isRunning ? 'Pause' : 'Start'}
                                                             </button>
                                                             <button
                                                             onClick={() => setSeconds(0)}
                                                             className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition"
                                                             >
                                                             Reset
                                                             </button>
                                                             </div>
                                                                 <div className="flex-grow flex flex-col space-y-3">
                                                                   {/* Code Editor */}
                                                                   <CodeEditor
                                                                     value={code}
                                                                     onChange={setCode}
                                                                     className="flex-grow border rounded shadow-md"
                                                                   />

                                                                   {/* Whiteboard Toggle */}
                                                                   <button
                                                                     onClick={() => setShowWhiteBoard(!showWhiteBoard)}
                                                                     className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition self-start"
                                                                   >
                                                                     {showWhiteBoard ? 'Hide Whiteboard' : 'Show Whiteboard'}
                                                                   </button>

                                                                   {/* Whiteboard */}
                                                                   {showWhiteBoard && (
                                                                     <div className="flex-grow border rounded shadow-md mt-2">
                                                                       <WhiteBoard />
                                                                     </div>
                                                                   )}
                                                                 </div>
                                                               </div>

                                                               {/* Right Panel */}
                                                               <div className="w-full lg:w-1/3 border-l border-gray-300 dark:border-gray-700 p-4 flex flex-col space-y-4">
                                                                 {/* Webcam with controls */}
                                                                 <div className="relative">
                                                                   <Webcam
                                                                     ref={webcamRef1}
                                                                     audio={audioEnabled1}
                                                                     videoConstraints={{ width: 320, height: 240, facingMode: "user" }}
                                                                     className="rounded-md border border-gray-400"
                                                                   />
                                                                   <div className="absolute top-2 right-2 flex space-x-2">
                                                                     <button
                                                                       title={videoEnabled1 ? "Turn Off Video" : "Turn On Video"}
                                                                       onClick={() => setVideoEnabled1(!videoEnabled1)}
                                                                       className="p-1 rounded bg-black bg-opacity-50 hover:bg-opacity-75"
                                                                     >
                                                                       {videoEnabled1 ? <FaVideo className="text-white" /> : <FaVideoSlash className="text-red-500" />}
                                                                     </button>
                                                                     <button
                                                                       title={audioEnabled1 ? "Mute" : "Unmute"}
                                                                       onClick={() => setAudioEnabled1(!audioEnabled1)}
                                                                       className="p-1 rounded bg-black bg-opacity-50 hover:bg-opacity-75"
                                                                     >
                                                                       {audioEnabled1 ? <FaMicrophone className="text-white" /> : <FaMicrophoneSlash className="text-red-500" />}
                                                                     </button>
                                                                   </div>
                                                                 </div>

                                                                 {/* Participants */}
                                                                 <div className="flex flex-col space-y-1 border rounded p-2 max-h-40 overflow-auto bg-gray-50 dark:bg-gray-800">
                                                                   <h3 className="font-semibold mb-1">Participants ({participants.length})</h3>
                                                                   {participants.map((p) => (
                                                                     <div key={p.name} className="flex items-center justify-between">
                                                                       <span className="font-medium">{p.name}{p.self ? " (You)" : ""}</span>
                                                                       <div className="flex space-x-2">
                                                                         {p.video ? (
                                                                           <FaVideo className="text-green-500" title="Video On" />
                                                                         ) : (
                                                                           <FaVideoSlash className="text-red-500" title="Video Off" />
                                                                         )}
                                                                         {p.audio ? (
                                                                           <FaMicrophone className="text-green-500" title="Audio On" />
                                                                         ) : (
                                                                           <FaMicrophoneSlash className="text-red-500" title="Audio Off" />
                                                                         )}
                                                                       </div>
                                                                     </div>
                                                                   ))}
                                                                 </div>

                                                                 {/* Chat Box */}
                                                                 <div className="flex flex-col flex-grow border rounded p-2 bg-gray-50 dark:bg-gray-800">
                                                                   <h3 className="font-semibold mb-2">Chat</h3>
                                                                   <div
                                                                     ref={chatBoxRef}
                                                                     className="flex-grow overflow-y-auto mb-2 p-2 bg-white dark:bg-gray-900 rounded shadow-inner"
                                                                     style={{ maxHeight: '200px' }}
                                                                   >
                                                                     {chatMessages.length === 0 && <p className="text-gray-500">No messages yet</p>}
                                                                     {chatMessages.map((msg, idx) => (
                                                                       <div
                                                                         key={idx}
                                                                         className={`mb-1 p-1 rounded ${
                                                                           msg.from === (interviewerName || 'User') ? 'bg-indigo-100 dark:bg-indigo-700 self-end text-right' : 'bg-gray-200 dark:bg-gray-700'
                                                                         }`}
                                                                       >
                                                                         <strong>{msg.from}: </strong><span>{msg.content}</span>
                                                                       </div>
                                                                     ))}
                                                                   </div>
                                                                   <div className="flex space-x-2">
                                                                     <input
                                                                       type="text"
                                                                       value={chatInput}
                                                                       onChange={(e) => setChatInput(e.target.value)}
                                                                       onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                                                       placeholder="Type a message..."
                                                                       className="flex-grow border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                     />
                                                                     <button
                                                                       onClick={sendMessage}
                                                                       className="px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                                                                     >
                                                                       Send
                                                                     </button>
                                                                   </div>
                                                                 </div>

                                                                 {/* File Upload */}
                                                                 <div className="border rounded p-2 bg-gray-50 dark:bg-gray-800">
                                                                   <h3 className="font-semibold mb-2">Upload Files</h3>
                                                                   <input
                                                                     type="file"
                                                                     onChange={handleFileUpload}
                                                                     className="mb-2"
                                                                   />
                                                                   <div className="max-h-24 overflow-auto">
                                                                     {uploadedFiles.length === 0 && <p className="text-gray-500">No files uploaded.</p>}
                                                                     {uploadedFiles.map((file, idx) => (
                                                                       <div key={idx} className="text-sm truncate">
                                                                         {file.name}
                                                                       </div>
                                                                     ))}
                                                                   </div>
                                                                 </div>

                                                                 {/* End Session Button */}
                                                                 <button
                                                                   onClick={endSession}
                                                                   className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                                 >
                                                                   End Session
                                                                 </button>
                                                               </div>
                                                             </div>

);
};

export default InterviewPanel;