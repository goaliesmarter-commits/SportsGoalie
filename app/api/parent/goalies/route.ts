import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { generateLoginHandle, handleToEmail } from '@/lib/auth/child-account';
import { verifyParentRequest } from '@/lib/auth/parent-request';
import { calculateAge, getAgeBracket, parseDateOfBirth } from '@/lib/auth/signup-policy';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { createChildAccountSchema } from '@/lib/validation/child-account';
import { CURRENT_LEGAL_VERSIONS } from '@/data/legal';
import { generateStudentId } from '@/lib/utils/student-id-generator';
import { logger } from '@/lib/utils/logger';

/**
 * The under-age path (Michael's item 6c).
 *
 *   POST /api/parent/goalies — a parent creates a goalie account they hold
 *
 * This runs on the server rather than in the browser for two reasons, either
 * of which rules out the client SDK on its own:
 *
 * 1. `createUserWithEmailAndPassword` signs the new user in. Called from the
 *    parent's browser it would sign the parent *out* and leave them logged in
 *    as their own child, halfway through the form.
 *
 * 2. The account this creates is one the parent holds and consented to. Who
 *    consented cannot be taken from the request body — it is read from the
 *    verified token and the server's own copy of the parent's record.
 *
 * Everything the account needs is written here in one place, because a goalie
 * who exists in Firebase Auth but not in Firestore cannot log in and cannot be
 * found by anyone to fix. If any step after the auth user fails, the auth user
 * is deleted again.
 */

const HANDLE_ATTEMPTS = 5;
const STUDENT_NUMBER_ATTEMPTS = 5;

function isEmailTaken(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'auth/email-already-exists'
  );
}

/** A student number nothing else is using. */
async function allocateStudentNumber(): Promise<string> {
  for (let attempt = 0; attempt < STUDENT_NUMBER_ATTEMPTS; attempt++) {
    const candidate = generateStudentId();
    const clash = await adminDb
      .collection('users')
      .where('studentNumber', '==', candidate)
      .limit(1)
      .get();
    if (clash.empty) return candidate;
  }
  // Five collisions on a 31^8 space means something else is wrong. A goalie
  // with a possibly-duplicate display number is still a working account, so it
  // is not worth failing the whole request over.
  return generateStudentId();
}

