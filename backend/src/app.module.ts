import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { ShopsModule } from './shops/shops.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './database/prisma.module';
import { MailModule } from './common/mail/mail.module';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { CategoriesModule } from './categories/categories.module';
import { AddressesModule } from './addresses/addresses.module';
import { AuditModule } from './common/audit/audit.module';
import { RoleRequestsModule } from './role-requests/role-requests.module';




@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule, UsersModule, ShopsModule, ProductsModule, CartModule,
    OrdersModule, CategoriesModule, PaymentsModule, DeliveriesModule, ComplaintsModule, AdminModule,
    PrismaModule,
    MailModule,
    CloudinaryModule,
    AddressesModule,
    CartModule,
    OrdersModule,
    AuditModule,
    RoleRequestsModule,
    
  ],
  controllers: [AppController],
})
export class AppModule { }
