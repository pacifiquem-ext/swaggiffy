import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import { registerSchema } from "swaggiffy";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @Column()
    name: string = "";

    @Column({ unique: true })
    email: string = "";

    @Column()
    password: string = "";

    @CreateDateColumn()
    createdAt: Date = new Date();
}

registerSchema("User", User, { orm: "typeorm" });
