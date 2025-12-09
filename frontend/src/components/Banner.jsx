import React from 'react';
import TextType from './TextType';
import banner from '/banner.png';

function Banner() {
  return (
    <section className="relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-5 md:py-5 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center relative z-10">

        {/* Left Content */}
        <div className="w-full md:w-1/2 order-2 md:order-1 mt-5 md:mt-0 animate-fade-in-up">
          <div className="space-y-6" style={{ paddingTop: '20px' }}>
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight min-h-[120px] md:min-h-[auto]">
                <TextType
                  text={[
                    "Welcome to Project Review Platform",
                    "Your Hub for Sharing & Reviewing Projects",
                    "Grow, Collaborate, Innovate!"
                  ]}
                  typingSpeed={75}
                  pauseDuration={1500}
                  showCursor={true}
                  cursorCharacter="|"
                  className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"
                />
              </h1>
            </div>

            <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-8 shadow-xl border border-gray-200/70 transform transition-all duration-300 hover:shadow-2xl">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-3 shadow-md">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                    Your ultimate hub for sharing, reviewing, and refining projects. At <strong className="text-indigo-600">Project Review Platform</strong>, we believe in the power of constructive feedback and collaboration to help you take your work to the next level.
                  </p>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-3 shadow-md">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                    Join our community to showcase your innovations, receive valuable insights, and contribute to the growth of others. Let's build, review, and grow — together.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="w-full md:w-1/2 order-1 md:order-2 flex justify-center animate-float">
          <div className="relative">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/30 via-purple-400/30 to-pink-400/30 rounded-3xl blur-2xl transform rotate-6 scale-110 animate-pulse-slow"></div>

            {/* Image container with enhanced styling */}
            <div className="relative bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-2xl border border-white/30 transform hover:scale-105 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-pink-500/15 rounded-3xl"></div>
              <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
                <img
                  src={banner}
                  alt="Project Collaboration Illustration"
                  className="relative max-w-full h-auto rounded-xl shadow-lg w-80 h-80 object-cover mx-auto"
                />
              </div>

              {/* Decorative corner elements */}
              <div className="absolute -top-3 -left-3 w-6 h-6 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute -top-3 -right-3 w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute -bottom-3 -left-3 w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {/* Gradient overlays */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-500/5 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-purple-500/5 to-transparent"></div>

        {/* Animated shapes */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-pink-400/10 to-purple-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

        {/* Geometric patterns */}
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-indigo-400 rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-purple-400 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-pulse-slow" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </section>
  );
}

export default Banner;