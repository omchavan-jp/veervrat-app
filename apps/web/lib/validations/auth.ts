import { z } from 'zod';
import { meetsMinimumAge } from '@/lib/age';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(255),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only'),
  email: z.email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  language: z.enum(['EN', 'MR']),
  // Checked here so the person is told immediately, and again on the server, which is the actual
  // gate. See lib/age.ts.
  dob: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((v) => meetsMinimumAge(v), 'Veervrat is for adults aged 18 and over'),
  // Acceptance is recorded per document version. The wording and the documents themselves come
  // from the terms and privacy work; this is the mechanism, which cannot be added afterwards
  // because who agreed to what is unreconstructable.
  acceptedTerms: z.literal(true, { message: 'Please accept the terms to continue' }),
});

/**
 * What the Google route needs. Google supplies the display name, email address and the
 * credential; everything here is the person's own choice — including the username, so their
 * public identifier is not silently derived from their email address.
 */
export const googleSignupSchema = signupSchema.pick({
  username: true,
  dob: true,
  acceptedTerms: true,
  language: true,
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const onboardingSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(255),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/),
  language: z.enum(['EN', 'MR']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
