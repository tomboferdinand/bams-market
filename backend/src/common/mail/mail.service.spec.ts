import { MailService } from './mail.service';

describe('MailService', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  const make = () => {
    delete process.env.SMTP_HOST;
    process.env.FRONTEND_URL = 'http://localhost:3001/';
    return new MailService();
  };

  it('sans SMTP (développement), n’envoie rien mais réussit', async () => {
    const service = make();
    expect(await service.sendVerificationEmail('a@b.mg', 'tok')).toBe(true);
  });

  it('renvoie false (sans lever d’exception) si l’envoi échoue', async () => {
    const service = make();
    (service as any).transporter = { sendMail: jest.fn().mockRejectedValue(new Error('535 Invalid login')) };
    expect(await service.sendVerificationEmail('a@b.mg', 'tok')).toBe(false);
    expect(await service.sendPasswordResetEmail('a@b.mg', 'tok')).toBe(false);
  });

  it('construit des liens corrects, sans double barre', async () => {
    const service = make();
    const sendMail = jest.fn().mockResolvedValue({});
    (service as any).transporter = { sendMail };
    await service.sendVerificationEmail('a@b.mg', 'tok1');
    await service.sendPasswordResetEmail('a@b.mg', 'tok2');
    expect(sendMail.mock.calls[0][0].html).toContain('http://localhost:3001/verification-email?token=tok1');
    expect(sendMail.mock.calls[1][0].html).toContain('http://localhost:3001/reinitialiser-mot-de-passe?token=tok2');
    expect(sendMail.mock.calls[1][0].to).toBe('a@b.mg');
  });
});
