import React from "react";
import { Link } from "react-router-dom";

const InterviewTypes = () => {
  const types = [
    {
      title: "Mock Interviews",
      description:
        "Simulated interviews with AI or mentor. Auto-evaluated and timed sessions.",
      action: "Start Mock Interview",
      route: "/InterviewDashboard",
    },
    {
      title: "Peer Interviews",
      description: "Pair up with other users for real-time coding practice.",
      action: "Find Peer",
      route: "/peer-match",
    },
    {
      title: "Mentor Interviews",
      description:
        "Book paid/live sessions with industry experts for in-depth guidance.",
      action: "Book Mentor",
      route: "/mentor-interview",
    },
    {
      title: "Custom Interview Rooms",
      description:
        "Create private rooms and share invite links for custom sessions.",
      action: "Create Room",
      route: "/room",
    },
  ];

  return (
    <div className="bg-green-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
      <h2 className="text-3xl font-extrabold text-center text-gray-800 dark:text-white mb-12">
        Choose Your Interview Type
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {types.map((type, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105"
          >
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
              {type.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{type.description}</p>
            <Link
              to={type.route}
              className="w-full inline-block px-6 py-2 bg-blue-600 text-white text-center rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg transition duration-300"
            >
              {type.action}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterviewTypes;
