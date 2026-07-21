import { DataTypes, Model } from "sequelize";
import { registerSchema } from "swaggiffy";
import { sequelize } from "../db";

export class Product extends Model {
    declare id: number;
    declare name: string;
    declare description: string;
    declare price: number;
    declare stock: number;
    declare userId: number;
    declare createdAt: Date;
}

Product.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT },
        price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        stock: { type: DataTypes.INTEGER, defaultValue: 0 },
        userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    },
    { sequelize, tableName: "products", timestamps: true },
);

registerSchema("Product", Product.rawAttributes, { orm: "sequelize" });
