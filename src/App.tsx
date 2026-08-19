import { Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import { ClassProvider } from './context/ClassContext';
import { useLocale } from './context/LocaleContext';
import Layout from './components/Layout';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import StudentDashboard from './pages/StudentDashboard';
import StudentHistory from './pages/StudentHistory';
import StudentProgress from './pages/StudentProgress';
import TeacherAnalytics from './pages/TeacherAnalytics';
import ReportCard from './pages/ReportCard';
import ExerciseWorkspace from './pages/ExerciseWorkspace';
import Playground from './pages/Playground';
import SubmissionDetail from './pages/SubmissionDetail';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherReview from './pages/TeacherReview';
import ClassProgress from './pages/ClassProgress';
import TeacherExercises from './pages/TeacherExercises';
import TeacherClasses from './pages/TeacherClasses';
import EvaluatorConsole from './pages/EvaluatorConsole';
import Settings from './pages/Settings';
import type { Role } from './types';

/** Where each role lands, and where a role-mismatched route sends them back. */
const HOME: Record<Role, string> = {
  student: '/',
  teacher: '/teacher',
};

/**
 * Route protection is a convenience, not the security boundary — a student who
 * edits the URL is stopped by database rules, not by this component. It exists
 * so the wrong role sees their own dashboard instead of a page of denied reads.
 */
function Protected({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { session } = useSession();
  if (!session) return <Navigate to="/signin" replace />;
  if (!roles.includes(session.role)) return <Navigate to={HOME[session.role]} replace />;
  return <>{children}</>;
}

function Home() {
  const { session } = useSession();
  if (!session) return <Navigate to="/signin" replace />;
  if (session.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <StudentDashboard />;
}

function Splash() {
  const { t } = useLocale();
  return (
    <div className="grid min-h-full place-items-center">
      <div className="flex items-center gap-3 text-sm text-ink-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-indigo-500" />
        {t('layout.checkingSession')}
      </div>
    </div>
  );
}

function AppRoutes() {
  const { session, loading } = useSession();

  // Every route below depends on the role, and the role arrives with the
  // profile. Rendering before it lands would bounce a signed-in teacher
  // through /signin on every refresh.
  if (loading) return <Splash />;

  return (
    <Routes>
      <Route path="/signin" element={session ? <Navigate to="/" replace /> : <SignIn />} />
      <Route path="/signup" element={session ? <Navigate to="/" replace /> : <SignUp />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        <Route
          path="/exercise/:exerciseId"
          element={
            <Protected roles={['student']}>
              <ExerciseWorkspace />
            </Protected>
          }
        />
        <Route
          path="/history"
          element={
            <Protected roles={['student']}>
              <StudentHistory />
            </Protected>
          }
        />
        <Route
          path="/progress"
          element={
            <Protected roles={['student']}>
              <StudentProgress />
            </Protected>
          }
        />
        {/*
          Open to both roles: a teacher setting an exercise wants the same
          scratch space, and nothing here is graded or recorded.
        */}
        <Route
          path="/playground"
          element={
            <Protected roles={['student', 'teacher']}>
              <Playground />
            </Protected>
          }
        />
        <Route
          path="/submission/:submissionId"
          element={
            <Protected roles={['student', 'teacher']}>
              <SubmissionDetail />
            </Protected>
          }
        />
        {/*
          A student reaching this route is redirected to their own report by the
          page itself; a teacher may open any student's. The rules are what stop
          a student reading someone else's data, not this line.
        */}
        <Route
          path="/report/:studentId"
          element={
            <Protected roles={['student', 'teacher']}>
              <ReportCard />
            </Protected>
          }
        />

        <Route
          path="/teacher/analytics"
          element={
            <Protected roles={['teacher']}>
              <TeacherAnalytics />
            </Protected>
          }
        />
        <Route
          path="/teacher"
          element={
            <Protected roles={['teacher']}>
              <TeacherDashboard />
            </Protected>
          }
        />
        <Route
          path="/teacher/class"
          element={
            <Protected roles={['teacher']}>
              <ClassProgress />
            </Protected>
          }
        />
        <Route
          path="/teacher/exercises"
          element={
            <Protected roles={['teacher']}>
              <TeacherExercises />
            </Protected>
          }
        />
        <Route
          path="/teacher/classes"
          element={
            <Protected roles={['teacher']}>
              <TeacherClasses />
            </Protected>
          }
        />
        <Route
          path="/teacher/review/:submissionId"
          element={
            <Protected roles={['teacher']}>
              <TeacherReview />
            </Protected>
          }
        />

        <Route
          path="/evaluator"
          element={
            <Protected roles={['teacher']}>
              <EvaluatorConsole />
            </Protected>
          }
        />

        <Route
          path="/settings"
          element={
            <Protected roles={['student', 'teacher']}>
              <Settings />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <SessionProvider>
      {/*
        The class lens sits inside the session (it subscribes as a teacher and
        renders nothing for a student) and outside the routes, so moving from
        the review queue to analytics keeps the filter. It changes what a
        teacher sees and never what anything computes — see ClassContext.
      */}
      <ClassProvider>
        <AppRoutes />
      </ClassProvider>
    </SessionProvider>
  );
}
