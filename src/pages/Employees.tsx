import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  Mail,
  Calendar,
  Building,
  ClipboardList,
  Clock,
  Target,
  XCircle,
  Eye,
  User,
  MapPin,
  Phone,
  Shield,
  Heart,
  Wifi,
  Battery,
  CheckCircle,
  AlertCircle,
  Coffee,
  FileText,
  CreditCard,
  Thermometer,
  MonitorSpeaker,
  Monitor
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { SERVER_URL } from '../config/api';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'employee';
  status: 'active' | 'inactive';
  department: string;
  joinedDate: string;
  lastLogin?: string;
  lastSeen?: string;
  assignedTasks?: Array<{
    taskId: string;
    assignedDate: string;
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  }>;
  profileImage?: string;
  phoneNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  workSchedule?: {
    startTime: string;
    endTime: string;
    workDays: string[];
  };
  salary?: {
    amount: number;
    currency: string;
  };
  manager?: string;
  subordinates?: string[];
  permissions?: string[];
  isActive?: boolean;
  profile?: {
    phone?: string;
    address?: string;
    skills?: string[];
    experience?: number;
  };
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  assignedBy: string;
  dueDate: string;
  category: string;
  progress: number;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: string;
  }>;
  comments?: Array<{
    user: string;
    comment: string;
    timestamp: string;
  }>;
  timeTracking?: Array<{
    startTime: string;
    endTime?: string;
    duration: number;
    description: string;
    date: string;
  }>;
  dependencies?: string[];
  completedAt?: string;
  completionReason?: string;
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate?: string;
}



interface AttendanceRecord {
  _id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent' | 'half-day';
  workingHours: number;
  breakHours?: number;
  overtimeHours?: number;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
  };
  breaks?: Array<{
    breakStart: string;
    breakEnd?: string;
    duration?: number;
    type: 'lunch' | 'tea' | 'personal' | 'meeting' | 'other';
    notes?: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  }>;
  notes?: string;
  device?: {
    userAgent: string;
    ip: string;
    platform: string;
  };
  isRemote?: boolean;
  temperature?: number;
  symptoms?: string[];
  isApproved?: boolean;
  approvedBy?: string;
  productivity?: {
    score: number;
    tasksCompleted: number;
    selfAssessment?: string;
  };
  mood?: 'excellent' | 'good' | 'neutral' | 'tired' | 'stressed';
  networkInfo?: {
    connectionType: string;
    signalStrength?: number;
    networkName?: string;
  };
  batteryLevel?: number;
  gpsAccuracy?: number;
  faceRecognitionScore?: number;
  rfidCardId?: string;
  approvalRequired?: boolean;
  approvalReason?: string;
  corrections?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
    reason: string;
    correctedBy: string;
    correctedAt: string;
  }>;
  weather?: {
    condition: string;
    temperature: number;
    humidity: number;
  };
}

