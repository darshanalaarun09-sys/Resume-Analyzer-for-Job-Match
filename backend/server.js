const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const PDFParser = require("pdf2json");
const mammoth = require("mammoth");
const { createHash } = require("crypto");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = ["https://resume-analyzer-for-job-match.vercel.app"];

const isLocalOrigin = (origin) => {
  return Boolean(origin) && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
};

const isVercelOrigin = (origin) => {
  return Boolean(origin) && /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      isLocalOrigin(origin) ||
      isVercelOrigin(origin) ||
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const getFileExtension = (fileName = "") => {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
};

const safeDecodePdfToken = (token) => {
  if (typeof token !== "string") {
    return "";
  }

  try {
    return decodeURIComponent(token);
  } catch {
    // Some PDFs contain invalid percent-encoded fragments.
    const sanitized = token.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
    try {
      return decodeURIComponent(sanitized);
    } catch {
      return token;
    }
  }
};

const extractTextFromPdfBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(new Error(errData?.parserError || "Unknown PDF parse error"));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        const texts = [];
        const pages = pdfData?.Pages || [];

        for (const page of pages) {
          for (const item of page.Texts || []) {
            for (const run of item.R || []) {
              if (run?.T) {
                texts.push(safeDecodePdfToken(run.T));
              }
            }
          }
        }

        resolve(texts.join(" "));
      } catch (error) {
        reject(error);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
};

const extractTextFromResume = async (file) => {
  const extension = getFileExtension(file.originalname);

  if (extension === "pdf") {
    try {
      return await extractTextFromPdfBuffer(file.buffer);
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  if (extension === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value || "";
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  throw new Error("Unsupported file format. Please upload PDF or DOCX only.");
};

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(cleaned);
  }
};

const analysisCache = new Map();
const MAX_CACHE_ENTRIES = 100;

const KNOWN_SKILLS = [
  "java",
  "python",
  "c++",
  "c#",
  "javascript",
  "typescript",
  "react",
  "node.js",
  "express",
  "sql",
  "mysql",
  "postgresql",
  "mongodb",
  "aws",
  "azure",
  "docker",
  "kubernetes",
  "git",
  "rest api",
  "machine learning",
  "data science",
  "nlp",
  "excel",
  "power bi",
  "tableau",
  "communication",
  "problem solving",
  "oop",
  "sdlc",
];

const SKILL_ALIASES = {
  javascript: ["javascript", "js", "ecmascript"],
  typescript: ["typescript", "ts"],
  "node.js": ["node", "nodejs", "node.js"],
  react: ["react", "reactjs", "react.js"],
  sql: ["sql", "postgresql", "mysql", "sqlite", "mssql"],
  "rest api": ["rest api", "restful api", "api development"],
  "machine learning": ["machine learning", "ml", "scikit-learn"],
  "data science": ["data science", "data analysis", "analytics"],
  communication: ["communication", "stakeholder", "presentation"],
  docker: ["docker", "containerization", "containers"],
  kubernetes: ["kubernetes", "k8s"],
};

const ACTION_VERBS = [
  "built",
  "developed",
  "designed",
  "implemented",
  "improved",
  "optimized",
  "automated",
  "delivered",
  "led",
  "managed",
  "created",
  "reduced",
  "increased",
  "achieved",
  "migrated",
];

const REQUIRED_MARKERS = [
  "must",
  "required",
  "mandatory",
  "minimum",
  "need to",
  "needs to",
  "hands on",
  "proficient",
  "strong knowledge",
];

const PREFERRED_MARKERS = [
  "preferred",
  "nice to have",
  "good to have",
  "plus",
  "bonus",
  "optional",
];

const ROLE_TITLES = [
  "software engineer",
  "frontend developer",
  "front end developer",
  "backend developer",
  "back end developer",
  "full stack developer",
  "data analyst",
  "data scientist",
  "machine learning engineer",
  "devops engineer",
  "qa engineer",
  "test engineer",
  "product manager",
  "business analyst",
  "cloud engineer",
];

const ATS_WEIGHTS = {
  keyword_match: 0.3,
  skills_match: 0.25,
  experience_relevance: 0.2,
  education_match: 0.1,
  projects_impact: 0.1,
  ats_formatting: 0.05,
};

const EQUIVALENT_TERMS = {
  "machine learning": ["machine learning", "ml", "ml models", "ml model"],
  "artificial intelligence": ["artificial intelligence", "ai", "a.i."],
  react: ["react", "reactjs", "react.js"],
  "node.js": ["node", "nodejs", "node.js"],
  "rest api": ["rest api", "restful api", "restful apis", "api development"],
  javascript: ["javascript", "js", "ecmascript"],
  typescript: ["typescript", "ts"],
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "will",
  "your",
  "you",
  "our",
  "are",
  "was",
  "were",
  "into",
  "about",
  "role",
  "job",
  "experience",
  "work",
  "team",
  "years",
  "year",
  "skills",
  "ability",
  "strong",
  "required",
  "preferred",
  "must",
  "mandatory",
  "minimum",
  "need",
  "needs",
]);

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeEquivalentTerms = (inputText = "") => {
  let normalized = ` ${normalizeText(inputText)} `;

  for (const [canonical, aliases] of Object.entries(EQUIVALENT_TERMS)) {
    for (const alias of aliases) {
      const escapedAlias = escapeRegex(alias).replace(/\s+/g, "\\s+");
      const aliasRegex = new RegExp(`(^|[^a-z0-9+#.])${escapedAlias}(?=$|[^a-z0-9+#.])`, "gi");
      normalized = normalized.replace(aliasRegex, (match, prefix) => `${prefix}${canonical}`);
    }
  }

  return normalizeText(normalized);
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsTerm = (text, term) => {
  if (!text || !term) {
    return false;
  }

  const pattern = escapeRegex(term).replace(/\s+/g, "\\s+");
  const regex = new RegExp(`(^|[^a-z0-9+#.])${pattern}(?=$|[^a-z0-9+#.])`, "i");
  return regex.test(text);
};

const hashInputs = (resumeText, jobDescription) =>
  createHash("sha256")
    .update(`${normalizeText(resumeText)}||${normalizeText(jobDescription)}`)
    .digest("hex");

const extractMatchedSkills = (text) => {
  const lower = normalizeEquivalentTerms(text);
  const found = new Set();

  for (const skill of KNOWN_SKILLS) {
    if (containsTerm(lower, skill)) {
      found.add(skill);
    }
  }

  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((alias) => containsTerm(lower, alias))) {
      found.add(canonical);
    }
  }

  return [...found].sort();
};

