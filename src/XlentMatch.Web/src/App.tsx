import { BrowserRouter, Navigate, Routes, Route, useSearchParams } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Consultants from "./pages/Consultants";
import ConsultantDetail from "./pages/ConsultantDetail";
import EditConsultant from "./pages/EditConsultant";
import ClientAssignments, { NewAssignmentPage } from "./pages/ClientAssignments";
import AssignmentDetail from "./pages/AssignmentDetail";
import EditAssignment from "./pages/EditAssignment";
import Matching from "./pages/Matching";
import MatchingSelection from "./pages/MatchingSelection";
import AiRankingSelection from "./pages/AiRankingSelection";
import AiRankingResults from "./pages/AiRankingResults";
import HowItWorks from "./pages/HowItWorks";
import CvUpload from "./pages/CvUpload";
import ConsultantReview from "./pages/ConsultantReview";
import CvAdaptation from "./pages/CvAdaptation";
import Admin from "./pages/Admin";

function LegacyMatchingRedirect() {
  const [params] = useSearchParams();
  const id = params.get("assignment");
  return id && /^[1-9]\d*$/.test(id) ? <Navigate to={`/matching/${id}`} replace /> : <MatchingSelection />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="consultants" element={<Consultants />} />
          <Route path="consultants/:id" element={<ConsultantDetail />} />
          <Route path="consultants/:id/edit" element={<EditConsultant />} />
          <Route path="client-assignments" element={<ClientAssignments />} />
          <Route path="client-assignments/new" element={<NewAssignmentPage />} />
          <Route path="client-assignments/:id/edit" element={<EditAssignment />} />
          <Route path="client-assignments/:id" element={<AssignmentDetail />} />
          <Route path="matching" element={<LegacyMatchingRedirect />} />
          <Route path="matching/:assignmentId" element={<Matching />} />
          <Route path="matching/:assignmentId/ai-ranking" element={<AiRankingSelection />} />
          <Route path="matching/:assignmentId/ai-ranking/results" element={<AiRankingResults />} />
          <Route path="matching/:assignmentId/ai-ranking/saved/:savedId" element={<AiRankingResults />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="cv-upload" element={<CvUpload />} />
          <Route path="cv-upload/review" element={<ConsultantReview />} />
          <Route path="cv-adaptation" element={<CvAdaptation />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
