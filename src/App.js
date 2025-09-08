import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [atsAnalysis, setAtsAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Mock Interview Assistant
        </h1>

        {/* File Upload */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload Resume</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
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
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-lg text-gray-600">
                {file ? file.name : 'Click to upload PDF or DOCX'}
              </span>
            </label>
          </div>
          <button
            onClick={parseResume}
            disabled={!file || loading}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Parsing...' : 'Parse Resume'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Resume Data */}
        {resumeData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Parsed Resume Data</h2>
              <div className="flex gap-2">
                <button
                  onClick={generateQuestions}
                  disabled={loading}
                  className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Generating...' : 'Generate Questions'}
                </button>
                <button
                  onClick={analyzeATS}
                  disabled={loading}
                  className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? 'Analyzing...' : 'ATS Analysis'}
                </button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Personal Info</h3>
                <p><strong>Name:</strong> {resumeData.name}</p>
                <p><strong>Email:</strong> {resumeData.email || 'Not found'}</p>
                <p><strong>Phone:</strong> {resumeData.phone || 'Not found'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills?.length > 0 ? (
                    resumeData.skills.map((skill, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">No skills found</span>
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
          </div>
        )}

        {/* ATS Analysis */}
        {atsAnalysis && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">ATS Analysis</h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${
                  atsAnalysis.ats_score >= 80 ? 'text-green-600' :
                  atsAnalysis.ats_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {atsAnalysis.ats_score}%
                </div>
                <p className="text-gray-600">ATS Score</p>
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${
                  atsAnalysis.keyword_density >= 70 ? 'text-green-600' :
                  atsAnalysis.keyword_density >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {atsAnalysis.keyword_density}%
                </div>
                <p className="text-gray-600">Keyword Density</p>
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${
                  atsAnalysis.format_score >= 80 ? 'text-green-600' :
                  atsAnalysis.format_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {atsAnalysis.format_score}%
                </div>
                <p className="text-gray-600">Format Score</p>
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
          </div>
        )}

        {/* Questions */}
        {questions && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Interview Questions</h2>
            <div className="space-y-4">
              {questions.questions?.map((q, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      q.type === 'technical' ? 'bg-red-100 text-red-800' :
                      q.type === 'behavioral' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {q.type}
                    </span>
                  </div>
                  <p className="text-gray-700">{q.question}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;