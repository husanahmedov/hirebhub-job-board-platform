import { Controller, Get, Logger } from '@nestjs/common';
import { HirehubBatchService } from './hirehub-batch.service';
import { Cron, Timeout } from '@nestjs/schedule';
import { COMPANY_AVG_SALARY_COMPUTE, SESSION_CLEANUP } from './libs/config';

@Controller()
export class HirehubBatchController {
	constructor(private readonly hirehubBatchService: HirehubBatchService) {}
	private readonly logger: Logger = new Logger(HirehubBatchController.name);
	// =============================================================================================
	// --------------------------------- // [USER] // ----------------------------------------------
	// =============================================================================================

	@Timeout(1000)
	handleTimeout() {
		this.logger.debug(`BATCH SERVICE INITIALIZED...`);
	}

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

	// for mokcing purposes, we can set this to run every minute and check the logs to see the output
	@Cron('* * * * *', { name: COMPANY_AVG_SALARY_COMPUTE }) // Runs every minute (for testing)
	// @Cron('0 1 * * *', { name: COMPANY_AVG_SALARY_COMPUTE }) // Runs every day at 1 AM
	public async batchComputeCompanyAvgSalary(): Promise<void> {
		this.logger.debug('Starting batch job: Computing average salary for companies');
		try {
			await this.hirehubBatchService.batchComputeCompanyAvgSalary();
			this.logger.debug('Completed batch job: Average salary computed successfully');
		} catch (error) {
			this.logger.error('Error occurred during batch job: Computing average salary', error.stack);
		}
	}
}
