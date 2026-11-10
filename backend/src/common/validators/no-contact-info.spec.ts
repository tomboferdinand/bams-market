import { containsContactInfo } from './no-contact-info';

describe('containsContactInfo (BR-SEC-06)', () => {
  const refused = [
    'Appelez le 0341234567',
    'Contact: 034 12 345 67',
    'tel 034.12.345.67 merci',
    '+261 34 12 345 67',
    '261341234567',
    '03 2 12 345 67',
    'Écrivez-moi sur WhatsApp',
    'whats app disponible',
    "What's App",
    'wa.me/261341234567',
    'Paiement par Mvola possible',
    'M-Vola ou Orange Money',
    'orange money / airtel money',
    'Ma page Facebook',
    'insta : Instagram',
    'telegram @boutique',
    'contactez-moi en privé',
    'jean@example.com',
    'jean (at) gmail (dot) com',
    'www.maboutique.mg',
    'https://exemple.com/produit',
    'paiement direct sans frais',
    'on se arrange hors site',
  ];
  it.each(refused)('refuse « %s »', (text) => {
    expect(containsContactInfo(text)).toBe(true);
  });

  const accepted = [
    'Pain artisanal local',
    'Pain frais préparé chaque matin.',
    'Orange bio de Fianarantsoa, 1 kg',
    'Sac de riz 25 kg, qualité supérieure',
    'Table 120 x 80 cm, bois massif',
    'Lot de 12 verres, 250 ml',
    'Prix 150 000 Ar le carton de 24',
    'Ref 2024-00123',
    'Boutique E2E 1793273409906',
    'Code-barres 6001234567890',
    'Téléphone portable 64 Go, écran 6,5 pouces',
  ];
  it.each(accepted)('accepte « %s »', (text) => {
    expect(containsContactInfo(text)).toBe(false);
  });

  it('ignore les valeurs non texte ou vides', () => {
    expect(containsContactInfo(undefined)).toBe(false);
    expect(containsContactInfo('')).toBe(false);
    expect(containsContactInfo(42)).toBe(false);
  });
});
