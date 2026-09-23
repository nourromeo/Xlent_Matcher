# MVP Smoke Test

Run the backend and frontend locally before this test.

## 1. CV upload flow

1. Open **CV Upload**.
2. Upload a PDF or TXT consultant CV.
3. Verify that a database-backed upload row appears with **Extracting**.
4. Verify that the row changes to **Review needed** after AI extraction.
5. Edit at least one extracted field and wait about one second.
6. Refresh the page.
7. Verify that the upload row still exists and the review data can still be opened.
8. Approve and save the consultant.
9. Verify that the upload row changes to **Indexed**.
10. Open **Consultants** and verify that the new consultant exists.
11. Return to **CV Upload** and use **View Consultant**.
12. Verify that it opens the correct consultant profile.

Expected result: upload history survives navigation/refresh and an approved CV is linked to the created consultant.

## 2. Matching flow

1. Create a new client assignment.
2. Verify that its status is **Draft**.
3. Open Matching for the assignment.
4. Run matching against the consultants.
5. Verify that ranked results are displayed with Match Score, matched requirements and missing requirements.
6. Return to Client Assignments.
7. Verify that the assignment status is **Matched**.
8. Open Matching again and verify that the saved results can be loaded.

Expected result: matching results are persisted and the assignment changes from Draft to Matched only after matching has completed successfully.

## 3. CV adaptation flow

Test all three source modes for both sides:

- Consultant: **Existing / Upload / Paste**
- Assignment: **Existing / Upload / Paste**

At minimum, verify several combinations including:
- Existing + Existing
- Upload CV + Existing Assignment
- Paste CV + Paste Assignment
- Existing Consultant + Upload Requirements

For each test:
1. Choose the two input sources.
2. Click **Generate suggestions**.
3. Verify AI summary, emphasis suggestions, gaps/notes and adapted CV draft.
4. Edit the temporary adapted CV text.
5. Click **Copy text** and verify clipboard content.
6. Click **Print** and verify the print preview contains only a clean A4-style CV document.
7. Click **Close result** and verify inputs remain.
8. Generate again, then click **Start over** and verify all inputs are reset.
9. Refresh and confirm there is no saved CV adaptation history.

Expected result: CV Adaptation is temporary only. It never modifies or stores consultants, assignments or adapted CV results.

## Failure checks

- Backend unavailable: the UI should show an error instead of silently failing.
- Azure OpenAI failure: extraction/adaptation should show an error.
- Empty upload/paste input: Generate should return a clear validation message.
- No consultants available: Matching should not run.
- CV Adaptation must never create a database record.
