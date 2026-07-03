import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { emailService } from '@/lib/services/email.service';
import { FieldValue } from 'firebase-admin/firestore';

interface ContactFormPayload {
  name: string;
  role: string;
  organisation: string;
  location: string;
  teams: string;
  goalies: string;
  goals: string;
  email: string;
  phone: string;
  preferred_contact: string;
  consent: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactFormPayload;

    const { name, role, organisation, location, email, consent } = body;
    if (!name || !role || !organisation || !location || !email || !consent) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save to Firestore
    const docRef = await adminDb.collection('contactInquiries').add({
      ...body,
      submittedAt: FieldValue.serverTimestamp(),
      status: 'new',
    });

    // Send notification email to the team
    const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || 'goaliesmarter@gmail.com';
    await emailService.sendContactInquiryNotification({ inquiry: body, inquiryId: docRef.id, notifyEmail });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Contact form submission failed:', error);
    return NextResponse.json(
      { success: false, error: 'Submission failed. Please try again.' },
      { status: 500 }
    );
  }
}
