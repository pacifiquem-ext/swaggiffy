import { Schema } from 'swaggiffy';

@Schema('User')
export class UserSchema {
    id: number = 0;
    name: string = '';
    email: string = '';
    createdAt: Date = new Date();
}
