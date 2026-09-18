import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ConsultantPool from "./pages/TalentPool";
import ConsultantProfile from "./pages/CandidateDetail";
import ClientAssignments from "./pages/Jobs";
import AssignmentDetail from "./pages/AssignmentDetail";
import Matching from "./pages/Matching";
import Upload from "./pages/Upload";
import Admin from "./pages/Admin";
import CvAdaptation from "./pages/CvCoach";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="talent" element={<ConsultantPool />} />
          <Route path="talent/:id" element={<ConsultantProfile />} />
          <Route path="jobs" element={<ClientAssignments />} />
          <Route path="jobs/:id" element={<AssignmentDetail />} />
          <Route path="matching" element={<Matching />} />
          <Route path="upload" element={<Upload />} />
          <Route path="coach" element={<CvAdaptation />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
