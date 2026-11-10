/**
 * Une boutique n'est « ouverte » (visible au public et commandable) que si :
 *  - elle a été validée par l'administration (BR-BQT-04) ;
 *  - ET le compte de son propriétaire est actif (BR-USR-05) : un commerçant suspendu ou
 *    désactivé ne vend plus, sans que ses données soient supprimées (BR-USR-07).
 * La règle est déduite à chaque lecture : réactiver le compte rend la boutique visible,
 * sans rien avoir à recalculer.
 */
export const PUBLIC_SHOP_FILTER = { status: 'VALIDEE', owner: { accountStatus: 'ACTIF' } } as const;

export function isShopOpen(shop: { status: string; owner: { accountStatus: string } }): boolean {
  return shop.status === 'VALIDEE' && shop.owner.accountStatus === 'ACTIF';
}
