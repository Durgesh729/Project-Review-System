import React from 'react';
import { motion } from 'framer-motion';

const TermsOfService = () => {
    const sections = [
        {
            title: "1. Purpose of the Platform",
            content: [
                "This platform is designed for academic project management and review within the college."
            ]
        },
        {
            title: "2. User Roles",
            content: [
                "Users may be assigned roles such as:",
                "Mentee",
                "Mentor",
                "Project Coordinator",
                "Head of Department (HOD)",
                "Each role has specific permissions and responsibilities."
            ]
        },
        {
            title: "3. User Responsibilities",
            content: [
                "Users must:",
                "Provide correct information",
                "Upload only relevant academic content",
                "Respect role-based access rules",
                "Use the platform for academic purposes only"
            ]
        },
        {
            title: "4. Content Ownership",
            content: [
                "Uploaded projects and documents remain the property of the users or institution",
                "The platform only facilitates viewing and evaluation"
            ]
        },
        {
            title: "5. Misuse",
            content: [
                "The following are not allowed:",
                "Uploading inappropriate or unrelated content",
                "Accessing data without permission",
                "Misusing roles or privileges",
                "Accounts violating these rules may be restricted or removed."
            ]
        },
        {
            title: "6. Availability",
            content: [
                "The platform is provided as-is for academic use."
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
                        Terms of Service
                    </h1>
                    <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
                        Please read these terms carefully before using our platform.
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

export default TermsOfService;