const getTopKeywords = (text, limit = 30) => {
  const tokens = normalizeEquivalentTerms(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  const frequency = new Map();
  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
};

const unique = (items) => [...new Set(items)];

const splitClauses = (text) =>
  String(text || "")
    .split(/[\n.;:]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);

const cleanKeywordToken = (value) =>
  String(value || "")
    .trim()
    .replace(/^[^a-z0-9+#]+/i, "")
    .replace(/[^a-z0-9+#]+$/i, "")
    .toLowerCase();

const extractYears = (text) => {
  const normalized = String(text || "");
  const matches = [...normalized.matchAll(/(\d{1,2})\s*\+?\s*(?:years|year|yrs|yr)/gi)];
  if (matches.length === 0) {
    return 0;
  }

  return Math.max(...matches.map((item) => Number(item[1]) || 0));
};

const extractRoleTitle = (text) => {
  const lower = normalizeText(text);
  return ROLE_TITLES.find((title) => containsTerm(lower, title)) || "";
};

const classifyJobSkills = (jobDescription, jobSkills) => {
  const clauses = splitClauses(jobDescription);
  const required = new Set();
  const preferred = new Set();

  for (const clause of clauses) {
    const clauseSkills = jobSkills.filter((skill) => containsTerm(clause, skill));
    if (clauseSkills.length === 0) {
      continue;
    }

    const isRequired = REQUIRED_MARKERS.some((marker) => clause.includes(marker));
    const isPreferred = PREFERRED_MARKERS.some((marker) => clause.includes(marker));

    if (isRequired) {
      clauseSkills.forEach((skill) => required.add(skill));
      continue;
    }

    if (isPreferred) {
      clauseSkills.forEach((skill) => preferred.add(skill));
    }
  }

  const requiredSkills = required.size > 0 ? [...required] : [...jobSkills];
  const preferredSkills = [...preferred].filter((skill) => !requiredSkills.includes(skill));

  return {
    requiredSkills,
    preferredSkills,
  };
};

const calculateSectionScore = (resumeText) => {
  const lower = normalizeText(resumeText);
  const expectedSections = [
    { key: "summary", patterns: ["summary", "profile", "objective"] },
    { key: "experience", patterns: ["experience", "employment", "work history"] },
    { key: "skills", patterns: ["skills", "technical skills", "tech stack"] },
    { key: "projects", patterns: ["projects", "project experience"] },
    { key: "education", patterns: ["education", "academic", "degree"] },
  ];

  let present = 0;
  for (const section of expectedSections) {
    if (section.patterns.some((pattern) => lower.includes(pattern))) {
      present += 1;
    }
  }

  const score = Math.round((present / expectedSections.length) * 100);
  return { score, present, total: expectedSections.length };
};

const calculateImpactScore = (resumeText) => {
  const lower = normalizeText(resumeText);
  const hasMetrics = /(\d+\s?%|\$\s?\d+|\d+\+|\d+\s?(users|clients|projects|months|years))/i.test(
    resumeText || ""
  );
  const actionVerbCount = ACTION_VERBS.filter((verb) => lower.includes(verb)).length;
  const verbScore = clamp(Math.round((actionVerbCount / 8) * 100));
  const metricScore = hasMetrics ? 100 : 45;
  const score = Math.round(verbScore * 0.55 + metricScore * 0.45);

  return { score, hasMetrics, actionVerbCount };
};

const EDUCATION_LEVELS = {
  high_school: 1,
  diploma: 2,
  bachelor: 3,
  master: 4,
  phd: 5,
};

const detectEducationLevel = (text) => {
  const lower = normalizeText(text);
  if (/(phd|doctorate)/i.test(lower)) return "phd";
  if (/(master|mtech|ms|m\.s\.|mba)/i.test(lower)) return "master";
  if (/(bachelor|btech|b\.tech|be|b\.e|bsc|b\.sc|ba\b|bca)/i.test(lower)) return "bachelor";
  if (/(diploma|associate)/i.test(lower)) return "diploma";
  if (/(12th|high school|secondary)/i.test(lower)) return "high_school";
  return "";
};

const scoreEducationMatch = (resumeText, jobDescription) => {
  const resumeLevel = detectEducationLevel(resumeText);
  const jdLevel = detectEducationLevel(jobDescription);

  if (!jdLevel) {
    // No explicit education requirement in JD.
    return {
      score: resumeLevel ? 85 : 65,
      resume_level: resumeLevel || "not_found",
      required_level: "not_specified",
    };
  }

  if (!resumeLevel) {
    return {
      score: 40,
      resume_level: "not_found",
      required_level: jdLevel,
    };
  }

  const resumeRank = EDUCATION_LEVELS[resumeLevel] || 0;
  const requiredRank = EDUCATION_LEVELS[jdLevel] || 0;
  const score = resumeRank >= requiredRank ? 100 : clamp(55 + (resumeRank / requiredRank) * 30);

  return {
    score: Math.round(score),
    resume_level: resumeLevel,
    required_level: jdLevel,
  };
};

const scoreProjectImpact = (resumeText, impactScore) => {
  const lower = normalizeText(resumeText);
  const hasProjectSection =
    containsTerm(lower, "projects") ||
    containsTerm(lower, "project") ||
    containsTerm(lower, "portfolio");

  const sectionComponent = hasProjectSection ? 100 : 55;
  const score = Math.round(sectionComponent * 0.35 + impactScore * 0.65);

  return {
    score,
    has_project_section: hasProjectSection,
  };
};

const scoreAtsFormatting = (resumeText, sectionScore) => {
  const rawText = String(resumeText || "");
  const lower = normalizeText(rawText);
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(rawText);
  const hasPhone = /(\+?\d[\d\s-]{7,}\d)/.test(rawText);
  const hasBullets = /(^|\n)\s*[-*•]\s+/.test(rawText);
  const plainLength = lower.replace(/\s/g, "").length;
  const lengthScore = plainLength >= 1000 && plainLength <= 8000 ? 100 : plainLength >= 600 ? 80 : 55;

  const metaScore =
    (hasEmail ? 35 : 0) +
    (hasPhone ? 25 : 0) +
    (hasBullets ? 20 : 0) +
    (lengthScore >= 80 ? 20 : 10);

  const score = Math.round(sectionScore * 0.6 + metaScore * 0.4);

  return {
    score,
    has_email: hasEmail,
    has_phone: hasPhone,
    has_bullets: hasBullets,
  };
};

const titleCase = (value) => {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const buildLocalAnalysis = (resumeText, jobDescription) => {
  const resumeSkills = extractMatchedSkills(resumeText);
  const jobSkills = extractMatchedSkills(jobDescription);
  const jobKeywords = unique(getTopKeywords(jobDescription, 35).map(cleanKeywordToken).filter(Boolean));
  const resumeKeywords = new Set(
    getTopKeywords(resumeText, 120).map(cleanKeywordToken).filter(Boolean)
  );

  const resumeSkillSet = new Set(resumeSkills);
  const matched = jobSkills.filter((skill) => resumeSkillSet.has(skill));

  const { requiredSkills, preferredSkills } = classifyJobSkills(jobDescription, jobSkills);

  const matchedRequiredSkills = requiredSkills.filter((skill) => resumeSkillSet.has(skill));
  const matchedPreferredSkills = preferredSkills.filter((skill) => resumeSkillSet.has(skill));
  const missingRequiredSkills = requiredSkills.filter((skill) => !resumeSkillSet.has(skill));
  const missingPreferredSkills = preferredSkills.filter((skill) => !resumeSkillSet.has(skill));
  const missing = unique([...missingRequiredSkills, ...missingPreferredSkills]);

  const keywordMatches = jobKeywords.filter((keyword) => resumeKeywords.has(keyword));
  const missingKeywords = unique(
    jobKeywords
      .filter((keyword) => !resumeKeywords.has(keyword))
      .map(cleanKeywordToken)
      .filter(Boolean)
  );
  const keywordCoverage = jobKeywords.length
    ? Math.round((keywordMatches.length / jobKeywords.length) * 100)
    : 60;

  const requiredCoverage = requiredSkills.length
    ? Math.round((matchedRequiredSkills.length / requiredSkills.length) * 100)
    : 60;
  const preferredCoverage = preferredSkills.length
    ? Math.round((matchedPreferredSkills.length / preferredSkills.length) * 100)
    : requiredCoverage;
  const weightedSkillCoverage = Math.round(requiredCoverage * 0.8 + preferredCoverage * 0.2);

  const section = calculateSectionScore(resumeText);
  const impact = calculateImpactScore(resumeText);
  const education = scoreEducationMatch(resumeText, jobDescription);
  const projectImpact = scoreProjectImpact(resumeText, impact.score);
  const formatting = scoreAtsFormatting(resumeText, section.score);

  const requiredYears = extractYears(jobDescription);
  const resumeYears = extractYears(resumeText);
  const experienceAlignment = requiredYears
    ? clamp(Math.round((resumeYears / requiredYears) * 100))
    : resumeYears > 0
      ? 80
      : 60;

  const jdRole = extractRoleTitle(jobDescription);
  const resumeRole = extractRoleTitle(resumeText);
  const titleAlignment = jdRole
    ? resumeRole
      ? jdRole === resumeRole
        ? 100
        : 45
      : 55
    : 70;

  const ruleBasedAtsScore = Math.round(
    keywordCoverage * ATS_WEIGHTS.keyword_match +
      weightedSkillCoverage * ATS_WEIGHTS.skills_match +
      experienceAlignment * ATS_WEIGHTS.experience_relevance +
      education.score * ATS_WEIGHTS.education_match +
      projectImpact.score * ATS_WEIGHTS.projects_impact +
      formatting.score * ATS_WEIGHTS.ats_formatting
  );

  // Apply strict penalties for missing critical requirements.
  const skillsPenalty = missingRequiredSkills.length * 12 + missingPreferredSkills.length * 4;
  const skillsMatchScore = clamp(weightedSkillCoverage - skillsPenalty);

  const experienceMatchScore = clamp(
    Math.round(experienceAlignment * 0.75 + titleAlignment * 0.25 - (requiredCoverage < 40 ? 10 : 0))
  );

  const strictAtsScore = clamp(
    Math.round(
      keywordCoverage * ATS_WEIGHTS.keyword_match +
        skillsMatchScore * ATS_WEIGHTS.skills_match +
        experienceMatchScore * ATS_WEIGHTS.experience_relevance +
        education.score * ATS_WEIGHTS.education_match +
        projectImpact.score * ATS_WEIGHTS.projects_impact +
        formatting.score * ATS_WEIGHTS.ats_formatting -
        missingRequiredSkills.length * 5
    )
  );

  const matchScore = clamp(
    Math.round(
      keywordCoverage * 0.3 +
        skillsMatchScore * 0.35 +
        experienceMatchScore * 0.25 +
        education.score * 0.05 +
        projectImpact.score * 0.05 -
        missingRequiredSkills.length * 7
    )
  );
  const atsScore = strictAtsScore;

  const boundedMatch = clamp(matchScore);
  const boundedAts = clamp(atsScore);

  const suggestions = [];
  if (missingRequiredSkills.length > 0) {
    suggestions.push(
      `Add required skills from the job description where you have real experience: ${missingRequiredSkills
        .slice(0, 6)
        .map(titleCase)
        .join(", ")}.`
    );
  }
  if (requiredYears > 0 && resumeYears < requiredYears) {
    suggestions.push(
      `Job asks for about ${requiredYears}+ years experience. Highlight relevant past work and show timeline clearly in experience bullets.`
    );
  }
  if (keywordCoverage < 70) {
    suggestions.push(
      "Mirror important role keywords from the job description in your summary, experience, and projects sections."
    );
  }
  if (impact.hasMetrics === false) {
    suggestions.push(
      "Add measurable impact to each experience bullet (percent improvements, time saved, users served, or revenue impact)."
    );
  }
  if (section.score < 80) {
    suggestions.push(
      "Use clear headings: Summary, Skills, Experience, Projects, and Education to improve ATS parsing reliability."
    );
  }
  if (suggestions.length < 5) {
    suggestions.push("Tailor your top 5 bullets to directly match the responsibilities in the job description.");
  }
  if (suggestions.length < 5) {
    suggestions.push("Place the most relevant tools and technologies near the top of your skills section.");
  }
  if (education.score < 75 && suggestions.length < 5) {
    suggestions.push("Include your highest education clearly (degree, field, university, graduation year)." );
  }

  const improvedSections = [];
  if (section.score < 85) improvedSections.push("Resume Structure");
  if (requiredCoverage < 85) improvedSections.push("Required Skills Alignment");
  if (keywordCoverage < 70) improvedSections.push("Summary");
  if (missing.length > 0) improvedSections.push("Skills");
  if (impact.score < 75 || experienceAlignment < 70) improvedSections.push("Experience");
  if (improvedSections.length === 0) {
    improvedSections.push("Projects", "Experience", "Summary");
  }

  return {
    "ATS Score": boundedAts,
    "Job Match Score": boundedMatch,
    "Keyword Match": keywordCoverage,
    "Skills Match": skillsMatchScore,
    "Experience Match": experienceMatchScore,
    "Education Match": education.score,
    "Projects Score": projectImpact.score,
    "Formatting Score": formatting.score,
    "Missing Keywords": missingKeywords.slice(0, 15),
    "Missing Skills": missing.map(titleCase),
    Improvements: suggestions.slice(0, 5),
  };
};

app.get("/", (req, res) => {
  res.json({
    message: "Backend is running",
    status: "ok",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    service: "resume-api",
    status: "healthy",
  });
});

app.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded. Please upload a resume in PDF or DOCX format.",
      });
    }

    const extension = getFileExtension(req.file.originalname);
    if (!["pdf", "docx"].includes(extension)) {
      return res.status(400).json({
        error: "Unsupported file format. Please upload PDF or DOCX only.",
      });
    }

    const extractedText = await extractTextFromResume(req.file);

    if (!extractedText.trim()) {
      return res.status(422).json({
        error: "We could not extract meaningful text from this file.",
      });
    }

    return res.status(200).json({
      message: "Resume uploaded and text extracted successfully.",
      file_name: req.file.originalname,
      file_type: extension,
      resume_text: extractedText,
    });
  } catch (error) {
    console.error("Upload processing error:", error);
    return res.status(500).json({
      error: "Failed to process uploaded resume.",
      details: error.message,
    });
  }
});

