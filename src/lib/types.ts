export type ActionResponse<T = Record<string, unknown>> = {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
    data?: T;
};

export type ActionState<T = Record<string, unknown>> = ActionResponse<T> | null;
