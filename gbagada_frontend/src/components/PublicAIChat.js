import React, { useState, useRef, useEffect } from 'react';
import {
  Box, TextField, IconButton, Paper, Typography,
  Avatar, CircularProgress, Fab, Chip
} from '@mui/material';
import { Send, Close, SmartToy, QuestionAnswer } from '@mui/icons-material';
import api from '../utils/api';

const PublicAIChat = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! 👋 I'm the Dominion City Gbagada AI Assistant. I can help you with information about our church. What would you like to know?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/ai/public-chat', {
        question: input
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.answer || "I'm sorry, I couldn't process your request. Please try again later.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      
      // Local fallback responses
      const fallbackAnswers = {
        'service': "Sunday services are at 9 AM and 11 AM. Tuesday prayer meeting is at 6 PM.",
        'time': "Sunday services are at 9 AM and 11 AM. Tuesday prayer meeting is at 6 PM.",
        'contact': "You can reach us at +234-XXX-XXX-XXXX or email info@dominioncitygbagada.com",
        'phone': "You can reach us at +234-XXX-XXX-XXXX",
        'email': "You can email us at info@dominioncitygbagada.com",
        'location': "We are located at Gbagada, Lagos, Nigeria.",
        'address': "We are located at Gbagada, Lagos, Nigeria.",
        'join': "To join our church, click the 'Join Our Family' button on our website or visit us in person!",
        'member': "To become a member, click the 'Join Our Family' button on our website.",
        'prayer': "We have prayer meetings every Tuesday at 6 PM.",
        'pastor': "Our Branch Pastor is available for guidance and support. Please contact the church office.",
        'welcome': "Welcome to Dominion City Gbagada! We are a family of believers dedicated to spreading God's love.",
        'name': "I'm the Dominion City Gbagada AI Assistant! You can call me DC Assistant.",
        'what is your name': "I'm the Dominion City Gbagada AI Assistant! You can call me DC Assistant."
      };
      
      let answer = "I'm sorry, I'm having trouble connecting. Please contact our church office directly at +234-XXX-XXX-XXXX or email info@dominioncitygbagada.com";
      
      const query = input.toLowerCase();
      for (const [key, value] of Object.entries(fallbackAnswers)) {
        if (query.includes(key)) {
          answer = value;
          break;
        }
      }
      
      const fallbackMessage = {
        id: Date.now() + 1,
        text: answer,
        sender: 'bot',
        timestamp: new Date(),
        isFallback: true
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickReplies = [
    { text: 'Service times', icon: '⏰' },
    { text: 'Contact information', icon: '📞' },
    { text: 'How to join', icon: '🙏' },
    { text: 'Location', icon: '📍' },
    { text: 'Prayer requests', icon: '🙌' }
  ];

  return (
    <>
      <Fab
        color="primary"
        onClick={onToggle}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          backgroundColor: '#1a237e',
          '&:hover': { backgroundColor: '#0d1442' }
        }}
      >
        {isOpen ? <Close /> : <QuestionAnswer />}
      </Fab>

      {isOpen && (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            width: { xs: 'calc(100% - 48px)', sm: 380 },
            height: { xs: 'calc(100vh - 120px)', sm: 550 },
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}
        >
          <Box sx={{
            backgroundColor: '#1a237e',
            color: 'white',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0
          }}>
            <SmartToy />
            <Typography variant="h6" sx={{ flex: 1 }}>
              Church AI Assistant
            </Typography>
            <Chip
              label="Public"
              size="small"
              sx={{ backgroundColor: '#ff6f00', color: 'white', fontSize: '0.7rem' }}
            />
          </Box>

          <Box sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            backgroundColor: '#f5f5f5'
          }}>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2
                }}
              >
                {message.sender === 'bot' && (
                  <Avatar sx={{ 
                    width: 32, 
                    height: 32, 
                    mr: 1, 
                    bgcolor: '#1a237e',
                    fontSize: '0.8rem'
                  }}>
                    <SmartToy sx={{ fontSize: 18 }} />
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '75%',
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: message.sender === 'user' ? '#1a237e' : 'white',
                    color: message.sender === 'user' ? 'white' : 'black',
                    wordWrap: 'break-word',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    ...(message.isError && {
                      backgroundColor: '#ffebee',
                      color: '#c62828'
                    }),
                    ...(message.isFallback && {
                      backgroundColor: '#fff3e0',
                      color: '#e65100'
                    })
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.text}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    opacity: 0.7, 
                    display: 'block',
                    mt: 0.5,
                    fontSize: '0.65rem'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Box>
                {message.sender === 'user' && (
                  <Avatar sx={{ 
                    width: 32, 
                    height: 32, 
                    ml: 1, 
                    bgcolor: '#ff6f00',
                    fontSize: '0.8rem'
                  }}>
                    👤
                  </Avatar>
                )}
              </Box>
            ))}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: '#1a237e' }}>
                  <SmartToy sx={{ fontSize: 18 }} />
                </Avatar>
                <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'white' }}>
                  <CircularProgress size={20} />
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Box sx={{
            p: 1,
            display: 'flex',
            gap: 0.5,
            flexWrap: 'wrap',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#fafafa',
            flexShrink: 0
          }}>
            {quickReplies.map((reply) => (
              <Chip
                key={reply.text}
                label={`${reply.icon} ${reply.text}`}
                size="small"
                onClick={() => setInput(reply.text)}
                sx={{
                  backgroundColor: '#e3f2fd',
                  color: '#1a237e',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#bbdefb' }
                }}
              />
            ))}
          </Box>

          <Box sx={{ 
            p: 2, 
            backgroundColor: 'white', 
            borderTop: '1px solid #e0e0e0',
            flexShrink: 0
          }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask me anything about the church..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              <IconButton
                color="primary"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                sx={{
                  backgroundColor: '#1a237e',
                  color: 'white',
                  borderRadius: 2,
                  '&:hover': { backgroundColor: '#0d1442' },
                  '&:disabled': { backgroundColor: '#bdbdbd', color: '#9e9e9e' }
                }}
              >
                <Send />
              </IconButton>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
              No login required • Ask about services, location, contact, and more
            </Typography>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default PublicAIChat;
