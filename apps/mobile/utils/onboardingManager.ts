import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingProgress {
  completed: boolean;
  currentStep: string | null;
  completedSteps: string[];
  skippedSteps: string[];
  userData: Record<string, any>;
  startedAt: number;
  completedAt?: number;
  version: string; // For handling onboarding updates
}

export interface OnboardingConfig {
  version: string;
  steps: string[];
  requiredSteps: string[];
  skipAllowed: boolean;
}

const STORAGE_KEY = 'onboarding_progress';
const DEFAULT_CONFIG: OnboardingConfig = {
  version: '1.0.0',
  steps: ['welcome', 'features', 'profile-guidance', 'preferences'],
  requiredSteps: ['welcome'],
  skipAllowed: true,
};

class OnboardingManager {
  private config: OnboardingConfig;
  private progress: OnboardingProgress | null = null;

  constructor(config: Partial<OnboardingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize onboarding manager
   */
  async initialize(): Promise<void> {
    await this.loadProgress();
  }

  /**
   * Check if onboarding is needed
   */
  async shouldShowOnboarding(): Promise<boolean> {
    await this.loadProgress();
    
    if (!this.progress) {
      return true;
    }

    // Check if version has changed (new features)
    if (this.progress.version !== this.config.version) {
      return true;
    }

    return !this.progress.completed;
  }

  /**
   * Start onboarding flow
   */
  async startOnboarding(): Promise<OnboardingProgress> {
    const progress: OnboardingProgress = {
      completed: false,
      currentStep: this.config.steps[0] || null,
      completedSteps: [],
      skippedSteps: [],
      userData: {},
      startedAt: Date.now(),
      version: this.config.version,
    };

    await this.saveProgress(progress);
    this.progress = progress;
    
    return progress;
  }

  /**
   * Mark a step as completed
   */
  async completeStep(stepId: string, userData: Record<string, any> = {}): Promise<void> {
    if (!this.progress) {
      throw new Error('Onboarding not started');
    }

    // Add to completed steps if not already there
    if (!this.progress.completedSteps.includes(stepId)) {
      this.progress.completedSteps.push(stepId);
    }

    // Remove from skipped steps if it was there
    this.progress.skippedSteps = this.progress.skippedSteps.filter(id => id !== stepId);

    // Update user data
    this.progress.userData = { ...this.progress.userData, ...userData };

    // Move to next step
    const currentIndex = this.config.steps.indexOf(stepId);
    const nextStep = this.config.steps[currentIndex + 1];
    this.progress.currentStep = nextStep || null;

    // Check if onboarding is complete
    if (!nextStep) {
      this.progress.completed = true;
      this.progress.completedAt = Date.now();
    }

    await this.saveProgress(this.progress);
  }

  /**
   * Skip a step
   */
  async skipStep(stepId: string): Promise<void> {
    if (!this.progress) {
      throw new Error('Onboarding not started');
    }

    // Check if step can be skipped
    if (!this.config.skipAllowed || this.config.requiredSteps.includes(stepId)) {
      throw new Error(`Step ${stepId} cannot be skipped`);
    }

    // Add to skipped steps if not already there
    if (!this.progress.skippedSteps.includes(stepId)) {
      this.progress.skippedSteps.push(stepId);
    }

    // Remove from completed steps if it was there
    this.progress.completedSteps = this.progress.completedSteps.filter(id => id !== stepId);

    // Move to next step
    const currentIndex = this.config.steps.indexOf(stepId);
    const nextStep = this.config.steps[currentIndex + 1];
    this.progress.currentStep = nextStep || null;

    // Check if onboarding is complete
    if (!nextStep) {
      this.progress.completed = true;
      this.progress.completedAt = Date.now();
    }

    await this.saveProgress(this.progress);
  }

  /**
   * Go to a specific step
   */
  async goToStep(stepId: string): Promise<void> {
    if (!this.progress) {
      throw new Error('Onboarding not started');
    }

    if (!this.config.steps.includes(stepId)) {
      throw new Error(`Invalid step: ${stepId}`);
    }

    this.progress.currentStep = stepId;
    await this.saveProgress(this.progress);
  }

  /**
   * Complete onboarding entirely
   */
  async completeOnboarding(userData: Record<string, any> = {}): Promise<void> {
    if (!this.progress) {
      throw new Error('Onboarding not started');
    }

    this.progress.completed = true;
    this.progress.completedAt = Date.now();
    this.progress.currentStep = null;
    this.progress.userData = { ...this.progress.userData, ...userData };

    await this.saveProgress(this.progress);
  }

  /**
   * Reset onboarding
   */
  async resetOnboarding(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    this.progress = null;
  }

  /**
   * Get current progress
   */
  getProgress(): OnboardingProgress | null {
    return this.progress;
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    if (!this.progress) {
      return 0;
    }

    const totalSteps = this.config.steps.length;
    const completedSteps = this.progress.completedSteps.length + this.progress.skippedSteps.length;
    
    return Math.round((completedSteps / totalSteps) * 100);
  }

  /**
   * Get next step
   */
  getNextStep(): string | null {
    if (!this.progress || this.progress.completed) {
      return null;
    }

    return this.progress.currentStep;
  }

  /**
   * Get remaining steps
   */
  getRemainingSteps(): string[] {
    if (!this.progress) {
      return this.config.steps;
    }

    const processedSteps = [
      ...this.progress.completedSteps,
      ...this.progress.skippedSteps
    ];

    return this.config.steps.filter(step => !processedSteps.includes(step));
  }

  /**
   * Check if a step is completed
   */
  isStepCompleted(stepId: string): boolean {
    return this.progress?.completedSteps.includes(stepId) || false;
  }

  /**
   * Check if a step is skipped
   */
  isStepSkipped(stepId: string): boolean {
    return this.progress?.skippedSteps.includes(stepId) || false;
  }

  /**
   * Check if a step can be skipped
   */
  canSkipStep(stepId: string): boolean {
    return this.config.skipAllowed && !this.config.requiredSteps.includes(stepId);
  }

  /**
   * Get step analytics
   */
  getAnalytics() {
    if (!this.progress) {
      return null;
    }

    const duration = this.progress.completedAt 
      ? this.progress.completedAt - this.progress.startedAt
      : Date.now() - this.progress.startedAt;

    return {
      completed: this.progress.completed,
      duration: Math.round(duration / 1000), // in seconds
      completedSteps: this.progress.completedSteps.length,
      skippedSteps: this.progress.skippedSteps.length,
      totalSteps: this.config.steps.length,
      completionPercentage: this.getCompletionPercentage(),
      version: this.progress.version,
    };
  }

  /**
   * Load progress from storage
   */
  private async loadProgress(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.progress = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
      this.progress = null;
    }
  }

  /**
   * Save progress to storage
   */
  private async saveProgress(progress: OnboardingProgress): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OnboardingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const onboardingManager = new OnboardingManager();