export async function POST(request: NextRequest) {
  const auth = await verifyParentRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = createChildAccountSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: first?.message ?? 'Please check the details and try again',
        field: first?.path?.[0],
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Re-derived here rather than trusted from the request. The schema has
  // already established the date is real and under the threshold; this is the
  // value that gets written down.
  const dob = parseDateOfBirth(data.dateOfBirth);
  if (!dob) {
    return NextResponse.json(
      { success: false, error: 'Please enter a real date of birth' },
      { status: 400 }
    );
  }
  const age = calculateAge(dob);

  const usesHandle = data.loginMethod === 'handle';
  let loginHandle: string | undefined = usesHandle
    ? generateLoginHandle(data.displayName)
    : undefined;
  let loginEmail = loginHandle ? handleToEmail(loginHandle) : (data.email ?? '').trim().toLowerCase();

  // Create the auth user. A handle collision is expected occasionally — four
  // characters is short — so a taken handle is regenerated rather than shown to
  // the parent as an error they can do nothing about.
  let childId: string | null = null;
  const attempts = usesHandle ? HANDLE_ATTEMPTS : 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const created = await adminAuth.createUser({
        email: loginEmail,
        password: data.password,
        displayName: data.displayName,
        emailVerified: false,
      });
      childId = created.uid;
      break;
    } catch (error) {
      if (isEmailTaken(error) && usesHandle && attempt < attempts - 1) {
        loginHandle = generateLoginHandle(data.displayName);
        loginEmail = handleToEmail(loginHandle);
        continue;
      }
      if (isEmailTaken(error)) {
        return NextResponse.json(
          {
            success: false,
            error: usesHandle
              ? 'Could not create a login name for this goalie. Please try again.'
              : 'That email address already has an account. If it belongs to your goalie, link it instead using their link code.',
            field: usesHandle ? undefined : 'email',
          },
          { status: 409 }
        );
      }
      logger.error('Failed to create goalie auth user', 'Parent-Goalies-API', { error });
      return NextResponse.json(
        { success: false, error: 'Could not create the account. Please try again.' },
        { status: 500 }
      );
    }
  }

  if (!childId) {
    return NextResponse.json(
      { success: false, error: 'Could not create the account. Please try again.' },
      { status: 500 }
    );
  }

  try {
    const now = Timestamp.now();
    const studentNumber = await allocateStudentNumber();

    const childDoc: Record<string, unknown> = {
      email: loginEmail,
      displayName: data.displayName,
      role: 'student',
      studentNumber,
      workflowType: 'automated',
      // Never true for a handle account, and not true for an email account
      // either — nobody has clicked anything yet.
      emailVerified: false,
      isActive: true,
      dateOfBirth: data.dateOfBirth,
      ageBracket: getAgeBracket(age),
      accountHolderId: auth.uid,
      linkedParentIds: [auth.uid],
      // The consent record. Michael's model is that the parent consents and the
      // child does the work, so this is the account's whole legal basis —
      // written in the same breath as the account itself, never after.
      parentalConsent: {
        consentedByUserId: auth.uid,
        consentedByName: auth.displayName,
        consentedByEmail: auth.email,
        relationship: data.relationship,
        termsVersion: CURRENT_LEGAL_VERSIONS.terms,
        privacyVersion: CURRENT_LEGAL_VERSIONS.privacy,
        ageAtConsent: age,
        consentedAt: now,
      },
      // Deliberately no `legalAcceptance`: the goalie has agreed to nothing.
      // Recording the parent's consent as though it were the goalie's own
      // agreement is the one thing this record must not do.
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en',
        timezone: 'UTC',
        emailNotifications: {
          progress: true,
          quizResults: true,
          newContent: true,
          reminders: true,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    if (loginHandle) childDoc.loginHandle = loginHandle;

    // One batch: either the goalie, the link and the parent's roster all move
    // together, or none of them do. A link pointing at a goalie record that was
    // never written is worse than no link at all.
    const batch = adminDb.batch();
    batch.set(adminDb.collection('users').doc(childId), childDoc);
    batch.set(adminDb.collection('parentLinks').doc(), {
      parentId: auth.uid,
      childId,
      linkedAt: now,
      linkedBy: 'parent_created',
      status: 'active',
      relationship: data.relationship,
      createdAt: now,
      updatedAt: now,
    });
    batch.update(adminDb.collection('users').doc(auth.uid), {
      linkedChildIds: FieldValue.arrayUnion(childId),
      updatedAt: now,
    });
    await batch.commit();

    logger.info('Parent created a goalie account', 'Parent-Goalies-API', {
      parentId: auth.uid,
      childId,
      ageAtConsent: age,
      loginMethod: data.loginMethod,
    });

    return NextResponse.json({
      success: true,
      goalie: {
        id: childId,
        displayName: data.displayName,
        studentNumber,
        loginEmail,
        loginHandle: loginHandle ?? null,
      },
    });
  } catch (error) {
    // The auth user exists but its record does not, which is an account nobody
    // can log into and nobody can find. Undo it rather than leave it behind.
    logger.error('Failed to write goalie record; rolling back auth user', 'Parent-Goalies-API', {
      childId,
      error,
    });
    try {
      await adminAuth.deleteUser(childId);
    } catch (cleanupError) {
      logger.error('Rollback of goalie auth user failed', 'Parent-Goalies-API', {
        childId,
        cleanupError,
      });
    }
    return NextResponse.json(
      { success: false, error: 'Could not create the account. Please try again.' },
      { status: 500 }
    );
  }
}
