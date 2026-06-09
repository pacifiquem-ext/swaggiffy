import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Schema } from "swaggiffy";
import { User } from "./User";

@Schema("Task")
@Entity("tasks")
export class Task {
    @PrimaryGeneratedColumn()
    id = 0;

    @Column()
    title = "";

    @Column({ nullable: true })
    description = "";

    @Column({ default: false })
    completed = false;

    @Column()
    userId = 0;

    @CreateDateColumn()
    createdAt: Date = new Date();

    @ManyToOne(() => User)
    user?: User;
}
