import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';

/**
 * Module for metrics functionality
 */
@Module({
  controllers: [MetricsController],
})
export class MetricsModule {}