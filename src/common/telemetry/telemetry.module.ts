/*
 * REFACTOR COMMENT (Claude Sonnet 4.0):
 * This module replaces the complex OpenTelemetryModule with extensive validation and multiple registration methods.
 * The simplified approach improves:
 * 
 * - Developer Clarity: Single, straightforward module registration
 * - Compute Efficiency: Faster module initialisation without complex validation overhead
 * - Long-term Support: Simpler module structure is easier to extend and debug
 * - Security: Reduced complexity means fewer potential configuration vulnerabilities
 */

import { Global, Module } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

/**
 * Simplified telemetry module for NestJS OpenTelemetry integration
 * 
 * This module provides a single, easy-to-use telemetry service that handles
 * all OpenTelemetry functionality without complex configuration or multiple
 * service layers.
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [TelemetryModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}