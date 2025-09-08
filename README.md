# Mock Interview Assistant

A web-based application that parses resumes and generates interview questions using Amazon Q/Bedrock.

## Setup

### Backend (Flask)
```bash
pip install -r requirements.txt
python app.py
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