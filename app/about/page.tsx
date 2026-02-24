import React from 'react';

const AboutHoura = () => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 font-sans text-slate-800">
      <header className="mb-12">
        <h1 className="text-4xl font-light mb-4">Houra</h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          Redefining value through time.
        </p>
      </header>

      <section className="mb-10">
        <p className="leading-relaxed">
          Houra is a vision for an ecosystem where time is the primary unit of value. 
          Instead of traditional financial instruments, we aim to structure community 
          value exchange based on time.
        </p>
      </section>

      <hr className="border-slate-200 my-10" />

      <section className="mb-10">
        <h2 className="text-2xl font-medium mb-3">What are Time Banks?</h2>
        <p className="leading-relaxed">
          A <strong>Time Bank</strong> is a system where services are exchanged using 
          "units of time." At its core lie reciprocity and equality: one hour of 
          any participant's time is considered equal to one hour of another's. 
      Read more about <a href="https://en.wikipedia.org/wiki/Time-based_currency" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', marginLeft: '5px', textDecoration: 'underline' }}>Time-based Currencies</a>
        </p>
      </section>

      <section className="mb-10">
        <h3 className="text-xl font-medium mb-3">Record Keeping and Tracking</h3>
        <p className="leading-relaxed text-slate-600">
          In time bank models, maintaining records of services rendered and time earned 
          requires operational effort. Managing these records transparently and 
          balancing user contributions are sensitive aspects essential for the 
          system's health.
        </p>
      </section>

      <section className="mb-10 bg-slate-50 p-6 rounded-lg">
        <h2 className="text-2xl font-medium mb-4">How Blockchain Can Help</h2>
        <p className="mb-4 italic text-slate-600">
          We believe blockchain technology can make these processes more efficient:
        </p>
        <ul className="space-y-4">
          <li>
            <strong>Data Management:</strong> Time exchanges can be recorded 
            automatically through smart contracts.
          </li>
          <li>
            <strong>Transparency:</strong> Conducting transactions on an open network 
            can enhance the system's reliability.
          </li>
          <li>
            <strong>Security:</strong> The time credits earned by users can be 
            protected in a digital environment without central intervention.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-medium mb-4 text-indigo-700">2026 Roadmap</h2>
        <p className="mb-4">
          In 2026, we plan to take the following two steps to develop and expand 
          the Houra system:
        </p>
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="border border-slate-200 p-5 rounded-md">
            <h4 className="font-bold mb-2 underline decoration-indigo-300">Distribution Protocol</h4>
            <p className="text-sm text-slate-600">
              We aim to implement a "central bank" structure—a protocol that establishes 
              a fair economic balance, determining how Houra tokens are distributed 
              to users and under what rules.
            </p>
          </div>
          <div className="border border-slate-200 p-5 rounded-md">
            <h4 className="font-bold mb-2 underline decoration-indigo-300">Standalone Application</h4>
            <p className="text-sm text-slate-600">
              We plan to transition our current system, which operates within a 
              base app, into a <strong>standalone mobile application</strong> to 
              offer a more specialized experience for our users.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-20 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
        © 2026 Houra Project. All rights reserved.
      </footer>
    </div>
  );
};

export default AboutHoura;
