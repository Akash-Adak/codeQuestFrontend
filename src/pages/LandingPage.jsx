import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import Room from "../pages/Room";
import { FaCode, FaChalkboardTeacher, FaUsers, FaChartLine } from "react-icons/fa";

const LandingPage = () => {
  const { darkMode } = useTheme();
  const [isRoomOpen, setIsRoomOpen] = useState(false);

  const openRoomPopup = () => setIsRoomOpen(true);
  const closeRoomPopup = () => setIsRoomOpen(false);

  return (
    <div className="min-h-screen font-sans">
      <div className="min-h-screen bg-green-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <header className="text-center py-14 bg-gradient-to-r from-green-300 to-indigo-300 dark:from-blue-300 dark:to-purple-500 shadow-md">
          <h1 className="text-5xl font-extrabold text-black mb-3">CodeQuest</h1>
          <p className="text-lg text-white">Ace your coding interviews with collaboration and precision</p>
          <button
            onClick={openRoomPopup}
            className="mt-6 px-6 py-3 bg-white text-blue-600 font-semibold rounded shadow hover:bg-gray-100"
          >
            🚀 Get Started
          </button>
        </header>

        <section className="py-16 px-4 md:px-16 bg-green-100 dark:bg-gray-900">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800 dark:text-white">Our Key Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:shadow-xl transition">
              <FaCode className="text-4xl mb-4 text-blue-600" />
              <h3 className="text-xl font-bold mb-2">Real-Time Coding</h3>
              <p className="text-gray-600 dark:text-gray-300">Code together in real time, test and debug with ease across supported languages.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:shadow-xl transition">
              <FaChalkboardTeacher className="text-4xl mb-4 text-green-600" />
              <h3 className="text-xl font-bold mb-2">Mock Interviews</h3>
              <p className="text-gray-600 dark:text-gray-300">Simulate interviews with timers, role assignments and question libraries.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:shadow-xl transition">
              <FaUsers className="text-4xl mb-4 text-yellow-500" />
              <h3 className="text-xl font-bold mb-2">Collaboration Tools</h3>
              <p className="text-gray-600 dark:text-gray-300">Chat, share problems, and collaborate live with peer candidates and mentors.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:shadow-xl transition">
              <FaChartLine className="text-4xl mb-4 text-red-500" />
              <h3 className="text-xl font-bold mb-2">Progress Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300">Monitor your journey, track problem-solving skills, and receive feedback instantly.</p>
            </div>
          </div>
        </section>

        <section className="bg-green-50 dark:bg-gray-800 py-16 px-4 md:px-16 text-center">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Why Choose CodeQuest?</h2>
          <p className="text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            CodeQuest combines cutting-edge coding collaboration with interview preparation tools tailored for aspiring developers, students, and job seekers. Whether you're preparing for FAANG, startups, or academics, CodeQuest is your all-in-one platform.
          </p>
          <button
            onClick={openRoomPopup}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded shadow-lg hover:bg-indigo-700"
          >
            🔥 Start a New Session
          </button>
        </section>

        <footer className="text-center py-6 bg-gray-200 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2025 CodeQuest. Built with ❤️ for developers.
          </p>
        </footer>
      </div>

      {isRoomOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg shadow-xl">
            <button
              onClick={closeRoomPopup}
              className="absolute top-3 right-4 text-2xl text-gray-700 dark:text-gray-300 hover:text-red-500"
            >
              ×
            </button>
            <Room />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;