import { Model } from 'objection';
import { Schema } from 'swaggiffy';

@Schema('User')
export class User extends Model {
    static tableName = 'users';

    id: number = 0;
    name: string = '';
    email: string = '';
    password: string = '';
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
}
