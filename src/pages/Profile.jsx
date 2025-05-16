import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: '',
    dob: '',
    city: '',
    gender: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('light'); // Default to light mode

  useEffect(() => {
    // Check local storage for theme preference on component mount
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      setTheme('light'); // Set default if not found
      localStorage.setItem('theme', 'light'); // Initialize local storage
    }
  }, []);

  useEffect(() => {
    // Apply theme to the document body
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        navigate('/login'); // Redirect to login if not authenticated
        return;
      }
       console.log(token);
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login');
          } else if (response.status === 404) {
            setError('Profile not found.');
          } else {
            setError('Failed to fetch profile.');
          }
          return;
        }

        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError('An unexpected error occurred.');
        console.error('Fetch Profile Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSaveClick = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        setError('Failed to update profile.');
        return;
      }

      const updatedData = await response.json();
      setProfile(updatedData);
      setIsEditing(false);
    } catch (err) {
      setError('An unexpected error occurred while updating.');
      console.error('Update Profile Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dark:bg-gray-900 dark:text-white min-h-screen flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dark:bg-gray-900 dark:text-white min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-6 flex flex-col justify-center sm:py-12 bg-gray-100 dark:bg-gray-900 transition-colors duration-300`}>
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-blue-600 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white dark:bg-gray-800 shadow-lg sm:rounded-3xl sm:p-20">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Profile</h1>
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.334.266-2.667.743-3.986A3.756 3.756 0 0112 3c1.654 0 3 1.346 3 3 0 1.326-.26 2.602-.737 3.936-.733.475-1.232 1.046-1.651 1.608-1.148 1.576-1.148 3.496 0 5.073l-.372.372a.75.75 0 01-1.06 0z" />
                </svg>
              )}
            </button>
          </div>

          {isEditing ? (
            <div>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Name:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="dob" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Date of Birth:</label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={profile.dob}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="city" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">City:</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="gender" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Gender:</label>
                <select
                  id="gender"
                  name="gender"
                  value={profile.gender}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCancelClick}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveClick}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Name:</label>
                <p className="text-gray-900 dark:text-gray-100">{profile.name || 'N/A'}</p>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Date of Birth:</label>
                <p className="text-gray-900 dark:text-gray-100">{profile.dob || 'N/A'}</p>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">City:</label>
                <p className="text-gray-900 dark:text-gray-100">{profile.city || 'N/A'}</p>
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Gender:</label>
                <p className="text-gray-900 dark:text-gray-100">{profile.gender || 'N/A'}</p>
              </div>
              <button
                onClick={handleEditClick}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
