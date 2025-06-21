import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Bell,
  Moon,
  Sun,
  Save,
  Eye,
  EyeOff,
  Building,
  Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    attendance: true,
    reports: false
  });

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [loading, setLoading] = useState(false);
  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notification-preferences');

    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (error) {
        console.error('Error parsing notification preferences:', error);
      }
    }
  }, []);

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || ''
      });
    }
  }, [user]); const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!profileData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!profileData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!profileData.department.trim()) {
      toast.error('Department is required');
      return;
    }

    setLoading(true);

    try {
      const success = await updateProfile({
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        department: profileData.department.trim()
      });

      if (success) {
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const success = await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (success) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  }; const handleNotificationChange = (key: string, value: boolean) => {
    try {
      const updatedNotifications = {
        ...notifications,
        [key]: value
      };
      setNotifications(updatedNotifications);
      localStorage.setItem('notification-preferences', JSON.stringify(updatedNotifications));
      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Failed to save notification preferences');
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: darkMode ? Moon : Sun }
  ];

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z\d]/.test(password)) strength += 1;

    const levels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500'];

    return {
      level: levels[strength] || 'Very Weak',
      color: colors[strength] || 'text-red-500',
      percentage: Math.min(strength * 25, 100)
    };
  }; return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Profile Information</h3>

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl font-medium">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">{user?.name}</h4>
                      <p className="text-gray-600 dark:text-gray-400 capitalize">{user?.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                   dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                          required
                          maxLength={50}
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                   dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                          required
                          placeholder="Enter your email address"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={profileData.department}
                          onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                   dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                          required
                          placeholder="Enter your department"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={user?.role || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 capitalize"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        loading ||
                        !profileData.name.trim() ||
                        !profileData.email.trim() ||
                        !profileData.department.trim()
                      }
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 
                               disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2
                               transition-colors"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            )}            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Change Password</h3>

                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        required
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        required
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordData.newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className={`font-medium ${getPasswordStrength(passwordData.newPassword).color}`}>
                            Password Strength: {getPasswordStrength(passwordData.newPassword).level}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {getPasswordStrength(passwordData.newPassword).percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrength(passwordData.newPassword).percentage >= 75 ? 'bg-green-500' :
                                getPasswordStrength(passwordData.newPassword).percentage >= 50 ? 'bg-yellow-500' :
                                  getPasswordStrength(passwordData.newPassword).percentage >= 25 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${getPasswordStrength(passwordData.newPassword).percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Password should contain uppercase, lowercase, numbers, and special characters
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none 
                                 focus:ring-2 focus:border-transparent transition-colors
                                 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400
                                 ${passwordData.newPassword && passwordData.confirmPassword &&
                            passwordData.newPassword !== passwordData.confirmPassword
                            ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                          }`}
                        required
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordData.newPassword && passwordData.confirmPassword &&
                      passwordData.newPassword !== passwordData.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">Passwords do not match</p>
                      )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        loading ||
                        passwordData.newPassword !== passwordData.confirmPassword ||
                        passwordData.newPassword.length < 6 ||
                        !passwordData.currentPassword ||
                        !passwordData.newPassword ||
                        !passwordData.confirmPassword
                      }
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 
                               disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2
                               transition-colors"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              </div>
            )}            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Notification Preferences</h3>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications via email</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('email', !notifications.email)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.email ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.email ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Push Notifications</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Receive push notifications in browser</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('push', !notifications.push)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.push ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.push ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Attendance Reminders</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Get reminded to mark attendance</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('attendance', !notifications.attendance)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.attendance ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.attendance ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Weekly Reports</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Receive weekly attendance reports</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('reports', !notifications.reports)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.reports ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.reports ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div>                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Appearance Settings</h3>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Switch to dark theme</p>
                    </div>
                    <button
                      onClick={() => {
                        toggleDarkMode();
                        toast.success(`${!darkMode ? 'Dark' : 'Light'} mode enabled`);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Theme Preview</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white">
                        <div className="h-2 bg-blue-600 rounded mb-2"></div>
                        <div className="h-1 bg-gray-300 rounded mb-1"></div>
                        <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                        <p className="text-xs text-gray-600 mt-2">Light Theme</p>
                      </div>
                      <div className="p-4 border border-gray-600 rounded-lg bg-gray-800">
                        <div className="h-2 bg-blue-400 rounded mb-2"></div>
                        <div className="h-1 bg-gray-600 rounded mb-1"></div>
                        <div className="h-1 bg-gray-600 rounded w-3/4"></div>
                        <p className="text-xs text-gray-400 mt-2">Dark Theme</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;