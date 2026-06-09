import { Model } from "objection";
import { Schema } from "swaggiffy";

@Schema("Book")
export class Book extends Model {
    static tableName = "books";

    id = 0;
    title = "";
    author = "";
    isbn = "";
    year = 0;
    available = true;
    userId = 0;
    createdAt: Date = new Date();
}
