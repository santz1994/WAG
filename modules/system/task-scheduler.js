// modules/system/task-scheduler.js
// Schedule automated tasks using cron expressions

const cron = require('node-cron');
const { exec, spawn } = require('child_process');

// In-memory task storage
const activeTasks = new Map();
const taskHistory = new Map();

module.exports = {
    name: "Task Scheduler",
    slug: "task-scheduler",
    type: "api",
    version: "1.0.0",
    description: "Schedule scripts and commands to run automatically (Cron)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'create':
                    return createTask(params);
                case 'update':
                    return updateTask(params);
                case 'stop':
                    return stopTask(params);
                case 'list':
                    return listTasks();
                case 'get-task':
                    return getTaskInfo(params);
                case 'get-history':
                    return getTaskHistory(params);
                case 'run-now':
                    return runTaskNow(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function createTask({ taskId, schedule, command, description = '', maxHistory = 100 }) {
    try {
        if (!taskId || !schedule || !command) {
            return { success: false, error: 'taskId, schedule, and command are required' };
        }

        if (activeTasks.has(taskId)) {
            return { success: false, error: `Task ${taskId} already exists` };
        }

        // Validate cron expression
        if (!cron.validate(schedule)) {
            return { success: false, error: `Invalid cron syntax: ${schedule}` };
        }

        // Initialize history for this task
        if (!taskHistory.has(taskId)) {
            taskHistory.set(taskId, []);
        }

        // Create scheduled task
        const task = cron.schedule(schedule, () => {
            const execStart = Date.now();
            const execution = {
                timestamp: new Date().toISOString(),
                status: 'running',
                startTime: execStart
            };

            exec(command, (error, stdout, stderr) => {
                const execEnd = Date.now();
                execution.endTime = execEnd;
                execution.duration = `${(execEnd - execStart) / 1000}s`;

                if (error) {
                    execution.status = 'failed';
                    execution.error = error.message;
                    execution.stderr = stderr;
                } else {
                    execution.status = 'success';
                    execution.stdout = stdout;
                }

                // Store execution history
                const history = taskHistory.get(taskId);
                history.push(execution);

                // Keep only last N executions
                if (history.length > maxHistory) {
                    history.shift();
                }

                console.log(`[Task ${taskId}] ${execution.status} at ${execution.timestamp}`);
            });
        });

        // Store active task
        activeTasks.set(taskId, {
            taskId,
            schedule,
            command,
            description,
            task,
            createdAt: new Date().toISOString(),
            lastRun: null,
            nextRun: getNextCronDate(schedule),
            execCount: 0,
            maxHistory
        });

        return {
            success: true,
            taskId,
            schedule,
            command,
            description,
            nextRun: getNextCronDate(schedule),
            message: `Task ${taskId} scheduled: "${description || command}"`,
            cronHelp: getCronHelp(schedule)
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function updateTask({ taskId, schedule = null, command = null, description = null }) {
    try {
        if (!taskId) {
            return { success: false, error: 'taskId is required' };
        }

        if (!activeTasks.has(taskId)) {
            return { success: false, error: `Task ${taskId} not found` };
        }

        // Stop old task
        const oldTask = activeTasks.get(taskId);
        oldTask.task.stop();

        // Validate new schedule if provided
        if (schedule && !cron.validate(schedule)) {
            return { success: false, error: `Invalid cron syntax: ${schedule}` };
        }

        // Create new task with updated params
        const newSchedule = schedule || oldTask.schedule;
        const newCommand = command || oldTask.command;
        const newDescription = description !== null ? description : oldTask.description;

        // Remove old task
        activeTasks.delete(taskId);

        // Create new task
        return createTask({
            taskId,
            schedule: newSchedule,
            command: newCommand,
            description: newDescription,
            maxHistory: oldTask.maxHistory
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function stopTask({ taskId }) {
    try {
        if (!taskId) {
            return { success: false, error: 'taskId is required' };
        }

        if (!activeTasks.has(taskId)) {
            return { success: false, error: `Task ${taskId} not found` };
        }

        const taskData = activeTasks.get(taskId);
        taskData.task.stop();
        activeTasks.delete(taskId);

        return {
            success: true,
            taskId,
            message: `Task ${taskId} stopped`,
            uptime: new Date() - new Date(taskData.createdAt),
            execCount: taskData.execCount
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function listTasks() {
    try {
        const tasks = [];

        activeTasks.forEach((taskData, taskId) => {
            const history = taskHistory.get(taskId) || [];
            const lastExecution = history.length > 0 ? history[history.length - 1] : null;

            tasks.push({
                taskId,
                description: taskData.description,
                schedule: taskData.schedule,
                command: taskData.command.substring(0, 100),
                createdAt: taskData.createdAt,
                nextRun: taskData.nextRun,
                executions: history.length,
                lastExecution: lastExecution ? {
                    timestamp: lastExecution.timestamp,
                    status: lastExecution.status,
                    duration: lastExecution.duration
                } : null
            });
        });

        return {
            success: true,
            totalTasks: tasks.length,
            tasks,
            summary: `${tasks.length} scheduled task(s) active`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getTaskInfo({ taskId }) {
    try {
        if (!taskId) {
            return { success: false, error: 'taskId is required' };
        }

        if (!activeTasks.has(taskId)) {
            return { success: false, error: `Task ${taskId} not found` };
        }

        const taskData = activeTasks.get(taskId);
        const history = taskHistory.get(taskId) || [];

        return {
            success: true,
            taskId,
            task: {
                description: taskData.description,
                schedule: taskData.schedule,
                command: taskData.command,
                createdAt: taskData.createdAt,
                nextRun: taskData.nextRun,
                uptime: `${((Date.now() - new Date(taskData.createdAt)) / 1000 / 60).toFixed(2)} minutes`
            },
            executionHistory: {
                total: history.length,
                successful: history.filter(h => h.status === 'success').length,
                failed: history.filter(h => h.status === 'failed').length,
                recentExecutions: history.slice(-10)
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getTaskHistory({ taskId, limit = 50 }) {
    try {
        if (!taskId) {
            return { success: false, error: 'taskId is required' };
        }

        if (!taskHistory.has(taskId)) {
            return { success: false, error: `No history for task ${taskId}` };
        }

        const history = taskHistory.get(taskId);
        const recent = history.slice(-limit);

        const stats = {
            total: history.length,
            successful: history.filter(h => h.status === 'success').length,
            failed: history.filter(h => h.status === 'failed').length,
            successRate: `${((history.filter(h => h.status === 'success').length / history.length) * 100).toFixed(2)}%`
        };

        return {
            success: true,
            taskId,
            stats,
            history: recent,
            message: `Showing last ${recent.length} executions of ${history.length} total`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function runTaskNow({ taskId }) {
    try {
        if (!taskId) {
            return { success: false, error: 'taskId is required' };
        }

        if (!activeTasks.has(taskId)) {
            return { success: false, error: `Task ${taskId} not found` };
        }

        const taskData = activeTasks.get(taskId);
        const execStart = Date.now();

        return new Promise((resolve) => {
            exec(taskData.command, (error, stdout, stderr) => {
                const execEnd = Date.now();

                const execution = {
                    timestamp: new Date().toISOString(),
                    status: error ? 'failed' : 'success',
                    duration: `${(execEnd - execStart) / 1000}s`,
                    stdout: stdout || '',
                    stderr: stderr || '',
                    error: error ? error.message : null
                };

                // Store in history
                const history = taskHistory.get(taskId);
                history.push(execution);
                if (history.length > taskData.maxHistory) {
                    history.shift();
                }

                taskData.execCount++;
                taskData.lastRun = new Date().toISOString();

                resolve({
                    success: !error,
                    taskId,
                    execution,
                    message: `Task ${taskId} executed: ${execution.status}`
                });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getNextCronDate(cronExpression) {
    try {
        const cronTime = require('cron-parser').parseExpression(cronExpression);
        const nextDate = cronTime.next().toDate();
        return nextDate.toISOString();
    } catch (error) {
        return 'Unable to calculate next run';
    }
}

function getCronHelp(expression) {
    // Provide helpful interpretation of cron expression
    const parts = expression.split(' ');
    if (parts.length !== 5) {
        return 'Invalid cron format';
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const descriptions = [];

    if (minute !== '*') descriptions.push(`at minute ${minute}`);
    if (hour !== '*') descriptions.push(`hour ${hour}`);
    if (dayOfMonth !== '*') descriptions.push(`day ${dayOfMonth}`);
    if (month !== '*') descriptions.push(`month ${month}`);

    return descriptions.length > 0 ? descriptions.join(' ') : 'Every minute';
}
