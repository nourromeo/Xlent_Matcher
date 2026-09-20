import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Consultants from "./pages/Consultants";
import ConsultantDetail from "./pages/ConsultantDetail";
import ClientAssignments from "./pages/ClientAssignments";
import AssignmentDetail from "./pages/AssignmentDetail";
import Matching from "./pages/Matching";
import CvUpload from "./pages/CvUpload";
import Admin from "./pages/Admin";
import CvAdaptation from "./pages/CvAdaptation";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="consultants" element={<Consultants />} />
          <Route path="consultants/:id" element={<ConsultantDetail />} />
          <Route path="client-assignments" element={<ClientAssignments />} />
          <Route path="client-assignments/:id" element={<AssignmentDetail />} />
          <Route path="matching" element={<Matching />} />
          <Route path="cv-upload" element={<CvUpload />} />
          <Route path="cv-adaptation" element={<CvAdaptation />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
