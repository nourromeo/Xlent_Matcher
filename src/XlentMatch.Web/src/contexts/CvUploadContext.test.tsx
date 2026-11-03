import { act, fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { CvUploadProvider } from "./CvUploadContext";
import CvUpload from "../pages/CvUpload";
import { cvUploadsApi } from "../services/cvUploadsApi";
import { aiApi } from "../services/aiApi";

vi.mock("../services/cvUploadsApi", () => ({ cvUploadsApi: {
  getAll: vi.fn(), create: vi.fn(), uploadFile: vi.fn(), update: vi.fn(), remove: vi.fn(),
} }));
vi.mock("../services/aiApi", () => ({ aiApi: { extractConsultantFromFile: vi.fn() } }));
vi.mock("../services/consultantsApi", () => ({ consultantsApi: { getAll: vi.fn().mockResolvedValue([]) } }));
vi.mock("../i18n", () => ({ useI18n: () => ({ t: (key: string) => key, locale: "sv" }) }));

function Location() { return <div data-testid="location">{useLocation().pathname}</div>; }
function setup() {
  return render(<MemoryRouter initialEntries={["/cv-upload"]}>
    <CvUploadProvider>
      <Link to="/other">Leave</Link><Link to="/cv-upload">Return</Link><Location />
      <Routes>
        <Route path="/cv-upload" element={<CvUpload />} />
        <Route path="/other" element={<div>Other page</div>} />
        <Route path="/cv-upload/review" element={<div>Review page</div>} />
      </Routes>
    </CvUploadProvider>
  </MemoryRouter>);
}
describe("CV upload navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cvUploadsApi.getAll).mockResolvedValue([]);
    vi.mocked(cvUploadsApi.create).mockResolvedValue({ id: 12 } as never);
    vi.mocked(cvUploadsApi.uploadFile).mockResolvedValue({ id: 12 } as never);
    vi.mocked(cvUploadsApi.update).mockResolvedValue({ id: 12 } as never);
  });
  afterEach(cleanup);

  it("restores processing state on return and does not revive the old redirect", async () => {
    let finish!: (value: never) => void;
    vi.mocked(aiApi.extractConsultantFromFile).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const view = setup();
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["CV"], "profile.txt", { type: "text/plain" })] },
    });
    await waitFor(() => expect(aiApi.extractConsultantFromFile).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByText("Leave"));
    fireEvent.click(screen.getByText("Return"));
    expect(screen.getByRole("status").textContent).toContain("status_extracting");
    expect(screen.getByRole("status").textContent).toContain("profile.txt");
    await act(async () => finish({ firstName: "Test" } as never));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("cv_review"));
    expect(screen.getByTestId("location").textContent).toBe("/cv-upload");
    expect(cvUploadsApi.create).toHaveBeenCalledOnce();
  });

  it("keeps the user on another page when extraction completes", async () => {
    let finish!: (value: never) => void;
    vi.mocked(aiApi.extractConsultantFromFile).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const view = setup();
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["CV"], "profile.txt", { type: "text/plain" })] },
    });
    await waitFor(() => expect(aiApi.extractConsultantFromFile).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByText("Leave"));
    await act(async () => finish({ firstName: "Test" } as never));
    expect(screen.getByTestId("location").textContent).toBe("/other");
    fireEvent.click(screen.getByText("Return"));
    expect(screen.getByRole("status").textContent).toContain("cv_review");
  });

  it("still opens review automatically if the user stays on the upload page", async () => {
    vi.mocked(aiApi.extractConsultantFromFile).mockResolvedValue({ firstName: "Test" } as never);
    const view = setup();
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["CV"], "profile.txt", { type: "text/plain" })] },
    });
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/cv-upload/review"));
  });
});
