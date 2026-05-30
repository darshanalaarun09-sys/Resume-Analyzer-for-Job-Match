import { useMemo, useState } from "react";

function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisMeta, setAnalysisMeta] = useState({ mode: "", note: "" });

  const acceptedFormatsText = "PDF or DOCX";
  const apiBaseUrl = import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://resume-analyzer-for-job-match.onrender.com";

  const buildApiUrl = (path) => {
    if (!apiBaseUrl) {
      return "";
    }

    const baseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
    return new URL(path.replace(/^\//, ""), baseUrl).toString();
  };

  const requestJson = async (url, options) => {
    const resolvedUrl = url.startsWith("http") ? url : buildApiUrl(url);

    if (!resolvedUrl) {
      throw new Error(
        import.meta.env.DEV
          ? "Backend is not running. Start the server on http://localhost:5000 and try again."
          : "Frontend is missing VITE_API_BASE_URL. Set it to your Render backend URL, then redeploy the frontend."
      );
    }

    let response;
    try {
      response = await fetch(resolvedUrl, options);
    } catch {
      throw new Error(
        import.meta.env.DEV
          ? `Unable to reach the backend at ${resolvedUrl}. Check that the server is running and reachable.`
          : `Unable to reach the deployed backend at ${resolvedUrl}. Confirm VITE_API_BASE_URL points to your Render service and redeploy the frontend.`
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    let data = null;
    if (rawText) {
      if (contentType.includes("application/json")) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("Server returned invalid JSON. Please restart backend and try again.");
        }
      } else {
        // Fallback parse if content-type is missing but body is still JSON.
        try {
          data = JSON.parse(rawText);
        } catch {
          const looksLikeHtml = rawText.trimStart().startsWith("<");
          if (looksLikeHtml) {
            throw new Error(
              "API URL is incorrect or backend is not reachable. Set VITE_API_BASE_URL to your deployed backend URL, for example https://your-backend.onrender.com, then redeploy the frontend."
            );
          }
          throw new Error("Server returned unexpected response format.");
        }
      }
    }

    if (!response.ok) {
      const detailText =
        typeof data?.details === "string"
          ? data.details
          : data?.details?.error?.message ||
            data?.details?.message ||
            data?.provider_error?.message ||
            "";

      const baseMessage = data?.error || data?.message || `Request failed with status ${response.status}.`;
      const errorMessage = detailText ? `${baseMessage} ${detailText}` : baseMessage;
      throw new Error(errorMessage);
    }

    return data;
  };

  const toArray = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  const clampScore = (score) => {
    const numeric = Number(score);
    if (Number.isNaN(numeric)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(numeric)));
  };

  const canAnalyze = useMemo(() => {
    return Boolean(resumeFile) && jobDescription.trim().length > 20 && !isAnalyzing;
  }, [resumeFile, jobDescription, isAnalyzing]);

  const missingRequirements = useMemo(() => {
    const missing = [];
    if (!resumeFile) {
      missing.push("Upload a PDF or DOCX resume");
    }
    if (jobDescription.trim().length < 20) {
      missing.push("Add a job description with at least 20 characters");
    }
    return missing;
  }, [resumeFile, jobDescription]);

  const atsScore = clampScore(analysisResult?.["ATS Score"] ?? analysisResult?.ats_score);
  const matchScore = clampScore(
    analysisResult?.["Job Match Score"] ?? analysisResult?.match_score
  );
  const extractedSkills = toArray(analysisResult?.skills);
  const missingSkills = toArray(
    analysisResult?.["Missing Skills"] ?? analysisResult?.missing_skills
  );
  const missingKeywords = toArray(analysisResult?.["Missing Keywords"]);
  const suggestions = toArray(analysisResult?.Improvements ?? analysisResult?.suggestions);
  const scoringBreakdown = analysisResult?.scoring_breakdown || {};
  const matchedSkills = toArray(scoringBreakdown?.matched_skills);
  const skillCoverage = clampScore(
    scoringBreakdown?.weighted_skill_coverage ?? scoringBreakdown?.skill_coverage
  );
  const requiredSkillCoverage = clampScore(scoringBreakdown?.required_skill_coverage);
  const preferredSkillCoverage = clampScore(scoringBreakdown?.preferred_skill_coverage);
  const keywordCoverage = clampScore(scoringBreakdown?.keyword_coverage);
  const structureScore = clampScore(scoringBreakdown?.structure_score);
  const impactScore = clampScore(scoringBreakdown?.impact_score);
  const experienceAlignment = clampScore(scoringBreakdown?.experience_alignment);
  const titleAlignment = clampScore(scoringBreakdown?.title_alignment);
  const keywordMatch = clampScore(
    analysisResult?.["Keyword Match"] ?? scoringBreakdown?.keyword_match ?? keywordCoverage
  );
  const skillsMatch = clampScore(
    analysisResult?.["Skills Match"] ?? scoringBreakdown?.skills_match ?? skillCoverage
  );
  const experienceRelevance = clampScore(
    analysisResult?.["Experience Match"] ??
      scoringBreakdown?.experience_relevance ??
      experienceAlignment
  );
  const educationMatch = clampScore(
    analysisResult?.["Education Match"] ?? scoringBreakdown?.education_match
  );
  const projectsImpact = clampScore(
    analysisResult?.["Projects Score"] ?? scoringBreakdown?.projects_impact ?? impactScore
  );
  const atsFormatting = clampScore(
    analysisResult?.["Formatting Score"] ?? scoringBreakdown?.ats_formatting ?? structureScore
  );

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setFormError("");
    setUploadMessage("");
    setAnalysisMessage("");
    setAnalysisResult(null);
    setAnalysisMeta({ mode: "", note: "" });

    if (!file) {
      setResumeFile(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(extension)) {
      setResumeFile(null);
      setFormError("Invalid file type. Please upload a PDF or DOCX file.");
      return;
    }

    setResumeFile(file);
  };

  const handleAnalyze = async () => {
    setFormError("");
    setUploadMessage("");
    setAnalysisMessage("");
    setAnalysisResult(null);
    setAnalysisMeta({ mode: "", note: "" });

    if (!resumeFile) {
      setFormError("Please upload your resume before analyzing.");
      return;
    }

    if (jobDescription.trim().length < 20) {
      setFormError("Please enter a fuller job description (at least 20 characters).");
      return;
    }

    setIsAnalyzing(true);

    try {
      if (!apiBaseUrl) {
        throw new Error(
          import.meta.env.DEV
            ? "Backend URL is missing. Make sure the local server is running on http://localhost:5000."
            : "Frontend is missing the deployed backend URL."
        );
      }

      const uploadFormData = new FormData();
      uploadFormData.append("resume", resumeFile);

      const uploadData = await requestJson("/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const resumeText = uploadData.resume_text;
      if (!resumeText || !resumeText.trim()) {
        throw new Error("Resume text extraction returned empty content.");
      }

      setUploadMessage("Resume uploaded and text extracted successfully.");

      const analyzeData = await requestJson("/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription.trim(),
        }),
      });

      setAnalysisResult(analyzeData.analysis || null);
      setAnalysisMeta({ mode: analyzeData.mode || "", note: analyzeData.note || "" });
      setAnalysisMessage("Analysis completed successfully.");
    } catch (error) {
      setFormError(error.message || "Something went wrong while analyzing.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="app-shell min-h-screen text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-10">
        <header className="hero-panel rounded-3xl p-8 text-white shadow-2xl sm:p-10">
          <h1 className="display-heading mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            Resume Analyzer for Job Match
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-cyan-50 sm:text-base">
            Compare your resume against a job description and get clear ATS scoring,
            skill gaps, and improvement suggestions.
          </p>
        </header>

        <section className="grid gap-5">
          <article className="glass-card rounded-2xl border border-white/40 p-6 shadow-lg">
            <h2 className="section-title text-lg font-semibold text-slate-900">Upload Resume</h2>
            <p className="mt-1 text-sm text-slate-600">
              Supported formats: {acceptedFormatsText}. Maximum upload size is 10 MB.
            </p>

            <label
              htmlFor="resume"
              className="mt-4 flex cursor-pointer flex-col rounded-xl border-2 border-dashed border-teal-200 bg-white/80 p-6 text-center transition hover:border-teal-500 hover:bg-teal-50"
            >
              <span className="text-sm font-medium text-slate-700">
                Click to choose resume file
              </span>
              <span className="mt-1 text-xs text-slate-500">{acceptedFormatsText}</span>
              <input
                id="resume"
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {resumeFile && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                Selected file: <span className="font-semibold">{resumeFile.name}</span>
              </div>
            )}
          </article>

          <article className="glass-card rounded-2xl border border-white/40 p-6 shadow-lg">
            <h2 className="section-title text-lg font-semibold text-slate-900">Job Description</h2>
            <p className="mt-1 text-sm text-slate-600">
              Paste the full role details so matching is more accurate.
            </p>

            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description here..."
              className="mt-4 min-h-44 w-full rounded-xl border border-slate-300 bg-white p-4 text-sm outline-none ring-teal-500 transition focus:ring-2"
            />

            <p className="mt-2 text-xs text-slate-500">
              Characters: {jobDescription.length}
            </p>
          </article>

          <article className="glass-card rounded-2xl border border-white/40 p-6 shadow-lg">
            <h2 className="section-title text-lg font-semibold text-slate-900">Run Analysis</h2>
            <p className="mt-1 text-sm text-slate-600">
              This button uploads your resume, extracts text, and compares it with
              your job description.
            </p>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="cta-button mt-4 inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
            </button>

            {missingRequirements.length > 0 && !isAnalyzing && (
              <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                Before analyzing: {missingRequirements.join(" • ")}
              </p>
            )}

            {uploadMessage && (
              <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                {uploadMessage}
              </p>
            )}

            {analysisMessage && (
              <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
                {analysisMessage}
              </p>
            )}

            {analysisMeta.mode && (
              <p className="mt-3 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-800">
                Analysis mode: <span className="font-semibold">{analysisMeta.mode}</span>
                {analysisMeta.note ? ` (${analysisMeta.note})` : ""}
              </p>
            )}

            {formError && (
              <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {formError}
              </p>
            )}

            {!formError && !isAnalyzing && canAnalyze && !analysisMessage && (
              <p className="mt-3 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-800">
                Looks good. Click Analyze Resume to continue.
              </p>
            )}

          </article>
        </section>

        {analysisResult && (
          <section className="grid gap-5 lg:grid-cols-2">
            <article className="glass-card rounded-2xl border border-white/40 p-6 shadow-lg lg:col-span-2">
              <h2 className="section-title text-lg font-semibold text-slate-900">Analysis Dashboard</h2>
              <p className="mt-1 text-sm text-slate-600">
                Structured results are shown below.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white/75 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">ATS Score</span>
                    <span className="text-sm font-bold text-slate-900">{atsScore}/100</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200/80">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                      style={{ width: `${atsScore}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-white/75 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Job Match Score</span>
                    <span className="text-sm font-bold text-slate-900">{matchScore}/100</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200/80">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      style={{ width: `${matchScore}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-white/75 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Scoring Breakdown</p>
                  <p className="mt-1">Keyword Match (30%): {keywordMatch}/100</p>
                  <p>Skills Match (25%): {skillsMatch}/100</p>
                  <p>Experience Relevance (20%): {experienceRelevance}/100</p>
                  <p>Education Match (10%): {educationMatch}/100</p>
                  <p>Projects/Impact (10%): {projectsImpact}/100</p>
                  <p>Resume Formatting ATS (5%): {atsFormatting}/100</p>
                </div>
                <div className="rounded-xl bg-white/75 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Keyword and Skill Gaps</p>
                  <p className="mt-1">
                    {matchedSkills.length > 0 ? matchedSkills.join(", ") : "No matched skills identified."}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Missing keywords: {missingKeywords.length > 0 ? missingKeywords.join(", ") : "None"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Detailed metrics: required {requiredSkillCoverage}/100, preferred {preferredSkillCoverage}/100,
                    title alignment {titleAlignment}/100, keyword coverage {keywordCoverage}/100.
                  </p>
                </div>
              </div>
            </article>

            <article className="glass-card rounded-2xl border border-white/40 p-6 shadow-lg">
              <h3 className="section-title text-base font-semibold text-slate-900">Skills Extracted</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {extractedSkills.length > 0 ? (
                  extractedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-emerald-100/90 px-3 py-1 text-xs font-medium text-emerald-900"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No extracted skills returned.</p>
                )}
              </div>
            </article>

            <article className="glass-card rounded-2xl border border-white/40 p-6 shadow-lg">
              <h3 className="section-title text-base font-semibold text-slate-900">Missing Skills</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {missingSkills.length > 0 ? (
                  missingSkills.map((skill) => (
                    <li key={skill} className="rounded-lg bg-amber-50/90 px-3 py-2 text-amber-900">
                      {skill}
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">No missing skills found.</li>
                )}
              </ul>
            </article>

            <article className="glass-card rounded-2xl border border-white/40 p-6 shadow-lg lg:col-span-2">
              <h3 className="section-title text-base font-semibold text-slate-900">Resume Improvement Suggestions</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
                {suggestions.length > 0 ? (
                  suggestions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
                ) : (
                  <li>No suggestions returned by AI.</li>
                )}
              </ul>
            </article>
          </section>
        )}
      </section>

      <footer className="relative z-10 mx-auto mt-12 w-full max-w-6xl px-4 pb-8 text-center text-sm text-slate-500 sm:px-6 lg:px-10">
        <div className="glass-card rounded-2xl border border-white/40 p-4 shadow-lg">
          <p>Developed by <span className="font-semibold text-slate-700">DARSHANALA ARUN TEJA</span></p>
        </div>
      </footer>
    </main>
  );
}

export default App;
