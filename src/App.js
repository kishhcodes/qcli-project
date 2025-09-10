import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';
import LoadingSpinner from './components/LoadingSpinner';
import Card from './components/Card';
import InterviewSession from './InterviewSession';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [atsAnalysis, setAtsAnalysis] = useState(null);
  const [answers, setAnswers] = useState({});
  const [answerAnalysis, setAnswerAnalysis] = useState({});
  const [inputMode, setInputMode] = useState({});
  const [recording, setRecording] = useState({});
  const [recognition, setRecognition] = useState({});
  const [jobResults, setJobResults] = useState(null);
  const [showSession, setShowSession] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState(null);
  const [sessionAnalysis, setSessionAnalysis] = useState({});
  const [userHistory, setUserHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
    }
    
    const savedUser = localStorage.getItem('mockInterviewUser');
    if (savedUser) {
      setUser(savedUser);
      setIsLoggedIn(true);
      fetchUserHistory(savedUser);
    }
  }, []);

  const recordSession = async (sessionData) => {
    try {
      await axios.post('/record-session', {
        user_email: user,
        timestamp: new Date().toISOString(),
        ...sessionData,
        ats_data: atsAnalysis
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Failed to record session:', err);
    }
  };

  useEffect(() => {
    if (atsAnalysis && user) {
      recordSession({
        ats_data: atsAnalysis,
        completion_rate: 100
      });
    }
  }, [atsAnalysis, user]);

  const handleLogin = (email) => {
    setUser(email);
    setIsLoggedIn(true);
    localStorage.setItem('mockInterviewUser', email);
    fetchUserHistory(email);
  };

  const fetchUserHistory = async (email) => {
    try {
      const response = await axios.get(`/user-profile/${email}`);
      setUserHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch user history:', err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('mockInterviewUser');
    setFile(null);
    setResumeData(null);
    setQuestions(null);
    setAtsAnalysis(null);
    setAnswers({});
    setAnswerAnalysis({});
    setJobResults(null);
    setShowSession(false);
    setSessionAnswers(null);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (showSession && questions) {
    return (
      <InterviewSession 
        questions={questions.questions}
        onComplete={async (answers, scores, completionRate) => {
          setSessionAnswers(answers);
          setShowSession(false);
          
          // Analyze all session answers
          const analysis = {};
          let totalScore = 0;
          let answeredCount = 0;
          
          for (const [questionIndex, answer] of Object.entries(answers)) {
            const question = questions?.questions?.[parseInt(questionIndex)];
            if (question && answer.trim()) {
              try {
                const response = await axios.post('/analyze-answer', {
                  question: question.question,
                  answer: answer,
                  type: question.type
                }, {
                  headers: { 'Content-Type': 'application/json' }
                });
                analysis[questionIndex] = response.data;
                totalScore += response.data.score;
                answeredCount++;
              } catch (error) {
                console.error(`Failed to analyze answer ${questionIndex}:`, error);
              }
            }
          }
          setSessionAnalysis(analysis);
          
          const avgScore = answeredCount > 0 ? Math.round(totalScore / answeredCount) : 0;
          
          recordSession({
            answers,
            scores,
            analysis,
            avg_score: avgScore,
            completion_rate: completionRate
          });
          
          // Refresh user history
          fetchUserHistory(user);
        }}
        onBack={() => setShowSession(false)}
      />
    );
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const parseResume = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResumeData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse resume');
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = async () => {
    if (!resumeData) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/generate-questions', resumeData, {
        headers: { 'Content-Type': 'application/json' }
      });
      setQuestions(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const analyzeATS = async () => {
    if (!resumeData) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/analyze-ats', resumeData, {
        headers: { 'Content-Type': 'application/json' }
      });
      setAtsAnalysis(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze ATS');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const analyzeAnswer = async (questionIndex, question, questionType) => {
    const answer = answers[questionIndex];
    if (!answer?.trim()) {
      setError('Please provide an answer first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/analyze-answer', {
        question: question,
        answer: answer,
        type: questionType
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      setAnswerAnalysis(prev => ({ ...prev, [questionIndex]: response.data }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze answer');
    } finally {
      setLoading(false);
    }
  };

  const toggleInputMode = (questionIndex) => {
    setInputMode(prev => ({ ...prev, [questionIndex]: prev[questionIndex] === 'speech' ? 'text' : 'speech' }));
  };

  const startRecording = (questionIndex) => {
    setError('');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.maxAlternatives = 1;

      recognitionInstance.onstart = () => {
        setRecording(prev => ({ ...prev, [questionIndex]: true }));
      };

      recognitionInstance.onresult = (event) => {
        if (event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          setAnswers(prev => ({ 
            ...prev, 
            [questionIndex]: (prev[questionIndex] || '') + transcript + ' '
          }));
        }
      };

      recognitionInstance.onerror = (event) => {
        setError(`Recording error: ${event.error}`);
        setRecording(prev => ({ ...prev, [questionIndex]: false }));
      };

      recognitionInstance.onend = () => {
        setRecording(prev => ({ ...prev, [questionIndex]: false }));
      };

      recognitionInstance.start();
      setRecognition(prev => ({ ...prev, [questionIndex]: recognitionInstance }));
      
    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = (questionIndex) => {
    if (recognition[questionIndex]) {
      try {
        recognition[questionIndex].stop();
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
      setRecording(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const searchJobs = async () => {
    if (!sessionAnswers) {
      setError('Please complete a timed interview session first to unlock job search');
      return;
    }
    
    if (!atsAnalysis?.best_role || !resumeData) {
      setError('Please parse resume and run ATS analysis first');
      return;
    }

    // Calculate average interview score from session analysis
    const avgInterviewScore = Object.keys(sessionAnalysis).length > 0 ? 
      Math.round(Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length) : 0;
    
    if (avgInterviewScore < 50) {
      setError('Interview score below 50% - not eligible for job search. Please improve your performance and try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/search-jobs', {
        resume_data: resumeData,
        ats_analysis: atsAnalysis,
        interview_score: avgInterviewScore,
        user_email: user
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      setJobResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search jobs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
              <span className="text-2xl">🎯</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Mock Interview Assistant
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-md border border-gray-200">
              <span className="text-gray-600">Welcome, </span>
              <span className="font-semibold text-blue-600">{user}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              Logout
            </button>
          </div>
        </div>

        {userHistory && (
          <Card title="📊 Your Performance History" className="mb-6">
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{userHistory.performance_metrics?.total_sessions || 0}</div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className={`text-2xl font-bold ${
                  (userHistory.performance_metrics?.avg_score || 0) >= 80 ? 'text-green-600' :
                  (userHistory.performance_metrics?.avg_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {Math.round(userHistory.performance_metrics?.avg_score || 0)}%
                </div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{userHistory.sessions?.length || 0}</div>
                <div className="text-sm text-gray-600">Interview Sessions</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{userHistory.ats_history?.length || 0}</div>
                <div className="text-sm text-gray-600">ATS Analyses</div>
              </div>
            </div>
            
            {userHistory.sessions && userHistory.sessions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Recent Sessions</h4>
                <div className="space-y-2">
                  {userHistory.sessions.slice(-3).reverse().map((session, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <span className="text-sm text-gray-600">
                        {new Date(session.timestamp).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {Object.keys(session.answers || {}).length} answers
                        </span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          (session.avg_score || 0) >= 80 ? 'bg-green-100 text-green-800' :
                          (session.avg_score || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {session.avg_score || 0}% avg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg animate-slide-up">
            <div className="flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 shadow-2xl">
              <LoadingSpinner text="Processing..." size="lg" />
            </div>
          </div>
        )}

        <Card title="📄 Upload Resume" className="mb-6">
          <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="hidden"
              id="fileInput"
            />
            <label
              htmlFor="fileInput"
              className="cursor-pointer flex flex-col items-center"
            >
              {file ? (
                <div className="animate-bounce-in">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-lg font-medium text-green-700">{file.name}</span>
                  <span className="text-sm text-green-600 mt-1">Ready to parse</span>
                </div>
              ) : (
                <div className="hover:scale-105 transition-transform">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="text-lg text-gray-700 font-medium">Click to upload PDF or DOCX</span>
                  <span className="text-sm text-gray-500 mt-1">Maximum file size: 16MB</span>
                </div>
              )}
            </label>
          </div>
          <button
            onClick={parseResume}
            disabled={!file || loading}
            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Parsing Resume...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Parse Resume
              </div>
            )}
          </button>
        </Card>

        {resumeData && (
          <Card title="✅ Resume Analysis" className="mb-6">
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={generateQuestions}
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 transition-all duration-200 transform hover:scale-105 shadow-md flex items-center"
              >
                <span className="mr-2">❓</span>
                Generate Questions
              </button>
              {questions && (
                <button
                  onClick={() => setShowSession(true)}
                  className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-2 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 shadow-md flex items-center"
                >
                  <span className="mr-2">⏱️</span>
                  Timed Session
                </button>
              )}
              <button
                onClick={analyzeATS}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 transition-all duration-200 transform hover:scale-105 shadow-md flex items-center"
              >
                <span className="mr-2">📊</span>
                ATS Analysis
              </button>
              {atsAnalysis && (
                <button
                  onClick={searchJobs}
                  disabled={loading || !sessionAnswers || (Object.keys(sessionAnalysis).length > 0 && Math.round(Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length) < 50)}
                  className={`py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md flex items-center ${
                    sessionAnswers && (Object.keys(sessionAnalysis).length === 0 || Math.round(Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length) >= 50)
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700' 
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  } disabled:from-gray-400 disabled:to-gray-400`}
                  title={
                    !sessionAnswers ? 'Complete a timed session first to unlock job search' :
                    (Object.keys(sessionAnalysis).length > 0 && Math.round(Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length) < 50) ? 'Score below 50% - not eligible for job search' :
                    'Find personalized job recommendations'
                  }
                >
                  <span className="mr-2">
                    {sessionAnswers && (Object.keys(sessionAnalysis).length === 0 || Math.round(Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length) >= 50) ? '🔍' : '🔒'}
                  </span>
                  {!sessionAnswers ? 'Complete Session First' :
                   (Object.keys(sessionAnalysis).length > 0 && Math.round(Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length) < 50) ? 'Not Eligible (<50%)' :
                   'Find Jobs'}
                </button>
              )}
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">👤</span> Personal Info
                </h3>
                <div className="space-y-2">
                  <p className="flex items-center"><span className="font-medium text-gray-700 w-16">Name:</span> <span className="text-gray-900">{resumeData.name}</span></p>
                  <p className="flex items-center"><span className="font-medium text-gray-700 w-16">Email:</span> <span className="text-gray-900">{resumeData.email || 'Not found'}</span></p>
                  <p className="flex items-center"><span className="font-medium text-gray-700 w-16">Phone:</span> <span className="text-gray-900">{resumeData.phone || 'Not found'}</span></p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">🛠️</span> Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills?.length > 0 ? (
                    resumeData.skills.map((skill, idx) => (
                      <span key={idx} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-shadow animate-fade-in" style={{animationDelay: `${idx * 0.1}s`}}>
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 italic">No skills found</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Experience</h3>
              {resumeData.experience?.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {resumeData.experience.map((exp, idx) => (
                    <li key={idx} className="text-gray-600">
                      {typeof exp === 'object' ? 
                        `${exp.title || ''} at ${exp.company || ''} (${exp.duration || ''})` : 
                        exp
                      }
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No experience found</p>
              )}
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Education</h3>
              {resumeData.education?.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {resumeData.education.map((edu, idx) => (
                    <li key={idx} className="text-gray-600">
                      {typeof edu === 'object' ? 
                        `${edu.degree || ''} from ${edu.institution || ''} (${edu.year || ''})` : 
                        edu
                      }
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No education found</p>
              )}
            </div>
          </Card>
        )}

        {atsAnalysis && (
          <Card title="📊 ATS Analysis Results" className="mb-6">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl text-center border border-blue-200 animate-bounce-in">
                <div className={`text-4xl font-bold mb-2 animate-pulse ${
                  atsAnalysis.ats_score >= 80 ? 'text-green-600' :
                  atsAnalysis.ats_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {atsAnalysis.ats_score}%
                </div>
                <p className="text-gray-700 font-medium">ATS Score</p>
                <div className={`w-full bg-gray-200 rounded-full h-2 mt-2`}>
                  <div className={`h-2 rounded-full transition-all duration-1000 ${
                    atsAnalysis.ats_score >= 80 ? 'bg-green-500' :
                    atsAnalysis.ats_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} style={{width: `${atsAnalysis.ats_score}%`}}></div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl text-center border border-purple-200 animate-bounce-in" style={{animationDelay: '0.2s'}}>
                <div className={`text-4xl font-bold mb-2 animate-pulse ${
                  atsAnalysis.keyword_density >= 70 ? 'text-green-600' :
                  atsAnalysis.keyword_density >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {atsAnalysis.keyword_density}%
                </div>
                <p className="text-gray-700 font-medium">Keyword Density</p>
                <div className={`w-full bg-gray-200 rounded-full h-2 mt-2`}>
                  <div className={`h-2 rounded-full transition-all duration-1000 ${
                    atsAnalysis.keyword_density >= 70 ? 'bg-green-500' :
                    atsAnalysis.keyword_density >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} style={{width: `${atsAnalysis.keyword_density}%`}}></div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl text-center border border-green-200 animate-bounce-in" style={{animationDelay: '0.4s'}}>
                <div className={`text-4xl font-bold mb-2 animate-pulse ${
                  atsAnalysis.format_score >= 80 ? 'text-green-600' :
                  atsAnalysis.format_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {atsAnalysis.format_score}%
                </div>
                <p className="text-gray-700 font-medium">Format Score</p>
                <div className={`w-full bg-gray-200 rounded-full h-2 mt-2`}>
                  <div className={`h-2 rounded-full transition-all duration-1000 ${
                    atsAnalysis.format_score >= 80 ? 'bg-green-500' :
                    atsAnalysis.format_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} style={{width: `${atsAnalysis.format_score}%`}}></div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Best Job Role</h3>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {atsAnalysis.best_role}
                </span>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Other suitable roles:</p>
                  <div className="flex flex-wrap gap-1">
                    {atsAnalysis.suggested_roles?.slice(1).map((role, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Strengths</h3>
                <div className="flex flex-wrap gap-2">
                  {atsAnalysis.strengths?.map((strength, idx) => (
                    <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Improvements</h3>
              <ul className="list-disc list-inside space-y-1">
                {atsAnalysis.improvements?.map((improvement, idx) => (
                  <li key={idx} className="text-gray-600">{improvement}</li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {jobResults && (
          <Card title={`💼 ${jobResults.personalized ? 'Personalized' : 'Suitable'} Job Openings`} className="mb-6">
            {jobResults.personalized && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-4 border border-purple-200">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎯</span>
                  <div>
                    <h4 className="font-semibold text-purple-800">Personalized Recommendations</h4>
                    <p className="text-sm text-purple-600">Based on your interview performance and ATS analysis history</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {jobResults.jobs?.map((job, idx) => (
                <div key={idx} className={`border rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br animate-fade-in ${
                  job.personalized && job.match_score > 80 
                    ? 'border-purple-300 from-purple-50 to-white' 
                    : 'border-gray-200 from-white to-gray-50'
                }`} style={{animationDelay: `${idx * 0.1}s`}}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-900 hover:text-blue-600 transition-colors">{job.title}</h3>
                    <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full font-medium">
                      {job.source}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-3 text-sm">
                    <span className="flex items-center text-gray-700"><span className="mr-1">🏢</span><strong>Company:</strong> <span className="ml-1 text-blue-600">{job.company}</span></span>
                    <span className="flex items-center text-gray-700"><span className="mr-1">📍</span><strong>Location:</strong> <span className="ml-1">{job.location}</span></span>
                  </div>
                  
                  <p className="text-gray-700 mb-3 text-sm">{job.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {atsAnalysis?.best_role}
                      </span>
                    </div>
                    {job.apply_link !== '#' && (
                      <a
                        href={job.apply_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-md flex items-center"
                      >
                        <span className="mr-2">🚀</span>
                        Apply Now
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {sessionAnswers && (
          <Card title="🎯 Timed Session Results" className="mb-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl mb-4">
              <h3 className="text-lg font-semibold mb-4">Session Summary</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{Object.keys(sessionAnswers).length}</div>
                  <div className="text-sm text-gray-600">Questions Answered</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{questions?.questions?.length || 0}</div>
                  <div className="text-sm text-gray-600">Total Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((Object.keys(sessionAnswers).length / (questions?.questions?.length || 1)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    Object.keys(sessionAnalysis).length > 0 ?
                    (Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length >= 80 ? 'text-green-600' :
                     Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length >= 60 ? 'text-yellow-600' :
                     Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length >= 50 ? 'text-orange-600' : 'text-red-600') :
                    'text-gray-400'
                  }`}>
                    {Object.keys(sessionAnalysis).length > 0 ? 
                      Math.round(Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Average Score {Object.keys(sessionAnalysis).length > 0 && Math.round(Object.values(sessionAnalysis).reduce((sum, a) => sum + a.score, 0) / Object.keys(sessionAnalysis).length) < 50 && (
                      <span className="text-red-600 font-semibold">(Not Eligible)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {Object.entries(sessionAnswers).map(([questionIndex, answer]) => {
                const question = questions?.questions?.[parseInt(questionIndex)];
                return (
                  <div key={questionIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        question?.type === 'technical' ? 'bg-red-100 text-red-800' :
                        question?.type === 'behavioral' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {question?.type || 'general'}
                      </span>
                      <span className="text-sm text-gray-500">Question {parseInt(questionIndex) + 1}</span>
                    </div>
                    <p className="font-medium text-gray-900 mb-2">{question?.question}</p>
                    <div className="bg-gray-50 p-3 rounded mb-3">
                      <p className="text-sm text-gray-700">{answer}</p>
                    </div>
                    
                    {sessionAnalysis[questionIndex] && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-4 mb-3">
                          <div className={`text-xl font-bold ${
                            sessionAnalysis[questionIndex].score >= 80 ? 'text-green-600' :
                            sessionAnalysis[questionIndex].score >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {sessionAnalysis[questionIndex].score}%
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sessionAnalysis[questionIndex].overall_rating === 'Excellent' ? 'bg-green-100 text-green-800' :
                            sessionAnalysis[questionIndex].overall_rating === 'Good' ? 'bg-blue-100 text-blue-800' :
                            sessionAnalysis[questionIndex].overall_rating === 'Average' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {sessionAnalysis[questionIndex].overall_rating}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3">{sessionAnalysis[questionIndex].feedback}</p>
                        
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <h5 className="font-medium text-green-700 mb-1 text-sm">Strengths</h5>
                            <ul className="list-disc list-inside space-y-1">
                              {sessionAnalysis[questionIndex].strengths?.map((strength, sIdx) => (
                                <li key={sIdx} className="text-xs text-gray-600">{strength}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-orange-700 mb-1 text-sm">Improvements</h5>
                            <ul className="list-disc list-inside space-y-1">
                              {sessionAnalysis[questionIndex].improvements?.map((improvement, iIdx) => (
                                <li key={iIdx} className="text-xs text-gray-600">{improvement}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {questions && (
          <Card title="❓ Interview Questions & Practice">
            <div className="space-y-6">
              {questions.questions?.map((q, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      q.type === 'technical' ? 'bg-red-100 text-red-800' :
                      q.type === 'behavioral' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {q.type}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3 font-medium">{q.question}</p>
                  
                  <div className="mb-3">
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => toggleInputMode(idx)}
                        className={`px-3 py-1 rounded text-sm ${
                          inputMode[idx] === 'speech' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {inputMode[idx] === 'speech' ? '🎤 Speech' : '📝 Text'}
                      </button>
                    </div>
                    
                    {inputMode[idx] === 'speech' ? (
                      <div className="border border-gray-300 rounded-lg p-4 text-center">
                        {!recording[idx] ? (
                          <button
                            onClick={() => startRecording(idx)}
                            disabled={loading}
                            className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                          >
                            🎤 Start Recording
                          </button>
                        ) : (
                          <button
                            onClick={() => stopRecording(idx)}
                            className="bg-red-800 text-white py-2 px-4 rounded-lg hover:bg-red-900 animate-pulse"
                          >
                            ⏹️ Stop Recording
                          </button>
                        )}
                        {answers[idx] && (
                          <div className="mt-3 p-3 bg-gray-50 rounded text-left">
                            <p className="text-sm text-gray-600">Transcribed:</p>
                            <p>{answers[idx]}</p>
                            <button
                              onClick={() => setAnswers(prev => ({ ...prev, [idx]: '' }))}
                              className="mt-2 text-xs text-red-600 hover:text-red-800"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={answers[idx] || ''}
                        onChange={(e) => handleAnswerChange(idx, e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                      />
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-3">
                    <button
                      onClick={() => analyzeAnswer(idx, q.question, q.type)}
                      disabled={loading || !answers[idx]?.trim()}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Analyzing...' : 'Analyze Answer'}
                    </button>
                  </div>

                  {answerAnalysis[idx] && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`text-2xl font-bold ${
                          answerAnalysis[idx].score >= 80 ? 'text-green-600' :
                          answerAnalysis[idx].score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {answerAnalysis[idx].score}%
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          answerAnalysis[idx].overall_rating === 'Excellent' ? 'bg-green-100 text-green-800' :
                          answerAnalysis[idx].overall_rating === 'Good' ? 'bg-blue-100 text-blue-800' :
                          answerAnalysis[idx].overall_rating === 'Average' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {answerAnalysis[idx].overall_rating}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{answerAnalysis[idx].feedback}</p>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-green-700 mb-2">Strengths</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {answerAnalysis[idx].strengths?.map((strength, sIdx) => (
                              <li key={sIdx} className="text-sm text-gray-600">{strength}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-orange-700 mb-2">Improvements</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {answerAnalysis[idx].improvements?.map((improvement, iIdx) => (
                              <li key={iIdx} className="text-sm text-gray-600">{improvement}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;