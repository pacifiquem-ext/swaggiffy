import { Schema } from "swaggiffy";

@Schema("Article")
export class ArticleSchema {
    id = 0;
    title = "";
    content = "";
    published = false;
    authorId = 0;
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
}
