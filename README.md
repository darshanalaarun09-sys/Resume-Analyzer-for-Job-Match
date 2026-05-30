# 🎯 Hire-Me: AI-Powered ATS Resume Analyzer

> **Professional Resume Scoring & Job Match Analysis Tool**
> 
> An intelligent applicant tracking system (ATS) that evaluates resumes against job descriptions with deterministic, transparent scoring.

---

## ✨ Features

### 🔍 **Intelligent Resume Analysis**
- **Resume Parsing**: Automatically extracts text from PDF and DOCX files
- **Deterministic Scoring**: Same input always produces identical scores (no randomness)
- **Multi-Format Support**: PDF and DOCX file uploads with instant processing

### 📊 **Comprehensive Scoring System**
Six weighted scoring categories to evaluate resume fit:

| Category | Weight | What It Measures |
|----------|--------|-----------------|
| **Keyword Match** | 30% | Industry-relevant keywords present in resume |
| **Skills Match** | 25% | Technical & professional skills alignment |
| **Experience** | 20% | Years of experience & relevance to role |
| **Education** | 10% | Education level & field match |
| **Projects** | 10% | Project portfolio & impact metrics |
| **Formatting** | 5% | ATS-friendly resume structure |

### 🎨 **Smart Synonym Normalization**
Recognizes technology equivalents:
- ML / AI → Machine Learning / Artificial Intelligence
- React.js / ReactJS → React
- Node / Nodejs → Node.js
- REST API / RESTful → REST API

### 📈 **Actionable Insights**
- ✅ Matched skills highlighting
- ❌ Missing keywords & skills
- 💡 Improvement suggestions
- 📋 Detailed scoring breakdown

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 16+ or higher
- **npm** 8+ or higher
- **Git** for version control

### Installation

#### 1. Clone the Repository
```bash
git clone https:https://github.com/darshanalaarun09-sys/Resume-Analyzer-for-Job-Match.git
cd Hire-Me
```

#### 2. Backend Setup
```bash
cd backend
npm install
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## 🏃 Running Locally

### Option 1: Separate Terminals (Recommended for Development)

**Terminal 1 - Backend Server**
```bash
cd backend
npm start
# or: node server.js
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend Development**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

### Option 2: Run Both Together
```bash
# From project root
npm install
npm start
```

✅ Open browser: **http://localhost:5173**

---

## 📖 Usage Guide

### Step 1: Upload Resume
- Click "Choose Resume" button
- Select PDF or DOCX file from your computer
- File is processed automatically

### Step 2: Enter Job Description
- Paste or type the job description
- Include key requirements and qualifications
- Click "Analyze" button

### Step 3: View Results
Results display comprehensive analysis:

```
ATS Score: 74/100
Job Match Score: 82/100

Breakdown:
├─ Keyword Match: 86/100
├─ Skills Match: 100/100
├─ Experience Match: 75/100
├─ Education Match: 100/100
├─ Projects Score: 73/100
└─ Formatting Score: 40/100

Missing Skills: [list]
Missing Keywords: [list]
Improvements: [actionable suggestions]
```

---

## 🔌 API Documentation

### Backend Endpoints

#### **POST /analyze**
Analyzes resume against job description

**Request:**
```json
{
  "resume_text": "John Doe, Senior Software Engineer...",
  "job_description": "We are looking for a software engineer with..."
}
```

**Response:**
```json
{
  "ATS Score": 74,
  "Job Match Score": 82,
  "Keyword Match": 86,
  "Skills Match": 100,
  "Experience Match": 75,
  "Education Match": 100,
  "Projects Score": 73,
  "Formatting Score": 40,
  "Missing Keywords": ["required", "agile"],
  "Missing Skills": [],
  "Improvements": [
    "Add more metrics to projects section",
    "Include relevant certifications",
    "Improve resume formatting with clear sections"
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request
- `500` - Server error

---

## 📁 Project Structure

```
Hire-Me/
├── backend/
│   ├── server.js              # Main Express server & ATS engine
│   ├── package.json           # Backend dependencies
│   └── node_modules/          # Installed packages
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   ├── App.css            # Styling
│   │   └── main.jsx           # React entry point
│   ├── package.json           # Frontend dependencies
│   ├── vite.config.js         # Vite configuration
│   └── tailwind.config.js     # Tailwind CSS config
│
├── README.md                  # This file
└── .gitignore                # Git ignore rules
```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Express.js (Node.js)
- **File Parsing**: 
  - `pdf2json` - PDF text extraction
  - `mammoth` - DOCX text extraction
- **Middleware**: CORS, Multer (file upload)
- **Runtime**: Node.js

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components
- **HTTP Client**: Fetch API

### Additional
- **Version Control**: Git
- **Package Manager**: npm
- **File Format Support**: PDF, DOCX

---

## 🎓 Scoring Logic

### How ATS Score is Calculated

1. **Keyword Extraction** (30%)
   - Identifies industry-relevant keywords in resume
   - Filters stop words and non-meaningful terms
   - Compares with job description keywords
   - Score: (matched_keywords / total_keywords) × 30

2. **Skills Analysis** (25%)
   - Extracts technical & soft skills from resume
   - Classifies job requirements as "Required" or "Preferred"
   - Uses synonym normalization (React.js → React)
   - Required skill match: 80% weight
   - Preferred skill match: 20% weight
   - Score: (matched_skills / required_skills) × 25

3. **Experience Match** (20%)
   - Detects years of experience in resume
   - Compares with job requirements
   - Scoring: Perfect match = 100%, Less = proportional reduction
   - Score: (years_match / required_years) × 20

4. **Education Level** (10%)
   - Detects education in resume (High School → PhD)
   - Matches with job requirements
   - Scoring: Exact match = 100%, Lower = proportional reduction
   - Score: (education_match / required_education) × 10

5. **Projects & Impact** (10%)
   - Identifies project section in resume
   - Detects metrics (increased, reduced, improved, etc.)
   - Scores project quality and impact
   - Score: (projects_found / 1) × (metrics_strength) × 10

6. **ATS Formatting** (5%)
   - Checks resume structure & clarity
   - Validates contact information presence
   - Checks for proper bullet points
   - Evaluates document length
   - Score: (formatting_quality / perfect_formatting) × 5

**Total ATS Score = Sum of all weighted category scores**

---

## 🔒 Data Privacy

- ✅ No data is stored permanently
- ✅ Resume text processed in memory only
- ✅ No external API calls for personal data
- ✅ All analysis happens locally
- ✅ HTTPS recommended for production

---

## 📋 Sample Resume & Job Description

### Sample Resume
```
JOHN DOE
(555) 123-4567 | john@email.com | linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Senior Software Engineer with 5+ years experience in full-stack development using React, Node.js, and AWS.

