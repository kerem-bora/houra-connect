import React from 'react';

const AboutHoura = () => {
  return (
      <div className="min-h-screen bg-[#131314] px-6 py-20 font-sans text-[#e3e3e3] antialiased">
      <div className="max-w-2xl mx-auto space-y-12">
        
        {/* Header */}
        <header>
          <p><strong>Houra</strong></p>
          <p className="text-[#c4c7c5] mt-1 text-sm">
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
          <p className="mb-2"><strong>What are Time Banks?</strong></p>
          <p className="leading-relaxed mb-4 text-[#c4c7c5]">
            A Time Bank is a system where services are exchanged using "units of time." 
            At its core lie reciprocity and equality: one hour of any participant's 
            time is considered equal to one hour of another's.
          </p>
          <a 
            href="https://en.wikipedia.org/wiki/Time-based_currency" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[#8ab4f8] hover:text-[#d2e3fc] underline text-sm transition-colors"
          >
            Learn more about Time-based Currencies
          </a>
        </section>

        {/* Blockchain Section */}
        <section className="pt-8 border-t border-[#444746]">
          <p className="mb-6"><strong>How Blockchain Can Help</strong></p>
          <div className="space-y-4">
            <p><strong>Data Management:</strong> Time exchanges can be recorded automatically through smart contracts.</p>
            <p><strong>Transparency:</strong> Conducting transactions on an open network can enhance the system's reliability.</p>
            <p><strong>Security:</strong> The time credits earned by users can be protected in a digital environment.</p>
          </div>
        </section>

        {/* Roadmap */}
        <section className="pt-8 border-t border-[#444746]">
          <p className="mb-6"><strong>2026 Roadmap</strong></p>
          <div className="space-y-8">
            <div>
              <p><strong>Distribution Protocol</strong></p>
              <p className="text-sm text-[#c4c7c5] mt-1">Establishing a fair economic balance through token distribution rules.</p>
            </div>
            <div>
              <p><strong>Standalone Application</strong></p>
              <p className="text-sm text-[#c4c7c5] mt-1">Transitioning into a dedicated mobile application for a specialized experience.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-12 text-[10px] text-[#8e918f] border-t border-[#444746] tracking-widest uppercase text-center">
          Houra Community
        </footer>
      </div>
    </div>
  );
};

export default AboutHoura;