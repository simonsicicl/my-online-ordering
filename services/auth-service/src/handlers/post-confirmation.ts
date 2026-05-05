import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { db } from '../lib/db';
import { users, userProfiles } from '../db/schema';
import { UserRole } from '@myordering/shared-types';

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const { sub, email, name } = event.request.userAttributes;

  console.log(JSON.stringify({ level: 'info', message: 'post-confirmation trigger fired', userId: sub, email }));

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id:            sub,
      email:         email ?? '',
      name:          name ?? email ?? '',
      emailVerified: true,
      phoneVerified: false,
      globalRole:    UserRole.USER,
    }).onConflictDoNothing(); // idempotent — safe to re-run

    await tx.insert(userProfiles).values({
      userId:      sub,
      preferences: {
        notifications: { email: true, sms: false, push: true },
        language:      'en',
      },
    }).onConflictDoNothing();
  });

  return event;
};
