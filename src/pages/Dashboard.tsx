import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  TrendingUp,
  Timer,
  CheckCircle,
  XCircle,
  Coffee,
  Pause,
  Play,
  Thermometer,
  Wifi,
  WifiOff,
  BarChart3,
  Activity,
  Globe,
  MapIcon,
  ClipboardList,
  Eye,
  Target,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, SERVER_URL } from '../config/api';

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    downlink?: number;
  };
}

interface DashboardStats {
  averageWorkingHours?: number;
  totalDays?: number;
  presentDays?: number;
  lateDays?: number;
  halfDays?: number;
  totalBreakHours?: number;
  totalOvertimeHours?: number;
  remoteDays?: number;
  punctualityRate?: number;
  totalBreaks?: number;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  category: string;
  estimatedHours?: number;
  progress?: number;
  completionReason?: string;
}

interface AttendanceRecord {
  _id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent' | 'half-day';
  workingHours: number;
  breakHours?: number;
  breaks?: Array<{
    breakStart: string;
    breakEnd?: string;
    type: string;
    duration?: number;
  }>;
  isRemote?: boolean;
  mood?: string;
  productivity?: {
    score: number;
    tasksCompleted: number;
  };
}

interface TodayAttendance {
  _id?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  workingHours?: number;
  breakHours?: number;
  overtimeHours?: number;
  breaks?: Array<{
    breakStart: string;
    breakEnd?: string;
    type: string;
    duration?: number;
  }>;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  isRemote?: boolean;
  temperature?: number;
}

