'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { User, AuthState, LoginCredentials, RegisterCredentials, ProfileUpdateData } from '../../types/auth';
import {
  createAuthErrorFromFirebase,
  createErrorContext,
  InvalidCoachCodeError,
  isAuthError,
} from '@/lib/errors/auth-errors';
import { userService } from '@/lib/database/services/user.service';
import { ProgressService } from '@/lib/database/services/progress.service';
import { normalizeCoachCode } from '@/lib/utils/coach-code-generator';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<{ userId: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: ProfileUpdateData) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });
  const isRegisteringRef = useRef(false);

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const setUser = (user: User | null) => {
    setState({
      user,
      loading: false,
      error: null,
      isAuthenticated: !!user,
    });
  };

  // Convert Firebase user to our User type
  const createUserFromFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName,
          role: userData.role || 'student',
          emailVerified: firebaseUser.emailVerified,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
          lastLoginAt: new Date(),
          preferences: userData.preferences,
          // Include student/coach specific fields from Firestore
          ...(userData.workflowType && { workflowType: userData.workflowType }),
          ...(userData.assignedCoachId && { assignedCoachId: userData.assignedCoachId }),
          ...(userData.studentNumber && { studentNumber: userData.studentNumber }),
          ...(userData.coachCode && { coachCode: userData.coachCode }),
          // Include onboarding fields
          ...(userData.onboardingCompleted !== undefined && { onboardingCompleted: userData.onboardingCompleted }),
          ...(userData.onboardingCompletedAt && { onboardingCompletedAt: userData.onboardingCompletedAt }),
          ...(userData.initialAssessmentLevel && { initialAssessmentLevel: userData.initialAssessmentLevel }),
          // Include parent-child linking fields (for students/goalies)
          ...(userData.linkedParentIds && { linkedParentIds: userData.linkedParentIds }),
          ...(userData.parentLinkCode && { parentLinkCode: userData.parentLinkCode }),
          ...(userData.parentLinkCodeExpiry && { parentLinkCodeExpiry: userData.parentLinkCodeExpiry }),
          // Include parent-specific fields
          ...(userData.linkedChildIds && { linkedChildIds: userData.linkedChildIds }),
          ...(userData.parentOnboardingComplete !== undefined && { parentOnboardingComplete: userData.parentOnboardingComplete }),
        };

        // Store profile image if available
        if (firebaseUser.photoURL) {
          user.profileImage = firebaseUser.photoURL;
        }

        return user;
      }

      // If user document doesn't exist, create it
      const newUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || '',
        role: 'student',
        emailVerified: firebaseUser.emailVerified,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          emailNotifications: {
            progress: true,
            quizResults: true,
            newContent: true,
            reminders: true,
          },
        },
      };

      // Store profile image if available
      if (firebaseUser.photoURL) {
        newUser.profileImage = firebaseUser.photoURL;
      }

      // Create the document without undefined fields
      // Don't include 'id' in the document data - it's already the document ID
      const { id, ...userDataWithoutId } = newUser;

      // Remove any undefined fields before saving to Firestore
      const docData = Object.fromEntries(
        Object.entries({
          ...userDataWithoutId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }).filter(([_key, value]) => value !== undefined)
      );

      await setDoc(userDocRef, docData);

      return newUser;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating user from Firebase user:', error);
      return null;
    }
  };

  // Login function
  const login = async (credentials: LoginCredentials) => {
    const context = createErrorContext('login', { email: credentials.email });

    try {
      setLoading(true);
      setError(null);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const user = await createUserFromFirebaseUser(userCredential.user);
      if (user) {
        // Update last login time
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        });

        // Update login streak for goalies (fire-and-forget — don't block auth flow)
        if (user.role === 'student') {
          ProgressService.updateStreak(user.id).catch(() => {});
        }
      }

      setUser(user);
    } catch (error: unknown) {
      setLoading(false);

      // If it's already an AuthError, just re-throw it
      if (isAuthError(error)) {
        throw error;
      }

      // Convert Firebase errors to AuthError
      const authError = createAuthErrorFromFirebase(error, context);
      throw authError;
    }
  };

  // Register function
  const register = async (credentials: RegisterCredentials) => {
    const context = createErrorContext('register', { email: credentials.email });
    let createdAuthUser: FirebaseUser | undefined;

    try {
      isRegisteringRef.current = true; // Prevent auth state listener from signing out
      setLoading(true);
      setError(null);

      // Validate coach code for custom workflow students BEFORE creating Firebase user
      let assignedCoachId: string | undefined;
      if (credentials.role === 'student' &&
          credentials.workflowType === 'custom' &&
          credentials.coachCode) {
        const normalizedCode = normalizeCoachCode(credentials.coachCode);
        const coachResult = await userService.getCoachByCode(normalizedCode);

        if (!coachResult.success || !coachResult.data) {
          throw new InvalidCoachCodeError(context);
        }

        assignedCoachId = coachResult.data.id;
        console.log('✅ Coach code validated, assigning to coach:', coachResult.data.displayName);
      }

      // Generate coach code for coaches BEFORE creating Firebase user
      let coachCode: string | undefined;
      if (credentials.role === 'coach') {
        coachCode = await userService.generateUniqueCoachCode(credentials.displayName);
        console.log('✅ Generated coach code:', coachCode);
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      createdAuthUser = userCredential.user;

      // Update Firebase profile
      await updateProfile(userCredential.user, {
        displayName: credentials.displayName,
      });

      // Send email verification (skip for invited coaches - they verified by clicking invitation link)
      if (!credentials.skipEmailVerification) {
        await sendEmailVerification(userCredential.user);
      }

      // Create user document in Firestore
      const newUser: User = {
        id: userCredential.user.uid,
        email: credentials.email,
        displayName: credentials.displayName,
        role: credentials.role || 'student',
        emailVerified: credentials.skipEmailVerification || false, // Invited coaches are pre-verified
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        // Add workflow type and assigned coach for students
        ...(credentials.role === 'student' && {
          workflowType: credentials.workflowType || 'automated',
          ...(assignedCoachId && { assignedCoachId }),
        }),
        // Add coach code for coaches
        ...(credentials.role === 'coach' && coachCode && { coachCode }),
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          emailNotifications: {
            progress: true,
            quizResults: true,
            newContent: true,
            reminders: true,
          },
        },
      };

      // Store profile image if available
      if (userCredential.user.photoURL) {
        newUser.profileImage = userCredential.user.photoURL;
      }

      const userDocRef = doc(db, 'users', newUser.id);
      // Create the document without undefined fields
      // Don't include 'id' in the document data - it's already the document ID
      const { id, ...userDataWithoutId } = newUser;

      // Remove any undefined fields before saving to Firestore
      const docData = Object.fromEntries(
        Object.entries({
          ...userDataWithoutId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }).filter(([_key, value]) => value !== undefined)
      );

      console.log('🔍 Creating Firestore document with data:', {
        ...docData,
        createdAt: 'Date object',
        updatedAt: 'Date object',
      });

      await setDoc(userDocRef, docData);

      console.log('✅ Firestore document created successfully');

      // Register coach code in coach_codes collection for lookup
      if (credentials.role === 'coach' && coachCode) {
        await userService.registerCoachCode(coachCode, newUser.id, credentials.displayName);
        console.log('✅ Coach code registered:', coachCode);
      }

      // Keep the user signed in so registration can immediately continue to onboarding.
      setUser(newUser);
      setLoading(false);

      // Return the user ID for flows that need it (e.g., coach invitation acceptance)
      return { userId: newUser.id };
    } catch (error: unknown) {
      setLoading(false);

      // Log the actual error for debugging
      console.error('❌ Registration error:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Error code:', (error as { code: string }).code);
      }

      // The Auth user was created but a later step (Firestore write, coach code, etc.)
      // failed — delete it so the email isn't permanently orphaned in Firebase Auth
      // with no corresponding Firestore user document.
      if (createdAuthUser) {
        try {
          await createdAuthUser.delete();
        } catch (cleanupError) {
          console.error('❌ Failed to roll back orphaned auth user:', cleanupError);
        }
      }

      // If it's already an AuthError, just re-throw it
      if (isAuthError(error)) {
        throw error;
      }

      // Convert Firebase errors to AuthError
      const authError = createAuthErrorFromFirebase(error, context);
      throw authError;
    } finally {
      isRegisteringRef.current = false; // Reset flag
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      // Navigate to landing page after successful logout
      router.push('/');
    } catch {
      throw new Error('Failed to log out');
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    const context = createErrorContext('resetPassword', { email });

    try {
      const continueUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/login`
          : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/login`;

      await sendPasswordResetEmail(auth, email, {
        url: continueUrl,
        handleCodeInApp: false,
      });
    } catch (error: unknown) {
      // Convert Firebase errors to AuthError
      const authError = createAuthErrorFromFirebase(error, context);
      throw authError;
    }
  };

  // Update user profile
  const updateUserProfile = async (data: ProfileUpdateData) => {
    if (!state.user) {
      throw new Error('No user logged in');
    }

    try {
      const userDocRef = doc(db, 'users', state.user.id);
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });

      // Update local state - only update allowed fields
      const updatedUser: User = {
        ...state.user,
        updatedAt: Timestamp.now(),
      };

      if (data.displayName !== undefined) {
        updatedUser.displayName = data.displayName;
      }
      if (data.profileImage !== undefined) {
        updatedUser.profileImage = data.profileImage;
      }
      if (data.workflowType !== undefined) {
        updatedUser.workflowType = data.workflowType;
      }
      if (data.assignedCoachId !== undefined) {
        updatedUser.assignedCoachId = data.assignedCoachId;
      }

      setUser(updatedUser);
    } catch {
      throw new Error('Failed to update profile');
    }
  };

  // Resend email verification
  const resendEmailVerification = async () => {
    if (!auth.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      await sendEmailVerification(auth.currentUser);
    } catch {
      throw new Error('Failed to send verification email');
    }
  };

  // Refresh user data from Firestore (useful after external updates like onboarding completion)
  const refreshUser = async () => {
    if (!auth.currentUser) {
      return;
    }

    try {
      const user = await createUserFromFirebaseUser(auth.currentUser);
      if (user) {
        setUser(user);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error refreshing user:', error);
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // register() creates the Firestore user document and calls setUser itself.
      // Firebase signs the new user in the moment createUserWithEmailAndPassword
      // resolves, which fires this listener before register()'s own setDoc call
      // lands — racing its write (correct role) against the fallback default
      // ('student') below and letting whichever finishes last win. Skip while a
      // registration is in flight so it can never clobber the intended role.
      if (isRegisteringRef.current) {
        return;
      }

      if (firebaseUser) {
        const user = await createUserFromFirebaseUser(firebaseUser);
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    resetPassword,
    updateUserProfile,
    resendEmailVerification,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

