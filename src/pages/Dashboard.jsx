import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = ({ userName = "User" }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow">
        <h1 className="text-2xl font-bold">Welcome, {userName} 👋</h1>
        <span className="text-xl">🚀 Dashboard</span>
      </header>

      <main className="p-6 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Join/Create Coding Room"
            to="/room"
            desc="Collaborate in live coding sessions."
          />
          <DashboardCard
            title="Start Mock Interview"
            to="/InterviewTypes"
            desc="Timed coding practice with AI or peers."
          />
          <DashboardCard
            title="View Past Interviews"
            to="/past-interviews"
            desc="Review previous interviews & notes."
          />

          <DashboardCard
            title="Profile & Settings"
            to="/profile"
            desc="Manage profile and preferences."
          />
        </section>

        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">🔔 Recent Activity</h2>
          <ul className="space-y-2 text-sm md:text-base">
            <li>✅ Completed a mock interview - <span className="text-gray-500">2 hours ago</span></li>
            <li>🆕 New room invitation from <span className="font-semibold">Alex</span></li>
            <li>📈 Performance updated for "<span className="font-semibold">Sorting Algorithms</span>"</li>
            <li>🛠️ Profile updated - <span className="text-gray-500">Yesterday</span></li>
          </ul>
        </section>
      </main>

      <footer className="text-center py-4 text-sm text-gray-600 dark:text-gray-400">
        © 2025 CodeQuest - Happy Coding!
      </footer>
    </div>
  );
};

const DashboardCard = ({ title, to, desc }) => (
  <Link
    to={to}
    className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
  >
    <h2 className="text-lg font-bold mb-2">{title}</h2>
    <p className="text-sm text-gray-600 dark:text-gray-300">{desc}</p>
  </Link>
);

export default Dashboard;
