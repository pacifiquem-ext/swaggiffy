import { pgTable, serial, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { registerSchema } from 'swaggiffy';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const events = pgTable('events', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 255 }),
    date: timestamp('date').notNull(),
    capacity: integer('capacity').default(100),
    published: boolean('published').default(false),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
});

registerSchema('User', { id: 0, name: '', email: '', createdAt: new Date() });
registerSchema('Event', { id: 0, title: '', description: '', location: '', date: new Date(), capacity: 0, published: false, userId: 0 });
