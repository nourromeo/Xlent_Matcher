# MVP End-to-End Smoke Test

Kör denna checklista efter `git pull`. Starta både ASP.NET Core API och React frontend.

Målet är att verifiera hela MVP-flödet inför demo och leverans.

## 1. Consultant

- [ ] Öppna Consultants och verifiera att befintliga konsulter visas.
- [ ] Skapa eller godkänn en konsult via CV Upload-flödet.
- [ ] Öppna Consultant Profile och verifiera namn, titel, erfarenhet och skills.
- [ ] Redigera konsultprofilen och verifiera att ändringen visas korrekt.

## 2. CV Upload

- [ ] Ladda upp en giltig PDF/TXT under 10 MB.
- [ ] Kontrollera att filen visas i CV processing history.
- [ ] Kontrollera att status går från Extracting till Review needed.
- [ ] Granska och redigera extraherad data.
- [ ] Uppdatera sidan och kontrollera att review draft finns kvar.
- [ ] Godkänn konsulten och verifiera status Indexed.
- [ ] Öppna View Consultant och kontrollera rätt profil.
- [ ] Försök ladda upp en filtyp som inte stöds.
- [ ] Försök med en tom fil.
- [ ] Testa en PDF utan läsbar text.
- [ ] Ladda upp samma filnamn och filstorlek igen och kontrollera duplicate warning.

Förväntat: felaktiga filer ska inte skapa en ny giltig historikpost.

## 3. Client Assignment

- [ ] Skapa ett nytt kunduppdrag med title, customer och description.
- [ ] Lägg till minst ett Mandatory requirement.
- [ ] Lägg till ett Desired requirement.
- [ ] Spara uppdraget.
- [ ] Kontrollera att uppdraget visas som Draft.
- [ ] Öppna Assignment Detail och verifiera sparade värden.
- [ ] Försök spara ett uppdrag utan requirements.

Förväntat: assignment utan requirements ska stoppas med ett tydligt fel.

## 4. Matching

- [ ] Öppna ett Draft assignment.
- [ ] Kör Matching.
- [ ] Kontrollera att konsulter rankas.
- [ ] Kontrollera Match Score.
- [ ] Kontrollera Mandatory matched/missing requirements.
- [ ] Kontrollera Desired matches.
- [ ] Kontrollera evidence.
- [ ] Kontrollera motivering.
- [ ] Kontrollera att assignment blir Matched efter lyckad körning.
- [ ] Uppdatera sidan och kontrollera att sparade resultat laddas igen.
- [ ] Kontrollera att matching utan valda konsulter stoppas.
- [ ] Kontrollera att assignment utan requirements stoppas.

## 5. Skill Taxonomy

- [ ] Öppna Admin -> Skill Taxonomy.
- [ ] Klicka Add Skill.
- [ ] Lägg till canonical name, category och minst ett alias.
- [ ] Kontrollera att den nya skillen syns i tabellen.
- [ ] Försök lägga till samma canonical name igen.
- [ ] Försök använda ett alias som redan används av en annan skill.
- [ ] Klicka Edit på den nya skillen.
- [ ] Ändra canonical name eller category.
- [ ] Spara.
- [ ] Uppdatera sidan och verifiera att ändringen finns kvar.

Förväntat: duplicate canonical names och aliases ska stoppas av backend.

## 6. Matching Weights

Standard:

- Mandatory = 60
- Desired = 25
- Experience = 15
- Missing mandatory penalty = 10

Test:

- [ ] Öppna Admin -> Matching Weights.
- [ ] Ändra vikterna men behåll totalen 100.
- [ ] Klicka Save.
- [ ] Kör om Matching för ett uppdrag.
- [ ] Kontrollera att Matching-sidan visar de nya vikterna.
- [ ] Kontrollera att Match Score kan förändras när vikterna förändras.
- [ ] Starta om API:t.
- [ ] Öppna Admin igen och kontrollera att vikterna finns kvar.
- [ ] Klicka Reset och kontrollera att standardvärdena återställs.
- [ ] Försök skapa en kombination som inte blir 100.

Förväntat: Save ska vara blockerad när de tre positiva vikterna inte summerar till 100.

## 7. CV Adaptation

Testa flera kombinationer:

- Existing Consultant + Existing Assignment
- Upload CV + Existing Assignment
- Paste CV + Paste Assignment
- Existing Consultant + Upload Requirements

För varje test:

- [ ] Generate suggestions.
- [ ] Kontrollera summary.
- [ ] Kontrollera vad som ska betonas.
- [ ] Kontrollera gaps/notes.
- [ ] Kontrollera adapted CV draft.
- [ ] Redigera resultatet.
- [ ] Använd Copy text.
- [ ] Använd Print och kontrollera ren A4-layout.
- [ ] Använd Close result och verifiera att inputs finns kvar.
- [ ] Använd Start over och verifiera att temporära inputs/resultat rensas.
- [ ] Uppdatera sidan och kontrollera att inget adapted result har sparats.

## 8. Error handling

### Backend unavailable

- [ ] Stoppa API:t.
- [ ] Utför en API-funktion från frontend.

Förväntat meddelande:

`Cannot reach the backend API. Make sure the API is running and try again.`

### Azure OpenAI unavailable

- [ ] Testa extraction/adaptation med saknad eller ogiltig AI-konfiguration.

Förväntat: användarvänligt `AI service unavailable`-fel. Provider response och API key ska inte visas för användaren.

### Invalid file

- [ ] Unsupported extension.
- [ ] Empty file.
- [ ] File > 10 MB.
- [ ] Image-only/scanned PDF.

Förväntat: tydligt fel utan krascher.

### Duplicate Skill

- [ ] Duplicate canonical name.
- [ ] Alias som kolliderar med en canonical skill.
- [ ] Alias som kolliderar med ett annat alias.

Förväntat: HTTP 409 och begripligt meddelande.

## 9. Restart / persistence

- [ ] Skapa eller ändra en Consultant.
- [ ] Skapa ett Assignment.
- [ ] Lägg till/Edit en Skill.
- [ ] Spara Matching Weights.
- [ ] Stoppa API:t.
- [ ] Starta API:t igen.
- [ ] Verifiera att database-data finns kvar.
- [ ] Verifiera att Matching Weights finns kvar.

## 10. UI final check

- [ ] Ingen ATS-terminologi.
- [ ] Ingen Candidate/Hiring-terminologi.
- [ ] Ingen gammal Job/Talent Pool-terminologi.
- [ ] Inga test/mock-värden som ser ut som live-data.
- [ ] Inga oavsiktligt disabled buttons.
- [ ] Skill Delete får fortfarande vara disabled enligt nuvarande avgränsning.
- [ ] Feature Flags lämnas oförändrade enligt nuvarande krav.
- [ ] Inga onödigt duplicerade panels eller actions på samma sida.
- [ ] Match breakdown visar samma weights som Admin.

## 11. Build / technical checks

Backend:

```powershell
cd src/XlentMatch.Api
dotnet restore
dotnet build
dotnet ef migrations has-pending-model-changes
```

Frontend:

```powershell
cd src/XlentMatch.Web
npm ci
npm run typecheck
npm run build
```

GitHub Actions ska också vara grön före leverans.

## Expected MVP flow

```text
CV -> Review -> Consultant
               |
Client Assignment -> Requirements
               |
               v
         Deterministic Matching
               |
               v
     Score -> Ranking -> Evidence
```

Admin påverkar Skill Taxonomy och Matching Weights. Feature Flags lämnas enligt nuvarande krav.

Det slutliga valet av konsult görs alltid av användaren.
