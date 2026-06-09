import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { Schema } from 'swaggiffy';

@Schema('User')
@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number = 0;

    @Column()
    name: string = '';

    @Column({ unique: true })
    email: string = '';

    @Column()
    password: string = '';

    @CreateDateColumn()
    createdAt: Date = new Date();
}
