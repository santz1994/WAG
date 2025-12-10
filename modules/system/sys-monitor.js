// modules/system/sys-monitor.js
// Real-time system resource monitoring (CPU, RAM, Disk, Network)

const si = require('systeminformation');

module.exports = {
    name: "System Resource Monitor",
    slug: "sys-monitor",
    type: "api",
    version: "1.0.0",
    description: "Real-time CPU, RAM, Disk, and Network monitoring",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'get-cpu':
                    return await getCPUInfo(params);
                case 'get-memory':
                    return await getMemoryInfo(params);
                case 'get-disk':
                    return await getDiskInfo(params);
                case 'get-network':
                    return await getNetworkInfo(params);
                case 'get-processes':
                    return await getProcessInfo(params);
                case 'full-dashboard':
                    return await getFullDashboard(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function getCPUInfo(params = {}) {
    try {
        const cpuInfo = await si.cpu();
        const currentLoad = await si.currentLoad();
        const cpuTemp = await si.cpuTemperature();

        return {
            success: true,
            cpu: {
                brand: cpuInfo.brand,
                model: cpuInfo.model,
                cores: cpuInfo.cores,
                speedGHz: cpuInfo.speed,
                currentLoad: {
                    load: `${currentLoad.currentLoad.toFixed(2)}%`,
                    loadUser: `${currentLoad.currentLoadUser.toFixed(2)}%`,
                    loadSystem: `${currentLoad.currentLoadSystem.toFixed(2)}%`,
                    loadIdle: `${currentLoad.currentLoadIdle.toFixed(2)}%`
                },
                temperature: cpuTemp.main ? `${cpuTemp.main.toFixed(1)}°C` : 'N/A',
                cores: currentLoad.cpus.map((c, idx) => ({
                    core: idx,
                    load: `${c.load.toFixed(2)}%`,
                    user: `${c.loadUser.toFixed(2)}%`,
                    system: `${c.loadSystem.toFixed(2)}%`
                }))
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getMemoryInfo(params = {}) {
    try {
        const mem = await si.mem();

        const totalGB = (mem.total / 1024 / 1024 / 1024).toFixed(2);
        const usedGB = (mem.used / 1024 / 1024 / 1024).toFixed(2);
        const freeGB = (mem.free / 1024 / 1024 / 1024).toFixed(2);
        const activeGB = (mem.active / 1024 / 1024 / 1024).toFixed(2);
        const usagePercent = ((mem.used / mem.total) * 100).toFixed(2);

        return {
            success: true,
            memory: {
                total: `${totalGB} GB`,
                used: `${usedGB} GB`,
                free: `${freeGB} GB`,
                active: `${activeGB} GB`,
                cached: `${(mem.buffcache / 1024 / 1024 / 1024).toFixed(2)} GB`,
                usagePercent: `${usagePercent}%`,
                status: getMemoryStatus(parseFloat(usagePercent))
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getDiskInfo(params = {}) {
    try {
        const diskSize = await si.fsSize();
        const diskIO = await si.disksIO();

        const disks = diskSize.map(disk => ({
            mount: disk.mount,
            device: disk.fs,
            type: disk.type,
            total: `${(disk.size / 1024 / 1024 / 1024).toFixed(2)} GB`,
            used: `${(disk.used / 1024 / 1024 / 1024).toFixed(2)} GB`,
            available: `${(disk.available / 1024 / 1024 / 1024).toFixed(2)} GB`,
            usagePercent: `${disk.use.toFixed(2)}%`,
            status: getDiskStatus(disk.use)
        }));

        return {
            success: true,
            disks,
            diskIO: diskIO ? {
                reads: diskIO.rIO,
                writes: diskIO.wIO,
                readTime: diskIO.rTime,
                writeTime: diskIO.wTime
            } : 'N/A',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getNetworkInfo(params = {}) {
    try {
        const netInterfaces = await si.networkInterfaces();
        const netStats = await si.networkStats();

        const interfaces = netInterfaces.map(iface => ({
            interface: iface.iface,
            ip4: iface.ip4,
            ip6: iface.ip6,
            mac: iface.mac,
            type: iface.type,
            speed: iface.speed ? `${iface.speed} Mbps` : 'N/A',
            state: iface.state
        }));

        const stats = netStats.map(stat => ({
            interface: stat.iface,
            rx: `${(stat.rx_bytes / 1024 / 1024).toFixed(2)} MB`,
            tx: `${(stat.tx_bytes / 1024 / 1024).toFixed(2)} MB`,
            rxPackets: stat.rx_dropped,
            txPackets: stat.tx_dropped,
            errors: stat.err_in || stat.err_out || 0
        }));

        return {
            success: true,
            interfaces,
            stats,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getProcessInfo(params = {}) {
    try {
        const processes = await si.processes();

        // Get top processes by CPU
        const topCPU = processes.list
            .sort((a, b) => parseFloat(b.pcpu) - parseFloat(a.pcpu))
            .slice(0, 10)
            .map(p => ({
                pid: p.pid,
                name: p.name,
                cpu: `${p.pcpu}%`,
                memory: `${p.pmem}%`,
                cmd: p.command.substring(0, 100)
            }));

        // Get top processes by Memory
        const topMemory = processes.list
            .sort((a, b) => parseFloat(b.pmem) - parseFloat(a.pmem))
            .slice(0, 10)
            .map(p => ({
                pid: p.pid,
                name: p.name,
                memory: `${p.pmem}%`,
                cpu: `${p.pcpu}%`,
                cmd: p.command.substring(0, 100)
            }));

        return {
            success: true,
            summary: {
                total: processes.all,
                running: processes.running,
                sleeping: processes.sleeping,
                zombie: processes.zombie || 0
            },
            topCPU,
            topMemory,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getFullDashboard(params = {}) {
    try {
        const [cpuData, memData, diskData, netData, procData] = await Promise.all([
            getCPUInfo(),
            getMemoryInfo(),
            getDiskInfo(),
            getNetworkInfo(),
            getProcessInfo()
        ]);

        return {
            success: true,
            dashboard: {
                cpu: cpuData.cpu,
                memory: memData.memory,
                disk: diskData.disks,
                network: diskData.diskIO,
                topProcesses: {
                    byMemory: procData.topMemory.slice(0, 5),
                    byCPU: procData.topCPU.slice(0, 5)
                },
                systemHealth: getSystemHealth(cpuData, memData, diskData)
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getMemoryStatus(percentage) {
    if (percentage < 50) return 'Excellent';
    if (percentage < 75) return 'Good';
    if (percentage < 90) return 'Warning';
    return 'Critical';
}

function getDiskStatus(percentage) {
    if (percentage < 50) return 'Healthy';
    if (percentage < 75) return 'Good';
    if (percentage < 90) return 'Warning';
    return 'Critical - Consider cleanup';
}

function getSystemHealth(cpuData, memData, diskData) {
    const cpuLoad = parseFloat(cpuData.cpu.currentLoad.load);
    const memUsage = parseFloat(memData.memory.usagePercent);
    const avgDiskUsage = diskData.disks.reduce((sum, d) => sum + parseFloat(d.usagePercent), 0) / diskData.disks.length;

    const healthScore = (100 - ((cpuLoad + memUsage + avgDiskUsage) / 3));

    return {
        score: `${healthScore.toFixed(2)}/100`,
        status: healthScore > 70 ? 'Healthy' : healthScore > 50 ? 'Fair' : 'Poor',
        recommendations: getRecommendations(cpuLoad, memUsage, avgDiskUsage)
    };
}

function getRecommendations(cpu, mem, disk) {
    const recs = [];
    if (cpu > 80) recs.push('CPU usage high - consider closing applications');
    if (mem > 80) recs.push('RAM usage high - consider freeing memory');
    if (disk > 85) recs.push('Disk usage high - consider cleanup');
    return recs.length > 0 ? recs : ['System running smoothly'];
}
