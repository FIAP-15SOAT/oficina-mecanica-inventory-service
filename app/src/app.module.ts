import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AllExceptionsFilter } from './infrastructure/http/filters/all-exceptions.filter';
import { ApplicationExceptionFilter } from './infrastructure/http/filters/application-exception.filter';
import { DomainExceptionFilter } from './infrastructure/http/filters/domain-exception.filter';
import { InfrastructureExceptionFilter } from './infrastructure/http/filters/infrastructure-exception.filter';
import { AuthenticationGuard } from './infrastructure/http/guards/authentication.guard';
import { JwtAuthGuard } from './infrastructure/http/guards/jwt-auth.guard';
import { JwtStrategy } from './infrastructure/http/strategies/jwt.strategy';

import { LoggingModule } from './infrastructure/logging/logging.module';
import { TelemetryModule } from './infrastructure/telemetry/telemetry.module';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { HealthModule } from './infrastructure/http/controllers/health/health.module';
import { MessagingModule } from './infrastructure/messaging/messaging.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { ServiceModule } from './infrastructure/http/controllers/service/service.module';
import { PartSupplyModule } from './infrastructure/http/controllers/part-supply/part-supply.module';
import { StockModule } from './infrastructure/http/controllers/stock/stock.module';
import { InternalCatalogModule } from './infrastructure/http/controllers/internal/internal-catalog.module';
import { ClientsModule } from './infrastructure/clients/clients.module';
import { StockMessagingModule } from './infrastructure/messaging/stock-messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggingModule,
    TelemetryModule,
    PrismaModule,
    MessagingModule,
    CacheModule,
    ClientsModule,
    HealthModule,
    ServiceModule,
    PartSupplyModule,
    StockModule,
    InternalCatalogModule,
    StockMessagingModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ApplicationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: InfrastructureExceptionFilter,
    },
    JwtStrategy,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
})
export class AppModule {}
