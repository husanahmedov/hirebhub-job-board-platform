import { Module, forwardRef } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Module({
	providers: [SocketGateway],
	exports: [SocketGateway],
})
export class SocketModule {}
