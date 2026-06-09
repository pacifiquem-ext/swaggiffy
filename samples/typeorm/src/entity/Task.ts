import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Schema } from 'swaggiffy';
import { User } from './User';

@Schema('Task')
@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @Column()
    title: string = '';

    @Column({ nullable: true })
    description: string = '';

    @Column({ default: false })
    completed: boolean = false;

    @Column()
    userId: number = 0;

    @CreateDateColumn()
    createdAt: Date = new Date();

    @ManyToOne(() => User)
    user?: User;
}
