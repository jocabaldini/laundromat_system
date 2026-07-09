// Defines the minimum contract for all repositories in this project.
// Services depend on this interface, not on concrete implementations.
export interface IBaseRepository<T, CreateDto, UpdateDto> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(dto: CreateDto): Promise<T>;
  update(id: string, dto: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
}
