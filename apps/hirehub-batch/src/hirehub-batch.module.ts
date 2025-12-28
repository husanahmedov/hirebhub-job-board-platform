import { Module } from '@nestjs/common';
import { HirehubBatchController } from './hirehub-batch.controller';
import { HirehubBatchService } from './hirehub-batch.service';

@Module({
	imports: [],
	controllers: [HirehubBatchController],
	providers: [HirehubBatchService],
})
export class HirehubBatchModule {}
