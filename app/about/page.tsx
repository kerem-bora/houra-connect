import React from 'react';

const AboutHoura = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-16 font-sans text-[#0f172a] antialiased">
      <div className="max-w-2xl mx-auto space-y-12">
        
        {/* Header */}
        <header>
          <h1 className="font-bold">Houra</h1>
          <p className="text-[#334155] mt-1">
            Redefining value through time.
          </p>
        </header>

        {/* Intro Section */}
        <section>
          <p className="leading-relaxed">
            Houra is a vision for an ecosystem where time is the primary unit of value. 
            Instead of traditional financial instruments, we aim to structure community 
            value exchange based on time.
          </p>
        </section>

        {/* Time Banks */}
        <section>
          <h2 className="font-bold mb-2">What are Time Banks?</h2>
          <p className="leading-relaxed mb-4">
            A Time Bank is a system where services are exchanged using "units of time." 
            At its core lie reciprocity and equality: one hour of any participant's 
            time is considered equal to one hour of another's.
          </p>
          <a 
            href="https://en.wikipedia.org/wiki/Time-based_currency" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-700 hover:text-blue-900 underline text-sm"
          >
            Learn more about Time-based Currencies
          </a>
        </section>

        {/* Blockchain Section */}
        <section className="pt-8 border-t border-slate-200">
          <h2 className="font-bold mb-4">How Blockchain Can Help</h2>
          <div className="space-y-4">
            <p><span className="font-bold">Data Management:</span> Time exchanges can be recorded automatically through smart contracts.</p>
            <p><span className="font-bold">Transparency:</span> Conducting transactions on an open network can enhance the system's reliability.</p>
            <p><span className="font-bold">Security:</span> The time credits earned by users can be protected in a digital environment.</p>
          </div>
        </section>

        {/* Roadmap */}
        <section className="pt-8 border-t border-slate-200">
          <h2 className="font-bold mb-4">2026 Roadmap</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-bold">Distribution Protocol</h3>
              <p className="text-sm mt-1">We aim to implement a central bank structure that establishes a fair economic balance.</p>
            </div>
            <div>
              <h3 className="font-bold">Standalone Application</h3>
              <p className="text-sm mt-1">We plan to transition our system into a standalone mobile application for a specialized experience.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-12 text-xs text-[#64748b] border-t border-slate-200">
          Houra Community
        </footer>
      </div>
    </div>
  );
};

export default AboutHoura;