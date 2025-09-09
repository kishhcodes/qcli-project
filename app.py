from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pdfplumber
from docx import Document
import json
import os
import boto3
from botocore.exceptions import ClientError

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

class ResumeParser:
    def __init__(self):
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
        
    def extract_text_from_pdf(self, file_path):
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text
    
    def extract_text_from_docx(self, file_path):
        doc = Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    
    def parse_with_llm(self, text):
        prompt = f"""Parse this resume text and extract information into JSON format with these exact fields:
- name: full name
- email: email address
- phone: phone number
- experience: array of work experience entries
- education: array of education entries
- skills: array of skills

Resume text:
{text}

Return only valid JSON, no other text:"""
        
        try:
            response = self.bedrock.invoke_model(
                modelId='anthropic.claude-3-haiku-20240307-v1:0',
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 2000,
                    "messages": [{"role": "user", "content": prompt}]
                })
            )
            
            result = json.loads(response['body'].read())
            content = result['content'][0]['text']
            
            # Extract JSON from response
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != 0:
                return json.loads(content[start:end])
            
        except (ClientError, json.JSONDecodeError, KeyError):
            pass
        
        # Fallback to basic parsing if LLM fails
        return self.basic_parse(text)
    
    def basic_parse(self, text):
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        return {
            "name": lines[0] if lines else "Not found",
            "email": None,
            "phone": None,
            "experience": [],
            "education": [],
            "skills": []
        }
    
    def parse_resume(self, file_path, file_type):
        if file_type == 'pdf':
            text = self.extract_text_from_pdf(file_path)
        elif file_type == 'docx':
            text = self.extract_text_from_docx(file_path)
        else:
            raise ValueError("Unsupported file type")
        
        parsed_data = self.parse_with_llm(text)
        parsed_data["raw_text"] = text
        
        return parsed_data

class QuestionGenerator:
    def __init__(self):
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    def generate_interview_questions(self, resume_data):
        prompt = f"""Based on this resume data, generate 10 relevant interview questions in JSON format.
Include technical, behavioral, and experience-based questions.

Resume data:
{json.dumps(resume_data, indent=2)}

Return JSON with this structure:
{{
  "questions": [
    {{"type": "technical", "question": "..."}},
    {{"type": "behavioral", "question": "..."}},
    {{"type": "experience", "question": "..."}}
  ]
}}

Return only valid JSON:"""
        
        try:
            response = self.bedrock.invoke_model(
                modelId='anthropic.claude-3-haiku-20240307-v1:0',
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 2000,
                    "messages": [{"role": "user", "content": prompt}]
                })
            )
            
            result = json.loads(response['body'].read())
            content = result['content'][0]['text']
            
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != 0:
                return json.loads(content[start:end])
            
        except (ClientError, json.JSONDecodeError, KeyError):
            pass
        
        return {"questions": [{"type": "general", "question": "Tell me about yourself."}]}

class ATSAnalyzer:
    def __init__(self):
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

class AnswerAnalyzer:
    def __init__(self):
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    def analyze_ats_score(self, resume_data):
        prompt = f"""Analyze this resume for ATS compatibility and suggest specific job roles. Return JSON format:

Resume data:
{json.dumps(resume_data, indent=2)}

Return JSON with this structure:
{{
  "ats_score": 85,
  "suggested_roles": ["Senior Software Engineer", "Full Stack Developer", "Backend Engineer"],
  "best_role": "Senior Software Engineer",
  "strengths": ["keyword1", "keyword2"],
  "improvements": ["suggestion1", "suggestion2"],
  "keyword_density": 75,
  "format_score": 90
}}

Return only valid JSON:"""
        
        try:
            response = self.bedrock.invoke_model(
                modelId='anthropic.claude-3-haiku-20240307-v1:0',
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 1500,
                    "messages": [{"role": "user", "content": prompt}]
                })
            )
            
            result = json.loads(response['body'].read())
            content = result['content'][0]['text']
            
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != 0:
                return json.loads(content[start:end])
            
        except (ClientError, json.JSONDecodeError, KeyError):
            pass
        
        return {
            "ats_score": 70,
            "suggested_roles": ["General Role"],
            "best_role": "General Role",
            "strengths": ["Experience listed"],
            "improvements": ["Add more keywords"],
            "keyword_density": 60,
            "format_score": 80
        }
    
    def analyze_answer(self, question, answer, question_type):
        prompt = f"""Analyze this interview answer and provide scoring with feedback. Return JSON format:

Question: {question}
Question Type: {question_type}
Answer: {answer}

Return JSON with this structure:
{{
  "score": 85,
  "feedback": "Good answer with specific examples...",
  "strengths": ["Clear communication", "Relevant experience"],
  "improvements": ["Add more technical details", "Include metrics"],
  "overall_rating": "Good"
}}

Return only valid JSON:"""
        
        try:
            response = self.bedrock.invoke_model(
                modelId='anthropic.claude-3-haiku-20240307-v1:0',
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 1500,
                    "messages": [{"role": "user", "content": prompt}]
                })
            )
            
            result = json.loads(response['body'].read())
            content = result['content'][0]['text']
            
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != 0:
                return json.loads(content[start:end])
            
        except (ClientError, json.JSONDecodeError, KeyError):
            pass
        
        return {
            "score": 70,
            "feedback": "Please provide more details in your answer.",
            "strengths": ["Answer provided"],
            "improvements": ["Add specific examples"],
            "overall_rating": "Average"
        }

parser = ResumeParser()
question_generator = QuestionGenerator()
ats_analyzer = ATSAnalyzer()
answer_analyzer = AnswerAnalyzer()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        questions = question_generator.generate_interview_questions(data)
        return jsonify(questions)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze-ats', methods=['POST'])
def analyze_ats():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        analysis = ats_analyzer.analyze_ats_score(data)
        return jsonify(analysis)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze-answer', methods=['POST'])
def analyze_answer():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['question', 'answer', 'type']):
            return jsonify({"error": "Missing required fields: question, answer, type"}), 400
        
        analysis = answer_analyzer.analyze_answer(data['question'], data['answer'], data['type'])
        return jsonify(analysis)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/parse', methods=['POST'])
def parse_resume():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        return jsonify({"error": "Only PDF and DOCX files are supported"}), 400
    
    try:
        # Save uploaded file temporarily
        file_path = f"/tmp/{file.filename}"
        file.save(file_path)
        
        # Determine file type
        file_type = 'pdf' if file.filename.lower().endswith('.pdf') else 'docx'
        
        # Parse resume
        result = parser.parse_resume(file_path, file_type)
        
        # Clean up
        os.remove(file_path)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)