# MVP End-to-End Smoke Test

Use this checklist after pulling the latest code. Run both the ASP.NET Core API and the React frontend.

## 1. CV Upload

- Upload a valid PDF/TXT under 10 MB.
- Confirm the upload appears in **CV processing history**.
- Confirm status changes from **Extracting** to **Review needed**.
- Edit extracted data, wait briefly, refresh, and confirm the review draft remains.
- Approve the consultant and confirm status changes to **Indexed**.
- Open **View Consultant** and confirm the correct profile is shown.
- Try an unsupported file type: the UI must reject it without adding a history row.
- Try an empty file: the UI/API must reject it.
- Try a PDF with no readable text: the API must return a clear message about scanned/image-only PDFs.
- Upload the same filename + file size again: the API must return a duplicate warning and must not add a second history record.

## 2. Client Assignment

- Create an assignment using title, customer and description.
- Run AI requirement extraction.
- Review/edit the extracted requirements.
- Confirm at least one non-empty requirement is required before save.
- Save and verify the assignment is shown as **Draft**.
- Open the assignment detail page and verify the saved data.

## 3. Matching

- Open a Draft assignment with requirements.
- Run matching.
- Confirm ranked consultants, Match Score, matched requirements, missing requirements and evidence are shown.
- Confirm the assignment becomes **Matched** only after a successful matching run.
- Reload Matching and verify saved results are restored.
- Confirm matching is rejected if the assignment has no requirements or no consultants are selected.

## 4. CV Adaptation

Test source modes for both sides:

- Consultant: **Existing / Upload / Paste**
- Assignment: **Existing / Upload / Paste**

Verify several combinations:
- Existing + Existing
- Upload CV + Existing Assignment
- Paste CV + Paste Assignment
- Existing Consultant + Upload Requirements

For each:
- Generate suggestions.
- Verify summary, what to emphasize, gaps/notes and adapted CV draft.
- Edit the result.
- Use **Copy text**.
- Use **Print** and verify only a clean A4 CV document appears in print preview.
- Use **Close result** and verify the selected inputs remain.
- Use **Start over** and verify the temporary inputs/result are cleared.
- Refresh and confirm there is no adapted-CV history or saved result.

## 5. Failure handling

- Stop the backend and perform an API action: the UI should say it cannot reach the backend.
- Make Azure OpenAI unavailable/misconfigured: extraction/adaptation should show a friendly AI-service error instead of raw provider details.
- Invalid files should be rejected.
- Empty requirement sets should be rejected.

## Expected MVP result

The complete flow works as:

CV Upload -> Review -> Consultant
Client Assignment -> Requirements
Consultant + Assignment -> Matching -> Ranking
CV Adaptation -> Temporary AI suggestions -> Copy / Print

CV Adaptation does not write any result to the database.
