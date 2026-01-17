import React from 'react';
import { motion } from 'framer-motion';

const CookiePolicy = () => {
    const sections = [
        {
            title: "1. Essential Cookies Usage",
            content: [
                "This platform uses essential cookies only to:",
                "Keep users logged in",
                "Maintain secure sessions",
                "Enable Google Sign-In",
                "We do not use cookies for advertising or tracking."
            ]
        },
        {
            title: "2. Third-Party Cookies",
            content: [
                "Some cookies may be set by:",
                "Google (for authentication)",
                "Supabase (for session management)",
                "These are required for the platform to function properly."
            ]
        },
        {
            title: "3. Managing Cookies",
            content: [
                "By using this platform, you agree to the use of essential cookies.",
                "Disabling cookies may prevent the system from working correctly."
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
                        Cookie Policy
                    </h1>
                    <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
                        Information about how we use cookies.
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

export default CookiePolicy;
