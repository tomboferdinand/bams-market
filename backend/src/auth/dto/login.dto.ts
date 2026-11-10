import { IsString } from 'class-validator';

export class LoginDto {
    @IsString()
    identifier!: string; // email OU téléphone

    @IsString()
    password!: string;
}