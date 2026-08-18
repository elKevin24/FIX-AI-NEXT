import { Customer, Part, User, Ticket } from '@prisma/client';
import { IBaseRepository } from './base.repository';

export interface ICustomerRepository extends IBaseRepository<Customer, any, any> {
    findByIdWithTickets(id: string): Promise<(Customer & { tickets: { id: string }[] }) | null>;
    findFirst(filter?: any): Promise<Customer | null>;
}

export interface IPartRepository extends IBaseRepository<Part, any, any> {
    findByIdWithUsages(id: string): Promise<(Part & { usages: { id: string }[] }) | null>;
}

export interface IUserRepository extends IBaseRepository<User, any, any> {
    findByEmail(email: string): Promise<User | null>;
    count(filter?: any): Promise<number>;
}

export interface ITicketRepository extends IBaseRepository<Ticket, any, any> {
    findByIdWithRelations(id: string): Promise<any | null>;
}
