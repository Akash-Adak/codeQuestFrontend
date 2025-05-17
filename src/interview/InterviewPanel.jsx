import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import CodeEditor from '../components/CodeEditor';
import WhiteBoard from '../interview/WhiteBoard';
import { useLocation ,useNavigate} from 'react-router-dom';

const InterviewPanel = () => {
  const navigate=useNavigate();
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

  // Participant list and self status
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
      // Subscribe to chat messages
      stompClient.current.subscribe(`/topic/${sessionId}`, (message) => {
        if (message.body) {
          const msg = JSON.parse(message.body);
          // Check if message is chat or participant update
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
      // Notify server of participant leaving
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

  // Notify server participant joined
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
      // Also add self locally
      setParticipants((prev) => {
        if (!prev.find(p => p.name === participant.name)) {
          return [...prev, participant];
        }
        return prev;
      });
    }
  };

  // Notify server participant left
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

  // Notify server participant updated video/audio status
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

  // Handle participant join/leave/update from server messages
  const handleParticipantUpdate = (data) => {
    const { action, participant, name } = data;
    setParticipants((prev) => {
      if (action === 'join' && participant) {
        // Add participant if not exists
        if (!prev.find(p => p.name === participant.name)) {
          return [...prev, participant];
        }
      } else if (action === 'leave' && name) {
        // Remove participant by name
        return prev.filter(p => p.name !== name);
      } else if (action === 'update' && participant) {
        // Update participant video/audio
        return prev.map(p => p.name === participant.name ? { ...p, video: participant.video, audio: participant.audio } : p);
      }
      return prev;
    });
  };

  // Update self participant info in list locally when toggling video/audio
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

  // File upload and fetch functions
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

  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch(`/api/files/list?sessionId=${sessionId}`);
      if (res.ok) setUploadedFiles(await res.json());
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const endSession = () => {
    if (window.confirm("Are you sure you want to end the session?")) {
      // Handle session end logic (e.g., notifying participants, stopping WebSocket, etc.)
      disconnectWebSocket();
      navigate("/InterviewTypes");
      // Optionally, redirect to a different page
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white transition-colors">
      {/* Left Panel */}
      <div className="w-full lg:w-2/3 p-4 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">
            {showWhiteBoard ? '📝 WhiteBoard' : '💻 Code Editor'}
          </h2>
          <button
            onClick={() => setShowWhiteBoard(!showWhiteBoard)}
            class Name="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
                  >
                  {showWhiteBoard ? 'Show Editor' : 'Show WhiteBoard'}
                  </button>
                  </div>
                      <div className="flex-1 border rounded shadow-md overflow-hidden bg-gray-50 dark:bg-gray-800">
                        {showWhiteBoard ? (
                          <WhiteBoard />
                        ) : (
                          <CodeEditor code={code} onChange={setCode} />
                        )}
                      </div>

                      {/* Timer and Controls */}
                      <div className="flex justify-between items-center mt-3 space-x-3">
                        <div className="text-lg font-mono tracking-widest">
                          Timer: <span className="font-bold">{formatTime(seconds)}</span>
                        </div>
                        <div className="space-x-2">
                          {!isRunning ? (
                            <button
                              onClick={() => setIsRunning(true)}
                              className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white transition"
                            >
                              Start
                            </button>
                          ) : (
                            <button
                              onClick={() => setIsRunning(false)}
                              className="px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white transition"
                            >
                              Pause
                            </button>
                          )}
                          <button
                            onClick={() => setSeconds(0)}
                            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white transition"
                          >
                            Reset
                          </button>
                          <button
                            onClick={endSession}
                            className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white transition"
                            title="End Session"
                          >
                            End Session
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Panel */}
                    <div className="w-full lg:w-1/3 p-4 flex flex-col border-l border-gray-300 dark:border-gray-700">
                      {/* Webcam & Controls */}
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">Your Webcam</h3>
                        <div className="relative w-full aspect-video bg-black rounded overflow-hidden mb-2">
                          <Webcam
                            audio={true}
                            mirrored={true}
                            ref={webcamRef1}
                            videoConstraints={{ facingMode: "user" }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex justify-center space-x-6">
                          <button
                            onClick={() => setVideoEnabled1((v) => !v)}
                            className={`p-2 rounded-full border-2 ${
                              videoEnabled1
                                ? 'border-green-500 text-green-600 hover:bg-green-100'
                                : 'border-red-500 text-red-600 hover:bg-red-100'
                            } transition`}
                            title={videoEnabled1 ? "Turn off Video" : "Turn on Video"}
                          >
                            {videoEnabled1 ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
                          </button>
                          <button
                            onClick={() => setAudioEnabled1((a) => !a)}
                            className={`p-2 rounded-full border-2 ${
                              audioEnabled1
                                ? 'border-green-500 text-green-600 hover:bg-green-100'
                                : 'border-red-500 text-red-600 hover:bg-red-100'
                            } transition`}
                            title={audioEnabled1 ? "Mute Microphone" : "Unmute Microphone"}
                          >
                            {audioEnabled1 ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
                          </button>
                        </div>
                      </div>

                      {/* Participant List */}
                      <div className="mb-4 flex-1 overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-2">Participants ({participants.length})</h3>
                        <ul className="space-y-2">
                          {participants.map((p) => (
                            <li
                              key={p.name}
                              className={`flex items-center justify-between p-2 rounded border ${
                                p.self ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900' : 'border-gray-300 dark:border-gray-700'
                              }`}
                            >
                              <span className="font-medium truncate">{p.name}</span>
                              <div className="flex items-center space-x-3">
                                <span title={p.video ? "Video On" : "Video Off"}>
                                  {p.video ? (
                                    <FaVideo className="text-green-600" />
                                  ) : (
                                    <FaVideoSlash className="text-red-600" />
                                  )}
                                </span>
                                <span title={p.audio ? "Audio On" : "Audio Off"}>
                                  {p.audio ? (
                                    <FaMicrophone className="text-green-600" />
                                  ) : (
                                    <FaMicrophoneSlash className="text-red-600" />
                                  )}
                                </span>
                              </div>
                            </li>
                          ))}
                          {participants.length === 0 && (
                            <li className="text-sm italic text-gray-500">No participants connected.</li>
                          )}
                        </ul>
                      </div>

                      {/* Chat Box */}
                      <div className="flex flex-col border-t border-gray-300 dark:border-gray-700 pt-2">
                        <h3 className="font-semibold mb-2">Chat</h3>
                        <div
                          ref={chatBoxRef}
                          className="flex-1 overflow-y-auto mb-2 p-2 border rounded bg-gray-100 dark:bg-gray-800 max-h-48"
                        >
                          {chatMessages.map((msg, i) => (
                            <div key={i} className="mb-1">
                              <span className="font-semibold">{msg.from}:</span> {msg.content}
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            className="flex-grow px-3 py-2 rounded border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type a message..."
                          />
                          <button
                            onClick={sendMessage}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                          >
                            Send
                          </button>
                        </div>
                      </div>

                      {/* File Upload */}
                      <div className="mt-4">
                        <label
                          htmlFor="fileUpload"
                          className="inline-block cursor-pointer px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition"
                        >
                          Upload File
                        </label>
                        <input
                          id="fileUpload"
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          <h4 className="font-semibold">Uploaded Files</h4>
                          <ul className="list-disc pl-5">
                            {uploadedFiles.length === 0 && (
                              <li className="text-sm italic text-gray-500">No files uploaded.</li>
                            )}
                            {uploadedFiles.map((file, i) => (
                              <li key={i} className="truncate" title={file.filename}>
                                {file.filename}
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

