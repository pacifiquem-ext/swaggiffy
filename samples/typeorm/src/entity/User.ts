import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import { Schema } from "swaggiffy";

@Schema("User")
@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id = 0;

    @Column()
    name = "";

    @Column({ unique: true })
    email = "";

    @Column()
    password = "";

    @CreateDateColumn()
    createdAt: Date = new Date();
}
