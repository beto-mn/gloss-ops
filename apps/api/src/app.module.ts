import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { Module } from '@nestjs/common'

import { AuthGuard, RolesGuard } from '@auth/guards'
import { PrismaModule } from '@prisma'
import { AuthModule } from '@auth'

import { CustomerAssetsModule } from './customer-assets/customer-assets.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { ActivityLogsModule } from './activity-logs/activity-logs.module'
import { CustomersModule } from './customers/customers.module'
import { BranchesModule } from './branches/branches.module'
import { SuppliersModule } from './suppliers/suppliers.module'
import { ServicesModule } from './services/services.module'
import { AssetCheckpointsModule } from './asset-checkpoints/asset-checkpoints.module'
import { WorkOrdersModule } from './work-orders/work-orders.module'
import { BrandsModule } from './brands/brands.module'
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module'
import { InventoryModule } from './inventory/inventory.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    CustomersModule,
    BranchesModule,
    CustomerAssetsModule,
    ServicesModule,
    SuppliersModule,
    BrandsModule,
    WorkOrdersModule,
    ActivityLogsModule,
    AssetCheckpointsModule,
    InventoryModule,
    PurchaseOrdersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
