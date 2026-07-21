import { DataTypes, Model } from "sequelize";
import { registerSchema } from "swaggiffy";
import { sequelize } from "../db";

export class User extends Model {
    declare id: number;
    declare name: string;
    declare email: string;
    declare password: string;
    declare createdAt: Date;
}

User.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        password: { type: DataTypes.STRING(255), allowNull: false },
    },
    { sequelize, tableName: "users", timestamps: true },
);

registerSchema("User", User.rawAttributes, { orm: "sequelize" });
