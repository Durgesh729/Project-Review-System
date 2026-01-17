import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
    const sections = [
        {
            title: "1. Information We Collect",
            content: [
                "We may collect the following details when you use this platform:",
                "Name and email address (via Google Sign-In or manual signup)",
                "User role (Mentee, Mentor, Coordinator, HOD)",
                "Project details and uploaded files (PDF, PPT, links, etc.)",
                "Feedback and review data",
                "Login/session information for security"
            ]
        },
        {
            title: "2. How We Use This Information",
            content: [
                "Your information is used only to:",
                "Authenticate users and manage roles",
                "Assign and review academic projects",
                "Display dashboards based on user roles",
                "Improve platform functionality and security",
                "We do not sell or share personal data with third parties."
            ]
        },
        {
            title: "3. Google Sign-In",
            content: [
                "If you sign in using Google:",
                "We receive basic profile information (name, email)",
                "Your role is assigned only from our database",
                "Google credentials are used only for authentication"
            ]
        },
        {
            title: "4. Data Storage & Security",
            content: [
                "Data is stored securely using Supabase and related services",
                "Access is restricted based on user roles",
                "Only authorized users can view assigned data"
            ]
        },
        {
            title: "5. Data Deletion",
            content: [
                "If a user account is deleted:",
                "User data is removed from the system database",
                "The user must re-select a role if they sign up again"
            ]
        },
        {
            title: "6. Contact",
            content: [
                "For any questions regarding privacy, contact the system administrator."
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                        Privacy Policy
                    </h1>
                    <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
                        Your privacy is important to us. Here's how we handle your data.
                    </p>
                </motion.div>

                <div className="space-y-12">
                    {sections.map((section, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300"
                        >
                            <div className="p-8">
                                <div className="flex items-center mb-6">
                                    <div className="h-2 w-10 bg-indigo-500 rounded-full mr-4"></div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {section.title}
                                    </h2>
                                </div>
                                <div className="pl-14 space-y-3">
                                    {section.content.map((item, idx) => (
                                        <p key={idx} className="text-lg text-gray-600 leading-relaxed">
                                            {item}
                                        </p>
                                    ))}
                                </div>
                            </div>
                            <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20"></div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="mt-16 text-center text-gray-500 text-sm"
                >
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                </motion.div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
