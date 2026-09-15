export type ActionState<T = null> = {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
    data?: T;
};
