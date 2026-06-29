import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { registerSchema } from "swaggiffy";
import { User } from "./User";

@Entity("tasks")
export class Task {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @Column()
    title: string = "";

    @Column({ nullable: true })
    description: string = "";

    @Column({ default: false })
    completed: boolean = false;

    @Column()
    userId: number = 0;

    @CreateDateColumn()
    createdAt: Date = new Date();

    @ManyToOne(() => User)
    user?: User;
}

registerSchema("Task", Task, { orm: "typeorm" });
