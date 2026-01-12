import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
	HealthCheckService,
	HealthCheck,
	MongooseHealthIndicator,
	MemoryHealthIndicator,
	DiskHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
	private readonly startTime = Date.now();

	constructor(
		private health: HealthCheckService,
		private mongoose: MongooseHealthIndicator,
		private memory: MemoryHealthIndicator,
		private disk: DiskHealthIndicator,
	) {}

	@Get('json')
	@HealthCheck()
	checkJson() {
		return this.health.check([
			() => this.mongoose.pingCheck('database'),
			() => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024), // 512MB
			() => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024), // 1GB
			() => this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
		]);
	}

	@Get()
	async check(@Res() res: Response) {
		try {
			const healthData = await this.health.check([
				() => this.mongoose.pingCheck('database'),
				() => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
				() => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
				() => this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
			]);

			const uptime = this.getUptime();
			const memoryUsage = process.memoryUsage();

			res.render('health', {
				status: healthData.status,
				database: healthData.details.database,
				memoryHeap: healthData.details.memory_heap,
				memoryRss: healthData.details.memory_rss,
				disk: healthData.details.disk,
				uptime: uptime,
				memoryHeapUsed: this.formatBytes(memoryUsage.heapUsed),
				memoryHeapTotal: this.formatBytes(memoryUsage.heapTotal),
				memoryRssUsed: this.formatBytes(memoryUsage.rss),
				heapPercentage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1),
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			res.render('health', {
				status: 'error',
				database: { status: 'down' },
				error: error.message,
				timestamp: new Date().toISOString(),
			});
		}
	}

	private getUptime(): string {
		const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
		const days = Math.floor(uptimeSeconds / 86400);
		const hours = Math.floor((uptimeSeconds % 86400) / 3600);
		const minutes = Math.floor((uptimeSeconds % 3600) / 60);
		const seconds = uptimeSeconds % 60;

		if (days > 0) return `${days}d ${hours}h ${minutes}m`;
		if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
		if (minutes > 0) return `${minutes}m ${seconds}s`;
		return `${seconds}s`;
	}

	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}
