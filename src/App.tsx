import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import TeacherStudentDetails from "./pages/teacher/TeacherStudentDetails";
import Dashboard from "./pages/dashboard/Dashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import Teachers from "./pages/admin/Teachers";
import AddTeacher from "./pages/admin/AddTeacher";
import TeacherAssignments from "./pages/admin/TeacherAssignments";

import Students from "./pages/admin/Students";
import AddStudent from "./pages/admin/AddStudent";

import ActivateTeacher from "./pages/teacher/ActivateTeacher";
import ActivateStudent from "./pages/student/ActivateStudent";
import TeacherQuranProgress from "./pages/teacher/TeacherQuranProgress";
import ProtectedRoute from "./components/auth/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* Teacher activation - public */}
        <Route
          path="/teacher/activate"
          element={<ActivateTeacher />}
        />
<Route
  path="/teacher/dashboard"
  element={
    <ProtectedRoute allowedRoles={["TEACHER"]} />
  }
>
  <Route index element={<TeacherDashboard />} />
</Route>
<Route
  path="/teacher/students/:studentUid"
  element={
    <ProtectedRoute allowedRoles={["TEACHER"]} />
  }
>
  <Route index element={<TeacherStudentDetails />} />
</Route>
        {/* Student activation - public */}
        <Route
          path="/student/activate"
          element={<ActivateStudent />}
        />

        {/* Admin - Teachers */}
        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]} />
          }
        >
          <Route
            index
            element={<Teachers />}
          />
        </Route>

        <Route
          path="/admin/teachers/new"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]} />
          }
        >
          <Route
            index
            element={<AddTeacher />}
          />
        </Route>

        {/* Admin - Teacher Assignments */}
        <Route
          path="/admin/teacher-assignments"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]} />
          }
        >
          <Route index element={<TeacherAssignments />} />
        </Route>

        {/* Admin - Students */}
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]} />
          }
        >
          <Route
            index
            element={<Students />}
          />
        </Route>

<Route
  path="/teacher/students/:studentUid/quran-progress"
  element={
    <ProtectedRoute allowedRoles={["TEACHER"]} />
  }
>
  <Route
    index
    element={<TeacherQuranProgress />}
  />
</Route>

        <Route
          path="/admin/students/new"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]} />
          }
        >
          <Route
            index
            element={<AddStudent />}
          />
        </Route>

        {/* Protected dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />
        </Route>

        {/* Catch-all */}
        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;

