/**
 * Icebreaker Types - Shared between web and mobile
 */

export interface Icebreaker {
    id: string;
    question: string;
    /** Alias for backward compatibility */
    text?: string;
    category: string;
    isActive?: boolean;
}

export interface IcebreakerCategory {
    id: string;
    name: string;
    emoji?: string;
    /** Alias for backward compatibility */
    icon?: string;
    questions: Icebreaker[];
    count?: number;
}

export interface IcebreakerAnswer {
    id: string;
    icebreakerRef: string;
    /** Alias for backward compatibility */
    questionId?: string;
    question: string;
    answer: string;
    userId: string;
    createdAt: Date | string;
    /** Alias for backward compatibility */
    answeredAt?: Date | string;
}
