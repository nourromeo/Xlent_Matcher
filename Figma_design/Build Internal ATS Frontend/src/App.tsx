import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import TalentPool from "./pages/TalentPool";
import CandidateDetail from "./pages/CandidateDetail";
import Jobs from "./pages/Jobs";
import Matching from "./pages/Matching";
import Upload from "./pages/Upload";
import Admin from "./pages/Admin";
import CvCoach from "./pages/CvCoach";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="talent" element={<TalentPool />} />
          <Route path="talent/:id" element={<CandidateDetail />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="matching" element={<Matching />} />
          <Route path="upload" element={<Upload />} />
          <Route path="coach" element={<CvCoach />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
