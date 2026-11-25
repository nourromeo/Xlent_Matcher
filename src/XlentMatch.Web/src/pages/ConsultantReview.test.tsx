import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConsultantReview from "./ConsultantReview";
import { CvUploadProvider } from "../contexts/CvUploadContext";
import { cvUploadsApi } from "../services/cvUploadsApi";
vi.mock("../services/cvUploadsApi", () => ({ cvUploadsApi: { getAll: vi.fn(), discardDraft: vi.fn() } }));
vi.mock("../services/consultantsApi", () => ({ consultantsApi: { getById: vi.fn().mockResolvedValue({ id: 9, firstName: "Existing", lastName: "Consultant" }) } }));
vi.mock("../i18n", () => ({ useI18n: () => ({ t: (key: string) => key, locale: "sv" }) }));
const draft = { firstName: "Test", lastName: "Person", email: null, summary: null, seniority: null,
  yearsOfExperience: null, office: null, skills: [], experiences: [], projects: [], education: [],
  languages: [], industries: [], certifications: [], sourceText: "Original CV" };
const record = { id: 12, status: "Review", isActive: false, draftJson: JSON.stringify(draft) };
function setup() {
  render(<MemoryRouter initialEntries={["/cv-upload/review?uploadId=12&replaceConsultantId=9"]}>
    <CvUploadProvider><Routes>
      <Route path="/cv-upload/review" element={<ConsultantReview />} />
      <Route path="/cv-upload" element={<div>CV manager</div>} />
    </Routes></CvUploadProvider>
  </MemoryRouter>);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cvUploadsApi.getAll).mockResolvedValue([record] as never);
  vi.mocked(cvUploadsApi.discardDraft).mockResolvedValue(undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("discards only the pending upload and returns to management", async () => {
  setup();
  fireEvent.click(await screen.findByText("review_discard_draft"));
  await screen.findByText("CV manager");
  expect(cvUploadsApi.discardDraft).toHaveBeenCalledExactlyOnceWith(12);
});
it("keeps the draft when the user only goes back", async () => {
  setup();
  fireEvent.click((await screen.findAllByText("common_back"))[0]);
  await screen.findByText("CV manager");
  expect(cvUploadsApi.discardDraft).not.toHaveBeenCalled();
});
it("does not delete when confirmation is declined", async () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  setup();
  fireEvent.click(await screen.findByText("review_discard_draft"));
  expect(cvUploadsApi.discardDraft).not.toHaveBeenCalled();
});
it("refuses to discard a record that is already active", async () => {
  setup();
  await screen.findByText("review_discard_draft");
  vi.mocked(cvUploadsApi.getAll).mockResolvedValue([{ ...record, isActive: true, status: "Indexed" }] as never);
  fireEvent.click(screen.getByText("review_discard_draft"));
  await waitFor(() => expect(screen.getAllByRole("alert")[0].textContent).toContain("review_current_error"));
  expect(cvUploadsApi.discardDraft).not.toHaveBeenCalled();
});
