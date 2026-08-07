export type EventHandler<T = any> = (event: T) => Promise<void>;

export interface EventEmitter {
    on<T>(event: string, handler: EventHandler<T>): void;
    off<T>(event: string, handler: EventHandler<T>): void;
    emit<T>(event: string, data: T): Promise<void>;
}

export interface DomainEvent<T = any> {
    type: string;
    payload: T;
    timestamp: Date;
    correlationId?: string;
}

export class InMemoryEventEmitter implements EventEmitter {
    private handlers: Map<string, Set<EventHandler<any>>> = new Map();

    on<T>(event: string, handler: EventHandler<T>): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
    }

    off<T>(event: string, handler: EventHandler<T>): void {
        const eventHandlers = this.handlers.get(event);
        if (eventHandlers) {
            eventHandlers.delete(handler);
        }
    }

    async emit<T>(event: string, data: T): Promise<void> {
        const eventHandlers = this.handlers.get(event);
        if (!eventHandlers || eventHandlers.size === 0) {
            return;
        }

        const domainEvent: DomainEvent<T> = {
            type: event,
            payload: data,
            timestamp: new Date(),
        };

        const promises = Array.from(eventHandlers).map(handler => 
            handler(domainEvent).catch(error => {
                console.error(`Error in event handler for ${event}:`, error);
            })
        );

        await Promise.all(promises);
    }
}

export const eventEmitter = new InMemoryEventEmitter();