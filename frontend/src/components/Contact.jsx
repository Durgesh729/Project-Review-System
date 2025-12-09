import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  // Admin functionality
  const [isAdmin, setIsAdmin] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    // Test API connection instead of direct Supabase
    const testAPIConnection = async () => {
      try {
        console.log('Testing API connection...');
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://pms2025-cmk.onrender.com';
        const response = await axios.get(`${backendUrl}/api/admin/contacts`);
        if (response.data.success) {
          console.log('API connection successful');
        } else {
          console.error('API connection failed:', response.data.message);
        }
      } catch (error) {
        console.error('API connection error:', error.message);
      }
    };
    testAPIConnection();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser.role === 'hod' && currentUser.userId) {
        setIsAdmin(true);
        loadContacts(currentUser.userId);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
    }
  };

  const loadContacts = async (userId) => {
    setLoadingContacts(true);
    try {
      console.log('Loading contacts for admin via API...');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://pms2025-cmk.onrender.com';
      const response = await axios.get(`${backendUrl}/api/admin/contacts`);

      if (response.data.success) {
        console.log('Contacts loaded successfully via API:', response.data.data?.length || 0);
        setContacts(response.data.data || []);
      } else {
        console.error('API returned error for contacts:', response.data);
        showToast('error', response.data.message || 'Failed to load contacts');
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts via API:', error);
      if (error.response) {
        showToast('error', error.response.data.message || 'Failed to load contacts');
      } else if (error.request) {
        showToast('error', 'Network error - please check if the server is running');
      } else {
        showToast('error', 'Failed to load contacts');
      }
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    else if (name.trim().length > 100) e.name = 'Name must be less than 100 characters';

    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    else if (email.trim().length > 255) e.email = 'Email must be less than 255 characters';

    if (!message.trim()) e.message = 'Message is required';
    else if (message.trim().length > 1000) e.message = 'Message must be less than 1000 characters';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://pms2025-cmk.onrender.com';
      const response = await axios.post(`${backendUrl}/api/contact`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim()
      });

      if (response.data.success) {
        console.log('Contact form submitted successfully via API:', response.data);
        setName('');
        setEmail('');
        setMessage('');
        showToast('success', response.data.message || 'Message sent successfully! We will get back to you soon.');
        setErrors({});
      } else {
        console.error('API returned error:', response.data);
        showToast('error', response.data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting contact form via API:', error);
      if (error.response) {
        // Server responded with error status
        showToast('error', error.response.data.message || 'Failed to send message');
      } else if (error.request) {
        // Network error
        showToast('error', 'Network error - please check if the server is running');
      } else {
        // Other error
        showToast('error', 'Failed to send message. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl border text-sm font-medium ${toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have questions or feedback? Send us a message and we'll get back to you shortly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Left: Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400 rounded-2xl p-8 text-white shadow-xl"
          >
            <h2 className="text-2xl font-bold mb-6">Contact Information</h2>

            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Email</h3>
                  <p className="text-indigo-100">en23172488@git-india.edu.in</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Office</h3>
                  <p className="text-indigo-100">Gharda Institute of Technology, Lavel, MH</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Response Time</h3>
                  <p className="text-indigo-100">We typically respond within 1-2 business days</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-4">
              <h3 className="font-semibold text-lg mb-2">Send us a message</h3>
              <p className="text-indigo-100 text-sm">
                Fill out the form and our team will get back to you as soon as possible.
              </p>
            </div>
          </motion.div>

          {/* Right: Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Send us a message</h2>
            <p className="text-gray-600 mb-6">We typically respond within 1-2 business days.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${errors.name
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500'
                  }`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full outline-none bg-transparent"
                    placeholder="Your full name"
                    disabled={submitting}
                  />
                </div>
                {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${errors.email
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500'
                  }`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full outline-none bg-transparent"
                    placeholder="you@example.com"
                    disabled={submitting}
                  />
                </div>
                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Message *</label>
                <div className={`rounded-lg border transition-all ${errors.message
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500'
                  }`}>
                  <textarea
                    rows={6}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-4 py-3 outline-none rounded-lg bg-transparent resize-none"
                    placeholder="How can we help you?"
                    disabled={submitting}
                  />
                </div>
                {errors.message && <p className="mt-2 text-sm text-red-600">{errors.message}</p>}
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {message.length}/1000 characters
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setEmail('');
                    setMessage('');
                    setErrors({});
                  }}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : 'Send Message'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-12 bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Contact Submissions</h3>
              <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                {contacts.length} messages
              </span>
            </div>

            {loadingContacts ? (
              <div className="flex justify-center items-center py-12">
                <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
                <p className="mt-1 text-sm text-gray-500">Contact form submissions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {contacts.map((contact, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                        <p className="text-sm text-indigo-600">{contact.email}</p>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {new Date(contact.created_at).toLocaleDateString()} at {new Date(contact.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{contact.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Contact;