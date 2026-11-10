import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        if (process.env.SMTP_HOST) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT ?? 587),
                secure: false,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
        }
    }

    private frontendUrl() {
        return (process.env.FRONTEND_URL ?? '').replace(/\/+$/, '');
    }

    /**
     * Envoie un e-mail. Ne lève jamais d'exception : renvoie false si l'envoi échoue, pour qu'un incident
     * de messagerie ne casse pas l'inscription ou la connexion. Sans SMTP configuré (développement),
     * le lien est écrit dans la console du serveur.
     */
    private async send(to: string, subject: string, html: string, devText: string): Promise<boolean> {
        if (!this.transporter) {
            this.logger.warn(`[MODE DEV - aucun SMTP configuré] ${devText}`);
            return true;
        }
        try {
            await this.transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
            return true;
        } catch (err) {
            this.logger.error(`Envoi d'e-mail impossible (${subject}) : ${(err as Error).message}`);
            return false;
        }
    }

    sendVerificationEmail(to: string, token: string): Promise<boolean> {
        const link = `${this.frontendUrl()}/verification-email?token=${token}`;
        return this.send(
            to,
            "Vérifiez votre adresse e-mail - Bam'S Market",
            `<p>Bonjour,</p><p>Cliquez sur ce lien pour vérifier votre compte Bam'S Market :</p><p><a href="${link}">${link}</a></p><p>Ce lien expire dans 24 h.</p>`,
            `Lien de vérification pour ${to} :\n${link}`,
        );
    }

    sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
        const link = `${this.frontendUrl()}/reinitialiser-mot-de-passe?token=${token}`;
        return this.send(
            to,
            "Réinitialisation de votre mot de passe - Bam'S Market",
            `<p>Bonjour,</p><p>Vous avez demandé à réinitialiser votre mot de passe Bam'S Market. Cliquez sur ce lien :</p><p><a href="${link}">${link}</a></p><p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.</p>`,
            `Lien de réinitialisation pour ${to} :\n${link}`,
        );
    }

    /** Approbation : le rôle ne change qu'au clic sur ce lien (prouve que le demandeur contrôle son e-mail). */
    sendRoleActivationEmail(to: string, token: string, role: string): Promise<boolean> {
        const roleLabel = role === 'COMMERCANT' ? 'commerçant' : 'livreur';
        const link = `${this.frontendUrl()}/activer-role?token=${token}`;
        return this.send(
            to,
            "Activez votre espace - Bam'S Market",
            `<p>Bonjour,</p><p>Bonne nouvelle : votre demande pour devenir <strong>${roleLabel}</strong> sur Bam'S Market est approuvée.</p><p>Cliquez sur ce lien pour activer votre nouvel espace :</p><p><a href="${link}">${link}</a></p><p>Ce lien est valable 7 jours. Tant que vous ne l'avez pas ouvert, votre compte reste un compte client.</p>`,
            `Lien d'activation (${roleLabel}) pour ${to} :\n${link}`,
        );
    }

    /** Refus de l'administrateur, avec le motif. */
    sendRoleRequestRefusedEmail(to: string, role: string, reason?: string | null): Promise<boolean> {
        const roleLabel = role === 'COMMERCANT' ? 'commerçant' : 'livreur';
        const reasonHtml = reason ? `<p>Motif : ${reason.replace(/</g, '&lt;')}</p>` : '';
        return this.send(
            to,
            "Votre demande n'a pas été retenue - Bam'S Market",
            `<p>Bonjour,</p><p>Votre demande pour devenir <strong>${roleLabel}</strong> sur Bam'S Market n'a pas été retenue.</p>${reasonHtml}<p>Vous pouvez déposer une nouvelle demande depuis votre profil.</p>`,
            `Demande refusée (${roleLabel}) pour ${to} : ${reason ?? ''}`,
        );
    }

    /** Alerte de sécurité après chaque retrait (créé, réussi, échoué ou en cours). */
    sendPayoutEmail(
        to: string,
        payout: { amount: number; fees: number; phone: string; status: 'REUSSI' | 'ECHOUE' | 'EN_ATTENTE' },
    ): Promise<boolean> {
        const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\u202f|\u00a0/g, ' ');
        const lines: Record<typeof payout.status, string> = {
            REUSSI: `Votre retrait de <strong>${fmt(payout.amount)} Ar</strong> vers le <strong>${payout.phone}</strong> a été effectué (frais : ${fmt(payout.fees)} Ar).`,
            ECHOUE: `Votre retrait de <strong>${fmt(payout.amount)} Ar</strong> vers le <strong>${payout.phone}</strong> a échoué. Le montant, frais compris, a été recrédité sur votre solde.`,
            EN_ATTENTE: `Votre retrait de <strong>${fmt(payout.amount)} Ar</strong> vers le <strong>${payout.phone}</strong> est en cours de traitement (frais : ${fmt(payout.fees)} Ar).`,
        };
        return this.send(
            to,
            "Retrait sur votre portefeuille - Bam'S Market",
            `<p>Bonjour,</p><p>${lines[payout.status]}</p><p>Si vous n'êtes pas à l'origine de ce retrait, changez immédiatement votre mot de passe et contactez l'administration.</p>`,
            `Retrait ${payout.status} de ${payout.amount} Ar vers ${payout.phone} pour ${to}`,
        );
    }

    /** Le numéro de retrait a été changé par l'administration : le titulaire en est toujours informé. */
    sendPayoutPhoneChangedEmail(to: string, newPhone: string): Promise<boolean> {
        return this.send(
            to,
            "Votre numéro de retrait a été modifié - Bam'S Market",
            `<p>Bonjour,</p><p>L'administration a modifié votre numéro de retrait. Vos prochains retraits seront envoyés au <strong>${newPhone}</strong>.</p><p>Si vous n'êtes pas à l'origine de cette modification, contactez l'administration.</p>`,
            `Numéro de retrait changé en ${newPhone} pour ${to}`,
        );
    }
}
