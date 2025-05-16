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

  const [videoEnabled1, setVideoEnabled1] = useState(true);
  const [audioEnabled1, setAudioEnabled1] = useState(true);

  const webcamRef1 = useRef(null);
  const stompClient = useRef(null);
  const chatBoxRef = useRef(null);
  const location = useLocation();
  const sessionIdFromState = location?.state?.sessionId || '';

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

  useEffect(() => {
    if (webcamRef1.current && webcamRef1.current.stream) {
      const videoTrack = webcamRef1.current.stream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = videoEnabled1;
      const audioTrack = webcamRef1.current.stream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = audioEnabled1;
    }
  }, [videoEnabled1, audioEnabled1]);

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
    }
    return () => disconnectWebSocket();
  }, [joinedSession, sessionId]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const connectWebSocket = () => {
    const socket = new SockJS('/ws');
    stompClient.current = over(socket);
    stompClient.current.connect({}, () => {
      stompClient.current.subscribe(`/topic/${sessionId}`, (message) => {
        if (message.body) {
          const msg = JSON.parse(message.body);
          setChatMessages((prev) => [...prev, msg]);
        }
      });
    }, (err) => {
      console.error("WebSocket connection error:", err);
    });
  };

  const disconnectWebSocket = () => {
    if (stompClient.current?.connected) {
      stompClient.current.disconnect(() => {
        console.log('Disconnected WebSocket');
      });
    }
  };

  const sendMessage = () => {
    if (chatInput.trim() && stompClient.current?.connected && sessionId) {
      const message = {
        from: interviewerName || 'User',
        content: chatInput.trim()
      };
      stompClient.current.send(`/topic/${sessionId}`, {}, JSON.stringify(message));
      setChatInput('');
    }
  };

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
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {showWhiteBoard ? 'Editor' : 'WhiteBoard'}
          </button>
        </div>

        <div className="flex justify-start items-center mb-2">
          <button
            onClick={() => setIsRunning((prev) => !prev)}
            className="text-blue-600 font-medium focus:outline-none"
            title={isRunning ? "Pause" : "Start"}
          >
            🕒 {formatTime(seconds)}
          </button>
        </div>

        <div className="flex-grow border rounded shadow-inner bg-gray-100 dark:bg-gray-800 p-2 overflow-auto">
          {showWhiteBoard ? <WhiteBoard /> : <CodeEditor code={code} onChange={setCode} />}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/3 p-4 space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-800 border-l">
        {/* Info */}
        <div className="p-4 bg-white dark:bg-gray-700 rounded shadow">
          <h4 className="text-white-600 dark:bg-white-600"><span className="font-semibold text-white-600">Interviewer:</span> {interviewerName}</h4>
          <h4 className="text-blue-600 font-semibold">Session ID</h4>
          <p className="break-words">{sessionId}</p>
           {sessionId && (
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded flex items-center space-x-2"
                      onClick={() => {
                        const url = `${window.location.origin}/interviewPanel/${sessionId}`;
                        navigator.clipboard.writeText(url);
                        alert("Meeting link copied to clipboard!");
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                        viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M8 16h8m-4-4v4m0 0v4m0-4H8m4 0h4"></path>
                      </svg>
                      <span>Copy Link</span>
                    </button>
                  )}

        </div>

{/*          */}{/* Participant List */}
{/*         <div className="p-4 bg-white dark:bg-gray-700 rounded shadow"> */}
{/*           <h4 className="text-blue-600 font-semibold mb-2">👥 Participants</h4> */}
{/*           <ul className="max-h-32 overflow-auto list-disc pl-5 text-sm text-gray-800 dark:text-gray-200"> */}
{/*             {participants.map((participant, idx) => ( */}
{/*               <li key={idx} className="hover:underline hover:text-blue-600"> */}
{/*                 {participant.name} */}
{/*               </li> */}
{/*             ))} */}
{/*           </ul> */}
{/*         </div> */}
        {/* Webcam */}
        <div className="p-4 bg-white dark:bg-gray-700 rounded shadow text-center">
          <Webcam ref={webcamRef1} audio={audioEnabled1} className="w-full h-40 bg-black rounded" />
          <div className="mt-2 space-x-2 flex justify-center">
            <button
              onClick={() => setVideoEnabled1((v) => !v)}
              className="p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700"
              title={videoEnabled1 ? "Stop Video" : "Start Video"}
            >
              {videoEnabled1 ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
            </button>
            <button
              onClick={() => setAudioEnabled1((a) => !a)}
              className="p-2 text-white bg-green-600 rounded-full hover:bg-green-700"
              title={audioEnabled1 ? "Mute" : "Unmute"}
            >
              {audioEnabled1 ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
            </button>
          </div>
        </div>

        {/* Chat */}
        <div className="p-4 bg-white dark:bg-gray-700 rounded shadow">
          <h4 className="text-blue-600 font-semibold mb-2">💬 Chat</h4>
          <div className="h-48 overflow-y-auto border p-2 mb-2 bg-gray-50 dark:bg-gray-800 text-sm rounded" ref={chatBoxRef}>
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`mb-1 ${msg.from === interviewerName ? 'text-right text-blue-500' : 'text-left text-gray-800 dark:text-gray-200'}`}
              >
                <div className="inline-block bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                  <strong>{msg.from}</strong>: {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="flex">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-grow px-3 py-2 rounded bg-gray-100 dark:bg-gray-600"
              placeholder="Type your message..."
            />
            <button onClick={sendMessage} className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Send</button>
          </div>
        </div>

        {/* Files */}
        <div className="p-4 bg-white dark:bg-gray-700 rounded shadow">
          <h4 className="text-blue-600 font-semibold mb-2">📁 Files</h4>
          <input
            type="file"
            onChange={handleFileUpload}
            className="mb-2 w-full text-sm text-gray-800 dark:text-gray-200 file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700"
          />
          <ul className="max-h-32 overflow-auto list-disc pl-5 text-sm text-gray-800 dark:text-gray-200">
            {uploadedFiles.map((file, idx) => (
              <li key={idx} className="hover:underline hover:text-blue-600">
                <a
                  href={`/api/files/download/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {file.originalFileName}
                </a>
              </li>
            ))}
          </ul>
        </div>
         {/* End Session Button */}
            <div className="p-4">
              <button
                onClick={endSession}
                className="w-full py-3 text-lg bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                End Session
              </button>
            </div>
      </div>
    </div>
  );
};

export default InterviewPanel;
