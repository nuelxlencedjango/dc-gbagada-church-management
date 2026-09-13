import React, { useState, useRef, useEffect } from 'react';
import {
  Box, TextField, IconButton, Paper, Typography,
  Avatar, CircularProgress, Fab
} from '@mui/material';
import { Send, Chat, Close, SmartToy } from '@mui/icons-material';
import axios from 'axios';

const AIChat = ({ isOpen, onToggle, token }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant for Dominion City Gbagada. How can I help you today?",
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
      const response = await axios.post(
        '/api/ai/chat',
        { question: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.answer,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, I couldn't process your request. Please try again later.",
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
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
    'Service times',
    'Contact information',
    'Register as member',
    'Announcements',
    'Prayer requests'
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
          backgroundColor: '#1a237e'
        }}
      >
        {isOpen ? <Close /> : <Chat />}
      </Fab>

      {isOpen && (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            width: 380,
            height: 550,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box sx={{
            backgroundColor: '#1a237e',
            color: 'white',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <SmartToy />
            <Typography variant="h6">
              Church AI Assistant
            </Typography>
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
                  mb: 1
                }}
              >
                <Box
                  sx={{
                    maxWidth: '70%',
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: message.sender === 'user' ? '#1a237e' : 'white',
                    color: message.sender === 'user' ? 'white' : 'black',
                    wordWrap: 'break-word'
                  }}
                >
                  <Typography variant="body2">
                    {message.text}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Box>
              </Box>
            ))}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'white' }}>
                  <CircularProgress size={20} />
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Box sx={{
            p: 1,
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            borderTop: '1px solid #e0e0e0'
          }}>
            {quickReplies.map((reply) => (
              <Box
                key={reply}
                component="span"
                onClick={() => setInput(reply)}
                sx={{
                  p: 0.5,
                  px: 1,
                  backgroundColor: '#e3f2fd',
                  borderRadius: 1,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  '&:hover': { backgroundColor: '#bbdefb' }
                }}
              >
                {reply}
              </Box>
            ))}
          </Box>

          <Box sx={{ p: 2, backgroundColor: 'white', borderTop: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <IconButton
                color="primary"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
              >
                <Send />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default AIChat;