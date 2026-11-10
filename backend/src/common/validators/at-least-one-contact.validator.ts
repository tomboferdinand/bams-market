import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'AtLeastOneContact', async: false })
class AtLeastOneContactConstraint implements ValidatorConstraintInterface {
    validate(_value: unknown, args: ValidationArguments) {
        const obj = args.object as { email?: string; phone?: string };
        return Boolean(obj.email?.trim() || obj.phone?.trim());
    }

    defaultMessage() {
        return 'Un e-mail ou un numéro de téléphone est requis.';
    }
}

export function AtLeastOneContact(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'AtLeastOneContact',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: AtLeastOneContactConstraint,
        });
    };
}