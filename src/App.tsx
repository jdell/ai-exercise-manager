import { Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import Layout from './components/Layout';
import SignIn from './pages/SignIn';
import StudentDashboard from './pages/StudentDashboard';
import StudentHistory from './pages/StudentHistory';
import ExerciseWorkspace from './pages/ExerciseWorkspace';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherReview from './pages/TeacherReview';
import ClassProgress from './pages/ClassProgress';
import EvaluatorConsole from './pages/EvaluatorConsole';
import Settings from './pages/Settings';
import type { Role } from './types';

function Protected({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { session } = useSession();
  if (!session) return <Navigate to="/signin" replace />;
  if (!roles.includes(session.role)) {
    return <Navigate to={session.role === 'student' ? '/' : `/${session.role}`} replace />;
  }
  return <>{children}</>;
}

function Home() {
  const { session } = useSession();
  if (!session) return <Navigate to="/signin" replace />;
  if (session.role === 'teacher') return <Navigate to="/teacher" replace />;
  if (session.role === 'evaluator') return <Navigate to="/evaluator" replace />;
  return <StudentDashboard />;
}

function AppRoutes() {
  const { session } = useSession();

  return (
    <Routes>
      <Route path="/signin" element={session ? <Navigate to="/" replace /> : <SignIn />} />

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
            <Protected roles={['teacher', 'evaluator']}>
              <TeacherDashboard />
            </Protected>
          }
        />
        <Route
          path="/teacher/class"
          element={
            <Protected roles={['teacher', 'evaluator']}>
              <ClassProgress />
            </Protected>
          }
        />
        <Route
          path="/teacher/review/:submissionId"
          element={
            <Protected roles={['teacher', 'evaluator']}>
              <TeacherReview />
            </Protected>
          }
        />

        <Route
          path="/evaluator"
          element={
            <Protected roles={['teacher', 'evaluator']}>
              <EvaluatorConsole />
            </Protected>
          }
        />

        <Route
          path="/settings"
          element={
            <Protected roles={['student', 'teacher', 'evaluator']}>
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
