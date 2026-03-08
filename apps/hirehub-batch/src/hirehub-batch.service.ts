import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CompanyOutput, JobOutput } from 'apps/hire-hub/src/libs';
import { SessionOutput } from 'apps/hire-hub/src/libs/dto/sessions/output';
import { SocketGateway } from 'apps/hire-hub/src/socket/socket.gateway';
import { Model } from 'mongoose';

@Injectable()
export class HirehubBatchService {
	constructor(
		@InjectModel('Sessions') private sessionModel: Model<SessionOutput>,
		@InjectModel('Companies') private companyModel: Model<CompanyOutput>,
		@InjectModel('Jobs') private jobModel: Model<JobOutput>,
	) {}

	// =============================================================================================
	// --------------------------------- // [USER] // ----------------------------------------------
	// =============================================================================================

	public async batchRemoveExpiredSessions(): Promise<void> {
		const now = new Date();
		await this.sessionModel.deleteMany({ expiresAt: { $lt: now } });
	}

	public async batchComputeCompanyAvgSalary(): Promise<void> {
		// This method would contain logic to compute average salary for companies based on job postings
		// and update the company documents accordingly. The actual implementation would depend on the
		// data model and requirements, and may involve aggregation pipelines in MongoDB.
		try {
			// Example pseudo-code for computing average salary:
			// 1. Aggregate job postings to calculate average salary per company
			// 2. Update each company document with the computed average salary
			// Note: The actual implementation would require access to the Job model and its schema,
			// which is not included in this service. This is just a placeholder for where that logic would go.
			const jobs = await this.jobModel.find({ salaryRange: { $exists: true } }).exec();
			const companySalaryMap = new Map<string, { avgMin: number; avgMax: number; count: number }>();

			jobs.forEach((job) => {
				if (job.salaryRange && job.companyId && job.salaryRange.min && job.salaryRange.max) {
					const companyId = job.companyId.toString();
					if (!companySalaryMap.has(companyId)) {
						companySalaryMap.set(companyId, { avgMin: 0, avgMax: 0, count: 0 });
					}
					const companyData = companySalaryMap.get(companyId);
					if (companyData) {
						companyData.avgMin += Math.floor(Math.max(Math.round(job.salaryRange.min), 0)); // Ensure non-negative salary
						companyData.avgMax += Math.floor(Math.max(Math.round(job.salaryRange.max), 0)); // Ensure non-negative salary
						companyData.count += 1;
					}
				}
			});

			for (const [companyId, { avgMin, avgMax, count }] of companySalaryMap.entries()) {
				await this.companyModel
					.findByIdAndUpdate(companyId, {
						avgSalaryMin: Math.floor(avgMin / count / 10000) * 10000,
						avgSalaryMax: Math.floor(avgMax / count / 10000) * 10000,
					})
					.exec();
			}
		} catch (error) {
			throw new Error(`Error occurred while computing company average salary: ${error.message}`);
		}
	}

	// =============================================================================================
	// --------------------------------- // [HELPERS] // -------------------------------------------
	// =============================================================================================
}
