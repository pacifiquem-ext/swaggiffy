import { Schema } from "swaggiffy";

@Schema("User")
export class UserSchema {
    id = 0;
    name = "";
    email = "";
    createdAt: Date = new Date();
}
