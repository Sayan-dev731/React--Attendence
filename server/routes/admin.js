import express from 'express';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';
import { authenticate, authorize } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard overview
// @access  Private (Admin, HR)
router.get('/dashboard', authenticate, authorize('admin', 'hr'), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);        // Basic counts
        const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' } });
        const activeEmployees = await User.countDocuments({
            role: { $ne: 'admin' },
            status: 'active'
        });
        const totalTasks = await Task.countDocuments({ assignedTo: req.user.id });
        const overdueTasks = await Task.countDocuments({ status: 'overdue', assignedTo: req.user.id });

        // Today's attendance
        const todayAttendance = await Attendance.countDocuments({
            date: {
                $gte: today,
                $lt: tomorrow
            }
        });

        // Current check-ins (people currently at work)
        const currentCheckins = await Attendance.countDocuments({
            date: {
                $gte: today,
                $lt: tomorrow
            },
            checkOut: { $exists: false }
        });        // Task statistics
        const taskStats = await Task.aggregate([
            {
                $match: { assignedTo: new mongoose.Types.ObjectId(req.user.id) }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Department-wise employee count
        const departmentStats = await User.aggregate([
            {
                $match: { role: { $ne: 'admin' } }
            },
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 },
                    activeCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Recent activities (last 7 days attendance summary)
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const weeklyAttendance = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: lastWeek }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$date' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);        // Attendance statistics for today
        const attendanceStats = await Attendance.aggregate([
            {
                $match: {
                    date: {
                        $gte: today,
                        $lt: tomorrow
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    present: { $sum: 1 },
                    late: {
                        $sum: {
                            $cond: [
                                { $gt: [{ $hour: '$checkIn' }, 9] },
                                1,
                                0
                            ]
                        }
                    },
                    onTime: {
                        $sum: {
                            $cond: [
                                { $lte: [{ $hour: '$checkIn' }, 9] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Productivity metrics
        const productivityMetrics = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: lastWeek },
                    productivity: { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    avgProductivity: { $avg: '$productivity' },
                    avgWorkHours: {
                        $avg: {
                            $cond: [
                                { $and: ['$checkIn', '$checkOut'] },
                                { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 1000 * 60 * 60] },
                                0
                            ]
                        }
                    },
                    totalWorkHours: {
                        $sum: {
                            $cond: [
                                { $and: ['$checkIn', '$checkOut'] },
                                { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 1000 * 60 * 60] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const attendanceData = attendanceStats[0] || { present: 0, late: 0, onTime: 0 };
        const productivityData = productivityMetrics[0] || { avgProductivity: 0, avgWorkHours: 0, totalWorkHours: 0 };

        // Format task stats properly
        const formattedTaskStats = {
            pending: 0,
            'in-progress': 0,
            completed: 0,
            overdue: 0
        };

        taskStats.forEach(stat => {
            formattedTaskStats[stat._id] = stat.count;
        });

        res.json({
            success: true,
            data: {
                totalEmployees,
                activeEmployees,
                totalTasks,
                overdueTasks,
                todayAttendance,
                currentCheckins,
                taskStats: formattedTaskStats,
                attendanceStats: {
                    present: attendanceData.present,
                    absent: totalEmployees - attendanceData.present,
                    late: attendanceData.late,
                    onTime: attendanceData.onTime
                },
                productivityMetrics: {
                    avgProductivity: Math.round(productivityData.avgProductivity || 0),
                    avgWorkHours: Math.round((productivityData.avgWorkHours || 0) * 10) / 10,
                    totalWorkHours: Math.round((productivityData.totalWorkHours || 0) * 10) / 10
                },
                departmentStats,
                weeklyAttendance
            }
        });
    } catch (error) {
        console.error('Get admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/admin/employees/:id/stats
// @desc    Get detailed employee statistics
// @access  Private (Admin, HR)
router.get('/employees/:id/stats', authenticate, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID format'
            });
        }

        // Validate employee exists
        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Date range setup
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);        // Attendance statistics
        const attendanceStats = await Attendance.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(id),
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: null,
                    totalDays: { $sum: 1 },
                    totalHours: {
                        $sum: {
                            $cond: [
                                { $and: ['$checkIn', '$checkOut'] },
                                { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 1000 * 60 * 60] },
                                0
                            ]
                        }
                    },
                    avgProductivity: { $avg: '$productivity' },
                    lateArrivals: {
                        $sum: {
                            $cond: [
                                { $gt: [{ $hour: '$checkIn' }, 9] }, // Assuming 9 AM is start time
                                1,
                                0
                            ]
                        }
                    },
                    earlyDepartures: {
                        $sum: {
                            $cond: [
                                { $and: ['$checkOut', { $lt: [{ $hour: '$checkOut' }, 17] }] }, // Assuming 5 PM is end time
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);        // Task statistics
        const taskStats = await Task.aggregate([
            {
                $match: {
                    assignedTo: new mongoose.Types.ObjectId(id),
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    completedTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    overdueTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
                    },
                    totalHoursWorked: { $sum: '$actualHours' },
                    avgProgress: { $avg: '$progress' }
                }
            }
        ]);        // Recent attendance records with breaks
        const recentAttendance = await Attendance.find({
            userId: id,
            date: { $gte: start, $lte: end }
        })
            .sort({ date: -1 })
            .limit(10)
            .select('date checkIn checkOut totalHours productivity mood breaks status');

        // Recent tasks
        const recentTasks = await Task.find({
            assignedTo: id,
            createdAt: { $gte: start, $lte: end }
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('title status priority dueDate progress actualHours')
            .populate('assignedBy', 'name');        // Performance trends (weekly)
        const weeklyTrends = await Attendance.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(id),
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        week: { $week: '$date' },
                        year: { $year: '$date' }
                    },
                    avgProductivity: { $avg: '$productivity' },
                    totalHours: {
                        $sum: {
                            $cond: [
                                { $and: ['$checkIn', '$checkOut'] },
                                { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 1000 * 60 * 60] },
                                0
                            ]
                        }
                    },
                    daysWorked: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.week': 1 }
            }
        ]);

        res.json({
            success: true,
            data: {
                employee: {
                    id: employee._id,
                    name: employee.name,
                    email: employee.email,
                    role: employee.role,
                    department: employee.department,
                    joinDate: employee.createdAt
                },
                dateRange: { start, end },
                attendance: attendanceStats[0] || {
                    totalDays: 0,
                    totalHours: 0,
                    avgProductivity: 0,
                    lateArrivals: 0,
                    earlyDepartures: 0
                },
                tasks: taskStats[0] || {
                    totalTasks: 0,
                    completedTasks: 0,
                    overdueTasks: 0,
                    totalHoursWorked: 0,
                    avgProgress: 0
                },
                recentAttendance,
                recentTasks,
                weeklyTrends
            }
        });
    } catch (error) {
        console.error('Get employee stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/admin/reports/attendance
// @desc    Get attendance reports
// @access  Private (Admin, HR)
router.get('/reports/attendance', authenticate, authorize('admin', 'hr'), async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            department,
            reportType = 'summary'
        } = req.query;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        let userMatch = {};
        if (department && department !== 'all') {
            userMatch.department = department;
        }

        if (reportType === 'detailed') {
            // Detailed report with individual records
            const detailedReport = await Attendance.aggregate([
                {
                    $match: {
                        date: { $gte: start, $lte: end }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'userInfo'
                    }
                },
                {
                    $unwind: '$userInfo'
                },
                {
                    $match: {
                        'userInfo.role': { $ne: 'admin' },
                        ...Object.keys(userMatch).reduce((acc, key) => {
                            acc[`userInfo.${key}`] = userMatch[key];
                            return acc;
                        }, {})
                    }
                },
                {
                    $project: {
                        date: 1,
                        checkIn: 1,
                        checkOut: 1,
                        totalHours: 1,
                        productivity: 1,
                        mood: 1,
                        location: 1,
                        user: {
                            name: '$userInfo.name',
                            email: '$userInfo.email',
                            department: '$userInfo.department'
                        }
                    }
                },
                {
                    $sort: { date: -1, 'user.name': 1 }
                }
            ]);

            res.json({
                success: true,
                reportType: 'detailed',
                data: detailedReport,
                summary: {
                    totalRecords: detailedReport.length,
                    dateRange: { start, end }
                }
            });
        } else {
            // Summary report
            const summaryReport = await Attendance.aggregate([
                {
                    $match: {
                        date: { $gte: start, $lte: end }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'userInfo'
                    }
                },
                {
                    $unwind: '$userInfo'
                },
                {
                    $match: {
                        'userInfo.role': { $ne: 'admin' },
                        ...Object.keys(userMatch).reduce((acc, key) => {
                            acc[`userInfo.${key}`] = userMatch[key];
                            return acc;
                        }, {})
                    }
                },
                {
                    $group: {
                        _id: '$user',
                        userName: { $first: '$userInfo.name' },
                        userEmail: { $first: '$userInfo.email' },
                        department: { $first: '$userInfo.department' },
                        totalDays: { $sum: 1 },
                        totalHours: {
                            $sum: {
                                $cond: [
                                    { $and: ['$checkIn', '$checkOut'] },
                                    { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 1000 * 60 * 60] },
                                    0
                                ]
                            }
                        },
                        avgProductivity: { $avg: '$productivity' },
                        lateArrivals: {
                            $sum: {
                                $cond: [
                                    { $gt: [{ $hour: '$checkIn' }, 9] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $sort: { userName: 1 }
                }
            ]);

            res.json({
                success: true,
                reportType: 'summary',
                data: summaryReport,
                summary: {
                    totalEmployees: summaryReport.length,
                    dateRange: { start, end }
                }
            });
        }
    } catch (error) {
        console.error('Get attendance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/admin/reports/productivity
// @desc    Get productivity reports
// @access  Private (Admin, HR)
router.get('/reports/productivity', authenticate, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { startDate, endDate, department } = req.query;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Department productivity comparison
        const departmentProductivity = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    productivity: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: '$userInfo'
            },
            {
                $match: {
                    'userInfo.role': { $ne: 'admin' }
                }
            },
            {
                $group: {
                    _id: '$userInfo.department',
                    avgProductivity: { $avg: '$productivity' },
                    totalEntries: { $sum: 1 },
                    employees: { $addToSet: '$user' }
                }
            },
            {
                $addFields: {
                    employeeCount: { $size: '$employees' }
                }
            },
            {
                $project: {
                    employees: 0
                }
            },
            {
                $sort: { avgProductivity: -1 }
            }
        ]);

        // Top performers
        const topPerformers = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    productivity: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: '$userInfo'
            },
            {
                $match: {
                    'userInfo.role': { $ne: 'admin' }
                }
            },
            {
                $group: {
                    _id: '$user',
                    userName: { $first: '$userInfo.name' },
                    department: { $first: '$userInfo.department' },
                    avgProductivity: { $avg: '$productivity' },
                    totalDays: { $sum: 1 }
                }
            },
            {
                $match: {
                    totalDays: { $gte: 5 } // At least 5 days of data
                }
            },
            {
                $sort: { avgProductivity: -1 }
            },
            {
                $limit: 10
            }
        ]);

        // Productivity trends (daily)
        const dailyTrends = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    productivity: { $exists: true }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$date' }
                    },
                    avgProductivity: { $avg: '$productivity' },
                    entriesCount: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json({
            success: true,
            data: {
                departmentProductivity,
                topPerformers,
                dailyTrends,
                summary: {
                    dateRange: { start, end },
                    totalDepartments: departmentProductivity.length,
                    topPerformersCount: topPerformers.length
                }
            }
        });
    } catch (error) {
        console.error('Get productivity report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/admin/recent-activities
// @desc    Get recent activities for admin dashboard
// @access  Private (Admin, HR)
router.get('/recent-activities', authenticate, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const limitNum = parseInt(limit);

        // Get recent check-ins and check-outs
        const recentAttendance = await Attendance.find({
            date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        })
            .populate('user', 'name email')
            .sort({ date: -1, checkIn: -1 })
            .limit(limitNum * 2); // Get more to filter and format

        // Get recent task completions
        const recentTasks = await Task.find({
            status: 'completed',
            updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
            .populate('assignedTo', 'name email')
            .sort({ updatedAt: -1 })
            .limit(limitNum);

        // Format activities
        const activities = [];

        // Add attendance activities
        recentAttendance.forEach(attendance => {
            if (attendance.checkIn) {
                activities.push({
                    _id: `checkin-${attendance._id}`,
                    type: 'check-in',
                    user: attendance.user,
                    description: `Checked in at ${attendance.checkIn.toLocaleTimeString()}`,
                    timestamp: attendance.checkIn
                });
            }
            if (attendance.checkOut) {
                activities.push({
                    _id: `checkout-${attendance._id}`,
                    type: 'check-out',
                    user: attendance.user,
                    description: `Checked out at ${attendance.checkOut.toLocaleTimeString()}`,
                    timestamp: attendance.checkOut
                });
            }
        });

        // Add task activities
        recentTasks.forEach(task => {
            activities.push({
                _id: `task-${task._id}`,
                type: 'task-completed',
                user: task.assignedTo,
                description: `Completed task: ${task.title}`,
                timestamp: task.updatedAt
            });
        });

        // Sort all activities by timestamp and limit
        const sortedActivities = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limitNum);

        res.json({
            success: true,
            data: sortedActivities
        });
    } catch (error) {
        console.error('Get recent activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/admin/top-performers
// @desc    Get top performing employees
// @access  Private (Admin, HR)
router.get('/top-performers', authenticate, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { timeRange = 'week', limit = 5 } = req.query;
        const limitNum = parseInt(limit);

        // Calculate date range
        let startDate = new Date();
        switch (timeRange) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }

        // Get top performers based on completed tasks and productivity
        const topPerformers = await User.aggregate([
            {
                $match: {
                    role: { $ne: 'admin' },
                    status: 'active'
                }
            },
            {
                $lookup: {
                    from: 'tasks',
                    localField: '_id',
                    foreignField: 'assignedTo',
                    as: 'tasks',
                    pipeline: [
                        {
                            $match: {
                                status: 'completed',
                                updatedAt: { $gte: startDate }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'attendances',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'attendance',
                    pipeline: [
                        {
                            $match: {
                                date: { $gte: startDate },
                                productivity: { $exists: true }
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    completedTasks: { $size: '$tasks' },
                    avgProductivity: { $avg: '$attendance.productivity' },
                    totalHours: {
                        $sum: {
                            $map: {
                                input: '$attendance',
                                as: 'att',
                                in: {
                                    $cond: [
                                        { $and: ['$$att.checkIn', '$$att.checkOut'] },
                                        { $divide: [{ $subtract: ['$$att.checkOut', '$$att.checkIn'] }, 1000 * 60 * 60] },
                                        0
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    performanceScore: {
                        $add: [
                            { $multiply: ['$completedTasks', 10] }, // Weight tasks heavily
                            { $ifNull: ['$avgProductivity', 0] }, // Add productivity score
                            { $multiply: ['$totalHours', 0.5] } // Add hours worked with lower weight
                        ]
                    }
                }
            },
            {
                $match: {
                    performanceScore: { $gt: 0 }
                }
            },
            {
                $sort: { performanceScore: -1 }
            },
            {
                $limit: limitNum
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    department: 1,
                    completedTasks: 1,
                    avgProductivity: { $round: [{ $ifNull: ['$avgProductivity', 0] }, 1] },
                    totalHours: { $round: ['$totalHours', 1] },
                    performanceScore: { $round: ['$performanceScore', 1] }
                }
            }
        ]);

        res.json({
            success: true,
            data: topPerformers
        });
    } catch (error) {
        console.error('Get top performers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/admin/attendance-records
// @desc    Get attendance records for admin dashboard
// @access  Private (Admin, HR)
router.get('/attendance-records', authenticate, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { timeRange = 'week', limit = 50 } = req.query;

        // Calculate date range
        const now = new Date();
        let startDate;

        switch (timeRange) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'quarter':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
        }

        const attendanceRecords = await Attendance.find({
            date: { $gte: startDate }
        })
            .populate('userId', 'name email department')
            .sort({ date: -1, checkIn: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: attendanceRecords
        });
    } catch (error) {
        console.error('Get attendance records error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/admin/employee-attendance/:id
// @desc    Get attendance records for specific employee
// @access  Private (Admin, HR)
router.get('/employee-attendance/:id', authenticate, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 30, startDate, endDate } = req.query;

        // Validate employee ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID'
            });
        }

        // Build query
        const query = { userId: id };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const attendanceRecords = await Attendance.find(query)
            .sort({ date: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            data: attendanceRecords
        });
    } catch (error) {
        console.error('Get employee attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

export default router;
