export interface IBaseRepository<T, CreateInput, UpdateInput> {
    findById(id: string): Promise<T | null>;
    findMany(filter?: any): Promise<T[]>;
    create(data: CreateInput): Promise<T>;
    update(id: string, data: UpdateInput): Promise<T>;
    delete(id: string): Promise<T>;
}
