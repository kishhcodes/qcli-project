from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pdfplumber
from docx import Document
import json
import os
import boto3
from botocore.exceptions import ClientError
import requests

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

class AnswerAnalyzer:
    def __init__(self):
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
    
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

class UserProfile:
    def __init__(self):
        self.profiles_file = 'user_profiles.json'
        self.load_profiles()
    
    def load_profiles(self):
        try:
            with open(self.profiles_file, 'r') as f:
                self.profiles = json.load(f)
        except FileNotFoundError:
            self.profiles = {}
    
    def save_profiles(self):
        with open(self.profiles_file, 'w') as f:
            json.dump(self.profiles, f, indent=2)
    
    def record_session(self, user_email, session_data):
        if user_email not in self.profiles:
            self.profiles[user_email] = {
                'sessions': [],
                'ats_history': [],
                'performance_metrics': {
                    'avg_score': 0,
                    'total_sessions': 0,
                    'preferred_roles': [],
                    'skill_strengths': []
                }
            }
        
        # Record session with avg_score
        session_entry = {
            'timestamp': session_data.get('timestamp'),
            'answers': session_data.get('answers', {}),
            'scores': session_data.get('scores', {}),
            'completion_rate': session_data.get('completion_rate', 0),
            'avg_score': session_data.get('avg_score', 0)
        }
        self.profiles[user_email]['sessions'].append(session_entry)
        
        # Record ATS data if provided
        if 'ats_data' in session_data:
            self.profiles[user_email]['ats_history'].append(session_data['ats_data'])
        
        # Update performance metrics
        self._update_metrics(user_email)
        self.save_profiles()
    
    def _update_metrics(self, user_email):
        profile = self.profiles[user_email]
        sessions = profile['sessions']
        
        if sessions:
            # Calculate average interview score from sessions with avg_score
            sessions_with_scores = [s for s in sessions if s.get('avg_score', 0) > 0]
            if sessions_with_scores:
                total_score = sum(s.get('avg_score', 0) for s in sessions_with_scores)
                profile['performance_metrics']['avg_score'] = total_score / len(sessions_with_scores)
            else:
                # Fallback to completion rate if no interview scores
                if len(sessions) > 0:
                    total_completion = sum(s.get('completion_rate', 0) for s in sessions)
                    profile['performance_metrics']['avg_score'] = total_completion / len(sessions)
                else:
                    profile['performance_metrics']['avg_score'] = 0
            
            profile['performance_metrics']['total_sessions'] = len(sessions)
            
            # Extract preferred roles from ATS history
            if profile['ats_history']:
                latest_ats = profile['ats_history'][-1]
                profile['performance_metrics']['preferred_roles'] = latest_ats.get('suggested_roles', [])
                profile['performance_metrics']['skill_strengths'] = latest_ats.get('strengths', [])
    
    def get_user_profile(self, user_email):
        return self.profiles.get(user_email, {})
    
    def get_personalized_job_criteria(self, user_email):
        profile = self.get_user_profile(user_email)
        if not profile:
            return None
        
        metrics = profile.get('performance_metrics', {})
        return {
            'preferred_roles': metrics.get('preferred_roles', []),
            'skill_strengths': metrics.get('skill_strengths', []),
            'experience_level': 'senior' if metrics.get('avg_score', 0) > 80 else 'mid' if metrics.get('avg_score', 0) > 60 else 'junior',
            'total_sessions': metrics.get('total_sessions', 0)
        }

