/**
 * Authentication Service Layer
 *
 * Provides clean business logic for authentication operations,
 * separated from UI concerns and with comprehensive error handling.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { User, RegisterCredentials, LoginCredentials } from '@/types/auth';
import {
  AuthError,
  EmailVerificationRequiredError,
  createAuthErrorFromFirebase,
  createErrorContext,
  FirestorePermissionError,
} from '@/lib/errors/auth-errors';
import { logAuthError, logInfo, logDebug } from '@/lib/errors/error-logger';
import { generateStudentId } from '@/lib/utils/student-id-generator';
import { userService } from '@/lib/database/services/user.service';
import { CURRENT_LEGAL_VERSIONS } from '@/data/legal';

/**
 * Global flag to prevent auth state listener from signing out during registration.
 * This is needed because the onAuthStateChanged listener in context.tsx
 * automatically signs out unverified users, but we need the user to stay
 * signed in briefly to create their Firestore document.
 */
export let isRegistrationInProgress = false;

/**
 * Authentication Service Interface
 */
export interface IAuthService {
  register(credentials: RegisterCredentials): Promise<User>;
  login(credentials: LoginCredentials): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  createUserFromFirebaseUser(firebaseUser: FirebaseUser): Promise<User | null>;
  updateUserLastLogin(userId: string): Promise<void>;
}

/**
 * Authentication Service Implementation
 */
