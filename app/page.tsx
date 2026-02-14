"use client";

import dynamic from 'next/dynamic';

// HomeContent bileşenini sunucu tarafında render edilmeyecek şekilde (ssr: false) içe aktarıyoruz.
const HomeContent = dynamic(() => import('./home-content'), { 
  ssr: false,
  loading: () => (
    <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>
      Houra Loading...
    </div>
  )
});

export default function Page() {
  return <HomeContent />;
}