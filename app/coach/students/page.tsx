'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, Users, BookOpen, UserPlus, UserMinus, ClipboardCheck, Clock, Zap, UserCog, LineChart, X, Video, ClipboardList } from 'lucide-react';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import { useAuth } from '@/lib/auth/context';
import { userService, onboardingService } from '@/lib/database';
import { customCurriculumService } from '@/lib/database';
import { User, OnboardingEvaluation } from '@/types';
import { toast } from 'sonner';
import { StudentSearchDialog } from '@/components/coach/student-search-dialog';

const GOLD   = '#D4A93B';
const BLUE   = '#37b5ff';

type WorkflowFilter = 'all' | 'custom' | 'automated';

interface StudentWithCurriculum {
  student: User;
  hasCurriculum: boolean;
  curriculumProgress?: { totalItems: number; completedItems: number; progressPercentage: number };
  evaluation?: OnboardingEvaluation | null;
}

export default function CoachStudentsPage() {
  const { user } = useAuth();
  const [allStudents, setAllStudents] = useState<StudentWithCurriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<User | null>(null);
  const [removing, setRemoving] = useState(false);
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>('all');

  useEffect(() => { if (user?.id) loadStudents(); }, [user?.id]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const studentsResult = await userService.getAllUsers({ role: 'student' });
      if (!studentsResult.success || !studentsResult.data) { toast.error('Failed to load goalies'); return; }

      if (user?.role === 'coach') {
        studentsResult.data.items = studentsResult.data.items.filter(s => s.assignedCoachId === user.id);
      }

      const studentsWithData: StudentWithCurriculum[] = await Promise.all(
        studentsResult.data.items.map(async student => {
          const [curriculumResult, evaluationResult] = await Promise.all([
            customCurriculumService.getStudentCurriculum(student.id),
            onboardingService.getEvaluation(student.id),
          ]);
          const result: StudentWithCurriculum = { student, hasCurriculum: false, evaluation: evaluationResult.success ? evaluationResult.data : null };
          if (curriculumResult.success && curriculumResult.data) {
            const curriculum = curriculumResult.data;
            const totalItems = curriculum.items.length;
            const completedItems = curriculum.items.filter(i => i.status === 'completed').length;
            result.hasCurriculum = true;
            result.curriculumProgress = { totalItems, completedItems, progressPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0 };
          }
          return result;
        })
      );
      setAllStudents(studentsWithData);
    } catch { toast.error('Failed to load goalies'); }
    finally { setLoading(false); }
  };

  const filteredStudents = useMemo(() => {
    if (workflowFilter === 'all') return allStudents;
    return allStudents.filter(({ student }) => student.workflowType === workflowFilter);
  }, [allStudents, workflowFilter]);

  const counts = useMemo(() => ({
    all: allStudents.length,
    custom: allStudents.filter(({ student }) => student.workflowType === 'custom').length,
    automated: allStudents.filter(({ student }) => student.workflowType === 'automated' || !student.workflowType).length,
  }), [allStudents]);

  const handleRemoveStudent = async () => {
    if (!studentToRemove || !user?.id) return;
    try {
      setRemoving(true);
      const result = await userService.removeStudentFromCoach(studentToRemove.id, user.id);
      if (result.success) { toast.success(`${studentToRemove.displayName} removed from your roster`); loadStudents(); }
      else toast.error(result.error?.message || 'Failed to remove goalie');
    } catch { toast.error('Failed to remove goalie from roster'); }
    finally { setRemoving(false); setRemoveDialogOpen(false); setStudentToRemove(null); }
  };

  const openRemoveDialog = (student: User) => { setStudentToRemove(student); setRemoveDialogOpen(true); };

  if (loading) return <SkeletonDarkPage />;

  const WORKFLOW_TABS = [
    { key: 'all' as WorkflowFilter, label: `All (${counts.all})`, icon: <Users size={14} /> },
    { key: 'custom' as WorkflowFilter, label: `Custom (${counts.custom})`, icon: <UserCog size={14} /> },
    { key: 'automated' as WorkflowFilter, label: `Automated (${counts.automated})`, icon: <Zap size={14} /> },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        .students-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px)  { .students-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .students-grid { grid-template-columns: 1fr 1fr 1fr; } }
        .students-header { padding: 20px 20px; }
        @media (min-width: 640px) { .students-header { padding: 28px 32px; } }
        .filter-tabs { flex-wrap: wrap; }
        @media (max-width: 480px) { .filter-tabs { width: 100%; } .filter-tabs button { flex: 1; justify-content: center; } }
        .card-actions { flex-direction: column; }
        @media (min-width: 380px) { .card-actions { flex-direction: row; flex-wrap: wrap; } }
      `}</style>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(14px,3vw,24px) 56px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div className="students-header" style={{ position: 'relative', borderRadius: '16px', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 50%, #0d1f40 100%)', border: '1px solid rgba(55,181,255,0.18)', boxShadow: '0 4px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(55,181,255,0.08)', filter: 'blur(70px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: GOLD, marginBottom: '6px' }}>My Goalies</p>
              <h1 style={{ fontSize: 'clamp(20px,3vw,30px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>Goalies</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>View evaluations and manage curriculum for your goalies</p>
            </div>
            {user?.role === 'coach' && workflowFilter === 'custom' && (
              <button
                onClick={() => setSearchDialogOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', background: `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)`, border: 'none', borderRadius: '12px', color: '#0c0800', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 16px rgba(212,169,59,0.3)`, whiteSpace: 'nowrap' }}
              >
                <UserPlus size={14} /> Add Goalie
              </button>
            )}
          </div>
        </div>

        {/* Workflow Filter Tabs */}
        <div className="filter-tabs" style={{ display: 'flex', gap: '6px', background: 'rgba(2,18,44,0.8)', border: `1px solid rgba(212,169,59,0.18)`, borderRadius: '12px', padding: '5px', width: 'fit-content', maxWidth: '100%' }}>
          {WORKFLOW_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setWorkflowFilter(t.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: workflowFilter === t.key ? GOLD : 'transparent',
                color: workflowFilter === t.key ? '#0c0800' : 'rgba(255,255,255,0.5)',
              }}
            >{t.icon}{t.label}</button>
          ))}
        </div>

        {/* Students Grid */}
        {filteredStudents.length === 0 ? (
          <div style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.22)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center' }}>
            <Users size={56} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              {workflowFilter === 'all' ? 'No Goalies Found' : workflowFilter === 'custom' ? 'No Custom Workflow Goalies' : 'No Automated Workflow Goalies'}
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', maxWidth: '360px', margin: '0 auto' }}>
              {workflowFilter === 'custom' ? 'Goalies with custom workflow type will appear here when assigned.' : workflowFilter === 'automated' ? 'Goalies with automated (self-paced) workflow will appear here.' : 'No goalies have registered yet.'}
            </p>
          </div>
        ) : (
          <div className="students-grid">
            {filteredStudents.map(({ student, hasCurriculum, curriculumProgress, evaluation }) => {
              const isCustomWorkflow = student.workflowType === 'custom';
              const evalStatus = evaluation?.status;
              const evalCoachReview = evaluation?.coachReview;
              const hasCompletedEvaluation = evalStatus === 'completed' || evalStatus === 'reviewed';
              const workflowColor = isCustomWorkflow ? '#f87171' : BLUE;

              return (
                <div key={student.id} style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: `1px solid rgba(212,169,59,0.18)`, borderRadius: '16px', overflow: 'hidden', transition: 'all 0.3s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,169,59,0.38)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,169,59,0.16)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                >
                  {/* Top gradient bar */}
                  <div style={{ height: '3px', background: `linear-gradient(90deg, ${GOLD}, #B8891E)` }} />

                  <div style={{ padding: '18px 20px' }}>
                    {/* Student header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* The name is the first thing anyone clicks to open a goalie, but it
                            was plain text — only the Manage Curriculum button at the bottom of
                            the card navigated. Points at the same route that button does. */}
                        <Link href={`/coach/students/${student.id}/curriculum`} style={{ textDecoration: 'none', display: 'inline-block' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '2px', transition: 'color 0.2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLHeadingElement).style.color = GOLD; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLHeadingElement).style.color = '#fff'; }}
                          >{student.displayName}</h3>
                        </Link>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{student.email}</p>
                        {student.studentNumber && (
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>ID: {student.studentNumber}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: workflowColor, background: `${workflowColor}18`, border: `1px solid ${workflowColor}30`, borderRadius: '20px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {isCustomWorkflow ? <><UserCog size={10} /> Custom</> : <><Zap size={10} /> Automated</>}
                        </span>
                        {user?.role === 'coach' && isCustomWorkflow && (
                          <button
                            onClick={() => openRemoveDialog(student)}
                            title="Remove from roster"
                            style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <UserMinus size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Evaluation status */}
                    {hasCompletedEvaluation && (
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: evalCoachReview ? '#4ade80' : '#fbbf24', background: evalCoachReview ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', border: `1px solid ${evalCoachReview ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`, borderRadius: '20px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ClipboardCheck size={10} />{evalCoachReview ? 'Evaluation Reviewed' : 'Evaluation Pending Review'}
                        </span>
                      </div>
                    )}
                    {!hasCompletedEvaluation && !student.onboardingCompleted && (
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />Awaiting Onboarding
                        </span>
                      </div>
                    )}

                    {/* Curriculum Progress */}
                    {isCustomWorkflow && (
                      hasCurriculum && curriculumProgress ? (
                        <div style={{ background: 'rgba(212,169,59,0.06)', border: '1px solid rgba(212,169,59,0.14)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Curriculum Progress</span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{curriculumProgress.progressPercentage}%</span>
                          </div>
                          <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                            <div style={{ height: '100%', borderRadius: '99px', background: `linear-gradient(90deg, ${GOLD}, #B8891E)`, width: `${curriculumProgress.progressPercentage}%`, transition: 'width 0.7s' }} />
                          </div>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{curriculumProgress.completedItems} of {curriculumProgress.totalItems} modules completed</p>
                        </div>
                      ) : (
                        <div style={{ borderRadius: '10px', border: `1px dashed rgba(212,169,59,0.2)`, padding: '10px 14px', marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>No curriculum created yet</p>
                        </div>
                      )
                    )}

                    {/* Pacing Level */}
                    {evaluation?.intelligenceProfile?.pacingLevel && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Pacing Level</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: GOLD, background: 'rgba(212,169,59,0.1)', border: '1px solid rgba(212,169,59,0.25)', borderRadius: '20px', padding: '2px 8px', textTransform: 'capitalize' }}>
                          {evaluation.intelligenceProfile.pacingLevel}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="card-actions" style={{ display: 'flex', gap: '8px' }}>
                      {hasCompletedEvaluation && (
                        <Link href={`/coach/students/${student.id}/evaluation`} style={{ textDecoration: 'none' }}>
                          <button style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'rgba(212,169,59,0.1)', border: '1px solid rgba(212,169,59,0.25)', borderRadius: '8px', color: GOLD, fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <ClipboardCheck size={12} />View Evaluation
                          </button>
                        </Link>
                      )}
                      <Link href={`/coach/students/${student.id}/charting`} style={{ textDecoration: 'none' }}>
                        <button style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <LineChart size={12} />View Charts
                        </button>
                      </Link>
                      <Link href={`/coach/students/${student.id}/videos`} style={{ textDecoration: 'none' }}>
                        <button style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'rgba(55,181,255,0.06)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '8px', color: 'rgba(55,181,255,0.8)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <Video size={12} />Videos
                        </button>
                      </Link>
                      <Link href={`/coach/students/${student.id}/responses`} style={{ textDecoration: 'none' }}>
                        <button style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'rgba(55,181,255,0.06)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '8px', color: 'rgba(55,181,255,0.8)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <ClipboardList size={12} />Quiz Answers
                        </button>
                      </Link>
                      {isCustomWorkflow && (
                        <Link href={`/coach/students/${student.id}/curriculum`} style={{ textDecoration: 'none', flex: 1 }}>
                          <button style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 12px', background: hasCurriculum ? `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)` : 'rgba(212,169,59,0.08)', border: hasCurriculum ? 'none' : '1px solid rgba(212,169,59,0.25)', borderRadius: '8px', color: hasCurriculum ? '#0c0800' : GOLD, fontSize: '11px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <BookOpen size={12} />{hasCurriculum ? 'Manage Curriculum' : 'Create Curriculum'}
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Student Dialog */}
      {user?.id && (
        <StudentSearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} coachId={user.id} onStudentAdded={loadStudents} />
      )}

      {/* Remove Student Confirm Modal */}
      {removeDialogOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '20px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: GOLD }}>Roster</p>
                <button onClick={() => setRemoveDialogOpen(false)} disabled={removing} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', marginBottom: '10px' }}>Remove Goalie from Roster</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Are you sure you want to remove <span style={{ fontWeight: 700, color: '#fff' }}>{studentToRemove?.displayName}</span> from your roster?
                They will no longer appear in your goalie list, but their curriculum progress will be preserved.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '16px 28px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRemoveDialogOpen(false)} disabled={removing} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRemoveStudent} disabled={removing} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#dc2626', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: removing ? 'not-allowed' : 'pointer', opacity: removing ? 0.7 : 1 }}>
                {removing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Removing...</> : 'Remove Goalie'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
