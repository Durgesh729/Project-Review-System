import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const GradientCard = ({ title, desc, icon, gradient }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className={`rounded-2xl p-6 shadow-xl bg-gradient-to-br ${gradient} text-white transform transition-all duration-300 hover:shadow-2xl`}
  >
    <div className="text-3xl mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="opacity-90">{desc}</p>
  </motion.div>
);

const StatCard = ({ number, label, icon }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center transform transition-all duration-300 hover:-translate-y-1">
    <div className="text-2xl mb-3 text-indigo-600">{icon}</div>
    <div className="text-3xl font-bold text-gray-900">{number}</div>
    <div className="text-gray-600 mt-1">{label}</div>
  </div>
);

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "For Mentees",
      icon: "🎓",
      desc: "Submit milestones, manage project details, and receive actionable feedback from experienced mentors.",
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      title: "For Mentors",
      icon: "👨‍🏫",
      desc: "Review submissions, rate projects, and provide guidance efficiently with our streamlined dashboard.",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      title: "For HOD & Coordinators",
      icon: "🏛",
      desc: "Gain comprehensive visibility across all projects and streamline assignment management.",
      gradient: "from-green-500 to-teal-600"
    }
  ];

  const stats = [
    { number: "1000+", label: "Projects Reviewed", icon: "📊" },
    { number: "500+", label: "Active Users", icon: "👥" },
    { number: "98%", label: "Satisfaction Rate", icon: "⭐" },
    { number: "24/7", label: "Support", icon: "🕒" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                  Project Review Platform
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
                Enabling mentors, mentees, HODs and coordinators to collaborate seamlessly with cutting-edge technology and intuitive design.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center gap-4"
            >
              <button
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate('/features')}
                className="bg-white text-indigo-600 font-semibold py-3 px-8 rounded-lg shadow-lg border border-indigo-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Learn More
              </button>
            </motion.div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-pink-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Powerful Features for All Roles</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our platform is designed to meet the unique needs of every stakeholder in the academic project review process.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GradientCard {...feature} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <StatCard {...stat} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-gray-700 text-lg mb-6">
              We aim to make academic project management simple and transparent. From initial ideas to final demos,
              our platform brings structure to reviews and promotes collaboration between all stakeholders.
            </p>
            <p className="text-gray-700 text-lg">
              By streamlining the review process and providing actionable feedback mechanisms, we empower students
              to excel in their projects while giving mentors and administrators the tools they need to guide success.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="text-gray-700">Streamlined Workflow</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="text-gray-700">Real-time Collaboration</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="text-gray-700">Actionable Insights</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/banner.png"
                alt="Platform Dashboard"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-xl flex items-center justify-center text-white text-3xl">
              🚀
            </div>
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-r from-green-400 to-teal-500 rounded-2xl shadow-xl flex items-center justify-center text-white text-2xl">
              💡
            </div>
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 text-center shadow-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Project Review Process?
            </h2>
            <p className="text-indigo-100 text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of educators and students who are already using our platform to streamline their workflow.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="bg-white text-indigo-600 font-semibold py-3 px-8 rounded-lg shadow-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all duration-300"
              >
                Get Started Today
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="bg-transparent border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white/10 transform hover:-translate-y-1 transition-all duration-300"
              >
                Schedule a Demo
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default About;
