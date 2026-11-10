import { Module } from '@nestjs/common';
import { PayoutsModule } from '../payouts/payouts.module';
import { AdminRoleRequestsController, RoleActivationController, RoleRequestsController } from './role-requests.controller';
import { RoleRequestsService } from './role-requests.service';

@Module({
  imports: [PayoutsModule],
  controllers: [RoleRequestsController, RoleActivationController, AdminRoleRequestsController],
  providers: [RoleRequestsService],
})
export class RoleRequestsModule {}
