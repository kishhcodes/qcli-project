# Mock Interview Assistant

A web-based application that parses resumes and generates interview questions using Amazon Q/Bedrock.

## Setup

### Backend (Flask)
```bash
pip install -r requirements.txt
python app.py
```

### Environment Variables
Create a `.env` file in the root directory with the following variables:
```
SERPAPI_KEY=your_serpapi_api_key  # For job search functionality
```
You can get a SERPAPI API key from https://serpapi.com/

Alternatively, you can set these environment variables manually:
```bash
export SERPAPI_KEY="your_serpapi_api_key"
```

### Frontend (React)
```bash
npm install
npm start
```

## Usage

1. Start Flask backend on port 5000
2. Start React frontend on port 3000
3. Upload PDF/DOCX resume
4. Parse resume to extract JSON data
5. Generate interview questions based on resume

## Features

- Resume parsing (PDF/DOCX)
- LLM-powered data extraction
- Interview question generation
- Modern React + Tailwind UI
- Real-time processing