EXPERIENCE
Senior Software Engineer | TechCorp Inc. | 2021-2024
• Led team of 4 developers in designing microservices architecture
• Increased application performance by 40% through optimization
• Implemented CI/CD pipeline reducing deployment time by 60%

Junior Software Engineer | StartupXYZ | 2019-2021
• Developed React components for customer dashboard
• Improved test coverage from 45% to 85%

SKILLS
Languages: JavaScript, Python, TypeScript
Frontend: React, Vue.js, Tailwind CSS
Backend: Node.js, Express, REST APIs
Cloud: AWS (EC2, S3, Lambda), Docker

EDUCATION
B.S. Computer Science | State University | 2019

PROJECTS
Portfolio Analytics Dashboard
• Built real-time data visualization dashboard using React & D3.js
• Increased user engagement by 35%
```

### Sample Job Description
```
SENIOR FULL-STACK ENGINEER

Requirements:
• 5+ years of software development experience (Required)
• Expert in React and Node.js (Required)
• Experience with AWS (Required)
• REST API design & implementation (Required)
• Docker & Kubernetes (Preferred)
• Team leadership experience (Preferred)

Responsibilities:
• Design and implement scalable web applications
• Mentor junior developers
• Participate in code reviews
• Implement automated testing
```

**Expected Result:**
- ATS Score: ~85/100
- Job Match Score: ~90/100
- Strong match on all required skills

---

## 🚢 Deployment

### Deploy Backend to Render

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create New → Web Service
4. Connect GitHub repository
5. Build command: `cd backend && npm install`
6. Start command: `npm start`
7. Set environment variables if needed
8. CORS is configured for ``

### Deploy Frontend to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import GitHub repository
5. Framework: Vite
6. Build command: `npm run build`
7. Output directory: `dist`
8. Frontend is configured to call `https://hire-me-1fsk.onrender.com`

---

## 🐛 Troubleshooting

### Issue: "Port 5000 already in use"
```bash
# Find process on port 5000
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <PID> /F

# Kill process (Mac/Linux)
kill -9 <PID>
```

### Issue: "Cannot find module 'express'"
```bash
cd backend
npm install
```

### Issue: Frontend can't reach backend
- For local development, check the backend is running on `localhost:5000`
- For deployed frontend apps, the frontend now points to `https://hire-me-1fsk.onrender.com`
- Verify the backend URL in the browser by opening `/api/health`
- Check CORS settings in `server.js`

### Issue: PDF upload fails
- Ensure PDF is valid (not corrupted)
- Check file size is reasonable (<10MB)
- Try DOCX format if PDF fails

---

## 📊 Performance

- ✅ Resume parsing: <500ms
- ✅ Analysis scoring: <200ms
- ✅ Total response: <1s
- ✅ Supports files up to 10MB
- ✅ Deterministic caching for identical inputs

## 👨‍💻 Author

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Steps to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 📞 Support

Need help? 
- 📧 Open an issue on GitHub
- 📖 Check the documentation above
- 🔍 Review the sample resume & job description

---

## 🎯 Roadmap

- [ ] Add LinkedIn profile import
- [ ] Support more file formats (.txt, .rtf)
- [ ] Advanced AI suggestions
- [ ] Resume optimization recommendations
- [ ] Batch resume analysis
- [ ] Analytics dashboard
- [ ] Custom scoring weights
- [ ] Multi-language support

---

## ⭐ Show Your Support

If this project helped you, please consider giving it a **star** on GitHub!

```
https://github.com/darshanalaarun09-sys/Resume-Analyzer-for-Job-Match.git
```

---

**Last Updated:** March 2026  
**Status**: ✅ Production Ready

## Production Checklist

1. Use a real OPENAI_API_KEY in backend/.env
2. Restrict CORS in backend/server.js to your real frontend domain
3. Add request rate limiting for /analyze and /upload
4. Add logging and monitoring (for example Winston + hosted logs)
5. Add authentication before exposing public usage
6. Store uploaded files securely if you move from memory storage
7. Add tests for upload/analyze routes and frontend flows
8. Hide secrets from git and CI logs

## Deployment Notes

### Backend (Render/Railway/Fly.io)

1. Deploy backend folder
2. Set env vars: OPENAI_API_KEY, OPENAI_MODEL, PORT
3. Set start command: npm start

### Frontend (Vercel/Netlify)

1. Deploy frontend folder
2. Set env var: VITE_API_BASE_URL=<your_backend_url>
3. Build command: npm run build
4. Output directory: dist

## Current Status

The app is functional end-to-end:

1. Frontend uploads resume and sends job description
2. Backend extracts text and calls OpenAI
3. Frontend displays ATS score, match score, skills, missing skills, and suggestions
