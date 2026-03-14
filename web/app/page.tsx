export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Title */}
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-electric bg-clip-text text-transparent">
            HireWire
          </h1>
          
          <p className="text-2xl md:text-3xl text-[var(--text-secondary)] mb-4">
            Get Hired on the Wire
          </p>
          
          <p className="text-xl text-[var(--text-muted)] mb-12 max-w-2xl mx-auto">
            Live hiring, real connections. Match with jobs that fit your career goals, 
            not just your resume.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="/auth/signup"
              className="px-8 py-4 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Find Your Match
            </a>
            <a
              href="/companies"
              className="px-8 py-4 bg-[var(--card-bg)] hover:opacity-80 text-white font-semibold rounded-lg transition-all border-2 border-[var(--primary)]"
            >
              For Companies
            </a>
            <a
              href="/docs/generator"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              📄 Resume Studio
            </a>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-[var(--card-bg)] p-8 rounded-xl hover:opacity-90 transition-all">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--primary)]">Smart Matching</h3>
              <p className="text-[var(--text-secondary)]">
                AI matches you with jobs based on skills, career goals, and culture fit
              </p>
            </div>

            <div className="bg-[var(--card-bg)] p-8 rounded-xl hover:opacity-90 transition-all">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--secondary)]">Real Connections</h3>
              <p className="text-[var(--text-secondary)]">
                Match first, chat second. No more black hole applications
              </p>
            </div>

            <div className="bg-[var(--card-bg)] p-8 rounded-xl hover:opacity-90 transition-all">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--success)]">Career Growth</h3>
              <p className="text-[var(--text-secondary)]">
                Find roles that align with your trajectory and help you grow
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--primary)] mb-2">85%</div>
              <div className="text-[var(--text-muted)]">Avg Match Score</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--secondary)] mb-2">&lt;100ms</div>
              <div className="text-[var(--text-muted)]">Match Speed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--success)] mb-2">10x</div>
              <div className="text-[var(--text-muted)]">Better Than ATS</div>
            </div>
          </div>

          {/* Free Tools Section */}
          <div className="mt-24 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-12 border border-purple-500/20">
            <div className="text-4xl mb-4 text-center">📄</div>
            <h2 className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Resume Studio - Free Tool
            </h2>
            <p className="text-lg text-[var(--text-secondary)] mb-6 text-center max-w-2xl mx-auto">
              Upload your resume and get instant ATS analysis, job matching scores, and professional formatting. 
              No signup required!
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-2xl mb-2">✅</div>
                <h4 className="font-bold mb-1 text-purple-300">ATS Score</h4>
                <p className="text-sm text-[var(--text-muted)]">Get a grade on your resume's ATS compatibility</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🎯</div>
                <h4 className="font-bold mb-1 text-blue-300">Job Matching</h4>
                <p className="text-sm text-[var(--text-muted)]">See how well you match job descriptions</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">✨</div>
                <h4 className="font-bold mb-1 text-green-300">Pro Format</h4>
                <p className="text-sm text-[var(--text-muted)]">Generates a clean, professional resume</p>
              </div>
            </div>
            <div className="text-center">
              <a
                href="/docs/generator"
                className="inline-block px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-xl"
              >
                Try Resume Studio Now →
              </a>
            </div>
          </div>

          {/* How It Works */}
          <div className="mt-24">
            <h2 className="text-4xl font-bold mb-12 text-[var(--primary)]">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--primary)] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h4 className="font-bold mb-2">Sign Up</h4>
                <p className="text-sm text-[var(--text-muted)]">Upload resume or connect GitHub</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--secondary)] text-[var(--background)] rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h4 className="font-bold mb-2">Get Matches</h4>
                <p className="text-sm text-[var(--text-muted)]">AI finds your perfect roles</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--success)] text-[var(--background)] rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h4 className="font-bold mb-2">Swipe & Connect</h4>
                <p className="text-sm text-[var(--text-muted)]">Like jobs that excite you</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--warning)] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  4
                </div>
                <h4 className="font-bold mb-2">Chat & Interview</h4>
                <p className="text-sm text-[var(--text-muted)]">Direct connection to companies</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--card-bg)] py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-[var(--text-muted)]">
          <p>&copy; 2025 HireWire. Built with career context matching.</p>
        </div>
      </footer>
    </div>
  );
}
