'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { StandaloneVideoQuizPlayer } from '@/components/quiz/StandaloneVideoQuizPlayer';
import { videoQuizService } from '@/lib/database/services/video-quiz.service';
import { customContentService } from '@/lib/database/services/custom-content.service';
import { customCurriculumService } from '@/lib/database/services/custom-curriculum.service';
import { ProgressService } from '@/lib/database/services/progress.service';
import { VideoQuiz, VideoQuizProgress } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const BLUE = '#37b5ff';

function VideoQuizPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<VideoQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Keyed on the id, not the user object: the auth context hands out a new object
    // whenever it refreshes, and reloading here would remount the player and drop a
    // goalie back to the start of a check they were part way through.
    if (quizId && user?.id) {
      loadQuizData();
    } else {
      // Never leave the page on a skeleton with no way out.
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, user?.id]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      setError(null);

      let actualQuizId = quizId;

      if (quizId.startsWith('content_')) {
        const contentResult = await customContentService.getContent(quizId);
        if (!contentResult.success || !contentResult.data) {
          setError('Content not found');
          toast.error('Content not found');
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }
        try {
          const contentData = JSON.parse(contentResult.data.content);
          if (contentData.videoQuizId) {
            actualQuizId = contentData.videoQuizId;
          } else {
            setError('Invalid quiz reference');
            toast.error('Invalid quiz reference');
            setTimeout(() => router.push('/dashboard'), 2000);
            return;
          }
        } catch {
          setError('Invalid quiz data');
          toast.error('Invalid quiz data');
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }
      }

      const quizResult = await videoQuizService.getVideoQuiz(actualQuizId);
      if (!quizResult.success || !quizResult.data) {
        setError('Video quiz not found');
        toast.error('Video quiz not found');
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      const quizData = quizResult.data;
      if (!quizData.questions) {
        console.error('❌ No questions field in quiz data');
        quizData.questions = [];
      } else if (!Array.isArray(quizData.questions)) {
        console.error('❌ Questions field is not an array:', typeof quizData.questions);
        quizData.questions = [];
      }

      setQuiz(quizData);
    } catch (error) {
      console.error('Error loading quiz:', error);
      setError('Failed to load video quiz');
      toast.error('Failed to load video quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = async (progress: VideoQuizProgress) => {
    try {
      const result = await videoQuizService.completeQuiz(progress);
      if (result.success) {
        if (user && quiz) {
          await ProgressService.recordQuizCompletion(
            user.id, quizId, quiz.skillId || '', quiz.sportId || '',
            progress.percentage, progress.timeSpent || 0,
            progress.percentage >= (quiz.settings?.passingScore || 70)
          );
          if (quizId.startsWith('content_')) {
            await customCurriculumService.markItemCompleteByContentId(user.id, quizId);
          }
        }
        toast.success('Video quiz completed!', { description: `You scored ${progress.percentage.toFixed(1)}%` });
        setTimeout(() => { router.push(`/quiz/video/${quizId}/results`); }, 500);
      } else {
        toast.error('Failed to save quiz results');
      }
    } catch (error) {
      console.error('Error completing quiz:', error);
      toast.error('Failed to complete quiz');
    }
  };

  if (loading) {
    return <div style={{ minHeight: '60vh', padding: '24px' }}><SkeletonContentPage /></div>;
  }

  if (error || !quiz || !user) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '400px', background: 'rgba(2,18,44,0.9)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', marginBottom: '20px' }}>{error || 'Video quiz not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(55,181,255,0.2)', background: 'linear-gradient(135deg, #000f28 0%, #062344 50%, #0a1628 100%)', padding: '24px', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(55,181,255,0.1)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(248,113,113,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <Link
          href="/dashboard"
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', marginBottom: '16px', fontWeight: 600 }}
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>
        <h1 style={{ position: 'relative', color: '#fff', fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.02em' }}>{quiz.title}</h1>
        {quiz.description && (
          <p style={{ position: 'relative', color: BLUE, fontSize: '14px', opacity: 0.8 }}>{quiz.description}</p>
        )}
      </div>

      <StandaloneVideoQuizPlayer quiz={quiz} userId={user.id} onComplete={handleQuizComplete} />
    </div>
  );
}

export default function VideoQuizPage() {
  return (
    <ProtectedRoute>
      <VideoQuizPageContent />
    </ProtectedRoute>
  );
}
