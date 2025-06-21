import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    }, description: {
        type: String,
        required: [true, 'Task description is required'],
        maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled', 'overdue'],
        default: 'pending'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    estimatedHours: {
        type: Number,
        min: 0.5,
        max: 100
    },
    actualHours: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        enum: ['development', 'design', 'testing', 'documentation', 'meeting', 'research', 'other'],
        default: 'other'
    },
    tags: [String],
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        comment: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    timeTracking: [{
        startTime: Date,
        endTime: Date,
        duration: Number, // in minutes
        description: String,
        date: {
            type: String, // YYYY-MM-DD format
            required: true
        }
    }],
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    dependencies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    completedAt: Date,
    completionReason: {
        type: String,
        maxlength: [500, 'Completion reason cannot exceed 500 characters']
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringPattern: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        required: function () { return this.isRecurring; }
    },
    nextDueDate: Date
}, {
    timestamps: true
});

// Create indexes for performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });

// Update task status based on due date
taskSchema.pre('save', function (next) {
    if (this.dueDate < new Date() && this.status !== 'completed' && this.status !== 'cancelled') {
        this.status = 'overdue';
    }
    next();
});

// Update actual hours when time tracking is added
taskSchema.pre('save', function (next) {
    if (this.timeTracking && this.timeTracking.length > 0) {
        this.actualHours = this.timeTracking.reduce((total, entry) => {
            return total + (entry.duration || 0);
        }, 0) / 60; // Convert minutes to hours
    }
    next();
});

export default mongoose.model('Task', taskSchema);
