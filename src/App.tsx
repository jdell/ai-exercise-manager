import { Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import Layout from './components/Layout';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import StudentDashboard from './pages/StudentDashboard';
import StudentHistory from './pages/StudentHistory';
import ExerciseWorkspace from './pages/ExerciseWorkspace';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherReview from './pages/TeacherReview';
import ClassProgress from './pages/ClassProgress';
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
  return (
    <div className="grid min-h-full place-items-center">
      <div className="flex items-center gap-3 text-sm text-ink-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-indigo-500" />
        Checking your session…
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
      <AppRoutes />
    </SessionProvider>
  );
}
