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

1. Open **CV Adaptation**.
2. Select a consultant.
3. Select a client assignment.
4. Generate an adapted CV.
5. Verify that AI summary, highlighted experience, notes and adapted CV text are displayed.
6. Edit the adapted CV text.
7. Save it.
8. Verify that **Saved** is shown.
9. Refresh the page and select the same consultant.
10. Verify that the saved adaptation appears under **Saved adapted CVs**.

Expected result: adapted CVs are saved in the database and remain visible after refresh.

## Failure checks

- Backend unavailable: the UI should show an error instead of silently failing.
- Azure OpenAI failure: extraction/adaptation should show an error and not create an approved consultant.
- Empty CV adaptation text: Save should stay disabled.
- No consultants available: Matching should not run.