app.post("/analyze", async (req, res) => {
  try {
    const { resume_text, job_description } = req.body;

    if (!resume_text || !job_description) {
      return res.status(400).json({
        error: "resume_text and job_description are required.",
      });
    }

    const cacheKey = hashInputs(resume_text, job_description);
    if (analysisCache.has(cacheKey)) {
      return res.status(200).json({
        message: "Analysis generated successfully.",
        analysis: analysisCache.get(cacheKey),
        mode: "deterministic-cache",
      });
    }

    const finalAnalysis = buildLocalAnalysis(resume_text, job_description);

    if (analysisCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = analysisCache.keys().next().value;
      analysisCache.delete(firstKey);
    }
    analysisCache.set(cacheKey, finalAnalysis);

    const payload = {
      message: "Analysis generated successfully.",
      analysis: finalAnalysis,
      mode: "deterministic",
    };

    return res.status(200).json(payload);
  } catch (error) {
    const { resume_text, job_description } = req.body || {};
    if (resume_text && job_description) {
      const fallback = buildLocalAnalysis(resume_text, job_description);
      return res.status(200).json({
        message: "Analysis generated successfully.",
        analysis: fallback,
        mode: "local",
        note: error.message,
      });
    }

    return res.status(400).json({
      error: "Failed to analyze resume and job description.",
      details: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.message,
    });
  }

  return next(err);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
