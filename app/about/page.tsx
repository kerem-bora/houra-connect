import React from 'react';

const AboutHoura = () => {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 font-sans text-slate-700 antialiased">
      {/* Header - Daha sade ve net */}
      <header className="mb-16 border-b border-slate-100 pb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Houra</h1>
        <p className="text-lg text-slate-500">
          Redefining value through time.
        </p>
      </header>

      {/* Intro */}
      <section className="mb-12">
        <p className="text-lg leading-relaxed">
          Houra is a vision for an ecosystem where <strong>time</strong> is the primary unit of value. 
          Instead of traditional financial instruments, we aim to structure community 
          value exchange based on time.
        </p>
      </section>

      {/* Time Banks - Başlıklar daha dengeli */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">What are Time Banks?</h2>
        <p className="leading-relaxed mb-4">
          A Time Bank is a system where services are exchanged using "units of time." 
          At its core lie reciprocity and equality: one hour of any participant's 
          time is considered equal to one hour of another's.
        </p>
        <a 
          href="https://en.wikipedia.org/wiki/Time-based_currency" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Learn more about Time-based Currencies →
        </a>
      </section>

      {/* Blockchain Section - Karışık kutular yerine temiz bir liste */}
      <section className="mb-12 py-8 border-y border-slate-100">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">How Blockchain Can Help</h2>
        <div className="grid gap-6">
          <div>
            <h3 className="font-medium text-slate-900">Data Management</h3>
            <p className="text-slate-600">Time exchanges are recorded automatically through smart contracts, reducing operational effort.</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Transparency & Security</h3>
            <p className="text-slate-600">Open networks ensure reliability and protect user credits without central intervention.</p>
          </div>
        </div>
      </section>

      {/* Roadmap - Kart karmaşası giderildi */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">2026 Roadmap</h2>
        <div className="space-y-8">
          <div className="flex gap-4">
            <span className="text-indigo-500 font-mono font-bold">01</span>
            <div>
              <h4 className="font-medium text-slate-900">Distribution Protocol</h4>
              <p className="text-slate-600 text-sm mt-1">Establishing a fair economic balance through a protocol that determines how Houra tokens are distributed.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="text-indigo-500 font-mono font-bold">02</span>
            <div>
              <h4 className="font-medium text-slate-900">Standalone Application</h4>
              <p className="text-slate-600 text-sm mt-1">Transitioning into a dedicated mobile application to offer a specialized experience for our users.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="pt-8 border-t border-slate-100 text-center text-slate-400 text-xs tracking-widest uppercase">
        © 2026 Houra Project
      </footer>
    </div>
  );
};

export default AboutHoura;