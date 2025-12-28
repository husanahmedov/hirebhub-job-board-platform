import { Test, TestingModule } from '@nestjs/testing';
import { HirehubBatchController } from './hirehub-batch.controller';
import { HirehubBatchService } from './hirehub-batch.service';

describe('HirehubBatchController', () => {
	let hirehubBatchController: HirehubBatchController;

	beforeEach(async () => {
		const app: TestingModule = await Test.createTestingModule({
			controllers: [HirehubBatchController],
			providers: [HirehubBatchService],
		}).compile();

		hirehubBatchController = app.get<HirehubBatchController>(HirehubBatchController);
	});

	describe('root', () => {
		it('should return "Hello World!"', () => {
			expect(hirehubBatchController.getHello()).toBe('Hello World!');
		});
	});
});
