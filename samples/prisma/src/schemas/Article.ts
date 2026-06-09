import { Schema } from 'swaggiffy';

@Schema('Article')
export class ArticleSchema {
    id: number = 0;
    title: string = '';
    content: string = '';
    published: boolean = false;
    authorId: number = 0;
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
}
