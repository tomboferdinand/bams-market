import { OrderStatus } from '../enums/order-status.enum'; export class Order { id!: string; userId!: string; status!: OrderStatus; total!: number; }
