import { Controller, Get } from '@nestjs/common';
import { HirehubBatchService } from './hirehub-batch.service';

@Controller()
export class HirehubBatchController {
	constructor(private readonly hirehubBatchService: HirehubBatchService) {}

	@Get()
	getHello(): string {
		return this.hirehubBatchService.getHello();
	}
}
