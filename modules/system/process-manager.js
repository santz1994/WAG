// modules/system/process-manager.js
// Monitor and manage running processes

const { execSync, spawn } = require('child_process');
const si = require('systeminformation');

module.exports = {
    name: "Process Manager",
    slug: "process-manager",
    type: "api",
    version: "1.0.0",
    description: "Monitor, start, stop, and manage system processes",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'list':
                    return await listProcesses(params);
                case 'get-info':
                    return await getProcessInfo(params);
                case 'kill':
                    return killProcess(params);
                case 'search':
                    return await searchProcesses(params);
                case 'get-top':
                    return await getTopProcesses(params);
                case 'monitor':
                    return await monitorProcess(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function listProcesses({ limit = 100, sort = 'cpu' }) {
    try {
        const processes = await si.processes();

        let sorted = processes.list.slice(0, limit);

        if (sort === 'cpu') {
            sorted.sort((a, b) => parseFloat(b.pcpu) - parseFloat(a.pcpu));
        } else if (sort === 'memory') {
            sorted.sort((a, b) => parseFloat(b.pmem) - parseFloat(a.pmem));
        } else if (sort === 'pid') {
            sorted.sort((a, b) => a.pid - b.pid);
        }

        const processInfo = sorted.map(p => ({
            pid: p.pid,
            name: p.name,
            cpu: `${p.pcpu}%`,
            memory: `${p.pmem}%`,
            state: p.state || 'running',
            command: p.command.substring(0, 80)
        }));

        return {
            success: true,
            summary: {
                total: processes.all,
                running: processes.running,
                sleeping: processes.sleeping,
                zombie: processes.zombie || 0
            },
            sort,
            limit,
            count: processInfo.length,
            processes: processInfo
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getProcessInfo({ pid }) {
    try {
        if (!pid) {
            return { success: false, error: 'pid is required' };
        }

        const processes = await si.processes();
        const process = processes.list.find(p => p.pid == pid);

        if (!process) {
            return { success: false, error: `Process with PID ${pid} not found` };
        }

        return {
            success: true,
            process: {
                pid: process.pid,
                name: process.name,
                parentPid: process.parentPid,
                state: process.state,
                cpuUsage: `${process.pcpu}%`,
                memoryUsage: `${process.pmem}%`,
                virtualMemory: process.vsz ? `${(process.vsz / 1024).toFixed(2)} MB` : 'N/A',
                residentMemory: process.rss ? `${(process.rss / 1024).toFixed(2)} MB` : 'N/A',
                command: process.command,
                started: process.started || 'Unknown',
                nice: process.nice || 'N/A',
                priority: process.priority || 'N/A'
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function killProcess({ pid, force = false }) {
    try {
        if (!pid) {
            return { success: false, error: 'pid is required' };
        }

        // Check if process exists first
        try {
            if (process.platform === 'win32') {
                execSync(`tasklist | find "${pid}"`);
            } else {
                execSync(`kill -0 ${pid}`, { stdio: 'pipe' });
            }
        } catch (e) {
            return { success: false, error: `Process with PID ${pid} not found or already terminated` };
        }

        // Kill the process
        const signal = force ? 'SIGKILL' : 'SIGTERM';
        const command = process.platform === 'win32'
            ? `taskkill /PID ${pid} ${force ? '/F' : ''}`
            : `kill ${force ? '-9' : '-15'} ${pid}`;

        try {
            execSync(command);
        } catch (e) {
            return { success: false, error: `Failed to kill process: ${e.message}` };
        }

        return {
            success: true,
            pid,
            signal: force ? 'SIGKILL (Forced)' : 'SIGTERM (Graceful)',
            message: `Process ${pid} terminated`,
            note: force ? 'Process was forcefully killed' : 'Process was sent termination signal'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function searchProcesses({ query, limit = 50 }) {
    try {
        if (!query) {
            return { success: false, error: 'query is required' };
        }

        const processes = await si.processes();
        const searchRegex = new RegExp(query, 'i');

        const matches = processes.list
            .filter(p => searchRegex.test(p.name) || searchRegex.test(p.command))
            .slice(0, limit)
            .map(p => ({
                pid: p.pid,
                name: p.name,
                cpu: `${p.pcpu}%`,
                memory: `${p.pmem}%`,
                command: p.command.substring(0, 80),
                match: searchRegex.test(p.name) ? 'name' : 'command'
            }));

        return {
            success: true,
            query,
            found: matches.length,
            processes: matches,
            message: `Found ${matches.length} process(es) matching "${query}"`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getTopProcesses({ count = 10, metric = 'cpu' }) {
    try {
        if (metric !== 'cpu' && metric !== 'memory') {
            return { success: false, error: 'metric must be "cpu" or "memory"' };
        }

        const processes = await si.processes();

        const sorted = processes.list
            .sort((a, b) => {
                if (metric === 'cpu') {
                    return parseFloat(b.pcpu) - parseFloat(a.pcpu);
                } else {
                    return parseFloat(b.pmem) - parseFloat(a.pmem);
                }
            })
            .slice(0, count);

        const topProcesses = sorted.map((p, idx) => ({
            rank: idx + 1,
            pid: p.pid,
            name: p.name,
            value: metric === 'cpu' ? `${p.pcpu}%` : `${p.pmem}%`,
            otherMetric: metric === 'cpu' ? `Memory: ${p.pmem}%` : `CPU: ${p.pcpu}%`,
            command: p.command.substring(0, 60)
        }));

        const totalValue = metric === 'cpu'
            ? topProcesses.reduce((sum, p) => sum + parseFloat(p.value), 0)
            : topProcesses.reduce((sum, p) => sum + parseFloat(p.value), 0);

        return {
            success: true,
            metric,
            count: topProcesses.length,
            topProcesses,
            totalValue: `${totalValue.toFixed(2)}%`,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function monitorProcess({ pid, duration = 10, interval = 1 }) {
    try {
        if (!pid) {
            return { success: false, error: 'pid is required' };
        }

        if (duration < 1 || duration > 60) {
            return { success: false, error: 'duration must be between 1-60 seconds' };
        }

        const samples = [];
        const startTime = Date.now();

        return new Promise((resolve) => {
            const monitor = setInterval(async () => {
                try {
                    const processes = await si.processes();
                    const process = processes.list.find(p => p.pid == pid);

                    if (!process) {
                        clearInterval(monitor);
                        return resolve({
                            success: false,
                            error: `Process ${pid} terminated or not found`
                        });
                    }

                    samples.push({
                        timestamp: new Date().toISOString(),
                        cpu: `${process.pcpu}%`,
                        memory: `${process.pmem}%`,
                        rss: process.rss ? `${(process.rss / 1024).toFixed(2)} MB` : 'N/A'
                    });

                    if (Date.now() - startTime >= duration * 1000) {
                        clearInterval(monitor);

                        const avgCpu = (samples.reduce((sum, s) => sum + parseFloat(s.cpu), 0) / samples.length).toFixed(2);
                        const avgMemory = (samples.reduce((sum, s) => sum + parseFloat(s.memory), 0) / samples.length).toFixed(2);
                        const maxCpu = Math.max(...samples.map(s => parseFloat(s.cpu))).toFixed(2);
                        const maxMemory = Math.max(...samples.map(s => parseFloat(s.memory))).toFixed(2);

                        resolve({
                            success: true,
                            pid,
                            duration: `${duration}s`,
                            samples: samples.length,
                            stats: {
                                avgCpu: `${avgCpu}%`,
                                maxCpu: `${maxCpu}%`,
                                avgMemory: `${avgMemory}%`,
                                maxMemory: `${maxMemory}%`
                            },
                            samples: samples.slice(0, 20) // Return first 20 samples
                        });
                    }
                } catch (error) {
                    clearInterval(monitor);
                    resolve({ success: false, error: error.message });
                }
            }, interval * 1000);
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}
