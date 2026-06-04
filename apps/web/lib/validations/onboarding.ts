import { z } from 'zod';

export const accountSetupSchema = z.object({
  displayName: z.string().min(1, 'Display name is required.').max(255),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(30, 'Username must be at most 30 characters.')
    .regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers, and underscores.'),
  language: z.enum(['EN', 'MR'], { error: 'Please select a language.' }),
  gender: z.enum(['Male', 'Female', 'other']).optional(),
  genderCustom: z.string().max(50).optional(),
  // type="date" returns "" when cleared — treat empty string same as undefined
  dob: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === '' || /^\d{4}-\d{2}-\d{2}$/.test(val),
      { message: 'Please enter a valid date in YYYY-MM-DD format.' },
    ),
});

export type AccountSetupInput = z.infer<typeof accountSetupSchema>;
