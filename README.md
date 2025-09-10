# Mock Interview Assistant

A comprehensive web-based mock interview platform that combines AI-powered resume analysis, personalized interview questions, real-time answer evaluation, and job matching based on performance.

## Features

### Core Functionality
- **Resume Parsing**: Extract structured data from PDF/DOCX resumes using Amazon Bedrock
- **ATS Analysis**: Score resume compatibility with Applicant Tracking Systems
- **Interview Questions**: Generate personalized questions based on resume content
- **Timed Sessions**: 15-second countdown per question with gamified experience
- **Speech Recognition**: Voice-to-text transcription for natural interview flow
- **Answer Analysis**: AI-powered scoring and feedback on interview responses
- **Performance Tracking**: Comprehensive user profile system with session history

### Job Search Integration
- **Performance-Based Access**: Unlock job search with 50%+ interview scores
- **Personalized Matching**: Algorithm considers interview performance, skills, experience
- **Job Tiers**: Premium FAANG (80%+), Standard tech (60-79%), Basic access (50-59%)
- **Real-time Search**: SERPAPI integration for live job listings

### User Experience
- **Modern UI**: React + Tailwind CSS with animations and gradients
- **Login System**: User authentication and profile management
- **Progress Tracking**: Visual indicators for session completion and scoring
- **Responsive Design**: Works across desktop and mobile devices

## Setup

### Prerequisites
- Python 3.8+
- Node.js 14+
- AWS credentials configured for Bedrock access
- SERPAPI account for job search

### Backend (Flask)
```bash
# Install dependencies
pip install -r requirements.txt

# Start Flask server
python app.py
```

### Frontend (React)
```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Environment Variables
Create a `.env` file in the root directory:
```
SERPAPI_KEY=your_serpapi_api_key
FLASK_ENV=development
```

Get your SERPAPI key from: https://serpapi.com/

### AWS Configuration
Ensure AWS credentials are configured for Bedrock access:
```bash
aws configure
# OR set environment variables:
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

## Usage

1. **Start Services**:
   - Backend: `python app.py` (port 5000)
   - Frontend: `npm start` (port 3000)

2. **Login**: Create account or login with existing credentials

3. **Upload Resume**: Drag & drop PDF/DOCX file for parsing

4. **ATS Analysis**: Review compatibility score and improvement suggestions

5. **Interview Session**: Complete timed questions with voice or text input

6. **Job Search**: Access personalized job recommendations (requires 50%+ score)

## Architecture

### Backend Components
- **ResumeParser**: PDF/DOCX text extraction and AI parsing
- **QuestionGenerator**: Personalized interview question creation
- **ATSAnalyzer**: Resume compatibility scoring
- **AnswerAnalyzer**: Interview response evaluation
- **JobSearcher**: SERPAPI integration with performance matching
- **UserProfile**: Session tracking and performance metrics

### Frontend Components
- **App.js**: Main application with routing and state management
- **Login.js**: Authentication interface
- **InterviewSession.js**: Timed interview with speech recognition
- **Components**: Reusable UI elements (Card, LoadingSpinner)

### Data Flow
1. Resume upload → Text extraction → AI parsing → JSON structure
2. ATS analysis → Compatibility scoring → Role suggestions
3. Question generation → Timed session → Answer analysis → Performance scoring
4. Job matching → Performance-based filtering → Personalized recommendations

## Performance Scoring

### Interview Evaluation
- **Technical Questions**: Code knowledge, problem-solving
- **Behavioral Questions**: Communication, teamwork, leadership
- **Experience Questions**: Past projects, achievements, challenges

### Job Matching Algorithm
- 40% Interview Performance
- 25% Skills Matching
- 20% Experience Level
- 10% Role Matching
- 5% Education Background

### Access Tiers
- **80%+ Score**: Premium FAANG positions
- **60-79% Score**: Standard tech company roles
- **50-59% Score**: Basic job access
- **<50% Score**: Practice mode only

## File Structure
```
qcli/
├── app.py                 # Flask backend with all AI services
├── requirements.txt       # Python dependencies
├── package.json          # React dependencies
├── src/
│   ├── App.js            # Main React application
│   ├── Login.js          # Authentication component
│   ├── InterviewSession.js # Timed interview interface
│   └── components/       # Reusable UI components
├── public/               # Static React files
├── .env                  # Environment variables
└── user_profiles.json    # User data storage
```

## Development

### Adding New Features
1. Backend: Add new class to `app.py` with Bedrock integration
2. Frontend: Create React component in `src/components/`
3. Integration: Add API endpoint and corresponding frontend calls

### Testing
- Backend: Test API endpoints with curl or Postman
- Frontend: Use React Developer Tools for component debugging
- Integration: Test full user flow from resume upload to job search

## Troubleshooting

### Common Issues
- **AWS Credentials**: Ensure Bedrock access in us-east-1 region
- **SERPAPI Limits**: Check API quota and upgrade plan if needed
- **File Upload**: Verify 16MB file size limit for resumes
- **Speech Recognition**: Use Chrome/Edge for best compatibility

### Debug Mode
Set `FLASK_ENV=development` in `.env` for detailed error messages.

## License

MIT License - See LICENSE file for details.