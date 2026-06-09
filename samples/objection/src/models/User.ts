import { Model } from "objection";
import { Schema } from "swaggiffy";

@Schema("User")
export class User extends Model {
    static tableName = "users";

    id = 0;
    name = "";
    email = "";
    password = "";
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
}
