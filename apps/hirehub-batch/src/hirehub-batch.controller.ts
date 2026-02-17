import { Controller, Get, Logger } from '@nestjs/common';
import { HirehubBatchService } from './hirehub-batch.service';
import { Cron } from '@nestjs/schedule';
import { SESSION_CLEANUP } from './libs/config';

@Controller()
export class HirehubBatchController {
	constructor(private readonly hirehubBatchService: HirehubBatchService) {}
	private readonly logger: Logger = new Logger(HirehubBatchController.name);
	// =============================================================================================
	// --------------------------------- // [USER] // ----------------------------------------------
	// =============================================================================================

	@Cron('0 0 * * *', { name: SESSION_CLEANUP }) // Runs every day at midnight
	public async batchRemoveExpiredSessions(): Promise<void> {
		this.logger.debug('Starting batch job: Removing expired sessions');
		try {
			await this.hirehubBatchService.batchRemoveExpiredSessions();
			this.logger.debug('Completed batch job: Expired sessions removed successfully');
		} catch (error) {
			this.logger.error('Error occurred during batch job: Removing expired sessions', error.stack);
		}
	}

	@Get()
	getHello(): string {
		return this.hirehubBatchService.getHello();
	}
}
