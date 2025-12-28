import { NestFactory } from '@nestjs/core';
import { HirehubBatchModule } from './hirehub-batch.module';

async function bootstrap() {
	const app = await NestFactory.create(HirehubBatchModule);
	await app.listen(process.env.HIREHUB_BATCH_PORT ?? 3001);
}
bootstrap();
