import { Model } from 'objection';
import { Schema } from 'swaggiffy';

@Schema('Book')
export class Book extends Model {
    static tableName = 'books';

    id: number = 0;
    title: string = '';
    author: string = '';
    isbn: string = '';
    year: number = 0;
    available: boolean = true;
    userId: number = 0;
    createdAt: Date = new Date();
}
