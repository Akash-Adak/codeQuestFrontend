import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaUsers,
  FaLink,
  FaClock,
  FaSignOutAlt,
  FaUserCircle,
  FaFileAlt,
  FaDownload,
  FaPlay, // For start timer
  FaPause, // For pause timer
} from 'react-icons/fa';
import CodeEditor from '../components/CodeEditor';
import WhiteBoard from '../interview/WhiteBoard';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const InterviewPanel = () => {
  const navigate = useNavigate();
  const [showWhiteBoard, setShowWhiteBoard] = useState(false);
  const [code, setCode] = useState('// Start coding here...');
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  const [joinedSession, setJoinedSession] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [interviewerName, setInterviewerName] = useState('');

  const [videoEnabled, setVideoEnabled] = useState(true); // Renamed from videoEnabled1
  const [audioEnabled, setAudioEnabled] = useState(true); // Renamed from audioEnabled1

  const webcamRef = useRef(null); // Renamed from webcamRef1
  const stompClient = useRef(null);
  const chatBoxRef = useRef(null);
  const location = useLocation();
  const sessionIdFromState = location?.state?.sessionId || '';

  // Corrected declaration for sessionId parsing
  let firstHalfSessionId = '';
  let secondHalfSessionId = '';
  if (sessionIdFromState.length > 0) {
    const halfLength = Math.floor(sessionIdFromState.length / 2); // Use floor for better handling of odd lengths
    firstHalfSessionId = sessionIdFromState.substring(0, halfLength);
    secondHalfSessionId = sessionIdFromState.substring(halfLength); // Start from halfLength to get the rest
  }

  useEffect(() => {
    if (sessionIdFromState) {
      setSessionId(sessionIdFromState);
      setJoinedSession(true);
    }
  }, [sessionIdFromState]);

  useEffect(() => {
    const storedName = localStorage.getItem('name');
    if (storedName) {
      setInterviewerName(storedName);
    }
  }, []);

  useEffect(() => {
    // Request media permissions once
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        // You might want to store the stream if you're managing tracks manually
        // For Webcam component, it handles stream internally with `ref`
      })
      .catch((err) => {
        console.error('Media access error:', err);
        toast.error('Please allow camera and microphone access to join the session.');
      });
  }, []);

  useEffect(() => {
    // Control webcam video/audio tracks based on state
    const webcam = webcamRef.current;
    if (webcam && webcam.video && webcam.video.srcObject) {
      const stream = webcam.video.srcObject;
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) videoTrack.enabled = videoEnabled;
      if (audioTrack) audioTrack.enabled = audioEnabled;
    }
  }, [videoEnabled, audioEnabled]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (joinedSession && sessionId) {
      connectWebSocket();
      fetchUploadedFiles();
      fetchParticipants();
    }
    // Cleanup function for useEffect
    return () => disconnectWebSocket();
  }, [joinedSession, sessionId]); // Re-run when joinedSession or sessionId changes

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const connectWebSocket = () => {
    const socket = new SockJS('https://codequestbackend.onrender.com/ws');
    stompClient.current = over(socket);
    stompClient.current.connect(
      {},
      () => {
        console.log('WebSocket connected successfully');
        stompClient.current.subscribe(`/topic/code/${sessionId}`, (message) => {
          if (message.body) {
            const msg = JSON.parse(message.body);
            // Assuming messages can be for chat, code, or whiteboard
            if (msg.type === 'chat') {
              setChatMessages((prev) => [...prev, msg]);
            } else if (msg.type === 'code') {
              // This is a basic update; a real-time editor needs more granular sync
              setCode(msg.content);
            }
            // Add handling for whiteboard messages if they come through this topic
          }
        });

        // Consider sending a "user joined" message here
        // stompClient.current.send(`/app/code/${sessionId}/join`, {}, JSON.stringify({ from: interviewerName, type: 'join' }));
      },
      (err) => {
        console.error('WebSocket connection error:', err);
        toast.error('Failed to connect to real-time features.');
      }
    );
  };

  const disconnectWebSocket = () => {
    if (stompClient.current?.connected) {
      stompClient.current.disconnect(() => {
        console.log('Disconnected WebSocket');
        // Consider sending a "user left" message here
      });
    }
  };

  const sendMessage = () => {
    if (chatInput.trim() && stompClient.current?.connected && sessionId) {
      const message = {
        from: interviewerName || 'User',
        content: chatInput.trim(),
        type: 'chat', // Add message type
        timestamp: new Date().toISOString(), // Add timestamp
      };
      stompClient.current.send(`/app/code/${sessionId}`, {}, JSON.stringify(message));
      setChatInput('');
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    // Send code changes over WebSocket
    if (stompClient.current?.connected && sessionId) {
      const codeMessage = {
        from: interviewerName || 'User',
        content: newCode,
        type: 'code',
      };
      stompClient.current.send(`/app/code/${sessionId}`, {}, JSON.stringify(codeMessage));
    }
  };


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Frontend validation for file size/type can be added here
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size exceeds 5MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    try {
      // Use axios for better error handling and progress if needed
      const res = await axios.post('https://codequestbackend.onrender.com/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.status === 200) {
        toast.success('File uploaded successfully!');
        fetchUploadedFiles();
      } else {
        toast.error('Failed to upload file.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(`Upload failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const fetchUploadedFiles = async () => {
    if (!sessionId) return; // Prevent fetching without a session ID
    try {
      const res = await axios.get(`https://codequestbackend.onrender.com/api/files/list?sessionId=${sessionId}`);
      if (res.status === 200) {
        setUploadedFiles(res.data);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      toast.error('Failed to fetch shared files.');
    }
  };

  const fetchParticipants = async () => {
    if (!sessionId) return;
    try {
      const response = await axios.get(`https://codequestbackend.onrender.com/api/interview-rooms/${sessionId}/participants`);
      if (response.data) {
        setParticipants(response.data);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to fetch participants.');
    }
  };


  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const endSession = () => {
    if (window.confirm('Are you sure you want to end the session?')) {
      disconnectWebSocket();
      toast.info('Session ended', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      navigate('/InterviewTypes'); // Navigate to a different page after ending
    }
  };

  const toggleParticipantsList = () => {
    setIsParticipantsOpen(!isParticipantsOpen);
    // Fetch participants only when opening the list to ensure it's up-to-date
    if (!isParticipantsOpen) {
      fetchParticipants();
    }
  };

  const handleCopyLink = () => {
    // Construct the full link that someone would use to join
    const joinURL = `${window.location.origin}/join-interview?sessionId=${sessionIdFromState}`; // Assuming a join page
    const copyText = `Join the Interview:\nLink: ${joinURL}\nRoom ID: ${firstHalfSessionId}\nAccess Code: ${secondHalfSessionId}`;

    navigator.clipboard.writeText(copyText)
      .then(() => {
        toast.success('Meeting details copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy link:', err);
        toast.error('Failed to copy link. Please copy manually.');
      });
  };


  return (
    <div className="bg-gradient-to-br from-gray-100 to-blue-100 dark:bg-gradient-to-br dark:from-gray-800 dark:to-blue-900 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-4">
          {/* Participants Button */}
          <div className="relative">
            <button
              onClick={toggleParticipantsList}
              className="flex items-center space-x-2 text-blue-500 dark:text-blue-400 focus:outline-none hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
              title="View Participants"
            >
              <FaUsers className="h-5 w-5" />
              <span className="font-semibold">{participants.length}</span>
            </button>
            {isParticipantsOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-700 shadow-xl rounded-md overflow-hidden z-10 w-48 border border-gray-200 dark:border-gray-600">
                <h5 className="p-3 font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                  Participants
                </h5>
                <ul className="max-h-40 overflow-y-auto py-2">
                  {participants.map((participant, index) => (
                    <li
                      key={index}
                      className="flex items-center space-x-2 px-3 py-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <FaUserCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span>{participant || 'Guest'}</span>
                    </li>
                  ))}
                  {participants.length === 0 && (
                    <li className="py-2 text-gray-500 dark:text-gray-400 text-center text-sm italic">
                      No participants yet.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full shadow-inner text-sm">
            <FaClock className="text-gray-600 dark:text-gray-300" />
            <span className="text-gray-700 dark:text-gray-300 font-mono">{formatTime(seconds)}</span>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="ml-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none transition-colors duration-200 p-1 rounded-full"
              title={isRunning ? 'Pause Timer' : 'Start Timer'}
            >
              {isRunning ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
            </button>
          </div>

          {/* Copy Link */}
          {sessionId && (
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md focus:outline-none transition-colors duration-200 text-sm"
              title="Copy Meeting Details"
            >
              <FaLink className="h-4 w-4" />
              <span>Copy Invite</span>
            </button>
          )}
        </div>

        {/* End Session Button */}
        <button
          onClick={endSession}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md focus:outline-none flex items-center space-x-2 transition-colors duration-200 text-sm"
          title="End Interview Session"
        >
          <FaSignOutAlt className="h-3 w-3" />
          <span>End Session</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex flex-col lg:flex-row p-4 gap-4">
        {/* Left Panel (Code Editor/Whiteboard) */}
        <div className="w-full lg:w-2/3 p-6 flex flex-col shadow-lg rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400">
              {showWhiteBoard ? '🎨 Interactive Whiteboard' : '💻 Collaborative Code Editor'}
            </h2>
            <button
              onClick={() => setShowWhiteBoard(!showWhiteBoard)}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 text-sm"
              title={showWhiteBoard ? 'Switch to Code Editor' : 'Switch to Whiteboard'}
            >
              {showWhiteBoard ? 'Code Editor' : 'Whiteboard'}
            </button>
          </div>
          <div className="flex-grow border border-gray-200 dark:border-gray-700 rounded-md shadow-inner overflow-hidden bg-gray-50 dark:bg-gray-700">
            {showWhiteBoard ? <WhiteBoard /> : <CodeEditor code={code} onChange={handleCodeChange} />}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/3 p-6 flex flex-col space-y-5 overflow-y-auto bg-gray-100 dark:bg-gray-900 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Webcam */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4 text-center border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">My Camera</h4>
            <div className="relative w-full aspect-video overflow-hidden rounded-md shadow-inner bg-black">
              <Webcam
                ref={webcamRef}
                audio={audioEnabled} // Control audio track directly
                videoConstraints={{ facingMode: 'user' }} // Ensures front camera
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
              {!videoEnabled && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center text-white text-xl font-bold">
                  Video Off
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-center space-x-3">
              <button
                onClick={() => setVideoEnabled((prev) => !prev)}
                className={`p-3 rounded-full transition-colors duration-200 ${
                  videoEnabled
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                } focus:outline-none shadow-md`}
                title={videoEnabled ? 'Turn Video Off' : 'Turn Video On'}
              >
                {videoEnabled ? <FaVideo className="h-5 w-5" /> : <FaVideoSlash className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setAudioEnabled((prev) => !prev)}
                className={`p-3 rounded-full transition-colors duration-200 ${
                  audioEnabled
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                } focus:outline-none shadow-md`}
                title={audioEnabled ? 'Turn Microphone Off' : 'Turn Microphone On'}
              >
                {audioEnabled ? <FaMicrophone className="h-5 w-5" /> : <FaMicrophoneSlash className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Chat */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4 flex-grow flex flex-col border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">Chat</h4>
            <div
              className="flex-grow overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-3 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 custom-scrollbar"
              ref={chatBoxRef}
            >
              {chatMessages.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 italic">No messages yet. Start chatting!</p>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i} // Consider using a unique ID from message if available for better performance
                  className={`mb-2 ${
                    msg.from === interviewerName ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className={`inline-block px-3 py-2 rounded-lg max-w-[80%] ${
                    msg.from === interviewerName
                      ? 'bg-indigo-600 text-white' // Your messages
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200' // Other participants' messages
                  }`}>
                    <strong className="font-semibold block">{msg.from}:</strong>
                    <span>{msg.content}</span>
                    {msg.timestamp && (
                      <span className="block text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-grow px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                placeholder="Type your message..."
              />
              <button
                onClick={sendMessage}
                className="ml-3 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
              >
                Send
              </button>
            </div>
          </div>

          {/* Files */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center space-x-2">
              <FaFileAlt className="h-5 w-5" />
              <span>Shared Files</span>
            </h4>
            <input
              type="file"
              onChange={handleFileUpload}
              className="mb-3 w-full text-sm text-gray-700 dark:text-gray-300
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-blue-500 file:text-white
                         hover:file:bg-blue-600 transition-colors duration-200 cursor-pointer"
            />
            <ul className="max-h-32 overflow-y-auto list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 custom-scrollbar">
              {uploadedFiles.length === 0 && (
                <li className="text-gray-500 dark:text-gray-400 italic">No files shared yet.</li>
              )}
              {uploadedFiles.map((file, idx) => (
                <li key={file.id || idx} className="hover:underline hover:text-blue-500 flex items-center space-x-2 py-1">
                  <a
                    href={`https://codequestbackend.onrender.com/api/files/download/${file.id}`} // Corrected download URL
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 dark:text-blue-400 flex-grow"
                  >
                    {file.originalFileName}
                  </a>
                  <a
                    href={`https://codequestbackend.onrender.com/api/files/download/${file.id}`} // Corrected download URL
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors duration-200"
                    title={`Download ${file.originalFileName}`}
                  >
                    <FaDownload className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPanel;
