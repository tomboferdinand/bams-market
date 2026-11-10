import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ShopsModule } from '../shops/shops.module';

@Module({
    imports: [ShopsModule], // pour injecter ShopsService (assertOwnedAndValidated)
    controllers: [ProductsController],
    providers: [ProductsService],
})
export class ProductsModule { }