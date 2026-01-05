import { Module } from '@nestjs/common';
import { UploaderService } from './uploader.service';
import { UploaderController } from './uploader.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [AuthModule],
	providers: [UploaderService],
	controllers: [UploaderController],
})
export class UploaderModule {}
