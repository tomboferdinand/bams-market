import { computeOrderTotals, getDeliveryFee, getMinOrderAmount } from './pricing';

describe('pricing (BR-CMD-01, BR-SEC-02)', () => {
    const saved = { min: process.env.MIN_ORDER_AMOUNT, fee: process.env.DELIVERY_FEE };

    afterEach(() => {
        if (saved.min === undefined) delete process.env.MIN_ORDER_AMOUNT;
        else process.env.MIN_ORDER_AMOUNT = saved.min;
        if (saved.fee === undefined) delete process.env.DELIVERY_FEE;
        else process.env.DELIVERY_FEE = saved.fee;
    });

    it('valeurs par défaut : minimum 2000 MGA, livraison 2000 MGA', () => {
        delete process.env.MIN_ORDER_AMOUNT;
        delete process.env.DELIVERY_FEE;
        expect(getMinOrderAmount()).toBe(2000);
        expect(getDeliveryFee()).toBe(2000);
    });

    it('le total = sous-total + frais de livraison', () => {
        delete process.env.DELIVERY_FEE;
        const t = computeOrderTotals(15000);
        expect(t.subtotal).toBe(15000);
        expect(t.deliveryFee).toBe(2000);
        expect(t.total).toBe(17000);
    });

    it('le minimum de commande se vérifie sur le sous-total (frais exclus)', () => {
        delete process.env.MIN_ORDER_AMOUNT;
        expect(computeOrderTotals(1999).meetsMinimum).toBe(false);
        expect(computeOrderTotals(2000).meetsMinimum).toBe(true);
    });

    it('un panier vide n\'a ni frais ni total', () => {
        const t = computeOrderTotals(0);
        expect(t.deliveryFee).toBe(0);
        expect(t.total).toBe(0);
        expect(t.meetsMinimum).toBe(false);
    });

    it('respecte les variables d\'environnement', () => {
        process.env.MIN_ORDER_AMOUNT = '5000';
        process.env.DELIVERY_FEE = '3000';
        const t = computeOrderTotals(4000);
        expect(t.minOrderAmount).toBe(5000);
        expect(t.meetsMinimum).toBe(false);
        expect(t.deliveryFee).toBe(3000);
        expect(t.total).toBe(7000);
    });
});
