import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Module for health check functionality
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}