interface BreakStatus {
  onBreak: boolean;
  currentBreak?: {
    breakStart: string;
    type: string;
  };
  totalBreaks: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

const Dashboard = () => {
  const { user } = useAuth(); const [stats, setStats] = useState<DashboardStats>({});
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [breakStatus, setBreakStatus] = useState<BreakStatus>({ onBreak: false, totalBreaks: 0 });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isRemoteMode, setIsRemoteMode] = useState(false);
  const [temperature, setTemperature] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [showAdvancedCheckIn, setShowAdvancedCheckIn] = useState(false);
  const [selectedMood, setMood] = useState<string>('neutral');
  const [productivityScore, setProductivityScore] = useState<number>(5); const [tasksPlanned, setTasksPlanned] = useState<number>(0); const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine); const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedTaskForCompletion, setSelectedTaskForCompletion] = useState<Task | null>(null);
  const [completionReason, setCompletionReason] = useState('');
  const [taskAction, setTaskAction] = useState<'completed' | 'cancelled'>('completed'); const [showTaskReasonModal, setShowTaskReasonModal] = useState(false);
  const [selectedTaskForReason, setSelectedTaskForReason] = useState<Task | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false); const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []); useEffect(() => {
    fetchDashboardData();
    fetchBreakStatus();
    fetchUserTasks();
    fetchAttendanceHistory();
    getCurrentLocation();
    initializeBatteryStatus();
    initializeNetworkStatus();
  }, []);
  const initializeBatteryStatus = async () => {
    if ('getBattery' in navigator) {
      try {
        // @ts-expect-error - getBattery is not in TypeScript definitions
        const battery = await navigator.getBattery();
        setBatteryLevel(Math.round(battery.level * 100));

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      } catch {
        console.log('Battery API not supported');
        setBatteryLevel(100); // Default value
      }
    } else {
      setBatteryLevel(100); // Default value for unsupported browsers
    }
  };

  const initializeNetworkStatus = () => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  };

  const getCurrentLocation = async () => {
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          });
        });

        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        // Try to get address from coordinates
        try {
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${position.coords.latitude}+${position.coords.longitude}&key=YOUR_API_KEY&limit=1`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              locationData.address = data.results[0].formatted;
            }
          }
        } catch {
          console.log('Could not get address');
        }

        setLocation(locationData);
      } catch (error) {
        console.error('Error getting location:', error);
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch today's attendance
      const attendanceResponse = await fetch(API_ENDPOINTS.ATTENDANCE.TODAY, {
        credentials: 'include'
      });

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        setTodayAttendance(attendanceData.attendance);
      }

      // Fetch attendance stats
      const statsResponse = await fetch(API_ENDPOINTS.ATTENDANCE.STATS, {
        credentials: 'include'
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchBreakStatus = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ATTENDANCE.CURRENT_BREAK, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBreakStatus(data);
      }
    } catch (error) {
      console.error('Error fetching break status:', error);
    }
  }; const fetchUserTasks = async () => {
    try {
      // Fetch all tasks assigned to the user (no limit to ensure all tasks are shown)
      const response = await fetch(`${SERVER_URL}/api/tasks?status=pending,in-progress,overdue&limit=50`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUserTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching user tasks:', error);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/attendance/history?limit=10`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceHistory(data.attendance || []);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  };
  const updateTaskStatus = async (taskId: string, status: string, reason?: string) => {
    try {
      const requestBody: { status: string; completionReason?: string } = { status };

      if (reason && (status === 'completed' || status === 'cancelled')) {
        requestBody.completionReason = reason;
      }

      const response = await fetch(`${SERVER_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        // Refresh tasks after updating
        fetchUserTasks();
        setShowCompletionModal(false);
        setSelectedTaskForCompletion(null);
        setCompletionReason('');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }; const handleTaskCompletion = (task: Task, status: 'completed' | 'cancelled') => {
    setSelectedTaskForCompletion(task);
    setTaskAction(status);
    setShowCompletionModal(true);
  };
  const handleCompleteTaskWithReason = () => {
    if (selectedTaskForCompletion) {
      updateTaskStatus(selectedTaskForCompletion._id, taskAction, completionReason);
    }
  };
  const handleViewTaskReason = (task: Task) => {
    setSelectedTaskForReason(task);
    setShowTaskReasonModal(true);
  };
  // Add functions for task details
  const handleViewTaskDetails = (task: Task) => {
    setSelectedTaskForDetail(task);
    setShowTaskDetailModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const handleMarkAttendance = async (type: 'checkin' | 'checkout') => {
    try {
      const requestData: Record<string, unknown> = {
        type,
        location,
        isRemote: isRemoteMode,
        mood: selectedMood,
        productivity: {
          score: productivityScore,
          tasksCompleted: type === 'checkin' ? tasksPlanned : undefined
        },
        batteryLevel,
        gpsAccuracy: location?.accuracy, networkInfo: {
          connectionType: (navigator as NavigatorWithConnection).connection?.effectiveType || 'unknown',
          signalStrength: (navigator as NavigatorWithConnection).connection?.downlink || 0,
          networkName: isOnline ? 'connected' : 'offline'
        }
      };

      if (temperature) {
        requestData.temperature = parseFloat(temperature);
      }

      if (symptoms.length > 0) {
        requestData.symptoms = symptoms;
      }

      // Get weather information if available
      if (location) {
        try {
          // This would typically call a weather API
          requestData.weather = {
            condition: 'unknown',
            temperature: 20,
            humidity: 50
          };
        } catch {
          // Weather info is optional
        }
      }

      const response = await fetch(API_ENDPOINTS.ATTENDANCE.MARK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok) {
        setTodayAttendance(data.attendance);
        await fetchDashboardData();
        setShowAdvancedCheckIn(false);
        setShowHealthCheck(false);

        // Reset form
        setMood('neutral');
        setProductivityScore(5);
        setTasksPlanned(0);
        setTemperature('');
        setSymptoms([]);
      } else {
        alert(data.message || 'Error marking attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Error marking attendance');
    }
  };

  const handleBreak = async (type: 'start' | 'end', breakType: string = 'other') => {
    try {
      const response = await fetch(API_ENDPOINTS.ATTENDANCE.BREAK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ type, breakType })
      });

      const data = await response.json();

      if (response.ok) {
        await fetchBreakStatus();
        await fetchDashboardData();
      } else {
        alert(data.message || 'Error managing break');
      }
    } catch (error) {
      console.error('Error managing break:', error);
      alert('Error managing break');
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const formatWorkingHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getCurrentBreakDuration = () => {
    if (breakStatus.currentBreak) {
      const breakStart = new Date(breakStatus.currentBreak.breakStart);
      const now = new Date();
      const duration = Math.floor((now.getTime() - breakStart.getTime()) / (1000 * 60));
      return formatWorkingHours(duration);
    }
    return '0m';
  };

  const dashboardCards = [
    {
      title: 'Today\'s Status',
      value: todayAttendance?.status ?
        todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1) :
        'Not Marked',
      icon: todayAttendance?.checkIn ? CheckCircle : XCircle,
      color: todayAttendance?.checkIn ? 'text-green-600' : 'text-red-600',
      bgColor: todayAttendance?.checkIn ? 'bg-green-50' : 'bg-red-50'
    },
    {
      title: 'This Month',
      value: `${stats.totalDays || 0} Days`,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'On Time Rate',
      value: `${stats.punctualityRate || 0}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Break Time',
      value: `${stats.totalBreaks || 0} Breaks`,
      icon: Coffee,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name}!
            </h1>
            <p className="text-blue-100 flex items-center space-x-2">
              <span>{format(currentTime, 'EEEE, MMMM d, yyyy')} • {format(currentTime, 'h:mm:ss a')}</span>
              {location && (
                <span className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>Location detected</span>
                </span>
              )}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            {/* Remote Mode Toggle */}
            <button
              onClick={() => setIsRemoteMode(!isRemoteMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${isRemoteMode ? 'bg-green-500 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
            >
              {isRemoteMode ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span>{isRemoteMode ? 'Remote' : 'Office'}</span>
            </button>

            {/* Main Action Buttons */}
            {!todayAttendance?.checkIn ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleMarkAttendance('checkin')}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Quick Check In</span>
                </button>
                <button
                  onClick={() => setShowAdvancedCheckIn(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-400 transition-colors"
                >
                  Advanced
                </button>
              </div>
            ) : !todayAttendance?.checkOut ? (
              <div className="flex space-x-2">
                {!breakStatus.onBreak ? (
                  <button
                    onClick={() => handleBreak('start', 'other')}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center space-x-2"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Take Break</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleBreak('end')}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>End Break</span>
                  </button>
                )}
                <button
                  onClick={() => handleMarkAttendance('checkout')}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Check Out</span>
                </button>
              </div>
            ) : (
              <div className="bg-green-500 px-6 py-2 rounded-lg font-medium flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Day Complete</span>
              </div>
            )}
          </div>
        </div>
      </div>      {/* Advanced Check-in Modal */}
      {showAdvancedCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Advanced Check-in</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Mode
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setIsRemoteMode(false)}
                    className={`flex-1 p-3 rounded-lg border ${!isRemoteMode ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                  >
                    <Globe className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Office</span>
                  </button>
                  <button
                    onClick={() => setIsRemoteMode(true)}
                    className={`flex-1 p-3 rounded-lg border ${isRemoteMode ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                  >
                    <Wifi className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Remote</span>
                  </button>
                </div>
              </div>

              {/* Mood Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How are you feeling today?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { mood: 'excellent', emoji: '😃', label: 'Excellent' },
                    { mood: 'good', emoji: '😊', label: 'Good' },
                    { mood: 'neutral', emoji: '😐', label: 'Neutral' },
                    { mood: 'tired', emoji: '😴', label: 'Tired' },
                    { mood: 'stressed', emoji: '😰', label: 'Stressed' }
                  ].map(({ mood, emoji, label }) => (
                    <button
                      key={mood}
                      onClick={() => setMood(mood)}
                      className={`p-2 rounded-lg border text-center ${mood === selectedMood
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="text-lg">{emoji}</div>
                      <div className="text-xs">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Productivity Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Productivity (1-10)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={productivityScore}
                    onChange={(e) => setProductivityScore(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-8 text-center font-medium">{productivityScore}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tasks planned for today
                </label>
                <input
                  type="number"
                  value={tasksPlanned}
                  onChange={(e) => setTasksPlanned(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => setShowHealthCheck(!showHealthCheck)}
                className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5" />
                  <span>Health Check</span>
                </span>
                <span className="text-sm text-gray-500">
                  {showHealthCheck ? 'Hide' : 'Show'}
                </span>
              </button>

              {showHealthCheck && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="37.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Any Symptoms?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Fever', 'Cough', 'Headache', 'Fatigue', 'Sore Throat', 'Nausea'].map((symptom) => (
                        <button
                          key={symptom}
                          onClick={() => {
                            setSymptoms(prev =>
                              prev.includes(symptom)
                                ? prev.filter(s => s !== symptom)
                                : [...prev, symptom]
                            );
                          }}
                          className={`p-2 text-sm rounded-lg border ${symptoms.includes(symptom)
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Device Information */}
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Device Status</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-600">Battery:</span>
                    <span className="font-medium">{batteryLevel}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>

              {location && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Location Detected</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                  </p>
                  {location.accuracy && (
                    <p className="text-xs text-blue-600 mt-1">
                      Accuracy: ±{location.accuracy}m
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAdvancedCheckIn(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMarkAttendance('checkin')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Check In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Break Status */}
      {breakStatus.onBreak && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-500 p-2 rounded-full">
                <Coffee className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-orange-900">Currently on Break</p>
                <p className="text-sm text-orange-700">
                  {breakStatus.currentBreak?.type} • Duration: {getCurrentBreakDuration()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleBreak('end')}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              End Break
            </button>
          </div>
        </div>
      )}

      {/* Today's Activity & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Today's Activity</span>
          </h3>
          <div className="space-y-4">
            {todayAttendance?.checkIn ? (
              <>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="bg-green-500 p-2 rounded-full">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Checked In</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(todayAttendance.checkIn)}
                      {todayAttendance.isRemote && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Remote
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {todayAttendance?.checkOut ? (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="bg-blue-500 p-2 rounded-full">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Checked Out</p>
                      <p className="text-sm text-gray-600">{formatTime(todayAttendance.checkOut)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-gray-400 p-2 rounded-full">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Not Checked Out</p>
                      <p className="text-sm text-gray-600">Still working</p>
                    </div>
                  </div>
                )}

                {todayAttendance?.workingHours && todayAttendance.workingHours > 0 && (
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <div className="bg-purple-500 p-2 rounded-full">
                      <Timer className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Working Hours</p>
                      <p className="text-sm text-gray-600">{formatWorkingHours(todayAttendance.workingHours)}</p>
                    </div>
                  </div>
                )}

                {todayAttendance?.breakHours && todayAttendance.breakHours > 0 && (
                  <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                    <div className="bg-orange-500 p-2 rounded-full">
                      <Coffee className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Break Time</p>
                      <p className="text-sm text-gray-600">{formatWorkingHours(todayAttendance.breakHours)}</p>
                    </div>
                  </div>
                )}

                {todayAttendance?.breaks && todayAttendance.breaks.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Today's Breaks</h4>
                    <div className="space-y-2">
                      {todayAttendance.breaks.map((breakItem, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded-lg">
                          <span className="font-medium capitalize">{breakItem.type}</span>
                          <span className="text-gray-600 ml-2">
                            {formatTime(breakItem.breakStart)}
                            {breakItem.breakEnd && ` - ${formatTime(breakItem.breakEnd)}`}
                            {breakItem.duration && ` (${formatWorkingHours(breakItem.duration)})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">You haven't checked in today</p>
                <button
                  onClick={() => setShowAdvancedCheckIn(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Check In Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Monthly Overview */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Monthly Overview</span>
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.totalDays || 0}</p>
                <p className="text-sm text-blue-800">Total Days</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.punctualityRate || 0}%</p>
                <p className="text-sm text-green-800">On Time</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Present Days</span>
                <span className="font-semibold text-green-600">{stats.presentDays || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Late Days</span>
                <span className="font-semibold text-orange-600">{stats.lateDays || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Half Days</span>
                <span className="font-semibold text-yellow-600">{stats.halfDays || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Remote Days</span>
                <span className="font-semibold text-blue-600">{stats.remoteDays || 0}</span>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg. Working Hours</span>
                  <span className="font-semibold">
                    {stats.averageWorkingHours ? formatWorkingHours(stats.averageWorkingHours) : '0h 0m'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Overtime</span>
                  <span className="font-semibold text-purple-600">
                    {stats.totalOvertimeHours ? formatWorkingHours(stats.totalOvertimeHours) : '0h 0m'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Breaks</span>
                  <span className="font-semibold text-orange-600">{stats.totalBreaks || 0}</span>            </div>
              </div>
            </div>
          </div>

          {/* My Tasks Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <ClipboardList className="h-5 w-5" />
                <span>My Tasks</span>
              </h3>              <span className="text-sm text-gray-500">
                {userTasks.filter(task => task.status === 'pending').length} pending, {userTasks.filter(task => task.status === 'in-progress').length} in progress, {userTasks.filter(task => task.status === 'overdue').length} overdue
              </span>
            </div>

            {userTasks.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No tasks assigned yet</p>
                <p className="text-sm text-gray-500">Check back later for new assignments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userTasks.map((task) => (<div key={task._id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-gray-900 flex-1 mr-2">{task.title}</h4>
                        <button
                          onClick={() => handleViewTaskDetails(task)}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center space-x-1"
                          title="View complete task details and full description"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Full Details</span>
                        </button>                      </div>
                      <div className="flex items-center space-x-3 text-xs">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {format(new Date(task.dueDate), 'MMM dd')}</span>
                        </span>
                        <span className={`px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-1 rounded-full font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        {task.estimatedHours && (
                          <span className="text-gray-500">
                            {task.estimatedHours}h est.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1 ml-4">
                      {task.status === 'pending' && (
                        <button
                          onClick={() => updateTaskStatus(task._id, 'in-progress')}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                        >
                          Start
                        </button>
                      )}
                      {task.status === 'in-progress' && (
                        <button
                          onClick={() => handleTaskCompletion(task, 'completed')}
                          className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <button
                          onClick={() => handleTaskCompletion(task, 'cancelled')}
                          className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      {(task.status === 'completed' || task.status === 'cancelled') && task.completionReason && (
                        <button
                          onClick={() => handleViewTaskReason(task)}
                          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors flex items-center space-x-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Reason</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {task.progress !== undefined && task.progress > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Progress</span>
                        <span className="text-xs text-gray-700">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                ))}
              </div>)}          </div>

          {/* Attendance History Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>My Attendance History</span>
              </h3>
              <button
                onClick={() => setShowAttendanceModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                View All
              </button>
            </div>

            {attendanceHistory.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No attendance records found</p>
                <p className="text-sm text-gray-500">Your attendance history will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceHistory.slice(0, 5).map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(record.date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(record.date), 'EEEE')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : record.status === 'late'
                              ? 'bg-orange-100 text-orange-800'
                              : record.status === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {record.status}
                          </span>
                          {record.isRemote && (
                            <span className="ml-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Remote
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {format(new Date(record.checkIn), 'HH:mm')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {record.checkOut
                              ? format(new Date(record.checkOut), 'HH:mm')
                              : 'Not checked out'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(record.workingHours / 60).toFixed(1)}h
                          {record.breakHours && record.breakHours > 0 && (
                            <div className="text-xs text-gray-500">
                              -{(record.breakHours / 60).toFixed(1)}h break
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedAttendanceRecord(record)}
                            className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          >
                            <Activity className="h-4 w-4" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>      </div>

      {/* Attendance History Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">My Attendance History</h3>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {attendanceHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No attendance records found</p>
                  <p className="text-gray-500">Your attendance history will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Working Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Break Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Breaks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceHistory.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(record.date), 'EEEE')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'late'
                                ? 'bg-orange-100 text-orange-800'
                                : record.status === 'absent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {record.status}
                            </span>
                            {record.isRemote && (
                              <div className="mt-1">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Remote
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-2" />
                              {format(new Date(record.checkIn), 'HH:mm')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-2" />
                              {record.checkOut
                                ? format(new Date(record.checkOut), 'HH:mm')
                                : 'Not checked out'
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(record.workingHours / 60).toFixed(1)}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.breakHours && record.breakHours > 0
                              ? `${(record.breakHours / 60).toFixed(1)}h`
                              : '0h'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.breaks && record.breaks.length > 0 ? (
                              <div className="flex items-center">
                                <Timer className="h-4 w-4 text-gray-400 mr-1" />
                                {record.breaks.length} break{record.breaks.length > 1 ? 's' : ''}
                              </div>
                            ) : (
                              <span className="text-gray-400">No breaks</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setSelectedAttendanceRecord(record)}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                            >
                              <Activity className="h-4 w-4" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Details Modal */}
      {selectedAttendanceRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Attendance Details - {format(new Date(selectedAttendanceRecord.date), 'MMM dd, yyyy')}
                </h3>
                <button
                  onClick={() => setSelectedAttendanceRecord(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Basic Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{format(new Date(selectedAttendanceRecord.date), 'EEEE, MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedAttendanceRecord.status === 'present'
                          ? 'bg-green-100 text-green-800'
                          : selectedAttendanceRecord.status === 'late'
                            ? 'bg-orange-100 text-orange-800'
                            : selectedAttendanceRecord.status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {selectedAttendanceRecord.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Work Mode:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedAttendanceRecord.isRemote
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {selectedAttendanceRecord.isRemote ? 'Remote' : 'In Office'}
                        </span>
                      </div>
                      {selectedAttendanceRecord.mood && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mood:</span>
                          <span className="font-medium capitalize">{selectedAttendanceRecord.mood}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Time Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check In:</span>
                        <span className="font-medium">{format(new Date(selectedAttendanceRecord.checkIn), 'HH:mm:ss')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check Out:</span>
                        <span className="font-medium">
                          {selectedAttendanceRecord.checkOut
                            ? format(new Date(selectedAttendanceRecord.checkOut), 'HH:mm:ss')
                            : 'Not checked out'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Working Hours:</span>
                        <span className="font-medium text-green-600">
                          {Math.floor(selectedAttendanceRecord.workingHours / 60)}h {selectedAttendanceRecord.workingHours % 60}m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Break Hours:</span>
                        <span className="font-medium text-orange-600">
                          {selectedAttendanceRecord.breakHours && selectedAttendanceRecord.breakHours > 0
                            ? `${Math.floor(selectedAttendanceRecord.breakHours / 60)}h ${selectedAttendanceRecord.breakHours % 60}m`
                            : '0h 0m'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Productivity Information */}
                  {selectedAttendanceRecord.productivity && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Productivity</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Score:</span>
                          <span className="font-medium text-blue-600">
                            {selectedAttendanceRecord.productivity.score}/10
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tasks Completed:</span>
                          <span className="font-medium text-green-600">
                            {selectedAttendanceRecord.productivity.tasksCompleted}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Breaks Information */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Break Details</h4>
                    {selectedAttendanceRecord.breaks && selectedAttendanceRecord.breaks.length > 0 ? (
                      <div className="space-y-3">
                        {selectedAttendanceRecord.breaks.map((breakItem, index) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm font-medium text-gray-900 capitalize">
                                  {breakItem.type} Break #{index + 1}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Start: {format(new Date(breakItem.breakStart), 'HH:mm:ss')}
                                </div>
                                {breakItem.breakEnd && (
                                  <div className="text-xs text-gray-500">
                                    End: {format(new Date(breakItem.breakEnd), 'HH:mm:ss')}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                {breakItem.duration ? (
                                  <span className="text-sm font-medium text-orange-600">
                                    {Math.floor(breakItem.duration / 60)}h {breakItem.duration % 60}m
                                  </span>
                                ) : (
                                  <span className="text-xs text-red-600">Ongoing</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Coffee className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">No breaks taken</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Completion Modal */}
      {showCompletionModal && selectedTaskForCompletion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">            <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {taskAction === 'completed' ? 'Complete' : 'Cancel'} Task: {selectedTaskForCompletion.title}
          </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {taskAction === 'completed' ? 'Completion' : 'Cancellation'} Reason
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={completionReason}
                onChange={(e) => setCompletionReason(e.target.value)}
                placeholder={
                  taskAction === 'completed'
                    ? "Please describe what was accomplished..."
                    : "Please explain why this task is being cancelled..."
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                maxLength={1000}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {completionReason.length}/1000 characters (Required)
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setSelectedTaskForCompletion(null);
                  setCompletionReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>              <button
                onClick={handleCompleteTaskWithReason}
                disabled={!completionReason.trim()}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${taskAction === 'completed'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
                  }`}
              >                {taskAction === 'completed' ? 'Complete' : 'Cancel'} Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Reason Modal */}
      {showTaskReasonModal && selectedTaskForReason && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedTaskForReason.status === 'completed' ? 'Completion' : 'Cancellation'} Reason
              </h3>
              <button
                onClick={() => {
                  setShowTaskReasonModal(false);
                  setSelectedTaskForReason(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Task: {selectedTaskForReason.title}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedTaskForReason.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {selectedTaskForReason.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedTaskForReason.status === 'completed' ? 'Completion' : 'Cancellation'} Reason:
              </label>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {selectedTaskForReason.completionReason || 'No reason provided'}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowTaskReasonModal(false);
                  setSelectedTaskForReason(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showTaskDetailModal && selectedTaskForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getPriorityColor(selectedTaskForDetail.priority)} bg-opacity-20`}>
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedTaskForDetail.title}
                    </h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTaskForDetail.status)}`}>
                        {selectedTaskForDetail.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTaskForDetail.priority)}`}>
                        {selectedTaskForDetail.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTaskDetailModal(false);
                    setSelectedTaskForDetail(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Description
                    </h3>
                    <div className="bg-gray-50 p-6 rounded-lg border max-h-96 overflow-y-auto">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
                          {selectedTaskForDetail.description}
                        </p>
                      </div>
                      {selectedTaskForDetail.description.length > 500 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Long description ({selectedTaskForDetail.description.length} characters)</span>
                            <span>Scroll to view all content</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Task Info */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Task Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due Date:</span>
                        <span className="text-gray-900 font-medium">
                          {format(new Date(selectedTaskForDetail.dueDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="text-gray-900 capitalize">{selectedTaskForDetail.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Progress:</span>
                        <span className="text-gray-900">{selectedTaskForDetail.progress || 0}%</span>
                      </div>
                      {selectedTaskForDetail.estimatedHours && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated Hours:</span>
                          <span className="text-gray-900">{selectedTaskForDetail.estimatedHours}h</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Completion Info */}
                  {(selectedTaskForDetail.status === 'completed' || selectedTaskForDetail.status === 'cancelled') && selectedTaskForDetail.completionReason && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        {selectedTaskForDetail.status === 'completed' ? 'Completion' : 'Cancellation'} Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600 block mb-1">Reason:</span>
                          <p className="text-gray-900 text-xs bg-white p-2 rounded border">
                            {selectedTaskForDetail.completionReason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowTaskDetailModal(false);
                    setSelectedTaskForDetail(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