class JobSearcher:
    def __init__(self):
        self.serpapi_key = os.getenv('SERPAPI_KEY')
        self.user_profile = UserProfile()
    
    def search_jobs(self, resume_data, ats_analysis, interview_score=0, user_email=None):
        # Build comprehensive job criteria from ALL available data
        job_criteria = {
            'interview_score': interview_score,
            'skills': resume_data.get('skills', []),
            'experience': resume_data.get('experience', []),
            'education': resume_data.get('education', []),
            'ats_score': ats_analysis.get('ats_score', 0),
            'best_role': ats_analysis.get('best_role', 'Software Engineer'),
            'suggested_roles': ats_analysis.get('suggested_roles', []),
            'strengths': ats_analysis.get('strengths', []),
            'years_experience': self._calculate_experience_years(resume_data.get('experience', [])),
            'education_level': self._get_education_level(resume_data.get('education', [])),
            'tech_stack': self._extract_tech_stack(resume_data.get('skills', []))
        }
        
        # Add user profile data if available
        if user_email:
            profile_criteria = self.user_profile.get_personalized_job_criteria(user_email)
            if profile_criteria:
                job_criteria.update(profile_criteria)
        
        if not self.serpapi_key:
            return self._get_comprehensive_fallback_jobs(job_criteria)
        
        try:
            # Build search query using resume skills and role
            search_terms = [job_criteria['best_role']]
            if job_criteria['tech_stack']:
                search_terms.extend(job_criteria['tech_stack'][:2])  # Add top 2 tech skills
            
            search_query = ' '.join(search_terms)
            
            params = {
                "engine": "google_jobs",
                "q": search_query,
                "location": "United States",
                "api_key": self.serpapi_key
            }
            
            response = requests.get("https://serpapi.com/search", params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                jobs = []
                
                for job in data.get("jobs_results", [])[:8]:
                    apply_link = "#"
                    if job.get("apply_options"):
                        apply_link = job["apply_options"][0].get("link", "#")
                    
                    # Comprehensive matching score
                    match_score = self._calculate_comprehensive_match_score(job, job_criteria)
                    
                    jobs.append({
                        "title": job.get("title", "N/A"),
                        "company": job.get("company_name", "N/A"),
                        "location": job.get("location", "N/A"),
                        "description": (job.get("description", "No description")[:200] + "...") if job.get("description") else "No description available",
                        "apply_link": apply_link,
                        "source": "Google Jobs (SERPAPI)",
                        "match_score": match_score,
                        "personalized": True
                    })
                
                # Sort by comprehensive match score
                jobs.sort(key=lambda x: x['match_score'], reverse=True)
                
                if jobs:
                    return {"jobs": jobs[:5], "personalized": True}
            
        except Exception as e:
            print(f"SERPAPI failed: {e}")
        
        return self._get_comprehensive_fallback_jobs(job_criteria)
    
    def _calculate_comprehensive_match_score(self, job, criteria):
        job_title = job.get("title", "").lower()
        job_desc = job.get("description", "").lower()
        
        # Base score from interview performance (40% weight)
        interview_score = criteria.get('interview_score', 0)
        if interview_score >= 80:
            base_score = 40
        elif interview_score >= 60:
            base_score = 30
        elif interview_score >= 40:
            base_score = 20
        else:
            base_score = 10
        
        # Skills matching (25% weight)
        skill_score = 0
        user_skills = [s.lower() for s in criteria.get('skills', [])]
        tech_stack = [t.lower() for t in criteria.get('tech_stack', [])]
        
        for skill in user_skills + tech_stack:
            if skill in job_desc or skill in job_title:
                skill_score += 3
        skill_score = min(skill_score, 25)
        
        # Experience level matching (20% weight)
        exp_score = 0
        years_exp = criteria.get('years_experience', 0)
        
        if years_exp >= 5 and ('senior' in job_title or 'lead' in job_title):
            exp_score = 20
        elif years_exp >= 3 and 'senior' not in job_title and 'junior' not in job_title:
            exp_score = 15
        elif years_exp < 2 and ('junior' in job_title or 'entry' in job_title):
            exp_score = 20
        else:
            exp_score = 10
        
        # Role matching (10% weight)
        role_score = 0
        best_role = criteria.get('best_role', '').lower()
        suggested_roles = [r.lower() for r in criteria.get('suggested_roles', [])]
        
        if best_role in job_title:
            role_score = 10
        elif any(role in job_title for role in suggested_roles):
            role_score = 7
        
        # Education matching (5% weight)
        edu_score = 0
        edu_level = criteria.get('education_level', '')
        if edu_level == 'Masters' and ('master' in job_desc or 'mba' in job_desc):
            edu_score = 5
        elif edu_level in ['Bachelors', 'Masters'] and 'degree' in job_desc:
            edu_score = 3
        
        total_score = base_score + skill_score + exp_score + role_score + edu_score
        
        # Penalty for mismatched seniority
        if interview_score < 50 and ('senior' in job_title or 'lead' in job_title):
            total_score -= 30
        
        return min(max(total_score, 0), 100)
    
    def _get_comprehensive_fallback_jobs(self, criteria):
        return self._get_fallback_jobs(criteria)
    
    def _get_fallback_jobs(self, criteria):
        """Fallback jobs when SERPAPI fails or is not configured"""
        interview_score = criteria.get('interview_score', 0)
        years_exp = criteria.get('years_experience', 0)
        user_skills = criteria.get('skills', [])
        tech_stack = criteria.get('tech_stack', [])
        best_role = criteria.get('best_role', 'Software Engineer')
        
        # Different job pools based on interview performance
        if interview_score >= 80:
            # High performers get premium opportunities
            job_data = {
                "Software Engineer": [
                    {"company": "Google", "location": "Mountain View, CA", "salary": "$180k-250k", "level": "Senior"},
                    {"company": "Meta", "location": "Menlo Park, CA", "salary": "$190k-270k", "level": "Staff"},
                    {"company": "Apple", "location": "Cupertino, CA", "salary": "$175k-240k", "level": "Principal"},
                    {"company": "Netflix", "location": "Los Gatos, CA", "salary": "$200k-280k", "level": "Senior"},
                    {"company": "Stripe", "location": "San Francisco, CA", "salary": "$185k-260k", "level": "Lead"}
                ]
            }
        elif interview_score >= 60:
            # Average performers get standard opportunities
            job_data = {
                "Software Engineer": [
                    {"company": "Microsoft", "location": "Seattle, WA", "salary": "$130k-180k", "level": ""},
                    {"company": "Amazon", "location": "Remote", "salary": "$120k-170k", "level": ""},
                    {"company": "Salesforce", "location": "San Francisco, CA", "salary": "$125k-175k", "level": ""},
                    {"company": "Adobe", "location": "San Jose, CA", "salary": "$115k-165k", "level": ""},
                    {"company": "Uber", "location": "San Francisco, CA", "salary": "$110k-160k", "level": ""}
                ]
            }
        elif interview_score >= 40:
            # Below average get mid-tier opportunities
            job_data = {
                "Software Engineer": [
                    {"company": "Startup Inc", "location": "Austin, TX", "salary": "$85k-120k", "level": ""},
                    {"company": "TechCorp", "location": "Denver, CO", "salary": "$80k-115k", "level": ""},
                    {"company": "DevCompany", "location": "Remote", "salary": "$75k-110k", "level": ""},
                    {"company": "CodeWorks", "location": "Portland, OR", "salary": "$70k-105k", "level": ""},
                    {"company": "WebSolutions", "location": "Phoenix, AZ", "salary": "$65k-100k", "level": ""}
                ]
            }
        else:
            # Low performers get entry-level/training opportunities
            job_data = {
                "Software Engineer": [
                    {"company": "CodeBootcamp Co", "location": "Remote", "salary": "$45k-65k", "level": "Junior"},
                    {"company": "Learning Tech", "location": "Online", "salary": "$40k-60k", "level": "Entry Level"},
                    {"company": "TrainingSoft", "location": "Remote", "salary": "$35k-55k", "level": "Intern"},
                    {"company": "SkillBuilder Inc", "location": "Various", "salary": "$50k-70k", "level": "Associate"},
                    {"company": "DevAcademy", "location": "Remote", "salary": "$42k-62k", "level": "Trainee"}
                ]
            }
        
        # Use best role from ATS analysis or fallback
        role_key = best_role if best_role in job_data else "Software Engineer"
        templates = job_data.get(role_key, job_data["Software Engineer"])
        
        jobs = []
        for template in templates:
            level = template["level"]
            title = f"{level} {best_role}".strip()
            
            # Calculate comprehensive match score
            job_desc = f"Join {template['company']} as {title}. Skills: {', '.join(tech_stack[:3])}. Experience: {years_exp}+ years."
            match_score = self._calculate_comprehensive_match_score({
                "title": title,
                "description": job_desc
            }, criteria)
            
            jobs.append({
                "title": title,
                "company": template["company"],
                "location": template["location"],
                "description": f"Join {template['company']} as {title}. {template['salary']} salary range. Skills: {', '.join(user_skills[:3])}. {'Premium benefits and equity options.' if interview_score >= 80 else 'Full benefits and growth opportunities.' if interview_score >= 60 else 'Training and mentorship provided.' if interview_score < 40 else 'Competitive benefits package.'}",
                "apply_link": f"https://www.linkedin.com/jobs/search/?keywords={best_role.replace(' ', '%20')}&location={template['location'].replace(' ', '%20')}",
                "source": "Curated Listings",
                "match_score": match_score,
                "personalized": bool(criteria)
            })
        
        # Sort by match score
        jobs.sort(key=lambda x: x['match_score'], reverse=True)
        
        return {"jobs": jobs, "personalized": True}
    
    def _calculate_experience_years(self, experience):
        """Extract years of experience from resume"""
        if not experience:
            return 0
        
        total_years = 0
        for exp in experience:
            if isinstance(exp, dict):
                duration = exp.get('duration', '')
            else:
                duration = str(exp)
            
            # Simple extraction of years from duration strings
            import re
            years = re.findall(r'(\d+)\s*(?:year|yr)', duration.lower())
            if years:
                total_years += int(years[0])
            elif 'month' in duration.lower():
                months = re.findall(r'(\d+)\s*(?:month|mo)', duration.lower())
                if months:
                    total_years += int(months[0]) / 12
        
        return max(total_years, len(experience))  # Fallback to number of jobs
    
    def _get_education_level(self, education):
        """Determine highest education level"""
        if not education:
            return 'High School'
        
        education_text = ' '.join([str(edu).lower() for edu in education])
        
        if any(term in education_text for term in ['phd', 'doctorate', 'ph.d']):
            return 'PhD'
        elif any(term in education_text for term in ['master', 'mba', 'ms', 'ma']):
            return 'Masters'
        elif any(term in education_text for term in ['bachelor', 'bs', 'ba', 'bsc']):
            return 'Bachelors'
        else:
            return 'Associates'
    
    def _extract_tech_stack(self, skills):
        """Extract technical skills from skills list"""
        if not skills:
            return []
        
        tech_keywords = [
            'python', 'java', 'javascript', 'react', 'node', 'aws', 'docker', 
            'kubernetes', 'sql', 'mongodb', 'postgresql', 'git', 'linux',
            'typescript', 'angular', 'vue', 'spring', 'django', 'flask',
            'tensorflow', 'pytorch', 'spark', 'hadoop', 'elasticsearch'
        ]
        
        tech_skills = []
        for skill in skills:
            skill_lower = skill.lower()
            for tech in tech_keywords:
                if tech in skill_lower:
                    tech_skills.append(skill)
                    break
        
        return tech_skills[:5]  # Return top 5 tech skills

parser = ResumeParser()
question_generator = QuestionGenerator()
ats_analyzer = ATSAnalyzer()
answer_analyzer = AnswerAnalyzer()
job_searcher = JobSearcher()
user_profile = UserProfile()

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

@app.route('/search-jobs', methods=['POST'])
def search_jobs():
    try:
        data = request.get_json()
        if not data or 'resume_data' not in data or 'ats_analysis' not in data:
            return jsonify({"error": "Missing resume_data or ats_analysis fields"}), 400
        
        resume_data = data['resume_data']
        ats_analysis = data['ats_analysis']
        interview_score = data.get('interview_score', 0)
        user_email = data.get('user_email')
        
        jobs = job_searcher.search_jobs(resume_data, ats_analysis, interview_score, user_email)
        return jsonify(jobs)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/record-session', methods=['POST'])
def record_session():
    try:
        data = request.get_json()
        if not data or 'user_email' not in data:
            return jsonify({"error": "Missing user_email field"}), 400
        
        user_email = data['user_email']
        session_data = {
            'timestamp': data.get('timestamp'),
            'answers': data.get('answers', {}),
            'scores': data.get('scores', {}),
            'completion_rate': data.get('completion_rate', 0),
            'ats_data': data.get('ats_data')
        }
        
        user_profile.record_session(user_email, session_data)
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/user-profile/<user_email>', methods=['GET'])
def get_user_profile(user_email):
    try:
        profile = user_profile.get_user_profile(user_email)
        return jsonify(profile)
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
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)