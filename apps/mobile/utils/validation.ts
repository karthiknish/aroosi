export const ValidationRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
  },
  
  fullName: {
    required: 'Full name is required',
    minLength: {
      value: 2,
      message: 'Name must be at least 2 characters',
    },
    maxLength: {
      value: 50,
      message: 'Name cannot exceed 50 characters',
    },
  },
  
  aboutMe: {
    required: 'About me is required',
    minLength: {
      value: 50,
      message: 'Please write at least 50 characters about yourself',
    },
    maxLength: {
      value: 500,
      message: 'About me cannot exceed 500 characters',
    },
  },
  
  dateOfBirth: {
    required: 'Date of birth is required',
    validate: (value: string) => {
      const age = calculateAge(value);
      if (age < 18) return 'You must be at least 18 years old';
      if (age > 100) return 'Please enter a valid date of birth';
      return true;
    },
  },
  
  city: {
    required: 'City is required',
    minLength: {
      value: 2,
      message: 'City name must be at least 2 characters',
    },
  },
  
  occupation: {
    required: 'Occupation is required',
    minLength: {
      value: 2,
      message: 'Occupation must be at least 2 characters',
    },
  },
  
  education: {
    required: 'Education is required',
  },
  
  height: {
    required: 'Height is required',
  },
  
  maritalStatus: {
    required: 'Marital status is required',
  },
  
  phoneNumber: {
    pattern: {
      value: /^(\+44|0)[1-9]\d{8,9}$/,
      message: 'Please enter a valid UK phone number',
    },
  },
  
  postcode: {
    pattern: {
      value: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
      message: 'Please enter a valid UK postcode',
    },
  },
};

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export function validateImageFile(file: any): string | null {
  if (!file) return 'Please select an image';
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Please select a valid image file (JPEG, PNG, or WebP)';
  }
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return 'Image size must be less than 10MB';
  }
  
  return null;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>'"&]/g, '');
}

export function isValidAge(age: number): boolean {
  return age >= 18 && age <= 100;
}

export function formatValidationError(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'Validation error';
}