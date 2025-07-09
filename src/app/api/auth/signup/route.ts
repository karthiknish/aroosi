import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { PasswordUtils } from '@/lib/utils/password';
import { JWTUtils } from '@/lib/utils/jwt';
import { apiResponse } from '@/lib/utils/apiResponse';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    // Validate input
    if (!email || !password || !fullName) {
      return NextResponse.json(
        apiResponse.error('Email, password, and full name are required', 400),
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        apiResponse.error('Invalid email format', 400),
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        apiResponse.validationError({ password: passwordValidation.errors }),
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await client.query(api.auth.getUserByEmail, { email });
    if (existingUser) {
      return NextResponse.json(
        apiResponse.error('User with this email already exists', 409),
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await PasswordUtils.hash(password);

    // Create user
    const userId = await client.mutation(api.auth.createUser, {
      email,
      passwordHash,
      fullName,
    });

    // Generate verification token
    const verificationToken = JWTUtils.generateVerificationToken({
      userId,
      email,
      type: 'email_verification',
    });

    // Store verification token in database
    await client.mutation(api.auth.createVerificationToken, {
      userId,
      token: verificationToken,
      type: 'email_verification',
    });

    // TODO: Send verification email
    // await EmailService.sendVerificationEmail(email, verificationToken);

    return NextResponse.json(
      apiResponse.success(
        { userId, email, emailVerified: false },
        'User created successfully. Please check your email for verification.'
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      apiResponse.error('Internal server error', 500),
      { status: 500 }
    );
  }
}