import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        let message: string | string[] = 'Erreur interne du serveur';
        if (exception instanceof HttpException) {
            const body = exception.getResponse();
            message = typeof body === 'string' ? body : (body as { message?: string | string[] }).message ?? message;
        }

        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url} - ${JSON.stringify(message)}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            path: request.url,
            timestamp: new Date().toISOString(),
            message,
        });
    }
}