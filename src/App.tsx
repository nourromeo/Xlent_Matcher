import { BrowserRouter, Routes, Route } from "react-router-dom";
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
          <Route path="talent" element={<Consultants />} />
          <Route path="talent/:id" element={<ConsultantDetail />} />
          <Route path="jobs" element={<ClientAssignments />} />
          <Route path="jobs/:id" element={<AssignmentDetail />} />
          <Route path="matching" element={<Matching />} />
          <Route path="upload" element={<CvUpload />} />
          <Route path="coach" element={<CvAdaptation />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
