import React, { useState, useEffect } from 'react';
import axios from 'axios';

function InterviewSession({ questions, onComplete, onBack }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [answers, setAnswers] = useState({});
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [recording, setRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [inputMode, setInputMode] = useState('text');
  const [score, setScore] = useState(0);

  useEffect(() => {
    let timer;
    if (sessionStarted && !sessionComplete && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && sessionStarted) {
      handleNextQuestion();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, sessionStarted, sessionComplete]);

  const startSession = () => {
    setSessionStarted(true);
    setTimeLeft(60);
  };

  const handleNextQuestion = () => {
    // Save current answer
    if (currentAnswer.trim()) {
      setAnswers(prev => ({ ...prev, [currentQuestion]: currentAnswer }));
      setScore(prev => prev + (currentAnswer.trim().length > 10 ? 10 : 5));
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setCurrentAnswer('');
      setTimeLeft(60);
    } else {
      setSessionComplete(true);
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.maxAlternatives = 1;

      recognitionInstance.onstart = () => {
        console.log('Speech recognition started');
        setRecording(true);
      };
      
      recognitionInstance.onresult = (event) => {
        console.log('Speech recognition result:', event);
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setCurrentAnswer(prev => prev + finalTranscript + ' ');
        }
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        alert(`Recording error: ${event.error}. Please try again.`);
        setRecording(false);
      };
      
      recognitionInstance.onend = () => {
        console.log('Speech recognition ended');
        setRecording(false);
      };

      recognitionInstance.start();
      setRecognition(recognitionInstance);
      
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      alert('Failed to start recording. Please check microphone permissions.');
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognition) {
      try {
        recognition.stop();
        console.log('Speech recognition stopped manually');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      setRecording(false);
    }
  };

  const getTimeColor = () => {
    if (timeLeft > 30) return 'text-green-600';
    if (timeLeft > 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressWidth = () => {
    return ((currentQuestion + 1) / questions.length) * 100;
  };

  if (sessionComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full animate-bounce-in">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Session Complete!</h2>
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-xl mb-6">
              <div className="text-4xl font-bold mb-2">{score}</div>
              <div className="text-lg">Total Score</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{Object.keys(answers).length}</div>
                <div className="text-sm text-gray-600">Questions Answered</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{questions.length}</div>
                <div className="text-sm text-gray-600">Total Questions</div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  const completionRate = (Object.keys(answers).length / questions.length) * 100;
                  const sessionScores = {};
                  Object.keys(answers).forEach(key => {
                    sessionScores[key] = answers[key].length > 10 ? 10 : 5;
                  });
                  onComplete(answers, sessionScores, completionRate);
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              >
                View Detailed Analysis
              </button>
              <button
                onClick={onBack}
                className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-all duration-200"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full animate-slide-up">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⏱️</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Timed Interview Session</h2>
            <p className="text-gray-600 mb-6">
              Get ready for {questions.length} questions. Each question has 1 minute to answer.
              You can use text or speech input.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">1m</div>
                  <div className="text-sm text-gray-600">Per Question</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{questions.length}m</div>
                  <div className="text-sm text-gray-600">Total Time</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={startSession}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white py-4 px-8 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 text-lg font-semibold"
              >
                🚀 Start Session
              </button>
              <button
                onClick={onBack}
                className="flex-1 bg-gray-600 text-white py-4 px-8 rounded-lg hover:bg-gray-700 transition-all duration-200 text-lg"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Interview Session</h1>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg">
                Score: {score}
              </div>
              <button
                onClick={onBack}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(getProgressWidth())}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${getProgressWidth()}%` }}
              ></div>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className={`text-6xl font-bold ${getTimeColor()} animate-pulse`}>
              {timeLeft}
            </div>
            <div className="text-gray-600">seconds remaining</div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentQ.type === 'technical' ? 'bg-red-100 text-red-800' :
                currentQ.type === 'behavioral' ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {currentQ.type}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              {currentQ.question}
            </h2>
          </div>

          {/* Input Mode Toggle */}
          <div className="mb-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setInputMode('text');
                  if (recording) stopRecording();
                }}
                className={`px-4 py-2 rounded-lg transition-all ${
                  inputMode === 'text' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📝 Text Input
              </button>
              <button
                onClick={() => setInputMode('speech')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  inputMode === 'speech' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Requires microphone access. Works best in Chrome, Edge, or Safari."
              >
                🎤 Voice Input
              </button>
            </div>

            {inputMode === 'text' ? (
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                autoFocus
              />
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="mb-4">
                  {!recording ? (
                    <button
                      onClick={startRecording}
                      className="bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      🎤 Start Recording
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={stopRecording}
                        className="bg-red-800 text-white py-3 px-6 rounded-lg hover:bg-red-900 animate-pulse"
                      >
                        ⏹️ Stop Recording
                      </button>
                      <p className="text-sm text-red-600">🔴 Recording... Speak clearly into your microphone</p>
                    </div>
                  )}
                </div>
                
                {currentAnswer && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                    <p className="text-sm text-gray-600 mb-2">Transcribed Text:</p>
                    <p className="text-gray-900">{currentAnswer}</p>
                    <button
                      onClick={() => setCurrentAnswer('')}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Clear Transcription
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={handleNextQuestion}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 font-semibold"
            >
              {currentQuestion === questions.length - 1 ? 'Finish Session' : 'Next Question'}
            </button>
            <button
              onClick={() => setCurrentAnswer('')}
              className="bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewSession;