import { Injectable } from '@nestjs/common';

@Injectable()
export class HirehubBatchService {
	getHello(): string {
		return 'Hello World!';
	}
}