export class AuthService implements IAuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user
   * Uses a two-phase approach with rollback if Firestore operations fail
   */
  public async register(credentials: RegisterCredentials): Promise<User> {
    const context = createErrorContext('register', { email: credentials.email });
    let firebaseUser: import('firebase/auth').User | null = null;

    // Set flag to prevent onAuthStateChanged from signing out unverified user
    isRegistrationInProgress = true;

    try {
      logDebug('Starting user registration', { email: credentials.email });

      // Phase 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      firebaseUser = userCredential.user;

      // Ensure auth token is ready for Firestore operations
      // This forces a token refresh which helps with timing issues
      await firebaseUser.getIdToken(true);
      logDebug('Auth token refreshed', { userId: firebaseUser.uid });

      // Phase 2: Create Firestore document and related data
      // If this fails, we'll clean up the Auth user in the catch block
      try {
        // Send email verification
        await sendEmailVerification(firebaseUser);
        logInfo('Email verification sent', { userId: firebaseUser.uid });

        // Generate unique student number for students
        let studentNumber: string | undefined;
        if (credentials.role === 'student') {
          studentNumber = await this.generateUniqueStudentNumber();
          logInfo('Generated student number', { userId: firebaseUser.uid, studentNumber });
        }

        // Generate unique coach code for coaches
        let coachCode: string | undefined;
        if (credentials.role === 'coach') {
          coachCode = await userService.generateUniqueCoachCode(credentials.displayName);
          logInfo('Generated coach code', { userId: firebaseUser.uid, coachCode });
        }

        // Create user document in Firestore
        // Build document data, excluding undefined values (Firestore doesn't accept undefined)
        const userData: Record<string, unknown> = {
          email: firebaseUser.email!,
          displayName: credentials.displayName,
          role: credentials.role,
          emailVerified: false,
          preferences: {
            notifications: true,
            theme: 'light',
            language: 'en',
            timezone: 'UTC',
            emailNotifications: {
              progress: true,
              quizResults: true,
              newContent: true,
              reminders: true,
            },
          },
          isActive: true,
          // Terms and Privacy acceptance — see the matching block in
          // src/lib/auth/context.tsx for the full reasoning.
          //
          // Kept in step with that one deliberately. This class is currently
          // reached only by its own test, while the live sign-up path runs
          // through the context, but two registration implementations that
          // disagree about what they record is exactly how a gap gets missed
          // later. Change one, change both.
          ...(credentials.agreeToTerms === true && {
            legalAcceptance: {
              termsVersion: CURRENT_LEGAL_VERSIONS.terms,
              privacyVersion: CURRENT_LEGAL_VERSIONS.privacy,
              acceptedAt: new Date(),
            },
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Add optional fields only if they have values
        if (studentNumber) {
          userData.studentNumber = studentNumber;
        }
        if (credentials.role === 'student') {
          userData.workflowType = credentials.workflowType || 'automated';
        }
        if (coachCode) {
          userData.coachCode = coachCode;
        }

        // Remove any undefined values (Firestore doesn't accept undefined)
        const cleanedUserData = Object.fromEntries(
          Object.entries(userData).filter(([_, value]) => value !== undefined)
        );

        // Debug: Log the data being written and auth state
        // eslint-disable-next-line no-console
        console.log('🔍 Auth state before Firestore write:', {
          currentUserUid: auth.currentUser?.uid,
          firebaseUserUid: firebaseUser.uid,
          isAuthenticated: !!auth.currentUser,
          emailVerified: auth.currentUser?.emailVerified,
        });

        logDebug('Creating user document', {
          uid: firebaseUser.uid,
          dataFields: Object.keys(cleanedUserData),
          role: cleanedUserData.role,
        });

        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), cleanedUserData);
          logInfo('User document created successfully', { userId: firebaseUser.uid });
        } catch (userDocError: unknown) {
          const errorMessage = userDocError instanceof Error ? userDocError.message : 'Unknown error';
          logAuthError(createAuthErrorFromFirebase(userDocError, {
            ...context,
            operation: 'create-user-document',
          }));
          // eslint-disable-next-line no-console
          console.error('Failed to create user document:', {
            uid: firebaseUser.uid,
            errorMessage,
            dataKeys: Object.keys(cleanedUserData),
          });
          throw userDocError;
        }

        // Create newUser object for return value
        const newUser: User = {
          id: firebaseUser.uid,
          ...userData,
        } as User;

        // Register coach code in the coach_codes collection (for public lookup)
        if (credentials.role === 'coach' && coachCode) {
          try {
            await userService.registerCoachCode(coachCode, firebaseUser.uid, credentials.displayName);
            logInfo('Coach code registered', { userId: firebaseUser.uid, coachCode });
          } catch (coachCodeError: unknown) {
            const errorMessage = coachCodeError instanceof Error ? coachCodeError.message : 'Unknown error';
            // eslint-disable-next-line no-console
            console.error('Failed to register coach code:', {
              coachCode,
              uid: firebaseUser.uid,
              errorMessage,
            });
            throw coachCodeError;
          }
        }

        logInfo('User profile created successfully', { userId: firebaseUser.uid });

        // Sign out the user immediately - they need to verify email first
        await firebaseSignOut(auth);
        logDebug('User signed out after registration for email verification');

        return newUser;
      } catch (firestoreError) {
        // Firestore operations failed - rollback by deleting the Auth user
        logAuthError(createAuthErrorFromFirebase(firestoreError, context));
        logInfo('Rolling back: deleting Firebase Auth user due to Firestore error', {
          userId: firebaseUser.uid,
        });

        try {
          await firebaseUser.delete();
          logInfo('Rollback successful: Firebase Auth user deleted', { userId: firebaseUser.uid });
        } catch (deleteError) {
          // If we can't delete, log it but still throw the original error
          logAuthError(createAuthErrorFromFirebase(deleteError, {
            ...context,
            operation: 'rollback-delete-user',
          }));
        }

        throw firestoreError;
      }
    } catch (error) {
      const authError = createAuthErrorFromFirebase(error, context);
      logAuthError(authError);
      throw authError;
    } finally {
      // Always reset the flag when registration completes (success or failure)
      isRegistrationInProgress = false;
    }
  }

  /**
   * Login user with email verification check
   */
  public async login(credentials: LoginCredentials): Promise<User> {
    const context = createErrorContext('login', { email: credentials.email });

    try {
      logDebug('Starting user login', { email: credentials.email });

      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const firebaseUser = userCredential.user;

      // Check email verification
      if (!firebaseUser.emailVerified) {
        await firebaseSignOut(auth);
        logInfo('Login blocked: email not verified', { userId: firebaseUser.uid });
        throw new EmailVerificationRequiredError({
          ...context,
          userId: firebaseUser.uid,
        });
      }

      // Get user profile from Firestore
      const user = await this.createUserFromFirebaseUser(firebaseUser);
      if (!user) {
        throw new FirestorePermissionError({
          ...context,
          userId: firebaseUser.uid,
        });
      }

      // Update last login time
      await this.updateUserLastLogin(user.id);

      logInfo('User login successful', { userId: user.id });
      return user;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      const authError = createAuthErrorFromFirebase(error, context);
      logAuthError(authError);
      throw authError;
    }
  }

  /**
   * Logout current user
   */
  public async logout(): Promise<void> {
    const context = createErrorContext('logout');

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        logDebug('Logging out user', { userId: currentUser.uid });
      }

      await firebaseSignOut(auth);
      logInfo('User logout successful');
    } catch (error) {
      const authError = createAuthErrorFromFirebase(error, context);
      logAuthError(authError);
      throw authError;
    }
  }

  /**
   * Get current authenticated user
   */
  public async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return null;
    }

    return this.createUserFromFirebaseUser(firebaseUser);
  }

  /**
   * Create User object from Firebase user
   */
  public async createUserFromFirebaseUser(firebaseUser: FirebaseUser): Promise<User | null> {
    const context = createErrorContext('createUserFromFirebaseUser', {
      userId: firebaseUser.uid,
    });

    try {
      // Don't attempt Firestore access for unverified users
      if (!firebaseUser.emailVerified) {
        logDebug('Skipping Firestore access for unverified user', {
          userId: firebaseUser.uid,
        });
        return null;
      }

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        logAuthError(
          new FirestorePermissionError({
            ...context,
            additionalData: { reason: 'User document not found' },
          })
        );
        return null;
      }

      const userData = userDoc.data();
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: userData.displayName || '',
        role: userData.role || 'student',
        emailVerified: firebaseUser.emailVerified,
        isActive: userData.isActive ?? true,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        lastLoginAt: userData.lastLoginAt,
        preferences: userData.preferences || {
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
      };
    } catch (error) {
      const authError = createAuthErrorFromFirebase(error, context);
      logAuthError(authError);
      return null;
    }
  }

  /**
   * Update user's last login time
   */
  public async updateUserLastLogin(userId: string): Promise<void> {
    const context = createErrorContext('updateUserLastLogin', { userId });

    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      });

      logDebug('Last login time updated', { userId });
    } catch (error) {
      // Don't throw on this failure, just log it
      const authError = createAuthErrorFromFirebase(error, context);
      logAuthError(authError);
    }
  }

  /**
   * Generate a unique student number
   * Ensures the generated ID doesn't already exist in the database
   */
  private async generateUniqueStudentNumber(): Promise<string> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const studentNumber = generateStudentId();

      // Check if this student number already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('studentNumber', '==', studentNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Unique student number found
        return studentNumber;
      }

      attempts++;
      logDebug('Student number collision, regenerating', { studentNumber, attempt: attempts });
    }

    // Fallback: This should be extremely rare given the large ID space
    throw new Error('Failed to generate unique student number after maximum attempts');
  }
}

/**
 * Default authentication service instance
 */
export const authService = AuthService.getInstance();

/**
 * Service factory for testing and dependency injection
 */
export const createAuthService = (): IAuthService => {
  return AuthService.getInstance();
};