interface EmployeeResponse {
  success: boolean;
  employees: Employee[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
  };
}

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null); const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<{
    success: boolean;
    employee: Employee;
    recentAttendance: AttendanceRecord[];
  } | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false); const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTaskCompletionModal, setShowTaskCompletionModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false); const [employeeAttendance, setEmployeeAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<AttendanceRecord | null>(null); const [selectedTaskForCompletion, setSelectedTaskForCompletion] = useState<Task | null>(null);
  const [taskCompletionReason, setTaskCompletionReason] = useState('');
  const [taskAction, setTaskAction] = useState<'completed' | 'cancelled'>('completed');
  const [showTaskReasonModal, setShowTaskReasonModal] = useState(false);
  const [selectedTaskForReason, setSelectedTaskForReason] = useState<Task | null>(null);
  // Add new state variables for detailed task view
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false); const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all'
  }); const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: '',
    estimatedHours: '',
    category: 'other' as 'development' | 'design' | 'testing' | 'documentation' | 'meeting' | 'research' | 'other'
  });
  const [tasksLoading, setTasksLoading] = useState(false);
  // const [currentPage, setCurrentPage] = useState(1);
  // const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'hr' | 'employee',
    department: 'General'
  });
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: filters.search,
        role: filters.role,
        status: filters.status
      });

      const response = await fetch(`${SERVER_URL}/api/employees?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data: EmployeeResponse = await response.json();
        setEmployees(data.employees);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${SERVER_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setShowAddModal(false);
        resetForm();
        fetchEmployees();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('Failed to add employee');
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/employees/${editingEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          status: editingEmployee.status
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setEditingEmployee(null);
        resetForm();
        fetchEmployees();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/employees/${employeeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchEmployees();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    try {
      const newStatus = employee.status === 'active' ? 'inactive' : 'active';

      const response = await fetch(`${SERVER_URL}/api/employees/${employee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        fetchEmployees();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      department: 'General'
    });
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '',
      role: employee.role,
      department: employee.department
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
    resetForm();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value })); setCurrentPage(1);
  };

  // New admin functions for task management
  const fetchEmployeeTasks = async (employeeId: string) => {
    setTasksLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/tasks?assignedTo=${employeeId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEmployeeTasks(data.tasks);
      } else {
        toast.error('Failed to fetch employee tasks');
      }
    } catch (error) {
      console.error('Error fetching employee tasks:', error);
      toast.error('Failed to fetch employee tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchEmployeeAttendance = async (employeeId: string) => {
    setAttendanceLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/admin/employee-attendance/${employeeId}?limit=30`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEmployeeAttendance(data.data || []);
      } else {
        toast.error('Failed to fetch employee attendance');
      }
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      toast.error('Failed to fetch employee attendance');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const openTaskModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowTaskModal(true);
    fetchEmployeeTasks(employee._id);
  }; const handleViewDetails = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);

    // Fetch complete employee details from backend
    try {
      const response = await fetch(`${SERVER_URL}/api/employees/${employee._id}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.employee) {
          // Update the selected employee with complete data from backend
          setSelectedEmployee(data.employee);
          setEmployeeDetails(data);
        }
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    }

    // Only fetch stats if needed for stats modal
    // fetchEmployeeStats(employee._id);
    fetchEmployeeTasks(employee._id);
  };

  const handleAssignTask = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...newTask,
          assignedTo: selectedEmployee._id,
          estimatedHours: newTask.estimatedHours ? parseInt(newTask.estimatedHours) : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Task assigned successfully'); setNewTask({
          title: '',
          description: '',
          priority: 'medium',
          dueDate: '',
          estimatedHours: '',
          category: 'other'
        });
        fetchEmployeeTasks(selectedEmployee._id);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error('Failed to assign task');
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
        toast.success('Task status updated');
        if (selectedEmployee) {
          fetchEmployeeTasks(selectedEmployee._id);
        }
        setShowTaskCompletionModal(false);
        setSelectedTaskForCompletion(null);
        setTaskCompletionReason('');
      } else {
        const data = await response.json();
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleTaskCompletion = (task: Task, action: 'completed' | 'cancelled') => {
    setSelectedTaskForCompletion(task);
    setTaskAction(action);
    setShowTaskCompletionModal(true);
  };
  const handleCompleteTaskWithReason = () => {
    if (selectedTaskForCompletion) {
      updateTaskStatus(selectedTaskForCompletion._id, taskAction, taskCompletionReason);
    }
  };

  const handleViewTaskReason = (task: Task) => {
    setSelectedTaskForReason(task);
    setShowTaskReasonModal(true);
  };
  // New functions for task details and description handling
  const handleViewTaskDetails = (task: Task) => {
    setSelectedTaskForDetail(task);
    setShowTaskDetailModal(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'hr':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
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
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'neutral':
        return 'bg-gray-100 text-gray-800';
      case 'tired':
        return 'bg-yellow-100 text-yellow-800';
      case 'stressed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthStatusColor = (temperature?: number, symptoms?: string[]) => {
    if (temperature && temperature > 99.5) return 'bg-red-100 text-red-800';
    if (symptoms && symptoms.length > 0) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getConnectivityColor = (connectionType?: string, signalStrength?: number) => {
    if (!connectionType) return 'bg-gray-100 text-gray-800';
    if (signalStrength && signalStrength < 2) return 'bg-red-100 text-red-800';
    if (signalStrength && signalStrength < 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage your organization's employees</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 
                   flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="employee">Employee</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => {
              setFilters({ search: '', role: 'all', status: 'all' });
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 
                     transition-colors text-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Employees ({employees.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading employees...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No employees found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getRoleColor(employee.role)}`}>
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Building className="h-4 w-4 mr-1 text-gray-400" />
                          {employee.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(employee)}
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(employee.status)} hover:opacity-80 transition-opacity`}
                        >
                          {employee.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {format(new Date(employee.joinedDate), 'MMM dd, yyyy')}
                        </div>
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">                        <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(employee)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="View detailed information"
                        >
                          <Eye className="h-4 w-4" />
                        </button>                        <button
                          onClick={() => openEditModal(employee)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit employee"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openTaskModal(employee)}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="Manage tasks"
                        >
                          <ClipboardList className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowAttendanceModal(true);
                            fetchEmployeeAttendance(employee._id);
                          }}
                          className="text-orange-600 hover:text-orange-900 transition-colors"
                          title="View detailed attendance with health & device info"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowHealthModal(true);
                            fetchEmployeeAttendance(employee._id);
                          }}
                          className="text-pink-600 hover:text-pink-900 transition-colors"
                          title="View health tracking"
                        >
                          <Thermometer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowDeviceModal(true);
                            fetchEmployeeAttendance(employee._id);
                          }}
                          className="text-cyan-600 hover:text-cyan-900 transition-colors"
                          title="View device & connectivity info"
                        >
                          <Monitor className="h-4 w-4" />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteEmployee(employee._id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium 
                             text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium 
                             text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Employee Modal */}
      {(showAddModal || editingEmployee) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h3>

            <form onSubmit={editingEmployee ? handleEditEmployee : handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'hr' | 'employee' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="employee">Employee</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 
                           transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           transition-colors flex items-center space-x-2"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>{editingEmployee ? 'Update' : 'Add'} Employee</span>
                </button>
              </div>
            </form>
          </div>        </div>
      )}

      {/* Employee Detail Modal */}
      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Employee Details - {selectedEmployee.name}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Basic Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xl font-bold">
                            {selectedEmployee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <h5 className="text-lg font-medium text-gray-900">{selectedEmployee.name}</h5>
                          <p className="text-sm text-gray-500">ID: {selectedEmployee._id}</p>
                        </div>
                      </div>                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </label>
                          <p className="text-sm text-gray-900 mt-1">{selectedEmployee.email}</p>
                        </div>
                        {selectedEmployee.phoneNumber && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              Phone
                            </label>
                            <p className="text-sm text-gray-900 mt-1">{selectedEmployee.phoneNumber}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            Role
                          </label>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize mt-1 ${getRoleColor(selectedEmployee.role)}`}>
                            {selectedEmployee.role}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            Department
                          </label>
                          <p className="text-sm text-gray-900 mt-1">{selectedEmployee.department}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Status</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize mt-1 ${selectedEmployee.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {selectedEmployee.status}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Joined Date
                          </label>
                          <p className="text-sm text-gray-900 mt-1">{format(new Date(selectedEmployee.joinedDate), 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Employee Since</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {Math.floor((new Date().getTime() - new Date(selectedEmployee.joinedDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                          </p>
                        </div>
                        {selectedEmployee.lastLogin && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Last Login
                            </label>
                            <p className="text-sm text-gray-900 mt-1">{format(new Date(selectedEmployee.lastLogin), 'MMM dd, yyyy HH:mm')}</p>
                          </div>
                        )}
                        {selectedEmployee.workSchedule && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Work Schedule</label>
                            <p className="text-sm text-gray-900 mt-1">
                              {selectedEmployee.workSchedule.startTime} - {selectedEmployee.workSchedule.endTime}
                            </p>
                            <p className="text-xs text-gray-600">
                              {selectedEmployee.workSchedule.workDays?.join(', ') || 'Mon-Fri'}
                            </p>
                          </div>
                        )}
                        {selectedEmployee.emergencyContact && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                              <Heart className="h-3 w-3 mr-1" />
                              Emergency Contact
                            </label>
                            <div className="mt-1 p-2 bg-red-50 rounded-lg">
                              <p className="text-sm text-gray-900">{selectedEmployee.emergencyContact.name}</p>
                              <p className="text-xs text-gray-600">{selectedEmployee.emergencyContact.phone}</p>
                              <p className="text-xs text-gray-600">{selectedEmployee.emergencyContact.relationship}</p>
                            </div>
                          </div>
                        )}
                        {selectedEmployee.profile?.skills && selectedEmployee.profile.skills.length > 0 && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">Skills</label>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {selectedEmployee.profile.skills.map((skill, index) => (
                                <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>                  {/* Employee Details Overview */}
                  <div className="bg-white border rounded-xl p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Employee Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Full Name</label>
                          <p className="text-gray-900 font-medium">{selectedEmployee.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Email</label>
                          <p className="text-gray-900">{selectedEmployee.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Department</label>
                          <p className="text-gray-900">{selectedEmployee.department || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Role</label>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedEmployee.role)}`}>
                            {selectedEmployee.role}
                          </span>
                        </div>
                      </div>

                      {/* Additional Information */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Status</label>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${selectedEmployee.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {selectedEmployee.status}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Join Date</label>
                          <p className="text-gray-900">
                            {selectedEmployee.joinedDate ? format(new Date(selectedEmployee.joinedDate), 'MMM dd, yyyy') : 'Not available'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Last Login</label>
                          <p className="text-gray-900">
                            {selectedEmployee.lastLogin ? format(new Date(selectedEmployee.lastLogin), 'MMM dd, yyyy HH:mm') : 'Never'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Phone</label>
                          <p className="text-gray-900">{selectedEmployee.phoneNumber || selectedEmployee.profile?.phone || 'Not provided'}</p>                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact & Emergency Information */}
                {(selectedEmployee.emergencyContact || selectedEmployee.profileImage) && (
                  <div className="bg-white border rounded-xl p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Phone className="h-5 w-5 mr-2" />
                      Contact Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedEmployee.emergencyContact && (
                        <div className="space-y-3">
                          <h5 className="text-sm font-medium text-gray-700">Emergency Contact</h5>
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-gray-600">Name</label>
                              <p className="text-gray-900">{selectedEmployee.emergencyContact.name}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Phone</label>
                              <p className="text-gray-900">{selectedEmployee.emergencyContact.phone}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Relationship</label>
                              <p className="text-gray-900">{selectedEmployee.emergencyContact.relationship}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedEmployee.profile?.address && (
                        <div className="space-y-3">
                          <h5 className="text-sm font-medium text-gray-700">Address</h5>
                          <p className="text-gray-900">{selectedEmployee.profile.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Work Schedule & Professional Info */}
                <div className="bg-white border rounded-xl p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Work Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Work Schedule */}
                    {selectedEmployee.workSchedule && (
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-700">Work Schedule</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600">Start Time:</span>
                            <span className="text-gray-900">{selectedEmployee.workSchedule.startTime || '09:00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600">End Time:</span>
                            <span className="text-gray-900">{selectedEmployee.workSchedule.endTime || '17:00'}</span>
                          </div>
                          {selectedEmployee.workSchedule.workDays && selectedEmployee.workSchedule.workDays.length > 0 && (
                            <div>
                              <label className="text-xs text-gray-600">Work Days:</label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedEmployee.workSchedule.workDays.map((day, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    {day.substring(0, 3)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Professional Info */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700">Professional Details</h5>
                      <div className="space-y-2">
                        {selectedEmployee.profile?.experience && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600">Experience:</span>
                            <span className="text-gray-900">{selectedEmployee.profile.experience} years</span>
                          </div>
                        )}
                        {selectedEmployee.salary && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600">Salary:</span>
                            <span className="text-gray-900">
                              {selectedEmployee.salary.currency} {selectedEmployee.salary.amount?.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedEmployee.profile?.skills && selectedEmployee.profile.skills.length > 0 && (
                          <div>
                            <label className="text-xs text-gray-600">Skills:</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedEmployee.profile.skills.map((skill, index) => (
                                <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Attendance (if available from API) */}
                <div className="bg-white border rounded-xl p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Recent Attendance
                  </h4>
                  <div className="space-y-3">                    {employeeDetails?.recentAttendance && employeeDetails.recentAttendance.length > 0 ? (
                    employeeDetails.recentAttendance.map((record: AttendanceRecord, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${record.status === 'present' ? 'bg-green-500' :
                            record.status === 'late' ? 'bg-orange-500' : 'bg-red-500'
                            }`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {record.date}
                            </p>
                            <p className="text-xs text-gray-600 capitalize">{record.status}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {record.checkIn && (
                            <p className="text-xs text-gray-600">
                              In: {format(new Date(record.checkIn), 'HH:mm')}
                            </p>
                          )}
                          {record.checkOut && (
                            <p className="text-xs text-gray-600">
                              Out: {format(new Date(record.checkOut), 'HH:mm')}
                            </p>
                          )}                              {record.workingHours && (
                            <p className="text-xs text-blue-600">
                              {record.workingHours}h worked
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No recent attendance records</p>
                    </div>
                  )}
                  </div>
                </div>
              </div>              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openTaskModal(selectedEmployee);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Manage Tasks</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>)}

      {/* Employee Tasks Modal */}
      {showTaskModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Task Management for {selectedEmployee.name}
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assign New Task */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign New Task
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter task title..."
                    />
                  </div>                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={6}
                      maxLength={10000}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                      placeholder="Enter detailed task description... You can include requirements, acceptance criteria, resources, deadlines, and any other relevant information."
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500">
                        Be as detailed as possible. Include requirements, steps, resources, and expectations.
                      </p>
                      <p className="text-xs text-gray-500">
                        {newTask.description.length}/10,000 characters
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newTask.category}
                        onChange={(e) => setNewTask({ ...newTask, category: e.target.value as 'development' | 'design' | 'testing' | 'documentation' | 'meeting' | 'research' | 'other' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="development">Development</option>
                        <option value="design">Design</option>
                        <option value="testing">Testing</option>
                        <option value="documentation">Documentation</option>
                        <option value="meeting">Meeting</option>
                        <option value="research">Research</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        value={newTask.estimatedHours}
                        onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Hours"
                        min="0.5"
                        step="0.5"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAssignTask}
                    disabled={!newTask.title || !newTask.description || !newTask.dueDate}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 
                             disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors
                             flex items-center justify-center space-x-2"
                  >
                    <Target className="h-4 w-4" />
                    <span>Assign Task</span>
                  </button>
                </div>
              </div>

              {/* Current Tasks */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Current Tasks ({employeeTasks.length})
                </h4>

                {tasksLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  </div>
                ) : employeeTasks.length === 0 ? (
                  <div className="text-center py-10">
                    <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No tasks assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {employeeTasks.map((task) => (
                      <div key={task._id} className="bg-white p-4 rounded-lg border shadow-sm">
                        <div className="flex items-start justify-between">                          <div className="flex-1">                            <div className="flex items-start justify-between mb-1">
                          <h5 className="text-sm font-medium text-gray-900 flex-1 mr-2">
                            {task.title}
                          </h5>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleViewTaskDetails(task)}
                              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center space-x-1"
                              title="View complete task details and full description"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Full Details</span>
                            </button>
                          </div>                        </div>
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="flex items-center text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(task.dueDate), 'MMM dd')}
                            </span>
                            <span className={`px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className={`px-2 py-1 rounded-full font-medium ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          {task.estimatedHours && (
                            <div className="mt-1 text-xs text-gray-500">
                              Est: {task.estimatedHours}h
                            </div>
                          )}
                        </div><div className="flex flex-col space-y-1 ml-2">
                            {task.status === 'pending' && (
                              <button
                                onClick={() => updateTaskStatus(task._id, 'in-progress')}
                                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                              >
                                Start
                              </button>
                            )}
                            {task.status === 'in-progress' && (
                              <button
                                onClick={() => handleTaskCompletion(task, 'completed')}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                              >
                                Complete
                              </button>
                            )}
                            {task.status === 'completed' && (
                              <button
                                onClick={() => updateTaskStatus(task._id, 'pending')}
                                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                              >
                                Reopen
                              </button>
                            )}                            {task.status !== 'completed' && task.status !== 'cancelled' && (
                              <button
                                onClick={() => handleTaskCompletion(task, 'cancelled')}
                                className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
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
                            <button
                              onClick={() => handleViewTaskDetails(task)}
                              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                              title="View task details"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>          </div>
        </div>
      )}

      {/* Task Completion Modal */}
      {showTaskCompletionModal && selectedTaskForCompletion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {taskAction === 'completed' ? 'Complete' : 'Cancel'} Task: {selectedTaskForCompletion.title}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {taskAction === 'completed' ? 'Completion' : 'Cancellation'} Reason
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={taskCompletionReason}
                onChange={(e) => setTaskCompletionReason(e.target.value)}
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
                {taskCompletionReason.length}/1000 characters (Required)
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowTaskCompletionModal(false);
                  setSelectedTaskForCompletion(null);
                  setTaskCompletionReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>              <button
                onClick={handleCompleteTaskWithReason}
                disabled={!taskCompletionReason.trim()}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${taskAction === 'completed'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {taskAction === 'completed' ? 'Complete' : 'Cancel'} Task
              </button>            </div>          </div>
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
                  {selectedTaskForReason.completedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Date:</span>
                      <span className="text-gray-900">
                        {format(new Date(selectedTaskForReason.completedAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  )}
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

      {/* Employee Attendance Modal */}
      {showAttendanceModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Attendance Records - {selectedEmployee.name}
                </h3>
                <button
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setSelectedEmployee(null);
                    setEmployeeAttendance([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {attendanceLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Health
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mood
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Productivity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weather
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employeeAttendance.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{format(new Date(record.date), 'MMM dd, yyyy')}</div>
                            <div className="text-xs text-gray-500">{format(new Date(record.date), 'EEEE')}</div>
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
                          {record.isApproved === false && (
                            <div className="text-xs text-orange-600 mt-1">Pending Approval</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            <div className="flex items-center text-green-600">
                              <span className="text-xs mr-1">In:</span>
                              {format(new Date(record.checkIn), 'HH:mm:ss')}
                            </div>
                            {record.checkOut && (
                              <div className="flex items-center text-red-600">
                                <span className="text-xs mr-1">Out:</span>
                                {format(new Date(record.checkOut), 'HH:mm:ss')}
                              </div>
                            )}
                            {record.breaks && record.breaks.length > 0 && (
                              <div className="text-xs text-blue-600">
                                {record.breaks.length} break{record.breaks.length > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            <div>Work: {(record.workingHours / 60).toFixed(1)}h</div>
                            {record.breakHours && record.breakHours > 0 && (
                              <div className="text-xs text-orange-600">Break: {(record.breakHours / 60).toFixed(1)}h</div>
                            )}
                            {record.overtimeHours && record.overtimeHours > 0 && (
                              <div className="text-xs text-purple-600">OT: {(record.overtimeHours / 60).toFixed(1)}h</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            <div className={`text-xs px-2 py-1 rounded-full ${record.isRemote ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                              {record.isRemote ? 'Remote' : 'Office'}
                            </div>
                            {record.checkInLocation && (
                              <div className="text-xs text-gray-500">
                                GPS: ±{record.gpsAccuracy}m
                              </div>
                            )}
                            {record.rfidCardId && (
                              <div className="text-xs text-indigo-600">
                                Card: {record.rfidCardId.slice(-4)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            {record.temperature && (
                              <div className={`text-xs px-2 py-1 rounded-full ${getHealthStatusColor(record.temperature, record.symptoms)}`}>
                                {record.temperature}°F
                              </div>
                            )}
                            {record.symptoms && record.symptoms.length > 0 && (
                              <div className="text-xs text-red-600">
                                {record.symptoms.join(', ')}
                              </div>
                            )}
                            {record.faceRecognitionScore && (
                              <div className="text-xs text-green-600">
                                Face: {record.faceRecognitionScore}%
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.mood && (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getMoodColor(record.mood)}`}>
                              {record.mood}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            {record.device && (
                              <div className="text-xs">
                                <div className="font-medium">{record.device.platform}</div>
                                <div className="text-gray-500">IP: {record.device.ip}</div>
                              </div>
                            )}
                            {record.batteryLevel && (
                              <div className={`text-xs ${record.batteryLevel < 20 ? 'text-red-600' : record.batteryLevel < 50 ? 'text-orange-600' : 'text-green-600'}`}>
                                Battery: {record.batteryLevel}%
                              </div>
                            )}
                            {record.networkInfo && (
                              <div className={`text-xs px-1 py-0.5 rounded ${getConnectivityColor(record.networkInfo.connectionType, record.networkInfo.signalStrength)}`}>
                                {record.networkInfo.connectionType}
                                {record.networkInfo.signalStrength && ` (${record.networkInfo.signalStrength}/5)`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.productivity && (
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <div className="w-8 h-2 bg-gray-200 rounded-full mr-2">
                                  <div
                                    className="h-2 bg-blue-600 rounded-full"
                                    style={{ width: `${record.productivity.score * 10}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs">{record.productivity.score}/10</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Tasks: {record.productivity.tasksCompleted}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.weather && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium">{record.weather.condition}</div>
                              <div className="text-xs text-gray-500">
                                {record.weather.temperature}°F
                              </div>
                              <div className="text-xs text-gray-500">
                                {record.weather.humidity}% humidity
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => {
                                setSelectedAttendanceRecord(record);
                                setShowLocationModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="View location details"
                            >
                              <MapPin className="h-3 w-3" />
                            </button>
                            {record.corrections && record.corrections.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedAttendanceRecord(record);
                                  setShowCorrectionsModal(true);
                                }}
                                className="text-orange-600 hover:text-orange-900 transition-colors"
                                title="View corrections"
                              >
                                <AlertCircle className="h-3 w-3" />
                              </button>
                            )}
                            {record.notes && (
                              <button
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                                title={record.notes}
                              >
                                <FileText className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  {employeeAttendance.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No attendance records found for this employee</p>
                    </div>
                  )}
                </div>
              )}            </div>
          </div>
        </div>
      )}

      {/* Health Tracking Modal */}
      {showHealthModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Thermometer className="h-5 w-5 mr-2" />
                  Health Tracking - {selectedEmployee.name}
                </h3>
                <button
                  onClick={() => setShowHealthModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {attendanceLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Health Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">Average Temperature</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {employeeAttendance.filter(r => r.temperature).length > 0
                              ? (employeeAttendance.filter(r => r.temperature).reduce((sum, r) => sum + (r.temperature || 0), 0)
                                / employeeAttendance.filter(r => r.temperature).length).toFixed(1)
                              : 'N/A'}°F
                          </p>
                        </div>
                        <Thermometer className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-900">High Temp Days</p>
                          <p className="text-2xl font-bold text-red-600">
                            {employeeAttendance.filter(r => r.temperature && r.temperature > 99.5).length}
                          </p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-900">Symptom Reports</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {employeeAttendance.filter(r => r.symptoms && r.symptoms.length > 0).length}
                          </p>
                        </div>
                        <Heart className="h-8 w-8 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  {/* Detailed Health Records */}
                  <div className="bg-white border rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temperature</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symptoms</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Face Score</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {employeeAttendance.filter(r => r.temperature || (r.symptoms && r.symptoms.length > 0) || r.faceRecognitionScore).map((record) => (
                          <tr key={record._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.temperature ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.temperature > 99.5 ? 'bg-red-100 text-red-800' :
                                  record.temperature > 98.6 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                  {record.temperature}°F
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.symptoms && record.symptoms.length > 0 ? (
                                <div className="space-y-1">
                                  {record.symptoms.map((symptom, idx) => (
                                    <span key={idx} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-1">
                                      {symptom}
                                    </span>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.faceRecognitionScore ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.faceRecognitionScore > 90 ? 'bg-green-100 text-green-800' :
                                  record.faceRecognitionScore > 70 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                  {record.faceRecognitionScore}%
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(record.temperature, record.symptoms)}`}>
                                {record.temperature && record.temperature > 99.5 ? 'At Risk' :
                                  record.symptoms && record.symptoms.length > 0 ? 'Monitor' : 'Healthy'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {employeeAttendance.filter(r => r.temperature || (r.symptoms && r.symptoms.length > 0) || r.faceRecognitionScore).length === 0 && (
                      <div className="text-center py-12">
                        <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No health data available</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Device & Connectivity Modal */}
      {showDeviceModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Monitor className="h-5 w-5 mr-2" />
                  Device & Connectivity - {selectedEmployee.name}
                </h3>
                <button
                  onClick={() => setShowDeviceModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {attendanceLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Device Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">Unique Devices</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {new Set(employeeAttendance.filter(r => r.device).map(r => r.device?.platform)).size}
                          </p>
                        </div>
                        <MonitorSpeaker className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-900">Avg Battery</p>
                          <p className="text-2xl font-bold text-green-600">
                            {employeeAttendance.filter(r => r.batteryLevel).length > 0
                              ? Math.round(employeeAttendance.filter(r => r.batteryLevel).reduce((sum, r) => sum + (r.batteryLevel || 0), 0)
                                / employeeAttendance.filter(r => r.batteryLevel).length)
                              : 'N/A'}%
                          </p>
                        </div>
                        <Battery className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-900">Network Types</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {new Set(employeeAttendance.filter(r => r.networkInfo).map(r => r.networkInfo?.connectionType)).size}
                          </p>
                        </div>
                        <Wifi className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-900">RFID Uses</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {employeeAttendance.filter(r => r.rfidCardId).length}
                          </p>
                        </div>
                        <CreditCard className="h-8 w-8 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  {/* Detailed Device Records */}
                  <div className="bg-white border rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Network</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Battery</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GPS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {employeeAttendance.filter(r => r.device || r.networkInfo || r.batteryLevel || r.rfidCardId).map((record) => (
                          <tr key={record._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.device ? (
                                <div>
                                  <div className="font-medium">{record.device.platform}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-xs" title={record.device.userAgent}>
                                    {record.device.userAgent.substring(0, 40)}...
                                  </div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.device?.ip || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.networkInfo ? (
                                <div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConnectivityColor(record.networkInfo.connectionType, record.networkInfo.signalStrength)}`}>
                                    {record.networkInfo.connectionType}
                                  </span>
                                  {record.networkInfo.signalStrength && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Signal: {record.networkInfo.signalStrength}/5
                                    </div>
                                  )}
                                  {record.networkInfo.networkName && (
                                    <div className="text-xs text-gray-500">
                                      {record.networkInfo.networkName}
                                    </div>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.batteryLevel ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.batteryLevel < 20 ? 'bg-red-100 text-red-800' :
                                  record.batteryLevel < 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                  {record.batteryLevel}%
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.rfidCardId ? (
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                                  ****{record.rfidCardId.slice(-4)}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.gpsAccuracy ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.gpsAccuracy < 10 ? 'bg-green-100 text-green-800' :
                                  record.gpsAccuracy < 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                  ±{record.gpsAccuracy}m
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {employeeAttendance.filter(r => r.device || r.networkInfo || r.batteryLevel || r.rfidCardId).length === 0 && (
                      <div className="text-center py-12">
                        <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No device data available</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Location Details Modal */}
      {showLocationModal && selectedAttendanceRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Location Details - {format(new Date(selectedAttendanceRecord.date), 'MMM dd, yyyy')}
                </h3>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Check-in Location */}
                {selectedAttendanceRecord.checkInLocation && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Check-in Location
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-700 font-medium">Latitude:</span>
                        <span className="ml-2 text-green-900">{selectedAttendanceRecord.checkInLocation.latitude}</span>
                      </div>
                      <div>
                        <span className="text-green-700 font-medium">Longitude:</span>
                        <span className="ml-2 text-green-900">{selectedAttendanceRecord.checkInLocation.longitude}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-green-700 font-medium">Address:</span>
                        <span className="ml-2 text-green-900">{selectedAttendanceRecord.checkInLocation.address}</span>
                      </div>
                      <div>
                        <span className="text-green-700 font-medium">Accuracy:</span>
                        <span className="ml-2 text-green-900">±{selectedAttendanceRecord.checkInLocation.accuracy}m</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Check-out Location */}
                {selectedAttendanceRecord.checkOutLocation && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-3 flex items-center">
                      <XCircle className="h-4 w-4 mr-2" />
                      Check-out Location
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-red-700 font-medium">Latitude:</span>
                        <span className="ml-2 text-red-900">{selectedAttendanceRecord.checkOutLocation.latitude}</span>
                      </div>
                      <div>
                        <span className="text-red-700 font-medium">Longitude:</span>
                        <span className="ml-2 text-red-900">{selectedAttendanceRecord.checkOutLocation.longitude}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-red-700 font-medium">Address:</span>
                        <span className="ml-2 text-red-900">{selectedAttendanceRecord.checkOutLocation.address}</span>
                      </div>
                      <div>
                        <span className="text-red-700 font-medium">Accuracy:</span>
                        <span className="ml-2 text-red-900">±{selectedAttendanceRecord.checkOutLocation.accuracy}m</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Break Locations */}
                {selectedAttendanceRecord.breaks && selectedAttendanceRecord.breaks.some(b => b.location) && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                      <Coffee className="h-4 w-4 mr-2" />
                      Break Locations
                    </h4>
                    <div className="space-y-3">
                      {selectedAttendanceRecord.breaks.filter(b => b.location).map((breakItem, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border">
                          <div className="font-medium text-blue-900 capitalize mb-2">{breakItem.type} Break</div>
                          {breakItem.location && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-blue-700 font-medium">Lat:</span>
                                <span className="ml-2 text-blue-900">{breakItem.location.latitude}</span>
                              </div>
                              <div>
                                <span className="text-blue-700 font-medium">Lng:</span>
                                <span className="ml-2 text-blue-900">{breakItem.location.longitude}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-blue-700 font-medium">Address:</span>
                                <span className="ml-2 text-blue-900">{breakItem.location.address}</span>
                              </div>
                            </div>
                          )}
                          {breakItem.notes && (
                            <div className="mt-2 text-sm">
                              <span className="text-blue-700 font-medium">Notes:</span>
                              <span className="ml-2 text-blue-900">{breakItem.notes}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedAttendanceRecord.checkInLocation && !selectedAttendanceRecord.checkOutLocation &&
                  !(selectedAttendanceRecord.breaks && selectedAttendanceRecord.breaks.some(b => b.location)) && (
                    <div className="text-center py-8">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No location data available for this record</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Corrections Modal */}
      {showCorrectionsModal && selectedAttendanceRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Attendance Corrections - {format(new Date(selectedAttendanceRecord.date), 'MMM dd, yyyy')}
                </h3>
                <button
                  onClick={() => setShowCorrectionsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {selectedAttendanceRecord.corrections && selectedAttendanceRecord.corrections.length > 0 ? (
                <div className="space-y-4">
                  {selectedAttendanceRecord.corrections.map((correction, idx) => (
                    <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-orange-900">Correction #{idx + 1}</h4>
                          <p className="text-sm text-orange-700">{format(new Date(correction.correctedAt), 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          {correction.field}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center">
                            Old Value
                          </label>
                          <p className="text-sm text-gray-900 mt-1">{correction.oldValue}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center">
                            New Value
                          </label>
                          <p className="text-sm text-gray-900 mt-1">{correction.newValue}</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="text-sm font-medium text-gray-700">Reason:</label>
                        <p className="text-sm text-gray-900 mt-1">{correction.reason}</p>
                      </div>
                      <div className="text-xs text-orange-600">
                        Corrected by: {correction.correctedBy}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No corrections found for this record</p>
                </div>
              )}
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
                <div className="lg:col-span-2 space-y-6">                  {/* Description */}
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

                  {/* Tags */}
                  {selectedTaskForDetail.tags && selectedTaskForDetail.tags.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTaskForDetail.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedTaskForDetail.attachments && selectedTaskForDetail.attachments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Attachments</h3>
                      <div className="space-y-2">
                        {selectedTaskForDetail.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg border">
                            <FileText className="h-4 w-4 text-gray-400 mr-3" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {attachment.fileType} • {format(new Date(attachment.uploadedAt), 'MMM dd, yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {selectedTaskForDetail.comments && selectedTaskForDetail.comments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Comments</h3>
                      <div className="space-y-3">
                        {selectedTaskForDetail.comments.map((comment, index) => (
                          <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">                              <span className="text-sm font-medium text-gray-900">
                              {typeof comment.user === 'string' ? comment.user : 'Unknown User'}
                            </span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(comment.timestamp), 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                      {selectedTaskForDetail.actualHours && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Actual Hours:</span>
                          <span className="text-gray-900">{selectedTaskForDetail.actualHours}h</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time Tracking */}
                  {selectedTaskForDetail.timeTracking && selectedTaskForDetail.timeTracking.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Time Tracking</h3>
                      <div className="space-y-3">
                        {selectedTaskForDetail.timeTracking.map((entry, index) => (
                          <div key={index} className="text-sm">
                            <div className="flex justify-between items-start">
                              <span className="text-gray-600">{entry.date}</span>
                              <span className="text-gray-900 font-medium">{entry.duration}min</span>
                            </div>
                            {entry.description && (
                              <p className="text-gray-700 text-xs mt-1">{entry.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completion Info */}
                  {(selectedTaskForDetail.status === 'completed' || selectedTaskForDetail.status === 'cancelled') && selectedTaskForDetail.completionReason && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        {selectedTaskForDetail.status === 'completed' ? 'Completion' : 'Cancellation'} Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        {selectedTaskForDetail.completedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Date:</span>
                            <span className="text-gray-900">
                              {format(new Date(selectedTaskForDetail.completedAt), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                        )}
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

export default Employees;